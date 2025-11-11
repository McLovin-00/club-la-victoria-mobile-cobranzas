import request from 'supertest';
import express from 'express';

const templatesRouter = require('../src/routes/templates.routes').default;

jest.mock('../src/middlewares/auth.middleware', () => ({
  authenticate: (_req: any, _res: any, next: any) => next(),
  authorize: () => (req: any, res: any, _next: any) => res.status(403).json({ success:false, code:'INSUFFICIENT_PERMISSIONS' }),
  validate: () => (_req: any, _res: any, next: any) => next(),
}));

describe('Templates routes errors', () => {
  const app = express();
  app.use('/api/docs/templates', templatesRouter);

  it('POST / forbidden when not authorized', async () => {
    const res = await request(app).post('/api/docs/templates').send({ name:'x', entityType:'CHOFER' });
    expect(res.status).toBe(403);
  });
});
