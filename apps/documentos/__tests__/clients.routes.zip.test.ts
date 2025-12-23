import request from 'supertest';
import express from 'express';

jest.mock('../src/middlewares/auth.middleware', () => ({
  authenticate: (req: any, _res: any, next: any) => { 
    req.tenantId = 1; 
    req.user = { id: 1, role: 'ADMIN', empresa_id: 1 };
    next(); 
  },
  authorize: () => (_req: any, _res: any, next: any) => next(),
  tenantResolver: (_req: any, _res: any, next: any) => next(),
  validate: () => (_req: any, _res: any, next: any) => next(),
  canModifyEquipo: () => (_req: any, _res: any, next: any) => next(),
  ADMIN_ROLES: ['ADMIN', 'SUPERADMIN'],
  CLIENT_ROLES: ['CLIENTE', 'DADOR_CARGA'],
}));

jest.mock('../src/services/minio.service', () => ({
  minioService: {
    getObject: jest.fn().mockImplementation(() => {
      const { Readable } = require('stream');
      const r = new Readable({ read() {} });
      process.nextTick(() => { r.push(Buffer.from('data')); r.push(null); });
      return r;
    }),
  },
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
        truckPlateNorm: 'ABC123',
        trailerPlateNorm: 'DEF456',
        driverDniNorm: '12345678',
      }),
    },
    document: {
      findMany: jest.fn().mockResolvedValue([
        { id: 11, entityType: 'CHOFER', entityId: 2, filePath: 'bucket/path/chofer.pdf', template: { name: 'Licencia' } },
        { id: 12, entityType: 'CAMION', entityId: 3, filePath: 'bucket/path/camion.pdf', template: { name: 'Cédula' } },
      ]),
    },
  },
}));

const clientsRouter = require('../src/routes/clients.routes').default;

describe('Clients routes - ZIP', () => {
  const app = express();
  app.use('/api/docs/clients', clientsRouter);

  // TODO: Fix mock setup for database and MinIO
  it.skip('GET /equipos/:equipoId/zip returns application/zip', async () => {
    const res = await request(app).get('/api/docs/clients/equipos/1/zip');
    expect(res.status).toBe(200);
    expect((res.headers['content-type'] || '').toLowerCase()).toContain('application/zip');
  });
});


