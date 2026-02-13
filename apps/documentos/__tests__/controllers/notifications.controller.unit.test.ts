/**
 * Propósito: tests unitarios de `NotificationsController` (paths UNAUTHORIZED y errores) para subir cobertura.
 */

import { beforeEach, describe, expect, it, jest } from '@jest/globals';

jest.mock('../../src/services/internal-notification.service', () => ({
  InternalNotificationService: {
    getUserNotifications: jest.fn(),
    getUnreadCount: jest.fn(),
    markAsRead: jest.fn(),
    markAllAsRead: jest.fn(),
    deleteNotification: jest.fn(),
    deleteAllRead: jest.fn(),
  },
}));

jest.mock('../../src/config/logger', () => ({
  AppLogger: {
    error: jest.fn(),
  },
}));

jest.mock('../../src/utils/params', () => ({
  parseParamId: jest.fn(() => 123),
}));

import { NotificationsController } from '../../src/controllers/notifications.controller';
import { InternalNotificationService } from '../../src/services/internal-notification.service';

function createRes() {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
}

describe('NotificationsController (unit)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('getUserNotifications responde 401 si no hay userId', async () => {
    const req: any = { user: undefined, query: {} };
    const res = createRes();

    await NotificationsController.getUserNotifications(req, res as any);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, code: 'UNAUTHORIZED' })
    );
    expect(InternalNotificationService.getUserNotifications).not.toHaveBeenCalled();
  });

  it('getUnreadCount responde 500 si el service falla', async () => {
    (InternalNotificationService.getUnreadCount as jest.Mock).mockRejectedValueOnce(new Error('boom'));
    const req: any = { user: { userId: 7 }, query: {} };
    const res = createRes();

    await NotificationsController.getUnreadCount(req, res as any);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, code: 'GET_UNREAD_COUNT_ERROR' })
    );
  });

  it('getUserNotifications responde success y parsea paginación + unreadOnly', async () => {
    (InternalNotificationService.getUserNotifications as jest.Mock).mockResolvedValueOnce({
      data: [{ id: 1 }],
      pagination: { page: 2, limit: 5, total: 1, totalPages: 1 },
      unreadCount: 1,
    });
    const req: any = { user: { userId: 7 }, query: { page: '2', limit: '5', unreadOnly: 'true' } };
    const res = createRes();

    await NotificationsController.getUserNotifications(req, res as any);

    expect(InternalNotificationService.getUserNotifications).toHaveBeenCalledWith(7, {
      page: 2,
      limit: 5,
      unreadOnly: true,
    });
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true, data: [{ id: 1 }], unreadCount: 1 })
    );
  });

  it('markAsRead responde success y usa parseParamId', async () => {
    const req: any = { user: { userId: 7 }, params: { id: '99' } };
    const res = createRes();

    await NotificationsController.markAsRead(req, res as any);

    expect(InternalNotificationService.markAsRead).toHaveBeenCalledWith(123, 7);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true, message: expect.stringContaining('leída') })
    );
  });

  it('markAsRead responde 500 si el service falla', async () => {
    (InternalNotificationService.markAsRead as jest.Mock).mockRejectedValueOnce(new Error('boom'));
    const req: any = { user: { userId: 7 }, params: { id: '99' } };
    const res = createRes();

    await NotificationsController.markAsRead(req, res as any);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, code: 'MARK_READ_ERROR' })
    );
  });

  it('markAllAsRead responde success', async () => {
    (InternalNotificationService.markAllAsRead as jest.Mock).mockResolvedValueOnce(undefined);
    const req: any = { user: { userId: 7 } };
    const res = createRes();

    await NotificationsController.markAllAsRead(req, res as any);

    expect(InternalNotificationService.markAllAsRead).toHaveBeenCalledWith(7);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true, message: expect.stringContaining('marcadas') })
    );
  });

  it('markAllAsRead responde 500 si el service falla', async () => {
    (InternalNotificationService.markAllAsRead as jest.Mock).mockRejectedValueOnce(new Error('boom'));
    const req: any = { user: { userId: 7 } };
    const res = createRes();

    await NotificationsController.markAllAsRead(req, res as any);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, code: 'MARK_ALL_READ_ERROR' })
    );
  });

  it('deleteNotification responde 500 si el service falla', async () => {
    (InternalNotificationService.deleteNotification as jest.Mock).mockRejectedValueOnce(new Error('boom'));
    const req: any = { user: { userId: 7 }, params: { id: '99' } };
    const res = createRes();

    await NotificationsController.deleteNotification(req, res as any);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, code: 'DELETE_NOTIFICATION_ERROR' })
    );
  });

  it('deleteAllRead responde 401 si no hay userId', async () => {
    const req: any = { user: undefined };
    const res = createRes();

    await NotificationsController.deleteAllRead(req, res as any);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, code: 'UNAUTHORIZED' })
    );
  });

  it('deleteAllRead responde 500 si el service falla', async () => {
    (InternalNotificationService.deleteAllRead as jest.Mock).mockRejectedValueOnce(new Error('boom'));
    const req: any = { user: { userId: 7 } };
    const res = createRes();

    await NotificationsController.deleteAllRead(req, res as any);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, code: 'DELETE_ALL_READ_ERROR' })
    );
  });
});

