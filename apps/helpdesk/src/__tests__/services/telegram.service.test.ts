jest.mock('grammy', () => ({
  Bot: jest.fn().mockImplementation(() => ({
    api: {
      createForumTopic: jest.fn().mockResolvedValue({ message_thread_id: 123 }),
      sendMessage: jest.fn().mockResolvedValue({}),
    },
    start: jest.fn().mockImplementation((options) => {
      if (options?.onStart) options.onStart();
    }),
    stop: jest.fn(),
  })),
}));

jest.mock('../../config/environment', () => ({
  getEnvironment: jest.fn(),
}));

jest.mock('../../config/logger', () => ({
  AppLogger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

jest.mock('../../config/database', () => ({
  prisma: {
    resolverConfig: {
      findFirst: jest.fn(),
    },
    ticket: {
      findFirst: jest.fn(),
    },
  },
}));

jest.mock('../../services/platform-user-link.service', () => ({
  findPlatformUserByTelegramUsername: jest.fn(),
  linkPlatformUserToTelegram: jest.fn(),
}));

import telegramService from '../../services/telegram.service';
import { getEnvironment } from '../../config/environment';
import { prisma } from '../../config/database';
import { findPlatformUserByTelegramUsername, linkPlatformUserToTelegram } from '../../services/platform-user-link.service';
import { Bot } from 'grammy';

describe('TelegramService', () => {
  let mockBot: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockBot = {
      api: {
        createForumTopic: jest.fn().mockResolvedValue({ message_thread_id: 123 }),
        sendMessage: jest.fn().mockResolvedValue({}),
      },
      start: jest.fn().mockImplementation((options) => {
        if (options?.onStart) options.onStart();
      }),
      stop: jest.fn(),
    };

    (Bot as jest.Mock).mockImplementation(() => mockBot);

    (getEnvironment as jest.Mock).mockReturnValue({
      TELEGRAM_BOT_TOKEN: 'test-token',
    });
  });

  afterEach(async () => {
    try { await telegramService.stop(); } catch {}
  });

  describe('initialize', () => {
    it('should initialize bot when token is available', async () => {
      await telegramService.initialize();
      expect(Bot).toHaveBeenCalledWith('test-token');
    });

    it('should skip initialization when token is missing', async () => {
      (getEnvironment as jest.Mock).mockReturnValue({
        TELEGRAM_BOT_TOKEN: '',
      });

      await telegramService.initialize();
      expect(Bot).not.toHaveBeenCalled();
    });

    it('should skip initialization when token is undefined', async () => {
      (getEnvironment as jest.Mock).mockReturnValue({
        TELEGRAM_BOT_TOKEN: undefined,
      });

      await telegramService.initialize();
      expect(Bot).not.toHaveBeenCalled();
    });
  });

  describe('getBot', () => {
    it('should return bot after initialization', async () => {
      await telegramService.initialize();
      expect(telegramService.getBot()).toBe(mockBot);
    });
  });

  describe('getUserState / setUserState / clearUserState', () => {
    it('should return default state for new user', () => {
      const state = telegramService.getUserState(12345);
      expect(state).toEqual({ step: 'idle' });
    });

    it('should set and get user state', () => {
      const newState = { step: 'awaiting_category' as const, tempData: {} };
      telegramService.setUserState(12345, newState);
      expect(telegramService.getUserState(12345)).toEqual(newState);
    });

    it('should clear user state', () => {
      telegramService.setUserState(12345, { step: 'awaiting_category' });
      telegramService.clearUserState(12345);
      expect(telegramService.getUserState(12345)).toEqual({ step: 'idle' });
    });

    it('should handle tempData with category', () => {
      const state = { step: 'awaiting_subcategory' as const, tempData: { category: 'TECHNICAL' as const } };
      telegramService.setUserState(1, state);
      const result = telegramService.getUserState(1);
      expect(result.tempData?.category).toBe('TECHNICAL');
    });

    it('should handle tempData with full flow', () => {
      const state = {
        step: 'awaiting_message' as const,
        tempData: {
          category: 'TECHNICAL' as const,
          subcategory: 'ERROR',
          subject: 'Test',
          priority: 'HIGH' as const,
        },
      };
      telegramService.setUserState(1, state);
      const result = telegramService.getUserState(1);
      expect(result.step).toBe('awaiting_message');
      expect(result.tempData?.subject).toBe('Test');
    });
  });

  describe('findUserByTelegramUsername', () => {
    it('should find user by telegram username', async () => {
      const mockUser = { id: 1, email: 'test@test.com' };
      (findPlatformUserByTelegramUsername as jest.Mock).mockResolvedValue(mockUser);

      expect(await telegramService.findUserByTelegramUsername('testuser')).toEqual(mockUser);
    });

    it('should return null when user not found', async () => {
      (findPlatformUserByTelegramUsername as jest.Mock).mockResolvedValue(null);
      expect(await telegramService.findUserByTelegramUsername('nonexistent')).toBeNull();
    });
  });

  describe('linkTelegramUser', () => {
    it('should link telegram user', async () => {
      await telegramService.linkTelegramUser(1, 12345, 'testuser');
      expect(linkPlatformUserToTelegram).toHaveBeenCalledWith(1, 12345, 'testuser');
    });

    it('should link without username', async () => {
      await telegramService.linkTelegramUser(1, 12345);
      expect(linkPlatformUserToTelegram).toHaveBeenCalledWith(1, 12345, undefined);
    });
  });

  describe('getResolverConfig', () => {
    it('should return resolver config when found', async () => {
      (prisma.resolverConfig.findFirst as jest.Mock).mockResolvedValue({
        telegramGroupId: 'group-123',
        telegramGroupName: 'Test Group',
      });

      const result = await telegramService.getResolverConfig('TECHNICAL');
      expect(result).toEqual({ telegramGroupId: 'group-123', telegramGroupName: 'Test Group' });
    });

    it('should return null when config not found', async () => {
      (prisma.resolverConfig.findFirst as jest.Mock).mockResolvedValue(null);
      expect(await telegramService.getResolverConfig('TECHNICAL')).toBeNull();
    });

    it('should handle config without telegramGroupName', async () => {
      (prisma.resolverConfig.findFirst as jest.Mock).mockResolvedValue({
        telegramGroupId: 'group-123',
        telegramGroupName: null,
      });

      const result = await telegramService.getResolverConfig('TECHNICAL');
      expect(result).toEqual({ telegramGroupId: 'group-123', telegramGroupName: undefined });
    });

    it('should query for OPERATIONAL category', async () => {
      (prisma.resolverConfig.findFirst as jest.Mock).mockResolvedValue({
        telegramGroupId: 'group-op',
        telegramGroupName: 'Ops Group',
      });

      const result = await telegramService.getResolverConfig('OPERATIONAL');
      expect(prisma.resolverConfig.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ category: 'OPERATIONAL' }) })
      );
    });
  });

  describe('createTopic', () => {
    it('should create topic successfully', async () => {
      (prisma.resolverConfig.findFirst as jest.Mock).mockResolvedValue({
        telegramGroupId: 'group-123',
      });

      await telegramService.initialize();
      const result = await telegramService.createTopic('TECHNICAL', 1, 'Test Subject');

      expect(result).toEqual({ topicId: 123, groupId: 'group-123' });
    });

    it('should return null when no resolver config', async () => {
      (prisma.resolverConfig.findFirst as jest.Mock).mockResolvedValue(null);

      await telegramService.initialize();
      expect(await telegramService.createTopic('TECHNICAL', 1, 'Test Subject')).toBeNull();
    });

    it('should return null when createForumTopic throws', async () => {
      (prisma.resolverConfig.findFirst as jest.Mock).mockResolvedValue({
        telegramGroupId: 'group-123',
      });
      mockBot.api.createForumTopic.mockRejectedValue(new Error('API error'));

      await telegramService.initialize();
      expect(await telegramService.createTopic('TECHNICAL', 1, 'Test Subject')).toBeNull();
    });

    it('should truncate subject to 80 chars', async () => {
      (prisma.resolverConfig.findFirst as jest.Mock).mockResolvedValue({
        telegramGroupId: 'group-123',
      });

      await telegramService.initialize();
      const longSubject = 'a'.repeat(200);
      await telegramService.createTopic('TECHNICAL', 42, longSubject);

      const callArgs = mockBot.api.createForumTopic.mock.calls[0];
      expect(callArgs[1].length).toBeLessThanOrEqual(80 + 20);
    });

    it('should use Operativa for OPERATIONAL category', async () => {
      (prisma.resolverConfig.findFirst as jest.Mock).mockResolvedValue({
        telegramGroupId: 'group-123',
      });

      await telegramService.initialize();
      await telegramService.createTopic('OPERATIONAL', 1, 'Test');

      const callArgs = mockBot.api.createForumTopic.mock.calls[0];
      expect(callArgs[1]).toContain('Operativa');
    });
  });

  describe('sendToTopic', () => {
    it('should send message to topic', async () => {
      await telegramService.initialize();
      await telegramService.sendToTopic('group-1', 123, 'Hello');

      expect(mockBot.api.sendMessage).toHaveBeenCalledWith('group-1', 'Hello', {
        message_thread_id: 123,
        parse_mode: 'HTML',
      });
    });

    it('should handle error silently', async () => {
      await telegramService.initialize();
      mockBot.api.sendMessage.mockRejectedValue(new Error('Send failed'));

      await expect(telegramService.sendToTopic('group-1', 123, 'Hello')).resolves.not.toThrow();
    });

    it('should not send when bot is not initialized', async () => {
      const { AppLogger } = require('../../config/logger');
      const freshService = require('../../services/telegram.service').default;
      await expect(freshService.sendToTopic('group-1', 123, 'Hello')).resolves.not.toThrow();
    });
  });

  describe('sendToGroup', () => {
    it('should send message to group', async () => {
      await telegramService.initialize();
      await telegramService.sendToGroup('group-1', 'Hello');

      expect(mockBot.api.sendMessage).toHaveBeenCalledWith('group-1', 'Hello', {
        parse_mode: 'HTML',
      });
    });

    it('should handle error silently', async () => {
      await telegramService.initialize();
      mockBot.api.sendMessage.mockRejectedValue(new Error('Send failed'));

      await expect(telegramService.sendToGroup('group-1', 'Hello')).resolves.not.toThrow();
    });

    it('should not send when bot is not initialized', async () => {
      const freshService = require('../../services/telegram.service').default;
      await expect(freshService.sendToGroup('group-1', 'Hello')).resolves.not.toThrow();
    });
  });

  describe('sendDM', () => {
    it('should send DM to user', async () => {
      await telegramService.initialize();
      await telegramService.sendDM(123456, 'Hello');

      expect(mockBot.api.sendMessage).toHaveBeenCalledWith(123456, 'Hello', {
        parse_mode: 'HTML',
      });
    });

    it('should handle error silently', async () => {
      await telegramService.initialize();
      mockBot.api.sendMessage.mockRejectedValue(new Error('User blocked'));

      await expect(telegramService.sendDM(123456, 'Hello')).resolves.not.toThrow();
    });

    it('should not send when bot is not initialized', async () => {
      const freshService = require('../../services/telegram.service').default;
      await expect(freshService.sendDM(123456, 'Hello')).resolves.not.toThrow();
    });
  });

  describe('formatTicketInfo', () => {
    it('should format ticket info correctly', () => {
      const ticket = {
        number: 1,
        status: 'OPEN',
        category: 'TECHNICAL',
        subject: 'Test Subject',
        priority: 'NORMAL',
        confirmedPriority: null,
        createdByName: 'Test User',
        createdAt: new Date('2024-01-15'),
        assignedTo: null,
      } as any;

      const result = telegramService.formatTicketInfo(ticket);

      expect(result).toContain('🟢');
      expect(result).toContain('Ticket #1');
      expect(result).toContain('Técnica');
      expect(result).toContain('Test Subject');
      expect(result).toContain('Test User');
    });

    it('should include assignedTo when present', () => {
      const ticket = {
        number: 1,
        status: 'IN_PROGRESS',
        category: 'OPERATIONAL',
        subject: 'Test',
        priority: 'HIGH',
        confirmedPriority: 'HIGH',
        createdByName: 'User',
        createdAt: new Date(),
        assignedTo: 'Agent Smith',
      } as any;

      const result = telegramService.formatTicketInfo(ticket);
      expect(result).toContain('Agent Smith');
      expect(result).toContain('🟡');
      expect(result).toContain('Operativa');
    });

    it('should use confirmedPriority over priority', () => {
      const ticket = {
        number: 1,
        status: 'RESOLVED',
        category: 'TECHNICAL',
        subject: 'Test',
        priority: 'LOW',
        confirmedPriority: 'HIGH',
        createdByName: 'User',
        createdAt: new Date(),
        assignedTo: null,
      } as any;

      const result = telegramService.formatTicketInfo(ticket);
      expect(result).toContain('⬆️');
      expect(result).toContain('high');
    });

    it('should handle CLOSED status', () => {
      const ticket = {
        number: 1,
        status: 'CLOSED',
        category: 'TECHNICAL',
        subject: 'Test',
        priority: 'LOW',
        confirmedPriority: null,
        createdByName: 'User',
        createdAt: new Date(),
        assignedTo: null,
      } as any;

      const result = telegramService.formatTicketInfo(ticket);
      expect(result).toContain('⚫');
    });

    it('should format ticket number', () => {
      const ticket = {
        number: 5,
        status: 'OPEN',
        category: 'TECHNICAL',
        subject: 'Test',
        priority: 'NORMAL',
        confirmedPriority: null,
        createdByName: 'User',
        createdAt: new Date(),
        assignedTo: null,
      } as any;

      const result = telegramService.formatTicketInfo(ticket);
      expect(result).toContain('#5');
    });
  });

  describe('getTicketByTopicId', () => {
    it('should return ticket when found', async () => {
      (prisma.ticket.findFirst as jest.Mock).mockResolvedValue({ id: 'ticket-1', number: 1 });
      expect(await telegramService.getTicketByTopicId(123)).toEqual({ id: 'ticket-1', number: 1 });
    });

    it('should return null when not found', async () => {
      (prisma.ticket.findFirst as jest.Mock).mockResolvedValue(null);
      expect(await telegramService.getTicketByTopicId(999)).toBeNull();
    });
  });

  describe('getTicketByNumber', () => {
    it('should return ticket by number', async () => {
      (prisma.ticket.findFirst as jest.Mock).mockResolvedValue({ id: 'ticket-1', number: 42 });
      expect(await telegramService.getTicketByNumber(42)).toEqual({ id: 'ticket-1', number: 42 });
    });

    it('should return null when not found', async () => {
      (prisma.ticket.findFirst as jest.Mock).mockResolvedValue(null);
      expect(await telegramService.getTicketByNumber(999)).toBeNull();
    });
  });

  describe('start / stop', () => {
    it('should start bot when initialized', async () => {
      await telegramService.initialize();
      await telegramService.start();
      expect(mockBot.start).toHaveBeenCalled();
    });

    it('should warn when start is called without initialization', async () => {
      const freshService = require('../../services/telegram.service').default;
      await expect(freshService.start()).resolves.not.toThrow();
    });

    it('should stop bot', async () => {
      await telegramService.initialize();
      await telegramService.stop();
      expect(mockBot.stop).toHaveBeenCalled();
    });

    it('should handle stop when bot is not initialized', async () => {
      const freshService = require('../../services/telegram.service').default;
      await expect(freshService.stop()).resolves.not.toThrow();
    });
  });
});
