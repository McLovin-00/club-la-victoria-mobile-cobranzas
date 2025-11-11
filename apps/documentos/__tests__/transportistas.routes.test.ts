import request from 'supertest';
import express from 'express';

jest.mock('../src/middlewares/auth.middleware', () => ({
  authenticate: (req: any, _res: any, next: any) => { 
    req.user = { id: 10, metadata: { empresaTransportistaId: 77, choferDniNorm: '30123456' } }; 
    next(); 
  },
  authorize: () => (_req: any, _res: any, next: any) => next(),
  tenantResolver: (_req: any, _res: any, next: any) => next(),
  validate: () => (_req: any, _res: any, next: any) => next(),
}));

const findFirstMock = jest.fn();
const findUniqueMock = jest.fn();
const findManyMock = jest.fn();
jest.mock('../src/config/database', () => ({
  prisma: {
    chofer: {
      findFirst: (...args: any[]) => findFirstMock(...args),
      findUnique: (...args: any[]) => findUniqueMock(...args),
    },
    equipo: {
      findMany: (...args: any[]) => findManyMock(...args),
    },
  },
}));

const router = require('../src/routes/transportistas.routes').default;

describe('Transportistas routes', () => {
  const app = express();
  app.use(express.json());
  app.use('/api/docs/transportistas', router);

  beforeEach(() => {
    findFirstMock.mockReset();
    findUniqueMock.mockReset();
    findManyMock.mockReset();
  });

  it('GET /mis-equipos returns empty if no chofer matched', async () => {
    findFirstMock.mockResolvedValue(null);
    findUniqueMock.mockResolvedValue(null);
    const res = await request(app).get('/api/docs/transportistas/mis-equipos');
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
  });

  it('POST /search respects empresaTransportistaId and dni/plate', async () => {
    findManyMock.mockResolvedValue([{ id: 1, driverDniNorm: '30123456', truckPlateNorm: 'AA000BB', trailerPlateNorm: null, empresaTransportistaId: 77 }]);
    const res = await request(app)
      .post('/api/docs/transportistas/search')
      .send({ dni: '30.123.456', plate: 'aa-000-bb' });
    expect(res.status).toBe(200);
    expect(findManyMock).toHaveBeenCalled();
    expect(res.body.data[0].empresaTransportistaId).toBe(77);
  });
});


