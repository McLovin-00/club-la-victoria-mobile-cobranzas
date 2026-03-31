import { Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import messageService from '../services/message.service';
import ticketService from '../services/ticket.service';
import { listMessagesQuerySchema } from '../schemas/message.schema';
import { AppLogger } from '../config/logger';
import { buildTicketViewerContext } from '../utils/viewer-context';
import { persistUploadedMessageFiles } from '../utils/message-attachments';

/**
 * POST /api/helpdesk/tickets/:ticketId/messages
 * Crear un mensaje en un ticket
 */
export const createMessage = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Usuario no autenticado',
      });
      return;
    }

    const { ticketId } = req.params;
    const ticketIdParam = Array.isArray(ticketId) ? ticketId[0] : ticketId;

    
    // Verify user owns the ticket
    const ticket = await ticketService.getById(ticketIdParam, buildTicketViewerContext(req));
    if (!ticket) {
      res.status(404).json({
        success: false,
        message: 'Ticket no encontrado',
      });
      return;
    }

    const contentInput = typeof req.body?.content === 'string' ? req.body.content.trim() : '';
    const files = Array.isArray(req.files) ? req.files : [];

    if (contentInput.length === 0 && files.length === 0) {
      res.status(400).json({
        success: false,
        message: 'Debes enviar texto o al menos un adjunto',
      });
      return;
    }

    const uploadResult = await persistUploadedMessageFiles(files, ticketIdParam);
    if (!uploadResult.ok) {
      res.status(400).json({
        success: false,
        message: uploadResult.message,
      });
      return;
    }
    const attachments = uploadResult.attachments;

    const userName = [req.user.nombre, req.user.apellido].filter(Boolean).join(' ') || req.user.email;
    const message = await messageService.createUser(
      ticketIdParam,
      req.user.id,
      userName,
      contentInput.length > 0 ? contentInput.slice(0, 5000) : 'Adjunto enviado desde la plataforma.',
      req.user.id,
      attachments
    );

    res.status(201).json({
      success: true,
      data: message,
    });
  } catch (error) {
    AppLogger.error('Error creating message:', error);
    res.status(500).json({
      success: false,
      message: 'Error al crear el mensaje',
    });
  }
};

/**
 * GET /api/helpdesk/tickets/:ticketId/messages
 * Listar mensajes de un ticket
 */
export const getMessages = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Usuario no autenticado',
      });
      return;
    }

    const { ticketId } = req.params;
    const ticketIdParam = Array.isArray(ticketId) ? ticketId[0] : ticketId;
    
    // Verify user owns the ticket
    const ticket = await ticketService.getById(ticketIdParam, buildTicketViewerContext(req));
    if (!ticket) {
      res.status(404).json({
        success: false,
        message: 'Ticket no encontrado',
      });
      return;
    }

    const validation = listMessagesQuerySchema.safeParse(req.query);
    if (!validation.success) {
      res.status(400).json({
        success: false,
        message: 'Parámetros inválidos',
        errors: validation.error.flatten().fieldErrors,
      });
      return;
    }

    const { page, limit } = validation.data;

    const result = await messageService.getByTicket(ticketIdParam, { page, limit });

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
    AppLogger.error('Error listing messages:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener mensajes',
    });
  }
};

export const messageController = {
  create: createMessage,
  getMessages,
};

export default messageController;
