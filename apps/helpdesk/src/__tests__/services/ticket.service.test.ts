/**
 * Ticket Service - Unit Tests
 * Comprehensive tests for all exported functions
 */

import {
  createTicket,
  getTicketById,
  getTicketByNumber,
  getTicketsByUser,
  getAllTickets,
  updateTicketStatus,
  closeTicket,
  reopenTicket,
  getStats,
  updateConfirmedPriority,
  updatePriority,
  assignTicket,
  updateTelegramTopic,
  getTicketsForAutoClose,
  autoCloseTicket,
  attachFilesToFirstUserMessage,
} from '../../services/ticket.service';

// Mock the database module
jest.mock('../../config/database', () => ({
  prisma: {
    $transaction: jest.fn(),
    ticket: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
      aggregate: jest.fn(),
      create: jest.fn(),
      groupBy: jest.fn(),
    },
    ticketMessage: {
      create: jest.fn(),
      findFirst: jest.fn(),
    },
    messageAttachment: {
      createMany: jest.fn(),
    },
    $queryRaw: jest.fn(),
    $executeRawUnsafe: jest.fn().mockResolvedValue(undefined),
    $queryRawUnsafe: jest.fn().mockResolvedValue([]),
  },
}));

// Mock ticket-read-state service
jest.mock('../../services/ticket-read-state.service', () => ({
  markAsRead: jest.fn().mockResolvedValue(undefined),
  getUnreadSummaryForViewer: jest.fn().mockResolvedValue({ unreadTickets: 0, unreadMessages: 0 }),
}));

// Mock websocket service
jest.mock('../../services/websocket.service', () => ({
  webSocketService: {
    emitStatusChange: jest.fn(),
    emitPriorityChange: jest.fn(),
    emitTicketMessage: jest.fn(),
  },
}));

// Mock helpdesk-internal-notification service (default export)
jest.mock('../../services/helpdesk-internal-notification.service', () => ({
  __esModule: true,
  default: {
    notifyTicketClosedToUser: jest.fn().mockResolvedValue(undefined),
    notifyTicketReopenedToStaff: jest.fn().mockResolvedValue(undefined),
    notifyNewTicketToStaff: jest.fn().mockResolvedValue(undefined),
  },
}));

// Import after mocking
import { prisma } from '../../config/database';

const mockPrisma = prisma as jest.Mocked<typeof prisma>;

// Helper to create mock ticket
const createMockTicket = (overrides = {}) => ({
  id: 'clx123',
  number: 1,
  category: 'TECHNICAL',
  subcategory: 'ERROR',
  subject: 'Test ticket',
  status: 'OPEN',
  priority: 'NORMAL',
  empresaId: null,
  empresaNombre: null,
  createdBy: 1,
  createdByName: 'Test User',
  source: 'platform',
  createdAt: new Date(),
  updatedAt: new Date(),
  telegramTopicId: null,
  telegramGroupId: null,
  assignedTo: null,
  confirmedPriority: null,
  resolvedAt: null,
  closedAt: null,
  ...overrides,
});

