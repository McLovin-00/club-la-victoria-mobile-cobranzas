import { Response } from 'express';
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

const queueMock = {};
jest.mock('../../src/services/queue.service', () => ({ queueService: queueMock }));

const wsMock = { notifyNewDocument: jest.fn() };
jest.mock('../../src/services/websocket.service', () => ({ webSocketService: wsMock }));

const docSvcMock = { processDocument: jest.fn(async () => undefined) };
jest.mock('../../src/services/document.service', () => ({ DocumentService: docSvcMock }));

const auditMock = { log: jest.fn(async () => undefined) };
jest.mock('../../src/services/audit.service', () => ({ AuditService: auditMock }));

jest.mock('../../src/services/performance.service', () => ({
  performanceService: { refreshMaterializedView: jest.fn(async () => undefined) },
}));

import { DocumentsController } from '../../src/controllers/documents.controller';
import { AuthRequest } from '../../src/middlewares/auth.middleware';

function makeRes() {
  const json = jest.fn();
  const status = jest.fn().mockReturnValue({ json });
  return { json, status } as unknown as Response & { json: jest.Mock; status: jest.Mock };
}

describe('DocumentsController uploadDocument (success path)', () => {
  beforeEach(() => {
    resetPrismaMock();
    jest.clearAllMocks();
  });

  it('should upload PDF, create document, deprecate previous, notify, and start processing', async () => {
    const req: any = {
      tenantId: 1,
      method: 'POST',
      originalUrl: '/api/docs/documents/upload',
      user: { userId: 1, role: 'DADOR_DE_CARGA', empresaId: 2, email: 'u@x' },
      body: {
        templateId: '10',
        entityType: 'CHOFER',
        entityId: '99',
        dadorCargaId: '2',
        confirmNewVersion: 'true',
        expiresAt: '01/01/27',
      },
      files: {
        documents: [
          { mimetype: 'application/pdf', buffer: Buffer.from('%PDF'), originalname: 'doc.pdf' },
        ],
      },
    };
    const res = makeRes();

    prismaMock.documentTemplate.findUnique.mockResolvedValueOnce({ id: 10, name: 'DNI', active: true } as any);
    prismaMock.document.findFirst.mockResolvedValueOnce({ id: 5, status: 'APROBADO' } as any); // last

    prismaMock.document.update.mockResolvedValueOnce({} as any); // deprecatePreviousDocument

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

    await DocumentsController.uploadDocument(req as AuthRequest, res);

    expect(minioMock.uploadDocument).toHaveBeenCalled();
    expect(prismaMock.document.create).toHaveBeenCalled();
    expect(prismaMock.document.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: 'DEPRECADO' }) }));
    expect(wsMock.notifyNewDocument).toHaveBeenCalled();
    expect(docSvcMock.processDocument).toHaveBeenCalledWith(100);
    expect(auditMock.log).toHaveBeenCalledWith(expect.objectContaining({ action: 'DOCUMENT_UPLOAD' }));
    expect(res.status).toHaveBeenCalledWith(201);
  });
});


