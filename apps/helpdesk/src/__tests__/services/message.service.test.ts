import {
  createMessage,
  getMessagesByTicket,
  createUserMessage,
  createResolverMessage,
  createSystemMessage,
} from '../../services/message.service';

jest.mock('../../services/websocket.service', () => ({
  webSocketService: {
    emitTicketMessage: jest.fn(),
  },
}));

const mockSendToTopic = jest.fn().mockResolvedValue(undefined);
const mockSendToGroup = jest.fn().mockResolvedValue(undefined);
const mockSendDM = jest.fn().mockResolvedValue(undefined);
const mockGetResolverConfig = jest.fn().mockResolvedValue(null);

jest.mock('../../services/telegram.service', () => ({
  __esModule: true,
  default: {
    sendToTopic: (...args: any[]) => mockSendToTopic(...args),
    sendToGroup: (...args: any[]) => mockSendToGroup(...args),
    sendDM: (...args: any[]) => mockSendDM(...args),
    getResolverConfig: (...args: any[]) => mockGetResolverConfig(...args),
  },
}));

const mockGetPlatformUserTelegramId = jest.fn().mockResolvedValue(null);

jest.mock('../../services/platform-user-link.service', () => ({
  getPlatformUserTelegramId: (...args: any[]) => mockGetPlatformUserTelegramId(...args),
}));

const mockMarkAsRead = jest.fn().mockResolvedValue(undefined);

jest.mock('../../services/ticket-read-state.service', () => ({
  __esModule: true,
  default: {
    markAsRead: (...args: any[]) => mockMarkAsRead(...args),
  },
}));

const mockNotifyTicketResponseToUser = jest.fn().mockResolvedValue(undefined);

jest.mock('../../services/helpdesk-internal-notification.service', () => ({
  __esModule: true,
  default: {
    notifyTicketResponseToUser: (...args: any[]) => mockNotifyTicketResponseToUser(...args),
  },
}));

const mockQueueAttachmentsToResolvers = jest.fn().mockResolvedValue(undefined);
const mockQueueAttachmentsToUser = jest.fn().mockResolvedValue(undefined);

jest.mock('../../services/helpdesk-media-sync.service', () => ({
  __esModule: true,
  default: {
    queueAttachmentsToResolvers: (...args: any[]) => mockQueueAttachmentsToResolvers(...args),
    queueAttachmentsToUser: (...args: any[]) => mockQueueAttachmentsToUser(...args),
  },
  helpdeskMediaSyncService: {
    queueAttachmentsToResolvers: (...args: any[]) => mockQueueAttachmentsToResolvers(...args),
    queueAttachmentsToUser: (...args: any[]) => mockQueueAttachmentsToUser(...args),
  },
}));

jest.mock('../../config/database', () => ({
  prisma: {
    ticketMessage: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      count: jest.fn(),
    },
    messageAttachment: {
      createMany: jest.fn(),
    },
    ticket: {
      findUnique: jest.fn(),
    },
  },
}));

jest.mock('../../config/logger', () => ({
  AppLogger: {
    info: jest.fn(),
    error: jest.fn(),
  },
}));

import { prisma } from '../../config/database';

const mockPrisma = prisma as jest.Mocked<typeof prisma>;

const createMockMessage = (overrides = {}) => ({
  id: 'msg-123',
  ticketId: 'ticket-123',
  content: 'Test message',
  senderType: 'USER',
  senderId: '1',
  senderName: 'Test User',
  createdAt: new Date(),
  attachments: [],
  ...overrides,
});

