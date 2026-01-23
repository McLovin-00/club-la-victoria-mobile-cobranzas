import { prismaMock, resetPrismaMock } from '../mocks/prisma.mock';

jest.mock('../../src/config/database', () => ({
  db: { getClient: () => prismaMock },
}));

jest.mock('../../src/config/logger', () => ({
  AppLogger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

jest.mock('../../src/services/websocket.service', () => ({
  webSocketService: {
    notifyUser: jest.fn(),
  },
}));

import { InternalNotificationService } from '../../src/services/internal-notification.service';
import { webSocketService } from '../../src/services/websocket.service';
import { AppLogger } from '../../src/config/logger';

describe('InternalNotificationService', () => {
  beforeEach(() => {
    resetPrismaMock();
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create notification and send realtime', async () => {
      const mockNotification = {
        id: 1,
        userId: 1,
        type: 'DOCUMENT_REJECTED',
        title: 'Test',
        message: 'Test message',
        priority: 'high',
        createdAt: new Date(),
      };

      prismaMock.internalNotification.create.mockResolvedValueOnce(mockNotification as any);

      const data = {
        tenantEmpresaId: 1,
        userId: 1,
        type: 'DOCUMENT_REJECTED' as const,
        title: 'Test',
        message: 'Test message',
        priority: 'high' as const,
      };

      const result = await InternalNotificationService.create(data);

      expect(prismaMock.internalNotification.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          tenantEmpresaId: 1,
          userId: 1,
          type: 'DOCUMENT_REJECTED',
          title: 'Test',
          message: 'Test message',
          priority: 'high',
        }),
      });

      expect(result).toEqual(mockNotification);
      expect(webSocketService.notifyUser).toHaveBeenCalled();
    });

    it('should use default priority normal when not provided', async () => {
      prismaMock.internalNotification.create.mockResolvedValueOnce({ id: 1 } as any);

      const data = {
        tenantEmpresaId: 1,
        userId: 1,
        type: 'DOCUMENT_APPROVED' as const,
        title: 'Test',
        message: 'Test',
      };

      await InternalNotificationService.create(data);

      expect(prismaMock.internalNotification.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          priority: 'normal',
        }),
      });
    });

    it('should handle errors and rethrow', async () => {
      prismaMock.internalNotification.create.mockRejectedValueOnce(new Error('DB Error'));

      const data = {
        tenantEmpresaId: 1,
        userId: 1,
        type: 'DOCUMENT_REJECTED' as const,
        title: 'Test',
        message: 'Test',
      };

      await expect(InternalNotificationService.create(data)).rejects.toThrow('DB Error');
      expect(AppLogger.error).toHaveBeenCalledWith(expect.stringContaining('Error creando notificación'), expect.any(Error));
    });
  });

  describe('createMany', () => {
    it('should return early when array is empty', async () => {
      await InternalNotificationService.createMany([]);

      expect(prismaMock.internalNotification.createMany).not.toHaveBeenCalled();
    });

    it('should create multiple notifications and send realtime', async () => {
      prismaMock.internalNotification.createMany.mockResolvedValueOnce({ count: 2 } as any);

      const data = [
        {
          tenantEmpresaId: 1,
          userId: 1,
          type: 'DOCUMENT_REJECTED' as const,
          title: 'Test 1',
          message: 'Message 1',
          priority: 'high' as const,
        },
        {
          tenantEmpresaId: 1,
          userId: 2,
          type: 'DOCUMENT_APPROVED' as const,
          title: 'Test 2',
          message: 'Message 2',
          priority: 'normal' as const,
        },
      ];

      await InternalNotificationService.createMany(data);

      expect(prismaMock.internalNotification.createMany).toHaveBeenCalledWith({
        data: expect.arrayContaining([
          expect.objectContaining({ userId: 1, title: 'Test 1' }),
          expect.objectContaining({ userId: 2, title: 'Test 2' }),
        ]),
      });

      expect(webSocketService.notifyUser).toHaveBeenCalledTimes(2);
    });

    it('should handle errors and rethrow', async () => {
      prismaMock.internalNotification.createMany.mockRejectedValueOnce(new Error('DB Error'));

      const data = [
        {
          tenantEmpresaId: 1,
          userId: 1,
          type: 'DOCUMENT_REJECTED' as const,
          title: 'Test',
          message: 'Test',
        },
      ];

      await expect(InternalNotificationService.createMany(data)).rejects.toThrow('DB Error');
    });
  });

  describe('getUserNotifications', () => {
    it('should return notifications with pagination', async () => {
      const mockNotifications = [
        { id: 1, userId: 1, title: 'Test 1' },
        { id: 2, userId: 1, title: 'Test 2' },
      ];

      prismaMock.internalNotification.findMany.mockResolvedValueOnce(mockNotifications as any);
      prismaMock.internalNotification.count.mockResolvedValueOnce(2);
      prismaMock.internalNotification.count.mockResolvedValueOnce(1);

      const result = await InternalNotificationService.getUserNotifications(1);

      expect(result.data).toEqual(mockNotifications);
      expect(result.pagination).toEqual({
        page: 1,
        limit: 20,
        total: 2,
        pages: 1,
      });
      expect(result.unreadCount).toBe(1);
    });

    it('should filter unread when requested', async () => {
      prismaMock.internalNotification.findMany.mockResolvedValueOnce([]);
      prismaMock.internalNotification.count.mockResolvedValueOnce(0);
      prismaMock.internalNotification.count.mockResolvedValueOnce(0);

      await InternalNotificationService.getUserNotifications(1, { unreadOnly: true });

      expect(prismaMock.internalNotification.findMany).toHaveBeenCalledWith({
        where: expect.objectContaining({
          userId: 1,
          deleted: false,
          read: false,
        }),
        orderBy: { createdAt: 'desc' },
        skip: 0,
        take: 20,
      });
    });

    it('should handle custom pagination', async () => {
      prismaMock.internalNotification.findMany.mockResolvedValueOnce([]);
      prismaMock.internalNotification.count.mockResolvedValueOnce(0);
      prismaMock.internalNotification.count.mockResolvedValueOnce(0);

      await InternalNotificationService.getUserNotifications(1, { page: 2, limit: 10 });

      expect(prismaMock.internalNotification.findMany).toHaveBeenCalledWith({
        where: expect.any(Object),
        orderBy: { createdAt: 'desc' },
        skip: 10,
        take: 10,
      });
    });

    it('should handle errors', async () => {
      prismaMock.internalNotification.findMany.mockRejectedValueOnce(new Error('DB Error'));

      await expect(InternalNotificationService.getUserNotifications(1)).rejects.toThrow('DB Error');
    });
  });

  describe('getUnreadCount', () => {
    it('should return count of unread notifications', async () => {
      prismaMock.internalNotification.count.mockResolvedValueOnce(5);

      const result = await InternalNotificationService.getUnreadCount(1);

      expect(result).toBe(5);
      expect(prismaMock.internalNotification.count).toHaveBeenCalledWith({
        where: {
          userId: 1,
          read: false,
          deleted: false,
        },
      });
    });

    it('should return 0 on error', async () => {
      prismaMock.internalNotification.count.mockRejectedValueOnce(new Error('DB Error'));

      const result = await InternalNotificationService.getUnreadCount(1);

      expect(result).toBe(0);
    });
  });

  describe('markAsRead', () => {
    it('should mark notification as read', async () => {
      prismaMock.internalNotification.updateMany.mockResolvedValueOnce({ count: 1 } as any);

      await InternalNotificationService.markAsRead(1, 1);

      expect(prismaMock.internalNotification.updateMany).toHaveBeenCalledWith({
        where: {
          id: 1,
          userId: 1,
        },
        data: {
          read: true,
          readAt: expect.any(Date),
        },
      });
    });

    it('should handle errors gracefully', async () => {
      prismaMock.internalNotification.updateMany.mockRejectedValueOnce(new Error('DB Error'));

      await InternalNotificationService.markAsRead(1, 1);

      expect(AppLogger.error).toHaveBeenCalled();
    });
  });

  describe('markAllAsRead', () => {
    it('should mark all unread as read', async () => {
      prismaMock.internalNotification.updateMany.mockResolvedValueOnce({ count: 5 } as any);

      await InternalNotificationService.markAllAsRead(1);

      expect(prismaMock.internalNotification.updateMany).toHaveBeenCalledWith({
        where: {
          userId: 1,
          read: false,
          deleted: false,
        },
        data: {
          read: true,
          readAt: expect.any(Date),
        },
      });
    });

    it('should handle errors gracefully', async () => {
      prismaMock.internalNotification.updateMany.mockRejectedValueOnce(new Error('DB Error'));

      await InternalNotificationService.markAllAsRead(1);

      expect(AppLogger.error).toHaveBeenCalled();
    });
  });

  describe('deleteNotification', () => {
    it('should soft delete notification', async () => {
      prismaMock.internalNotification.updateMany.mockResolvedValueOnce({ count: 1 } as any);

      await InternalNotificationService.deleteNotification(1, 1);

      expect(prismaMock.internalNotification.updateMany).toHaveBeenCalledWith({
        where: {
          id: 1,
          userId: 1,
        },
        data: {
          deleted: true,
          deletedAt: expect.any(Date),
        },
      });
    });

    it('should handle errors gracefully', async () => {
      prismaMock.internalNotification.updateMany.mockRejectedValueOnce(new Error('DB Error'));

      await InternalNotificationService.deleteNotification(1, 1);

      expect(AppLogger.error).toHaveBeenCalled();
    });
  });

  describe('deleteAllRead', () => {
    it('should delete all read notifications', async () => {
      prismaMock.internalNotification.updateMany.mockResolvedValueOnce({ count: 3 } as any);

      await InternalNotificationService.deleteAllRead(1);

      expect(prismaMock.internalNotification.updateMany).toHaveBeenCalledWith({
        where: {
          userId: 1,
          read: true,
          deleted: false,
        },
        data: {
          deleted: true,
          deletedAt: expect.any(Date),
        },
      });
    });

    it('should handle errors gracefully', async () => {
      prismaMock.internalNotification.updateMany.mockRejectedValueOnce(new Error('DB Error'));

      await InternalNotificationService.deleteAllRead(1);

      expect(AppLogger.error).toHaveBeenCalled();
    });
  });

  describe('cleanupOldNotifications', () => {
    it('should delete old soft-deleted notifications', async () => {
      prismaMock.internalNotification.deleteMany.mockResolvedValueOnce({ count: 10 } as any);

      await InternalNotificationService.cleanupOldNotifications(90);

      expect(prismaMock.internalNotification.deleteMany).toHaveBeenCalledWith({
        where: {
          deleted: true,
          deletedAt: {
            lte: expect.any(Date),
          },
        },
      });
    });

    it('should use default 90 days when not specified', async () => {
      prismaMock.internalNotification.deleteMany.mockResolvedValueOnce({ count: 0 } as any);

      await InternalNotificationService.cleanupOldNotifications();

      expect(prismaMock.internalNotification.deleteMany).toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      prismaMock.internalNotification.deleteMany.mockRejectedValueOnce(new Error('DB Error'));

      await InternalNotificationService.cleanupOldNotifications();

      expect(AppLogger.error).toHaveBeenCalled();
    });
  });

  describe('sendRealtimeNotification', () => {
    const sendRealtimeNotification = (InternalNotificationService as any).sendRealtimeNotification;

    it('should send notification via WebSocket', () => {
      const mockNotification = {
        id: 1,
        userId: 1,
        type: 'DOCUMENT_REJECTED',
        title: 'Test',
        message: 'Test message',
        link: '/test',
        priority: 'high',
        createdAt: new Date(),
      };

      sendRealtimeNotification(mockNotification);

      expect(webSocketService.notifyUser).toHaveBeenCalledWith(1, {
        type: 'NEW_NOTIFICATION',
        notification: expect.objectContaining({
          id: 1,
          type: 'DOCUMENT_REJECTED',
          title: 'Test',
        }),
      });
    });

    it('should return early when webSocketService not available', () => {
      (webSocketService as any).notifyUser = undefined;

      sendRealtimeNotification({ id: 1, userId: 1 });

      expect(AppLogger.error).not.toHaveBeenCalled();
    });

    it('should handle WebSocket errors gracefully', () => {
      webSocketService.notifyUser = jest.fn(() => {
        throw new Error('WebSocket error');
      });

      sendRealtimeNotification({ id: 1, userId: 1 });

      expect(AppLogger.error).toHaveBeenCalled();
    });
  });

  describe('sendRealtimeNotificationToUser', () => {
    const sendRealtimeNotificationToUser = (InternalNotificationService as any).sendRealtimeNotificationToUser;

    it('should send notification to specific user', () => {
      const data = {
        type: 'DOCUMENT_REJECTED',
        title: 'Test',
        message: 'Test message',
        priority: 'high',
        createdAt: new Date().toISOString(),
      };

      sendRealtimeNotificationToUser(1, data);

      expect(webSocketService.notifyUser).toHaveBeenCalledWith(1, {
        type: 'NEW_NOTIFICATION',
        notification: data,
      });
    });

    it('should return early when webSocketService not available', () => {
      (webSocketService as any).notifyUser = undefined;

      sendRealtimeNotificationToUser(1, {});

      expect(AppLogger.error).not.toHaveBeenCalled();
    });

    it('should handle WebSocket errors gracefully', () => {
      webSocketService.notifyUser = jest.fn(() => {
        throw new Error('WebSocket error');
      });

      sendRealtimeNotificationToUser(1, {});

      expect(AppLogger.error).toHaveBeenCalled();
    });
  });
});
