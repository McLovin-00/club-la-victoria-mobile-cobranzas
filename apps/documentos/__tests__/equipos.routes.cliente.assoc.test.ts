import request from 'supertest';
import express from 'express';

jest.mock('../src/middlewares/auth.middleware', () => ({
  authenticate: (req: any, _res: any, next: any) => { req.tenantId = 1; next(); },
  authorize: () => (_req: any, _res: any, next: any) => next(),
  tenantResolver: (_req: any, _res: any, next: any) => next(),
  validate: () => (_req: any, _res: any, next: any) => next(),
}));

const assocMock = jest.fn().mockResolvedValue({ equipoId: 123, clienteId: 77, asignadoDesde: new Date().toISOString(), asignadoHasta: null });
const removeMock = jest.fn().mockResolvedValue({ equipoId: 123, clienteId: 77, asignadoDesde: '2024-01-01T00:00:00.000Z', asignadoHasta: new Date().toISOString() });
jest.mock('../src/services/equipo.service', () => ({
  EquipoService: {
    associateCliente: (...args: any[]) => assocMock(...args),
    removeCliente: (...args: any[]) => removeMock(...args),
  },
}));

const equiposRouter = require('../src/routes/equipos.routes').default;

describe('Equipos routes - cliente association', () => {
  const app = express();
  app.use(express.json());
  app.use('/api/docs/equipos', equiposRouter);

  beforeEach(() => {
    assocMock.mockClear();
    removeMock.mockClear();
  });

  it('POST /:equipoId/clientes/:clienteId should associate cliente', async () => {
    const body = { asignadoDesde: new Date().toISOString() };
    const res = await request(app)
      .post('/api/docs/equipos/123/clientes/77')
      .send(body);
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(assocMock).toHaveBeenCalledWith(1, 123, 77, new Date(body.asignadoDesde), undefined);
  });

  it('DELETE /:equipoId/clientes/:clienteId should remove association', async () => {
    const res = await request(app)
      .delete('/api/docs/equipos/123/clientes/77');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(removeMock).toHaveBeenCalledWith(1, 123, 77);
  });
});


