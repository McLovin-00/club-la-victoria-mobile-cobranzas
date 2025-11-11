jest.mock('../src/config/environment', () => ({
  getEnvironment: () => ({
    ENABLE_DOCUMENTOS: true,
    DOCUMENTOS_PORT: 4802,
    NODE_ENV: 'test',
    DOCUMENTOS_DATABASE_URL: 'postgres://u:p@localhost:5432/db',
    JWT_PUBLIC_KEY: '',
    JWT_PUBLIC_KEY_PATH: '',
    JWT_LEGACY_SECRET: '',
    MINIO_ENDPOINT: 'localhost:9000',
    MINIO_PORT: 9000,
    MINIO_REGION: 'us-east-1',
    MINIO_ACCESS_KEY: 'minio',
    MINIO_SECRET_KEY: 'miniosecret',
    MINIO_USE_SSL: false,
    MINIO_BUCKET_PREFIX: 'documentos-empresa',
    MINIO_PUBLIC_BASE_URL: undefined,
    MINIO_INTERNAL_BASE_URL: undefined,
    FLOWISE_ENDPOINT: undefined,
    FLOWISE_API_KEY: undefined,
    FLOWISE_FLOW_ID: undefined,
    REDIS_URL: 'redis://localhost:6379',
    PDF_RASTERIZE_ENABLED: true,
    PDF_RASTERIZE_DPI: 200,
    PDF_RASTERIZE_MAX_PAGES: 0,
    PDF_RASTERIZE_CHUNK_SIZE: 5,
    DOCS_MAX_DEPRECATED_VERSIONS: 2,
    DOCS_DUE_SOON_DAYS: 30,
    LOG_LEVEL: 'error',
    FRONTEND_URLS: undefined,
    CLAMAV_HOST: undefined,
    CLAMAV_PORT: undefined,
  }),
  isServiceEnabled: () => true,
}));

jest.mock('../src/services/queue.service', () => ({
  queueService: { addDocumentValidation: jest.fn(), cancelDocumentValidationJobs: jest.fn() },
}));
const { DocumentsController } = require('../src/controllers/documents.controller');

jest.mock('../src/config/database', () => ({
  db: {
    getClient: () => ({
      documentTemplate: { findUnique: jest.fn().mockResolvedValue({ id:1, name: 'Licencia', active: true }) },
      document: { 
        findFirst: jest.fn().mockResolvedValue({ id: 99, status: 'VENCIDO' }),
        create: jest.fn().mockResolvedValue({ id: 1, template: { name: 'Licencia' }, entityType: 'CHOFER', entityId: 101, dadorCargaId: 55, fileName: 'a.pdf' }) 
      },
    }),
  },
}));

jest.mock('../src/services/minio.service', () => ({
  minioService: { uploadDocument: jest.fn().mockResolvedValue({ bucketName: 'b', objectPath: 'o' }) },
}));

jest.mock('../src/services/document.service', () => ({
  DocumentService: { processDocument: jest.fn().mockResolvedValue(undefined) },
}));

jest.mock('../src/services/websocket.service', () => ({
  webSocketService: { notifyNewDocument: jest.fn() },
}));

function mockRes() {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

describe('DocumentsController', () => {
  it('uploadDocument ok', async () => {
    const req: any = { body: { templateId: 1, entityType: 'CHOFER', entityId: 101, dadorCargaId: 55, mode: 'renewal' }, file: { originalname: 'a.pdf', buffer: Buffer.from('x'), mimetype: 'application/pdf', size: 1 }, tenantId: 1, user: { email: 'a@b.com' } };
    const res = mockRes();
    await DocumentsController.uploadDocument(req, res);
    expect(res.status).toHaveBeenCalledWith(201);
  });
});
