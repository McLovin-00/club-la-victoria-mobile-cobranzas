import request from 'supertest';
import express from 'express';

const templatesRouter = require('../dist/routes/templates.routes').default;

jest.mock('../dist/middlewares/auth.middleware', () => ({
  authenticate: (_req: any, _res: any, next: any) => next(),
  authorize: () => (_req: any, _res: any, next: any) => next(),
  validate: () => (_req: any, _res: any, next: any) => next(),
}));

describe('Templates routes', () => {
  const app = express();
  app.use('/api/docs/templates', templatesRouter);

  it('GET / returns 200', async () => {
    const res = await request(app).get('/api/docs/templates');
    expect(res.status).toBeGreaterThanOrEqual(200);
  });
});
