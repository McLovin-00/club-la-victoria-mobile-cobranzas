// Jest setup for helpdesk microservice

// Mock environment variables for testing
process.env.NODE_ENV = 'test';
process.env.HELPDESK_DATABASE_URL = 'postgresql://test:test@localhost:5432/test_helpdesk?schema=helpdesk';
process.env.JWT_PUBLIC_KEY = '-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAtest\n-----END PUBLIC KEY-----';
process.env.TELEGRAM_BOT_TOKEN = 'test-bot-token';
process.env.MINIO_ENDPOINT = 'localhost';
process.env.MINIO_ACCESS_KEY = 'test-access-key';
process.env.MINIO_SECRET_KEY = 'test-secret-key';
process.env.REDIS_URL = 'redis://localhost:6379';
process.env.LOG_LEVEL = 'error'; // Reduce noise in tests
process.env.AUTO_CLOSE_HOURS = '72';
process.env.BACKEND_API_URL = 'http://localhost:4800';

// Extend Jest matchers
expect.extend({
  toBeValidTicketId(received: unknown) {
    const pass = typeof received === 'string' && received.length > 0;
    return {
      pass,
      message: () => `expected ${received} ${pass ? 'not ' : ''}to be a valid ticket ID`,
    };
  },
  toBeValidCuid(received: unknown) {
    const pass = typeof received === 'string' && /^c[a-z0-9]{24}$/.test(received);
    return {
      pass,
      message: () => `expected ${received} ${pass ? 'not ' : ''}to be a valid CUID`,
    };
  },
  toBeValidPagination(received: unknown) {
    const obj = received as Record<string, unknown>;
    const pass = 
      typeof obj === 'object' &&
      obj !== null &&
      typeof obj.page === 'number' &&
      typeof obj.limit === 'number' &&
      typeof obj.total === 'number' &&
      typeof obj.totalPages === 'number' &&
      Array.isArray(obj.data);
    return {
      pass,
      message: () => `expected ${JSON.stringify(received)} ${pass ? 'not ' : ''}to be a valid pagination response`,
    };
  },
});

// Global timeout for tests
jest.setTimeout(30000);

// Global test database cleanup (only for integration tests)
// Unit tests should use mocks instead

// Flag to track if we've set up global cleanup
const GLOBAL_TEST_DB_CLEANUP = Symbol.for('__TEST_DB_CLEANUP__');

if (!(globalThis as Record<symbol, boolean>)[GLOBAL_TEST_DB_CLEANUP]) {
  (globalThis as Record<symbol, boolean>)[GLOBAL_TEST_DB_CLEANUP] = true;
  
  // Global teardown after all tests
  afterAll(async () => {
    // Import dynamically to avoid issues in unit tests
    const { disconnectTestDatabase } = await import('./test-database');
    await disconnectTestDatabase();
  });
}
