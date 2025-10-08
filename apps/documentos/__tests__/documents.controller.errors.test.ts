const { DocumentsController } = require('../dist/controllers/documents.controller');

jest.mock('../dist/config/database', () => ({
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
