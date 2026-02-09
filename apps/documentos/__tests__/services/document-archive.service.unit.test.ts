import { prismaMock, resetPrismaMock } from '../mocks/prisma.mock';

jest.mock('../../src/config/logger', () => ({
  AppLogger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

jest.mock('../../src/config/database', () => ({
  db: { getClient: () => prismaMock },
}));

import { DocumentArchiveService } from '../../src/services/document-archive.service';

describe('DocumentArchiveService', () => {
  beforeEach(() => {
    resetPrismaMock();
    jest.clearAllMocks();
  });

  it('archiveDocuments returns early when no ids; otherwise updates and logs', async () => {
    await expect(DocumentArchiveService.archiveDocuments({ documentIds: [], reason: 'MANUAL', userId: 1 })).resolves.toBeUndefined();

    prismaMock.document.updateMany.mockResolvedValueOnce({ count: 2 } as any);
    await DocumentArchiveService.archiveDocuments({ documentIds: [1, 2], reason: 'MANUAL', userId: 1 });
    expect(prismaMock.document.updateMany).toHaveBeenCalled();
  });

  it('restoreDocuments returns [] when no docs; restores latest per template otherwise', async () => {
    prismaMock.document.findMany.mockResolvedValueOnce([]);
    const out1 = await DocumentArchiveService.restoreDocuments({ entityType: 'CHOFER', entityId: 1, templateIds: [1] });
    expect(out1).toEqual([]);

    prismaMock.document.findMany.mockResolvedValueOnce([
      { id: 1, templateId: 10, uploadedAt: new Date('2025-01-02') },
      { id: 2, templateId: 10, uploadedAt: new Date('2025-01-01') },
      { id: 3, templateId: 11, uploadedAt: new Date('2025-01-01') },
    ] as any);
    prismaMock.document.updateMany.mockResolvedValueOnce({ count: 2 } as any);

    const out2 = await DocumentArchiveService.restoreDocuments({ entityType: 'CHOFER', entityId: 1, templateIds: [10, 11] });
    expect(prismaMock.document.updateMany).toHaveBeenCalledWith(expect.objectContaining({ where: { id: { in: [1, 3] } } }));
    expect(out2.map((d: any) => d.id).sort()).toEqual([1, 3]);
  });

  it('getArchivedDocuments returns [] on error and queries archived docs on success', async () => {
    prismaMock.document.findMany.mockResolvedValueOnce([{ id: 1 }] as any);
    const out = await DocumentArchiveService.getArchivedDocuments({ entityType: 'CHOFER', entityId: 1 });
    expect(out).toHaveLength(1);
  });

  it('findDocumentsExclusiveToClient returns ids based on exclusive requirements and entity mapping', async () => {
    prismaMock.clienteDocumentRequirement.findMany
      .mockResolvedValueOnce([{ templateId: 1, entityType: 'CHOFER' }, { templateId: 2, entityType: 'CAMION' }] as any) // clientRequirements
      .mockResolvedValueOnce([{ templateId: 1, entityType: 'CHOFER' }] as any); // otherRequirements -> CAMION is exclusive

    prismaMock.equipo.findUnique.mockResolvedValueOnce({ id: 1, driverId: 10, truckId: 20, trailerId: null, empresaTransportistaId: null } as any);
    prismaMock.document.findMany.mockResolvedValueOnce([{ id: 99 }] as any);

    const ids = await DocumentArchiveService.findDocumentsExclusiveToClient({ equipoId: 1, clienteId: 2, otherClienteIds: [3] });
    expect(ids).toEqual([99]);
  });


  describe('Coverage Edge Cases', () => {
    it('findDocumentsExclusiveToClient: handles ACOPLADO and EMPRESA_TRANSPORTISTA', async () => {
      prismaMock.clienteDocumentRequirement.findMany
        .mockResolvedValueOnce([{ templateId: 1, entityType: 'ACOPLADO' }, { templateId: 2, entityType: 'EMPRESA_TRANSPORTISTA' }] as any)
        .mockResolvedValueOnce([] as any); // others empty -> both exclusive

      prismaMock.equipo.findUnique.mockResolvedValueOnce({
        id: 1, driverId: 10, truckId: 20, trailerId: 30, empresaTransportistaId: 40
      } as any);

      // first findMany for ACOPLADO
      prismaMock.document.findMany.mockResolvedValueOnce([{ id: 100 }] as any);
      // second findMany for EMPRESA
      prismaMock.document.findMany.mockResolvedValueOnce([{ id: 101 }] as any);

      const ids = await DocumentArchiveService.findDocumentsExclusiveToClient({ equipoId: 1, clienteId: 2, otherClienteIds: [3] });
      expect(ids).toEqual([100, 101]);
    });

    it('findDocumentsExclusiveToClient: returns empty if exclusiveReqs empty or equipo null', async () => {
      // case 1: no exclusive
      prismaMock.clienteDocumentRequirement.findMany
        .mockResolvedValueOnce([{ templateId: 1, entityType: 'CHOFER' }] as any)
        .mockResolvedValueOnce([{ templateId: 1, entityType: 'CHOFER' }] as any);

      const ids1 = await DocumentArchiveService.findDocumentsExclusiveToClient({ equipoId: 1, clienteId: 2, otherClienteIds: [] });
      expect(ids1).toEqual([]);

      // case 2: equipo null (needs exclusive reqs first)
      prismaMock.clienteDocumentRequirement.findMany
        .mockResolvedValueOnce([{ templateId: 1, entityType: 'CHOFER' }] as any)
        .mockResolvedValueOnce([] as any);
      prismaMock.equipo.findUnique.mockResolvedValue(null);

      const ids2 = await DocumentArchiveService.findDocumentsExclusiveToClient({ equipoId: 1, clienteId: 2, otherClienteIds: [] });
      expect(ids2).toEqual([]);
    });

    it('Catches errors in all methods', async () => {
      prismaMock.document.updateMany.mockRejectedValue(new Error('DB'));
      await expect(DocumentArchiveService.archiveDocuments({ documentIds: [1], reason: 'MANUAL', userId: 1 })).rejects.toThrow();

      prismaMock.document.findMany.mockRejectedValue(new Error('DB'));
      await expect(DocumentArchiveService.restoreDocuments({ entityType: 'C', entityId: 1, templateIds: [] })).rejects.toThrow();

      // getArchivedDocuments returns [] on error
      prismaMock.document.findMany.mockRejectedValue(new Error('DB'));
      const res = await DocumentArchiveService.getArchivedDocuments({ entityType: 'C', entityId: 1 });
      expect(res).toEqual([]);

      // findDocumentsExclusiveToClient returns [] on error
      prismaMock.clienteDocumentRequirement.findMany.mockRejectedValue(new Error('DB'));
      const res2 = await DocumentArchiveService.findDocumentsExclusiveToClient({ equipoId: 1, clienteId: 1, otherClienteIds: [] });
      expect(res2).toEqual([]);
    });
  });
});


