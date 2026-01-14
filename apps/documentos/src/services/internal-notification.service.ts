import { db } from '../config/database';
import { AppLogger } from '../config/logger';
import { webSocketService } from './websocket.service';

export interface CreateInternalNotificationDto {
  tenantEmpresaId: number;
  userId: number;
  type: 'DOCUMENT_REJECTED' | 'DOCUMENT_APPROVED' | 'DOCUMENT_EXPIRING' | 'DOCUMENT_EXPIRED' | 'DOCUMENT_UPLOADED' | 'EQUIPO_INCOMPLETE' | 'EQUIPO_COMPLETE' | 'SYSTEM_ALERT';
  title: string;
  message: string;
  link?: string;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  metadata?: any;
  documentId?: number;
  equipoId?: number;
  remitoId?: number;
}

/**
 * Servicio para gestionar notificaciones internas de la plataforma
 */
export class InternalNotificationService {
  
  /**
   * Crear una notificación interna
   */
  static async create(data: CreateInternalNotificationDto): Promise<any> {
    try {
      const notification = await db.getClient().internalNotification.create({
        data: {
          tenantEmpresaId: data.tenantEmpresaId,
          userId: data.userId,
          type: data.type,
          title: data.title,
          message: data.message,
          link: data.link,
          priority: data.priority || 'normal',
          metadata: data.metadata || {},
          documentId: data.documentId,
          equipoId: data.equipoId,
          remitoId: data.remitoId,
        },
      });

      // Enviar notificación en tiempo real vía WebSocket
      this.sendRealtimeNotification(notification);

      AppLogger.info(`📬 Notificación interna creada: ${notification.id} para usuario ${data.userId}`);

      return notification;
    } catch (error) {
      AppLogger.error('Error creando notificación interna:', error);
      throw error;
    }
  }

  /**
   * Crear notificaciones para múltiples usuarios
   */
  static async createMany(dataArray: CreateInternalNotificationDto[]): Promise<void> {
    try {
      if (dataArray.length === 0) return;

      await db.getClient().internalNotification.createMany({
        data: dataArray.map((data) => ({
          tenantEmpresaId: data.tenantEmpresaId,
          userId: data.userId,
          type: data.type,
          title: data.title,
          message: data.message,
          link: data.link,
          priority: data.priority || 'normal',
          metadata: data.metadata || {},
          documentId: data.documentId,
          equipoId: data.equipoId,
          remitoId: data.remitoId,
        })),
      });

      AppLogger.info(`📬 ${dataArray.length} notificaciones internas creadas`);

      // Enviar notificaciones en tiempo real
      dataArray.forEach((data) => {
        this.sendRealtimeNotificationToUser(data.userId, {
          type: data.type,
          title: data.title,
          message: data.message,
          link: data.link,
          priority: data.priority || 'normal',
          createdAt: new Date().toISOString(),
        });
      });
    } catch (error) {
      AppLogger.error('Error creando notificaciones internas múltiples:', error);
      throw error;
    }
  }

  /**
   * Obtener notificaciones de un usuario (no borradas)
   */
  static async getUserNotifications(
    userId: number,
    options: {
      unreadOnly?: boolean;
      limit?: number;
      page?: number;
    } = {}
  ): Promise<{ data: any[]; pagination: { page: number; limit: number; total: number; pages: number }; unreadCount: number }> {
    try {
      const { unreadOnly = false, limit = 20, page = 1 } = options;
      const skip = (page - 1) * limit;

      const where: any = {
        userId,
        deleted: false,
      };

      if (unreadOnly) {
        where.read = false;
      }

      const [notifications, total, unreadCount] = await Promise.all([
        db.getClient().internalNotification.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
        }),
        db.getClient().internalNotification.count({ where }),
        db.getClient().internalNotification.count({
          where: { userId, read: false, deleted: false },
        }),
      ]);

