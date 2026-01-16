/**
 * Global test setup for documentos microservice
 * This file sets up common mocks used across all tests
 */

// Mock process.exit to prevent test crashes
const mockExit = jest.spyOn(process, 'exit').mockImplementation((code) => {
  throw new Error(`process.exit called with "${code}"`);
});

// Mock environment variables - todas las requeridas
process.env.NODE_ENV = 'test';
process.env.DOCUMENTOS_DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
process.env.REDIS_URL = 'redis://localhost:6379';
process.env.MINIO_ENDPOINT = 'localhost';
process.env.MINIO_PORT = '9000';
process.env.MINIO_ACCESS_KEY = 'minioadmin';
process.env.MINIO_SECRET_KEY = 'minioadmin';
process.env.MINIO_BUCKET = 'test-bucket';
process.env.FLOWISE_BASE_URL = 'http://localhost:3000';
process.env.FLOWISE_API_KEY = 'test-key';
process.env.FLOWISE_FLOW_ID = 'test-flow';
process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing';
process.env.BACKEND_URL = 'http://localhost:4000';

// Suppress console logs during tests
jest.spyOn(console, 'log').mockImplementation(() => {});
jest.spyOn(console, 'warn').mockImplementation(() => {});
jest.spyOn(console, 'error').mockImplementation(() => {});

// Prevent real Redis/BullMQ connections during tests (avoid ECONNREFUSED + async logs after tests)
jest.mock('ioredis', () => {
  const Redis = jest.fn(() => ({
    quit: jest.fn(),
    disconnect: jest.fn(),
    on: jest.fn(),
  }));
  return {
    __esModule: true,
    Redis,
    default: Redis,
  };
});

jest.mock('bullmq', () => ({
  Queue: jest.fn(() => ({
    add: jest.fn(async () => ({ id: 'job-1' })),
    getWaiting: jest.fn(async () => []),
    getActive: jest.fn(async () => []),
    getCompleted: jest.fn(async () => []),
    getFailed: jest.fn(async () => []),
    getDelayed: jest.fn(async () => []),
    clean: jest.fn(async () => []),
    close: jest.fn(async () => undefined),
    on: jest.fn(),
  })),
  Worker: jest.fn(() => ({
    on: jest.fn(),
    close: jest.fn(async () => undefined),
  })),
}));

