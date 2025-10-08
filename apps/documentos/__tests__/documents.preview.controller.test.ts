const { DocumentsController } = require('../dist/controllers/documents.controller');

jest.mock('../dist/config/database', () => ({
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

jest.mock('../dist/services/minio.service', () => ({
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
    const req: any = { params: { id: '1' }, user: { role: 'SUPERADMIN' } };
    const res = mockRes();
    await DocumentsController.getDocumentPreview(req, res);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });
});
