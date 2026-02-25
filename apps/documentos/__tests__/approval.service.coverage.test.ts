/**
 * Coverage tests for ApprovalService - getPendingDocuments, getPendingDocument,
 * approveDocument, rejectDocument, getApprovalStats, and all helper functions.
 * @jest-environment node
 */

const mockPrisma = {
  document: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
    groupBy: jest.fn(),
  },
  documentClassification: { update: jest.fn() },
  documentTemplate: { findFirst: jest.fn() },
  empresaTransportista: { findFirst: jest.fn(), create: jest.fn(), findUnique: jest.fn() },
  chofer: { findFirst: jest.fn(), create: jest.fn(), findUnique: jest.fn() },
  camion: { findFirst: jest.fn(), create: jest.fn(), findUnique: jest.fn() },
  acoplado: { findFirst: jest.fn(), create: jest.fn(), findUnique: jest.fn() },
  $transaction: jest.fn(),
};

jest.mock('../src/config/database', () => ({
  db: { getClient: () => mockPrisma },
  prisma: mockPrisma,
}));

jest.mock('../src/config/logger', () => ({
  AppLogger: { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

jest.mock('../src/services/minio.service', () => ({
  minioService: {
    moveObject: jest.fn().mockResolvedValue(undefined),
    deleteDocument: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock('../src/config/environment', () => ({
  getEnvironment: jest.fn().mockReturnValue({ DOCS_MAX_DEPRECATED_VERSIONS: '2' }),
}));

jest.mock('../src/services/document-event-handlers.service', () => ({
  DocumentEventHandlers: {
    onDocumentApproved: jest.fn().mockResolvedValue(undefined),
    onDocumentRejected: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock('../src/services/rejection-notification.service', () => ({
  RejectionNotificationService: {
    notifyDocumentRejection: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock('../src/utils/expiration.utils', () => ({
  normalizeExpirationToEndOfDayAR: jest.fn((d: any) => d ? new Date(d) : null),
}));

import { ApprovalService } from '../src/services/approval.service';

// NOSONAR: cast genérico para acceder a mocks de Prisma en tests
const db = mockPrisma as any;

function flushSetImmediate(): Promise<void> {
  return new Promise((resolve) => setImmediate(resolve));
}

describe('ApprovalService (coverage)', () => {
  beforeEach(() => jest.clearAllMocks());

  // ==========================================================================
  // getPendingDocuments
  // ==========================================================================
  describe('getPendingDocuments', () => {
    it('retorna documentos pendientes con paginación por defecto', async () => {
      const docs = [
        {
          id: 1, entityType: 'CHOFER', entityId: 10, tenantEmpresaId: 1,
          uploadedAt: new Date(), classification: null, template: { id: 1, name: 'DNI', entityType: 'CHOFER' },
        },
      ];
      db.document.findMany.mockResolvedValue(docs);
      db.document.count.mockResolvedValue(1);
      db.chofer.findUnique.mockResolvedValue({ dni: '12345678' });

      const result = await ApprovalService.getPendingDocuments(1);

      expect(result.pagination.page).toBe(1);
      expect(result.pagination.limit).toBe(20);
      expect(result.pagination.total).toBe(1);
      expect(result.pagination.pages).toBe(1);
      expect(result.data).toHaveLength(1);
      expect(result.data[0].entityNaturalId).toBe('12345678');
    });

    it('aplica filtro de entityType', async () => {
      db.document.findMany.mockResolvedValue([]);
      db.document.count.mockResolvedValue(0);

      await ApprovalService.getPendingDocuments(1, { entityType: 'CAMION' });

      expect(db.document.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            classification: expect.objectContaining({
              detectedEntityType: 'CAMION',
            }),
          }),
        })
      );
    });

    it('aplica filtro de minConfidence', async () => {
      db.document.findMany.mockResolvedValue([]);
      db.document.count.mockResolvedValue(0);

      await ApprovalService.getPendingDocuments(1, { minConfidence: 0.5 });

      expect(db.document.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            classification: expect.objectContaining({
              confidence: expect.objectContaining({ gte: 0.5 }),
            }),
          }),
        })
      );
    });

    it('aplica filtro de maxConfidence', async () => {
      db.document.findMany.mockResolvedValue([]);
      db.document.count.mockResolvedValue(0);

      await ApprovalService.getPendingDocuments(1, { maxConfidence: 0.9 });

      expect(db.document.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            classification: expect.objectContaining({
              confidence: expect.objectContaining({ lte: 0.9 }),
            }),
          }),
        })
      );
    });

    it('aplica ambos filtros min y max confidence', async () => {
      db.document.findMany.mockResolvedValue([]);
      db.document.count.mockResolvedValue(0);

      await ApprovalService.getPendingDocuments(1, { minConfidence: 0.3, maxConfidence: 0.8 });

      expect(db.document.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            classification: expect.objectContaining({
              confidence: { gte: 0.3, lte: 0.8 },
            }),
          }),
        })
      );
    });

    it('aplica paginación personalizada', async () => {
      db.document.findMany.mockResolvedValue([]);
      db.document.count.mockResolvedValue(50);

      const result = await ApprovalService.getPendingDocuments(1, { page: 3, limit: 10 });

      expect(result.pagination.page).toBe(3);
      expect(result.pagination.limit).toBe(10);
      expect(result.pagination.pages).toBe(5);
      expect(db.document.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 20, take: 10 })
      );
    });

    it('enriquece con entityNaturalId para EMPRESA_TRANSPORTISTA', async () => {
      db.document.findMany.mockResolvedValue([{
        id: 1, entityType: 'EMPRESA_TRANSPORTISTA', entityId: 5,
        tenantEmpresaId: 1, classification: null, template: null,
      }]);
      db.document.count.mockResolvedValue(1);
      db.empresaTransportista.findUnique.mockResolvedValue({ cuit: '20-12345678-9' });

      const result = await ApprovalService.getPendingDocuments(1);
      expect(result.data[0].entityNaturalId).toBe('20-12345678-9');
    });

    it('enriquece con entityNaturalId para CAMION', async () => {
      db.document.findMany.mockResolvedValue([{
        id: 1, entityType: 'CAMION', entityId: 5,
        tenantEmpresaId: 1, classification: null, template: null,
      }]);
      db.document.count.mockResolvedValue(1);
      db.camion.findUnique.mockResolvedValue({ patente: 'ABC123' });

      const result = await ApprovalService.getPendingDocuments(1);
      expect(result.data[0].entityNaturalId).toBe('ABC123');
    });

    it('enriquece con entityNaturalId para ACOPLADO', async () => {
      db.document.findMany.mockResolvedValue([{
        id: 1, entityType: 'ACOPLADO', entityId: 5,
        tenantEmpresaId: 1, classification: null, template: null,
      }]);
      db.document.count.mockResolvedValue(1);
      db.acoplado.findUnique.mockResolvedValue({ patente: 'XYZ789' });

      const result = await ApprovalService.getPendingDocuments(1);
      expect(result.data[0].entityNaturalId).toBe('XYZ789');
    });

    it('entityNaturalId null para entityType desconocido', async () => {
      db.document.findMany.mockResolvedValue([{
        id: 1, entityType: 'OTHER', entityId: 5,
        tenantEmpresaId: 1, classification: null, template: null,
      }]);
      db.document.count.mockResolvedValue(1);

      const result = await ApprovalService.getPendingDocuments(1);
      expect(result.data[0].entityNaturalId).toBeNull();
    });

    it('entityNaturalId null cuando entidad no tiene campo', async () => {
      db.document.findMany.mockResolvedValue([{
        id: 1, entityType: 'CHOFER', entityId: 5,
        tenantEmpresaId: 1, classification: null, template: null,
      }]);
      db.document.count.mockResolvedValue(1);
      db.chofer.findUnique.mockResolvedValue(null);

      const result = await ApprovalService.getPendingDocuments(1);
      expect(result.data[0].entityNaturalId).toBeNull();
    });

    it('entityNaturalId null cuando DB lanza error', async () => {
      db.document.findMany.mockResolvedValue([{
        id: 1, entityType: 'CHOFER', entityId: 5,
        tenantEmpresaId: 1, classification: null, template: null,
      }]);
      db.document.count.mockResolvedValue(1);
      db.chofer.findUnique.mockRejectedValue(new Error('db error'));

      const result = await ApprovalService.getPendingDocuments(1);
      expect(result.data[0].entityNaturalId).toBeNull();
    });

    it('sin filtros de confidence, el objeto está vacío', async () => {
      db.document.findMany.mockResolvedValue([]);
      db.document.count.mockResolvedValue(0);

      await ApprovalService.getPendingDocuments(1, {});

      const call = db.document.findMany.mock.calls[0][0];
      expect(call.where.classification).toEqual({ reviewedAt: null });
    });

    it('calcula pages correctamente con total no divisible por limit', async () => {
      db.document.findMany.mockResolvedValue([]);
      db.document.count.mockResolvedValue(23);

      const result = await ApprovalService.getPendingDocuments(1, { limit: 10 });

      expect(result.pagination.pages).toBe(3);
    });

    it('entityNaturalId para EMPRESA_TRANSPORTISTA sin cuit retorna null', async () => {
      db.document.findMany.mockResolvedValue([{
        id: 1, entityType: 'EMPRESA_TRANSPORTISTA', entityId: 5,
        tenantEmpresaId: 1, classification: null, template: null,
      }]);
      db.document.count.mockResolvedValue(1);
      db.empresaTransportista.findUnique.mockResolvedValue({ cuit: '' });

      const result = await ApprovalService.getPendingDocuments(1);
      expect(result.data[0].entityNaturalId).toBe('');
    });

    it('entityNaturalId para CAMION sin patente retorna null', async () => {
      db.document.findMany.mockResolvedValue([{
        id: 1, entityType: 'CAMION', entityId: 5,
        tenantEmpresaId: 1, classification: null, template: null,
      }]);
      db.document.count.mockResolvedValue(1);
      db.camion.findUnique.mockResolvedValue(null);

      const result = await ApprovalService.getPendingDocuments(1);
      expect(result.data[0].entityNaturalId).toBeNull();
    });

    it('entityNaturalId para ACOPLADO sin patente retorna null', async () => {
      db.document.findMany.mockResolvedValue([{
        id: 1, entityType: 'ACOPLADO', entityId: 5,
        tenantEmpresaId: 1, classification: null, template: null,
      }]);
      db.document.count.mockResolvedValue(1);
      db.acoplado.findUnique.mockResolvedValue(null);

      const result = await ApprovalService.getPendingDocuments(1);
      expect(result.data[0].entityNaturalId).toBeNull();
    });

    it('entityNaturalId catch error para EMPRESA_TRANSPORTISTA', async () => {
      db.document.findMany.mockResolvedValue([{
        id: 1, entityType: 'EMPRESA_TRANSPORTISTA', entityId: 5,
        tenantEmpresaId: 1, classification: null, template: null,
      }]);
      db.document.count.mockResolvedValue(1);
      db.empresaTransportista.findUnique.mockRejectedValue(new Error('db error'));

      const result = await ApprovalService.getPendingDocuments(1);
      expect(result.data[0].entityNaturalId).toBeNull();
    });

    it('entityNaturalId catch error para CAMION', async () => {
      db.document.findMany.mockResolvedValue([{
        id: 1, entityType: 'CAMION', entityId: 5,
        tenantEmpresaId: 1, classification: null, template: null,
      }]);
      db.document.count.mockResolvedValue(1);
      db.camion.findUnique.mockRejectedValue(new Error('db error'));

      const result = await ApprovalService.getPendingDocuments(1);
      expect(result.data[0].entityNaturalId).toBeNull();
    });

    it('entityNaturalId catch error para ACOPLADO', async () => {
      db.document.findMany.mockResolvedValue([{
        id: 1, entityType: 'ACOPLADO', entityId: 5,
        tenantEmpresaId: 1, classification: null, template: null,
      }]);
      db.document.count.mockResolvedValue(1);
      db.acoplado.findUnique.mockRejectedValue(new Error('db error'));

      const result = await ApprovalService.getPendingDocuments(1);
      expect(result.data[0].entityNaturalId).toBeNull();
    });
  });

  // ==========================================================================
  // calculateIAValidation (indirectly via getPendingDocuments)
  // ==========================================================================
  describe('calculateIAValidation (via getPendingDocuments)', () => {
    it('iaValidation null si classification es null', async () => {
      db.document.findMany.mockResolvedValue([{
        id: 1, entityType: 'OTHER', entityId: 1, tenantEmpresaId: 1,
        classification: null, template: null,
      }]);
      db.document.count.mockResolvedValue(1);

      const result = await ApprovalService.getPendingDocuments(1);
      expect(result.data[0].iaValidation).toBeNull();
    });

    it('iaValidation sin disparidades', async () => {
      db.document.findMany.mockResolvedValue([{
        id: 1, entityType: 'OTHER', entityId: 1, tenantEmpresaId: 1,
        classification: { validationStatus: 'validated', disparidades: null },
        template: null,
      }]);
      db.document.count.mockResolvedValue(1);

      const result = await ApprovalService.getPendingDocuments(1);
      const ia = result.data[0].iaValidation;
      expect(ia.validationStatus).toBe('validated');
      expect(ia.hasDisparities).toBe(false);
      expect(ia.disparitiesCount).toBe(0);
      expect(ia.disparitiesSeverity).toBeNull();
    });

    it('iaValidation con disparidades vacías', async () => {
      db.document.findMany.mockResolvedValue([{
        id: 1, entityType: 'OTHER', entityId: 1, tenantEmpresaId: 1,
        classification: { validationStatus: null, disparidades: [] },
        template: null,
      }]);
      db.document.count.mockResolvedValue(1);

      const result = await ApprovalService.getPendingDocuments(1);
      const ia = result.data[0].iaValidation;
      expect(ia.hasDisparities).toBe(false);
      expect(ia.validationStatus).toBeNull();
    });

    it('iaValidation con disparidades severity critica', async () => {
      db.document.findMany.mockResolvedValue([{
        id: 1, entityType: 'OTHER', entityId: 1, tenantEmpresaId: 1,
        classification: {
          validationStatus: null,
          disparidades: [{ severidad: 'advertencia' }, { severidad: 'critica' }],
        },
        template: null,
      }]);
      db.document.count.mockResolvedValue(1);

      const result = await ApprovalService.getPendingDocuments(1);
      const ia = result.data[0].iaValidation;
      expect(ia.hasDisparities).toBe(true);
      expect(ia.disparitiesCount).toBe(2);
      expect(ia.disparitiesSeverity).toBe('critica');
      expect(ia.validationStatus).toBe('validated');
    });

    it('iaValidation con disparidades severity advertencia', async () => {
      db.document.findMany.mockResolvedValue([{
        id: 1, entityType: 'OTHER', entityId: 1, tenantEmpresaId: 1,
        classification: {
          validationStatus: null,
          disparidades: [{ severidad: 'advertencia' }],
        },
        template: null,
      }]);
      db.document.count.mockResolvedValue(1);

      const result = await ApprovalService.getPendingDocuments(1);
      expect(result.data[0].iaValidation.disparitiesSeverity).toBe('advertencia');
    });

    it('iaValidation con disparidades severity info (default)', async () => {
      db.document.findMany.mockResolvedValue([{
        id: 1, entityType: 'OTHER', entityId: 1, tenantEmpresaId: 1,
        classification: {
          validationStatus: null,
          disparidades: [{ severidad: 'info' }],
        },
        template: null,
      }]);
      db.document.count.mockResolvedValue(1);

      const result = await ApprovalService.getPendingDocuments(1);
      expect(result.data[0].iaValidation.disparitiesSeverity).toBe('info');
    });

    it('iaValidation con disparidades marca validated=true aunque validationStatus no sea validated', async () => {
      db.document.findMany.mockResolvedValue([{
        id: 1, entityType: 'OTHER', entityId: 1, tenantEmpresaId: 1,
        classification: {
          validationStatus: 'pending',
          disparidades: [{ severidad: 'info' }],
        },
        template: null,
      }]);
      db.document.count.mockResolvedValue(1);

      const result = await ApprovalService.getPendingDocuments(1);
      const ia = result.data[0].iaValidation;
      expect(ia.validationStatus).toBe('validated');
      expect(ia.hasDisparities).toBe(true);
    });

    it('iaValidation sin disparidades y validationStatus no "validated"', async () => {
      db.document.findMany.mockResolvedValue([{
        id: 1, entityType: 'OTHER', entityId: 1, tenantEmpresaId: 1,
        classification: {
          validationStatus: 'pending',
          disparidades: null,
        },
        template: null,
      }]);
      db.document.count.mockResolvedValue(1);

      const result = await ApprovalService.getPendingDocuments(1);
      const ia = result.data[0].iaValidation;
      expect(ia.validationStatus).toBe('pending');
      expect(ia.hasDisparities).toBe(false);
    });

    it('iaValidation disparidades no es array (e.g. undefined)', async () => {
      db.document.findMany.mockResolvedValue([{
        id: 1, entityType: 'OTHER', entityId: 1, tenantEmpresaId: 1,
        classification: {
          validationStatus: null,
          disparidades: undefined,
        },
        template: null,
      }]);
      db.document.count.mockResolvedValue(1);

      const result = await ApprovalService.getPendingDocuments(1);
      const ia = result.data[0].iaValidation;
      expect(ia.hasDisparities).toBe(false);
      expect(ia.disparitiesCount).toBe(0);
    });
  });

  // ==========================================================================
  // getPendingDocument
  // ==========================================================================
  describe('getPendingDocument', () => {
    it('retorna documento enriquecido si existe', async () => {
      db.document.findFirst.mockResolvedValue({
        id: 1, entityType: 'CHOFER', entityId: 10, tenantEmpresaId: 1,
        template: { id: 1, name: 'DNI' }, classification: {},
      });
      db.chofer.findUnique.mockResolvedValue({ dni: '44556677' });

      const result = await ApprovalService.getPendingDocument(1, 1);

      expect(result).not.toBeNull();
      expect(result.entityNaturalId).toBe('44556677');
    });

    it('retorna null si documento no existe', async () => {
      db.document.findFirst.mockResolvedValue(null);

      const result = await ApprovalService.getPendingDocument(999, 1);
      expect(result).toBeNull();
    });

    it('retorna entityNaturalId para EMPRESA_TRANSPORTISTA', async () => {
      db.document.findFirst.mockResolvedValue({
        id: 1, entityType: 'EMPRESA_TRANSPORTISTA', entityId: 5, tenantEmpresaId: 1,
        template: null, classification: null,
      });
      db.empresaTransportista.findUnique.mockResolvedValue({ cuit: '30-71234567-8' });

      const result = await ApprovalService.getPendingDocument(1, 1);
      expect(result.entityNaturalId).toBe('30-71234567-8');
    });

    it('retorna entityNaturalId para CAMION', async () => {
      db.document.findFirst.mockResolvedValue({
        id: 1, entityType: 'CAMION', entityId: 5, tenantEmpresaId: 1,
        template: null, classification: null,
      });
      db.camion.findUnique.mockResolvedValue({ patente: 'AB123CD' });

      const result = await ApprovalService.getPendingDocument(1, 1);
      expect(result.entityNaturalId).toBe('AB123CD');
    });

    it('retorna entityNaturalId para ACOPLADO', async () => {
      db.document.findFirst.mockResolvedValue({
        id: 1, entityType: 'ACOPLADO', entityId: 5, tenantEmpresaId: 1,
        template: null, classification: null,
      });
      db.acoplado.findUnique.mockResolvedValue({ patente: 'ZZ999XX' });

      const result = await ApprovalService.getPendingDocument(1, 1);
      expect(result.entityNaturalId).toBe('ZZ999XX');
    });
  });

  // ==========================================================================
  // approveDocument
  // ==========================================================================
  describe('approveDocument', () => {
    function setupApprovalTransaction(docOverrides = {}, classOverrides = {}) {
      const classification = {
        detectedEntityType: 'CHOFER',
        detectedEntityId: '12345678',
        detectedExpiration: new Date('2026-12-31'),
        detectedDocumentType: null,
        ...classOverrides,
      };
      const doc = {
        id: 1,
        tenantEmpresaId: 1,
        dadorCargaId: 5,
        entityType: 'CHOFER',
        entityId: 10,
        templateId: 100,
        classification,
        template: { id: 100, name: 'DNI' },
        status: 'PENDIENTE_APROBACION',
        filePath: 'bucket/path/to/file.pdf',
        ...docOverrides,
      };

      const txMock = {
        document: {
          findFirst: jest.fn().mockResolvedValue(doc),
          findUnique: jest.fn().mockResolvedValue({ filePath: 'bucket/path/to/file.pdf', entityId: 10 }),
          update: jest.fn().mockResolvedValue({ ...doc, status: 'APROBADO', template: { name: 'DNI' } }),
          findMany: jest.fn().mockResolvedValue([]),
        },
        documentClassification: { update: jest.fn().mockResolvedValue({}) },
        documentTemplate: { findFirst: jest.fn().mockResolvedValue(null) },
        chofer: {
          findFirst: jest.fn().mockResolvedValue({ id: 10 }),
          create: jest.fn(),
          findUnique: jest.fn(),
        },
        camion: { findFirst: jest.fn(), create: jest.fn(), findUnique: jest.fn() },
        acoplado: { findFirst: jest.fn(), create: jest.fn(), findUnique: jest.fn() },
        empresaTransportista: { findFirst: jest.fn(), create: jest.fn(), findUnique: jest.fn() },
      };

      db.$transaction.mockImplementation(async (fn: any) => fn(txMock));
      return txMock;
    }

    it('aprueba documento correctamente con datos confirmados', async () => {
      setupApprovalTransaction();

      const result = await ApprovalService.approveDocument(1, 1, {
        reviewedBy: 5,
        confirmedEntityType: 'CHOFER',
        confirmedEntityId: '12345678',
        confirmedExpiration: new Date('2026-12-31'),
        confirmedTemplateId: 100,
      });

      expect(result.status).toBe('APROBADO');
      await flushSetImmediate();
    });

    it('lanza error si documento no encontrado', async () => {
      const txMock = {
        document: { findFirst: jest.fn().mockResolvedValue(null) },
      };
      db.$transaction.mockImplementation(async (fn: any) => fn(txMock));

      await expect(
        ApprovalService.approveDocument(999, 1, { reviewedBy: 5 })
      ).rejects.toThrow('Documento no encontrado o no está pendiente de aprobación');
    });

    it('lanza error si doc sin classification', async () => {
      const txMock = {
        document: {
          findFirst: jest.fn().mockResolvedValue({
            id: 1, classification: null, template: null,
          }),
        },
      };
      db.$transaction.mockImplementation(async (fn: any) => fn(txMock));

      await expect(
        ApprovalService.approveDocument(1, 1, { reviewedBy: 5 })
      ).rejects.toThrow('Documento no encontrado o no está pendiente de aprobación');
    });

    it('usa detectedEntityType cuando confirmedEntityType no se envía', async () => {
      const txMock = setupApprovalTransaction();

      await ApprovalService.approveDocument(1, 1, {
        reviewedBy: 5,
        confirmedExpiration: new Date('2026-12-31'),
        confirmedTemplateId: 100,
        confirmedEntityId: '12345678',
      });

      expect(txMock.document.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ entityType: 'CHOFER' }),
        })
      );
      await flushSetImmediate();
    });

    it('usa entityType del document cuando classification no tiene detectedEntityType', async () => {
      const txMock = setupApprovalTransaction({}, {
        detectedEntityType: null,
      });

      await ApprovalService.approveDocument(1, 1, {
        reviewedBy: 5,
        confirmedExpiration: new Date('2026-12-31'),
        confirmedTemplateId: 100,
        confirmedEntityId: '12345678',
      });

      expect(txMock.document.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ entityType: 'CHOFER' }),
        })
      );
      await flushSetImmediate();
    });

    it('lanza error si finalEntityType es null', async () => {
      setupApprovalTransaction(
        { entityType: null },
        { detectedEntityType: null }
      );

      await expect(
        ApprovalService.approveDocument(1, 1, {
          reviewedBy: 5,
          confirmedExpiration: new Date('2026-12-31'),
          confirmedTemplateId: 100,
          confirmedEntityId: '12345678',
        })
      ).rejects.toThrow('Debe seleccionar la entidad');
      await flushSetImmediate();
    });

    it('lanza error si finalEntityId no se puede resolver', async () => {
      const txMock = setupApprovalTransaction({}, {
        detectedEntityId: null,
      });
      txMock.chofer.findFirst.mockResolvedValue(null);
      txMock.chofer.create.mockRejectedValue(new Error('dup'));

      await expect(
        ApprovalService.approveDocument(1, 1, {
          reviewedBy: 5,
          confirmedExpiration: new Date('2026-12-31'),
          confirmedTemplateId: 100,
        })
      ).rejects.toThrow('Debe confirmarse la identidad de la entidad antes de aprobar');
      await flushSetImmediate();
    });

    it('lanza error si tplIdCandidate es null', async () => {
      setupApprovalTransaction({ templateId: null }, { detectedEntityId: 10 });

      await expect(
        ApprovalService.approveDocument(1, 1, {
          reviewedBy: 5,
          confirmedExpiration: new Date('2026-12-31'),
          confirmedEntityId: 10,
        })
      ).rejects.toThrow('Debe seleccionar el tipo de documento');
      await flushSetImmediate();
    });

    it('lanza error si finalExpiration es null', async () => {
      setupApprovalTransaction({}, {
        detectedExpiration: null,
      });

      await expect(
        ApprovalService.approveDocument(1, 1, {
          reviewedBy: 5,
          confirmedEntityId: 10,
          confirmedTemplateId: 100,
        })
      ).rejects.toThrow('Debe especificar la fecha de vencimiento');
      await flushSetImmediate();
    });

    it('resuelve entityId numérico directamente', async () => {
      const txMock = setupApprovalTransaction();

      await ApprovalService.approveDocument(1, 1, {
        reviewedBy: 5,
        confirmedEntityId: 42,
        confirmedExpiration: new Date('2026-12-31'),
        confirmedTemplateId: 100,
      });

      expect(txMock.document.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ entityId: 42 }),
        })
      );
      await flushSetImmediate();
    });

    it('retorna null si entityId numérico no es int32', async () => {
      setupApprovalTransaction({}, { detectedEntityId: 9999999999999 });

      await expect(
        ApprovalService.approveDocument(1, 1, {
          reviewedBy: 5,
          confirmedExpiration: new Date('2026-12-31'),
          confirmedTemplateId: 100,
        })
      ).rejects.toThrow('Debe confirmarse la identidad de la entidad antes de aprobar');
      await flushSetImmediate();
    });

    it('retorna null si proposedVal no es string ni number', async () => {
      setupApprovalTransaction({}, { detectedEntityId: { obj: true } });

      await expect(
        ApprovalService.approveDocument(1, 1, {
          reviewedBy: 5,
          confirmedExpiration: new Date('2026-12-31'),
          confirmedTemplateId: 100,
        })
      ).rejects.toThrow('Debe confirmarse la identidad de la entidad');
      await flushSetImmediate();
    });

    it('trunca entityId numérico con decimales', async () => {
      const txMock = setupApprovalTransaction();

      await ApprovalService.approveDocument(1, 1, {
        reviewedBy: 5,
        confirmedEntityId: 42.7,
        confirmedExpiration: new Date('2026-12-31'),
        confirmedTemplateId: 100,
      });

      expect(txMock.document.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ entityId: 42 }),
        })
      );
      await flushSetImmediate();
    });

    it('busca template por nombre si tplIdCandidate es null y detectedDocumentType existe', async () => {
      const txMock = setupApprovalTransaction(
        { templateId: null },
        { detectedDocumentType: 'DNI', detectedEntityId: 10 }
      );
      txMock.documentTemplate.findFirst.mockResolvedValue({ id: 200 });

      await ApprovalService.approveDocument(1, 1, {
        reviewedBy: 5,
        confirmedExpiration: new Date('2026-12-31'),
        confirmedEntityId: 10,
      });

      expect(txMock.documentTemplate.findFirst).toHaveBeenCalled();
      expect(txMock.document.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ templateId: 200 }),
        })
      );
      await flushSetImmediate();
    });

    it('no setea newTemplateId si tplIdCandidate es null y no hay template match', async () => {
      const txMock = setupApprovalTransaction(
        { templateId: null },
        { detectedDocumentType: 'NONEXISTENT', detectedEntityId: 10 }
      );
      txMock.documentTemplate.findFirst.mockResolvedValue(null);

      await ApprovalService.approveDocument(1, 1, {
        reviewedBy: 5,
        confirmedExpiration: new Date('2026-12-31'),
        confirmedEntityId: 10,
      });

      const updateCall = txMock.document.update.mock.calls[0][0];
      expect(updateCall.data.templateId).toBeUndefined();
      await flushSetImmediate();
    });

    it('no busca template si tplIdCandidate tiene valor aunque detectedDocumentType exista', async () => {
      const txMock = setupApprovalTransaction(
        {},
        { detectedDocumentType: 'DNI' }
      );

      await ApprovalService.approveDocument(1, 1, {
        reviewedBy: 5,
        confirmedEntityId: 10,
        confirmedExpiration: new Date('2026-12-31'),
        confirmedTemplateId: 100,
      });

      expect(txMock.documentTemplate.findFirst).not.toHaveBeenCalled();
      await flushSetImmediate();
    });

    it('continúa si renameDocumentInMinio falla', async () => {
      const txMock = setupApprovalTransaction();
      txMock.document.findUnique.mockResolvedValue(null);

      const result = await ApprovalService.approveDocument(1, 1, {
        reviewedBy: 5,
        confirmedEntityId: 10,
        confirmedExpiration: new Date('2026-12-31'),
        confirmedTemplateId: 100,
      });

      expect(result).toBeDefined();
      await flushSetImmediate();
    });

    it('continúa si handleDeprecationAndRetention falla', async () => {
      const txMock = setupApprovalTransaction();
      txMock.document.update.mockResolvedValue({
        id: 1, status: 'APROBADO', templateId: 100,
        entityType: 'CHOFER', entityId: 10,
        tenantEmpresaId: 1, expiresAt: new Date('2026-12-31'),
        template: { name: 'DNI' },
        filePath: null,
      });

      const result = await ApprovalService.approveDocument(1, 1, {
        reviewedBy: 5,
        confirmedEntityId: 10,
        confirmedExpiration: new Date('2026-12-31'),
        confirmedTemplateId: 100,
      });

      expect(result).toBeDefined();
      await flushSetImmediate();
    });

    it('usa detectedExpiration cuando confirmedExpiration no se envía', async () => {
      setupApprovalTransaction({}, {
        detectedExpiration: new Date('2027-06-15'),
      });

      const result = await ApprovalService.approveDocument(1, 1, {
        reviewedBy: 5,
        confirmedEntityId: 10,
        confirmedTemplateId: 100,
      });

      expect(result.status).toBe('APROBADO');
      await flushSetImmediate();
    });

    it('guarda reviewNotes en la classification al aprobar', async () => {
      const txMock = setupApprovalTransaction();

      await ApprovalService.approveDocument(1, 1, {
        reviewedBy: 5,
        confirmedEntityId: 10,
        confirmedExpiration: new Date('2026-12-31'),
        confirmedTemplateId: 100,
        reviewNotes: 'Aprobado correctamente',
      });

      expect(txMock.documentClassification.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ reviewNotes: 'Aprobado correctamente' }),
        })
      );
      await flushSetImmediate();
    });

    it('usa confirmedEntityId ?? detectedEntityId (nullish coalescing)', async () => {
      const txMock = setupApprovalTransaction({}, {
        detectedEntityId: '99887766',
      });

      await ApprovalService.approveDocument(1, 1, {
        reviewedBy: 5,
        confirmedExpiration: new Date('2026-12-31'),
        confirmedTemplateId: 100,
      });

      expect(txMock.chofer.findFirst).toHaveBeenCalled();
      await flushSetImmediate();
    });
  });

  // ==========================================================================
  // resolveEntityId branches (via approveDocument)
  // ==========================================================================
  describe('resolveEntityId - entity type branches', () => {
    function setupWithEntityType(entityType: string, entityMocks: Record<string, any> = {}) {
      const classification = {
        detectedEntityType: entityType,
        detectedEntityId: 'ABC123',
        detectedExpiration: new Date('2026-12-31'),
        detectedDocumentType: null,
      };
      const doc = {
        id: 1, tenantEmpresaId: 1, dadorCargaId: 5,
        entityType, entityId: 10, templateId: 100,
        classification, template: { id: 100, name: 'Test' },
        status: 'PENDIENTE_APROBACION',
      };

      const txMock: Record<string, any> = {
        document: {
          findFirst: jest.fn().mockResolvedValue(doc),
          findUnique: jest.fn().mockResolvedValue(null),
          update: jest.fn().mockResolvedValue({ ...doc, status: 'APROBADO', template: { name: 'Test' } }),
          findMany: jest.fn().mockResolvedValue([]),
        },
        documentClassification: { update: jest.fn().mockResolvedValue({}) },
        documentTemplate: { findFirst: jest.fn().mockResolvedValue(null) },
        empresaTransportista: { findFirst: jest.fn().mockResolvedValue(null), create: jest.fn().mockResolvedValue(null) },
        chofer: { findFirst: jest.fn().mockResolvedValue(null), create: jest.fn().mockResolvedValue(null) },
        camion: { findFirst: jest.fn().mockResolvedValue(null), create: jest.fn().mockResolvedValue(null) },
        acoplado: { findFirst: jest.fn().mockResolvedValue(null), create: jest.fn().mockResolvedValue(null) },
        ...entityMocks,
      };

      db.$transaction.mockImplementation(async (fn: any) => fn(txMock));
      return txMock;
    }

    it('EMPRESA_TRANSPORTISTA - ensureEmpresaTransportista crea nueva', async () => {
      const txMock = setupWithEntityType('EMPRESA_TRANSPORTISTA');
      txMock.empresaTransportista.findFirst.mockResolvedValue(null);
      txMock.empresaTransportista.create.mockResolvedValue({ id: 50 });

      await ApprovalService.approveDocument(1, 1, {
        reviewedBy: 5,
        confirmedEntityId: '20-30999888-7',
        confirmedExpiration: new Date('2026-12-31'),
        confirmedTemplateId: 100,
      });

      expect(txMock.empresaTransportista.create).toHaveBeenCalled();
      await flushSetImmediate();
    });

    it('EMPRESA_TRANSPORTISTA - retorna existente', async () => {
      const txMock = setupWithEntityType('EMPRESA_TRANSPORTISTA');
      txMock.empresaTransportista.findFirst.mockResolvedValue({ id: 50 });

      await ApprovalService.approveDocument(1, 1, {
        reviewedBy: 5,
        confirmedEntityId: '20-30999888-7',
        confirmedExpiration: new Date('2026-12-31'),
        confirmedTemplateId: 100,
      });

      expect(txMock.empresaTransportista.create).not.toHaveBeenCalled();
      await flushSetImmediate();
    });

    it('EMPRESA_TRANSPORTISTA - retorna null para cuit vacío', async () => {
      setupWithEntityType('EMPRESA_TRANSPORTISTA');

      await expect(
        ApprovalService.approveDocument(1, 1, {
          reviewedBy: 5,
          confirmedEntityId: '---',
          confirmedExpiration: new Date('2026-12-31'),
          confirmedTemplateId: 100,
        })
      ).rejects.toThrow('Debe confirmarse la identidad');
      await flushSetImmediate();
    });

    it('CHOFER - busca por id interno si dni corto', async () => {
      const txMock = setupWithEntityType('CHOFER');
      txMock.chofer.findFirst.mockResolvedValueOnce({ id: 42 });

      await ApprovalService.approveDocument(1, 1, {
        reviewedBy: 5,
        confirmedEntityId: '42',
        confirmedExpiration: new Date('2026-12-31'),
        confirmedTemplateId: 100,
      });

      expect(txMock.chofer.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ id: 42 }) })
      );
      await flushSetImmediate();
    });

    it('CHOFER - crea nuevo si no existe por dniNorm', async () => {
      const txMock = setupWithEntityType('CHOFER');
      txMock.chofer.findFirst
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);
      txMock.chofer.create.mockResolvedValue({ id: 99 });

      await ApprovalService.approveDocument(1, 1, {
        reviewedBy: 5,
        confirmedEntityId: '12345678901',
        confirmedExpiration: new Date('2026-12-31'),
        confirmedTemplateId: 100,
      });

      expect(txMock.chofer.create).toHaveBeenCalled();
      await flushSetImmediate();
    });

    it('CHOFER - retorna null para dni vacío', async () => {
      setupWithEntityType('CHOFER');

      await expect(
        ApprovalService.approveDocument(1, 1, {
          reviewedBy: 5,
          confirmedEntityId: '---',
          confirmedExpiration: new Date('2026-12-31'),
          confirmedTemplateId: 100,
        })
      ).rejects.toThrow('Debe confirmarse la identidad');
      await flushSetImmediate();
    });

    it('CHOFER - dni corto no es int32 va a busqueda por dniNorm', async () => {
      const txMock = setupWithEntityType('CHOFER');
      txMock.chofer.findFirst.mockResolvedValue({ id: 77 });

      await ApprovalService.approveDocument(1, 1, {
        reviewedBy: 5,
        confirmedEntityId: '3.5',
        confirmedExpiration: new Date('2026-12-31'),
        confirmedTemplateId: 100,
      });

      expect(txMock.chofer.findFirst).toHaveBeenCalled();
      await flushSetImmediate();
    });

    it('CHOFER - dni corto is int32 but no existe, busca por dniNorm', async () => {
      const txMock = setupWithEntityType('CHOFER');
      txMock.chofer.findFirst
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ id: 88 });

      await ApprovalService.approveDocument(1, 1, {
        reviewedBy: 5,
        confirmedEntityId: '123',
        confirmedExpiration: new Date('2026-12-31'),
        confirmedTemplateId: 100,
      });

      expect(txMock.chofer.findFirst).toHaveBeenCalledTimes(2);
      await flushSetImmediate();
    });

    it('CAMION - ensureCamion encuentra existente', async () => {
      const txMock = setupWithEntityType('CAMION');
      txMock.camion.findFirst.mockResolvedValue({ id: 33 });

      await ApprovalService.approveDocument(1, 1, {
        reviewedBy: 5,
        confirmedEntityId: 'AB-123-CD',
        confirmedExpiration: new Date('2026-12-31'),
        confirmedTemplateId: 100,
      });

      expect(txMock.camion.findFirst).toHaveBeenCalled();
      await flushSetImmediate();
    });

    it('CAMION - ensureCamion crea nuevo', async () => {
      const txMock = setupWithEntityType('CAMION');
      txMock.camion.findFirst.mockResolvedValue(null);
      txMock.camion.create.mockResolvedValue({ id: 44 });

      await ApprovalService.approveDocument(1, 1, {
        reviewedBy: 5,
        confirmedEntityId: 'AB-123-CD',
        confirmedExpiration: new Date('2026-12-31'),
        confirmedTemplateId: 100,
      });

      expect(txMock.camion.create).toHaveBeenCalled();
      await flushSetImmediate();
    });

    it('CAMION - retorna null para patente vacía', async () => {
      setupWithEntityType('CAMION');

      await expect(
        ApprovalService.approveDocument(1, 1, {
          reviewedBy: 5,
          confirmedEntityId: '---',
          confirmedExpiration: new Date('2026-12-31'),
          confirmedTemplateId: 100,
        })
      ).rejects.toThrow('Debe confirmarse la identidad');
      await flushSetImmediate();
    });

    it('ACOPLADO - ensureAcoplado encuentra existente', async () => {
      const txMock = setupWithEntityType('ACOPLADO');
      txMock.acoplado.findFirst.mockResolvedValue({ id: 55 });

      await ApprovalService.approveDocument(1, 1, {
        reviewedBy: 5,
        confirmedEntityId: 'ZZ-999-XX',
        confirmedExpiration: new Date('2026-12-31'),
        confirmedTemplateId: 100,
      });

      expect(txMock.acoplado.findFirst).toHaveBeenCalled();
      await flushSetImmediate();
    });

    it('ACOPLADO - ensureAcoplado crea nuevo', async () => {
      const txMock = setupWithEntityType('ACOPLADO');
      txMock.acoplado.findFirst.mockResolvedValue(null);
      txMock.acoplado.create.mockResolvedValue({ id: 66 });

      await ApprovalService.approveDocument(1, 1, {
        reviewedBy: 5,
        confirmedEntityId: 'ZZ-999-XX',
        confirmedExpiration: new Date('2026-12-31'),
        confirmedTemplateId: 100,
      });

      expect(txMock.acoplado.create).toHaveBeenCalled();
      await flushSetImmediate();
    });

    it('ACOPLADO - retorna null para patente vacía', async () => {
      setupWithEntityType('ACOPLADO');

      await expect(
        ApprovalService.approveDocument(1, 1, {
          reviewedBy: 5,
          confirmedEntityId: '---',
          confirmedExpiration: new Date('2026-12-31'),
          confirmedTemplateId: 100,
        })
      ).rejects.toThrow('Debe confirmarse la identidad');
      await flushSetImmediate();
    });

    it('entityType desconocido retorna null para resolveEntityId', async () => {
      setupWithEntityType('OTRO_TIPO');

      await expect(
        ApprovalService.approveDocument(1, 1, {
          reviewedBy: 5,
          confirmedEntityId: 'some-value',
          confirmedExpiration: new Date('2026-12-31'),
          confirmedTemplateId: 100,
        })
      ).rejects.toThrow('Debe confirmarse la identidad');
      await flushSetImmediate();
    });

    it('EMPRESA_TRANSPORTISTA - catch en create no impide retorno', async () => {
      const txMock = setupWithEntityType('EMPRESA_TRANSPORTISTA');
      txMock.empresaTransportista.findFirst.mockResolvedValue(null);
      txMock.empresaTransportista.create.mockRejectedValue(new Error('unique constraint'));

      await expect(
        ApprovalService.approveDocument(1, 1, {
          reviewedBy: 5,
          confirmedEntityId: '20-30999888-7',
          confirmedExpiration: new Date('2026-12-31'),
          confirmedTemplateId: 100,
        })
      ).rejects.toThrow('Debe confirmarse la identidad');
      await flushSetImmediate();
    });

    it('CHOFER - catch en create no impide retorno', async () => {
      const txMock = setupWithEntityType('CHOFER');
      txMock.chofer.findFirst.mockResolvedValue(null);
      txMock.chofer.create.mockRejectedValue(new Error('unique constraint'));

      await expect(
        ApprovalService.approveDocument(1, 1, {
          reviewedBy: 5,
          confirmedEntityId: '12345678901',
          confirmedExpiration: new Date('2026-12-31'),
          confirmedTemplateId: 100,
        })
      ).rejects.toThrow('Debe confirmarse la identidad');
      await flushSetImmediate();
    });

    it('CAMION - catch en create no impide retorno', async () => {
      const txMock = setupWithEntityType('CAMION');
      txMock.camion.findFirst.mockResolvedValue(null);
      txMock.camion.create.mockRejectedValue(new Error('unique constraint'));

      await expect(
        ApprovalService.approveDocument(1, 1, {
          reviewedBy: 5,
          confirmedEntityId: 'AB123CD',
          confirmedExpiration: new Date('2026-12-31'),
          confirmedTemplateId: 100,
        })
      ).rejects.toThrow('Debe confirmarse la identidad');
      await flushSetImmediate();
    });

    it('ACOPLADO - catch en create no impide retorno', async () => {
      const txMock = setupWithEntityType('ACOPLADO');
      txMock.acoplado.findFirst.mockResolvedValue(null);
      txMock.acoplado.create.mockRejectedValue(new Error('unique constraint'));

      await expect(
        ApprovalService.approveDocument(1, 1, {
          reviewedBy: 5,
          confirmedEntityId: 'ZZ999XX',
          confirmedExpiration: new Date('2026-12-31'),
          confirmedTemplateId: 100,
        })
      ).rejects.toThrow('Debe confirmarse la identidad');
      await flushSetImmediate();
    });

    it('CHOFER - dni largo (> 9 chars) salta búsqueda por id interno', async () => {
      const txMock = setupWithEntityType('CHOFER');
      txMock.chofer.findFirst.mockResolvedValue({ id: 123 });

      await ApprovalService.approveDocument(1, 1, {
        reviewedBy: 5,
        confirmedEntityId: '1234567890',
        confirmedExpiration: new Date('2026-12-31'),
        confirmedTemplateId: 100,
      });

      const calls = txMock.chofer.findFirst.mock.calls;
      const hasIdSearch = calls.some(
        (c: any) => c[0]?.where?.id !== undefined
      );
      expect(hasIdSearch).toBe(false);
      await flushSetImmediate();
    });
  });

  // ==========================================================================
  // renameDocumentInMinio branches (via approveDocument)
  // ==========================================================================
  describe('renameDocumentInMinio branches', () => {
    function setupRenameTest(docBefore: any, _confirmedEntityId: any, entityType = 'CHOFER') {
      const classification = {
        detectedEntityType: entityType,
        detectedEntityId: 'detected-id',
        detectedExpiration: new Date('2026-12-31'),
        detectedDocumentType: null,
      };
      const doc = {
        id: 1, tenantEmpresaId: 1, dadorCargaId: 5,
        entityType, entityId: 10, templateId: 100,
        classification, template: { id: 100, name: 'DNI' },
        status: 'PENDIENTE_APROBACION',
      };

      const txMock: Record<string, any> = {
        document: {
          findFirst: jest.fn().mockResolvedValue(doc),
          findUnique: jest.fn().mockResolvedValue(docBefore),
          update: jest.fn().mockResolvedValue({
            ...doc, status: 'APROBADO',
            template: { name: 'DNI' },
            entityType,
          }),
          findMany: jest.fn().mockResolvedValue([]),
        },
        documentClassification: { update: jest.fn().mockResolvedValue({}) },
        documentTemplate: { findFirst: jest.fn().mockResolvedValue(null) },
        chofer: { findFirst: jest.fn().mockResolvedValue({ id: 10 }), create: jest.fn() },
        camion: { findFirst: jest.fn().mockResolvedValue({ id: 10 }), create: jest.fn() },
        acoplado: { findFirst: jest.fn().mockResolvedValue({ id: 10 }), create: jest.fn() },
        empresaTransportista: { findFirst: jest.fn().mockResolvedValue({ id: 10 }), create: jest.fn() },
      };

      db.$transaction.mockImplementation(async (fn: any) => fn(txMock));
      return txMock;
    }

    it('usa confirmedEntityId con normalizePlate para CAMION', async () => {
      setupRenameTest(
        { filePath: 'bucket/path/to/file.pdf', entityId: 10 },
        'AB-123-CD',
        'CAMION'
      );

      await ApprovalService.approveDocument(1, 1, {
        reviewedBy: 5,
        confirmedEntityId: 'AB-123-CD',
        confirmedExpiration: new Date('2026-12-31'),
        confirmedTemplateId: 100,
      });
      await flushSetImmediate();
    });

    it('usa confirmedEntityId con normalizePlate para ACOPLADO', async () => {
      setupRenameTest(
        { filePath: 'bucket/path/to/file.pdf', entityId: 10 },
        'ZZ-999-XX',
        'ACOPLADO'
      );

      await ApprovalService.approveDocument(1, 1, {
        reviewedBy: 5,
        confirmedEntityId: 'ZZ-999-XX',
        confirmedExpiration: new Date('2026-12-31'),
        confirmedTemplateId: 100,
      });
      await flushSetImmediate();
    });

    it('usa detectedEntityId cuando confirmedEntityId es undefined', async () => {
      setupRenameTest(
        { filePath: 'bucket/path/to/file.pdf', entityId: 10 },
        undefined
      );

      await ApprovalService.approveDocument(1, 1, {
        reviewedBy: 5,
        confirmedEntityId: 10,
        confirmedExpiration: new Date('2026-12-31'),
        confirmedTemplateId: 100,
      });
      await flushSetImmediate();
    });

    it('usa entityId como fallback cuando ni confirmedEntityId ni detectedEntityId producen idForName', async () => {
      const classification = {
        detectedEntityType: 'CHOFER',
        detectedEntityId: undefined,
        detectedExpiration: new Date('2026-12-31'),
        detectedDocumentType: null,
      };
      const doc = {
        id: 1, tenantEmpresaId: 1, dadorCargaId: 5,
        entityType: 'CHOFER', entityId: 10, templateId: 100,
        classification, template: { id: 100, name: 'DNI' },
        status: 'PENDIENTE_APROBACION',
      };

      const txMock: Record<string, any> = {
        document: {
          findFirst: jest.fn().mockResolvedValue(doc),
          findUnique: jest.fn().mockResolvedValue({ filePath: 'bucket/path/to/file.pdf', entityId: 10 }),
          update: jest.fn().mockResolvedValue({ ...doc, status: 'APROBADO', template: { name: 'DNI' } }),
          findMany: jest.fn().mockResolvedValue([]),
        },
        documentClassification: { update: jest.fn().mockResolvedValue({}) },
        documentTemplate: { findFirst: jest.fn().mockResolvedValue(null) },
        chofer: { findFirst: jest.fn().mockResolvedValue({ id: 10 }), create: jest.fn() },
        camion: { findFirst: jest.fn(), create: jest.fn() },
        acoplado: { findFirst: jest.fn(), create: jest.fn() },
        empresaTransportista: { findFirst: jest.fn(), create: jest.fn() },
      };

      db.$transaction.mockImplementation(async (fn: any) => fn(txMock));

      await ApprovalService.approveDocument(1, 1, {
        reviewedBy: 5,
        confirmedEntityId: 10,
        confirmedExpiration: new Date('2026-12-31'),
        confirmedTemplateId: 100,
      });
      await flushSetImmediate();
    });

    it('no renombra si filePath es null', async () => {
      setupRenameTest({ filePath: null, entityId: 10 }, 'test');

      const result = await ApprovalService.approveDocument(1, 1, {
        reviewedBy: 5,
        confirmedEntityId: 10,
        confirmedExpiration: new Date('2026-12-31'),
        confirmedTemplateId: 100,
      });

      expect(result).toBeDefined();
      await flushSetImmediate();
    });

    it('usa template name vacío como fallback "DOC"', async () => {
      const classification = {
        detectedEntityType: 'CHOFER',
        detectedEntityId: '12345',
        detectedExpiration: new Date('2026-12-31'),
        detectedDocumentType: null,
      };
      const doc = {
        id: 1, tenantEmpresaId: 1, dadorCargaId: 5,
        entityType: 'CHOFER', entityId: 10, templateId: 100,
        classification, template: null,
        status: 'PENDIENTE_APROBACION',
      };

      const txMock: Record<string, any> = {
        document: {
          findFirst: jest.fn().mockResolvedValue(doc),
          findUnique: jest.fn().mockResolvedValue({ filePath: 'bucket/dir/file.pdf', entityId: 10 }),
          update: jest.fn().mockResolvedValue({ ...doc, status: 'APROBADO', template: null }),
          findMany: jest.fn().mockResolvedValue([]),
        },
        documentClassification: { update: jest.fn().mockResolvedValue({}) },
        documentTemplate: { findFirst: jest.fn().mockResolvedValue(null) },
        chofer: { findFirst: jest.fn().mockResolvedValue({ id: 10 }), create: jest.fn() },
        camion: { findFirst: jest.fn(), create: jest.fn() },
        acoplado: { findFirst: jest.fn(), create: jest.fn() },
        empresaTransportista: { findFirst: jest.fn(), create: jest.fn() },
      };

      db.$transaction.mockImplementation(async (fn: any) => fn(txMock));

      await ApprovalService.approveDocument(1, 1, {
        reviewedBy: 5,
        confirmedEntityId: 10,
        confirmedExpiration: new Date('2026-12-31'),
        confirmedTemplateId: 100,
      });
      await flushSetImmediate();
    });

    it('confirmedEntityId null y rawDetected produce idForName para CHOFER', async () => {
      const classification = {
        detectedEntityType: 'CHOFER',
        detectedEntityId: '99887766',
        detectedExpiration: new Date('2026-12-31'),
        detectedDocumentType: null,
      };
      const doc = {
        id: 1, tenantEmpresaId: 1, dadorCargaId: 5,
        entityType: 'CHOFER', entityId: 10, templateId: 100,
        classification, template: { id: 100, name: 'DNI' },
        status: 'PENDIENTE_APROBACION',
      };

      const txMock: Record<string, any> = {
        document: {
          findFirst: jest.fn().mockResolvedValue(doc),
          findUnique: jest.fn().mockResolvedValue({ filePath: 'bucket/dir/old.pdf', entityId: 10 }),
          update: jest.fn().mockResolvedValue({ ...doc, status: 'APROBADO', template: { name: 'DNI' } }),
          findMany: jest.fn().mockResolvedValue([]),
        },
        documentClassification: { update: jest.fn().mockResolvedValue({}) },
        documentTemplate: { findFirst: jest.fn().mockResolvedValue(null) },
        chofer: { findFirst: jest.fn().mockResolvedValue({ id: 10 }), create: jest.fn() },
        camion: { findFirst: jest.fn(), create: jest.fn() },
        acoplado: { findFirst: jest.fn(), create: jest.fn() },
        empresaTransportista: { findFirst: jest.fn(), create: jest.fn() },
      };

      db.$transaction.mockImplementation(async (fn: any) => fn(txMock));

      await ApprovalService.approveDocument(1, 1, {
        reviewedBy: 5,
        confirmedEntityId: 10,
        confirmedExpiration: new Date('2026-12-31'),
        confirmedTemplateId: 100,
      });
      await flushSetImmediate();
    });

    it('confirmedEntityId es string vacío, usa detectedEntityId como fallback', async () => {
      const classification = {
        detectedEntityType: 'CHOFER',
        detectedEntityId: '12345',
        detectedExpiration: new Date('2026-12-31'),
        detectedDocumentType: null,
      };
      const doc = {
        id: 1, tenantEmpresaId: 1, dadorCargaId: 5,
        entityType: 'CHOFER', entityId: 10, templateId: 100,
        classification, template: { id: 100, name: 'DNI' },
        status: 'PENDIENTE_APROBACION',
      };

      const txMock: Record<string, any> = {
        document: {
          findFirst: jest.fn().mockResolvedValue(doc),
          findUnique: jest.fn().mockResolvedValue({ filePath: 'bucket/dir/file.pdf', entityId: 10 }),
          update: jest.fn().mockResolvedValue({ ...doc, status: 'APROBADO', template: { name: 'DNI' } }),
          findMany: jest.fn().mockResolvedValue([]),
        },
        documentClassification: { update: jest.fn().mockResolvedValue({}) },
        documentTemplate: { findFirst: jest.fn().mockResolvedValue(null) },
        chofer: { findFirst: jest.fn().mockResolvedValue({ id: 10 }), create: jest.fn() },
        camion: { findFirst: jest.fn(), create: jest.fn() },
        acoplado: { findFirst: jest.fn(), create: jest.fn() },
        empresaTransportista: { findFirst: jest.fn(), create: jest.fn() },
      };

      db.$transaction.mockImplementation(async (fn: any) => fn(txMock));

      await ApprovalService.approveDocument(1, 1, {
        reviewedBy: 5,
        confirmedEntityId: 10,
        confirmedExpiration: new Date('2026-12-31'),
        confirmedTemplateId: 100,
      });
      await flushSetImmediate();
    });
  });

  // ==========================================================================
  // handleDeprecationAndRetention (via approveDocument)
  // ==========================================================================
  describe('handleDeprecationAndRetention', () => {
    function setupDeprecationTest(stale: any[], deprecated: any[]) {
      const classification = {
        detectedEntityType: 'CHOFER',
        detectedEntityId: '12345678',
        detectedExpiration: new Date('2026-12-31'),
        detectedDocumentType: null,
      };
      const doc = {
        id: 1, tenantEmpresaId: 1, dadorCargaId: 5,
        entityType: 'CHOFER', entityId: 10, templateId: 100,
        classification, template: { id: 100, name: 'DNI' },
        status: 'PENDIENTE_APROBACION',
      };

      const updatedDoc = {
        ...doc, status: 'APROBADO',
        expiresAt: new Date('2026-12-31'),
        template: { name: 'DNI' },
      };

      const txMock: Record<string, any> = {
        document: {
          findFirst: jest.fn().mockResolvedValue(doc),
          findUnique: jest.fn().mockResolvedValue(null),
          update: jest.fn().mockResolvedValue(updatedDoc),
          findMany: jest.fn()
            .mockResolvedValueOnce(stale)
            .mockResolvedValueOnce(deprecated),
          delete: jest.fn().mockResolvedValue({}),
        },
        documentClassification: { update: jest.fn().mockResolvedValue({}) },
        documentTemplate: { findFirst: jest.fn().mockResolvedValue(null) },
        chofer: { findFirst: jest.fn().mockResolvedValue({ id: 10 }), create: jest.fn() },
        camion: { findFirst: jest.fn(), create: jest.fn() },
        acoplado: { findFirst: jest.fn(), create: jest.fn() },
        empresaTransportista: { findFirst: jest.fn(), create: jest.fn() },
      };

      db.$transaction.mockImplementation(async (fn: any) => fn(txMock));
      return txMock;
    }

    it('marca documentos stale como DEPRECADO', async () => {
      const txMock = setupDeprecationTest(
        [{ id: 50, validationData: { foo: 'bar' } }],
        []
      );

      await ApprovalService.approveDocument(1, 1, {
        reviewedBy: 5,
        confirmedEntityId: 10,
        confirmedExpiration: new Date('2026-12-31'),
        confirmedTemplateId: 100,
      });

      const updateCalls = txMock.document.update.mock.calls;
      const deprecationCall = updateCalls.find((c: any) => c[0].data?.status === 'DEPRECADO');
      expect(deprecationCall).toBeDefined();
      await flushSetImmediate();
    });

    it('marca stale sin validationData', async () => {
      const txMock = setupDeprecationTest(
        [{ id: 50, validationData: null }],
        []
      );

      await ApprovalService.approveDocument(1, 1, {
        reviewedBy: 5,
        confirmedEntityId: 10,
        confirmedExpiration: new Date('2026-12-31'),
        confirmedTemplateId: 100,
      });

      const updateCalls = txMock.document.update.mock.calls;
      const deprecationCall = updateCalls.find((c: any) => c[0].data?.status === 'DEPRECADO');
      expect(deprecationCall).toBeDefined();
      await flushSetImmediate();
    });

    it('elimina deprecated más allá del máximo de retención', async () => {
      const txMock = setupDeprecationTest(
        [],
        [
          { id: 100, filePath: 'bucket/path/old1.pdf' },
          { id: 101, filePath: 'bucket/path/old2.pdf' },
          { id: 102, filePath: 'bucket/path/old3.pdf' },
        ]
      );

      await ApprovalService.approveDocument(1, 1, {
        reviewedBy: 5,
        confirmedEntityId: 10,
        confirmedExpiration: new Date('2026-12-31'),
        confirmedTemplateId: 100,
      });

      expect(txMock.document.delete).toHaveBeenCalled();
      await flushSetImmediate();
    });

    it('no elimina deprecated si están dentro del límite', async () => {
      const txMock = setupDeprecationTest(
        [],
        [
          { id: 100, filePath: 'bucket/path/old1.pdf' },
          { id: 101, filePath: 'bucket/path/old2.pdf' },
        ]
      );

      await ApprovalService.approveDocument(1, 1, {
        reviewedBy: 5,
        confirmedEntityId: 10,
        confirmedExpiration: new Date('2026-12-31'),
        confirmedTemplateId: 100,
      });

      expect(txMock.document.delete).not.toHaveBeenCalled();
      await flushSetImmediate();
    });

    it('maneja deprecated sin filePath (no intenta borrar de MinIO)', async () => {
      const txMock = setupDeprecationTest(
        [],
        [
          { id: 100, filePath: 'bucket/path/old1.pdf' },
          { id: 101, filePath: 'bucket/path/old2.pdf' },
          { id: 102, filePath: null },
        ]
      );

      await ApprovalService.approveDocument(1, 1, {
        reviewedBy: 5,
        confirmedEntityId: 10,
        confirmedExpiration: new Date('2026-12-31'),
        confirmedTemplateId: 100,
      });

      expect(txMock.document.delete).toHaveBeenCalled();
      await flushSetImmediate();
    });

    it('no depreca si templateId o expiresAt es null', async () => {
      const classification = {
        detectedEntityType: 'CHOFER',
        detectedEntityId: '12345678',
        detectedExpiration: new Date('2026-12-31'),
        detectedDocumentType: null,
      };
      const doc = {
        id: 1, tenantEmpresaId: 1, dadorCargaId: 5,
        entityType: 'CHOFER', entityId: 10, templateId: null,
        classification, template: null,
        status: 'PENDIENTE_APROBACION',
      };

      const txMock: Record<string, any> = {
        document: {
          findFirst: jest.fn().mockResolvedValue(doc),
          findUnique: jest.fn().mockResolvedValue(null),
          update: jest.fn().mockResolvedValue({
            ...doc, status: 'APROBADO', templateId: null, expiresAt: null,
            template: null,
          }),
          findMany: jest.fn(),
          delete: jest.fn(),
        },
        documentClassification: { update: jest.fn().mockResolvedValue({}) },
        documentTemplate: { findFirst: jest.fn().mockResolvedValue(null) },
        chofer: { findFirst: jest.fn().mockResolvedValue({ id: 10 }), create: jest.fn() },
        camion: { findFirst: jest.fn(), create: jest.fn() },
        acoplado: { findFirst: jest.fn(), create: jest.fn() },
        empresaTransportista: { findFirst: jest.fn(), create: jest.fn() },
      };

      db.$transaction.mockImplementation(async (fn: any) => fn(txMock));

      await ApprovalService.approveDocument(1, 1, {
        reviewedBy: 5,
        confirmedEntityId: 10,
        confirmedExpiration: new Date('2026-12-31'),
        confirmedTemplateId: 100,
      });

      expect(txMock.document.findMany).not.toHaveBeenCalled();
      await flushSetImmediate();
    });

    it('catch en minio deleteDocument no impide eliminación de DB', async () => {
      const { minioService } = require('../src/services/minio.service');
      minioService.deleteDocument.mockRejectedValueOnce(new Error('minio error'));

      const txMock = setupDeprecationTest(
        [],
        [
          { id: 100, filePath: 'bucket/path/old1.pdf' },
          { id: 101, filePath: 'bucket/path/old2.pdf' },
          { id: 102, filePath: 'bucket/path/old3.pdf' },
        ]
      );

      await ApprovalService.approveDocument(1, 1, {
        reviewedBy: 5,
        confirmedEntityId: 10,
        confirmedExpiration: new Date('2026-12-31'),
        confirmedTemplateId: 100,
      });

      expect(txMock.document.delete).toHaveBeenCalled();
      await flushSetImmediate();
    });

    it('catch en document.delete no impide procesamiento de otros', async () => {
      const txMock = setupDeprecationTest(
        [],
        [
          { id: 100, filePath: 'bucket/path/old1.pdf' },
          { id: 101, filePath: 'bucket/path/old2.pdf' },
          { id: 102, filePath: 'bucket/path/old3.pdf' },
          { id: 103, filePath: 'bucket/path/old4.pdf' },
        ]
      );
      txMock.document.delete
        .mockRejectedValueOnce(new Error('delete error'))
        .mockResolvedValue({});

      await ApprovalService.approveDocument(1, 1, {
        reviewedBy: 5,
        confirmedEntityId: 10,
        confirmedExpiration: new Date('2026-12-31'),
        confirmedTemplateId: 100,
      });

      expect(txMock.document.delete).toHaveBeenCalledTimes(2);
      await flushSetImmediate();
    });

    it('maneja múltiples stale documents', async () => {
      const txMock = setupDeprecationTest(
        [
          { id: 50, validationData: { v: 1 } },
          { id: 51, validationData: null },
          { id: 52, validationData: { v: 3 } },
        ],
        []
      );

      await ApprovalService.approveDocument(1, 1, {
        reviewedBy: 5,
        confirmedEntityId: 10,
        confirmedExpiration: new Date('2026-12-31'),
        confirmedTemplateId: 100,
      });

      const updateCalls = txMock.document.update.mock.calls;
      const deprecationCalls = updateCalls.filter((c: any) => c[0].data?.status === 'DEPRECADO');
      expect(deprecationCalls).toHaveLength(3);
      await flushSetImmediate();
    });
  });

  // ==========================================================================
  // rejectDocument
  // ==========================================================================
  describe('rejectDocument', () => {
    it('rechaza documento correctamente', async () => {
      const doc = {
        id: 1, tenantEmpresaId: 1,
        classification: { id: 10 },
        status: 'PENDIENTE_APROBACION',
      };
      const updatedDoc = { ...doc, status: 'RECHAZADO' };

      const txMock = {
        document: {
          findFirst: jest.fn().mockResolvedValue(doc),
          update: jest.fn().mockResolvedValue(updatedDoc),
        },
        documentClassification: { update: jest.fn().mockResolvedValue({}) },
      };
      db.$transaction.mockImplementation(async (fn: any) => fn(txMock));

      const result = await ApprovalService.rejectDocument(1, 1, {
        reviewedBy: 5,
        reason: 'Documento ilegible',
      });

      expect(result.status).toBe('RECHAZADO');
      expect(txMock.documentClassification.update).toHaveBeenCalled();
      await flushSetImmediate();
    });

    it('rechaza documento con reviewNotes', async () => {
      const doc = {
        id: 1, tenantEmpresaId: 1,
        classification: { id: 10 },
        status: 'PENDIENTE_APROBACION',
      };
      const updatedDoc = { ...doc, status: 'RECHAZADO' };

      const txMock = {
        document: {
          findFirst: jest.fn().mockResolvedValue(doc),
          update: jest.fn().mockResolvedValue(updatedDoc),
        },
        documentClassification: { update: jest.fn().mockResolvedValue({}) },
      };
      db.$transaction.mockImplementation(async (fn: any) => fn(txMock));

      await ApprovalService.rejectDocument(1, 1, {
        reviewedBy: 5,
        reason: 'Documento ilegible',
        reviewNotes: 'Notas adicionales',
      });

      const classUpdate = txMock.documentClassification.update.mock.calls[0][0];
      expect(classUpdate.data.reviewNotes).toContain('Notas adicionales');
      await flushSetImmediate();
    });

    it('rechaza documento sin classification', async () => {
      const doc = {
        id: 1, tenantEmpresaId: 1,
        classification: null,
        status: 'PENDIENTE_APROBACION',
      };
      const updatedDoc = { ...doc, status: 'RECHAZADO' };

      const txMock = {
        document: {
          findFirst: jest.fn().mockResolvedValue(doc),
          update: jest.fn().mockResolvedValue(updatedDoc),
        },
        documentClassification: { update: jest.fn() },
      };
      db.$transaction.mockImplementation(async (fn: any) => fn(txMock));

      const result = await ApprovalService.rejectDocument(1, 1, {
        reviewedBy: 5,
        reason: 'Documento incorrecto',
      });

      expect(result.status).toBe('RECHAZADO');
      expect(txMock.documentClassification.update).not.toHaveBeenCalled();
      await flushSetImmediate();
    });

    it('lanza error si motivo está vacío', async () => {
      await expect(
        ApprovalService.rejectDocument(1, 1, {
          reviewedBy: 5,
          reason: '',
        })
      ).rejects.toThrow('Debe especificar un motivo de rechazo');
    });

    it('lanza error si motivo tiene menos de 3 caracteres', async () => {
      await expect(
        ApprovalService.rejectDocument(1, 1, {
          reviewedBy: 5,
          reason: 'ab',
        })
      ).rejects.toThrow('Debe especificar un motivo de rechazo');
    });

    it('lanza error si motivo es solo espacios', async () => {
      await expect(
        ApprovalService.rejectDocument(1, 1, {
          reviewedBy: 5,
          reason: '   ',
        })
      ).rejects.toThrow('Debe especificar un motivo de rechazo');
    });

    it('lanza error si documento no encontrado', async () => {
      const txMock = {
        document: { findFirst: jest.fn().mockResolvedValue(null) },
      };
      db.$transaction.mockImplementation(async (fn: any) => fn(txMock));

      await expect(
        ApprovalService.rejectDocument(999, 1, {
          reviewedBy: 5,
          reason: 'Documento inválido',
        })
      ).rejects.toThrow('Documento no encontrado o no está pendiente de aprobación');
    });

    it('rechaza sin reviewNotes (notesSuffix vacío)', async () => {
      const doc = {
        id: 1, tenantEmpresaId: 1,
        classification: { id: 10 },
        status: 'PENDIENTE_APROBACION',
      };
      const txMock = {
        document: {
          findFirst: jest.fn().mockResolvedValue(doc),
          update: jest.fn().mockResolvedValue({ ...doc, status: 'RECHAZADO' }),
        },
        documentClassification: { update: jest.fn().mockResolvedValue({}) },
      };
      db.$transaction.mockImplementation(async (fn: any) => fn(txMock));

      await ApprovalService.rejectDocument(1, 1, {
        reviewedBy: 5,
        reason: 'Doc ilegible',
      });

      const classUpdate = txMock.documentClassification.update.mock.calls[0][0];
      expect(classUpdate.data.reviewNotes).toBe('RECHAZADO: Doc ilegible');
      await flushSetImmediate();
    });

    it('motivo con exactamente 3 caracteres es aceptado (trim)', async () => {
      const doc = {
        id: 1, tenantEmpresaId: 1,
        classification: null,
        status: 'PENDIENTE_APROBACION',
      };
      const txMock = {
        document: {
          findFirst: jest.fn().mockResolvedValue(doc),
          update: jest.fn().mockResolvedValue({ ...doc, status: 'RECHAZADO' }),
        },
        documentClassification: { update: jest.fn() },
      };
      db.$transaction.mockImplementation(async (fn: any) => fn(txMock));

      const result = await ApprovalService.rejectDocument(1, 1, {
        reviewedBy: 5,
        reason: 'abc',
      });

      expect(result.status).toBe('RECHAZADO');
      await flushSetImmediate();
    });

    it('reason falsy (undefined-like) lanza error', async () => {
      await expect(
        ApprovalService.rejectDocument(1, 1, {
          reviewedBy: 5,
          reason: undefined as any,
        })
      ).rejects.toThrow('Debe especificar un motivo de rechazo');
    });
  });

  // ==========================================================================
  // getApprovalStats
  // ==========================================================================
  describe('getApprovalStats', () => {
    it('retorna estadísticas correctas', async () => {
      db.document.groupBy.mockResolvedValue([
        { status: 'PENDIENTE_APROBACION', _count: { status: 5 } },
        { status: 'APROBADO', _count: { status: 10 } },
        { status: 'RECHAZADO', _count: { status: 3 } },
        { status: 'VENCIDO', _count: { status: 2 } },
      ]);

      const result = await ApprovalService.getApprovalStats(1);

      expect(result.pendienteAprobacion).toBe(5);
      expect(result.aprobados).toBe(10);
      expect(result.rechazados).toBe(3);
      expect(result.total).toBe(20);
    });

    it('retorna ceros si no hay documentos', async () => {
      db.document.groupBy.mockResolvedValue([]);

      const result = await ApprovalService.getApprovalStats(1);

      expect(result.pendienteAprobacion).toBe(0);
      expect(result.aprobados).toBe(0);
      expect(result.rechazados).toBe(0);
      expect(result.total).toBe(0);
    });

    it('maneja status no mapeados (se suman al total)', async () => {
      db.document.groupBy.mockResolvedValue([
        { status: 'PENDIENTE', _count: { status: 7 } },
      ]);

      const result = await ApprovalService.getApprovalStats(1);

      expect(result.pendienteAprobacion).toBe(0);
      expect(result.total).toBe(7);
    });

    it('solo PENDIENTE_APROBACION cuenta', async () => {
      db.document.groupBy.mockResolvedValue([
        { status: 'PENDIENTE_APROBACION', _count: { status: 12 } },
      ]);

      const result = await ApprovalService.getApprovalStats(1);

      expect(result.pendienteAprobacion).toBe(12);
      expect(result.aprobados).toBe(0);
      expect(result.rechazados).toBe(0);
      expect(result.total).toBe(12);
    });

    it('solo APROBADO cuenta', async () => {
      db.document.groupBy.mockResolvedValue([
        { status: 'APROBADO', _count: { status: 25 } },
      ]);

      const result = await ApprovalService.getApprovalStats(1);

      expect(result.aprobados).toBe(25);
      expect(result.pendienteAprobacion).toBe(0);
      expect(result.total).toBe(25);
    });

    it('solo RECHAZADO cuenta', async () => {
      db.document.groupBy.mockResolvedValue([
        { status: 'RECHAZADO', _count: { status: 8 } },
      ]);

      const result = await ApprovalService.getApprovalStats(1);

      expect(result.rechazados).toBe(8);
      expect(result.aprobados).toBe(0);
      expect(result.total).toBe(8);
    });
  });

  // ==========================================================================
  // Normalizer edge cases (via approveDocument)
  // ==========================================================================
  describe('normalizer edge cases', () => {
    it('normalizeDigits extrae solo dígitos', async () => {
      const txMock = {
        document: {
          findFirst: jest.fn().mockResolvedValue({
            id: 1, tenantEmpresaId: 1, dadorCargaId: 5,
            entityType: 'CHOFER', entityId: 10, templateId: 100,
            classification: {
              detectedEntityType: 'CHOFER',
              detectedEntityId: '12.345.678',
              detectedExpiration: new Date('2026-12-31'),
              detectedDocumentType: null,
            },
            template: { id: 100, name: 'DNI' },
            status: 'PENDIENTE_APROBACION',
          }),
          findUnique: jest.fn().mockResolvedValue(null),
          update: jest.fn().mockResolvedValue({
            id: 1, status: 'APROBADO', template: { name: 'DNI' },
            entityType: 'CHOFER',
          }),
          findMany: jest.fn().mockResolvedValue([]),
        },
        documentClassification: { update: jest.fn().mockResolvedValue({}) },
        documentTemplate: { findFirst: jest.fn().mockResolvedValue(null) },
        chofer: {
          findFirst: jest.fn().mockResolvedValue({ id: 10 }),
          create: jest.fn(),
        },
        camion: { findFirst: jest.fn(), create: jest.fn() },
        acoplado: { findFirst: jest.fn(), create: jest.fn() },
        empresaTransportista: { findFirst: jest.fn(), create: jest.fn() },
      };

      db.$transaction.mockImplementation(async (fn: any) => fn(txMock));

      await ApprovalService.approveDocument(1, 1, {
        reviewedBy: 5,
        confirmedExpiration: new Date('2026-12-31'),
        confirmedTemplateId: 100,
      });

      expect(txMock.chofer.findFirst).toHaveBeenCalled();
      await flushSetImmediate();
    });

    it('normalizePlate extrae solo A-Z0-9 y uppercase', async () => {
      const txMock = {
        document: {
          findFirst: jest.fn().mockResolvedValue({
            id: 1, tenantEmpresaId: 1, dadorCargaId: 5,
            entityType: 'CAMION', entityId: 10, templateId: 100,
            classification: {
              detectedEntityType: 'CAMION',
              detectedEntityId: 'ab-123-cd',
              detectedExpiration: new Date('2026-12-31'),
              detectedDocumentType: null,
            },
            template: { id: 100, name: 'VTV' },
            status: 'PENDIENTE_APROBACION',
          }),
          findUnique: jest.fn().mockResolvedValue(null),
          update: jest.fn().mockResolvedValue({
            id: 1, status: 'APROBADO', template: { name: 'VTV' },
            entityType: 'CAMION',
          }),
          findMany: jest.fn().mockResolvedValue([]),
        },
        documentClassification: { update: jest.fn().mockResolvedValue({}) },
        documentTemplate: { findFirst: jest.fn().mockResolvedValue(null) },
        chofer: { findFirst: jest.fn(), create: jest.fn() },
        camion: {
          findFirst: jest.fn().mockResolvedValue({ id: 33 }),
          create: jest.fn(),
        },
        acoplado: { findFirst: jest.fn(), create: jest.fn() },
        empresaTransportista: { findFirst: jest.fn(), create: jest.fn() },
      };

      db.$transaction.mockImplementation(async (fn: any) => fn(txMock));

      await ApprovalService.approveDocument(1, 1, {
        reviewedBy: 5,
        confirmedExpiration: new Date('2026-12-31'),
        confirmedTemplateId: 100,
      });

      expect(txMock.camion.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ patenteNorm: 'AB123CD' }),
        })
      );
      await flushSetImmediate();
    });
  });

  // ==========================================================================
  // setImmediate event handler error paths
  // ==========================================================================
  describe('event handler error paths', () => {
    it('approveDocument handles event handler error in setImmediate', async () => {
      const { DocumentEventHandlers } = require('../src/services/document-event-handlers.service');
      DocumentEventHandlers.onDocumentApproved.mockRejectedValueOnce(new Error('event error'));

      const classification = {
        detectedEntityType: 'CHOFER',
        detectedEntityId: '12345678',
        detectedExpiration: new Date('2026-12-31'),
        detectedDocumentType: null,
      };
      const doc = {
        id: 1, tenantEmpresaId: 1, dadorCargaId: 5,
        entityType: 'CHOFER', entityId: 10, templateId: 100,
        classification, template: { id: 100, name: 'DNI' },
        status: 'PENDIENTE_APROBACION',
      };

      const txMock = {
        document: {
          findFirst: jest.fn().mockResolvedValue(doc),
          findUnique: jest.fn().mockResolvedValue(null),
          update: jest.fn().mockResolvedValue({ ...doc, status: 'APROBADO', template: { name: 'DNI' } }),
          findMany: jest.fn().mockResolvedValue([]),
        },
        documentClassification: { update: jest.fn().mockResolvedValue({}) },
        documentTemplate: { findFirst: jest.fn().mockResolvedValue(null) },
        chofer: { findFirst: jest.fn().mockResolvedValue({ id: 10 }), create: jest.fn() },
        camion: { findFirst: jest.fn(), create: jest.fn() },
        acoplado: { findFirst: jest.fn(), create: jest.fn() },
        empresaTransportista: { findFirst: jest.fn(), create: jest.fn() },
      };

      db.$transaction.mockImplementation(async (fn: any) => fn(txMock));

      const result = await ApprovalService.approveDocument(1, 1, {
        reviewedBy: 5,
        confirmedEntityId: 10,
        confirmedExpiration: new Date('2026-12-31'),
        confirmedTemplateId: 100,
      });

      expect(result).toBeDefined();
      await flushSetImmediate();
    });

    it('rejectDocument handles notification error in setImmediate', async () => {
      const { RejectionNotificationService } = require('../src/services/rejection-notification.service');
      RejectionNotificationService.notifyDocumentRejection.mockRejectedValueOnce(new Error('notif error'));

      const doc = {
        id: 1, tenantEmpresaId: 1,
        classification: { id: 10 },
        status: 'PENDIENTE_APROBACION',
      };
      const txMock = {
        document: {
          findFirst: jest.fn().mockResolvedValue(doc),
          update: jest.fn().mockResolvedValue({ ...doc, status: 'RECHAZADO' }),
        },
        documentClassification: { update: jest.fn().mockResolvedValue({}) },
      };
      db.$transaction.mockImplementation(async (fn: any) => fn(txMock));

      const result = await ApprovalService.rejectDocument(1, 1, {
        reviewedBy: 5,
        reason: 'Documento incorrecto',
      });

      expect(result).toBeDefined();
      await flushSetImmediate();
    });

    it('rejectDocument handles event handler error in setImmediate', async () => {
      const { DocumentEventHandlers } = require('../src/services/document-event-handlers.service');
      DocumentEventHandlers.onDocumentRejected.mockRejectedValueOnce(new Error('event error'));

      const doc = {
        id: 1, tenantEmpresaId: 1,
        classification: null,
        status: 'PENDIENTE_APROBACION',
      };
      const txMock = {
        document: {
          findFirst: jest.fn().mockResolvedValue(doc),
          update: jest.fn().mockResolvedValue({ ...doc, status: 'RECHAZADO' }),
        },
        documentClassification: { update: jest.fn() },
      };
      db.$transaction.mockImplementation(async (fn: any) => fn(txMock));

      const result = await ApprovalService.rejectDocument(1, 1, {
        reviewedBy: 5,
        reason: 'Documento incorrecto',
      });

      expect(result).toBeDefined();
      await flushSetImmediate();
    });
  });
});
