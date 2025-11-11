jest.mock('../src/config/environment', () => ({
  getEnvironment: () => ({
    ENABLE_DOCUMENTOS: true,
    DOCUMENTOS_PORT: 4802,
    NODE_ENV: 'test',
    DOCUMENTOS_DATABASE_URL: 'postgres://u:p@localhost:5432/db',
    MINIO_ENDPOINT: 'localhost:9000',
    MINIO_PORT: 9000,
    MINIO_REGION: 'us-east-1',
    MINIO_ACCESS_KEY: 'minio',
    MINIO_SECRET_KEY: 'miniosecret',
    MINIO_USE_SSL: false,
    MINIO_BUCKET_PREFIX: 'documentos-empresa',
    REDIS_URL: 'redis://localhost:6379',
  }),
}));
jest.mock('bullmq', () => {
  class Worker { constructor() {} on() {} close() { return Promise.resolve(); } }
  class Queue {
    constructor() {}
    add() { return Promise.resolve(); }
    on() {}
    close() { return Promise.resolve(); }
  }
  class QueueEvents { constructor() {} on() {} close() { return Promise.resolve(); } }
  return { Worker, Queue, QueueEvents };
});
const { queueService } = require('../src/services/queue.service');

describe('QueueService', () => {
  it('calculatePriority returns number', () => {
    const p1 = queueService["calculatePriority"]('EMPRESA');
    expect(typeof p1).toBe('number');
  });
});
