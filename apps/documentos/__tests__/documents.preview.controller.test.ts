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
          filePath: 'bucket/path/to/file.pdf',
          fileName: 'file.pdf',
          mimeType: 'application/pdf',
          dadorCargaId: 55,
          tenantEmpresaId: 1,
          entityType: 'CHOFER',
          entityId: 101,
          template: { name: 'Licencia' },
        })
      }
    })
  }
}));

jest.mock('../src/services/minio.service', () => ({
  minioService: { ensureBucketExists: jest.fn().mockResolvedValue(undefined), getSignedUrl: jest.fn().mockResolvedValue('http://signed') }
}));

function mockRes() {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

describe('DocumentsController.getDocumentPreview', () => {
  it('returns preview payload', async () => {
    const req: any = { params: { id: '1' }, user: { role: 'SUPERADMIN' }, protocol: 'http', get: (_h: string) => 'localhost:4802' };
    const res = mockRes();
    await DocumentsController.getDocumentPreview(req, res);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });
});
