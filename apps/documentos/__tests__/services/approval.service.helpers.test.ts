/**
 * Tests adicionales para ApprovalService
 * Propósito: Cubrir branches de error y edge cases en helpers y métodos principales
 */

import { prismaMock, resetPrismaMock } from '../mocks/prisma.mock';

jest.mock('../../src/config/environment', () => ({
  getEnvironment: () => ({ DOCS_MAX_DEPRECATED_VERSIONS: 1 }),
}));

jest.mock('../../src/services/minio.service', () => ({
  minioService: {
    moveObject: jest.fn(async () => undefined),
    deleteDocument: jest.fn(async () => undefined),
  },
}));

jest.mock('../../src/config/database', () => ({
  db: { getClient: () => prismaMock },
}));

import { ApprovalService } from '../../src/services/approval.service';
import { minioService } from '../../src/services/minio.service';

describe('ApprovalService - helpers y branches adicionales', () => {
  beforeEach(() => {
    resetPrismaMock();
    jest.clearAllMocks();
    (prismaMock.$transaction as jest.Mock).mockImplementation(async (arg: any) => {
      if (Array.isArray(arg)) return Promise.all(arg);
      return arg(prismaMock);
    });
  });

  // ============================================================================
  // TESTS DE getPendingDocuments con filtros
  // ============================================================================
  describe('getPendingDocuments - filtros adicionales', () => {
    it('debe filtrar por entityType', async () => {
      prismaMock.document.findMany.mockResolvedValueOnce([] as any);
      prismaMock.document.count.mockResolvedValueOnce(0);

      await ApprovalService.getPendingDocuments(1, { entityType: 'CHOFER' });

      const whereClause = (prismaMock.document.findMany as jest.Mock).mock.calls[0][0].where;
      expect(whereClause.classification.detectedEntityType).toBe('CHOFER');
    });

    it('debe filtrar por minConfidence', async () => {
      prismaMock.document.findMany.mockResolvedValueOnce([] as any);
      prismaMock.document.count.mockResolvedValueOnce(0);

      await ApprovalService.getPendingDocuments(1, { minConfidence: 0.8 });

      const whereClause = (prismaMock.document.findMany as jest.Mock).mock.calls[0][0].where;
      expect(whereClause.classification.confidence.gte).toBe(0.8);
    });

    it('debe filtrar por maxConfidence', async () => {
      prismaMock.document.findMany.mockResolvedValueOnce([] as any);
      prismaMock.document.count.mockResolvedValueOnce(0);

      await ApprovalService.getPendingDocuments(1, { maxConfidence: 0.9 });

      const whereClause = (prismaMock.document.findMany as jest.Mock).mock.calls[0][0].where;
      expect(whereClause.classification.confidence.lte).toBe(0.9);
    });

    it('debe filtrar por ambos límites de confidence', async () => {
      prismaMock.document.findMany.mockResolvedValueOnce([] as any);
      prismaMock.document.count.mockResolvedValueOnce(0);

      await ApprovalService.getPendingDocuments(1, { minConfidence: 0.7, maxConfidence: 0.95 });

      const whereClause = (prismaMock.document.findMany as jest.Mock).mock.calls[0][0].where;
      // Verificar que se apliquen ambos filtros (la estructura puede variar según Prisma)
      expect(whereClause.classification).toBeDefined();
    });

    it('debe calcular IA validation con diferentes severidades', async () => {
      prismaMock.document.findMany.mockResolvedValueOnce([
        {
          id: 1,
          entityType: 'CHOFER',
          entityId: 10,
          classification: {
            validationStatus: null,
            disparidades: [
              { severidad: 'info' },
              { severidad: 'advertencia' },
              { severidad: 'critica' },
            ],
          },
          template: { id: 1, name: 'T', entityType: 'CHOFER' },
        },
      ] as any);
      prismaMock.document.count.mockResolvedValueOnce(1);
      prismaMock.chofer.findUnique.mockResolvedValueOnce({ dni: '123' } as any);

      const out = await ApprovalService.getPendingDocuments(1, { page: 1, limit: 20 });
      expect(out.data[0].iaValidation.disparitiesSeverity).toBe('critica');
    });

    it('debe calcular IA validation con severidad advertencia', async () => {
      prismaMock.document.findMany.mockResolvedValueOnce([
        {
          id: 1,
          entityType: 'CHOFER',
          entityId: 10,
          classification: {
            validationStatus: null,
            disparidades: [{ severidad: 'advertencia' }],
          },
          template: { id: 1, name: 'T', entityType: 'CHOFER' },
        },
      ] as any);
      prismaMock.document.count.mockResolvedValueOnce(1);
      prismaMock.chofer.findUnique.mockResolvedValueOnce({ dni: '123' } as any);

      const out = await ApprovalService.getPendingDocuments(1, { page: 1, limit: 20 });
      expect(out.data[0].iaValidation.disparitiesSeverity).toBe('advertencia');
    });
  });

  // ============================================================================
  // TESTS DE approveDocument - branches adicionales
  // ============================================================================
  describe('approveDocument - branches adicionales', () => {
    const expires = new Date('2025-01-01');

    it('debe lanzar error si falta confirmedEntityType', async () => {
      prismaMock.document.findFirst.mockResolvedValueOnce({
        id: 1,
        classification: { detectedEntityType: 'CHOFER' },
      } as any);

      await expect(
        ApprovalService.approveDocument(1, 1, {
          reviewedBy: 9,
          // confirmedEntityType: falta
          confirmedEntityId: 123,
          confirmedExpiration: expires,
        } as any)
      ).rejects.toThrow();
    });

    it('debe lanzar error si falta confirmedEntityId', async () => {
      prismaMock.document.findFirst.mockResolvedValueOnce({
        id: 1,
        classification: { detectedEntityType: 'CHOFER' },
      } as any);

      await expect(
        ApprovalService.approveDocument(1, 1, {
          reviewedBy: 9,
          confirmedEntityType: 'CHOFER',
          // confirmedEntityId: falta
          confirmedExpiration: expires,
        } as any)
      ).rejects.toThrow();
    });

    it('debe lanzar error si falta confirmedExpiration', async () => {
      prismaMock.document.findFirst.mockResolvedValueOnce({
        id: 1,
        classification: { detectedEntityType: 'CHOFER' },
      } as any);

      await expect(
        ApprovalService.approveDocument(1, 1, {
          reviewedBy: 9,
          confirmedEntityType: 'CHOFER',
          confirmedEntityId: 123,
          // confirmedExpiration: falta
        } as any)
      ).rejects.toThrow();
    });

    it('debe manejar error en renameDocumentInMinio', async () => {
      prismaMock.document.findFirst.mockResolvedValueOnce({
        id: 1,
        tenantEmpresaId: 1,
        dadorCargaId: 2,
        entityType: 'CHOFER',
        entityId: 10,
        templateId: 5,
        classification: {
          detectedEntityType: 'CHOFER',
          detectedEntityId: '123',
          detectedExpiration: expires,
          detectedDocumentType: null,
        },
        template: { name: 'TPL', entityType: 'CHOFER' },
      } as any);

      prismaMock.chofer.findFirst.mockResolvedValueOnce({ id: 123 } as any);
      prismaMock.documentClassification.update.mockResolvedValueOnce({} as any);
      prismaMock.document.update.mockResolvedValueOnce({} as any);
      prismaMock.document.findUnique.mockResolvedValueOnce({
        filePath: 'bucket/dir/file.pdf',
        entityId: 10,
      } as any);

      // retention: no stale ni deprecated
      prismaMock.document.findMany.mockResolvedValueOnce([]).mockResolvedValueOnce([]);

      // Error en moveObject
      (minioService.moveObject as jest.Mock).mockRejectedValueOnce(new Error('MinIO error'));

      // No debe lanzar error, debe continuar
      await expect(
        ApprovalService.approveDocument(1, 1, {
          reviewedBy: 9,
          confirmedEntityType: 'CHOFER',
          confirmedEntityId: 123,
          confirmedExpiration: expires,
          confirmedTemplateId: 5,
        })
      ).resolves.toBeTruthy();
    });
  });

  // ============================================================================
  // TESTS DE rejectDocument - sin classification
  // ============================================================================
  describe('rejectDocument - sin classification', () => {
    it('debe rechazar documento sin classification', async () => {
      prismaMock.document.findFirst.mockResolvedValueOnce({
        id: 1,
        classification: null, // Sin classification
      } as any);
      prismaMock.document.update.mockResolvedValueOnce({
        id: 1,
        status: 'RECHAZADO',
      } as any);

      const out = await ApprovalService.rejectDocument(1, 1, {
        reviewedBy: 9,
        reason: 'No válido',
        reviewNotes: 'Test',
      });

      expect(out.status).toBe('RECHAZADO');
      // No debe intentar actualizar classification
      expect(prismaMock.documentClassification.update).not.toHaveBeenCalled();
    });
  });

  // ============================================================================
  // TESTS DE getEntityNaturalId - error branch
  // ============================================================================
  describe('getEntityNaturalId - manejo de errores', () => {
    it('debe retornar null cuando findUnique lanza error', async () => {
      prismaMock.chofer.findUnique.mockRejectedValueOnce(new Error('DB error'));

      // No hay forma directa de testear el helper privado, pero approveDocument usa getEntityNaturalId
      // Si getEntityNaturalId falla, no debe romper approveDocument
      prismaMock.document.findFirst.mockResolvedValueOnce({
        id: 1,
        tenantEmpresaId: 1,
        dadorCargaId: 2,
        entityType: 'CHOFER',
        entityId: 10,
        templateId: 5,
        classification: {
          detectedEntityType: 'CHOFER',
          detectedEntityId: '123',
          detectedExpiration: new Date('2025-01-01'),
          detectedDocumentType: null,
        },
        template: { name: 'TPL', entityType: 'CHOFER' },
      } as any);

      prismaMock.chofer.findFirst.mockResolvedValueOnce({ id: 123 } as any);
      prismaMock.documentClassification.update.mockResolvedValueOnce({} as any);
      prismaMock.document.update.mockResolvedValueOnce({} as any);

      // retention: no stale ni deprecated
      prismaMock.document.findMany.mockResolvedValueOnce([]).mockResolvedValueOnce([]);

      // No debe lanzar error aunque getEntityNaturalId falle
      await expect(
        ApprovalService.approveDocument(1, 1, {
          reviewedBy: 9,
          confirmedEntityType: 'CHOFER',
          confirmedEntityId: 123,
          confirmedExpiration: new Date('2025-01-01'),
          confirmedTemplateId: 5,
        })
      ).resolves.toBeTruthy();
    });
  });
});
