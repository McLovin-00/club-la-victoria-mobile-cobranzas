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
    REDIS_URL: 'redis://localhost:6379',
    PDF_RASTERIZE_ENABLED: true,
    PDF_RASTERIZE_DPI: 200,
    PDF_RASTERIZE_MAX_PAGES: 0,
    PDF_RASTERIZE_CHUNK_SIZE: 5,
    DOCS_MAX_DEPRECATED_VERSIONS: 2,
    DOCS_DUE_SOON_DAYS: 30,
    LOG_LEVEL: 'error',
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
      documentTemplate: { findUnique: jest.fn().mockResolvedValue(null) },
      document: { findUnique: jest.fn().mockResolvedValue(null) },
    }),
  },
}));

function mockRes() {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

describe('DocumentsController errors', () => {
  it('uploadDocument throws when template not found', async () => {
    const req: any = { body: { templateId: 999, entityType: 'CHOFER', entityId: 101, dadorCargaId: 55 }, file: { originalname: 'a.pdf', buffer: Buffer.from('x'), mimetype: 'application/pdf', size: 1 }, tenantId: 1, user: { email: 'a@b.com' } };
    const res = mockRes();
    await expect(DocumentsController.uploadDocument(req, res)).rejects.toHaveProperty('code', 'TEMPLATE_NOT_FOUND');
  });

  it('getDocumentPreview throws when document not found', async () => {
    const req: any = { params: { id: '1' }, user: { role: 'SUPERADMIN' } };
    const res = mockRes();
    await expect(DocumentsController.getDocumentPreview(req, res)).rejects.toHaveProperty('code', 'DOCUMENT_NOT_FOUND');
  });
});
