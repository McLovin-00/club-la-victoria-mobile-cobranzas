/**
 * Telegram Bot Mock for Unit Tests
 * Provides mock implementations of grammY bot API methods
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { jest } from '@jest/globals';

export interface MockTelegramBot {
  api: Record<string, any>;
  on: any;
  use: any;
  catch: any;
  start: any;
  stop: any;
}

/**
 * Create a mock Telegram bot instance
 */
export function createTelegramBotMock(): MockTelegramBot {
  const mockFn = (): any => jest.fn();
  
  return {
    api: {
      sendMessage: mockFn().mockResolvedValue({
        message_id: 123,
        text: 'Test message',
        date: Date.now(),
        chat: { id: -1001234567890 },
      }),
      
      sendPhoto: mockFn().mockResolvedValue({
        message_id: 124,
        photo: [{ file_id: 'photo-123', file_unique_id: 'unique-photo-123' }],
        date: Date.now(),
        chat: { id: -1001234567890 },
      }),
      
      sendDocument: mockFn().mockResolvedValue({
        message_id: 125,
        document: { file_id: 'doc-123', file_unique_id: 'unique-doc-123', file_name: 'test.pdf' },
        date: Date.now(),
        chat: { id: -1001234567890 },
      }),
      
      editMessageText: mockFn().mockResolvedValue({
        message_id: 123,
        text: 'Updated message',
        edited: true,
      }),
      
      deleteMessage: mockFn().mockResolvedValue(true),
      
      getChat: mockFn().mockResolvedValue({
        id: -1001234567890,
        type: 'supergroup',
        title: 'Test Telegram Group',
        is_forum: true,
      }),
      
      getChatMember: mockFn().mockResolvedValue({
        status: 'member',
        user: { id: 123456789, is_bot: false, first_name: 'Test User' },
      }),
      
      createForumTopic: mockFn().mockResolvedValue({
        message_thread_id: 456,
        name: 'Ticket #1 - Test Subject',
      }),
      
      editForumTopic: mockFn().mockResolvedValue(true),
      
      closeForumTopic: mockFn().mockResolvedValue(true),
      
      reopenForumTopic: mockFn().mockResolvedValue(true),
      
      getFile: mockFn().mockResolvedValue({
        file_id: 'file-123',
        file_unique_id: 'unique-file-123',
        file_size: 1024,
        file_path: 'photos/file-123.jpg',
      }),
      
      getFileLink: mockFn().mockResolvedValue({
        href: 'https://api.telegram.org/file/bot-test-token/photos/file-123.jpg',
      }),
      
      banChatMember: mockFn().mockResolvedValue(true),
      
      unbanChatMember: mockFn().mockResolvedValue(true),
      
      setChatPermissions: mockFn().mockResolvedValue(true),
      
      answerCallbackQuery: mockFn().mockResolvedValue(true),
      
      editMessageReplyMarkup: mockFn().mockResolvedValue(true),
    },
    
    on: mockFn().mockReturnThis(),
    use: mockFn().mockReturnThis(),
    catch: mockFn().mockReturnThis(),
    start: mockFn().mockResolvedValue(undefined),
    stop: mockFn().mockResolvedValue(undefined),
  };
}

/**
 * Create a mock context object for grammY handlers
 */
export function createMockContext(overrides: Record<string, any> = {}): Record<string, any> {
  const mockFn = (): any => jest.fn();
  
  return {
    api: createTelegramBotMock().api,
    message: {
      message_id: 1,
      from: { id: 123456789, is_bot: false, first_name: 'Test User' },
      chat: { id: 123456789, type: 'private' },
      date: Date.now(),
      text: 'Test message',
    },
    reply: mockFn().mockResolvedValue({ message_id: 2 }),
    answer: mockFn().mockResolvedValue(undefined),
    ...overrides,
  };
}

/**
 * Create a mock DM context (private chat)
 */
export function createMockDMContext(
  userId: number = 123456789,
  text: string = 'Test message'
): Record<string, any> {
  return createMockContext({
    message: {
      message_id: 1,
      from: { id: userId, is_bot: false, first_name: 'Test', last_name: 'User' },
      chat: { id: userId, type: 'private' },
      date: Date.now(),
      text,
    },
  });
}

/**
 * Create a mock group context (supergroup with topic)
 */
export function createMockGroupContext(
  groupId: number = -1001234567890,
  topicId: number = 456,
  text: string = 'Test message'
): Record<string, any> {
  return createMockContext({
    message: {
      message_id: 100,
      from: { id: 123456789, is_bot: false, first_name: 'Test', last_name: 'User' },
      chat: { id: groupId, type: 'supergroup', title: 'Test Group' },
      message_thread_id: topicId,
      date: Date.now(),
      text,
      is_topic_message: true,
    },
  });
}

/**
 * Create a mock callback query context
 */
export function createMockCallbackContext(
  data: string,
  userId: number = 123456789
): Record<string, any> {
  const mockFn = (): any => jest.fn();
  
  return {
    ...createMockContext(),
    callbackQuery: {
      id: 'callback-123',
      from: { id: userId, is_bot: false, first_name: 'Test User' },
      message: {
        message_id: 1,
        chat: { id: userId, type: 'private' },
      },
      data,
    },
    answerCallbackQuery: mockFn().mockResolvedValue(undefined),
  };
}

/**
 * Mock for Telegram API errors
 */
export class MockTelegramError extends Error {
  public error_code: number;
  public description: string;
  public parameters?: Record<string, any>;

  constructor(errorCode: number, description: string, parameters?: Record<string, any>) {
    super(description);
    this.name = 'TelegramError';
    this.error_code = errorCode;
    this.description = description;
    this.parameters = parameters;
  }
}

/**
 * Common Telegram API error factories
 */
export const TelegramErrors = {
  badRequest: (message: string = 'Bad Request') => 
    new MockTelegramError(400, message),
  
  unauthorized: () => 
    new MockTelegramError(401, 'Unauthorized'),
  
  forbidden: () => 
    new MockTelegramError(403, 'Forbidden: bot was blocked by the user'),
  
  notFound: () => 
    new MockTelegramError(404, 'Not Found'),
  
  tooManyRequests: (retryAfter: number = 30) => 
    new MockTelegramError(429, 'Too Many Requests', { retry_after: retryAfter }),
  
  internalError: () => 
    new MockTelegramError(500, 'Internal Server Error'),
};
