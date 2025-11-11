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
const { DocumentsController } = require('../src/controllers/documents.controller');

jest.mock('../src/services/queue.service', () => ({
  queueService: { addDocumentValidation: jest.fn(), cancelDocumentValidationJobs: jest.fn() },
}));

jest.mock('../src/config/database', () => ({
  db: {
    getClient: () => ({
      document: {
        findUnique: jest.fn().mockResolvedValue({
          id: 1,
          tenantEmpresaId: 1,
          dadorCargaId: 10,
          mimeType: 'image/jpeg',
        }),
      },
    }),
  },
}));

jest.mock('../src/services/thumbnail.service', () => ({
  ThumbnailService: { getSignedUrl: jest.fn().mockResolvedValue('http://thumb') },
}));

function mockRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

describe('DocumentsController.getDocumentThumbnail', () => {
  it('returns signed thumbnail url', async () => {
    const req = { params: { id: '1' }, user: { role: 'SUPERADMIN' } };
    const res = mockRes();
    await DocumentsController.getDocumentThumbnail(req, res);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, data: expect.objectContaining({ url: 'http://thumb' }) }));
  });
});