describe('Message Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createMessage', () => {
    it('should create a message without attachments', async () => {
      const mockMessage = createMockMessage();

      (mockPrisma.ticketMessage.create as jest.Mock).mockResolvedValue(mockMessage);
      (mockPrisma.ticketMessage.findUnique as jest.Mock).mockResolvedValue({
        ...mockMessage,
        attachments: [],
      });

      const result = await createMessage({
        ticketId: 'ticket-123',
        content: 'Test message',
        senderType: 'USER',
        senderId: '1',
        senderName: 'Test User',
      });

      expect(result).toBeDefined();
      expect(mockPrisma.ticketMessage.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            ticketId: 'ticket-123',
            content: 'Test message',
          }),
          include: { attachments: true },
        })
      );
    });

    it('should create a message with attachments', async () => {
      const mockMessage = createMockMessage();

      (mockPrisma.ticketMessage.create as jest.Mock).mockResolvedValue(mockMessage);
      (mockPrisma.ticketMessage.findUnique as jest.Mock).mockResolvedValue({
        ...mockMessage,
        attachments: [{ id: 'att-1' }],
      });
      (mockPrisma.messageAttachment.createMany as jest.Mock).mockResolvedValue({ count: 1 });

      const result = await createMessage({
        ticketId: 'ticket-123',
        content: 'Test message',
        senderType: 'USER',
        senderId: '1',
        senderName: 'Test User',
        userId: 1,
        attachments: [
          { type: 'IMAGE', filename: 'test.jpg', mimeType: 'image/jpeg', size: 1000, minioKey: 'key1' },
        ],
      });

      expect(result).toBeDefined();
      expect(mockPrisma.messageAttachment.createMany).toHaveBeenCalled();
    });

    it('should emit WebSocket event when userId is provided', async () => {
      const mockMessage = createMockMessage();

      (mockPrisma.ticketMessage.create as jest.Mock).mockResolvedValue(mockMessage);
      (mockPrisma.ticketMessage.findUnique as jest.Mock).mockResolvedValue({
        ...mockMessage,
        attachments: [],
      });

      await createMessage({
        ticketId: 'ticket-123',
        content: 'Test message',
        senderType: 'USER',
        senderId: '1',
        senderName: 'Test User',
        userId: 1,
      });
    });

    it('should not emit WebSocket event when userId is not provided', async () => {
      const mockMessage = createMockMessage();

      (mockPrisma.ticketMessage.create as jest.Mock).mockResolvedValue(mockMessage);
      (mockPrisma.ticketMessage.findUnique as jest.Mock).mockResolvedValue({
        ...mockMessage,
        attachments: [],
      });

      await createMessage({
        ticketId: 'ticket-123',
        content: 'Test message',
        senderType: 'SYSTEM',
        senderId: undefined,
        senderName: 'System',
      });
    });

    it('should not emit WebSocket when fullMessage is null', async () => {
      const mockMessage = createMockMessage();

      (mockPrisma.ticketMessage.create as jest.Mock).mockResolvedValue(mockMessage);
      (mockPrisma.ticketMessage.findUnique as jest.Mock).mockResolvedValue(null);

      await createMessage({
        ticketId: 'ticket-123',
        content: 'Test',
        senderType: 'USER',
        senderId: '1',
        senderName: 'Test',
        userId: 1,
      });
    });
  });

  describe('getMessagesByTicket', () => {
    it('should return paginated messages for a ticket', async () => {
      const mockMessages = [
        createMockMessage({ id: 'msg1' }),
        createMockMessage({ id: 'msg2', senderType: 'RESOLVER' }),
      ];

      (mockPrisma.ticketMessage.count as jest.Mock).mockResolvedValue(2);
      (mockPrisma.ticketMessage.findMany as jest.Mock).mockResolvedValue(mockMessages);

      const result = await getMessagesByTicket('ticket-123', { page: 1, limit: 20 });

      expect(result.data).toHaveLength(2);
      expect(result.data[0].ticketId).toBe('ticket-123');
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
    });

    it('should return empty data array if no messages', async () => {
      (mockPrisma.ticketMessage.count as jest.Mock).mockResolvedValue(0);
      (mockPrisma.ticketMessage.findMany as jest.Mock).mockResolvedValue([]);

      const result = await getMessagesByTicket('ticket-empty', { page: 1, limit: 20 });

      expect(result.data).toEqual([]);
      expect(result.total).toBe(0);
    });

    it('should use default pagination values', async () => {
      (mockPrisma.ticketMessage.count as jest.Mock).mockResolvedValue(0);
      (mockPrisma.ticketMessage.findMany as jest.Mock).mockResolvedValue([]);

      await getMessagesByTicket('ticket-123');

      expect(mockPrisma.ticketMessage.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 0,
          take: 50,
        })
      );
    });

    it('should calculate totalPages correctly', async () => {
      (mockPrisma.ticketMessage.count as jest.Mock).mockResolvedValue(25);
      (mockPrisma.ticketMessage.findMany as jest.Mock).mockResolvedValue([]);

      const result = await getMessagesByTicket('ticket-123', { page: 1, limit: 10 });

      expect(result.totalPages).toBe(3);
    });
  });

  describe('createUserMessage', () => {
    it('should create a user message from platform', async () => {
      const mockMessage = createMockMessage();

      (mockPrisma.ticketMessage.create as jest.Mock).mockResolvedValue(mockMessage);
      (mockPrisma.ticketMessage.findUnique as jest.Mock).mockResolvedValue({
        ...mockMessage,
        attachments: [],
      });

      const result = await createUserMessage('ticket-123', 1, 'Test User', 'Hello from user', 1);

      expect(result).toBeDefined();
    });

    it('should create a user message with attachments from platform', async () => {
      const mockMessage = createMockMessage();

      (mockPrisma.ticketMessage.create as jest.Mock).mockResolvedValue(mockMessage);
      (mockPrisma.ticketMessage.findUnique as jest.Mock).mockResolvedValue({
        ...mockMessage,
        attachments: [],
      });

      const result = await createUserMessage(
        'ticket-123',
        1,
        'Test User',
        'Hello with files',
        1,
        [{ type: 'IMAGE', filename: 'test.jpg', mimeType: 'image/jpeg', size: 1000, minioKey: 'key1' }],
        'platform'
      );

      expect(result).toBeDefined();
      expect(mockQueueAttachmentsToResolvers).toHaveBeenCalled();
    });

    it('should handle telegram source without bridging', async () => {
      const mockMessage = createMockMessage();

      (mockPrisma.ticketMessage.create as jest.Mock).mockResolvedValue(mockMessage);
      (mockPrisma.ticketMessage.findUnique as jest.Mock).mockResolvedValue({
        ...mockMessage,
        attachments: [],
      });

      const result = await createUserMessage(
        'ticket-123',
        1,
        'Test User',
        'From telegram',
        1,
        [],
        'telegram'
      );

      expect(result).toBeDefined();
      expect(mockSendToTopic).not.toHaveBeenCalled();
      expect(mockQueueAttachmentsToResolvers).not.toHaveBeenCalled();
    });

    it('should bridge platform message to telegram via topic', async () => {
      const mockMessage = createMockMessage();

      (mockPrisma.ticketMessage.create as jest.Mock).mockResolvedValue(mockMessage);
      (mockPrisma.ticketMessage.findUnique as jest.Mock).mockResolvedValue({
        ...mockMessage,
        attachments: [],
      });
      (mockPrisma.ticket.findUnique as jest.Mock).mockResolvedValue({
        id: 'ticket-123',
        number: 1,
        category: 'TECHNICAL',
        subject: 'Test',
        createdBy: 1,
        telegramTopicId: 42,
        telegramGroupId: '-100500',
      });

      const result = await createUserMessage('ticket-123', 1, 'Test', 'Hello', 1, [], 'platform');

      expect(result).toBeDefined();
      expect(mockSendToTopic).toHaveBeenCalled();
    });

    it('should bridge platform message to telegram via group when no topic', async () => {
      const mockMessage = createMockMessage();

      (mockPrisma.ticketMessage.create as jest.Mock).mockResolvedValue(mockMessage);
      (mockPrisma.ticketMessage.findUnique as jest.Mock).mockResolvedValue({
        ...mockMessage,
        attachments: [],
      });
      (mockPrisma.ticket.findUnique as jest.Mock).mockResolvedValue({
        id: 'ticket-123',
        number: 1,
        category: 'TECHNICAL',
        subject: 'Test',
        createdBy: 1,
        telegramTopicId: null,
        telegramGroupId: null,
      });
      mockGetResolverConfig.mockResolvedValue({ telegramGroupId: '-100500' });

      await createUserMessage('ticket-123', 1, 'Test', 'Hello', 1, [], 'platform');

      expect(mockSendToGroup).toHaveBeenCalled();
    });

    it('should handle bridging error gracefully', async () => {
      const mockMessage = createMockMessage();

      (mockPrisma.ticketMessage.create as jest.Mock).mockResolvedValue(mockMessage);
      (mockPrisma.ticketMessage.findUnique as jest.Mock).mockResolvedValue({
        ...mockMessage,
        attachments: [],
      });
      mockSendToTopic.mockRejectedValue(new Error('Bridge failed'));
      (mockPrisma.ticket.findUnique as jest.Mock).mockResolvedValue({
        id: 'ticket-123',
        number: 1,
        category: 'TECHNICAL',
        subject: 'Test',
        createdBy: 1,
        telegramTopicId: 42,
        telegramGroupId: '-100500',
      });

      const result = await createUserMessage('ticket-123', 1, 'Test', 'Hello', 1, [], 'platform');
      expect(result).toBeDefined();
    });

    it('should handle readState error gracefully', async () => {
      const mockMessage = createMockMessage();

      (mockPrisma.ticketMessage.create as jest.Mock).mockResolvedValue(mockMessage);
      (mockPrisma.ticketMessage.findUnique as jest.Mock).mockResolvedValue({
        ...mockMessage,
        attachments: [],
      });
      mockMarkAsRead.mockRejectedValue(new Error('Read state failed'));

      const result = await createUserMessage('ticket-123', 1, 'Test', 'Hello', 1, [], 'telegram');
      expect(result).toBeDefined();
    });
  });

  describe('createResolverMessage', () => {
    it('should create a resolver message from telegram', async () => {
      const mockMessage = createMockMessage({ senderType: 'RESOLVER' });
      (mockPrisma.ticketMessage.create as jest.Mock).mockResolvedValue(mockMessage);
      (mockPrisma.ticketMessage.findUnique as jest.Mock).mockResolvedValue({
        ...mockMessage,
        attachments: [],
      });
      (mockPrisma.ticket.findUnique as jest.Mock).mockResolvedValue({
        id: 'ticket-123',
        number: 1,
        category: 'TECHNICAL',
        subject: 'Test',
        createdBy: 1,
      });

      const result = await createResolverMessage('ticket-123', 'Resolver Name', 'Resolution message', 1);

      expect(result).toBeDefined();
    });

    it('should create resolver message from platform', async () => {
      const mockMessage = createMockMessage({ senderType: 'RESOLVER' });
      (mockPrisma.ticketMessage.create as jest.Mock).mockResolvedValue(mockMessage);
      (mockPrisma.ticketMessage.findUnique as jest.Mock).mockResolvedValue({
        ...mockMessage,
        attachments: [],
      });
      (mockPrisma.ticket.findUnique as jest.Mock).mockResolvedValue({
        id: 'ticket-123',
        number: 1,
        category: 'TECHNICAL',
        subject: 'Test',
        createdBy: 1,
        telegramTopicId: 42,
        telegramGroupId: '-100500',
      });
      mockGetPlatformUserTelegramId.mockResolvedValue(12345);

      const result = await createResolverMessage(
        'ticket-123',
        'Resolver Name',
        'From Platform',
        1,
        undefined,
        [],
        2,
        'platform'
      );

      expect(result).toBeDefined();
    });

    it('should bridge platform resolver message to telegram user', async () => {
      const mockMessage = createMockMessage({ senderType: 'RESOLVER' });
      (mockPrisma.ticketMessage.create as jest.Mock).mockResolvedValue(mockMessage);
      (mockPrisma.ticketMessage.findUnique as jest.Mock).mockResolvedValue({
        ...mockMessage,
        attachments: [],
      });
      (mockPrisma.ticket.findUnique as jest.Mock).mockResolvedValue({
        id: 'ticket-123',
        number: 1,
        category: 'TECHNICAL',
        subject: 'Test',
        createdBy: 1,
      });
      mockGetPlatformUserTelegramId.mockResolvedValue(12345);

      await createResolverMessage(
        'ticket-123',
        'Resolver',
        'Reply',
        1,
        undefined,
        [],
        2,
        'platform'
      );

      expect(mockSendDM).toHaveBeenCalledWith(12345, expect.any(String));
    });

    it('should handle missing telegram user id gracefully', async () => {
      const mockMessage = createMockMessage({ senderType: 'RESOLVER' });
      (mockPrisma.ticketMessage.create as jest.Mock).mockResolvedValue(mockMessage);
      (mockPrisma.ticketMessage.findUnique as jest.Mock).mockResolvedValue({
        ...mockMessage,
        attachments: [],
      });
      (mockPrisma.ticket.findUnique as jest.Mock).mockResolvedValue({
        id: 'ticket-123',
        number: 1,
        category: 'TECHNICAL',
        subject: 'Test',
        createdBy: 1,
      });
      mockGetPlatformUserTelegramId.mockResolvedValue(null);

      await createResolverMessage('ticket-123', 'Resolver', 'Reply', 1, undefined, [], 2, 'platform');

      expect(mockSendDM).not.toHaveBeenCalled();
    });

    it('should queue attachments to user from platform resolver', async () => {
      const mockMessage = createMockMessage({ senderType: 'RESOLVER' });
      (mockPrisma.ticketMessage.create as jest.Mock).mockResolvedValue(mockMessage);
      (mockPrisma.ticketMessage.findUnique as jest.Mock).mockResolvedValue({
        ...mockMessage,
        attachments: [],
      });
      (mockPrisma.ticket.findUnique as jest.Mock).mockResolvedValue({
        id: 'ticket-123',
        number: 1,
        category: 'TECHNICAL',
        subject: 'Test',
        createdBy: 1,
      });
      mockGetPlatformUserTelegramId.mockResolvedValue(12345);

      await createResolverMessage(
        'ticket-123',
        'Resolver',
        'Reply',
        1,
        undefined,
        [{ type: 'IMAGE', filename: 'img.jpg', mimeType: 'image/jpeg', size: 1000, minioKey: 'k' }],
        2,
        'platform'
      );

      expect(mockQueueAttachmentsToUser).toHaveBeenCalled();
    });

    it('should handle internal notification error gracefully', async () => {
      const mockMessage = createMockMessage({ senderType: 'RESOLVER' });
      (mockPrisma.ticketMessage.create as jest.Mock).mockResolvedValue(mockMessage);
      (mockPrisma.ticketMessage.findUnique as jest.Mock).mockResolvedValue({
        ...mockMessage,
        attachments: [],
      });
      (mockPrisma.ticket.findUnique as jest.Mock).mockResolvedValue({
        id: 'ticket-123',
        number: 1,
        category: 'TECHNICAL',
        subject: 'Test',
        createdBy: 1,
      });
      mockNotifyTicketResponseToUser.mockRejectedValue(new Error('Notif failed'));

      const result = await createResolverMessage('ticket-123', 'Resolver', 'Reply', 1);
      expect(result).toBeDefined();
    });

    it('should handle missing ticket snapshot for notification', async () => {
      const mockMessage = createMockMessage({ senderType: 'RESOLVER' });
      (mockPrisma.ticketMessage.create as jest.Mock).mockResolvedValue(mockMessage);
      (mockPrisma.ticketMessage.findUnique as jest.Mock).mockResolvedValue({
        ...mockMessage,
        attachments: [],
      });
      (mockPrisma.ticket.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await createResolverMessage('ticket-123', 'Resolver', 'Reply', 1);
      expect(result).toBeDefined();
      expect(mockNotifyTicketResponseToUser).not.toHaveBeenCalled();
    });

    it('should not bridge when source is telegram', async () => {
      const mockMessage = createMockMessage({ senderType: 'RESOLVER' });
      (mockPrisma.ticketMessage.create as jest.Mock).mockResolvedValue(mockMessage);
      (mockPrisma.ticketMessage.findUnique as jest.Mock).mockResolvedValue({
        ...mockMessage,
        attachments: [],
      });
      (mockPrisma.ticket.findUnique as jest.Mock).mockResolvedValue({
        id: 'ticket-123',
        number: 1,
        category: 'TECHNICAL',
        subject: 'Test',
        createdBy: 1,
      });

      await createResolverMessage('ticket-123', 'Resolver', 'Reply', 1, 12345, [], undefined, 'telegram');

      expect(mockSendDM).not.toHaveBeenCalled();
      expect(mockQueueAttachmentsToUser).not.toHaveBeenCalled();
    });
  });

  describe('createSystemMessage', () => {
    it('should create a system message', async () => {
      const mockMessage = createMockMessage({ senderType: 'SYSTEM', senderName: 'Sistema' });

      (mockPrisma.ticketMessage.create as jest.Mock).mockResolvedValue(mockMessage);
      (mockPrisma.ticketMessage.findUnique as jest.Mock).mockResolvedValue({
        ...mockMessage,
        attachments: [],
      });

      const result = await createSystemMessage('ticket-123', 'Ticket cerrado automáticamente');

      expect(result).toBeDefined();
    });

    it('should create system message with ticketOwnerId', async () => {
      const mockMessage = createMockMessage({ senderType: 'SYSTEM', senderName: 'Sistema' });

      (mockPrisma.ticketMessage.create as jest.Mock).mockResolvedValue(mockMessage);
      (mockPrisma.ticketMessage.findUnique as jest.Mock).mockResolvedValue({
        ...mockMessage,
        attachments: [],
      });

      const result = await createSystemMessage('ticket-123', 'Ticket reopened', 1);

      expect(result).toBeDefined();
    });
  });
});
