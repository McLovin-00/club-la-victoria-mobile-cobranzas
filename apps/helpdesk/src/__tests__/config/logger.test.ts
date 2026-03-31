import { AppLogger } from '../../config/logger';

describe('Logger Configuration', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('should create logger', () => {
    expect(AppLogger).toBeDefined();
    expect(typeof AppLogger.info).toBe('function');
    expect(typeof AppLogger.error).toBe('function');
    expect(typeof AppLogger.warn).toBe('function');
    expect(typeof AppLogger.debug).toBe('function');
  });

  it('should handle logging', () => {
    expect(() => AppLogger.info('Test message')).not.toThrow();
    expect(() => AppLogger.error('Test error')).not.toThrow();
  });

  it('should log with metadata', () => {
    expect(() => AppLogger.info('Test with meta', { userId: 1, action: 'test' })).not.toThrow();
  });

  it('should handle messages with email-like content', () => {
    expect(() => AppLogger.info('User test@example.com logged in')).not.toThrow();
  });

  it('should handle messages with phone-like content', () => {
    expect(() => AppLogger.info('Contact phone: +5411123456789')).not.toThrow();
  });

  it('should handle empty messages', () => {
    expect(() => AppLogger.info('')).not.toThrow();
  });

  it('should handle null/undefined metadata values', () => {
    expect(() => AppLogger.info('Test', { value: null })).not.toThrow();
    expect(() => AppLogger.info('Test', { value: undefined })).not.toThrow();
  });

  it('should handle circular references in metadata', () => {
    const circularObj: any = { name: 'test' };
    circularObj.self = circularObj;
    expect(() => AppLogger.info('Test circular', circularObj)).not.toThrow();
  });

  it('should log warnings', () => {
    expect(() => AppLogger.warn('Warning message')).not.toThrow();
  });

  it('should log debug messages', () => {
    expect(() => AppLogger.debug('Debug message')).not.toThrow();
  });

  it('should log http level messages', () => {
    expect(() => AppLogger.http('HTTP request')).not.toThrow();
  });

  it('should use default log level when LOG_LEVEL is not set', () => {
    delete process.env.LOG_LEVEL;
    expect(() => AppLogger.info('Default level test')).not.toThrow();
  });

  it('should handle fatal level via log method', () => {
    expect(() => (AppLogger as any).fatal('Fatal error')).not.toThrow();
  });

  it('should handle trace level via log method', () => {
    expect(() => (AppLogger as any).trace('Trace message')).not.toThrow();
  });

  it('should handle metadata with string values containing PII', () => {
    expect(() => AppLogger.info('Login', {
      email: 'user@example.com',
      phone: '+5411123456789',
      extra: 'normal text',
    })).not.toThrow();
  });

  it('should handle very long messages (>10000 chars)', () => {
    const longMsg = 'a'.repeat(15000) + ' user@test.com ' + 'b'.repeat(5000);
    expect(() => AppLogger.info(longMsg)).not.toThrow();
  });

  it('should handle metadata with numeric keys', () => {
    expect(() => AppLogger.info('Test', { count: 42 })).not.toThrow();
  });

  it('should handle empty metadata object', () => {
    expect(() => AppLogger.info('Test', {})).not.toThrow();
  });

  it('should handle nested objects in metadata', () => {
    expect(() => AppLogger.info('Test', { nested: { deep: { value: 'abc@example.com' } } })).not.toThrow();
  });

  it('should handle array in metadata', () => {
    expect(() => AppLogger.info('Test', { items: [1, 2, 3] })).not.toThrow();
  });

  it('should handle error objects', () => {
    expect(() => AppLogger.error('Error occurred', new Error('test error'))).not.toThrow();
  });

  it('should handle boolean metadata', () => {
    expect(() => AppLogger.info('Test', { flag: true, other: false })).not.toThrow();
  });
});
