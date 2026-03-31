/**
 * Mensajes de resolver desde la plataforma web (mismo senderType que Telegram).
 */

import { Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import messageService from '../services/message.service';
import ticketService from '../services/ticket.service';
import { AppLogger } from '../config/logger';
import { buildTicketViewerContext } from '../utils/viewer-context';
import { persistUploadedMessageFiles } from '../utils/message-attachments';

/**
 * POST /api/helpdesk/admin/tickets/:ticketId/messages
 * Staff autenticado responde al ticket como RESOLVER (visible para el creador como soporte).
 * Requiere `adminMiddleware` en la ruta.
 */
export const postAdminTicketMessage = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
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

    const ticket = await ticketService.getById(ticketIdParam, buildTicketViewerContext(req));
    if (!ticket) {
      res.status(404).json({
        success: false,
        message: 'Ticket no encontrado',
      });
      return;
    }

    if (ticket.createdBy === req.user.id) {
      res.status(400).json({
        success: false,
        message: 'Para mensajes como usuario del ticket usá el endpoint estándar de mensajes',
      });
      return;
    }

    if (ticket.status === 'CLOSED') {
      res.status(400).json({
        success: false,
        message: 'El ticket está cerrado',
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

    const resolverName =
      [req.user.nombre, req.user.apellido].filter(Boolean).join(' ').trim() || req.user.email;

    const message = await messageService.createResolver(
      ticketIdParam,
      resolverName,
      contentInput.length > 0 ? contentInput.slice(0, 5000) : 'Adjunto enviado desde la plataforma (soporte).',
      ticket.createdBy,
      undefined,
      uploadResult.attachments.length > 0 ? uploadResult.attachments : undefined,
      req.user.id
    );

    res.status(201).json({
      success: true,
      data: message,
    });
  } catch (error) {
    AppLogger.error('Error creating resolver message from web:', error);
    res.status(500).json({
      success: false,
      message: 'Error al crear el mensaje',
    });
  }
};
