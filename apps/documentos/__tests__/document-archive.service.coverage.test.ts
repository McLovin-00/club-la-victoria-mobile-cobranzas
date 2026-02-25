/**
 * Coverage tests for DocumentArchiveService
 * Covers archiveDocuments, restoreDocuments, getArchivedDocuments,
 * findDocumentsExclusiveToClient and all conditional branches.
 * @jest-environment node
 */

const mockDocument = {
  updateMany: jest.fn(),
  findMany: jest.fn(),
  findFirst: jest.fn(),
};

const mockPlantillaRequisitoTemplate = {
  findMany: jest.fn(),
};

const mockEquipo = {
  findUnique: jest.fn(),
};

const mockClient: any = {
  document: mockDocument,
  plantillaRequisitoTemplate: mockPlantillaRequisitoTemplate,
  equipo: mockEquipo,
};

jest.mock('../src/config/database', () => ({
  db: { getClient: () => mockClient },
  prisma: mockClient,
}));

jest.mock('../src/config/logger', () => ({
  AppLogger: { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

import { DocumentArchiveService } from '../src/services/document-archive.service';

describe('DocumentArchiveService (coverage)', () => {
  beforeEach(() => jest.clearAllMocks());

  // ========================================================================
  // archiveDocuments
  // ========================================================================
  describe('archiveDocuments', () => {
    it('returns early when documentIds is empty', async () => {
      await DocumentArchiveService.archiveDocuments({
        documentIds: [],
        reason: 'MANUAL',
        userId: 1,
      });
      expect(mockDocument.updateMany).not.toHaveBeenCalled();
    });

    it('archives documents when client.document.updateMany exists', async () => {
      mockDocument.updateMany.mockResolvedValue({ count: 2 });

      await DocumentArchiveService.archiveDocuments({
        documentIds: [10, 20],
        reason: 'CLIENTE_REMOVIDO',
        userId: 5,
      });

      expect(mockDocument.updateMany).toHaveBeenCalledWith({
        where: { id: { in: [10, 20] } },
        data: expect.objectContaining({
          archived: true,
          archivedBy: 5,
          archiveReason: 'CLIENTE_REMOVIDO',
        }),
      });
    });

    it('does nothing when client has no document property', async () => {
      const originalDoc = mockClient.document;
      mockClient.document = undefined;

      await DocumentArchiveService.archiveDocuments({
        documentIds: [10],
        reason: 'MANUAL',
        userId: 1,
      });

      mockClient.document = originalDoc;
    });

    it('does nothing when client.document has no updateMany', async () => {
      const originalUpdateMany = mockDocument.updateMany;
      delete (mockDocument as any).updateMany;

      await DocumentArchiveService.archiveDocuments({
        documentIds: [10],
        reason: 'MANUAL',
        userId: 1,
      });

      mockDocument.updateMany = originalUpdateMany;
    });

    it('throws and logs on error', async () => {
      mockDocument.updateMany.mockRejectedValue(new Error('DB fail'));

      await expect(
        DocumentArchiveService.archiveDocuments({
          documentIds: [10],
          reason: 'REEMPLAZADO',
          userId: 1,
        })
      ).rejects.toThrow('DB fail');
    });
  });

  // ========================================================================
  // restoreDocuments
  // ========================================================================
  describe('restoreDocuments', () => {
    it('returns empty array when client.document is missing', async () => {
      const originalDoc = mockClient.document;
      mockClient.document = undefined;

      const result = await DocumentArchiveService.restoreDocuments({
        entityType: 'CHOFER',
        entityId: 10,
        templateIds: [1],
      });

      expect(result).toEqual([]);
      mockClient.document = originalDoc;
    });

    it('returns empty array when no archived docs found', async () => {
      mockDocument.findMany.mockResolvedValue([]);

      const result = await DocumentArchiveService.restoreDocuments({
        entityType: 'CHOFER',
        entityId: 10,
        templateIds: [1, 2],
      });

      expect(result).toEqual([]);
      expect(mockDocument.updateMany).not.toHaveBeenCalled();
    });

    it('restores most recent doc per template', async () => {
      const archivedDocs = [
        { id: 100, templateId: 1, uploadedAt: new Date('2025-06-01') },
        { id: 101, templateId: 1, uploadedAt: new Date('2025-05-01') },
        { id: 200, templateId: 2, uploadedAt: new Date('2025-06-15') },
      ];
      mockDocument.findMany.mockResolvedValue(archivedDocs);
      mockDocument.updateMany.mockResolvedValue({ count: 2 });

      const result = await DocumentArchiveService.restoreDocuments({
        entityType: 'CAMION',
        entityId: 20,
        templateIds: [1, 2],
      });

      expect(mockDocument.updateMany).toHaveBeenCalledWith({
        where: { id: { in: [100, 200] } },
        data: {
          archived: false,
          archivedAt: null,
          archivedBy: null,
          archiveReason: null,
        },
      });
      expect(result).toHaveLength(2);
      expect(result.map((d: any) => d.id)).toEqual([100, 200]);
    });

    it('throws and logs on error', async () => {
      mockDocument.findMany.mockRejectedValue(new Error('restore fail'));

      await expect(
        DocumentArchiveService.restoreDocuments({
          entityType: 'CHOFER',
          entityId: 10,
          templateIds: [1],
        })
      ).rejects.toThrow('restore fail');
    });
  });

  // ========================================================================
  // getArchivedDocuments
  // ========================================================================
  describe('getArchivedDocuments', () => {
    it('returns archived documents', async () => {
      const docs = [{ id: 1, archived: true }];
      mockDocument.findMany.mockResolvedValue(docs);

      const result = await DocumentArchiveService.getArchivedDocuments({
        entityType: 'ACOPLADO',
        entityId: 30,
      });

      expect(result).toEqual(docs);
      expect(mockDocument.findMany).toHaveBeenCalledWith({
        where: { entityType: 'ACOPLADO', entityId: 30, archived: true },
        include: { template: true },
        orderBy: { uploadedAt: 'desc' },
      });
    });

    it('returns empty array when client.document is missing', async () => {
      const originalDoc = mockClient.document;
      mockClient.document = undefined;

      const result = await DocumentArchiveService.getArchivedDocuments({
        entityType: 'CHOFER',
        entityId: 10,
      });

      expect(result).toEqual([]);
      mockClient.document = originalDoc;
    });

    it('returns empty array on error (swallowed)', async () => {
      mockDocument.findMany.mockRejectedValue(new Error('query fail'));

      const result = await DocumentArchiveService.getArchivedDocuments({
        entityType: 'CHOFER',
        entityId: 10,
      });

      expect(result).toEqual([]);
    });
  });

  // ========================================================================
  // findDocumentsExclusiveToClient
  // ========================================================================
  describe('findDocumentsExclusiveToClient', () => {
    it('returns empty array when plantillaRequisitoTemplate is missing', async () => {
      const original = mockClient.plantillaRequisitoTemplate;
      mockClient.plantillaRequisitoTemplate = undefined;

      const result = await DocumentArchiveService.findDocumentsExclusiveToClient({
        equipoId: 1,
        clienteId: 10,
        otherClienteIds: [20],
      });

      expect(result).toEqual([]);
      mockClient.plantillaRequisitoTemplate = original;
    });

    it('returns empty array when no exclusive requirements', async () => {
      mockPlantillaRequisitoTemplate.findMany
        .mockResolvedValueOnce([{ templateId: 1, entityType: 'CHOFER' }])
        .mockResolvedValueOnce([{ templateId: 1, entityType: 'CHOFER' }]);

      const result = await DocumentArchiveService.findDocumentsExclusiveToClient({
        equipoId: 1,
        clienteId: 10,
        otherClienteIds: [20],
      });

      expect(result).toEqual([]);
    });

    it('finds exclusive documents for CHOFER entity', async () => {
      mockPlantillaRequisitoTemplate.findMany
        .mockResolvedValueOnce([
          { templateId: 1, entityType: 'CHOFER' },
          { templateId: 2, entityType: 'CAMION' },
        ])
        .mockResolvedValueOnce([
          { templateId: 2, entityType: 'CAMION' },
        ]);

      mockEquipo.findUnique.mockResolvedValue({
        driverId: 10,
        truckId: 20,
        trailerId: 30,
        empresaTransportistaId: 40,
      });

      mockDocument.findMany.mockResolvedValue([{ id: 500 }]);

      const result = await DocumentArchiveService.findDocumentsExclusiveToClient({
        equipoId: 1,
        clienteId: 10,
        otherClienteIds: [20],
      });

      expect(result).toContain(500);
    });

    it('finds exclusive documents for CAMION entity', async () => {
      mockPlantillaRequisitoTemplate.findMany
        .mockResolvedValueOnce([{ templateId: 3, entityType: 'CAMION' }])
        .mockResolvedValueOnce([]);

      mockEquipo.findUnique.mockResolvedValue({
        driverId: 10,
        truckId: 20,
        trailerId: null,
        empresaTransportistaId: null,
      });

      mockDocument.findMany.mockResolvedValue([{ id: 600 }]);

      const result = await DocumentArchiveService.findDocumentsExclusiveToClient({
        equipoId: 1,
        clienteId: 10,
        otherClienteIds: [20],
      });

      expect(result).toContain(600);
    });

    it('finds exclusive documents for ACOPLADO entity', async () => {
      mockPlantillaRequisitoTemplate.findMany
        .mockResolvedValueOnce([{ templateId: 4, entityType: 'ACOPLADO' }])
        .mockResolvedValueOnce([]);

      mockEquipo.findUnique.mockResolvedValue({
        driverId: 10,
        truckId: 20,
        trailerId: 30,
        empresaTransportistaId: null,
      });

      mockDocument.findMany.mockResolvedValue([{ id: 700 }]);

      const result = await DocumentArchiveService.findDocumentsExclusiveToClient({
        equipoId: 1,
        clienteId: 10,
        otherClienteIds: [20],
      });

      expect(result).toContain(700);
    });

    it('finds exclusive documents for EMPRESA_TRANSPORTISTA entity', async () => {
      mockPlantillaRequisitoTemplate.findMany
        .mockResolvedValueOnce([{ templateId: 5, entityType: 'EMPRESA_TRANSPORTISTA' }])
        .mockResolvedValueOnce([]);

      mockEquipo.findUnique.mockResolvedValue({
        driverId: 10,
        truckId: 20,
        trailerId: null,
        empresaTransportistaId: 40,
      });

      mockDocument.findMany.mockResolvedValue([{ id: 800 }]);

      const result = await DocumentArchiveService.findDocumentsExclusiveToClient({
        equipoId: 1,
        clienteId: 10,
        otherClienteIds: [20],
      });

      expect(result).toContain(800);
    });

    it('skips entity when entityId is null (trailerId=null for ACOPLADO)', async () => {
      mockPlantillaRequisitoTemplate.findMany
        .mockResolvedValueOnce([{ templateId: 4, entityType: 'ACOPLADO' }])
        .mockResolvedValueOnce([]);

      mockEquipo.findUnique.mockResolvedValue({
        driverId: 10,
        truckId: 20,
        trailerId: null,
        empresaTransportistaId: null,
      });

      const result = await DocumentArchiveService.findDocumentsExclusiveToClient({
        equipoId: 1,
        clienteId: 10,
        otherClienteIds: [20],
      });

      expect(result).toEqual([]);
      expect(mockDocument.findMany).not.toHaveBeenCalled();
    });

    it('returns empty array when equipo not found', async () => {
      mockPlantillaRequisitoTemplate.findMany
        .mockResolvedValueOnce([{ templateId: 1, entityType: 'CHOFER' }])
        .mockResolvedValueOnce([]);

      mockEquipo.findUnique.mockResolvedValue(null);

      const result = await DocumentArchiveService.findDocumentsExclusiveToClient({
        equipoId: 999,
        clienteId: 10,
        otherClienteIds: [20],
      });

      expect(result).toEqual([]);
    });

    it('returns empty array on error (swallowed)', async () => {
      mockPlantillaRequisitoTemplate.findMany.mockRejectedValue(new Error('DB fail'));

      const result = await DocumentArchiveService.findDocumentsExclusiveToClient({
        equipoId: 1,
        clienteId: 10,
        otherClienteIds: [20],
      });

      expect(result).toEqual([]);
    });

    it('handles unknown entityType in switch (falls through without setting entityId)', async () => {
      mockPlantillaRequisitoTemplate.findMany
        .mockResolvedValueOnce([{ templateId: 6, entityType: 'UNKNOWN_TYPE' }])
        .mockResolvedValueOnce([]);

      mockEquipo.findUnique.mockResolvedValue({
        driverId: 10,
        truckId: 20,
        trailerId: null,
        empresaTransportistaId: null,
      });

      const result = await DocumentArchiveService.findDocumentsExclusiveToClient({
        equipoId: 1,
        clienteId: 10,
        otherClienteIds: [20],
      });

      expect(result).toEqual([]);
    });

    it('handles multiple exclusive requirements across entity types', async () => {
      mockPlantillaRequisitoTemplate.findMany
        .mockResolvedValueOnce([
          { templateId: 1, entityType: 'CHOFER' },
          { templateId: 2, entityType: 'CAMION' },
          { templateId: 3, entityType: 'ACOPLADO' },
          { templateId: 4, entityType: 'EMPRESA_TRANSPORTISTA' },
        ])
        .mockResolvedValueOnce([]);

      mockEquipo.findUnique.mockResolvedValue({
        driverId: 10,
        truckId: 20,
        trailerId: 30,
        empresaTransportistaId: 40,
      });

      mockDocument.findMany
        .mockResolvedValueOnce([{ id: 101 }])
        .mockResolvedValueOnce([{ id: 102 }])
        .mockResolvedValueOnce([{ id: 103 }])
        .mockResolvedValueOnce([{ id: 104 }]);

      const result = await DocumentArchiveService.findDocumentsExclusiveToClient({
        equipoId: 1,
        clienteId: 10,
        otherClienteIds: [],
      });

      expect(result).toEqual([101, 102, 103, 104]);
    });
  });
});
