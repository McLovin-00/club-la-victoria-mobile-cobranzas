import request from 'supertest';
import express from 'express';

jest.mock('../src/middlewares/auth.middleware', () => ({
  authenticate: (req: any, _res: any, next: any) => { req.tenantId = 1; next(); },
  authorize: () => (_req: any, _res: any, next: any) => next(),
  tenantResolver: (_req: any, _res: any, next: any) => next(),
  validate: () => (_req: any, _res: any, next: any) => next(),
}));

// Mock SystemConfigService for default dador
jest.mock('../src/services/system-config.service', () => ({
  SystemConfigService: { getConfig: jest.fn().mockResolvedValue('55') },
}));

// Mock EquipoService.createFromIdentifiers
const createFromIdentifiers = jest.fn().mockResolvedValue({ id: 999, dadorCargaId: 55, driverId: 1, truckId: 2, trailerId: null });
jest.mock('../src/services/equipo.service', () => ({
  EquipoService: {
    createFromIdentifiers: (...args: any[]) => createFromIdentifiers(...args),
  },
}));

const equiposRouter = require('../src/routes/equipos.routes').default;

describe('Equipos routes - minimal create', () => {
  const app = express();
  app.use(express.json());
  app.use('/api/docs/equipos', equiposRouter);

  beforeEach(() => {
    createFromIdentifiers.mockClear();
  });

  it('POST /minimal creates equipo using default dador when missing', async () => {
    const res = await request(app)
      .post('/api/docs/equipos/minimal')
      .send({
        // dadorCargaId intentionally omitted to trigger default
        dniChofer: '30.123.456',
        patenteTractor: 'AB123CD',
        choferPhones: ['+541112223334'],
      });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(createFromIdentifiers).toHaveBeenCalledWith({
      tenantEmpresaId: 1,
      dadorCargaId: 55,
      dniChofer: '30.123.456',
      patenteTractor: 'AB123CD',
      patenteAcoplado: null,
      choferPhones: ['+541112223334'],
    });
  });
});