describe('Ticket Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ============================================
  // createTicket
  // ============================================
  describe('createTicket', () => {
    it('should create a ticket with sequential number', async () => {
      const mockTicket = createMockTicket();

      (mockPrisma.$transaction as jest.Mock).mockImplementation(async (callback: Function) => {
        const mockTx = {
          ticket: {
            findFirst: jest.fn().mockResolvedValue({ number: 0 }),
            create: jest.fn().mockResolvedValue(mockTicket),
          },
          ticketMessage: {
            create: jest.fn().mockResolvedValue({ id: 'msg1' }),
          },
        };
        return callback(mockTx);
      });

      const result = await createTicket(
        {
          category: 'TECHNICAL',
          subcategory: 'ERROR',
          subject: 'Test ticket',
          priority: 'NORMAL',
          message: 'This is a test',
        },
        1,
        'Test User',
        'platform'
      );

      expect(result).toBeDefined();
      expect(result.subject).toBe('Test ticket');
    });

    it('should create ticket with empresa data when provided', async () => {
      const mockTicket = createMockTicket({ empresaId: 100, empresaNombre: 'Test Company' });

      (mockPrisma.$transaction as jest.Mock).mockImplementation(async (callback: Function) => {
        const mockTx = {
          ticket: {
            findFirst: jest.fn().mockResolvedValue({ number: 5 }),
            create: jest.fn().mockResolvedValue(mockTicket),
          },
          ticketMessage: {
            create: jest.fn().mockResolvedValue({ id: 'msg1' }),
          },
        };
        return callback(mockTx);
      });

      const result = await createTicket(
        {
          category: 'TECHNICAL',
          subcategory: 'ERROR',
          subject: 'Test ticket',
          priority: 'NORMAL',
          message: 'This is a test',
        },
        1,
        'Test User',
        'platform',
        100,
        'Test Company'
      );

      expect(result).toBeDefined();
      expect(result.empresaId).toBe(100);
    });
  });

  // ============================================
  // getTicketById
  // ============================================
  describe('getTicketById', () => {
    it('should return ticket by ID for SUPERADMIN', async () => {
      const mockTicket = createMockTicket({ messages: [] });

      (mockPrisma.ticket.findUnique as jest.Mock).mockResolvedValue(mockTicket);

      const result = await getTicketById('clx123', {
        userId: 1,
        role: 'SUPERADMIN',
        empresaId: null,
      });

      expect(result).toEqual(mockTicket);
    });

    it('should return null if ticket not found', async () => {
      (mockPrisma.ticket.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await getTicketById('nonexistent', {
        userId: 1,
        role: 'SUPERADMIN',
        empresaId: null,
      });

      expect(result).toBeNull();
    });

    it('should return ticket for ticket owner', async () => {
      const mockTicket = createMockTicket({ createdBy: 1, messages: [] });

      (mockPrisma.ticket.findUnique as jest.Mock).mockResolvedValue(mockTicket);

      const result = await getTicketById('clx123', {
        userId: 1,
        role: 'USER',
        empresaId: null,
      });

      expect(result).toEqual(mockTicket);
    });
  });

  // ============================================
  // getTicketByNumber
  // ============================================
  describe('getTicketByNumber', () => {
    it('should return ticket by number', async () => {
      const mockTicket = createMockTicket();

      (mockPrisma.ticket.findUnique as jest.Mock).mockResolvedValue(mockTicket);

      const result = await getTicketByNumber(1);

      expect(result).toEqual(mockTicket);
    });

    it('should return null if ticket not found', async () => {
      (mockPrisma.ticket.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await getTicketByNumber(999);

      expect(result).toBeNull();
    });
  });

  // ============================================
  // getTicketsByUser
  // ============================================
  describe('getTicketsByUser', () => {
    it('should return paginated tickets for user', async () => {
      const mockTickets = [createMockTicket(), createMockTicket({ id: 'clx456', number: 2 })];

      (mockPrisma.ticket.count as jest.Mock).mockResolvedValue(2);
      (mockPrisma.ticket.findMany as jest.Mock).mockResolvedValue(mockTickets);

      const result = await getTicketsByUser(1, {}, { page: 1, limit: 20 });

      expect(result.data).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
      expect(result.totalPages).toBe(1);
    });

    it('should apply status filter', async () => {
      const mockTickets = [createMockTicket()];

      (mockPrisma.ticket.count as jest.Mock).mockResolvedValue(1);
      (mockPrisma.ticket.findMany as jest.Mock).mockResolvedValue(mockTickets);

      const result = await getTicketsByUser(1, { status: 'OPEN' }, { page: 1 });

      expect(result.data).toHaveLength(1);
    });

    it('should apply search filter', async () => {
      const mockTickets = [createMockTicket({ subject: 'Error found' })];

      (mockPrisma.ticket.count as jest.Mock).mockResolvedValue(1);
      (mockPrisma.ticket.findMany as jest.Mock).mockResolvedValue(mockTickets);

      const result = await getTicketsByUser(1, { search: 'Error' }, { page: 1 });

      expect(result.data).toHaveLength(1);
    });

    it('should apply date range filter', async () => {
      const mockTickets = [createMockTicket()];

      (mockPrisma.ticket.count as jest.Mock).mockResolvedValue(1);
      (mockPrisma.ticket.findMany as jest.Mock).mockResolvedValue(mockTickets);

      const result = await getTicketsByUser(
        1,
        { from: new Date('2024-01-01'), to: new Date('2024-12-31') },
        { page: 1 }
      );

      expect(result.data).toHaveLength(1);
    });
  });

  // ============================================
  // getAllTickets
  // ============================================
  describe('getAllTickets', () => {
    it('should return all tickets for admin', async () => {
      const mockTickets = [createMockTicket(), createMockTicket({ id: 'clx456', number: 2 })];

      (mockPrisma.ticket.count as jest.Mock).mockResolvedValue(2);
      (mockPrisma.ticket.findMany as jest.Mock).mockResolvedValue(mockTickets);

      const result = await getAllTickets({}, { page: 1, limit: 20 }, false);

      expect(result.data).toHaveLength(2);
      expect(result.total).toBe(2);
    });

    it('should filter by empresaId', async () => {
      const mockTickets = [createMockTicket({ empresaId: 100 })];

      (mockPrisma.ticket.count as jest.Mock).mockResolvedValue(1);
      (mockPrisma.ticket.findMany as jest.Mock).mockResolvedValue(mockTickets);

      const result = await getAllTickets({ empresaId: 100 }, { page: 1 }, false);

      expect(result.data).toHaveLength(1);
    });

    it('should apply search filter with OR condition', async () => {
      const mockTickets = [createMockTicket({ createdByName: 'John Doe' })];

      (mockPrisma.ticket.count as jest.Mock).mockResolvedValue(1);
      (mockPrisma.ticket.findMany as jest.Mock).mockResolvedValue(mockTickets);

      const result = await getAllTickets({ search: 'John' }, { page: 1 }, false);

      expect(result.data).toHaveLength(1);
    });
  });

  // ============================================
  // updateTicketStatus
  // ============================================
  describe('updateTicketStatus', () => {
    it('should update ticket status from OPEN to IN_PROGRESS', async () => {
      const mockTicket = createMockTicket({ status: 'OPEN' });
      const mockUpdated = createMockTicket({ status: 'IN_PROGRESS' });

      (mockPrisma.ticket.findUnique as jest.Mock).mockResolvedValue(mockTicket);
      (mockPrisma.ticket.update as jest.Mock).mockResolvedValue(mockUpdated);

      const result = await updateTicketStatus('clx123', 'IN_PROGRESS', 1);

      expect(result.status).toBe('IN_PROGRESS');
    });

    it('should set resolvedAt when status is RESOLVED', async () => {
      const mockTicket = createMockTicket({ status: 'IN_PROGRESS' });
      const mockUpdated = createMockTicket({ status: 'RESOLVED', resolvedAt: new Date() });

      (mockPrisma.ticket.findUnique as jest.Mock).mockResolvedValue(mockTicket);
      (mockPrisma.ticket.update as jest.Mock).mockResolvedValue(mockUpdated);

      const result = await updateTicketStatus('clx123', 'RESOLVED', 1);

      expect(result.status).toBe('RESOLVED');
    });

    it('should throw error if ticket not found', async () => {
      (mockPrisma.ticket.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(updateTicketStatus('nonexistent', 'IN_PROGRESS')).rejects.toThrow('TICKET_NOT_FOUND');
    });

    it('should throw error for invalid status transition', async () => {
      const mockTicket = createMockTicket({ status: 'CLOSED' });

      (mockPrisma.ticket.findUnique as jest.Mock).mockResolvedValue(mockTicket);

      await expect(updateTicketStatus('clx123', 'OPEN')).rejects.toThrow(/INVALID_STATUS_TRANSITION/);
    });
  });

  // ============================================
  // closeTicket
  // ============================================
  describe('closeTicket', () => {
    it('should close an open ticket', async () => {
      const mockTicket = createMockTicket({ status: 'OPEN', closedAt: null, createdBy: 1 });
      const mockClosedTicket = createMockTicket({ status: 'CLOSED', closedAt: new Date(), createdBy: 1 });

      (mockPrisma.ticket.findUnique as jest.Mock).mockResolvedValue(mockTicket);
      (mockPrisma.ticket.update as jest.Mock).mockResolvedValue(mockClosedTicket);
      (mockPrisma.ticketMessage.create as jest.Mock).mockResolvedValue({ id: 'msg-close' });

      const result = await closeTicket('clx123', 1);

      expect(result.status).toBe('CLOSED');
      expect(result.closedAt).toBeDefined();
    });

    it('should throw error if ticket not found', async () => {
      (mockPrisma.ticket.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(closeTicket('nonexistent', 1)).rejects.toThrow('TICKET_NOT_FOUND');
    });

    it('should throw error if user is not ticket owner', async () => {
      const mockTicket = createMockTicket({ status: 'OPEN', createdBy: 1 });

      (mockPrisma.ticket.findUnique as jest.Mock).mockResolvedValue(mockTicket);

      await expect(closeTicket('clx123', 2)).rejects.toThrow('NOT_TICKET_OWNER');
    });

    it('should throw error if ticket is already closed', async () => {
      const mockTicket = createMockTicket({ status: 'CLOSED', closedAt: new Date(), createdBy: 1 });

      (mockPrisma.ticket.findUnique as jest.Mock).mockResolvedValue(mockTicket);

      await expect(closeTicket('clx123', 1)).rejects.toThrow('ALREADY_CLOSED');
    });
  });

  // ============================================
  // reopenTicket
  // ============================================
  describe('reopenTicket', () => {
    it('should reopen a closed ticket within 72 hours', async () => {
      const closedAt = new Date();
      closedAt.setHours(closedAt.getHours() - 24);

      const mockTicket = createMockTicket({ status: 'CLOSED', closedAt, createdBy: 1 });
      const mockReopenedTicket = createMockTicket({ status: 'OPEN', closedAt: null, resolvedAt: null, createdBy: 1 });

      (mockPrisma.ticket.findUnique as jest.Mock).mockResolvedValue(mockTicket);
      (mockPrisma.ticket.update as jest.Mock).mockResolvedValue(mockReopenedTicket);
      (mockPrisma.ticketMessage.create as jest.Mock).mockResolvedValue({ id: 'msg-reopen' });

      const result = await reopenTicket('clx123', 1, 'Reopening test');

      expect(result.status).toBe('OPEN');
    });

    it('should throw error if ticket closed more than 72 hours ago', async () => {
      const closedAt = new Date();
      closedAt.setHours(closedAt.getHours() - 100);

      const mockTicket = createMockTicket({ status: 'CLOSED', closedAt, createdBy: 1 });

      (mockPrisma.ticket.findUnique as jest.Mock).mockResolvedValue(mockTicket);

      await expect(reopenTicket('clx123', 1, 'Too late')).rejects.toThrow('REOPEN_WINDOW_EXPIRED');
    });

    it('should throw error if ticket is not closed', async () => {
      const mockTicket = createMockTicket({ status: 'OPEN', closedAt: null, createdBy: 1 });

      (mockPrisma.ticket.findUnique as jest.Mock).mockResolvedValue(mockTicket);

      await expect(reopenTicket('clx123', 1)).rejects.toThrow('TICKET_NOT_CLOSED');
    });

    it('should throw error if user is not ticket owner', async () => {
      const mockTicket = createMockTicket({ status: 'CLOSED', closedAt: new Date(), createdBy: 1 });

      (mockPrisma.ticket.findUnique as jest.Mock).mockResolvedValue(mockTicket);

      await expect(reopenTicket('clx123', 2)).rejects.toThrow('NOT_TICKET_OWNER');
    });
  });

  // ============================================
  // getStats
  // ============================================
  describe('getStats', () => {
    it('should return helpdesk statistics', async () => {
      (mockPrisma.ticket.groupBy as jest.Mock)
        .mockResolvedValueOnce([{ status: 'OPEN', _count: 5 }]) // status counts
        .mockResolvedValueOnce([{ category: 'TECHNICAL', _count: 3 }]) // category counts
        .mockResolvedValueOnce([{ priority: 'HIGH', _count: 2 }]); // priority counts

      (mockPrisma.ticket.findMany as jest.Mock).mockResolvedValue([
        { createdAt: new Date('2024-01-01'), resolvedAt: new Date('2024-01-02') },
      ]);

      const result = await getStats();

      expect(result.open).toBe(5);
      expect(result.total).toBe(5);
      expect(result.byCategory.technical).toBe(3);
      expect(result.byPriority.high).toBe(2);
    });

    it('should filter stats by empresaId', async () => {
      (mockPrisma.ticket.groupBy as jest.Mock)
        .mockResolvedValueOnce([{ status: 'OPEN', _count: 2 }])
        .mockResolvedValueOnce([{ category: 'TECHNICAL', _count: 1 }])
        .mockResolvedValueOnce([{ priority: 'NORMAL', _count: 2 }]);

      (mockPrisma.ticket.findMany as jest.Mock).mockResolvedValue([]);

      const result = await getStats(100);

      expect(result.open).toBe(2);
    });
  });

  // ============================================
  // updateConfirmedPriority
  // ============================================
  describe('updateConfirmedPriority', () => {
    it('should update confirmed priority', async () => {
      const mockTicket = createMockTicket({ confirmedPriority: 'HIGH' });

      (mockPrisma.ticket.update as jest.Mock).mockResolvedValue(mockTicket);

      const result = await updateConfirmedPriority('clx123', 'HIGH');

      expect(result.confirmedPriority).toBe('HIGH');
    });
  });

  // ============================================
  // updatePriority
  // ============================================
  describe('updatePriority', () => {
    it('should update ticket priority', async () => {
      const mockTicket = createMockTicket({ priority: 'NORMAL' });
      const mockUpdated = createMockTicket({ priority: 'HIGH' });

      (mockPrisma.ticket.findUnique as jest.Mock).mockResolvedValue(mockTicket);
      (mockPrisma.ticket.update as jest.Mock).mockResolvedValue(mockUpdated);

      const result = await updatePriority('clx123', 'HIGH');

      expect(result.priority).toBe('HIGH');
    });

    it('should throw error if ticket not found', async () => {
      (mockPrisma.ticket.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(updatePriority('nonexistent', 'HIGH')).rejects.toThrow('TICKET_NOT_FOUND');
    });
  });

  // ============================================
  // assignTicket
  // ============================================
  describe('assignTicket', () => {
    it('should assign ticket to a resolver', async () => {
      const mockTicket = createMockTicket({ assignedTo: 'resolver1' });

      (mockPrisma.ticket.update as jest.Mock).mockResolvedValue(mockTicket);

      const result = await assignTicket('clx123', 'resolver1');

      expect(result.assignedTo).toBe('resolver1');
    });
  });

  // ============================================
  // updateTelegramTopic
  // ============================================
  describe('updateTelegramTopic', () => {
    it('should update telegram topic info', async () => {
      const mockTicket = createMockTicket({ telegramTopicId: 123, telegramGroupId: '-1001234567890' });

      (mockPrisma.ticket.update as jest.Mock).mockResolvedValue(mockTicket);

      const result = await updateTelegramTopic('clx123', 123, '-1001234567890');

      expect(result.telegramTopicId).toBe(123);
      expect(result.telegramGroupId).toBe('-1001234567890');
    });
  });

  // ============================================
  // getTicketsForAutoClose
  // ============================================
  describe('getTicketsForAutoClose', () => {
    it('should return tickets ready for auto-close', async () => {
      const mockTickets = [
        createMockTicket({ status: 'RESOLVED', resolvedAt: new Date(Date.now() - 100 * 60 * 60 * 1000) }),
      ];

      (mockPrisma.ticket.findMany as jest.Mock).mockResolvedValue(mockTickets);

      const result = await getTicketsForAutoClose(72);

      expect(result).toHaveLength(1);
    });

    it('should use custom threshold', async () => {
      (mockPrisma.ticket.findMany as jest.Mock).mockResolvedValue([]);

      await getTicketsForAutoClose(48);

      expect(mockPrisma.ticket.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: 'RESOLVED',
          }),
        })
      );
    });
  });

  // ============================================
  // autoCloseTicket
  // ============================================
  describe('autoCloseTicket', () => {
    it('should auto-close a ticket', async () => {
      const mockTicket = createMockTicket({ status: 'CLOSED', closedAt: new Date(), createdBy: 1 });

      (mockPrisma.ticket.update as jest.Mock).mockResolvedValue(mockTicket);
      (mockPrisma.ticketMessage.create as jest.Mock).mockResolvedValue({ id: 'msg-auto-close' });

      const result = await autoCloseTicket('clx123');

      expect(result.status).toBe('CLOSED');
      expect(result.closedAt).toBeDefined();
    });
  });

  // ============================================
  // attachFilesToFirstUserMessage
  // ============================================
  describe('attachFilesToFirstUserMessage', () => {
    it('should attach files to first user message', async () => {
      (mockPrisma.ticketMessage.findFirst as jest.Mock).mockResolvedValue({ id: 'msg1' });
      (mockPrisma.messageAttachment.createMany as jest.Mock).mockResolvedValue({ count: 2 });

      await attachFilesToFirstUserMessage('clx123', [
        { type: 'IMAGE', filename: 'test.jpg', mimeType: 'image/jpeg', size: 1000, minioKey: 'key1' },
        { type: 'DOCUMENT', filename: 'doc.pdf', mimeType: 'application/pdf', size: 5000, minioKey: 'key2' },
      ]);

      expect(mockPrisma.messageAttachment.createMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.arrayContaining([
            expect.objectContaining({ messageId: 'msg1', filename: 'test.jpg' }),
            expect.objectContaining({ messageId: 'msg1', filename: 'doc.pdf' }),
          ]),
        })
      );
    });

    it('should do nothing if no attachments provided', async () => {
      await attachFilesToFirstUserMessage('clx123', []);

      expect(mockPrisma.ticketMessage.findFirst).not.toHaveBeenCalled();
    });

    it('should throw error if first message not found', async () => {
      (mockPrisma.ticketMessage.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(
        attachFilesToFirstUserMessage('clx123', [
          { type: 'IMAGE', filename: 'test.jpg', mimeType: 'image/jpeg', size: 1000, minioKey: 'key1' },
        ])
      ).rejects.toThrow('FIRST_MESSAGE_NOT_FOUND');
    });
  });
});
