const { DocumentsController } = require('../dist/controllers/documents.controller');

jest.mock('../dist/config/database', () => ({
  db: {
    getClient: () => ({
      documentTemplate: { findUnique: jest.fn().mockResolvedValue({ id:1, name: 'Licencia', active: true }) },
      document: { create: jest.fn().mockResolvedValue({ id: 1, template: { name: 'Licencia' }, entityType: 'CHOFER', entityId: 101, dadorCargaId: 55, fileName: 'a.pdf' }) },
    }),
  },
}));

jest.mock('../dist/services/minio.service', () => ({
  minioService: { uploadDocument: jest.fn().mockResolvedValue({ bucketName: 'b', objectPath: 'o' }) },
}));

jest.mock('../dist/services/document.service', () => ({
  DocumentService: { processDocument: jest.fn().mockResolvedValue(undefined) },
}));

jest.mock('../dist/services/websocket.service', () => ({
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
    const req: any = { body: { templateId: 1, entityType: 'CHOFER', entityId: 101, dadorCargaId: 55 }, file: { originalname: 'a.pdf', buffer: Buffer.from('x'), mimetype: 'application/pdf', size: 1 }, tenantId: 1, user: { email: 'a@b.com' } };
    const res = mockRes();
    await DocumentsController.uploadDocument(req, res);
    expect(res.status).toHaveBeenCalledWith(201);
  });
});
