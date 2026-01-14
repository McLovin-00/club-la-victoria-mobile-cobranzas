import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware';
import { InternalNotificationService } from '../services/internal-notification.service';
import { AppLogger } from '../config/logger';
import { parseParamId } from '../utils/params';

/**
 * Controlador de Notificaciones Internas
 */
export class NotificationsController {
  
  /**
   * GET /api/docs/notifications - Obtener notificaciones del usuario
   */
  static async getUserNotifications(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ success: false, message: 'Usuario no autenticado', code: 'UNAUTHORIZED' });
        return;
      }

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const unreadOnly = req.query.unreadOnly === 'true';

      const result = await InternalNotificationService.getUserNotifications(userId, {
        page,
        limit,
        unreadOnly,
      });

      res.json({
        success: true,
        data: result.data,
        pagination: result.pagination,
        unreadCount: result.unreadCount,
      });
    } catch (error) {
      AppLogger.error('Error obteniendo notificaciones:', error);
      res.status(500).json({ success: false, message: 'Error interno', code: 'GET_NOTIFICATIONS_ERROR' });
    }
  }

  /**
   * GET /api/docs/notifications/unread-count - Obtener contador de no leídas
   */
  static async getUnreadCount(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ success: false, message: 'Usuario no autenticado', code: 'UNAUTHORIZED' });
        return;
      }

      const count = await InternalNotificationService.getUnreadCount(userId);

      res.json({
        success: true,
        data: { count },
      });
    } catch (error) {
      AppLogger.error('Error obteniendo contador:', error);
      res.status(500).json({ success: false, message: 'Error interno', code: 'GET_UNREAD_COUNT_ERROR' });
    }
  }

  /**
   * PATCH /api/docs/notifications/:id/read - Marcar como leída
   */
  static async markAsRead(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ success: false, message: 'Usuario no autenticado', code: 'UNAUTHORIZED' });
        return;
      }

      const notificationId = parseParamId(req.params, 'id');
      await InternalNotificationService.markAsRead(notificationId, userId);

      res.json({
        success: true,
        message: 'Notificación marcada como leída',
      });
    } catch (error) {
      AppLogger.error('Error marcando como leída:', error);
      res.status(500).json({ success: false, message: 'Error interno', code: 'MARK_READ_ERROR' });
    }
  }

  /**
   * POST /api/docs/notifications/mark-all-read - Marcar todas como leídas
   */
  static async markAllAsRead(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ success: false, message: 'Usuario no autenticado', code: 'UNAUTHORIZED' });
        return;
      }

      await InternalNotificationService.markAllAsRead(userId);

      res.json({
        success: true,
        message: 'Todas las notificaciones marcadas como leídas',
      });
    } catch (error) {
      AppLogger.error('Error marcando todas como leídas:', error);
      res.status(500).json({ success: false, message: 'Error interno', code: 'MARK_ALL_READ_ERROR' });
    }
  }

  /**
   * DELETE /api/docs/notifications/:id - Borrar notificación
   */
  static async deleteNotification(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ success: false, message: 'Usuario no autenticado', code: 'UNAUTHORIZED' });
        return;
      }

      const notificationId = parseParamId(req.params, 'id');
      await InternalNotificationService.deleteNotification(notificationId, userId);

      res.json({
        success: true,
        message: 'Notificación borrada',
      });
    } catch (error) {
      AppLogger.error('Error borrando notificación:', error);
      res.status(500).json({ success: false, message: 'Error interno', code: 'DELETE_NOTIFICATION_ERROR' });
    }
  }

  /**
   * POST /api/docs/notifications/delete-all-read - Borrar todas las leídas
   */
  static async deleteAllRead(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ success: false, message: 'Usuario no autenticado', code: 'UNAUTHORIZED' });
        return;
      }

      await InternalNotificationService.deleteAllRead(userId);

      res.json({
        success: true,
        message: 'Todas las notificaciones leídas borradas',
      });
    } catch (error) {
      AppLogger.error('Error borrando todas las leídas:', error);
      res.status(500).json({ success: false, message: 'Error interno', code: 'DELETE_ALL_READ_ERROR' });
    }
  }
}