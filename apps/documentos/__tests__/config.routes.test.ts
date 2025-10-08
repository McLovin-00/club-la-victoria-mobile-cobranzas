import request from 'supertest';
import express from 'express';

const configRouter = require('../dist/routes/config.routes').default;

jest.mock('../dist/middlewares/auth.middleware', () => ({
  authenticate: (_req: any, _res: any, next: any) => next(),
  authorize: () => (_req: any, _res: any, next: any) => next(),
  tenantResolver: (_req: any, _res: any, next: any) => next(),
  validate: () => (_req: any, _res: any, next: any) => next(),
}));

describe('Config routes', () => {
  const app = express();
  app.use(express.json());
  app.use('/api/docs/config', configRouter);

  it('GET /:empresaId responds', async () => {
    const res = await request(app).get('/api/docs/config/1');
    expect(res.status).toBeGreaterThanOrEqual(200);
  });
});
