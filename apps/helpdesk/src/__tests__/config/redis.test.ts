/**
 * Tests for Redis configuration
 */

jest.mock('../../config/environment');
const mockGetEnvironment = require('../../config/environment').getEnvironment;

jest.mock('../../config/logger', () => ({
  AppLogger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

import Redis from 'ioredis';
import { getRedisClient, closeRedis } from '../../config/redis';
import { AppLogger } from '../../config/logger';

jest.mock('ioredis');

describe('Redis Configuration', () => {
  let mockRedis: any;
  let capturedOptions: any;
  let eventHandlers: Record<string, Function>;

  beforeEach(() => {
    eventHandlers = {};
    capturedOptions = null;
    
    mockRedis = {
      on: jest.fn((event: string, handler: Function) => {
        eventHandlers[event] = handler;
      }),
      quit: jest.fn().mockResolvedValue('OK'),
    };

    (Redis as any).mockImplementation((url: string, options: any) => {
      capturedOptions = options;
      return mockRedis;
    });

    mockGetEnvironment.mockReturnValue({
      REDIS_URL: 'redis://localhost:6379',
      REDIS_HOST: 'localhost',
      REDIS_PORT: 6379,
    });

    closeRedis();
    jest.clearAllMocks();
  });

  afterEach(async () => {
    await closeRedis();
  });

  describe('getRedisClient', () => {
    it('should create Redis client with REDIS_URL', () => {
      const client = getRedisClient();

      expect(Redis).toHaveBeenCalledWith('redis://localhost:6379', {
        maxRetriesPerRequest: 3,
        retryStrategy: expect.any(Function),
        lazyConnect: true,
      });
      expect(client).toBe(mockRedis);
    });

    it('should construct Redis URL from host/port if REDIS_URL not available', () => {
      mockGetEnvironment.mockReturnValue({
        REDIS_URL: undefined,
        REDIS_HOST: 'redis-host',
        REDIS_PORT: 6380,
      });

      getRedisClient();

      expect(Redis).toHaveBeenCalledWith(
        'redis://redis-host:6380',
        expect.objectContaining({
          maxRetriesPerRequest: 3,
          lazyConnect: true,
        })
      );
    });

    it('should return cached client on subsequent calls', () => {
      const client1 = getRedisClient();
      const client2 = getRedisClient();

      expect(client1).toBe(client2);
      expect(Redis).toHaveBeenCalledTimes(1);
    });
  });

  describe('retryStrategy', () => {
    it('should return null when times > 3', () => {
      getRedisClient();
      
      const retryStrategy = capturedOptions.retryStrategy;
      const result = retryStrategy(4);

      expect(result).toBeNull();
      expect(AppLogger.error).toHaveBeenCalledWith('❌ Redis: máximo de reintentos alcanzado');
    });

    it('should return delay when times <= 3', () => {
      getRedisClient();
      
      const retryStrategy = capturedOptions.retryStrategy;
      
      expect(retryStrategy(1)).toBe(100);
      expect(retryStrategy(2)).toBe(200);
      expect(retryStrategy(3)).toBe(300);
    });
  });

  describe('Redis event handlers', () => {
    it('should log on connect', () => {
      getRedisClient();
      
      eventHandlers['connect']();

      expect(AppLogger.info).toHaveBeenCalledWith('✅ Conectado a Redis');
    });

    it('should log on error', () => {
      getRedisClient();
      
      const testError = new Error('Connection failed');
      eventHandlers['error'](testError);

      expect(AppLogger.error).toHaveBeenCalledWith('❌ Error de conexión Redis:', testError);
    });

    it('should log on close', () => {
      getRedisClient();
      
      eventHandlers['close']();

      expect(AppLogger.warn).toHaveBeenCalledWith('🔌 Conexión Redis cerrada');
    });
  });

  describe('closeRedis', () => {
    it('should quit Redis client', async () => {
      getRedisClient();
      await closeRedis();

      expect(mockRedis.quit).toHaveBeenCalled();
      expect(AppLogger.info).toHaveBeenCalledWith('🔌 Redis client cerrado');
    });

    it('should do nothing if no client exists', async () => {
      await closeRedis();

      expect(mockRedis.quit).not.toHaveBeenCalled();
    });
  });
});
