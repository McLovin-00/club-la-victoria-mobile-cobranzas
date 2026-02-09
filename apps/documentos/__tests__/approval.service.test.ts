/**
 * Unit tests for ApprovalService
 * @jest-environment node
 */

jest.mock('../src/config/database', () => {
  const prismaMock = {
    document: { findFirst: jest.fn(), findMany: jest.fn(), update: jest.fn(), findUnique: jest.fn(), count: jest.fn(), groupBy: jest.fn() },
    documentClassification: { update: jest.fn(), upsert: jest.fn() },
    documentTemplate: { findFirst: jest.fn(), findMany: jest.fn() },
    chofer: { findFirst: jest.fn(), findUnique: jest.fn(), create: jest.fn() },
    empresaTransportista: { findFirst: jest.fn(), findUnique: jest.fn(), create: jest.fn() },
    camion: { findFirst: jest.fn(), findUnique: jest.fn(), create: jest.fn() },
    acoplado: { findFirst: jest.fn(), findUnique: jest.fn(), create: jest.fn() },
    $transaction: jest.fn(),
  };
  prismaMock.$transaction.mockImplementation((cb) => cb(prismaMock));
  return {
    prisma: prismaMock,
    db: { getClient: () => prismaMock },
  };
});

jest.mock('../src/services/minio.service', () => ({
  minioService: {
    moveObject: jest.fn(),
  },
}));

