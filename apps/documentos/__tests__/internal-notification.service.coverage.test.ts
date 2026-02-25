/**
 * Coverage tests for InternalNotificationService – create, createMany,
 * getUserNotifications (pagination, unreadOnly), getUnreadCount,
 * markAsRead, markAllAsRead, deleteNotification, deleteAllRead,
 * cleanupOldNotifications, cleanupOldReadNotifications,
 * enforceUserNotificationLimit, runFullCleanup, and WebSocket branches.
 * @jest-environment node
 */

const mockDbClient: Record<string, any> = {
  internalNotification: {
    create: jest.fn(),
    createMany: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    updateMany: jest.fn(),
    deleteMany: jest.fn(),
  },
};

jest.mock('../src/config/database', () => ({
  db: { getClient: () => mockDbClient },
}));

jest.mock('../src/config/logger', () => ({
  AppLogger: { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

const mockNotifyUser = jest.fn();
jest.mock('../src/services/websocket.service', () => ({
  webSocketService: { notifyUser: mockNotifyUser },
}));

import { InternalNotificationService } from '../src/services/internal-notification.service';
import type { CreateInternalNotificationDto } from '../src/services/internal-notification.service';

function makeDto(overrides: Partial<CreateInternalNotificationDto> = {}): CreateInternalNotificationDto {
  return {
    tenantEmpresaId: 1,
    userId: 10,
    type: 'DOCUMENT_UPLOADED',
    title: 'Test',
    message: 'Test message',
    ...overrides,
  };
}

describe('InternalNotificationService (coverage)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ==========================================================================
  // create
  // ==========================================================================
  describe('create', () => {
    it('creates notification with defaults and sends WS', async () => {
      const fakeNotif = { id: 1, userId: 10, type: 'DOCUMENT_UPLOADED', title: 'T', message: 'M', priority: 'normal', createdAt: new Date() };
      mockDbClient.internalNotification.create.mockResolvedValue(fakeNotif);

      const result = await InternalNotificationService.create(makeDto());

      expect(mockDbClient.internalNotification.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          priority: 'normal',
          metadata: {},
        }),
      });
      expect(mockNotifyUser).toHaveBeenCalledWith(10, expect.objectContaining({ type: 'NEW_NOTIFICATION' }));
      expect(result).toEqual(fakeNotif);
    });

    it('uses provided priority and metadata', async () => {
      const fakeNotif = { id: 2, userId: 10, priority: 'high' };
      mockDbClient.internalNotification.create.mockResolvedValue(fakeNotif);

      await InternalNotificationService.create(makeDto({
        priority: 'high',
        metadata: { key: 'val' },
        link: '/link',
        documentId: 5,
        equipoId: 6,
        remitoId: 7,
      }));

      expect(mockDbClient.internalNotification.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          priority: 'high',
          metadata: { key: 'val' },
          link: '/link',
          documentId: 5,
          equipoId: 6,
          remitoId: 7,
        }),
      });
    });

    it('throws on database error', async () => {
      mockDbClient.internalNotification.create.mockRejectedValue(new Error('db fail'));

      await expect(InternalNotificationService.create(makeDto())).rejects.toThrow('db fail');
    });

    it('handles missing webSocketService gracefully', async () => {
      const fakeNotif = { id: 3, userId: 10 };
      mockDbClient.internalNotification.create.mockResolvedValue(fakeNotif);
      mockNotifyUser.mockImplementation(() => { throw new Error('ws fail'); });

      const result = await InternalNotificationService.create(makeDto());
      expect(result).toEqual(fakeNotif);
    });
  });

  // ==========================================================================
  // createMany
  // ==========================================================================
  describe('createMany', () => {
    it('skips when empty array', async () => {
      await InternalNotificationService.createMany([]);

      expect(mockDbClient.internalNotification.createMany).not.toHaveBeenCalled();
    });

    it('creates multiple notifications and sends WS to each', async () => {
      mockDbClient.internalNotification.createMany.mockResolvedValue({ count: 2 });

      await InternalNotificationService.createMany([
        makeDto({ userId: 10 }),
        makeDto({ userId: 20, priority: 'urgent' }),
      ]);

      expect(mockDbClient.internalNotification.createMany).toHaveBeenCalled();
      expect(mockNotifyUser).toHaveBeenCalledTimes(2);
    });

    it('throws on database error', async () => {
      mockDbClient.internalNotification.createMany.mockRejectedValue(new Error('fail'));

      await expect(
        InternalNotificationService.createMany([makeDto()])
      ).rejects.toThrow('fail');
    });
  });

  // ==========================================================================
  // getUserNotifications
  // ==========================================================================
  describe('getUserNotifications', () => {
    it('returns paginated notifications with defaults', async () => {
      mockDbClient.internalNotification.findMany.mockResolvedValue([{ id: 1 }]);
      mockDbClient.internalNotification.count
        .mockResolvedValueOnce(1) // total
        .mockResolvedValueOnce(0); // unread

      const result = await InternalNotificationService.getUserNotifications(10);

      expect(result.pagination).toEqual({ page: 1, limit: 20, total: 1, pages: 1 });
      expect(result.unreadCount).toBe(0);
    });

    it('filters unreadOnly when set', async () => {
      mockDbClient.internalNotification.findMany.mockResolvedValue([]);
      mockDbClient.internalNotification.count
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0);

      await InternalNotificationService.getUserNotifications(10, {
        unreadOnly: true,
        limit: 5,
        page: 2,
      });

      expect(mockDbClient.internalNotification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ read: false }),
          skip: 5,
          take: 5,
        })
      );
    });

    it('throws on database error', async () => {
      mockDbClient.internalNotification.findMany.mockRejectedValue(new Error('fail'));

      await expect(
        InternalNotificationService.getUserNotifications(10)
      ).rejects.toThrow('fail');
    });
  });

  // ==========================================================================
  // getUnreadCount
  // ==========================================================================
  describe('getUnreadCount', () => {
    it('returns count', async () => {
      mockDbClient.internalNotification.count.mockResolvedValue(3);

      const count = await InternalNotificationService.getUnreadCount(10);

      expect(count).toBe(3);
    });

    it('returns 0 on error', async () => {
      mockDbClient.internalNotification.count.mockRejectedValue(new Error('fail'));

      const count = await InternalNotificationService.getUnreadCount(10);

      expect(count).toBe(0);
    });
  });

  // ==========================================================================
  // markAsRead
  // ==========================================================================
  describe('markAsRead', () => {
    it('marks notification as read', async () => {
      mockDbClient.internalNotification.updateMany.mockResolvedValue({ count: 1 });

      await InternalNotificationService.markAsRead(1, 10);

      expect(mockDbClient.internalNotification.updateMany).toHaveBeenCalledWith({
        where: { id: 1, userId: 10 },
        data: expect.objectContaining({ read: true }),
      });
    });

    it('handles error gracefully', async () => {
      mockDbClient.internalNotification.updateMany.mockRejectedValue(new Error('fail'));

      await expect(
        InternalNotificationService.markAsRead(1, 10)
      ).resolves.toBeUndefined();
    });
  });

  // ==========================================================================
  // markAllAsRead
  // ==========================================================================
  describe('markAllAsRead', () => {
    it('marks all unread as read', async () => {
      mockDbClient.internalNotification.updateMany.mockResolvedValue({ count: 5 });

      await InternalNotificationService.markAllAsRead(10);

      expect(mockDbClient.internalNotification.updateMany).toHaveBeenCalledWith({
        where: { userId: 10, read: false, deleted: false },
        data: expect.objectContaining({ read: true }),
      });
    });

    it('handles error gracefully', async () => {
      mockDbClient.internalNotification.updateMany.mockRejectedValue(new Error('fail'));

      await expect(
        InternalNotificationService.markAllAsRead(10)
      ).resolves.toBeUndefined();
    });
  });

  // ==========================================================================
  // deleteNotification
  // ==========================================================================
  describe('deleteNotification', () => {
    it('soft-deletes a notification', async () => {
      mockDbClient.internalNotification.updateMany.mockResolvedValue({ count: 1 });

      await InternalNotificationService.deleteNotification(1, 10);

      expect(mockDbClient.internalNotification.updateMany).toHaveBeenCalledWith({
        where: { id: 1, userId: 10 },
        data: expect.objectContaining({ deleted: true }),
      });
    });

    it('handles error gracefully', async () => {
      mockDbClient.internalNotification.updateMany.mockRejectedValue(new Error('fail'));

      await expect(
        InternalNotificationService.deleteNotification(1, 10)
      ).resolves.toBeUndefined();
    });
  });

  // ==========================================================================
  // deleteAllRead
  // ==========================================================================
  describe('deleteAllRead', () => {
    it('soft-deletes all read notifications', async () => {
      mockDbClient.internalNotification.updateMany.mockResolvedValue({ count: 3 });

      await InternalNotificationService.deleteAllRead(10);

      expect(mockDbClient.internalNotification.updateMany).toHaveBeenCalledWith({
        where: { userId: 10, read: true, deleted: false },
        data: expect.objectContaining({ deleted: true }),
      });
    });

    it('handles error gracefully', async () => {
      mockDbClient.internalNotification.updateMany.mockRejectedValue(new Error('fail'));

      await expect(
        InternalNotificationService.deleteAllRead(10)
      ).resolves.toBeUndefined();
    });
  });

  // ==========================================================================
  // cleanupOldNotifications
  // ==========================================================================
  describe('cleanupOldNotifications', () => {
    it('deletes old soft-deleted notifications', async () => {
      mockDbClient.internalNotification.deleteMany.mockResolvedValue({ count: 5 });

      const count = await InternalNotificationService.cleanupOldNotifications(30);

      expect(count).toBe(5);
      expect(mockDbClient.internalNotification.deleteMany).toHaveBeenCalledWith({
        where: expect.objectContaining({ deleted: true }),
      });
    });

    it('returns 0 on error', async () => {
      mockDbClient.internalNotification.deleteMany.mockRejectedValue(new Error('fail'));

      const count = await InternalNotificationService.cleanupOldNotifications();

      expect(count).toBe(0);
    });
  });

  // ==========================================================================
  // cleanupOldReadNotifications
  // ==========================================================================
  describe('cleanupOldReadNotifications', () => {
    it('marks old read notifications for deletion', async () => {
      mockDbClient.internalNotification.updateMany.mockResolvedValue({ count: 10 });

      const count = await InternalNotificationService.cleanupOldReadNotifications(90);

      expect(count).toBe(10);
    });

    it('returns 0 on error', async () => {
      mockDbClient.internalNotification.updateMany.mockRejectedValue(new Error('fail'));

      const count = await InternalNotificationService.cleanupOldReadNotifications();

      expect(count).toBe(0);
    });
  });

  // ==========================================================================
  // enforceUserNotificationLimit
  // ==========================================================================
  describe('enforceUserNotificationLimit', () => {
    it('returns 0 when under limit', async () => {
      mockDbClient.internalNotification.count.mockResolvedValue(100);

      const count = await InternalNotificationService.enforceUserNotificationLimit(10, 500);

      expect(count).toBe(0);
    });

    it('deletes excess oldest read notifications', async () => {
      mockDbClient.internalNotification.count.mockResolvedValue(520);
      mockDbClient.internalNotification.findMany.mockResolvedValue([
        { id: 1 }, { id: 2 }, { id: 3 },
      ]);
      mockDbClient.internalNotification.updateMany.mockResolvedValue({ count: 3 });

      const count = await InternalNotificationService.enforceUserNotificationLimit(10, 500);

      expect(count).toBe(3);
      expect(mockDbClient.internalNotification.updateMany).toHaveBeenCalledWith({
        where: { id: { in: [1, 2, 3] } },
        data: expect.objectContaining({ deleted: true }),
      });
    });

    it('returns 0 when no oldest read to delete', async () => {
      mockDbClient.internalNotification.count.mockResolvedValue(520);
      mockDbClient.internalNotification.findMany.mockResolvedValue([]);

      const count = await InternalNotificationService.enforceUserNotificationLimit(10, 500);

      expect(count).toBe(0);
    });

    it('returns 0 on error', async () => {
      mockDbClient.internalNotification.count.mockRejectedValue(new Error('fail'));

      const count = await InternalNotificationService.enforceUserNotificationLimit(10);

      expect(count).toBe(0);
    });
  });

  // ==========================================================================
  // runFullCleanup
  // ==========================================================================
  describe('runFullCleanup', () => {
    it('runs both cleanup functions', async () => {
      mockDbClient.internalNotification.deleteMany.mockResolvedValue({ count: 2 });
      mockDbClient.internalNotification.updateMany.mockResolvedValue({ count: 3 });

      const result = await InternalNotificationService.runFullCleanup();

      expect(result).toEqual({ deleted: 2, autoDeleted: 3 });
    });
  });
});
