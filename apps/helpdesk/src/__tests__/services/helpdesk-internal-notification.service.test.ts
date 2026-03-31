/**
 * Unit Tests for Helpdesk Internal Notification Service
 */

// Mock dependencies
jest.mock('../../config/database', () => ({
  prisma: {
    $queryRawUnsafe: jest.fn(),
  },
}));

jest.mock('../../config/logger', () => ({
  AppLogger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

jest.mock('../../services/websocket.service', () => ({
  webSocketService: {
    notifyUser: jest.fn(),
  },
}));

import {
  notifyNewTicketToStaff,
  notifyTicketResponseToUser,
  notifyTicketReopenedToStaff,
  notifyTicketClosedToUser,
} from '../../services/helpdesk-internal-notification.service';
import { prisma } from '../../config/database';

describe('Helpdesk Internal Notification Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('notifyNewTicketToStaff', () => {
    test('should not send notifications when empresaId is null', async () => {
      const ticket = {
        id: 'ticket-1',
        number: 1,
        empresaId: null,
      } as any;

      await notifyNewTicketToStaff(ticket);

      expect(prisma.$queryRawUnsafe).not.toHaveBeenCalled();
    });

    test('should send notifications to staff excluding creator', async () => {
      (prisma.$queryRawUnsafe as jest.Mock)
        .mockResolvedValueOnce([
          { id: 1 },
          { id: 2 },
          { id: 3 },
        ])
        .mockResolvedValueOnce([{ id: 100, created_at: new Date() }])
        .mockResolvedValueOnce([{ id: 101, created_at: new Date() }]);

      const ticket = {
        id: 'ticket-1',
        number: 1,
        empresaId: 5,
        subject: 'Test subject',
        category: 'TECHNICAL',
        source: 'platform',
        priority: 'HIGH',
        createdBy: 3,
        createdByName: 'Test User',
      } as any;

      await notifyNewTicketToStaff(ticket);

      // Should be called 3 times (staff query + 2 notification inserts)
      expect(prisma.$queryRawUnsafe).toHaveBeenCalledTimes(3);
    });
  });

  describe('notifyTicketResponseToUser', () => {
    test('should not send notification when empresaId is null', async () => {
      const ticket = {
        id: 'ticket-1',
        number: 1,
        empresaId: null,
      } as any;

      await notifyTicketResponseToUser(ticket, 'Responder');

      expect(prisma.$queryRawUnsafe).not.toHaveBeenCalled();
    });

    test('should send notification to ticket creator', async () => {
      (prisma.$queryRawUnsafe as jest.Mock).mockResolvedValueOnce([
        { id: 100, created_at: new Date() },
      ]);

      const ticket = {
        id: 'ticket-1',
        number: 1,
        empresaId: 5,
        subject: 'Test subject',
        createdBy: 55,
      } as any;

      await notifyTicketResponseToUser(ticket, 'Support Agent');

      expect(prisma.$queryRawUnsafe).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO'),
        5,
        55,
        'HELPDESK_NEW_RESPONSE',
        expect.any(String),
        expect.any(String),
        expect.any(String),
        'high',
        expect.any(String)
      );
    });
  });

  describe('notifyTicketReopenedToStaff', () => {
    test('should not send notifications when empresaId is null', async () => {
      const ticket = {
        id: 'ticket-1',
        empresaId: null,
      } as any;

      await notifyTicketReopenedToStaff(ticket);

      expect(prisma.$queryRawUnsafe).not.toHaveBeenCalled();
    });

    test('should send reopened notifications to staff', async () => {
      (prisma.$queryRawUnsafe as jest.Mock)
        .mockResolvedValueOnce([{ id: 1 }, { id: 2 }])
        .mockResolvedValueOnce([{ id: 100, created_at: new Date() }])
        .mockResolvedValueOnce([{ id: 101, created_at: new Date() }]);

      const ticket = {
        id: 'ticket-1',
        number: 1,
        empresaId: 5,
        subject: 'Test subject',
        createdBy: 3,
        createdByName: 'Test User',
      } as any;

      await notifyTicketReopenedToStaff(ticket);

      // Verify query was called for staff recipients and for notifications
      expect(prisma.$queryRawUnsafe).toHaveBeenCalledWith(
        expect.stringContaining('platform_users'),
        5
      );
      // Verify notifications were created (at least 2 calls for staff)
      expect(prisma.$queryRawUnsafe).toHaveBeenCalledWith(
        expect.stringContaining('internal_notifications'),
        5,
        expect.any(Number),
        'HELPDESK_TICKET_REOPENED',
        expect.any(String),
        expect.any(String),
        expect.any(String),
        'high',
        expect.any(String)
      );
    });
  });

  describe('notifyTicketClosedToUser', () => {
    test('should not send notification when empresaId is null', async () => {
      const ticket = {
        id: 'ticket-1',
        empresaId: null,
      } as any;

      await notifyTicketClosedToUser(ticket, 'System');

      expect(prisma.$queryRawUnsafe).not.toHaveBeenCalled();
    });

    test('should send closed notification to user', async () => {
      (prisma.$queryRawUnsafe as jest.Mock).mockResolvedValueOnce([
        { id: 100, created_at: new Date() },
      ]);

      const ticket = {
        id: 'ticket-1',
        number: 1,
        empresaId: 5,
        subject: 'Test subject',
        createdBy: 55,
      } as any;

      await notifyTicketClosedToUser(ticket, 'Support Team');

      // Just verify that the notification was inserted query was called
      expect(prisma.$queryRawUnsafe).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO'),
        expect.any(Number),
        expect.any(Number),
        'HELPDESK_TICKET_CLOSED',
        expect.any(String),
        expect.any(String),
        expect.any(String),
        'normal',
        expect.any(String)
      );
    });
  });
});
