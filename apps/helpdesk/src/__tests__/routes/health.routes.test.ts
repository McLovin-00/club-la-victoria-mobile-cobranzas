/**
 * Health Routes - Unit Tests
 */

import request from 'supertest';
import express from 'express';

// Mock dependencies before importing routes
jest.mock('../../config/environment', () => ({
  getEnvironment: jest.fn(() => ({
    NODE_ENV: 'test',
    HELPDESK_PORT: 4803,
    HELPDESK_DATABASE_URL: 'postgresql://test:test@localhost:5432/test',
    REDIS_URL: 'redis://localhost:6379',
    MINIO_ENDPOINT: 'localhost',
    MINIO_PORT: 9000,
    MINIO_ACCESS_KEY: 'minioadmin',
    MINIO_SECRET_KEY: 'minioadmin',
    MINIO_USE_SSL: false,
    MINIO_BUCKET_PREFIX: 'test-',
    JWT_PUBLIC_KEY_PATH: './keys/test.pem',
    LOG_LEVEL: 'debug',
    FRONTEND_URLS: 'http://localhost:8550',
  })),
}));

jest.mock('../../config/logger', () => ({
  AppLogger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}));

// Mock database with getClient method (matches actual implementation)
jest.mock('../../config/database', () => ({
  db: {
    getClient: jest.fn(() => ({
      $queryRaw: jest.fn().mockResolvedValue([{ 1: 1 }]),
    })),
  },
}));

// Mock Redis client
jest.mock('../../config/redis', () => ({
  getRedisClient: jest.fn(() => ({
    ping: jest.fn().mockResolvedValue('PONG'),
  })),
}));

jest.mock('../../config/minio', () => ({
  getMinioClient: jest.fn(() => ({
    listBuckets: jest.fn().mockResolvedValue([]),
  })),
}));

// Import after mocking
import healthRoutes from '../../routes/health.routes';
import { db } from '../../config/database';
import { getRedisClient } from '../../config/redis';

const app = express();
app.use('/health', healthRoutes);
app.use('/ready', healthRoutes);

describe('Health Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /health', () => {
    it('should return 200 OK', async () => {
      const response = await request(app).get('/health');
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status', 'ok');
    });

    it('should include service name', async () => {
      const response = await request(app).get('/health');
      expect(response.body).toHaveProperty('service', 'helpdesk');
    });

    it('should include timestamp', async () => {
      const response = await request(app).get('/health');
      expect(response.body).toHaveProperty('timestamp');
    });

    it('should include uptime', async () => {
      const response = await request(app).get('/health');
      expect(response.body).toHaveProperty('uptime');
      expect(typeof response.body.uptime).toBe('number');
    });
  });

  describe('GET /health/ready', () => {
    it('should return 200 OK when all services are healthy', async () => {
      const response = await request(app).get('/health/ready');
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status', 'ok');
    });

    it('should include database check', async () => {
      const response = await request(app).get('/health/ready');
      expect(response.body.checks).toHaveProperty('database');
      expect(response.body.checks.database.status).toBe('ok');
    });

    it('should include redis check', async () => {
      const response = await request(app).get('/health/ready');
      expect(response.body.checks).toHaveProperty('redis');
      expect(response.body.checks.redis.status).toBe('ok');
    });

    it('should return 503 when database fails', async () => {
      // Mock database failure
      const mockGetClient = db.getClient as jest.Mock;
      mockGetClient.mockReturnValueOnce({
        $queryRaw: jest.fn().mockRejectedValue(new Error('Connection refused')),
      });

      const response = await request(app).get('/health/ready');
      
      expect(response.status).toBe(503);
      expect(response.body.checks.database.status).toBe('error');
      expect(response.body.checks.database.error).toBe('Connection refused');
    });

    it('should return 503 when redis fails', async () => {
      // Mock Redis failure
      const mockGetRedisClient = getRedisClient as jest.Mock;
      mockGetRedisClient.mockReturnValueOnce({
        ping: jest.fn().mockRejectedValue(new Error('ECONNREFUSED')),
      });

      const response = await request(app).get('/health/ready');
      
      expect(response.status).toBe(503);
      expect(response.body.checks.redis.status).toBe('error');
      expect(response.body.checks.redis.error).toBe('ECONNREFUSED');
    });

    it('should handle non-Error exceptions in database check', async () => {
      // Mock database failure with non-Error object
      const mockGetClient = db.getClient as jest.Mock;
      mockGetClient.mockReturnValueOnce({
        $queryRaw: jest.fn().mockRejectedValue('string error'),
      });

      const response = await request(app).get('/health/ready');
      
      expect(response.body.checks.database.status).toBe('error');
      expect(response.body.checks.database.error).toBe('Unknown error');
    });

    it('should handle non-Error exceptions in redis check', async () => {
      // Mock Redis failure with non-Error object
      const mockGetRedisClient = getRedisClient as jest.Mock;
      mockGetRedisClient.mockReturnValueOnce({
        ping: jest.fn().mockRejectedValue(null),
      });

      const response = await request(app).get('/health/ready');
      
      expect(response.body.checks.redis.status).toBe('error');
      expect(response.body.checks.redis.error).toBe('Unknown error');
    });

    it('should include latency for successful checks', async () => {
      const response = await request(app).get('/health/ready');
      
      expect(response.body.checks.database.latency).toBeDefined();
      expect(typeof response.body.checks.database.latency).toBe('number');
      expect(response.body.checks.redis.latency).toBeDefined();
      expect(typeof response.body.checks.redis.latency).toBe('number');
    });

    it('should return degraded status when one service fails', async () => {
      // Mock Redis failure but database OK
      const mockGetRedisClient = getRedisClient as jest.Mock;
      mockGetRedisClient.mockReturnValueOnce({
        ping: jest.fn().mockRejectedValue(new Error('Redis down')),
      });

      const response = await request(app).get('/health/ready');
      
      expect(response.body.status).toBe('degraded');
      expect(response.body.checks.database.status).toBe('ok');
      expect(response.body.checks.redis.status).toBe('error');
    });
  });
});
