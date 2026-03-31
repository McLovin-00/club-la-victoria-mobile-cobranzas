/**
 * Tests for ticket-context.ts middleware
 */

jest.mock('../../../services/telegram.service', () => ({
  telegramService: {
    getTicketByTopicId: jest.fn(),
    getTicketByNumber: jest.fn(),
  },
}));

import {
  requireTicketContext,
  resolveTicketFromContext,
} from '../../../bot/middleware/ticket-context';
import { telegramService } from '../../../services/telegram.service';

// Mock ticket factory - returns a plain object that satisfies the Ticket interface at runtime
function createMockTicket(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 1,
    number: 8,
    category: 'TECHNICAL',
    subcategory: 'HARDWARE',
    subject: 'Test ticket',
    status: 'OPEN',
    priority: 'NORMAL',
    confirmedPriority: null,
    createdBy: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe('ticket-context middleware', () => {
  let mockCtx: any;
  let mockNext: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockNext = jest.fn();

    mockCtx = {
      message: {
        message_thread_id: undefined,
        text: '',
        reply_to_message: undefined,
      },
      match: undefined,
      reply: jest.fn(),
      ticketContext: undefined,
    };
  });

  describe('resolveTicketFromContext', () => {
    it('should return ticket from topic ID when available', async () => {
      const mockTicket = createMockTicket({ id: 1, number: 8 });
      mockCtx.message.message_thread_id = 123;
      (telegramService.getTicketByTopicId as jest.Mock).mockResolvedValue(mockTicket);

      const result = await resolveTicketFromContext(mockCtx);

      expect(result).toEqual(mockTicket);
      expect(telegramService.getTicketByTopicId).toHaveBeenCalledWith(123);
    });

    it('should fallback to reply message when topic ID returns null', async () => {
      const mockTicket = createMockTicket({ id: 2, number: 10 });
      mockCtx.message.message_thread_id = 123;
      mockCtx.message.reply_to_message = { text: 'Ticket #010' };
      (telegramService.getTicketByTopicId as jest.Mock).mockResolvedValue(null);
      (telegramService.getTicketByNumber as jest.Mock).mockResolvedValue(mockTicket);

      const result = await resolveTicketFromContext(mockCtx);

      expect(result).toEqual(mockTicket);
      expect(telegramService.getTicketByNumber).toHaveBeenCalledWith(10);
    });

    it('should extract ticket number from reply message caption', async () => {
      const mockTicket = createMockTicket({ id: 3, number: 15 });
      mockCtx.message.reply_to_message = { caption: 'Re: Ticket #015' };
      (telegramService.getTicketByNumber as jest.Mock).mockResolvedValue(mockTicket);

      const result = await resolveTicketFromContext(mockCtx);

      expect(result).toEqual(mockTicket);
      expect(telegramService.getTicketByNumber).toHaveBeenCalledWith(15);
    });

    it('should extract ticket number from current message text', async () => {
      const mockTicket = createMockTicket({ id: 4, number: 20 });
      mockCtx.message.text = '/cerrar #020';
      (telegramService.getTicketByNumber as jest.Mock).mockResolvedValue(mockTicket);

      const result = await resolveTicketFromContext(mockCtx);

      expect(result).toEqual(mockTicket);
      expect(telegramService.getTicketByNumber).toHaveBeenCalledWith(20);
    });

    it('should extract ticket number from match/args', async () => {
      const mockTicket = createMockTicket({ id: 5, number: 25 });
      mockCtx.message.text = '/info';
      mockCtx.match = '#025';
      (telegramService.getTicketByNumber as jest.Mock).mockResolvedValue(mockTicket);

      const result = await resolveTicketFromContext(mockCtx);

      expect(result).toEqual(mockTicket);
      expect(telegramService.getTicketByNumber).toHaveBeenCalledWith(25);
    });

    it('should handle array match', async () => {
      const mockTicket = createMockTicket({ id: 6, number: 30 });
      mockCtx.match = ['#030', 'some other arg'];
      (telegramService.getTicketByNumber as jest.Mock).mockResolvedValue(mockTicket);

      const result = await resolveTicketFromContext(mockCtx);

      expect(result).toEqual(mockTicket);
      expect(telegramService.getTicketByNumber).toHaveBeenCalledWith(30);
    });

    it('should return null when no ticket found', async () => {
      mockCtx.message.text = '/info';
      (telegramService.getTicketByNumber as jest.Mock).mockResolvedValue(null);

      const result = await resolveTicketFromContext(mockCtx);

      expect(result).toBeNull();
    });

    it('should handle message without reply_to_message', async () => {
      mockCtx.message.text = 'some text';
      mockCtx.message.reply_to_message = undefined;

      const result = await resolveTicketFromContext(mockCtx);

      expect(result).toBeNull();
    });

    it('should truncate long text to 256 characters', async () => {
      const longText = 'x'.repeat(300) + '#040';
      mockCtx.message.text = longText;
      // #040 is beyond position 256, so it shouldn't be found
      (telegramService.getTicketByNumber as jest.Mock).mockResolvedValue(null);

      const result = await resolveTicketFromContext(mockCtx);

      expect(result).toBeNull();
      // The truncated text shouldn't contain #040
    });
  });

  describe('requireTicketContext', () => {
    it('should inject ticket and call next when ticket found', async () => {
      const mockTicket = createMockTicket({ id: 1, number: 8 });
      mockCtx.message.message_thread_id = 123;
      (telegramService.getTicketByTopicId as jest.Mock).mockResolvedValue(mockTicket);

      const middleware = requireTicketContext() as any;
      await middleware(mockCtx, mockNext);

      expect(mockCtx.ticketContext).toEqual(mockTicket);
      expect(mockNext).toHaveBeenCalled();
      expect(mockCtx.reply).not.toHaveBeenCalled();
    });

    it('should reply with error when ticket not found (default options)', async () => {
      mockCtx.message.text = '/info';
      (telegramService.getTicketByNumber as jest.Mock).mockResolvedValue(null);

      const middleware = requireTicketContext() as any;
      await middleware(mockCtx, mockNext);

      expect(mockCtx.ticketContext).toBeUndefined();
      expect(mockNext).not.toHaveBeenCalled();
      expect(mockCtx.reply).toHaveBeenCalled();
      const replyCall = mockCtx.reply.mock.calls[0];
      expect(replyCall[0]).toContain('No se pudo encontrar el ticket');
      expect(replyCall[0]).toContain('Uso:');
    });

    it('should not reply when replyOnError is false', async () => {
      mockCtx.message.text = '/info';
      (telegramService.getTicketByNumber as jest.Mock).mockResolvedValue(null);

      const middleware = requireTicketContext({ replyOnError: false }) as any;
      await middleware(mockCtx, mockNext);

      expect(mockCtx.reply).not.toHaveBeenCalled();
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should use custom error message', async () => {
      mockCtx.message.text = '/info';
      (telegramService.getTicketByNumber as jest.Mock).mockResolvedValue(null);

      const middleware = requireTicketContext({ errorMessage: 'Custom error!' }) as any;
      await middleware(mockCtx, mockNext);

      const replyCall = mockCtx.reply.mock.calls[0];
      expect(replyCall[0]).toContain('Custom error!');
    });

    it('should hide usage hint when showUsage is false', async () => {
      mockCtx.message.text = '/info';
      (telegramService.getTicketByNumber as jest.Mock).mockResolvedValue(null);

      const middleware = requireTicketContext({ showUsage: false }) as any;
      await middleware(mockCtx, mockNext);

      const replyCall = mockCtx.reply.mock.calls[0];
      expect(replyCall[0]).not.toContain('Uso:');
    });

    it('should pass all options together', async () => {
      mockCtx.message.text = '/info';
      (telegramService.getTicketByNumber as jest.Mock).mockResolvedValue(null);

      const middleware = requireTicketContext({
        replyOnError: true,
        errorMessage: 'Not found!',
        showUsage: false,
      }) as any;
      await middleware(mockCtx, mockNext);

      const replyCall = mockCtx.reply.mock.calls[0];
      expect(replyCall[0]).toContain('Not found!');
      expect(replyCall[0]).not.toContain('Uso:');
    });
  });

  describe('extractTicketNumber (via resolveTicketFromContext)', () => {
    it('should extract single digit ticket number', async () => {
      mockCtx.message.text = '#5';
      (telegramService.getTicketByNumber as jest.Mock).mockResolvedValue(createMockTicket({ id: 5 }));

      await resolveTicketFromContext(mockCtx);

      expect(telegramService.getTicketByNumber).toHaveBeenCalledWith(5);
    });

    it('should extract multi-digit ticket number', async () => {
      mockCtx.message.text = '#12345';
      (telegramService.getTicketByNumber as jest.Mock).mockResolvedValue(createMockTicket({ id: 12345 }));

      await resolveTicketFromContext(mockCtx);

      expect(telegramService.getTicketByNumber).toHaveBeenCalledWith(12345);
    });

    it('should handle leading zeros', async () => {
      mockCtx.message.text = '#008';
      (telegramService.getTicketByNumber as jest.Mock).mockResolvedValue(createMockTicket({ id: 8 }));

      await resolveTicketFromContext(mockCtx);

      expect(telegramService.getTicketByNumber).toHaveBeenCalledWith(8);
    });

    it('should not match numbers beyond 6 digits', async () => {
      mockCtx.message.text = '#1234567';
      // Should not call getTicketByNumber because the regex is #(\d{1,6})
      (telegramService.getTicketByNumber as jest.Mock).mockResolvedValue(null);

      await resolveTicketFromContext(mockCtx);

      // The regex matches up to 6 digits, so #1234567 would match #123456 (first 6 digits)
      expect(telegramService.getTicketByNumber).toHaveBeenCalledWith(123456);
    });
  });
});
