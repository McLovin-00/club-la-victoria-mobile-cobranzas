import type { Response } from 'express';

import { prismaMock, resetPrismaMock } from '../mocks/prisma.mock';

describe('DocumentsController uploadDocument (virus scan branches)', () => {
  const makeRes = (): Response & { status: jest.Mock; json: jest.Mock } => {
    const json = jest.fn();
    const status = jest.fn().mockReturnValue({ json });
    return { json, status } as any;
  };

  beforeEach(() => {
    resetPrismaMock();
    jest.clearAllMocks();
  });

  it('rethrows FILE_INFECTED when ClamAV marks a buffer as infected', async () => {
    await jest.isolateModulesAsync(async () => {
      jest.doMock('../../src/middlewares/error.middleware', () => ({
        createError: (message: string, statusCode = 500, code = 'ERR') => {
          const err: any = new Error(message);
          err.statusCode = statusCode;
          err.code = code;
          return err;
        },
      }));

      jest.doMock('../../src/config/logger', () => ({
        AppLogger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
      }));

      jest.doMock('../../src/config/database', () => ({
        db: { getClient: () => prismaMock },
      }));

      jest.doMock('../../src/services/minio.service', () => ({
        minioService: { uploadDocument: jest.fn(async () => ({ bucketName: 'b', objectPath: 'p/new.pdf' })) },
      }));

      jest.doMock('../../src/services/websocket.service', () => ({ webSocketService: { notifyNewDocument: jest.fn() } }));
      jest.doMock('../../src/services/document.service', () => ({ DocumentService: { processDocument: jest.fn(async () => undefined) } }));
      jest.doMock('../../src/services/audit.service', () => ({ AuditService: { log: jest.fn(async () => undefined) } }));
      jest.doMock('../../src/services/performance.service', () => ({
        performanceService: { refreshMaterializedView: jest.fn(async () => undefined) },
      }));

      // Enable antivirus
      jest.doMock('../../src/config/environment', () => ({
        getEnvironment: () => ({ CLAMAV_HOST: 'localhost', CLAMAV_PORT: '3310' }),
      }));

      // ClamAV mock returns infected
      const scanBuffer = jest.fn(async () => ({ isInfected: true }));
      const init = jest.fn(async () => ({ scanBuffer }));
      const NodeClam = jest.fn(() => ({ init }));
      jest.doMock('clamscan', () => ({ __esModule: true, default: NodeClam }), { virtual: true });

      const { DocumentsController } = await import('../../src/controllers/documents.controller');

      prismaMock.documentTemplate.findUnique.mockResolvedValueOnce({ id: 1, name: 'DNI', active: true } as any);
      prismaMock.document.findFirst.mockResolvedValueOnce({ id: 10, status: 'VENCIDO' } as any);

      const req: any = {
        tenantId: 1,
        method: 'POST',
        originalUrl: '/api/docs/documents/upload',
        user: { userId: 1, role: 'ADMIN_INTERNO', empresaId: 1, email: 'u@x' },
        body: { templateId: '1', entityType: 'CHOFER', entityId: '1', dadorCargaId: '1', confirmNewVersion: true },
        files: { documents: [{ mimetype: 'application/pdf', buffer: Buffer.from('%PDF'), originalname: 'doc.pdf' }] },
      };
      const res = makeRes();
      await expect(DocumentsController.uploadDocument(req, res)).rejects.toMatchObject({ code: 'FILE_INFECTED' });
    });
  });

  it('continues when antivirus module fails (warn) and upload succeeds', async () => {
    await jest.isolateModulesAsync(async () => {
      jest.doMock('../../src/middlewares/error.middleware', () => ({
        createError: (message: string, statusCode = 500, code = 'ERR') => {
          const err: any = new Error(message);
          err.statusCode = statusCode;
          err.code = code;
          return err;
        },
      }));

      const warn = jest.fn();
      jest.doMock('../../src/config/logger', () => ({
        AppLogger: { info: jest.fn(), warn, error: jest.fn(), debug: jest.fn() },
      }));

      jest.doMock('../../src/config/database', () => ({
        db: { getClient: () => prismaMock },
      }));

      const uploadDocument = jest.fn(async () => ({ bucketName: 'b', objectPath: 'p/new.pdf' }));
      jest.doMock('../../src/services/minio.service', () => ({
        minioService: { uploadDocument },
      }));

      jest.doMock('../../src/services/websocket.service', () => ({ webSocketService: { notifyNewDocument: jest.fn() } }));
      jest.doMock('../../src/services/document.service', () => ({ DocumentService: { processDocument: jest.fn(async () => undefined) } }));
      jest.doMock('../../src/services/audit.service', () => ({ AuditService: { log: jest.fn(async () => undefined) } }));
      jest.doMock('../../src/services/performance.service', () => ({
        performanceService: { refreshMaterializedView: jest.fn(async () => undefined) },
      }));

      // Enable antivirus but make module throw
      jest.doMock('../../src/config/environment', () => ({
        getEnvironment: () => ({ CLAMAV_HOST: 'localhost', CLAMAV_PORT: '3310' }),
      }));

      jest.doMock('clamscan', () => {
        throw new Error('not installed');
      });

      const { DocumentsController } = await import('../../src/controllers/documents.controller');

      prismaMock.documentTemplate.findUnique.mockResolvedValueOnce({ id: 1, name: 'DNI', active: true } as any);
      prismaMock.document.findFirst.mockResolvedValueOnce({ id: 10, status: 'VENCIDO' } as any);
      prismaMock.document.create.mockResolvedValueOnce({
        id: 100,
        templateId: 1,
        entityType: 'CHOFER',
        entityId: 1,
        dadorCargaId: 1,
        status: 'PENDIENTE',
        uploadedAt: new Date(),
        fileName: 'DNI_CHOFER_1.pdf',
        fileSize: 4,
        mimeType: 'application/pdf',
        filePath: 'b/p/new.pdf',
        template: { name: 'DNI', entityType: 'CHOFER' },
      } as any);

      const req: any = {
        tenantId: 1,
        method: 'POST',
        originalUrl: '/api/docs/documents/upload',
        user: { userId: 1, role: 'ADMIN_INTERNO', empresaId: 1, email: 'u@x' },
        body: { templateId: '1', entityType: 'CHOFER', entityId: '1', dadorCargaId: '1', confirmNewVersion: true, expiresAt: '01/01/2027' },
        files: { documents: [{ mimetype: 'application/pdf', buffer: Buffer.from('%PDF'), originalname: 'doc.pdf' }] },
      };
      const res = makeRes();
      await DocumentsController.uploadDocument(req, res);
      expect(uploadDocument).toHaveBeenCalled();
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('Antivirus no disponible'));
      expect(res.status).toHaveBeenCalledWith(201);
    });
  });
});


