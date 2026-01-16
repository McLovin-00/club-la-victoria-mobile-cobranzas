import type { Response } from 'express';

import { prismaMock, resetPrismaMock } from '../mocks/prisma.mock';

const dbMock = { getClient: () => prismaMock };

jest.mock('../../src/config/database', () => ({
  db: dbMock,
  prisma: prismaMock,
}));

jest.mock('../../src/config/logger', () => ({
  AppLogger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

const fileStreamMock = {
  pipe: jest.fn(),
  on: jest.fn(),
};

jest.mock('../../src/services/minio.service', () => ({
  minioService: {
    ensureBucketExists: jest.fn(async () => undefined),
    getObject: jest.fn(async () => fileStreamMock),
  },
}));

jest.mock('../../src/services/document.service', () => ({
  DocumentService: {
    renew: jest.fn(async () => ({ id: 2 })),
    getHistory: jest.fn(async () => [{ id: 1 }]),
  },
}));

jest.mock('../../src/services/thumbnail.service', () => ({
  ThumbnailService: {
    getSignedUrl: jest.fn(async () => 'signed-url'),
  },
}));

import { minioService } from '../../src/services/minio.service';
import { DocumentService } from '../../src/services/document.service';
import { ThumbnailService } from '../../src/services/thumbnail.service';
import { DocumentsController } from '../../src/controllers/documents.controller';

function createRes(): Response & {
  status: jest.Mock;
  json: jest.Mock;
  setHeader: jest.Mock;
  end: jest.Mock;
  headersSent?: boolean;
} {
  const res: any = {
    status: jest.fn(),
    json: jest.fn().mockReturnThis(),
    setHeader: jest.fn().mockReturnThis(),
    end: jest.fn().mockReturnThis(),
    headersSent: false,
  };
  res.status.mockImplementation(() => res);
  return res;
}

describe('DocumentsController (more)', () => {
  beforeEach(() => {
    resetPrismaMock();
    jest.clearAllMocks();
    fileStreamMock.pipe.mockClear();
    fileStreamMock.on.mockClear();
  });

  describe('getDocumentStatus', () => {
    it('returns paginated documents + stats and forces empresaId for non-superadmin', async () => {
      prismaMock.document.findMany.mockResolvedValueOnce([{ id: 1 }]);
      // total + stats counts (5)
      prismaMock.document.count
        .mockResolvedValueOnce(10)
        .mockResolvedValueOnce(1)
        .mockResolvedValueOnce(2)
        .mockResolvedValueOnce(3)
        .mockResolvedValueOnce(4)
        .mockResolvedValueOnce(5);

      const req: any = {
        tenantId: 1,
        user: { role: 'ADMIN', empresaId: 99, userId: 1 },
        query: { empresaId: '123', page: '2', limit: '10', status: 'APROBADO' },
      };
      const res = createRes();

      await DocumentsController.getDocumentStatus(req, res);

      const payload = res.json.mock.calls[0][0] as any;
      expect(payload.success).toBe(true);
      expect(payload.pagination).toMatchObject({ page: 2, limit: 10, total: 10 });
      // forced company id by user
      expect(prismaMock.document.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ dadorCargaId: 99, tenantEmpresaId: 1 }) })
      );
      expect(payload.stats).toMatchObject({ pendiente: 1, validando: 2, aprobado: 3, rechazado: 4, vencido: 5 });
    });

    it('throws GET_DOCUMENT_STATUS_ERROR on unexpected error', async () => {
      prismaMock.document.findMany.mockRejectedValueOnce(new Error('boom'));
      const req: any = { tenantId: 1, user: { role: 'SUPERADMIN' }, query: { page: '1', limit: '10' } };
      const res = createRes();
      await expect(DocumentsController.getDocumentStatus(req, res)).rejects.toMatchObject({ code: 'GET_DOCUMENT_STATUS_ERROR' });
    });
  });

  describe('getDocumentPreview', () => {
    it('throws DOCUMENT_NOT_FOUND if missing', async () => {
      prismaMock.document.findUnique.mockResolvedValueOnce(null);
      const res = createRes();
      await expect(DocumentsController.getDocumentPreview({ params: { id: '1' } } as any, res)).rejects.toMatchObject({
        code: 'DOCUMENT_NOT_FOUND',
        statusCode: 404,
      });
    });

    it('throws DOCUMENT_ACCESS_DENIED for tenant mismatch', async () => {
      prismaMock.document.findUnique.mockResolvedValueOnce({ id: 1, tenantEmpresaId: 2, filePath: 'b/p', fileName: 'a.pdf', mimeType: 'application/pdf', template: { name: 'DNI' } } as any);
      const res = createRes();
      await expect(
        DocumentsController.getDocumentPreview({ user: { role: 'ADMIN', empresaId: 1 }, params: { id: '1' } } as any, res)
      ).rejects.toMatchObject({ code: 'DOCUMENT_ACCESS_DENIED', statusCode: 403 });
    });

    it('returns previewUrl and ensures bucket exists', async () => {
      prismaMock.document.findUnique.mockResolvedValueOnce({
        id: 1,
        tenantEmpresaId: 1,
        dadorCargaId: 9,
        filePath: 'docs-t1/path/to.pdf',
        fileName: 'a.pdf',
        mimeType: 'application/pdf',
        entityType: 'CHOFER',
        entityId: 1,
        template: { name: 'DNI' },
      } as any);
      const res = createRes();
      const req: any = {
        user: { role: 'ADMIN', empresaId: 1, userId: 7 },
        params: { id: '1' },
        get: jest.fn((h: string) => (h === 'X-Forwarded-Proto' ? 'https' : h === 'host' ? 'example.com' : undefined)),
        protocol: 'http',
      };
      await DocumentsController.getDocumentPreview(req, res);
      expect(minioService.ensureBucketExists).toHaveBeenCalledWith(1);
      const payload = res.json.mock.calls[0][0] as any;
      expect(payload.data.previewUrl).toContain('https://example.com');
    });
  });

  describe('downloadDocument', () => {
    it('throws DOCUMENT_NOT_FOUND if missing', async () => {
      prismaMock.document.findUnique.mockResolvedValueOnce(null);
      const res = createRes();
      await expect(DocumentsController.downloadDocument({ params: { id: '1' } } as any, res)).rejects.toMatchObject({
        code: 'DOCUMENT_NOT_FOUND',
      });
    });

    it('throws DOCUMENT_ACCESS_DENIED for tenant mismatch', async () => {
      prismaMock.document.findUnique.mockResolvedValueOnce({ id: 1, tenantEmpresaId: 2, filePath: 'b/p', fileName: 'a.pdf', mimeType: 'application/pdf', template: { name: 'DNI' } } as any);
      const res = createRes();
      await expect(
        DocumentsController.downloadDocument({ user: { role: 'ADMIN', empresaId: 1 }, params: { id: '1' }, query: {} } as any, res)
      ).rejects.toMatchObject({ code: 'DOCUMENT_ACCESS_DENIED' });
    });

    it('sets headers inline and pipes stream', async () => {
      prismaMock.document.findUnique.mockResolvedValueOnce({
        id: 1,
        tenantEmpresaId: 1,
        dadorCargaId: 9,
        filePath: 'docs-t1/path/to.pdf',
        fileName: 'a.pdf',
        mimeType: 'application/pdf',
        template: { name: 'DNI' },
      } as any);
      const res = createRes();
      const req: any = {
        user: { role: 'ADMIN', empresaId: 1, userId: 7 },
        params: { id: '1' },
        query: { inline: '1' },
      };
      await DocumentsController.downloadDocument(req, res);
      expect(minioService.getObject).toHaveBeenCalledWith('docs-t1', 'path/to.pdf');
      expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'application/pdf');
      expect(fileStreamMock.pipe).toHaveBeenCalledWith(res);
    });
  });

  describe('getDocumentThumbnail', () => {
    it('returns 404 if doc missing and returns signed url when ok', async () => {
      prismaMock.document.findUnique.mockResolvedValueOnce(null);
      const res = createRes();
      await expect(DocumentsController.getDocumentThumbnail({ params: { id: '1' } } as any, res)).rejects.toMatchObject({
        code: 'DOCUMENT_NOT_FOUND',
      });

      prismaMock.document.findUnique.mockResolvedValueOnce({ id: 1, tenantEmpresaId: 1, dadorCargaId: 9, mimeType: 'application/pdf' } as any);
      const res2 = createRes();
      await DocumentsController.getDocumentThumbnail({ user: { role: 'ADMIN', empresaId: 1 }, params: { id: '1' } } as any, res2);
      expect(ThumbnailService.getSignedUrl).toHaveBeenCalledWith(1);
      expect(res2.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    it('throws DOCUMENT_ACCESS_DENIED when tenant mismatch', async () => {
      prismaMock.document.findUnique.mockResolvedValueOnce({ id: 1, tenantEmpresaId: 2, dadorCargaId: 9, mimeType: 'application/pdf' } as any);
      const res = createRes();
      await expect(
        DocumentsController.getDocumentThumbnail({ user: { role: 'ADMIN', empresaId: 1 }, params: { id: '1' } } as any, res)
      ).rejects.toMatchObject({ code: 'DOCUMENT_ACCESS_DENIED' });
    });
  });

  describe('renewDocument / getDocumentHistory', () => {
    it('renewDocument returns 201 and history returns rows', async () => {
      const res = createRes();
      await DocumentsController.renewDocument({ params: { id: '1' }, body: { expiresAt: '2026-01-01T00:00:00.000Z' }, user: { userId: 7 } } as any, res);
      expect(res.status).toHaveBeenCalledWith(201);
      expect(DocumentService.renew).toHaveBeenCalled();

      const res2 = createRes();
      await DocumentsController.getDocumentHistory({ params: { id: '1' } } as any, res2);
      expect(res2.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, data: [{ id: 1 }] }));
    });

    it('renewDocument throws DOCUMENT_RENEW_ERROR on failure', async () => {
      (DocumentService.renew as jest.Mock).mockRejectedValueOnce(new Error('boom'));
      const res = createRes();
      await expect(DocumentsController.renewDocument({ params: { id: '1' }, body: {}, user: { userId: 7 } } as any, res)).rejects.toMatchObject({
        code: 'DOCUMENT_RENEW_ERROR',
      });
    });
  });
});