      return {
        data: notifications,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
        unreadCount,
      };
    } catch (error) {
      AppLogger.error('Error obteniendo notificaciones del usuario:', error);
      throw error;
    }
  }

  /**
   * Obtener contador de notificaciones no leídas
   */
  static async getUnreadCount(userId: number): Promise<number> {
    try {
      return await db.getClient().internalNotification.count({
        where: {
          userId,
          read: false,
          deleted: false,
        },
      });
    } catch (error) {
      AppLogger.error('Error obteniendo contador de no leídas:', error);
      return 0;
    }
  }

  /**
   * Marcar notificación como leída
   */
  static async markAsRead(notificationId: number, userId: number): Promise<void> {
    try {
      await db.getClient().internalNotification.updateMany({
        where: {
          id: notificationId,
          userId, // Seguridad: solo el propietario puede marcar como leída
        },
        data: {
          read: true,
          readAt: new Date(),
        },
      });

      AppLogger.debug(`Notificación ${notificationId} marcada como leída`);
    } catch (error) {
      AppLogger.error('Error marcando notificación como leída:', error);
    }
  }

  /**
   * Marcar todas las notificaciones de un usuario como leídas
   */
  static async markAllAsRead(userId: number): Promise<void> {
    try {
      await db.getClient().internalNotification.updateMany({
        where: {
          userId,
          read: false,
          deleted: false,
        },
        data: {
          read: true,
          readAt: new Date(),
        },
      });

      AppLogger.info(`Todas las notificaciones del usuario ${userId} marcadas como leídas`);
    } catch (error) {
      AppLogger.error('Error marcando todas como leídas:', error);
    }
  }

  /**
   * Borrar (soft delete) una notificación
   */
  static async deleteNotification(notificationId: number, userId: number): Promise<void> {
    try {
      await db.getClient().internalNotification.updateMany({
        where: {
          id: notificationId,
          userId, // Seguridad: solo el propietario puede borrar
        },
        data: {
          deleted: true,
          deletedAt: new Date(),
        },
      });

      AppLogger.debug(`Notificación ${notificationId} borrada`);
    } catch (error) {
      AppLogger.error('Error borrando notificación:', error);
    }
  }

  /**
   * Borrar todas las notificaciones leídas de un usuario
   */
  static async deleteAllRead(userId: number): Promise<void> {
    try {
      await db.getClient().internalNotification.updateMany({
        where: {
          userId,
          read: true,
          deleted: false,
        },
        data: {
          deleted: true,
          deletedAt: new Date(),
        },
      });

      AppLogger.info(`Todas las notificaciones leídas del usuario ${userId} borradas`);
    } catch (error) {
      AppLogger.error('Error borrando todas las leídas:', error);
    }
  }

  /**
   * Enviar notificación en tiempo real vía WebSocket
   */
  private static sendRealtimeNotification(notification: any): void {
    try {
      if (!webSocketService || typeof webSocketService.notifyUser !== 'function') return;

      webSocketService.notifyUser(notification.userId, {
        type: 'NEW_NOTIFICATION',
        notification: {
          id: notification.id,
          type: notification.type,
          title: notification.title,
          message: notification.message,
          link: notification.link,
          priority: notification.priority,
          createdAt: notification.createdAt,
        },
      });
    } catch (error) {
      AppLogger.error('Error enviando notificación en tiempo real:', error);
    }
  }

  /**
   * Enviar notificación en tiempo real a un usuario específico
   */
  private static sendRealtimeNotificationToUser(userId: number, data: any): void {
    try {
      if (!webSocketService || typeof webSocketService.notifyUser !== 'function') return;

      webSocketService.notifyUser(userId, {
        type: 'NEW_NOTIFICATION',
        notification: data,
      });
    } catch (error) {
      AppLogger.error('Error enviando notificación en tiempo real:', error);
    }
  }

  /**
   * Limpiar notificaciones antiguas (job de mantenimiento)
   */
  static async cleanupOldNotifications(daysOld: number = 90): Promise<void> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);

      const result = await db.getClient().internalNotification.deleteMany({
        where: {
          deleted: true,
          deletedAt: {
            lte: cutoffDate,
          },
        },
      });

      AppLogger.info(`🧹 Limpieza de notificaciones: ${result.count} notificaciones antiguas eliminadas`);
    } catch (error) {
      AppLogger.error('Error en limpieza de notificaciones:', error);
    }
  }
}
