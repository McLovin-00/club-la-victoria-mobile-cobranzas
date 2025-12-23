/**
 * Tests para DocumentService - Ejecuta código real
 * @jest-environment node
 */

// Mocks antes de imports
const mockDocument = {
  findUnique: jest.fn(),
  findMany: jest.fn(),
  update: jest.fn(),
  updateMany: jest.fn(),
  create: jest.fn(),
  delete: jest.fn(),
  groupBy: jest.fn(),
};

jest.mock('../../src/config/database', () => ({
  db: {
    getClient: () => ({ document: mockDocument }),
  },
}));

jest.mock('../../src/services/minio.service', () => ({
  minioService: {
    deleteDocument: jest.fn().mockResolvedValue(true),
  },
}));

jest.mock('../../src/services/queue.service', () => ({
  queueService: {
    addDocumentValidation: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock('../../src/config/logger', () => ({
  AppLogger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

// Import después de mocks
import { DocumentService } from '../../src/services/document.service';
import { minioService } from '../../src/services/minio.service';
import { queueService } from '../../src/services/queue.service';

describe('DocumentService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('processDocument', () => {
    it('should add document to validation queue', async () => {
      mockDocument.findUnique.mockResolvedValue({
        id: 1,
        filePath: '/path/to/file.pdf',
        entityType: 'CHOFER',
        template: { name: 'Licencia' },
      });

      await DocumentService.processDocument(1);

      expect(mockDocument.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
        select: expect.any(Object),
      });
      expect(queueService.addDocumentValidation).toHaveBeenCalledWith({
        documentId: 1,
        filePath: '/path/to/file.pdf',
        templateName: 'Licencia',
        entityType: 'CHOFER',
      });
    });

    it('should mark as rejected if document not found', async () => {
      mockDocument.findUnique.mockResolvedValue(null);
      mockDocument.update.mockResolvedValue({});

      await DocumentService.processDocument(999);

      expect(mockDocument.update).toHaveBeenCalledWith({
        where: { id: 999 },
        data: expect.objectContaining({ status: 'RECHAZADO' }),
      });
    });
  });

  describe('markDocumentAsApproved', () => {
    it('should update document status to APROBADO', async () => {
      mockDocument.update.mockResolvedValue({ id: 1, status: 'APROBADO' });

      await DocumentService.markDocumentAsApproved(1);

      expect(mockDocument.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: expect.objectContaining({
          status: 'APROBADO',
          validatedAt: expect.any(Date),
        }),
      });
    });

    it('should handle errors gracefully', async () => {
      mockDocument.update.mockRejectedValue(new Error('DB error'));

      await expect(DocumentService.markDocumentAsApproved(1)).resolves.not.toThrow();
    });
  });

  describe('markDocumentAsRejected', () => {
    it('should update document status to RECHAZADO', async () => {
      mockDocument.update.mockResolvedValue({ id: 1, status: 'RECHAZADO' });

      await DocumentService.markDocumentAsRejected(1);

      expect(mockDocument.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: expect.objectContaining({
          status: 'RECHAZADO',
          validatedAt: expect.any(Date),
        }),
      });
    });
  });

  describe('checkExpiredDocuments', () => {
    it('should mark expired documents as VENCIDO', async () => {
      mockDocument.updateMany.mockResolvedValue({ count: 5 });

      const result = await DocumentService.checkExpiredDocuments();

      expect(result).toBe(5);
      expect(mockDocument.updateMany).toHaveBeenCalledWith({
        where: {
          expiresAt: { lte: expect.any(Date) },
          status: { not: 'VENCIDO' },
        },
        data: { status: 'VENCIDO' },
      });
    });

    it('should return 0 if no documents expired', async () => {
      mockDocument.updateMany.mockResolvedValue({ count: 0 });

      const result = await DocumentService.checkExpiredDocuments();

      expect(result).toBe(0);
    });

    it('should return 0 on error', async () => {
      mockDocument.updateMany.mockRejectedValue(new Error('DB error'));

      const result = await DocumentService.checkExpiredDocuments();

      expect(result).toBe(0);
    });
  });

  describe('getDocumentStats', () => {
    it('should aggregate document stats by status', async () => {
      mockDocument.groupBy.mockResolvedValue([
        { status: 'PENDIENTE', _count: { status: 10 } },
        { status: 'APROBADO', _count: { status: 20 } },
        { status: 'RECHAZADO', _count: { status: 5 } },
        { status: 'VENCIDO', _count: { status: 3 } },
      ]);

      const result = await DocumentService.getDocumentStats(100, 50);

      expect(result).toEqual({
        total: 38,
        pendiente: 10,
        validando: 0,
        aprobado: 20,
        rechazado: 5,
        vencido: 3,
      });
    });

    it('should return zeros on error', async () => {
      mockDocument.groupBy.mockRejectedValue(new Error('DB error'));

      const result = await DocumentService.getDocumentStats(100, 50);

      expect(result.total).toBe(0);
      expect(result.pendiente).toBe(0);
    });
  });

  describe('deleteDocument', () => {
    it('should delete document from MinIO and DB', async () => {
      mockDocument.findUnique.mockResolvedValue({
        id: 1,
        fileName: 'test.pdf',
        filePath: 'bucket/path/to/file.pdf',
      });
      mockDocument.delete.mockResolvedValue({ id: 1 });

      const result = await DocumentService.deleteDocument(1);

      expect(result).toBe(true);
      expect(minioService.deleteDocument).toHaveBeenCalledWith('bucket', 'path/to/file.pdf');
      expect(mockDocument.delete).toHaveBeenCalledWith({ where: { id: 1 } });
    });

    it('should return false if document not found', async () => {
      mockDocument.findUnique.mockResolvedValue(null);

      const result = await DocumentService.deleteDocument(999);

      expect(result).toBe(false);
    });

    it('should return false on error', async () => {
      mockDocument.findUnique.mockRejectedValue(new Error('DB error'));

      const result = await DocumentService.deleteDocument(1);

      expect(result).toBe(false);
    });
  });

  describe('renew', () => {
    it('should create new document version and deprecate old', async () => {
      const existingDoc = {
        id: 1,
        tenantEmpresaId: 100,
        dadorCargaId: 50,
        templateId: 5,
        entityType: 'CHOFER',
        entityId: 200,
        fileName: 'licencia.pdf',
        filePath: 'bucket/path/licencia.pdf',
        fileSize: 1024,
        mimeType: 'application/pdf',
      };

      mockDocument.findUnique.mockResolvedValue(existingDoc);
      mockDocument.create.mockResolvedValue({ id: 99, ...existingDoc, status: 'PENDIENTE_APROBACION' });
      mockDocument.update.mockResolvedValue({ id: 1, status: 'DEPRECADO' });

      const result = await DocumentService.renew(1, { expiresAt: new Date('2025-12-31') });

      // Result should have an id (either from mock or real implementation)
      expect(result).toHaveProperty('id');
      expect(mockDocument.create).toHaveBeenCalled();
      expect(mockDocument.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 1 },
          data: expect.objectContaining({ status: 'DEPRECADO' }),
        })
      );
    });

    it('should throw if document not found', async () => {
      mockDocument.findUnique.mockResolvedValue(null);

      await expect(DocumentService.renew(999)).rejects.toThrow('Documento no encontrado');
    });
  });

  describe('getHistory', () => {
    it('should return document version history', async () => {
      mockDocument.findUnique.mockResolvedValue({
        tenantEmpresaId: 100,
        entityType: 'CHOFER',
        entityId: 200,
        templateId: 5,
      });
      mockDocument.findMany.mockResolvedValue([
        { id: 2, status: 'PENDIENTE_APROBACION', uploadedAt: new Date() },
        { id: 1, status: 'DEPRECADO', uploadedAt: new Date() },
      ]);

      const result = await DocumentService.getHistory(1);

      expect(result).toHaveLength(2);
      expect(mockDocument.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            entityType: 'CHOFER',
            entityId: 200,
          }),
        })
      );
    });

    it('should throw if document not found', async () => {
      mockDocument.findUnique.mockResolvedValue(null);

      await expect(DocumentService.getHistory(999)).rejects.toThrow('Documento no encontrado');
    });
  });
});

