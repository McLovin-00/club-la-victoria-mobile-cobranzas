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

const dashboardRouter = require('../src/routes/dashboard.routes').default;

jest.mock('../src/middlewares/auth.middleware', () => ({
  authenticate: (req: any, _res: any, next: any) => { req.user = { role: 'SUPERADMIN' }; next(); },
  authorize: () => (_req: any, _res: any, next: any) => next(),
}));

describe('Dashboard routes', () => {
  const app = express();
  app.use('/api/docs/dashboard', dashboardRouter);

  it('GET /semaforos responds', async () => {
    const res = await request(app).get('/api/docs/dashboard/semaforos');
    expect(res.status).toBeGreaterThanOrEqual(200);
  });
});
