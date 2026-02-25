/**
 * @jest-environment node
 */

jest.mock('../src/services/internal-notification.service', () => ({
  InternalNotificationService: {
    getUserNotifications: jest.fn(),
    getUnreadCount: jest.fn(),
    markAsRead: jest.fn(),
    markAllAsRead: jest.fn(),
    deleteNotification: jest.fn(),
    deleteAllRead: jest.fn(),
  },
}));

jest.mock('../src/config/logger', () => ({
  AppLogger: { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

jest.mock('../src/utils/params', () => ({
  parseParamId: jest.fn((params: Record<string, string>, key: string) => parseInt(params[key])),
}));

import { NotificationsController } from '../src/controllers/notifications.controller';
import { InternalNotificationService } from '../src/services/internal-notification.service';

function mockReq(overrides: Record<string, any> = {}): any {
  return {
    user: { userId: 1 },
    query: {},
    params: {},
    body: {},
    ...overrides,
  };
}

function mockRes(): any {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

describe('NotificationsController', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('getUserNotifications', () => {
    it('should return 401 when no userId', async () => {
      const req = mockReq({ user: {} });
      const res = mockRes();

      await NotificationsController.getUserNotifications(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ code: 'UNAUTHORIZED' }));
    });

    it('should return notifications on success', async () => {
      const mockResult = {
        data: [{ id: 1, message: 'test' }],
        pagination: { page: 1, limit: 20, total: 1 },
        unreadCount: 1,
      };
      (InternalNotificationService.getUserNotifications as jest.Mock).mockResolvedValue(mockResult);

      const req = mockReq({ query: { page: '2', limit: '10', unreadOnly: 'true' } });
      const res = mockRes();

      await NotificationsController.getUserNotifications(req, res);

      expect(InternalNotificationService.getUserNotifications).toHaveBeenCalledWith(1, {
        page: 2, limit: 10, unreadOnly: true,
      });
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        data: mockResult.data,
        unreadCount: 1,
      }));
    });

    it('should use default page/limit when not provided', async () => {
      (InternalNotificationService.getUserNotifications as jest.Mock).mockResolvedValue({
        data: [], pagination: {}, unreadCount: 0,
      });

      const req = mockReq({ query: {} });
      const res = mockRes();

      await NotificationsController.getUserNotifications(req, res);

      expect(InternalNotificationService.getUserNotifications).toHaveBeenCalledWith(1, {
        page: 1, limit: 20, unreadOnly: false,
      });
    });

    it('should return 500 on error', async () => {
      (InternalNotificationService.getUserNotifications as jest.Mock).mockRejectedValue(new Error('fail'));

      const req = mockReq();
      const res = mockRes();

      await NotificationsController.getUserNotifications(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ code: 'GET_NOTIFICATIONS_ERROR' }));
    });
  });

  describe('getUnreadCount', () => {
    it('should return 401 when no userId', async () => {
      const req = mockReq({ user: {} });
      const res = mockRes();

      await NotificationsController.getUnreadCount(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
    });

    it('should return unread count on success', async () => {
      (InternalNotificationService.getUnreadCount as jest.Mock).mockResolvedValue(5);

      const req = mockReq();
      const res = mockRes();

      await NotificationsController.getUnreadCount(req, res);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        data: { count: 5 },
      }));
    });

    it('should return 500 on error', async () => {
      (InternalNotificationService.getUnreadCount as jest.Mock).mockRejectedValue(new Error('fail'));

      const req = mockReq();
      const res = mockRes();

      await NotificationsController.getUnreadCount(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ code: 'GET_UNREAD_COUNT_ERROR' }));
    });
  });

  describe('markAsRead', () => {
    it('should return 401 when no userId', async () => {
      const req = mockReq({ user: {} });
      const res = mockRes();

      await NotificationsController.markAsRead(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
    });

    it('should mark notification as read on success', async () => {
      (InternalNotificationService.markAsRead as jest.Mock).mockResolvedValue(undefined);

      const req = mockReq({ params: { id: '42' } });
      const res = mockRes();

      await NotificationsController.markAsRead(req, res);

      expect(InternalNotificationService.markAsRead).toHaveBeenCalledWith(42, 1);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    it('should return 500 on error', async () => {
      (InternalNotificationService.markAsRead as jest.Mock).mockRejectedValue(new Error('fail'));

      const req = mockReq({ params: { id: '1' } });
      const res = mockRes();

      await NotificationsController.markAsRead(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ code: 'MARK_READ_ERROR' }));
    });
  });

  describe('markAllAsRead', () => {
    it('should return 401 when no userId', async () => {
      const req = mockReq({ user: {} });
      const res = mockRes();

      await NotificationsController.markAllAsRead(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
    });

    it('should mark all as read on success', async () => {
      (InternalNotificationService.markAllAsRead as jest.Mock).mockResolvedValue(undefined);

      const req = mockReq();
      const res = mockRes();

      await NotificationsController.markAllAsRead(req, res);

      expect(InternalNotificationService.markAllAsRead).toHaveBeenCalledWith(1);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    it('should return 500 on error', async () => {
      (InternalNotificationService.markAllAsRead as jest.Mock).mockRejectedValue(new Error('fail'));

      const req = mockReq();
      const res = mockRes();

      await NotificationsController.markAllAsRead(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ code: 'MARK_ALL_READ_ERROR' }));
    });
  });

  describe('deleteNotification', () => {
    it('should return 401 when no userId', async () => {
      const req = mockReq({ user: {} });
      const res = mockRes();

      await NotificationsController.deleteNotification(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
    });

    it('should delete notification on success', async () => {
      (InternalNotificationService.deleteNotification as jest.Mock).mockResolvedValue(undefined);

      const req = mockReq({ params: { id: '10' } });
      const res = mockRes();

      await NotificationsController.deleteNotification(req, res);

      expect(InternalNotificationService.deleteNotification).toHaveBeenCalledWith(10, 1);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    it('should return 500 on error', async () => {
      (InternalNotificationService.deleteNotification as jest.Mock).mockRejectedValue(new Error('fail'));

      const req = mockReq({ params: { id: '1' } });
      const res = mockRes();

      await NotificationsController.deleteNotification(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ code: 'DELETE_NOTIFICATION_ERROR' }));
    });
  });

  describe('deleteAllRead', () => {
    it('should return 401 when no userId', async () => {
      const req = mockReq({ user: {} });
      const res = mockRes();

      await NotificationsController.deleteAllRead(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
    });

    it('should delete all read on success', async () => {
      (InternalNotificationService.deleteAllRead as jest.Mock).mockResolvedValue(undefined);

      const req = mockReq();
      const res = mockRes();

      await NotificationsController.deleteAllRead(req, res);

      expect(InternalNotificationService.deleteAllRead).toHaveBeenCalledWith(1);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    it('should return 500 on error', async () => {
      (InternalNotificationService.deleteAllRead as jest.Mock).mockRejectedValue(new Error('fail'));

      const req = mockReq();
      const res = mockRes();

      await NotificationsController.deleteAllRead(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ code: 'DELETE_ALL_READ_ERROR' }));
    });
  });
});
