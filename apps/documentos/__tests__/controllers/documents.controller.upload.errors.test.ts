import type { Response } from 'express';

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
  uploadDocument: jest.fn(async () => ({ bucketName: 'bucket', objectPath: 'path/new.pdf' })),
};
jest.mock('../../src/services/minio.service', () => ({ minioService: minioMock }));

const wsMock = { notifyNewDocument: jest.fn() };
jest.mock('../../src/services/websocket.service', () => ({ webSocketService: wsMock }));

const docSvcMock = { processDocument: jest.fn(async () => undefined) };
jest.mock('../../src/services/document.service', () => ({ DocumentService: docSvcMock }));

jest.mock('../../src/services/audit.service', () => ({ AuditService: { log: jest.fn(async () => undefined) } }));
jest.mock('../../src/services/performance.service', () => ({
  performanceService: { refreshMaterializedView: jest.fn(async () => undefined) },
}));

// Mock MediaService for base64 and image composition branches
const mediaMock = {
  decodeDataUrl: jest.fn(),
  isImage: jest.fn((mime: string) => /^image\//i.test(mime)),
  composePdfFromImages: jest.fn(async () => Buffer.from('%PDF_FROM_IMAGES')),
};
jest.mock('../../src/services/media.service', () => ({
  MediaService: mediaMock,
}));

import { AppLogger } from '../../src/config/logger';
import { DocumentsController } from '../../src/controllers/documents.controller';
import type { AuthRequest } from '../../src/middlewares/auth.middleware';

function makeRes() {
  const json = jest.fn();
  const status = jest.fn().mockReturnValue({ json });
  return { json, status } as unknown as Response & { json: jest.Mock; status: jest.Mock };
}

describe('DocumentsController uploadDocument (error/branch paths)', () => {
  beforeEach(() => {
    resetPrismaMock();
    jest.clearAllMocks();
    mediaMock.decodeDataUrl.mockReset();
    mediaMock.composePdfFromImages.mockReset();
  });

  it('rejects when no files/base64 provided', async () => {
    const req: any = {
      tenantId: 1,
      user: { role: 'SUPERADMIN', userId: 1, empresaId: 1 },
      body: { templateId: '1', entityType: 'CHOFER', entityId: '1', dadorCargaId: '1' },
      files: {},
    };
    const res = makeRes();
    await expect(DocumentsController.uploadDocument(req as AuthRequest, res)).rejects.toMatchObject({ code: 'FILE_REQUIRED' });
  });

  it('rejects when restricted role uploads to different empresa', async () => {
    const req: any = {
      tenantId: 1,
      user: { role: 'DADOR_DE_CARGA', userId: 1, empresaId: 99 },
      body: { templateId: '1', entityType: 'CHOFER', entityId: '1', dadorCargaId: '2' },
      files: { documents: [{ mimetype: 'application/pdf', buffer: Buffer.from('%PDF'), originalname: 'doc.pdf' }] },
    };
    const res = makeRes();
    await expect(DocumentsController.uploadDocument(req as AuthRequest, res)).rejects.toMatchObject({ code: 'DOCUMENT_UPLOAD_FORBIDDEN' });
  });

  it('rejects initial upload for non-admin roles', async () => {
    prismaMock.documentTemplate.findUnique.mockResolvedValueOnce({ id: 1, name: 'DNI', active: true } as any);
    prismaMock.document.findFirst.mockResolvedValueOnce(null);

    const req: any = {
      tenantId: 1,
      user: { role: 'DADOR_DE_CARGA', userId: 1, empresaId: 1 },
      body: { templateId: '1', entityType: 'CHOFER', entityId: '1', dadorCargaId: '1' },
      files: { documents: [{ mimetype: 'application/pdf', buffer: Buffer.from('%PDF'), originalname: 'doc.pdf' }] },
    };
    const res = makeRes();
    await expect(DocumentsController.uploadDocument(req as AuthRequest, res)).rejects.toMatchObject({ code: 'INITIAL_UPLOAD_REQUIRES_BATCH' });
  });

  it('requires confirmNewVersion when previous doc not vencido', async () => {
    prismaMock.documentTemplate.findUnique.mockResolvedValueOnce({ id: 1, name: 'DNI', active: true } as any);
    prismaMock.document.findFirst.mockResolvedValueOnce({ id: 10, status: 'APROBADO' } as any);

    const req: any = {
      tenantId: 1,
      user: { role: 'ADMIN_INTERNO', userId: 1, empresaId: 1 },
      body: { templateId: '1', entityType: 'CHOFER', entityId: '1', dadorCargaId: '1' },
      files: { documents: [{ mimetype: 'application/pdf', buffer: Buffer.from('%PDF'), originalname: 'doc.pdf' }] },
    };
    const res = makeRes();
    await expect(DocumentsController.uploadDocument(req as AuthRequest, res)).rejects.toMatchObject({ code: 'CONFIRM_NEW_VERSION_REQUIRED' });
  });

  it('rejects when template missing/inactive', async () => {
    prismaMock.documentTemplate.findUnique.mockResolvedValueOnce(null);
    const req: any = {
      tenantId: 1,
      user: { role: 'SUPERADMIN', userId: 1, empresaId: 1 },
      body: { templateId: '1', entityType: 'CHOFER', entityId: '1', dadorCargaId: '1' },
      files: { documents: [{ mimetype: 'application/pdf', buffer: Buffer.from('%PDF'), originalname: 'doc.pdf' }] },
    };
    const res = makeRes();
    await expect(DocumentsController.uploadDocument(req as AuthRequest, res)).rejects.toMatchObject({ code: 'TEMPLATE_NOT_FOUND' });
  });

  it('rejects invalid base64 inputs', async () => {
    prismaMock.documentTemplate.findUnique.mockResolvedValueOnce({ id: 1, name: 'DNI', active: true } as any);
    prismaMock.document.findFirst.mockResolvedValueOnce({ id: 10, status: 'VENCIDO' } as any);
    mediaMock.decodeDataUrl.mockImplementation(() => {
      throw new Error('bad');
    });

    const req: any = {
      tenantId: 1,
      user: { role: 'ADMIN_INTERNO', userId: 1, empresaId: 1 },
      body: { templateId: '1', entityType: 'CHOFER', entityId: '1', dadorCargaId: '1', documentsBase64: 'data:image/png;base64,xxx' },
      files: {},
    };
    const res = makeRes();
    await expect(DocumentsController.uploadDocument(req as AuthRequest, res)).rejects.toMatchObject({ code: 'INVALID_BASE64' });
  });

  it('rejects mixed PDF + image inputs', async () => {
    prismaMock.documentTemplate.findUnique.mockResolvedValueOnce({ id: 1, name: 'DNI', active: true } as any);
    prismaMock.document.findFirst.mockResolvedValueOnce({ id: 10, status: 'VENCIDO' } as any);

    const req: any = {
      tenantId: 1,
      user: { role: 'ADMIN_INTERNO', userId: 1, empresaId: 1 },
      body: { templateId: '1', entityType: 'CHOFER', entityId: '1', dadorCargaId: '1' },
      files: {
        documents: [
          { mimetype: 'application/pdf', buffer: Buffer.from('%PDF'), originalname: 'doc.pdf' },
          { mimetype: 'image/png', buffer: Buffer.from('img'), originalname: 'img.png' },
        ],
      },
    };
    const res = makeRes();
    await expect(DocumentsController.uploadDocument(req as AuthRequest, res)).rejects.toMatchObject({ code: 'MIXED_INPUT_UNSUPPORTED' });
  });

  it('rejects unsupported media types when only non-image base64 is provided', async () => {
    prismaMock.documentTemplate.findUnique.mockResolvedValueOnce({ id: 1, name: 'DNI', active: true } as any);
    prismaMock.document.findFirst.mockResolvedValueOnce({ id: 10, status: 'VENCIDO' } as any);
    mediaMock.decodeDataUrl.mockReturnValueOnce({ buffer: Buffer.from('x'), mimeType: 'text/plain', fileName: 'x.txt' });
    mediaMock.isImage.mockReturnValueOnce(false);

    const req: any = {
      tenantId: 1,
      user: { role: 'ADMIN_INTERNO', userId: 1, empresaId: 1 },
      body: { templateId: '1', entityType: 'CHOFER', entityId: '1', dadorCargaId: '1', documentsBase64: 'data:text/plain;base64,eA==' },
      files: {},
    };
    const res = makeRes();
    await expect(DocumentsController.uploadDocument(req as AuthRequest, res)).rejects.toMatchObject({ code: 'UNSUPPORTED_MEDIA_TYPE' });
  });

  it('uses planilla vencimientos and swallows expiration parsing errors (warn)', async () => {
    prismaMock.documentTemplate.findUnique.mockResolvedValueOnce({ id: 10, name: 'DNI', active: true } as any);
    prismaMock.document.findFirst.mockResolvedValueOnce({ id: 5, status: 'VENCIDO' } as any);

    prismaMock.document.create.mockResolvedValueOnce({
      id: 100,
      templateId: 10,
      entityType: 'CHOFER',
      entityId: 99,
      dadorCargaId: 2,
      status: 'PENDIENTE',
      uploadedAt: new Date(),
      fileName: 'DNI_CHOFER_99.pdf',
      fileSize: 4,
      mimeType: 'application/pdf',
      filePath: 'bucket/path/new.pdf',
      template: { name: 'DNI', entityType: 'CHOFER' },
    } as any);

    const body: any = {
      templateId: '10',
      entityType: 'CHOFER',
      entityId: '99',
      dadorCargaId: '2',
      confirmNewVersion: true,
      planilla: { vencimientos: { '10': '2027-01-01' } },
    };

    const req: any = {
      tenantId: 1,
      method: 'POST',
      originalUrl: '/api/docs/documents/upload',
      user: { userId: 1, role: 'ADMIN_INTERNO', empresaId: 2, email: 'u@x' },
      body,
      files: { documents: [{ mimetype: 'application/pdf', buffer: Buffer.from('%PDF'), originalname: 'doc.pdf' }] },
    };
    const res = makeRes();
    await DocumentsController.uploadDocument(req as AuthRequest, res);
    expect(prismaMock.document.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ expiresAt: expect.any(Date) }) }));

    // now: force throw during expiration extraction to cover warn + null
    resetPrismaMock();
    prismaMock.documentTemplate.findUnique.mockResolvedValueOnce({ id: 10, name: 'DNI', active: true } as any);
    prismaMock.document.findFirst.mockResolvedValueOnce({ id: 5, status: 'VENCIDO' } as any);
    prismaMock.document.create.mockResolvedValueOnce({ id: 101, template: { name: 'DNI', entityType: 'CHOFER' } } as any);

    const body2: any = {
      templateId: '10',
      entityType: 'CHOFER',
      entityId: '99',
      dadorCargaId: '2',
      confirmNewVersion: true,
      documentsBase64: 'data:image/png;base64,eA==',
    };
    Object.defineProperty(body2, 'planilla', {
      get() {
        throw new Error('boom');
      },
    });
    mediaMock.decodeDataUrl.mockReturnValueOnce({ buffer: Buffer.from('img'), mimeType: 'image/png', fileName: 'x.png' });
    mediaMock.composePdfFromImages.mockResolvedValueOnce(Buffer.from('%PDF'));

    const req2: any = {
      tenantId: 1,
      method: 'POST',
      originalUrl: '/api/docs/documents/upload',
      user: { userId: 1, role: 'ADMIN_INTERNO', empresaId: 2, email: 'u@x' },
      body: body2,
      files: {},
    };
    const res2 = makeRes();
    await DocumentsController.uploadDocument(req2 as AuthRequest, res2);
    expect(AppLogger.warn).toHaveBeenCalledWith(expect.stringContaining('No se pudo parsear la fecha de vencimiento'));
    expect(prismaMock.document.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.not.objectContaining({ expiresAt: expect.anything() }) }));
  });

  it('does not set expiresAt when date is invalid and swallows deprecatePreviousDocument errors', async () => {
    prismaMock.documentTemplate.findUnique.mockResolvedValueOnce({ id: 10, name: 'DNI', active: true } as any);
    prismaMock.document.findFirst.mockResolvedValueOnce({ id: 5, status: 'APROBADO' } as any); // last, not vencido
    prismaMock.document.update.mockRejectedValueOnce(new Error('ignore deprecate')); // triggers warn catch in helper

    prismaMock.document.create.mockResolvedValueOnce({
      id: 120,
      templateId: 10,
      entityType: 'CHOFER',
      entityId: 99,
      dadorCargaId: 2,
      status: 'PENDIENTE',
      uploadedAt: new Date(),
      fileName: 'DNI_CHOFER_99.pdf',
      fileSize: 4,
      mimeType: 'application/pdf',
      filePath: 'bucket/path/new.pdf',
      template: { name: 'DNI', entityType: 'CHOFER' },
    } as any);

    const req: any = {
      tenantId: 1,
      method: 'POST',
      originalUrl: '/api/docs/documents/upload',
      user: { userId: 1, role: 'ADMIN_INTERNO', empresaId: 2, email: 'u@x' },
      body: {
        templateId: '10',
        entityType: 'CHOFER',
        entityId: '99',
        dadorCargaId: '2',
        confirmNewVersion: true,
        expiresAt: 'invalid-date',
      },
      files: { documents: [{ mimetype: 'application/pdf', buffer: Buffer.from('%PDF'), originalname: 'doc.pdf' }] },
    };
    const res = makeRes();
    await DocumentsController.uploadDocument(req as AuthRequest, res);

    // invalid expiresAt => no expiresAt set in create payload
    expect(prismaMock.document.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.not.objectContaining({ expiresAt: expect.anything() }) }));
    // deprecatePreviousDocument failure is swallowed
    expect(AppLogger.warn).toHaveBeenCalledWith(expect.stringContaining('No se pudo marcar versión anterior como DEPRECADO'));
    expect(res.status).toHaveBeenCalledWith(201);
  });
});


