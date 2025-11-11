import request from 'supertest';
import express from 'express';

jest.mock('../src/middlewares/auth.middleware', () => ({
  authenticate: (req: any, _res: any, next: any) => { req.tenantId = 1; next(); },
  authorize: () => (_req: any, _res: any, next: any) => next(),
  tenantResolver: (_req: any, _res: any, next: any) => next(),
  validate: () => (_req: any, _res: any, next: any) => next(),
}));

jest.mock('../src/config/database', () => ({
  prisma: {
    equipoCliente: {
      findMany: jest.fn().mockResolvedValue([{ equipoId: 10 }, { equipoId: 20 }]),
    },
  },
}));

const calcMock = jest.fn()
  .mockResolvedValueOnce({ equipoId: 10, estado: 'verde', breakdown: { faltantes: 0, proximos: 0, vigentes: 3, pendientes: 0, rechazados: 0, vencidos: 0, sinRequisitos: false } })
  .mockResolvedValueOnce({ equipoId: 20, estado: 'rojo', breakdown: { faltantes: 1, proximos: 0, vigentes: 0, pendientes: 0, rechazados: 0, vencidos: 1, sinRequisitos: false } });
jest.mock('../src/services/equipo-estado.service', () => ({
  EquipoEstadoService: {
    calculateEquipoEstado: (...args: any[]) => calcMock(...args),
  },
}));

const clientsRouter = require('../src/routes/clients.routes').default;

describe('Clients routes - equipos estado list', () => {
  const app = express();
  app.use(express.json());
  app.use('/api/docs/clients', clientsRouter);

  it('GET /:clienteId/equipos/estado returns statuses with pagination info', async () => {
    const res = await request(app).get('/api/docs/clients/77/equipos/estado?page=1&limit=2');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBe(2);
    expect(res.body.pagination.page).toBe(1);
    expect(res.body.pagination.limit).toBe(2);
    expect(calcMock).toHaveBeenCalledWith(10, 77);
    expect(calcMock).toHaveBeenCalledWith(20, 77);
  });
});


