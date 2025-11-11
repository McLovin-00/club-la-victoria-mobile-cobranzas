import request from 'supertest';
import express from 'express';

jest.mock('../src/middlewares/auth.middleware', () => ({
  authenticate: (_req: any, _res: any, next: any) => next(),
  authorize: () => (_req: any, _res: any, next: any) => next(),
  tenantResolver: (_req: any, _res: any, next: any) => next(),
  validate: () => (_req: any, _res: any, next: any) => next(),
}));

const calcMock = jest.fn().mockResolvedValue({
  equipoId: 123,
  estado: 'amarillo',
  breakdown: { faltantes: 0, proximos: 1, vigentes: 2, pendientes: 0, rechazados: 0, vencidos: 0, sinRequisitos: false },
});
jest.mock('../src/services/equipo-estado.service', () => ({
  EquipoEstadoService: {
    calculateEquipoEstado: (...args: any[]) => calcMock(...args),
  },
}));

const equiposRouter = require('../src/routes/equipos.routes').default;

describe('Equipos routes - estado', () => {
  const app = express();
  app.use(express.json());
  app.use('/api/docs/equipos', equiposRouter);

  beforeEach(() => calcMock.mockClear());

  it('GET /:id/estado returns semaforo and breakdown', async () => {
    const res = await request(app).get('/api/docs/equipos/123/estado?clienteId=77');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.estado).toBe('amarillo');
    expect(calcMock).toHaveBeenCalledWith(123, 77);
  });
});


