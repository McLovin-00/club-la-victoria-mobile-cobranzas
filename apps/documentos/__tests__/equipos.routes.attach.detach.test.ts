import request from 'supertest';
import express from 'express';

// Mock auth to inject tenantId and bypass authorization/validation
jest.mock('../src/middlewares/auth.middleware', () => ({
  authenticate: (req: any, _res: any, next: any) => { req.tenantId = 1; next(); },
  authorize: () => (_req: any, _res: any, next: any) => next(),
  tenantResolver: (_req: any, _res: any, next: any) => next(),
  authorizeEmpresa: (_req: any, _res: any, next: any) => next(),
  validate: () => (_req: any, _res: any, next: any) => next(),
}));

// Mock EquipoService used by the router
const attachMock = jest.fn().mockResolvedValue({ id: 123, trailerId: 10 });
const detachMock = jest.fn().mockResolvedValue({ id: 123, trailerId: null });
jest.mock('../src/services/equipo.service', () => ({
  EquipoService: {
    attachComponents: (...args: any[]) => attachMock(...args),
    detachComponents: (...args: any[]) => detachMock(...args),
  },
}));

const equiposRouter = require('../src/routes/equipos.routes').default;

describe('Equipos routes - attach/detach', () => {
  const app = express();
  app.use(express.json());
  app.use('/api/docs/equipos', equiposRouter);

  beforeEach(() => {
    attachMock.mockClear();
    detachMock.mockClear();
  });

  it('POST /:id/attach should call service and respond 200', async () => {
    const res = await request(app)
      .post('/api/docs/equipos/123/attach')
      .send({ trailerId: 10 });
    expect(res.status).toBe(200);
    expect(attachMock).toHaveBeenCalledWith(1, 123, { trailerId: 10 });
    expect(res.body.success).toBe(true);
    expect(res.body.data).toEqual({ id: 123, trailerId: 10 });
  });

  it('POST /:id/detach should call service and respond 200', async () => {
    const res = await request(app)
      .post('/api/docs/equipos/123/detach')
      .send({ trailer: true });
    expect(res.status).toBe(200);
    expect(detachMock).toHaveBeenCalledWith(1, 123, { trailer: true });
    expect(res.body.success).toBe(true);
    expect(res.body.data).toEqual({ id: 123, trailerId: null });
  });
});


