import { Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import ticketService from '../services/ticket.service';
import telegramService from '../services/telegram.service';
import ticketReadStateService from '../services/ticket-read-state.service';
import helpdeskInternalNotificationService from '../services/helpdesk-internal-notification.service';
import helpdeskMediaSyncService from '../services/helpdesk-media-sync.service';
import { resolveStaffTenantScope } from '../services/tenant-scope';
import { buildTicketViewerContext } from '../utils/viewer-context';
import { createTicketSchema, listTicketsQuerySchema, reopenTicketSchema, updateTicketPrioritySchema, updateTicketStatusSchema } from '../schemas/ticket.schema';
import { AppLogger } from '../config/logger';
import type { Ticket, TicketFilters } from '../types';
import { persistUploadedMessageFiles } from '../utils/message-attachments';
import { escapeTelegramHtml } from '../bot/utils/telegram-html-escape';
import {
  buildInitialTicketMessage,
  isMultipartCreateRequest,
  normalizeMulterFiles,
  parseMultipartTicketBody,
  prevalidateTicketAttachments,
  toCreateTicketInput,
} from './ticket-create.helpers';

const STAFF_HELPDESK_ROLES = new Set(['SUPERADMIN', 'RESOLVER', 'ADMIN', 'ADMIN_INTERNO']);

/**
 * Lista tickets: staff ve el catálogo por tenant; otros usuarios solo los propios.
 */
async function listTicketsForAuthenticatedUser(
  req: AuthenticatedRequest,
  baseFilters: TicketFilters,
  pagination: { page: number; limit: number }
) {
  if (!STAFF_HELPDESK_ROLES.has(req.user!.role)) {
    return ticketService.getByUser(req.user!.id, baseFilters, pagination);
  }
  const scope = resolveStaffTenantScope(req.user!.role, req.user!.empresaId);

  if (scope.kind === 'none') {
    return {
      data: [],
      page: pagination.page,
      limit: pagination.limit,
      total: 0,
      totalPages: 0,
    };
  }
  const listFilters: TicketFilters = {
    ...baseFilters,
    ...(scope.kind === 'empresa' ? { empresaId: scope.empresaId } : {}),
  };

  // RESOLVER ve todos los tickets (con empresa), SUPERADMIN también
  const includeEmpresa = req.user!.role === 'RESOLVER';

  return ticketService.getAll(listFilters, pagination, includeEmpresa);
}

function formatNewPlatformTicketMessage(ticket: Ticket, initialMessage: string, attachmentCount: number): string {
  const attachmentBlock =
    attachmentCount > 0 ? `\n\n📎 Adjuntos desde la plataforma: ${attachmentCount}` : '';

  return (
    `${telegramService.formatTicketInfo(ticket)}\n\n` +
    `💬 <b>Mensaje inicial</b>\n\n` +
    `${escapeTelegramHtml(initialMessage)}` +
    attachmentBlock
  );
}

async function syncPlatformTicketToTelegram(
  ticket: Ticket,
  initialMessage: string,
  attachmentCount: number
): Promise<void> {
  const telegramMessage = formatNewPlatformTicketMessage(ticket, initialMessage, attachmentCount);
  const topic = await telegramService.createTopic(ticket.category, ticket.number, ticket.subject);

  if (topic) {
    await ticketService.updateTelegramTopic(ticket.id, topic.topicId, topic.groupId);
    await telegramService.sendToTopic(topic.groupId, topic.topicId, telegramMessage);
    return;
  }

  const resolverConfig = await telegramService.getResolverConfig(ticket.category);
  if (resolverConfig) {
    await telegramService.sendToGroup(resolverConfig.telegramGroupId, telegramMessage);
  }
}

/**
 * POST /api/helpdesk/tickets
 * Crear un nuevo ticket (JSON o multipart con `attachments` como en el chat web).
 */
export const createTicket = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Usuario no autenticado',
      });
      return;
    }

    const userId = req.user.id;
    const userName = [req.user.nombre, req.user.apellido].filter(Boolean).join(' ') || req.user.email;
    const empresaId = req.user.empresaId ?? null;
    const empresaNombre = req.user.empresaNombre ?? null;

    if (isMultipartCreateRequest(req)) {
      const files = normalizeMulterFiles(req.files);
      const parsedFields = parseMultipartTicketBody(req.body);
      if (!parsedFields.ok) {
        res.status(400).json({
          success: false,
          message: 'Datos inválidos',
          errors: parsedFields.errors,
        });
        return;
      }

      const preFiles = prevalidateTicketAttachments(files);
      if (!preFiles.ok) {
        res.status(400).json({
          success: false,
          message: preFiles.message,
        });
        return;
      }

      const msgBuilt = buildInitialTicketMessage(parsedFields.data.message.trim(), files.length);
      if (!msgBuilt.ok) {
        res.status(400).json({
          success: false,
          message: msgBuilt.message,
        });
        return;
      }

      const data = toCreateTicketInput(parsedFields.data, msgBuilt.message);
      const ticket = await ticketService.create(data, userId, userName, 'platform', empresaId, empresaNombre);

      if (files.length > 0) {
        const uploadResult = await persistUploadedMessageFiles(files, ticket.id);
        if (!uploadResult.ok) {
          AppLogger.warn(`Ticket ${ticket.id} creado pero falló subida de adjuntos: ${uploadResult.message}`);
          res.status(201).json({
            success: true,
            message: 'Ticket creado; no se pudieron guardar algunos adjuntos',
            data: ticket,
            warning: uploadResult.message,
          });
          return;
        }
        await ticketService.attachFilesToFirstUserMessage(ticket.id, uploadResult.attachments);

        try {
          await helpdeskMediaSyncService.queueAttachmentsToResolvers(ticket.id, userName, uploadResult.attachments);
        } catch (mediaSyncError) {
          AppLogger.error('Error queueing new ticket attachments to Telegram:', mediaSyncError);
        }
      }

      try {
        await syncPlatformTicketToTelegram(ticket, msgBuilt.message, files.length);
      } catch (telegramError) {
        AppLogger.error('Error syncing platform ticket to Telegram:', telegramError);
      }

      try {
        await ticketReadStateService.markAsRead(ticket.id, userId);
      } catch (readStateError) {
        AppLogger.error('Error initializing read state for new ticket:', readStateError);
      }

      try {
        await helpdeskInternalNotificationService.notifyNewTicketToStaff(ticket);
      } catch (notificationError) {
        AppLogger.error('Error creating internal notifications for new ticket:', notificationError);
      }

      res.status(201).json({
        success: true,
        message: 'Ticket creado exitosamente',
        data: ticket,
      });
      return;
    }

    const validation = createTicketSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({
        success: false,
        message: 'Datos inválidos',
        errors: validation.error.flatten().fieldErrors,
      });
      return;
    }

    const ticketJson = await ticketService.create(
      validation.data,
      userId,
      userName,
      'platform',
      empresaId,
      empresaNombre
    );

    try {
      await syncPlatformTicketToTelegram(ticketJson, validation.data.message, 0);
    } catch (telegramError) {
      AppLogger.error('Error syncing platform ticket to Telegram:', telegramError);
    }

    try {
      await ticketReadStateService.markAsRead(ticketJson.id, userId);
    } catch (readStateError) {
      AppLogger.error('Error initializing read state for new ticket:', readStateError);
    }

    try {
      await helpdeskInternalNotificationService.notifyNewTicketToStaff(ticketJson);
    } catch (notificationError) {
      AppLogger.error('Error creating internal notifications for new ticket:', notificationError);
    }

    res.status(201).json({
      success: true,
      message: 'Ticket creado exitosamente',
      data: ticketJson,
    });
  } catch (error) {
    AppLogger.error('Error creating ticket:', error);
    res.status(500).json({
      success: false,
      message: 'Error al crear el ticket',
    });
  }
};

