import request from 'supertest';
import express from 'express';

jest.mock('../src/middlewares/auth.middleware', () => ({
  authenticate: (req: any, _res: any, next: any) => { req.tenantId = 1; next(); },
  authorize: () => (_req: any, _res: any, next: any) => next(),
  tenantResolver: (_req: any, _res: any, next: any) => next(),
  validate: () => (_req: any, _res: any, next: any) => next(),
}));

const findManyMock = jest.fn().mockResolvedValue([
  { id: 1, dadorCargaId: 55, truckPlateNorm: 'AB123CD', trailerPlateNorm: null, driverDniNorm: '30123456', estado: 'activa' },
]);
jest.mock('../src/config/database', () => ({
  prisma: {
    equipo: {
      findMany: (...args: any[]) => findManyMock(...args),
    },
  },
}));

const clientsRouter = require('../src/routes/clients.routes').default;

describe('Clients routes - bulk search by plates', () => {
  const app = express();
  app.use(express.json());
  app.use('/api/docs/clients', clientsRouter);

  beforeEach(() => findManyMock.mockClear());

  it('POST /bulk-search returns equipos for normalized plates (both types)', async () => {
    const res = await request(app)
      .post('/api/docs/clients/bulk-search')
      .send({ plates: ['ab-123-cd', ' AB123CD '] });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(findManyMock).toHaveBeenCalledWith({
      where: { tenantEmpresaId: 1, OR: [{ truckPlateNorm: { in: ['AB123CD'] } }, { trailerPlateNorm: { in: ['AB123CD'] } }] },
      select: { id: true, dadorCargaId: true, truckPlateNorm: true, trailerPlateNorm: true, driverDniNorm: true, estado: true },
      orderBy: { validFrom: 'desc' },
      take: 1000,
    });
  });

  it('POST /bulk-search with type=truck limits to truck plates', async () => {
    const res = await request(app)
      .post('/api/docs/clients/bulk-search')
      .send({ plates: ['aa000bb'], type: 'truck' });
    expect(res.status).toBe(200);
    expect(findManyMock).toHaveBeenCalledWith({
      where: { tenantEmpresaId: 1, OR: [{ truckPlateNorm: { in: ['AA000BB'] } }] },
      select: { id: true, dadorCargaId: true, truckPlateNorm: true, trailerPlateNorm: true, driverDniNorm: true, estado: true },
      orderBy: { validFrom: 'desc' },
      take: 1000,
    });
  });
});


