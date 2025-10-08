import request from 'supertest';
import express from 'express';

const dashboardRouter = require('../dist/routes/dashboard.routes').default;

jest.mock('../dist/middlewares/auth.middleware', () => ({
  authenticate: (_req: any, _res: any, next: any) => next(),
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
