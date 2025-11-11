import request from 'supertest';
import express from 'express';

jest.mock('../src/middlewares/auth.middleware', () => ({
  authenticate: (req: any, _res: any, next: any) => { req.tenantId = 1; next(); },
  authorize: () => (_req: any, _res: any, next: any) => next(),
  tenantResolver: (_req: any, _res: any, next: any) => next(),
  validate: () => (_req: any, _res: any, next: any) => next(),
}));

const findManyMock = jest.fn().mockResolvedValue([
  { id: 10, dadorCargaId: 55, tenantEmpresaId: 1, driverDniNorm: '30123456', truckPlateNorm: 'AB123CD', trailerPlateNorm: null, estado: 'activa' },
]);
jest.mock('../src/config/database', () => ({
  prisma: {
    equipo: {
      findMany: (...args: any[]) => findManyMock(...args),
    },
  },
}));

const equiposRouter = require('../src/routes/equipos.routes').default;

describe('Equipos routes - search by DNIs', () => {
  const app = express();
  app.use(express.json());
  app.use('/api/docs/equipos', equiposRouter);

  beforeEach(() => {
    findManyMock.mockClear();
  });

  it('POST /search/dnis returns equipos for normalized DNIs', async () => {
    const res = await request(app)
      .post('/api/docs/equipos/search/dnis')
      .send({ dnis: ['30.123.456', '30123456', '  30-123-456  '] });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(findManyMock).toHaveBeenCalledWith({
      where: { tenantEmpresaId: 1, driverDniNorm: { in: ['30123456'] } },
      orderBy: { validFrom: 'desc' },
      select: { id: true, dadorCargaId: true, tenantEmpresaId: true, driverDniNorm: true, truckPlateNorm: true, trailerPlateNorm: true, estado: true },
    });
  });
});


