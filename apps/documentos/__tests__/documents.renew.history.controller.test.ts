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

jest.mock('../src/services/document.service', () => ({
  DocumentService: {
    renew: jest.fn().mockResolvedValue({ id: 2, status: 'PENDIENTE_APROBACION' }),
    getHistory: jest.fn().mockResolvedValue([{ id: 1 }, { id: 2 }]),
  },
}));

function mockRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

describe('DocumentsController renew/history', () => {
  it('renews document and returns 201', async () => {
    const req = { params: { id: '1' }, body: { expiresAt: '2030-01-01T00:00:00Z' }, user: { userId: 99 } };
    const res = mockRes();
    await DocumentsController.renewDocument(req, res);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, data: expect.objectContaining({ id: 2 }) }));
  });

  it('returns history', async () => {
    const req = { params: { id: '1' } };
    const res = mockRes();
    await DocumentsController.getDocumentHistory(req, res);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, data: expect.any(Array) }));
  });
});


