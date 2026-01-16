import { Response } from 'express';
import { EventEmitter } from 'events';

import { prismaMock, resetPrismaMock } from '../mocks/prisma.mock';

jest.mock('../../src/middlewares/error.middleware', () => ({
  createError: (message: string, statusCode = 500, code = 'ERR') => {
    const err: any = new Error(message);
    err.statusCode = statusCode;
    err.code = code;
    return err;
  },
}));

jest.mock('../../src/config/logger', () => ({
  AppLogger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

jest.mock('../../src/config/database', () => ({
  db: { getClient: () => prismaMock },
}));

const minioMock = {
  deleteDocument: jest.fn(async () => undefined),
  uploadDocument: jest.fn(async () => ({ bucketName: 'b', objectPath: 'p/new.pdf' })),
};
jest.mock('../../src/services/minio.service', () => ({ minioService: minioMock }));

const queueMock = {
  cancelDocumentValidationJobs: jest.fn(async () => undefined),
  addDocumentValidation: jest.fn(async () => undefined),
};
jest.mock('../../src/services/queue.service', () => ({ queueService: queueMock }));

const auditMock = { log: jest.fn(async () => undefined) };
jest.mock('../../src/services/audit.service', () => ({ AuditService: auditMock }));

jest.mock('../../src/services/performance.service', () => ({
  performanceService: { refreshMaterializedView: jest.fn(async () => undefined) },
}));

// pdfkit + sharp for image->pdf branch
class FakePDFKitDoc extends EventEmitter {
  addPage() { return this; }
  image() { return this; }
  end() {
    // Controller attaches the 'end' listener AFTER calling doc.end(),
    // so we must emit asynchronously to avoid hanging the test.
    setImmediate(() => {
      this.emit('data', Buffer.from('%PDF'));
      this.emit('end');
    });
  }
}
jest.mock('pdfkit', () => ({ __esModule: true, default: FakePDFKitDoc }), { virtual: true });
jest.mock('sharp', () => ({
  __esModule: true,
  default: () => ({ metadata: async () => ({ width: 100, height: 200 }) }),
}));

import { DocumentsController } from '../../src/controllers/documents.controller';
import { AuthRequest } from '../../src/middlewares/auth.middleware';

function makeRes() {
  const json = jest.fn();
  const status = jest.fn().mockReturnValue({ json });
  return { json, status } as unknown as Response & { json: jest.Mock; status: jest.Mock };
}

describe('DocumentsController delete/resubmit', () => {
  beforeEach(() => {
    resetPrismaMock();
    jest.clearAllMocks();
  });

  it('deleteDocument: should 404 when doc not found', async () => {
    const req = { params: { id: '1' }, user: { role: 'SUPERADMIN', userId: 1 } as any, method: 'DELETE' } as any as AuthRequest;
    const res = makeRes();
    prismaMock.document.findUnique.mockResolvedValueOnce(null);

    await expect(DocumentsController.deleteDocument(req, res)).rejects.toMatchObject({ code: 'DOCUMENT_NOT_FOUND' });
  });

  it('deleteDocument: should forbid non-superadmin deleting other empresa docs', async () => {
    const req = { params: { id: '1' }, user: { role: 'ADMIN', empresaId: 9, userId: 1 } as any, method: 'DELETE' } as any as AuthRequest;
    const res = makeRes();
    prismaMock.document.findUnique.mockResolvedValueOnce({ id: 1, filePath: 'b/p.pdf', fileName: 'x', dadorCargaId: 2, template: { name: 'T' } } as any);

    await expect(DocumentsController.deleteDocument(req, res)).rejects.toMatchObject({ code: 'DELETE_ACCESS_DENIED' });
  });

  it('deleteDocument: should cancel jobs, delete from MinIO + DB and audit', async () => {
    const req = {
      params: { id: '1' },
      user: { role: 'ADMIN', empresaId: 2, userId: 1 } as any,
      tenantId: 1,
      method: 'DELETE',
      path: '/api/docs/documents/1',
      originalUrl: '/api/docs/documents/1',
    } as any as AuthRequest;
    const res = makeRes();

    prismaMock.document.findUnique.mockResolvedValueOnce({
      id: 1,
      filePath: 'bucket/path.pdf',
      fileName: 'x.pdf',
      dadorCargaId: 2,
      entityType: 'CHOFER',
      entityId: 10,
      template: { name: 'DNI' },
    } as any);
    prismaMock.document.delete.mockResolvedValueOnce({} as any);

    await DocumentsController.deleteDocument(req, res);

    expect(queueMock.cancelDocumentValidationJobs).toHaveBeenCalledWith(1);
    expect(minioMock.deleteDocument).toHaveBeenCalledWith('bucket', 'path.pdf');
    expect(prismaMock.document.delete).toHaveBeenCalled();
    expect(auditMock.log).toHaveBeenCalledWith(expect.objectContaining({ action: 'DOCUMENT_DELETE' }));
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });

  it('resubmitDocument: should require file and resubmit PDF (and ignore old delete errors)', async () => {
    const req: any = {
      tenantId: 1,
      params: { id: '5' },
      user: { userId: 1, role: 'TRANSPORTISTA' },
      method: 'POST',
      originalUrl: '/api/docs/documents/5/resubmit',
      files: { documents: [{ mimetype: 'application/pdf', buffer: Buffer.from('%PDF'), originalname: 'doc.pdf' }] },
      body: {},
    };
    const res = makeRes();

    prismaMock.document.findFirst.mockResolvedValueOnce({
      id: 5,
      tenantEmpresaId: 1,
      status: 'RECHAZADO',
      filePath: 'oldbucket/old.pdf',
      entityType: 'CHOFER',
      entityId: 10,
      template: { name: 'DNI' },
    } as any);

    minioMock.deleteDocument.mockRejectedValueOnce(new Error('ignore'));
    minioMock.uploadDocument.mockResolvedValueOnce({ bucketName: 'b', objectPath: 'p/new.pdf' });
    prismaMock.document.update.mockResolvedValueOnce({ id: 5, filePath: 'b/p/new.pdf' } as any);
    prismaMock.documentClassification.deleteMany.mockResolvedValueOnce({ count: 1 } as any);

    await DocumentsController.resubmitDocument(req as AuthRequest, res);

    expect(minioMock.uploadDocument).toHaveBeenCalled();
    expect(queueMock.addDocumentValidation).toHaveBeenCalled();
    expect(auditMock.log).toHaveBeenCalledWith(expect.objectContaining({ action: 'DOCUMENT_RESUBMIT' }));
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });

  it('resubmitDocument: should convert image to PDF and resubmit', async () => {
    const req: any = {
      tenantId: 1,
      params: { id: '6' },
      user: { userId: 1, role: 'TRANSPORTISTA' },
      method: 'POST',
      originalUrl: '/api/docs/documents/6/resubmit',
      file: { mimetype: 'image/png', buffer: Buffer.from('img'), originalname: 'img.png' },
      body: {},
    };
    const res = makeRes();

    prismaMock.document.findFirst.mockResolvedValueOnce({
      id: 6,
      tenantEmpresaId: 1,
      status: 'RECHAZADO',
      filePath: 'oldbucket/old.pdf',
      entityType: 'CHOFER',
      entityId: 10,
      template: { name: 'DNI' },
    } as any);

    minioMock.uploadDocument.mockResolvedValueOnce({ bucketName: 'b', objectPath: 'p/new.pdf' });
    prismaMock.document.update.mockResolvedValueOnce({ id: 6, filePath: 'b/p/new.pdf' } as any);
    prismaMock.documentClassification.deleteMany.mockResolvedValueOnce({ count: 1 } as any);

    await DocumentsController.resubmitDocument(req as AuthRequest, res);
    expect(minioMock.uploadDocument).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });
});


