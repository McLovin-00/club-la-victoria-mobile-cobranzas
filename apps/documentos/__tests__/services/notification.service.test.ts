/**
 * Tests unitarios para NotificationService
 */
import { prismaMock, resetPrismaMock } from '../mocks/prisma.mock';

// Mock database before importing
jest.mock('../../src/config/database', () => ({
  prisma: prismaMock,
  db: { getClient: () => prismaMock },
}));

jest.mock('../../src/config/logger', () => ({
  AppLogger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

jest.mock('../../src/services/email.service', () => ({
  EmailService: {
    sendNotificationEmail: jest.fn().mockResolvedValue(true),
  },
}));

import { NotificationService } from '../../src/services/notification.service';

describe('NotificationService', () => {
  beforeEach(() => {
    resetPrismaMock();
    jest.clearAllMocks();
  });

  describe('createNotification', () => {
    it('should create a notification', async () => {
      const mockNotification = {
        id: 1,
        userId: 1,
        type: 'DOCUMENT_APPROVED',
        title: 'Document Approved',
        message: 'Your document has been approved',
        read: false,
        createdAt: new Date(),
      };

      prismaMock.notification.create.mockResolvedValue(mockNotification);

      const result = await NotificationService.createNotification({
        userId: 1,
        type: 'DOCUMENT_APPROVED',
        title: 'Document Approved',
        message: 'Your document has been approved',
      });

      expect(result).toBeDefined();
      expect(result.id).toBe(1);
      expect(prismaMock.notification.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: 1,
            type: 'DOCUMENT_APPROVED',
          }),
        })
      );
    });
  });

  describe('getUnreadCount', () => {
    it('should return unread notification count', async () => {
      prismaMock.notification.count.mockResolvedValue(5);

      const result = await NotificationService.getUnreadCount(1);

      expect(result).toBe(5);
      expect(prismaMock.notification.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 1, read: false },
        })
      );
    });
  });

  describe('markAsRead', () => {
    it('should mark notification as read', async () => {
      const mockNotification = {
        id: 1,
        userId: 1,
        read: true,
      };

      prismaMock.notification.update.mockResolvedValue(mockNotification);

      const result = await NotificationService.markAsRead(1, 1);

      expect(result.read).toBe(true);
      expect(prismaMock.notification.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 1 },
          data: { read: true },
        })
      );
    });
  });

  describe('markAllAsRead', () => {
    it('should mark all notifications as read for user', async () => {
      prismaMock.notification.updateMany.mockResolvedValue({ count: 10 });

      const result = await NotificationService.markAllAsRead(1);

      expect(result.count).toBe(10);
      expect(prismaMock.notification.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 1, read: false },
          data: { read: true },
        })
      );
    });
  });

  describe('getUserNotifications', () => {
    it('should return paginated notifications', async () => {
      const mockNotifications = [
        { id: 1, userId: 1, type: 'INFO', title: 'Test', read: false },
        { id: 2, userId: 1, type: 'WARNING', title: 'Test 2', read: true },
      ];

      prismaMock.notification.findMany.mockResolvedValue(mockNotifications);
      prismaMock.notification.count.mockResolvedValue(2);

      const result = await NotificationService.getUserNotifications(1, 1, 10);

      expect(result.data).toHaveLength(2);
      expect(result.total).toBe(2);
    });

    it('should filter by read status', async () => {
      prismaMock.notification.findMany.mockResolvedValue([]);
      prismaMock.notification.count.mockResolvedValue(0);

      await NotificationService.getUserNotifications(1, 1, 10, { unreadOnly: true });

      expect(prismaMock.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            read: false,
          }),
        })
      );
    });
  });
});



