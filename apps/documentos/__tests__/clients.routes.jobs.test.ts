import request from 'supertest';
import express from 'express';

jest.mock('../src/middlewares/auth.middleware', () => ({
  authenticate: (_req: any, _res: any, next: any) => next(),
  authorize: () => (_req: any, _res: any, next: any) => next(),
  tenantResolver: (req: any, _res: any, next: any) => { req.tenantId = 1; next(); },
  validate: () => (_req: any, _res: any, next: any) => next(),
}));

// Mock del servicio para controlar el job
const getJobMock = jest.fn();
const enqueueMock = jest.fn();
jest.mock('../src/services/document-zip.service', () => ({
  DocumentZipService: {
    enqueueZipJob: (...args: any[]) => enqueueMock(...args),
    getJob: (...args: any[]) => getJobMock(...args),
  },
}));

// Mock minio service to avoid real env/initialization
jest.mock('../src/services/minio.service', () => ({
  minioService: {
    getSignedUrlInternal: async () => 'http://signed',
  },
}));

const clientsRouter = require('../src/routes/clients.routes').default;

describe('Clients routes - zip jobs polling', () => {
  const app = express();
  app.use(express.json());
  app.use('/api/docs/clients', clientsRouter);

  beforeEach(() => {
    enqueueMock.mockReset();
    getJobMock.mockReset();
  });

  it('GET /jobs/:jobId returns 404 for unknown job', async () => {
    getJobMock.mockReturnValue(undefined);
    const res = await request(app).get('/api/docs/clients/jobs/unknown');
    expect(res.status).toBe(404);
  });

  it('GET /jobs/:jobId returns job with signedUrl if completed', async () => {
    getJobMock.mockReturnValue({
      id: 'zip_1',
      tenantEmpresaId: 1,
      createdAt: Date.now(),
      status: 'completed',
      progress: 1,
      totalEquipos: 1,
      processedEquipos: 1,
      artifact: { bucketName: 'b', objectPath: 'p' },
    });
    const res = await request(app).get('/api/docs/clients/jobs/zip_1');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.job.signedUrl).toBe('http://signed');
  });
});


