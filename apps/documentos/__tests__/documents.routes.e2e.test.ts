import request from 'supertest';
import express from 'express';
const routes = require('../dist/routes').default;

jest.mock('../src/middlewares/auth.middleware', () => ({
  authenticate: (_req: any, _res: any, next: any) => next(),
  authorize: () => (_req: any, _res: any, next: any) => next(),
  tenantResolver: (req: any, _res: any, next: any) => { req.tenantId = 1; next(); },
  validate: () => (_req: any, _res: any, next: any) => next(),
}));

jest.mock('../src/config/database', () => {
  return {
    db: {
      getClient: () => ({
        document: {
          findMany: jest.fn().mockResolvedValue([]),
          count: jest.fn().mockResolvedValue(0),
        },
      }),
    },
  };
});

describe('Documents routes E2E (lightweight)', () => {
  const app = express();
  app.use(express.json());
  app.use('/', routes);

  it('GET /health responde 200', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
  });

  it('GET /api/docs/documents/status responde 200', async () => {
    const res = await request(app).get('/api/docs/documents/status');
    expect(res.status).toBe(200);
  });
});