/**
 * GET /api/helpdesk/tickets
 * Listar tickets del usuario
 */
export const getMyTickets = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Usuario no autenticado',
      });
      return;
    }

    const queryValidation = listTicketsQuerySchema.safeParse(req.query);
    if (!queryValidation.success) {
      res.status(400).json({
        success: false,
        message: 'Parámetros inválidos',
        errors: queryValidation.error.flatten().fieldErrors,
      });
      return;
    }

    const { page, limit, status, category, priority, search, from, to } = queryValidation.data;

    const baseFilters: TicketFilters = {
      status,
      category,
      priority,
      search,
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined,
    };
    const pagination = { page, limit };

    const result = await listTicketsForAuthenticatedUser(req, baseFilters, pagination);

    res.json({
      success: true,
      data: result.data,
      pagination: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: result.totalPages,
      },
    });
  } catch (error) {
    AppLogger.error('Error listing tickets:', error);
    res.status(500).json({
      success: false,
      message: 'Error al listar tickets',
    });
  }
};

/**
 * GET /api/helpdesk/tickets/unread-summary
 * Devuelve el resumen persistido de tickets y mensajes no leídos.
 */
export const getUnreadSummary = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Usuario no autenticado',
      });
      return;
    }

    const summary = await ticketReadStateService.getUnreadSummaryForViewer(buildTicketViewerContext(req));

    res.json({
      success: true,
      data: summary,
    });
  } catch (error) {
    AppLogger.error('Error getting helpdesk unread summary:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener no leídos',
    });
  }
};

