import request from 'supertest';
import express from 'express';
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
  }),
}));
jest.mock('../src/services/queue.service', () => ({ queueService: { getQueueStats: jest.fn().mockResolvedValue({ waiting: 0, active: 0, completed: 0, failed: 0, delayed: 0 }) } }));
jest.mock('../src/services/performance.service', () => ({
  performanceService: {
    getOptimizedCriticalAlerts: jest.fn().mockResolvedValue([]),
    getSystemMetrics: jest.fn().mockResolvedValue({ databaseConnections: 1, materializedViewAge: 0 }),
    getOptimizedGlobalStats: jest.fn().mockResolvedValue({ totalDocuments: 0, pendingCount: 0, validatingCount: 0, approvedCount: 0, rejectedCount: 0, expiredCount: 0, activeCompanies: 0, avgProcessingHours: 0 }),
    getPerTenantAggregates: jest.fn().mockResolvedValue([]),
  },
}));

const metricsRouter = require('../src/routes/metrics.routes').default;

describe('Metrics route', () => {
  const app = express();
  app.use('/metrics', metricsRouter);

  it('GET /metrics returns text/plain metrics', async () => {
    const res = await request(app).get('/metrics');
    expect(res.status).toBe(200);
    expect(res.headers['content-type'] || '').toContain('text/plain');
  });
});
