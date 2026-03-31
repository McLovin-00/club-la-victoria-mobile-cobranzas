import { getEnvironment, isServiceEnabled } from '../../config/environment';

describe('Environment Configuration', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('getEnvironment', () => {
    it('should parse valid environment variables', () => {
      process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
      process.env.TELEGRAM_BOT_TOKEN = 'test-token';
      process.env.MINIO_ENDPOINT = 'localhost';
      process.env.MINIO_ACCESS_KEY = 'test-key';
      process.env.MINIO_SECRET_KEY = 'test-secret';

      const env = getEnvironment();

      expect(env.DATABASE_URL).toBe('postgresql://test:test@localhost:5432/test');
      expect(env.TELEGRAM_BOT_TOKEN).toBe('test-token');
    });

    it('should apply default values for optional fields', () => {
      process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
      process.env.TELEGRAM_BOT_TOKEN = 'test-token';
      process.env.MINIO_ENDPOINT = 'localhost';
      process.env.MINIO_ACCESS_KEY = 'test-key';
      process.env.MINIO_SECRET_KEY = 'test-secret';

      const env = getEnvironment();

      expect(env.ENABLE_HELPDESK).toBe(true);
      expect(env.MINIO_REGION).toBe('us-east-1');
      expect(env.MINIO_BUCKET_PREFIX).toBe('helpdesk');
      expect(env.REDIS_URL).toBe('redis://localhost:6379');
      expect(env.AUTO_CLOSE_HOURS).toBe(72);
    });

    it('should cache the environment after first call', () => {
      process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
      process.env.TELEGRAM_BOT_TOKEN = 'test-token';
      process.env.MINIO_ENDPOINT = 'localhost';
      process.env.MINIO_ACCESS_KEY = 'test-key';
      process.env.MINIO_SECRET_KEY = 'test-secret';

      const env1 = getEnvironment();
      process.env.TELEGRAM_BOT_TOKEN = 'different-token';
      const env2 = getEnvironment();

      expect(env1).toBe(env2);
    });

    it('should accept NODE_ENV=test', () => {
      process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
      process.env.TELEGRAM_BOT_TOKEN = 'test-token';
      process.env.MINIO_ENDPOINT = 'localhost';
      process.env.MINIO_ACCESS_KEY = 'test-key';
      process.env.MINIO_SECRET_KEY = 'test-secret';
      process.env.NODE_ENV = 'test';

      const env = getEnvironment();

      expect(env.NODE_ENV).toBe('test');
    });
  });

  describe('isServiceEnabled', () => {
    it('should return true by default', () => {
      process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
      process.env.TELEGRAM_BOT_TOKEN = 'test-token';
      process.env.MINIO_ENDPOINT = 'localhost';
      process.env.MINIO_ACCESS_KEY = 'test-key';
      process.env.MINIO_SECRET_KEY = 'test-secret';

      expect(isServiceEnabled()).toBe(true);
    });
  });
});