/**
 * PATCH /api/helpdesk/tickets/:id/read
 * Marca el ticket como leído para el usuario actual.
 */
export const markAsRead = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Usuario no autenticado',
      });
      return;
    }

    const { id } = req.params;
    const ticketId = Array.isArray(id) ? id[0] : id;
    const ticket = await ticketService.getById(ticketId, buildTicketViewerContext(req));
    if (!ticket) {
      res.status(404).json({
        success: false,
        message: 'Ticket no encontrado',
      });
      return;
    }

    const readAt = new Date();
    await ticketReadStateService.markAsRead(ticket.id, req.user.id, readAt);

    res.json({
      success: true,
      data: {
        ticketId: ticket.id,
        readAt: readAt.toISOString(),
      },
    });
  } catch (error) {
    AppLogger.error('Error marking helpdesk ticket as read:', error);
    res.status(500).json({
      success: false,
      message: 'Error al marcar ticket como leído',
    });
  }
};

/**
 * GET /api/helpdesk/tickets/:id
 * Obtener un ticket por ID
 */
export const getTicketById = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Usuario no autenticado',
      });
      return;
    }

    const { id } = req.params;
    const ticketId = Array.isArray(id) ? id[0] : id;

    const ticket = await ticketService.getById(ticketId, buildTicketViewerContext(req));

    if (!ticket) {
      res.status(404).json({
        success: false,
        message: 'Ticket no encontrado',
      });
      return;
    }

    res.json({
      success: true,
      data: ticket,
    });
  } catch (error) {
    AppLogger.error('Error getting ticket:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener el ticket',
    });
  }
};

/**
 * PATCH /api/helpdesk/tickets/:id/close
 * Cerrar un ticket
 */
export const closeTicket = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Usuario no autenticado',
      });
      return;
    }

    const { id } = req.params;
    const ticketId = Array.isArray(id) ? id[0] : id;

    const ticket = await ticketService.close(ticketId, req.user.id);

    res.json({
      success: true,
      message: 'Ticket cerrado exitosamente',
      data: ticket,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
    
    if (errorMessage === 'TICKET_NOT_FOUND') {
      res.status(404).json({
        success: false,
        message: 'Ticket no encontrado',
      });
      return;
    }

    if (errorMessage === 'NOT_TICKET_OWNER') {
      res.status(403).json({
        success: false,
        message: 'No tienes permiso para cerrar este ticket',
      });
      return;
    }

    if (errorMessage === 'ALREADY_CLOSED') {
      res.status(400).json({
        success: false,
        message: 'El ticket ya está cerrado',
      });
      return;
    }

    AppLogger.error('Error closing ticket:', error);
    res.status(500).json({
      success: false,
      message: 'Error al cerrar el ticket',
    });
  }
};

/**
 * PATCH /api/helpdesk/tickets/:id/reopen
 * Reabrir un ticket (dentro de las 72hs)
 */
