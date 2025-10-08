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
  minioService: {
    ensureBucketExists: jest.fn().mockResolvedValue(undefined),
    getObject: jest.fn().mockImplementation(() => {
      const listeners: Record<string, any> = {};
      return {
        pipe: (_res: any) => {
          process.nextTick(() => listeners['end'] && listeners['end']());
        },
        on: (event: string, cb: any) => { listeners[event] = cb; },
      };
    }),
  }
}));

function mockRes() {
  const res: any = {};
  res.setHeader = jest.fn();
  res.headersSent = false;
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.end = jest.fn();
  return res;
}

describe('DocumentsController.downloadDocument', () => {
  it('sets headers and pipes stream', async () => {
    const req: any = { params: { id: '1' }, user: { role: 'SUPERADMIN' } };
    const res = mockRes();
    await DocumentsController.downloadDocument(req, res);
    expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'application/pdf');
    expect(res.setHeader).toHaveBeenCalledWith('Content-Disposition', expect.stringContaining('file.pdf'));
  });
});
