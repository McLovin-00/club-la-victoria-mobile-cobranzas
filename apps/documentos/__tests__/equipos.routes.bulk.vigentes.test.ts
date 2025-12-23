import request from 'supertest';
import express from 'express';
import { Readable } from 'stream';

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
}));

// Mock archiver to provide a zip-like interface that ends the response on finalize
jest.mock('archiver', () => {
  return () => {
    let dest: any;
    return {
      pipe: (d: any) => { dest = d; },
      append: (_stream: any, _opts: any) => {},
      on: (_event: string, _handler: any) => {},
      abort: () => {},
      finalize: () => { if (dest && typeof dest.end === 'function') dest.end(); },
    };
  };
});

// Mock MinIO service to return a readable stream for each object
jest.mock('../src/services/minio.service', () => ({
  minioService: {
    getObject: async () => {
      const r = new Readable();
      r.push('pdf-bytes');
      r.push(null);
      return r;
    },
  },
}));

// Mock database calls for equipo and documents
jest.mock('../src/config/database', () => ({
  prisma: {
    equipo: {
      findUnique: jest.fn().mockResolvedValue({
        id: 123,
        tenantEmpresaId: 1,
        dadorCargaId: 55,
        driverId: 1,
        truckId: 2,
        trailerId: 3,
        truckPlateNorm: 'AB123CD',
        trailerPlateNorm: 'AA000BB',
        driverDniNorm: '30123456',
      }),
    },
    document: {
      findMany: jest.fn().mockResolvedValue([
        { id: 1, filePath: 'bucket/path/to/doc1.pdf', entityType: 'CHOFER', entityId: 1, template: { name: 'Licencia' } },
        { id: 2, filePath: 'bucket/path/to/doc2.pdf', entityType: 'CAMION', entityId: 2, template: { name: 'VTV' } },
      ]),
    },
  },
}));

const equiposRouter = require('../src/routes/equipos.routes').default;

describe('Equipos routes - bulk vigentes ZIP', () => {
  const app = express();
  app.use(express.json());
  app.use('/api/docs/equipos', equiposRouter);

  // TODO: Fix mock setup for database and archiver
  it.skip('POST /download/vigentes streams ZIP response', async () => {
    const res = await request(app)
      .post('/api/docs/equipos/download/vigentes')
      .send({ equipoIds: [123] });
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('application/zip');
    expect(res.headers['content-disposition']).toContain('attachment; filename=documentacion_equipos_vigentes_');
  });
});


