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

describe('ApprovalService', () => {
  beforeEach(() => {
    resetPrismaMock();
    jest.clearAllMocks();
    (prismaMock.$transaction as jest.Mock).mockImplementation(async (arg: any) => {
      if (Array.isArray(arg)) return Promise.all(arg);
      return arg(prismaMock);
    });
  });

  it('getPendingDocuments enriches entityNaturalId and IA validation', async () => {
    prismaMock.document.findMany.mockResolvedValueOnce([
      { id: 1, entityType: 'CHOFER', entityId: 10, classification: { validationStatus: null, disparidades: [{ severidad: 'critica' }] }, template: { id: 1, name: 'T', entityType: 'CHOFER' } },
    ] as any);
    prismaMock.document.count.mockResolvedValueOnce(1);
    prismaMock.chofer.findUnique.mockResolvedValueOnce({ dni: '123' } as any);

    const out = await ApprovalService.getPendingDocuments(1, { page: 1, limit: 20 });
    expect(out.data[0].entityNaturalId).toBe('123');
    expect(out.data[0].iaValidation.disparitiesSeverity).toBe('critica');
  });

  it('approveDocument updates classification + document, renames file and applies retention', async () => {
    const expires = new Date('2025-01-01');
    prismaMock.document.findFirst.mockResolvedValueOnce({
      id: 1,
      tenantEmpresaId: 1,
      dadorCargaId: 2,
      entityType: 'CHOFER',
      entityId: 10,
      templateId: 5,
      classification: { detectedEntityType: 'CHOFER', detectedEntityId: '123', detectedExpiration: expires, detectedDocumentType: null },
      template: { name: 'TPL', entityType: 'CHOFER' },
    } as any);

    prismaMock.chofer.findFirst.mockResolvedValueOnce({ id: 123 } as any); // ensureChofer by id
    prismaMock.documentClassification.update.mockResolvedValueOnce({} as any);
    prismaMock.document.update
      .mockResolvedValueOnce({ id: 1, entityType: 'CHOFER', template: { name: 'TPL' }, expiresAt: expires, templateId: 5, tenantEmpresaId: 1, entityId: 123 } as any) // update doc
      .mockResolvedValueOnce({} as any); // renameDocumentInMinio updates doc

    prismaMock.document.findUnique.mockResolvedValueOnce({ filePath: 'bucket/dir/file.pdf', entityId: 10 } as any);

    // retention: stale + deprecated versions
    prismaMock.document.findMany
      .mockResolvedValueOnce([{ id: 2, validationData: {} }] as any) // stale approved
      .mockResolvedValueOnce([{ id: 3, filePath: 'bucket/x' }, { id: 4, filePath: 'bucket/y' }] as any); // deprecated list
    prismaMock.document.delete.mockResolvedValue({} as any);

    await expect(ApprovalService.approveDocument(1, 1, { reviewedBy: 9, confirmedEntityType: 'CHOFER', confirmedEntityId: 123, confirmedExpiration: expires, confirmedTemplateId: 5 })).resolves.toBeTruthy();
    expect(minioService.moveObject).toHaveBeenCalled();
    expect(minioService.deleteDocument).toHaveBeenCalled(); // retention deletes extra versions
  });

  it('rejectDocument validates reason and updates classification/doc', async () => {
    await expect(ApprovalService.rejectDocument(1, 1, { reviewedBy: 9, reason: 'x' })).rejects.toThrow('motivo');

    prismaMock.document.findFirst.mockResolvedValueOnce({ id: 1, classification: { id: 1 } } as any);
    prismaMock.documentClassification.update.mockResolvedValueOnce({} as any);
    prismaMock.document.update.mockResolvedValueOnce({ id: 1, status: 'RECHAZADO' } as any);
    const out = await ApprovalService.rejectDocument(1, 1, { reviewedBy: 9, reason: 'nope', reviewNotes: 'x' });
    expect(out.status).toBe('RECHAZADO');
  });

  it('getApprovalStats aggregates counts by status', async () => {
    prismaMock.document.groupBy.mockResolvedValueOnce([
      { status: 'PENDIENTE_APROBACION', _count: { status: 2 } },
      { status: 'APROBADO', _count: { status: 3 } },
      { status: 'RECHAZADO', _count: { status: 1 } },
    ] as any);
    const out = await ApprovalService.getApprovalStats(1);
    expect(out.total).toBe(6);
    expect(out.pendienteAprobacion).toBe(2);
  });
  describe('Coverage Edge Cases', () => {
    it('approveDocument: throws if entity type missing', async () => {
      prismaMock.document.findFirst.mockResolvedValue({ id: 1, classification: {} } as any);
      await expect(ApprovalService.approveDocument(1, 1, { reviewedBy: 1 } as any))
        .rejects.toThrow('Debe seleccionar la entidad');
    });

    it('rejectDocument: throws if document not found', async () => {
      prismaMock.document.findFirst.mockResolvedValue(null);
      await expect(ApprovalService.rejectDocument(1, 1, { reviewedBy: 1, reason: 'valid' }))
        .rejects.toThrow('Documento no encontrado');
    });

    it('resolveEntityId: creates Camion if not found', async () => {
      prismaMock.document.findFirst.mockResolvedValue({ id: 1, tenantEmpresaId: 1, dadorCargaId: 2, classification: { detectedEntityId: 'AA123AA' } } as any);
      prismaMock.camion.findFirst.mockResolvedValue(null);
      prismaMock.camion.create.mockResolvedValue({ id: 50 } as any);
      prismaMock.documentClassification.update.mockResolvedValue({} as any);
      prismaMock.document.update.mockResolvedValue({ id: 1 } as any);
      prismaMock.documentTemplate.findFirst.mockResolvedValue({ id: 2 } as any);

      await ApprovalService.approveDocument(1, 1, {
        reviewedBy: 1,
        confirmedEntityType: 'CAMION',
        confirmedEntityId: 'AA123AA',
        confirmedExpiration: new Date(),
        confirmedTemplateId: 1
      });

      expect(prismaMock.camion.create).toHaveBeenCalled();
    });

    it('resolveEntityId: creates Acoplado if not found', async () => {
      prismaMock.document.findFirst.mockResolvedValue({ id: 1, tenantEmpresaId: 1, dadorCargaId: 2, classification: { detectedEntityId: 'AA123AC' } } as any);
      prismaMock.acoplado.findFirst.mockResolvedValue(null);
      prismaMock.acoplado.create.mockResolvedValue({ id: 51 } as any);
      prismaMock.documentClassification.update.mockResolvedValue({} as any);
      prismaMock.document.update.mockResolvedValue({ id: 1 } as any);

      await ApprovalService.approveDocument(1, 1, {
        reviewedBy: 1,
        confirmedEntityType: 'ACOPLADO',
        confirmedEntityId: 'AA123AC',
        confirmedExpiration: new Date(),
        confirmedTemplateId: 1
      });

      expect(prismaMock.acoplado.create).toHaveBeenCalled();
    });

    it('calculateIAValidation: handles varied disparities', async () => {
      prismaMock.document.findMany.mockResolvedValueOnce([
        { id: 1, entityType: 'CHOFER', entityId: 1, classification: { disparidades: [{ severidad: 'advertencia' }] }, template: {} },
        { id: 2, entityType: 'CHOFER', entityId: 2, classification: { disparidades: [] }, template: {} },
        { id: 3, entityType: 'CHOFER', entityId: 3, classification: null, template: {} },
      ] as any);
      prismaMock.document.count.mockResolvedValueOnce(3);

      // Mock getEntityNaturalId calls (returns null)
      prismaMock.chofer.findUnique.mockResolvedValue(null);

      const out = await ApprovalService.getPendingDocuments(1);

      const doc1 = out.data.find(d => d.id === 1);
      expect(doc1.iaValidation.disparitiesSeverity).toBe('advertencia');

      const doc2 = out.data.find(d => d.id === 2);
      expect(doc2.iaValidation.hasDisparities).toBe(false);

      const doc3 = out.data.find(d => d.id === 3);
      expect(doc3.iaValidation).toBeNull();
    });



    it('resolveEntityId: creates EmpresaTransportista if not found', async () => {
      prismaMock.document.findFirst.mockResolvedValue({ id: 1, tenantEmpresaId: 1, dadorCargaId: 2, classification: { detectedEntityId: '20123456789' } } as any);
      prismaMock.empresaTransportista.findFirst.mockResolvedValue(null);
      prismaMock.empresaTransportista.create.mockResolvedValue({ id: 99 } as any);
      prismaMock.documentClassification.update.mockResolvedValue({} as any);
      prismaMock.document.update.mockResolvedValue({ id: 1 } as any);

      await ApprovalService.approveDocument(1, 1, {
        reviewedBy: 1, confirmedEntityType: 'EMPRESA_TRANSPORTISTA', confirmedEntityId: '20-12345678-9',
        confirmedExpiration: new Date(), confirmedTemplateId: 1
      });
      expect(prismaMock.empresaTransportista.create).toHaveBeenCalled();
    });

    it('getEntityNaturalId: handles all types via getPendingDocument', async () => {
      // EMPRESA_TRANSPORTISTA
      prismaMock.document.findFirst.mockResolvedValue({ id: 1, entityType: 'EMPRESA_TRANSPORTISTA', entityId: 1, tenantEmpresaId: 1 } as any);
      prismaMock.empresaTransportista.findUnique.mockResolvedValue({ cuit: 'CUIT' } as any);
      let res = await ApprovalService.getPendingDocument(1, 1);
      expect(res.entityNaturalId).toBe('CUIT');

      // CAMION
      prismaMock.document.findFirst.mockResolvedValue({ id: 2, entityType: 'CAMION', entityId: 2, tenantEmpresaId: 1 } as any);
      prismaMock.camion.findUnique.mockResolvedValue({ patente: 'PAT' } as any);
      res = await ApprovalService.getPendingDocument(2, 1);
      expect(res.entityNaturalId).toBe('PAT');

      // ACOPLADO
      prismaMock.document.findFirst.mockResolvedValue({ id: 3, entityType: 'ACOPLADO', entityId: 3, tenantEmpresaId: 1 } as any);
      prismaMock.acoplado.findUnique.mockResolvedValue({ patente: 'PAT2' } as any);
      res = await ApprovalService.getPendingDocument(3, 1);
      expect(res.entityNaturalId).toBe('PAT2');

      // UNKNOWN
      prismaMock.document.findFirst.mockResolvedValue({ id: 4, entityType: 'UNKNOWN', entityId: 4, tenantEmpresaId: 1 } as any);
      res = await ApprovalService.getPendingDocument(4, 1);
      expect(res.entityNaturalId).toBeNull();
    });

    it('renameDocumentInMinio: uses detected ID if confirmed undefined', async () => {
      prismaMock.document.findFirst.mockResolvedValue({ id: 1, tenantEmpresaId: 1, dadorCargaId: 2, classification: { detectedEntityId: '12345678', detectedEntityType: 'CHOFER' }, entityType: 'CHOFER' } as any);
      prismaMock.chofer.findFirst.mockResolvedValue({ id: 10 } as any);
      prismaMock.document.update.mockResolvedValue({ id: 1, entityType: 'CHOFER' } as any);
      prismaMock.documentClassification.update.mockResolvedValue({} as any);
      // Mock doc for rename
      prismaMock.document.findUnique.mockResolvedValue({ filePath: 'b/path/file.pdf', entityId: 1 } as any);

      await ApprovalService.approveDocument(1, 1, {
        reviewedBy: 1,
        confirmedEntityType: 'CHOFER',
        // confirmedEntityId undefined
        confirmedExpiration: new Date(),
        confirmedTemplateId: 1
      });

      expect(minioService.moveObject).toHaveBeenCalled();
    });

    it('handleDeprecationAndRetention: catches delete errors', async () => {
      // Setup for approveDocument to reach handleDeprecationAndRetention
      const expires = new Date();
      prismaMock.document.findFirst.mockResolvedValue({
        id: 1, tenantEmpresaId: 1, classification: { detectedEntityId: '1' }, template: { name: 'T' }
      } as any);
      prismaMock.chofer.findFirst.mockResolvedValue({ id: 1 } as any);
      prismaMock.documentClassification.update.mockResolvedValue({} as any);
      prismaMock.document.update.mockResolvedValue({
        id: 1, entityType: 'CHOFER', expiresAt: expires, templateId: 1
      } as any);

      // Mock findMany for stale docs (empty)
      prismaMock.document.findMany.mockResolvedValueOnce([]);

      // Mock findMany for deprecated docs returning > maxKeep (mocked env returns 1, so 2 docs > 1)
      prismaMock.document.findMany.mockResolvedValueOnce([
        { id: 2, filePath: 'b/f1' }, { id: 3, filePath: 'b/f2' }
      ] as any);

      // Mock minio throw
      (minioService.deleteDocument as jest.Mock).mockRejectedValue(new Error('Minio Error'));
      prismaMock.document.delete.mockRejectedValue(new Error('DB Error'));

      await ApprovalService.approveDocument(1, 1, {
        reviewedBy: 1,
        confirmedEntityType: 'CHOFER',
        confirmedEntityId: '1',
        confirmedExpiration: expires,
        confirmedTemplateId: 1
      });

      expect(minioService.deleteDocument).toHaveBeenCalled();
      // Should not throw
    });
  });
});


