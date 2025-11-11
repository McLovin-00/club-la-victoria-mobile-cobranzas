import request from 'supertest';
import express from 'express';

jest.mock('../src/middlewares/auth.middleware', () => ({
  authenticate: (_req: any, _res: any, next: any) => next(),
  authorize: () => (_req: any, _res: any, next: any) => next(),
  tenantResolver: (_req: any, _res: any, next: any) => next(),
  validate: () => (_req: any, _res: any, next: any) => next(),
}));

jest.mock('../src/config/database', () => ({
  prisma: {
    equipoHistory: {
      findMany: jest.fn().mockResolvedValue([
        { id: 1, equipoId: 123, action: 'attach', component: 'trailer', createdAt: new Date().toISOString() },
      ]),
    },
  },
}));

const equiposRouter = require('../src/routes/equipos.routes').default;

describe('Equipos routes - history', () => {
  const app = express();
  app.use(express.json());
  app.use('/api/docs/equipos', equiposRouter);

  it('GET /:id/history returns history list', async () => {
    const res = await request(app).get('/api/docs/equipos/123/history?limit=10');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data[0].action).toBe('attach');
  });
});


