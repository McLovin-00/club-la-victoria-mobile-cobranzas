import request from 'supertest';
import express from 'express';

jest.mock('../src/config/environment', () => ({
  getEnvironment: () => ({
    ENABLE_DOCUMENTOS: true,
    DOCUMENTOS_PORT: 4802,
    NODE_ENV: 'test',
    DOCUMENTOS_DATABASE_URL: 'postgres://u:p@localhost:5432/db',
    MINIO_ENDPOINT: 'localhost:9000',
    MINIO_PORT: 9000,
    MINIO_REGION: 'us-east-1',
    MINIO_ACCESS_KEY: 'minio',
    MINIO_SECRET_KEY: 'miniosecret',
    MINIO_USE_SSL: false,
    MINIO_BUCKET_PREFIX: 'documentos-empresa',
  }),
}));

jest.mock('../src/middlewares/auth.middleware', () => ({
  authenticate: (_req: any, _res: any, next: any) => next(),
  authorize: () => (_req: any, _res: any, next: any) => next(),
  tenantResolver: (req: any, _res: any, next: any) => { req.tenantId = 1; req.user = { role: 'SUPERADMIN', userId: 99 }; next(); },
  authorizeEmpresa: (_req: any, _res: any, next: any) => next(),
  validate: () => (_req: any, _res: any, next: any) => next(),
}));

jest.mock('../src/config/database', () => {
  const logs = [
    {
      id: 1,
      tenantEmpresaId: 1,
      accion: 'POST /api/docs/documents',
      detalles: { foo: 'bar' },
      userId: 99,
      userRole: 'SUPERADMIN',
      statusCode: 201,
      method: 'POST',
      path: '/api/docs/documents',
      entityType: 'CAMION',
      entityId: 10,
      createdAt: new Date().toISOString(),
    },
  ];
  return {
    db: {
      getClient: () => ({
        auditLog: {
          findMany: jest.fn().mockResolvedValue(logs),
          count: jest.fn().mockResolvedValue(logs.length),
        },
      }),
    },
  };
});

const routes = require('../src/routes').default;

describe('Audit logs route', () => {
  const app = express();
  app.use(express.json());
  app.use('/', routes);

  it('GET /api/docs/audit/logs returns paginated list', async () => {
    const res = await request(app).get('/api/docs/audit/logs?page=1&limit=10');
    expect(res.status).toBe(200);
    expect(res.body?.success).toBe(true);
    expect(Array.isArray(res.body?.data)).toBe(true);
    expect(typeof res.body?.total).toBe('number');
    expect(typeof res.body?.page).toBe('number');
    expect(typeof res.body?.limit).toBe('number');
  });
});


