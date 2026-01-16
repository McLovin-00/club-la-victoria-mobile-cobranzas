/**
 * Propósito: Smoke tests de `DocumentsController` para subir coverage sin IO real.
 * Cubre upload (happy path) y listados con mocks de servicios externos.
 */

import type { Response } from 'express';
import { prismaMock } from '../mocks/prisma.mock';

const dbMock = { getClient: () => prismaMock };

jest.mock('../../src/config/database', () => ({
  db: dbMock,
  prisma: prismaMock,
}));

jest.mock('../../src/config/logger', () => ({
  AppLogger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

jest.mock('../../src/services/minio.service', () => ({
  minioService: { uploadDocument: jest.fn().mockResolvedValue({ bucketName: 'docs-t1', objectPath: 'x/y.pdf' }) },
}));

jest.mock('../../src/services/document.service', () => ({
  DocumentService: { processDocument: jest.fn().mockResolvedValue(undefined) },
}));

jest.mock('../../src/services/websocket.service', () => ({
  webSocketService: { notifyNewDocument: jest.fn() },
}));

jest.mock('../../src/services/queue.service', () => ({
  queueService: { addMissingCheckForEquipo: jest.fn() },
}));

jest.mock('../../src/services/media.service', () => ({
  MediaService: {
    isImage: jest.fn((mime: string) => /^image\//i.test(mime)),
    isPdf: jest.fn((mime: string) => /^application\/pdf$/i.test(mime)),
    decodeDataUrl: jest.fn(() => ({ buffer: Buffer.from('x'), mimeType: 'image/png', fileName: 'x.png' })),
    composePdfFromImages: jest.fn(async () => Buffer.from('%PDF-1.4')),
  },
}));

jest.mock('../../src/services/audit.service', () => ({
  AuditService: { log: jest.fn().mockResolvedValue(undefined) },
}));

jest.mock('../../src/config/environment', () => ({
  getEnvironment: jest.fn(() => ({})),
}));

import { DocumentsController } from '../../src/controllers/documents.controller';

function createRes() {
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
  return res as unknown as Response;
}

describe('DocumentsController (smoke)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('uploadDocument retorna 201 en happy path (base64)', async () => {
    prismaMock.documentTemplate.findUnique.mockResolvedValue({ id: 1, name: 'DNI', active: true });
    prismaMock.document.findFirst.mockResolvedValue(null);
    prismaMock.document.create.mockResolvedValue({
      id: 123,
      templateId: 1,
      entityType: 'CHOFER',
      entityId: 10,
      dadorCargaId: 1,
      status: 'PENDIENTE',
      uploadedAt: new Date(),
      fileName: 'DNI_CHOFER_10.pdf',
      fileSize: 10,
      mimeType: 'application/pdf',
      filePath: 'docs-t1/x/y.pdf',
      template: { name: 'DNI', entityType: 'CHOFER' },
    });

    const req: any = {
      tenantId: 1,
      method: 'POST',
      originalUrl: '/api/docs/documents/upload',
      path: '/api/docs/documents/upload',
      user: { role: 'SUPERADMIN', userId: 1, email: 'a@b.com', empresaId: 1 },
      body: {
        templateId: '1',
        entityType: 'CHOFER',
        entityId: '10',
        dadorCargaId: '1',
        documentsBase64: 'data:image/png;base64,AA==',
      },
      files: {},
    };
    const res = createRes();

    await DocumentsController.uploadDocument(req, res);

    expect(res.status).toHaveBeenCalledWith(201);
    expect((res.json as jest.Mock).mock.calls[0][0]).toEqual(expect.objectContaining({ id: 123 }));
  });

  it('getDocumentsByEmpresa retorna documentos cuando es SUPERADMIN', async () => {
    prismaMock.document.findMany.mockResolvedValue([{ id: 1 }]);
    const req: any = {
      tenantId: 1,
      user: { role: 'SUPERADMIN', empresaId: 999 },
      params: { dadorId: '1' },
      query: { page: '1', limit: '10' },
    };
    const res = createRes();

    await DocumentsController.getDocumentsByEmpresa(req, res);

    expect(res.json).toHaveBeenCalledWith([{ id: 1 }]);
  });
});


