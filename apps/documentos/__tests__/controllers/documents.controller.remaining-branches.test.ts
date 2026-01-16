import type { Response } from 'express';
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

const fileStream = new EventEmitter() as any;
fileStream.pipe = jest.fn();
fileStream.on = EventEmitter.prototype.on;

const minioMock = {
  ensureBucketExists: jest.fn(async () => undefined),
  getObject: jest.fn(async () => fileStream),
  uploadDocument: jest.fn(async () => ({ bucketName: 'b', objectPath: 'p/new.pdf' })),
  deleteDocument: jest.fn(async () => undefined),
};
jest.mock('../../src/services/minio.service', () => ({ minioService: minioMock }));

const docSvcMock = {
  renew: jest.fn(async () => ({ id: 2 })),
  getHistory: jest.fn(async () => [{ id: 1 }]),
  processDocument: jest.fn(async () => undefined),
};
jest.mock('../../src/services/document.service', () => ({ DocumentService: docSvcMock }));

jest.mock('../../src/services/websocket.service', () => ({ webSocketService: { notifyNewDocument: jest.fn() } }));
jest.mock('../../src/services/audit.service', () => ({ AuditService: { log: jest.fn(async () => undefined) } }));
jest.mock('../../src/services/performance.service', () => ({
  performanceService: { refreshMaterializedView: jest.fn(async () => undefined) },
}));

jest.mock('../../src/services/thumbnail.service', () => ({
  ThumbnailService: { getSignedUrl: jest.fn(async () => 'signed-url') },
}));

jest.mock('../../src/services/queue.service', () => ({
  queueService: { addDocumentValidation: jest.fn(async () => undefined), cancelDocumentValidationJobs: jest.fn(async () => undefined) },
}));

import { ThumbnailService } from '../../src/services/thumbnail.service';
import { DocumentsController } from '../../src/controllers/documents.controller';
import type { AuthRequest } from '../../src/middlewares/auth.middleware';

function makeRes() {
  const json = jest.fn();
  const status = jest.fn().mockReturnValue({ json });
  const setHeader = jest.fn().mockReturnThis();
  const end = jest.fn().mockReturnThis();
  const res: any = { json, status, setHeader, end, headersSent: false };
  res.status.mockImplementation(() => res);
  return res as Response & { json: jest.Mock; status: jest.Mock; setHeader: jest.Mock; end: jest.Mock; headersSent: boolean };
}

