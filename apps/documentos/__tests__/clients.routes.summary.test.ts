import request from 'supertest';
import express from 'express';

jest.mock('../src/middlewares/auth.middleware', () => ({
  authenticate: (_req: any, _res: any, next: any) => next(),
  authorize: () => (_req: any, _res: any, next: any) => next(),
  tenantResolver: (_req: any, _res: any, next: any) => next(),
  validate: () => (_req: any, _res: any, next: any) => next(),
}));

jest.mock('../src/config/database', () => ({
  prisma: {
    equipo: {
      findUnique: jest.fn().mockResolvedValue({
        id: 1,
        tenantEmpresaId: 1,
        dadorCargaId: 10,
        driverId: 2,
        truckId: 3,
        trailerId: 4,
      }),
    },
    document: {
      findMany: jest.fn().mockResolvedValue([
        { id: 11, entityType: 'CHOFER', entityId: 2, status: 'APROBADO', uploadedAt: new Date().toISOString(), expiresAt: null, filePath: 'bucket/path/chofer.pdf', template: { name: 'Licencia', entityType: 'CHOFER' } },
      ]),
    },
  },
}));

const clientsRouter = require('../src/routes/clients.routes').default;

describe('Clients routes - Excel summary', () => {
  const app = express();
  app.use('/api/docs/clients', clientsRouter);

  it('GET /equipos/:equipoId/summary.xlsx returns Excel file', async () => {
    const res = await request(app).get('/api/docs/clients/equipos/1/summary.xlsx');
    expect(res.status).toBe(200);
    expect((res.headers['content-type'] || '').toLowerCase()).toContain('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  });
});