jest.mock('../src/config/logger', () => ({
  AppLogger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

import { ApprovalService } from '../src/services/approval.service';
import { prisma as prismaClient } from '../src/config/database';

const prisma = prismaClient as any;

describe('ApprovalService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getPendingDocuments', () => {
    it('debe retornar documentos pendientes con paginación cuando no hay filtros', async () => {
      const mockDocs = [
        {
          id: 1,
          tenantEmpresaId: 1,
          entityId: 123,
          entityType: 'CHOFER',
          templateId: 1,
          template: { id: 1, name: 'LICENCIA', entityType: 'CHOFER' },
          classification: {
            detectedEntityType: 'CHOFER',
            detectedEntityId: '12345678',
            confidence: 0.95,
            reviewedAt: null,
          },
          uploadedAt: new Date('2025-01-14T10:00:00Z'),
        },
      ];

      prisma.document.findMany.mockResolvedValue(mockDocs);
      prisma.document.count.mockResolvedValue(1);

      const result = await ApprovalService.getPendingDocuments(1, {});

      expect(prisma.document.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tenantEmpresaId: 1,
            status: 'PENDIENTE_APROBACION',
          }),
          skip: 0,
          take: 20,
          orderBy: [{ uploadedAt: 'desc' }, { id: 'desc' }],
        })
      );
      expect(result.data).toHaveLength(1);
      expect(result.pagination).toEqual({
        page: 1,
        limit: 20,
        total: 1,
        pages: 1,
      });
    });

    it('debe filtrar por tipo de entidad', async () => {
      prisma.document.findMany.mockResolvedValue([]);
      prisma.document.count.mockResolvedValue(0);

      await ApprovalService.getPendingDocuments(1, { entityType: 'CHOFER' });

      expect(prisma.document.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            classification: expect.objectContaining({
              detectedEntityType: 'CHOFER',
            }),
          }),
        })
      );
    });

    it('debe filtrar por rango de confianza', async () => {
      prisma.document.findMany.mockResolvedValue([]);
      prisma.document.count.mockResolvedValue(0);

      await ApprovalService.getPendingDocuments(1, { minConfidence: 0.8, maxConfidence: 0.95 });

      expect(prisma.document.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            classification: expect.objectContaining({
              confidence: { gte: 0.8, lte: 0.95 },
            }),
          }),
        })
      );
    });

    it('debe aplicar paginación correctamente', async () => {
      prisma.document.findMany.mockResolvedValue([]);
      prisma.document.count.mockResolvedValue(100);

      await ApprovalService.getPendingDocuments(1, { page: 3, limit: 25 });

      expect(prisma.document.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 50,
          take: 25,
        })
      );
    });
  });

  describe('getPendingDocument', () => {
    it('debe retornar documento pendiente encontrado', async () => {
      prisma.document.findFirst.mockResolvedValue({
        id: 1,
        tenantEmpresaId: 1,
        entityId: 123,
        entityType: 'CHOFER',
        templateId: 1,
        template: { id: 1, name: 'LICENCIA', entityType: 'CHOFER' },
        classification: {
          detectedEntityType: 'CHOFER',
          detectedEntityId: '12345678',
        },
      });

      const result = await ApprovalService.getPendingDocument(1, 1);

      expect(result).not.toBeNull();
      expect(prisma.document.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 1, tenantEmpresaId: 1, status: 'PENDIENTE_APROBACION' },
        })
      );
    });

    it('debe retornar null cuando documento no existe', async () => {
      prisma.document.findFirst.mockResolvedValue(null);

      const result = await ApprovalService.getPendingDocument(999, 1);

      expect(result).toBeNull();
    });

    it('debe retornar null cuando documento no está pendiente', async () => {
      prisma.document.findFirst.mockResolvedValue(null);

      const result = await ApprovalService.getPendingDocument(1, 1);

      expect(result).toBeNull();
    });
  });

  describe('approveDocument', () => {
    const baseDoc = {
      id: 1,
      tenantEmpresaId: 1,
      dadorCargaId: 1,
      entityId: 123,
      entityType: 'CHOFER',
      templateId: 1,
      template: { id: 1, name: 'LICENCIA', entityType: 'CHOFER' },
      classification: {
        detectedEntityType: 'CHOFER',
        detectedEntityId: '12345678',
        detectedExpiration: new Date('2026-01-14'),
        detectedDocumentType: 'LICENCIA',
      },
      status: 'PENDIENTE_APROBACION',
    };

    it('debe aprobar documento con datos de revisión completos', async () => {
      prisma.document.findFirst.mockResolvedValue(baseDoc);
      prisma.chofer.findFirst.mockResolvedValue({ id: 123 });

      prisma.$transaction.mockImplementation(async (callback) => {
        return callback({
          document: {
            findFirst: jest.fn().mockResolvedValue(baseDoc),
            update: jest.fn().mockResolvedValue({
              ...baseDoc,
              status: 'APROBADO',
              entityType: 'CHOFER',
              entityId: 123,
              expiresAt: new Date('2026-01-14'),
              template: { id: 1, name: 'LICENCIA' },
            }),
            findMany: jest.fn().mockResolvedValue([]),
          },
          documentClassification: {
            update: jest.fn().mockResolvedValue({}),
          },
          documentTemplate: {
            findFirst: jest.fn().mockResolvedValue(null),
          },
          chofer: {
            findFirst: jest.fn().mockResolvedValue({ id: 123 }),
          },
          empresaTransportista: {
            findFirst: jest.fn().mockResolvedValue(null),
          },
          camion: {
            findFirst: jest.fn().mockResolvedValue(null),
          },
          acoplado: {
            findFirst: jest.fn().mockResolvedValue(null),
          },
        });
      });

      const reviewData = {
        reviewedBy: 1,
        confirmedEntityType: 'CHOFER',
        confirmedEntityId: 123,
        confirmedExpiration: new Date('2026-01-14'),
        confirmedTemplateId: 1,
        reviewNotes: 'Aprobado manualmente',
      };

      const result = await ApprovalService.approveDocument(1, 1, reviewData);

      expect(result.status).toBe('APROBADO');
    });

    it('debe lanzar error cuando documento no tiene clasificación', async () => {
      prisma.document.findFirst.mockResolvedValue({
        ...baseDoc,
        classification: null,
      });

      prisma.$transaction.mockImplementation(async (callback) => {
        return callback({
          document: {
            findFirst: jest.fn().mockResolvedValue({
              ...baseDoc,
              classification: null,
            }),
          },
        });
      });

      await expect(
        ApprovalService.approveDocument(1, 1, { reviewedBy: 1 })
      ).rejects.toThrow('Documento no encontrado o no está pendiente de aprobación');
    });
  });

  describe('rejectDocument', () => {
    it('debe rechazar documento con motivo válido', async () => {
      prisma.document.findFirst.mockResolvedValue({
        id: 1,
        tenantEmpresaId: 1,
        classification: { detectedEntityType: 'CHOFER' },
      });

      prisma.$transaction.mockImplementation(async (callback) => {
        return callback({
          document: {
            findFirst: jest.fn().mockResolvedValue({
              id: 1,
              tenantEmpresaId: 1,
              classification: { detectedEntityType: 'CHOFER' },
            }),
            update: jest.fn().mockResolvedValue({
              id: 1,
              status: 'RECHAZADO',
              rejectedAt: expect.any(Date),
              rejectedBy: 1,
              rejectionReason: 'Documento borroso',
              rejectionCount: 1,
            }),
          },
          documentClassification: {
            update: jest.fn().mockResolvedValue({}),
          },
        });
      });

      const result = await ApprovalService.rejectDocument(1, 1, {
        reviewedBy: 1,
        reason: 'Documento borroso',
        reviewNotes: 'Nota adicional',
      });

      expect(result.status).toBe('RECHAZADO');
      expect(result.rejectionReason).toBe('Documento borroso');
    });

    it('debe lanzar error cuando motivo es muy corto', async () => {
      await expect(
        ApprovalService.rejectDocument(1, 1, {
          reviewedBy: 1,
          reason: 'X',
        })
      ).rejects.toThrow('Debe especificar un motivo de rechazo');
    });

    it('debe lanzar error cuando motivo está vacío', async () => {
      await expect(
        ApprovalService.rejectDocument(1, 1, {
          reviewedBy: 1,
          reason: '   ',
        })
      ).rejects.toThrow('Debe especificar un motivo de rechazo');
    });

    it('debe combinar motivo con notas en reviewNotes', async () => {
      prisma.document.findFirst.mockResolvedValue({
        id: 1,
        tenantEmpresaId: 1,
        classification: { detectedEntityType: 'CHOFER' },
      });

      prisma.$transaction.mockImplementation(async (callback) => {
        const tx = {
          document: {
            findFirst: jest.fn().mockResolvedValue({
              id: 1,
              tenantEmpresaId: 1,
              classification: { detectedEntityType: 'CHOFER' },
            }),
            update: jest.fn().mockResolvedValue({
              id: 1,
              status: 'RECHAZADO',
            }),
          },
          documentClassification: {
            update: jest.fn().mockResolvedValue({}),
          },
        };

        await callback(tx);

        expect(tx.documentClassification.update).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({
              reviewNotes: 'RECHAZADO: Documento inválido | Nota adicional',
            }),
          })
        );
      });

      await ApprovalService.rejectDocument(1, 1, {
        reviewedBy: 1,
        reason: 'Documento inválido',
        reviewNotes: 'Nota adicional',
      });
    });
  });

  describe('getApprovalStats', () => {
    it('debe calcular estadísticas correctamente', async () => {
      prisma.document.groupBy.mockResolvedValue([
        { status: 'PENDIENTE_APROBACION', _count: { status: 5 } },
        { status: 'APROBADO', _count: { status: 10 } },
        { status: 'RECHAZADO', _count: { status: 3 } },
      ]);

      const result = await ApprovalService.getApprovalStats(1);

      expect(result).toEqual({
        pendienteAprobacion: 5,
        aprobados: 10,
        rechazados: 3,
        total: 18,
      });
    });

    it('debe retornar ceros cuando no hay documentos', async () => {
      prisma.document.groupBy.mockResolvedValue([]);

      const result = await ApprovalService.getApprovalStats(1);

      expect(result).toEqual({
        pendienteAprobacion: 0,
        aprobados: 0,
        rechazados: 0,
        total: 0,
      });
    });

    it('debe ignorar estados no reconocidos', async () => {
      prisma.document.groupBy.mockResolvedValue([
        { status: 'PENDIENTE_APROBACION', _count: { status: 5 } },
        { status: 'APROBADO', _count: { status: 10 } },
        { status: 'VENCIDO', _count: { status: 2 } },
      ]);

      const result = await ApprovalService.getApprovalStats(1);

      expect(result).toEqual({
        pendienteAprobacion: 5,
        aprobados: 10,
        rechazados: 0,
        total: 17,
      });
    });
  });
});