export const reopenTicket = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Usuario no autenticado',
      });
      return;
    }

    const { id } = req.params;
    const ticketId = Array.isArray(id) ? id[0] : id;

    const validation = reopenTicketSchema.safeParse(req.body);
    const message = validation.success ? validation.data.message : undefined;

    const ticket = await ticketService.reopen(ticketId, req.user.id, message);

    res.json({
      success: true,
      message: 'Ticket reabierto exitosamente',
      data: ticket,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
    
    if (errorMessage === 'TICKET_NOT_FOUND') {
      res.status(404).json({
        success: false,
        message: 'Ticket no encontrado',
      });
      return;
    }

    if (errorMessage === 'NOT_TICKET_OWNER') {
      res.status(403).json({
        success: false,
        message: 'No tienes permiso para reabrir este ticket',
      });
      return;
    }

    if (errorMessage === 'TICKET_NOT_CLOSED') {
      res.status(400).json({
        success: false,
        message: 'El ticket no está cerrado',
      });
      return;
    }

    if (errorMessage === 'NO_CLOSE_DATE' || errorMessage === 'REOPEN_WINDOW_EXPIRED') {
      res.status(400).json({
        success: false,
        message: 'El plazo para reabrir el ticket ha expirado (máximo 72 horas)',
      });
      return;
    }

    AppLogger.error('Error reopening ticket:', error);
    res.status(500).json({
      success: false,
      message: 'Error al reabrir el ticket',
    });
  }
};

/**
 * PATCH /api/helpdesk/tickets/:id/priority
 * Actualizar prioridad del ticket (solo RESOLVER y staff)
 */
export const updatePriority = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Usuario no autenticado',
      });
      return;
    }

    // Solo RESOLVER y staff pueden cambiar la prioridad
    if (!STAFF_HELPDESK_ROLES.has(req.user.role)) {
      res.status(403).json({
        success: false,
        message: 'No tienes permisos para cambiar la prioridad del ticket',
      });
      return;
    }

    const { id } = req.params;
    const ticketId = Array.isArray(id) ? id[0] : id;

    const validation = updateTicketPrioritySchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({
        success: false,
        message: 'Datos inválidos',
        errors: validation.error.flatten().fieldErrors,
      });
      return;
    }

    const ticket = await ticketService.updatePriority(ticketId, validation.data.priority);

    res.json({
      success: true,
      message: 'Prioridad actualizada exitosamente',
      data: ticket,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
    
    if (errorMessage === 'TICKET_NOT_FOUND') {
      res.status(404).json({
        success: false,
        message: 'Ticket no encontrado',
      });
      return;
    }

    AppLogger.error('Error updating ticket priority:', error);
    res.status(500).json({
      success: false,
      message: 'Error al actualizar la prioridad del ticket',
    });
  }
};

/**
 * PATCH /api/helpdesk/tickets/:id/status
 * Actualizar estado del ticket (solo RESOLVER y staff)
 */
export const updateStatus = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Usuario no autenticado',
      });
      return;
    }

    // Solo RESOLVER y staff pueden cambiar el estado
    if (!STAFF_HELPDESK_ROLES.has(req.user.role)) {
      res.status(403).json({
        success: false,
        message: 'No tienes permisos para cambiar el estado del ticket',
      });
      return;
    }

    const { id } = req.params;
    const ticketId = Array.isArray(id) ? id[0] : id;

    const validation = updateTicketStatusSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({
        success: false,
        message: 'Datos inválidos',
        errors: validation.error.flatten().fieldErrors,
      });
      return;
    }

    const ticket = await ticketService.updateStatus(ticketId, validation.data.status);

    res.json({
      success: true,
      message: 'Estado actualizado exitosamente',
      data: ticket,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
    
    if (errorMessage === 'TICKET_NOT_FOUND') {
      res.status(404).json({
        success: false,
        message: 'Ticket no encontrado',
      });
      return;
    }

    if (errorMessage === 'INVALID_STATUS_TRANSITION') {
      res.status(400).json({
        success: false,
        message: 'Transición de estado no válida',
      });
      return;
    }

    AppLogger.error('Error updating ticket status:', error);
    res.status(500).json({
      success: false,
      message: 'Error al actualizar el estado del ticket',
    });
  }
};

export const ticketController = {
  create: createTicket,
  getMyTickets,
  getUnreadSummary,
  markAsRead,
  getById: getTicketById,
  close: closeTicket,
  reopen: reopenTicket,
  updatePriority,
  updateStatus,
};

export default ticketController;
