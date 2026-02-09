import { prismaMock, resetPrismaMock } from '../mocks/prisma.mock';

jest.mock('../../src/config/database', () => ({
  db: { getClient: () => prismaMock },
}));

jest.mock('../../src/config/environment', () => ({
  getEnvironment: () => ({
    DOCS_MAX_DEPRECATED_VERSIONS: 1,
  }),
}));

const minioMock = {
  moveObject: jest.fn(async () => undefined),
  deleteDocument: jest.fn(async () => undefined),
};
jest.mock('../../src/services/minio.service', () => ({
  minioService: minioMock,
}));

import { ApprovalService } from '../../src/services/approval.service';

describe('ApprovalService (more)', () => {
  beforeEach(() => {
    resetPrismaMock();
    jest.clearAllMocks();
    prismaMock.$transaction.mockImplementation((fn: any) => fn(prismaMock));
  });

  it('approveDocument: should resolve CHOFER confirmedEntityId as internal numeric id, rename in MinIO, and apply retention', async () => {
    const classification = {
      detectedEntityType: 'CHOFER',
      detectedEntityId: '12345678',
      detectedExpiration: new Date('2026-01-01T00:00:00.000Z'),
    };

    prismaMock.document.findFirst.mockResolvedValueOnce({
      id: 1,
      tenantEmpresaId: 1,
      dadorCargaId: 10,
      entityType: 'CHOFER',
      entityId: 0,
      templateId: 1,
      classification,
      template: { name: 'DNI' },
    } as any);

    // ensureChofer: numeric id branch (string length <= 9 + exists by id)
    prismaMock.chofer.findFirst.mockResolvedValueOnce({ id: 123 } as any);

    prismaMock.documentClassification.update.mockResolvedValueOnce({} as any);

    prismaMock.document.update
      .mockResolvedValueOnce({
        id: 1,
        status: 'APROBADO',
        tenantEmpresaId: 1,
        dadorCargaId: 10,
        entityType: 'CHOFER',
        entityId: 123,
        templateId: 1,
        expiresAt: new Date('2026-01-01T00:00:00.000Z'),
        uploadedAt: new Date('2025-01-01T00:00:00.000Z'),
        template: { name: 'DNI' },
      } as any)
      // renameDocumentInMinio updates document fileName/filePath
      .mockResolvedValueOnce({} as any)
      // stale doc update in deprecation
      .mockResolvedValueOnce({} as any);

    prismaMock.document.findUnique.mockResolvedValueOnce({
      filePath: 'bucket/dir/old.pdf',
      entityId: 123,
    } as any);

    // handleDeprecationAndRetention:
    // 1) stale approved docs to deprecate
    prismaMock.document.findMany
      .mockResolvedValueOnce([{ id: 2, validationData: { foo: 'bar' } }] as any)
      // 2) deprecated docs list (more than maxKeep -> delete extras)
      .mockResolvedValueOnce([
        { id: 3, filePath: 'bucket/dir/dep1.pdf' },
        { id: 4, filePath: 'bucket/dir/dep2.pdf' },
      ] as any);

    prismaMock.document.delete.mockResolvedValueOnce({} as any);

    const out = await ApprovalService.approveDocument(1, 1, {
      reviewedBy: 99,
      confirmedEntityType: 'CHOFER',
      confirmedEntityId: '123', // triggers numeric-id path
      confirmedExpiration: new Date('2026-01-01T00:00:00.000Z'),
      confirmedTemplateId: 1,
      reviewNotes: 'ok',
    });

    expect(out).toMatchObject({ id: 1, entityId: 123, status: 'APROBADO' });
    expect(minioMock.moveObject).toHaveBeenCalledWith('bucket', 'dir/old.pdf', expect.stringContaining('dir/'));
    expect(minioMock.deleteDocument).toHaveBeenCalledWith('bucket', 'dir/dep2.pdf');
    expect(prismaMock.document.delete).toHaveBeenCalledWith({ where: { id: 4 } });
  });

  it('rejectDocument: should validate reason length and then update classification + document', async () => {
    await expect(ApprovalService.rejectDocument(1, 1, { reviewedBy: 1, reason: 'x' })).rejects.toThrow('motivo');

    prismaMock.document.findFirst.mockResolvedValueOnce({ id: 1, tenantEmpresaId: 1, classification: { documentId: 1 } } as any);
    prismaMock.documentClassification.update.mockResolvedValueOnce({} as any);
    prismaMock.document.update.mockResolvedValueOnce({ id: 1, status: 'RECHAZADO' } as any);

    const out = await ApprovalService.rejectDocument(1, 1, { reviewedBy: 1, reason: 'Motivo válido', reviewNotes: 'n' });
    expect(out).toMatchObject({ id: 1, status: 'RECHAZADO' });
    expect(prismaMock.documentClassification.update).toHaveBeenCalled();
  });

  it('approveDocument: should create missing entities depending on confirmedEntityType (ensure* helpers)', async () => {
    prismaMock.document.findFirst.mockResolvedValue({
      id: 10,
      tenantEmpresaId: 1,
      dadorCargaId: 2,
      entityType: 'EMPRESA_TRANSPORTISTA',
      entityId: 0,
      templateId: 1,
      classification: { detectedEntityType: 'EMPRESA_TRANSPORTISTA', detectedEntityId: '20-123456789-0' },
      template: { name: 'Constancia' },
    } as any);
    prismaMock.documentClassification.update.mockResolvedValue({} as any);
    prismaMock.document.findUnique.mockResolvedValue({ filePath: null, entityId: 0 } as any);
    prismaMock.document.update.mockResolvedValue({ id: 10, status: 'APROBADO', tenantEmpresaId: 1, dadorCargaId: 2, entityType: 'EMPRESA_TRANSPORTISTA', entityId: 88, templateId: 1, expiresAt: new Date(), template: { name: 'Constancia' } } as any);

    prismaMock.empresaTransportista.findFirst.mockResolvedValueOnce(null);
    prismaMock.empresaTransportista.create.mockResolvedValueOnce({ id: 88 } as any);
    prismaMock.document.findMany.mockResolvedValue([] as any);

    const out = await ApprovalService.approveDocument(10, 1, {
      reviewedBy: 1,
      confirmedEntityType: 'EMPRESA_TRANSPORTISTA',
      confirmedEntityId: '20-123456789-0',
      confirmedExpiration: new Date('2026-01-01T00:00:00.000Z'),
      confirmedTemplateId: 1,
    });
    expect(out).toMatchObject({ id: 10, entityId: 88, status: 'APROBADO' });
    expect(prismaMock.empresaTransportista.create).toHaveBeenCalled();
  });

  it('getPendingDocuments: should enrich entityNaturalId for CAMION', async () => {
    prismaMock.document.findMany.mockResolvedValueOnce([
      {
        id: 1,
        tenantEmpresaId: 1,
        dadorCargaId: 2,
        status: 'PENDIENTE_APROBACION',
        entityType: 'CAMION',
        entityId: 2,
        template: { id: 1, name: 'RTO', entityType: 'CAMION' },
        classification: { validationStatus: null, aiResponse: null, hasDisparities: false, disparidades: [], detectedEntityId: null, detectedEntityType: 'CAMION', confidence: 0.9, reviewedAt: null },
      },
    ] as any);
    prismaMock.document.count.mockResolvedValueOnce(1);
    prismaMock.camion.findUnique.mockResolvedValueOnce({ patente: 'AA123BB' } as any);

    const out = await ApprovalService.getPendingDocuments(1, { page: 1, limit: 10 });
    expect(out.data[0].entityNaturalId).toContain('AA');
  });

  it('getApprovalStats: should map grouped counts', async () => {
    prismaMock.document.groupBy.mockResolvedValueOnce([
      { status: 'PENDIENTE_APROBACION', _count: { status: 2 } },
      { status: 'APROBADO', _count: { status: 3 } },
      { status: 'RECHAZADO', _count: { status: 1 } },
    ] as any);

    await expect(ApprovalService.getApprovalStats(1)).resolves.toEqual({
      pendienteAprobacion: 2,
      aprobados: 3,
      rechazados: 1,
      total: 6,
    });
  });
});


