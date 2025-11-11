import request from 'supertest';
import express from 'express';

jest.mock('../src/middlewares/auth.middleware', () => ({
  authenticate: (req: any, _res: any, next: any) => { req.tenantId = 1; next(); },
  authorize: () => (_req: any, _res: any, next: any) => next(),
  tenantResolver: (_req: any, _res: any, next: any) => next(),
  validate: () => (_req: any, _res: any, next: any) => next(),
}));

const clientsRouter = require('../src/routes/clients.routes').default;

describe('Clients routes - bulk zip', () => {
  const app = express();
  app.use(express.json());
  app.use('/api/docs/clients', clientsRouter);

  it('POST /bulk-zip returns 202 with jobId', async () => {
    const res = await request(app)
      .post('/api/docs/clients/bulk-zip')
      .send({ equipoIds: [1,2,3] });
    expect(res.status).toBe(202);
    expect(res.body.success).toBe(true);
    expect(typeof res.body.jobId).toBe('string');
  });
});