describe('DocumentsController remaining branches', () => {
  beforeEach(() => {
    resetPrismaMock();
    jest.clearAllMocks();
    fileStream.removeAllListeners();
    (fileStream.pipe as jest.Mock).mockClear();
  });

  it('uploadDocument wraps unknown errors as UPLOAD_DOCUMENT_ERROR', async () => {
    prismaMock.documentTemplate.findUnique.mockResolvedValueOnce({ id: 1, name: 'DNI', active: true } as any);
    prismaMock.document.findFirst.mockResolvedValueOnce({ id: 10, status: 'VENCIDO' } as any);
    // Force an unexpected error (no code) inside try
    minioMock.uploadDocument.mockRejectedValueOnce(new Error('boom'));

    const req: any = {
      tenantId: 1,
      method: 'POST',
      originalUrl: '/api/docs/documents/upload',
      user: { userId: 1, role: 'ADMIN_INTERNO', empresaId: 1 },
      body: { templateId: '1', entityType: 'CHOFER', entityId: '1', dadorCargaId: '1', confirmNewVersion: true, expiresAt: 'not-a-date' },
      files: { documents: [{ mimetype: 'application/pdf', buffer: Buffer.from('%PDF'), originalname: 'doc.pdf' }] },
    };
    const res = makeRes();
    await expect(DocumentsController.uploadDocument(req as AuthRequest, res)).rejects.toMatchObject({ code: 'UPLOAD_DOCUMENT_ERROR' });
  });

  it('getDocumentsByEmpresa forbids non-superadmin and wraps unexpected errors', async () => {
    const res = makeRes();
    await expect(
      DocumentsController.getDocumentsByEmpresa(
        { tenantId: 1, user: { role: 'ADMIN', empresaId: 9 }, params: { dadorId: '2' }, query: {} } as any,
        res
      )
    ).rejects.toMatchObject({ code: 'GET_DOCUMENTS_DADOR_ERROR' });

    prismaMock.document.findMany.mockRejectedValueOnce(new Error('boom'));
    await expect(
      DocumentsController.getDocumentsByEmpresa(
        { tenantId: 1, user: { role: 'SUPERADMIN' }, params: { dadorId: '2' }, query: {} } as any,
        res
      )
    ).rejects.toMatchObject({ code: 'GET_DOCUMENTS_DADOR_ERROR' });
  });

  it('downloadDocument covers end + error stream handlers and wraps unexpected errors', async () => {
    prismaMock.document.findUnique.mockResolvedValueOnce({
      id: 1,
      tenantEmpresaId: 1,
      dadorCargaId: 9,
      filePath: 'docs-t1/path/to.pdf',
      fileName: 'a.pdf',
      mimeType: 'application/pdf',
      template: { name: 'DNI' },
    } as any);

    const res = makeRes();
    const req: any = { user: { role: 'ADMIN', empresaId: 1, userId: 7 }, params: { id: '1' }, query: {} };
    await DocumentsController.downloadDocument(req, res);
    expect(fileStream.pipe).toHaveBeenCalledWith(res);

    // end branch
    fileStream.emit('end');

    // error branch: headers not sent => 500 json
    fileStream.emit('error', new Error('stream boom'));
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: expect.any(String) }));

    // wrapper catch: make getObject throw
    prismaMock.document.findUnique.mockResolvedValueOnce({
      id: 2,
      tenantEmpresaId: 1,
      dadorCargaId: 9,
      filePath: 'docs-t1/path/to2.pdf',
      fileName: 'a2.pdf',
      mimeType: 'application/pdf',
      template: { name: 'DNI' },
    } as any);
    minioMock.getObject.mockRejectedValueOnce(new Error('boom'));
    await expect(DocumentsController.downloadDocument(req, res)).rejects.toMatchObject({ code: 'DOCUMENT_DOWNLOAD_ERROR' });
  });

  it('getDocumentPreview wraps unknown errors as DOCUMENT_PREVIEW_ERROR', async () => {
    prismaMock.document.findUnique.mockRejectedValueOnce(new Error('boom'));
    const res = makeRes();
    await expect(DocumentsController.getDocumentPreview({ params: { id: '1' } } as any, res)).rejects.toMatchObject({
      code: 'DOCUMENT_PREVIEW_ERROR',
    });
  });

  it('getDocumentThumbnail wraps unknown errors', async () => {
    prismaMock.document.findUnique.mockResolvedValueOnce({ id: 1, tenantEmpresaId: 1, dadorCargaId: 9, mimeType: 'application/pdf' } as any);
    (ThumbnailService.getSignedUrl as jest.Mock).mockRejectedValueOnce(new Error('boom'));
    const res = makeRes();
    await expect(
      DocumentsController.getDocumentThumbnail({ user: { role: 'ADMIN', empresaId: 1 }, params: { id: '1' } } as any, res)
    ).rejects.toMatchObject({ code: 'DOCUMENT_THUMBNAIL_ERROR' });
  });

  it('getDocumentHistory wraps unknown errors', async () => {
    (docSvcMock.getHistory as jest.Mock).mockRejectedValueOnce(new Error('boom'));
    const res = makeRes();
    await expect(DocumentsController.getDocumentHistory({ params: { id: '1' } } as any, res)).rejects.toMatchObject({
      code: 'DOCUMENT_HISTORY_ERROR',
    });
  });

  it('deleteDocument wraps unknown errors', async () => {
    prismaMock.document.findUnique.mockRejectedValueOnce(new Error('boom'));
    const res = makeRes();
    await expect(
      DocumentsController.deleteDocument({ params: { id: '1' }, user: { role: 'SUPERADMIN', userId: 1 }, method: 'DELETE' } as any, res)
    ).rejects.toMatchObject({ code: 'DELETE_DOCUMENT_ERROR' });
  });

  it('resubmitDocument covers missing doc, missing file, and wraps unknown errors', async () => {
    const res = makeRes();
    prismaMock.document.findFirst.mockResolvedValueOnce(null);
    await expect(
      DocumentsController.resubmitDocument({ tenantId: 1, params: { id: '5' }, user: { userId: 1, role: 'TRANSPORTISTA' } } as any, res)
    ).rejects.toMatchObject({ code: 'DOCUMENT_NOT_FOUND' });

    prismaMock.document.findFirst.mockResolvedValueOnce({
      id: 5,
      tenantEmpresaId: 1,
      status: 'RECHAZADO',
      filePath: 'oldbucket/old.pdf',
      entityType: 'CHOFER',
      entityId: 10,
      template: { name: 'DNI' },
    } as any);
    await expect(
      DocumentsController.resubmitDocument({ tenantId: 1, params: { id: '5' }, user: { userId: 1, role: 'TRANSPORTISTA' }, files: {} } as any, res)
    ).rejects.toMatchObject({ code: 'FILE_REQUIRED' });

    prismaMock.document.findFirst.mockResolvedValueOnce({
      id: 6,
      tenantEmpresaId: 1,
      status: 'RECHAZADO',
      filePath: 'oldbucket/old.pdf',
      entityType: 'CHOFER',
      entityId: 10,
      template: { name: 'DNI' },
    } as any);
    minioMock.uploadDocument.mockRejectedValueOnce(new Error('boom'));
    await expect(
      DocumentsController.resubmitDocument(
        {
          tenantId: 1,
          params: { id: '6' },
          user: { userId: 1, role: 'TRANSPORTISTA' },
          method: 'POST',
          originalUrl: '/api/docs/documents/6/resubmit',
          files: { documents: [{ mimetype: 'application/pdf', buffer: Buffer.from('%PDF'), originalname: 'doc.pdf' }] },
          body: {},
        } as any,
        res
      )
    ).rejects.toMatchObject({ code: 'RESUBMIT_ERROR' });
  });
});


