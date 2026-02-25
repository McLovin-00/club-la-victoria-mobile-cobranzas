/**
 * Coverage tests for document-validation.worker.ts
 * Covers: normalizers, sanitizers, parsers, entity resolution, deprecation,
 *         retention, notifications, processValidation branches, DLQ, approve/reject flows.
 * @jest-environment node
 */

import { prismaMock, resetPrismaMock } from './mocks/prisma.mock';

jest.mock('../src/config/database', () => ({
  db: { getClient: () => prismaMock },
}));

jest.mock('../src/config/logger', () => ({
  AppLogger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

jest.mock('../src/config/environment', () => ({
  getEnvironment: () => ({
    REDIS_URL: 'redis://mock',
    DOCS_MAX_DEPRECATED_VERSIONS: '1',
  }),
}));

const mockMinioService = {
  getSignedUrl: jest.fn(async () => 'http://signed-url'),
  deleteDocument: jest.fn(async () => undefined),
};
jest.mock('../src/services/minio.service', () => ({ minioService: mockMinioService }));

const mockFlowiseService = {
  classifyDocument: jest.fn(async () => ({
    success: true,
    entityType: 'CHOFER',
    entityId: '12345678',
    expirationDate: '2026-06-15T00:00:00.000Z',
    documentType: 'DNI',
    confidence: 0.9,
    raw: {
      metadata: {
        aiParsed: {
          entidad: 'CHOFER',
          idEntidad: '12345678',
          vencimientoDate: '2026-06-15T00:00:00.000Z',
        },
      },
    },
  })),
};
jest.mock('../src/services/flowise.service', () => ({ flowiseService: mockFlowiseService }));

const mockWebSocketService = {
  notifyDocumentStatusChange: jest.fn(),
  notifyDashboardUpdate: jest.fn(),
};
jest.mock('../src/services/websocket.service', () => ({
  webSocketService: mockWebSocketService,
}));

const mockQueueService = {
  addDocumentAIValidation: jest.fn(async () => undefined),
};
jest.mock('../src/services/queue.service', () => ({ queueService: mockQueueService }));

jest.mock('../src/services/document-validation.service', () => ({
  documentValidationService: { isEnabled: () => true },
}));

jest.mock('../src/utils/expiration.utils', () => ({
  normalizeExpirationToEndOfDayAR: jest.fn((d: Date) => d),
}));

jest.mock('../src/services/empresa-transportista.service', () => ({
  EmpresaTransportistaService: {
    create: jest.fn(async (data: any) => ({ id: 50, ...data })),
  },
}));

jest.mock('../src/services/maestros.service', () => ({
  MaestrosService: {
    createChofer: jest.fn(async (data: any) => ({ id: 60, dadorCargaId: data.dadorCargaId, ...data })),
    createCamion: jest.fn(async (data: any) => ({ id: 70, dadorCargaId: data.dadorCargaId, ...data })),
    createAcoplado: jest.fn(async (data: any) => ({ id: 80, dadorCargaId: data.dadorCargaId, ...data })),
  },
}));

let workerOnHandlers: Record<string, Function> = {};
let mockQueueAdd = jest.fn(async () => ({ id: 'dlq-1' }));
let mockQueueClose = jest.fn(async () => undefined);

jest.mock('bullmq', () => ({
  Worker: jest.fn((_name: string, _processor: Function, _opts: unknown) => ({
    on: jest.fn((event: string, handler: Function) => {
      workerOnHandlers[event] = handler;
    }),
    close: jest.fn(async () => undefined),
  })),
  Queue: jest.fn(() => ({
    add: mockQueueAdd,
    close: mockQueueClose,
  })),
}));

jest.mock('ioredis', () => ({
  Redis: jest.fn(() => ({ quit: jest.fn(async () => 'OK') })),
}));

import {
  getDocumentValidationWorker,
  closeDocumentValidationWorker,
} from '../src/workers/document-validation.worker';
import { AppLogger } from '../src/config/logger';

function makeDoc(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    tenantEmpresaId: 1,
    dadorCargaId: 2,
    empresaId: 2,
    filePath: 'bucket/path/file.png',
    mimeType: 'image/png',
    fileName: 'file.png',
    entityType: 'CHOFER',
    entityId: 10,
    templateId: 5,
    status: 'PENDIENTE',
    template: { name: 'DNI' },
    expiresAt: null,
    ...overrides,
  };
}

function makeJobData(overrides: Record<string, unknown> = {}) {
  return {
    documentId: 1,
    filePath: 'bucket/path/file.png',
    templateName: 'DNI',
    entityType: 'CHOFER',
    ...overrides,
  };
}

describe('document-validation.worker (coverage)', () => {
  beforeEach(() => {
    resetPrismaMock();
    jest.clearAllMocks();
    workerOnHandlers = {};
    mockQueueAdd = jest.fn(async () => ({ id: 'dlq-1' }));
    mockQueueClose = jest.fn(async () => undefined);
  });

  afterEach(async () => {
    await closeDocumentValidationWorker();
  });

  // =========================================================================
  // Singleton
  // =========================================================================
  describe('singleton', () => {
    it('getDocumentValidationWorker returns same instance on multiple calls', () => {
      const w1 = getDocumentValidationWorker();
      const w2 = getDocumentValidationWorker();
      expect(w1).toBe(w2);
    });

    it('closeDocumentValidationWorker is no-op when no instance', async () => {
      await closeDocumentValidationWorker();
      await closeDocumentValidationWorker();
    });
  });

  // =========================================================================
  // setupEventHandlers
  // =========================================================================
  describe('setupEventHandlers', () => {
    it('completed handler logs info', () => {
      getDocumentValidationWorker();
      const handler = workerOnHandlers['completed'];
      expect(handler).toBeDefined();
      handler({ id: 'job-1' });
      expect(AppLogger.info).toHaveBeenCalledWith(expect.stringContaining('completado'));
    });

    it('failed handler logs error and moves to DLQ when attempts exceeded', async () => {
      getDocumentValidationWorker();
      const handler = workerOnHandlers['failed'];
      expect(handler).toBeDefined();
      handler(
        { id: 'job-2', data: { documentId: 5 }, attemptsMade: 3, opts: { attempts: 3 } },
        new Error('retry exhausted'),
      );
      expect(AppLogger.error).toHaveBeenCalled();
    });

    it('failed handler does not move to DLQ when attempts not exceeded', () => {
      getDocumentValidationWorker();
      const handler = workerOnHandlers['failed'];
      handler(
        { id: 'job-3', data: { documentId: 5 }, attemptsMade: 1, opts: { attempts: 3 } },
        new Error('transient'),
      );
      expect(AppLogger.error).toHaveBeenCalled();
    });

    it('failed handler handles undefined job', () => {
      getDocumentValidationWorker();
      const handler = workerOnHandlers['failed'];
      handler(undefined, new Error('no job'));
      expect(AppLogger.error).toHaveBeenCalled();
    });

    it('failed handler uses default attempts (3) when opts.attempts is undefined', () => {
      getDocumentValidationWorker();
      const handler = workerOnHandlers['failed'];
      handler(
        { id: 'job-4', data: { documentId: 1 }, attemptsMade: 3, opts: {} },
        new Error('max'),
      );
      expect(AppLogger.error).toHaveBeenCalled();
    });

    it('failed handler uses default attempts when opts is undefined', () => {
      getDocumentValidationWorker();
      const handler = workerOnHandlers['failed'];
      handler(
        { id: 'job-noopts', data: { documentId: 1 }, attemptsMade: 3 },
        new Error('no opts'),
      );
      expect(AppLogger.error).toHaveBeenCalled();
    });

    it('error handler logs error', () => {
      getDocumentValidationWorker();
      const handler = workerOnHandlers['error'];
      expect(handler).toBeDefined();
      handler(new Error('worker-error'));
      expect(AppLogger.error).toHaveBeenCalled();
    });

    it('ready handler logs info', () => {
      getDocumentValidationWorker();
      const handler = workerOnHandlers['ready'];
      expect(handler).toBeDefined();
      handler();
      expect(AppLogger.info).toHaveBeenCalledWith(expect.stringContaining('listo'));
    });
  });

  // =========================================================================
  // processValidation
  // =========================================================================
  describe('processValidation', () => {
    it('returns error when document does not exist', async () => {
      prismaMock.document.findUnique.mockResolvedValueOnce(null);
      const w: any = getDocumentValidationWorker();
      const result = await w.processValidation({ data: makeJobData() });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Documento eliminado');
    });

    it('full happy path: classify, save, associate template, enqueue AI', async () => {
      const w: any = getDocumentValidationWorker();
      prismaMock.document.findUnique
        .mockResolvedValueOnce({ id: 1 })
        .mockResolvedValueOnce({ id: 1 })
        .mockResolvedValueOnce({ id: 1 })
        .mockResolvedValueOnce({ id: 1 });
      prismaMock.document.update.mockResolvedValue({});
      prismaMock.documentClassification.upsert.mockResolvedValue({});
      prismaMock.documentTemplate.findFirst.mockResolvedValueOnce({ id: 99 });

      const result = await w.processValidation({
        data: makeJobData({ filePath: 'bucket/doc.pdf', templateName: 'AUTO' }),
      });
      expect(result.isValid).toBe(true);
      expect(result.confidence).toBe(0.9);
      expect(mockMinioService.getSignedUrl).toHaveBeenCalled();
      expect(prismaMock.documentClassification.upsert).toHaveBeenCalled();
      expect(mockQueueService.addDocumentAIValidation).toHaveBeenCalled();
    });

    it('catches error in processValidation and returns error message', async () => {
      prismaMock.document.findUnique.mockResolvedValueOnce({ id: 1 });
      prismaMock.document.update.mockRejectedValueOnce(new Error('DB failure'));
      const w: any = getDocumentValidationWorker();
      const result = await w.processValidation({ data: makeJobData() });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('DB failure');
    });

    it('skips template association when documentType or entityType is null', async () => {
      const w: any = getDocumentValidationWorker();
      mockFlowiseService.classifyDocument.mockResolvedValueOnce({
        entityType: null,
        entityId: null,
        documentType: null,
        confidence: 0.1,
        raw: null,
      });
      prismaMock.document.findUnique
        .mockResolvedValueOnce({ id: 1 })
        .mockResolvedValueOnce({ id: 1 })
        .mockResolvedValueOnce({ id: 1 });
      prismaMock.document.update.mockResolvedValue({});
      prismaMock.documentClassification.upsert.mockResolvedValue({});

      const result = await w.processValidation({ data: makeJobData() });
      expect(result.isValid).toBe(true);
      expect(prismaMock.documentTemplate.findFirst).not.toHaveBeenCalled();
    });

    it('skips template association when only documentType is null', async () => {
      const w: any = getDocumentValidationWorker();
      mockFlowiseService.classifyDocument.mockResolvedValueOnce({
        entityType: 'CHOFER',
        entityId: '123',
        documentType: null,
        confidence: 0.5,
        raw: null,
      });
      prismaMock.document.findUnique
        .mockResolvedValueOnce({ id: 1 })
        .mockResolvedValueOnce({ id: 1 })
        .mockResolvedValueOnce({ id: 1 });
      prismaMock.document.update.mockResolvedValue({});
      prismaMock.documentClassification.upsert.mockResolvedValue({});

      const result = await w.processValidation({ data: makeJobData() });
      expect(result.isValid).toBe(true);
      expect(prismaMock.documentTemplate.findFirst).not.toHaveBeenCalled();
    });

    it('skips template association when only entityType is null', async () => {
      const w: any = getDocumentValidationWorker();
      mockFlowiseService.classifyDocument.mockResolvedValueOnce({
        entityType: null,
        entityId: '123',
        documentType: 'DNI',
        confidence: 0.5,
        raw: null,
      });
      prismaMock.document.findUnique
        .mockResolvedValueOnce({ id: 1 })
        .mockResolvedValueOnce({ id: 1 })
        .mockResolvedValueOnce({ id: 1 });
      prismaMock.document.update.mockResolvedValue({});
      prismaMock.documentClassification.upsert.mockResolvedValue({});

      const result = await w.processValidation({ data: makeJobData() });
      expect(result.isValid).toBe(true);
      expect(prismaMock.documentTemplate.findFirst).not.toHaveBeenCalled();
    });

    it('skips template association when template not found', async () => {
      const w: any = getDocumentValidationWorker();
      prismaMock.document.findUnique
        .mockResolvedValueOnce({ id: 1 })
        .mockResolvedValueOnce({ id: 1 })
        .mockResolvedValueOnce({ id: 1 })
        .mockResolvedValueOnce({ id: 1 });
      prismaMock.document.update.mockResolvedValue({});
      prismaMock.documentClassification.upsert.mockResolvedValue({});
      prismaMock.documentTemplate.findFirst.mockResolvedValueOnce(null);

      const result = await w.processValidation({ data: makeJobData() });
      expect(result.isValid).toBe(true);
      expect(AppLogger.warn).toHaveBeenCalledWith(expect.stringContaining('Plantilla no encontrada'));
    });

    it('document deleted mid-process: skips save classification', async () => {
      const w: any = getDocumentValidationWorker();
      prismaMock.document.findUnique
        .mockResolvedValueOnce({ id: 1 })
        .mockResolvedValueOnce(null);
      prismaMock.document.update.mockResolvedValue({});

      const result = await w.processValidation({ data: makeJobData() });
      expect(result.isValid).toBe(true);
      expect(prismaMock.documentClassification.upsert).not.toHaveBeenCalled();
    });

    it('document deleted after save classification: skips template update', async () => {
      const w: any = getDocumentValidationWorker();
      prismaMock.document.findUnique
        .mockResolvedValueOnce({ id: 1 })
        .mockResolvedValueOnce({ id: 1 })
        .mockResolvedValueOnce(null);
      prismaMock.document.update.mockResolvedValue({});
      prismaMock.documentClassification.upsert.mockResolvedValue({});
      prismaMock.documentTemplate.findFirst.mockResolvedValueOnce({ id: 10 });

      const result = await w.processValidation({ data: makeJobData() });
      expect(result.isValid).toBe(true);
    });

    it('document deleted before PENDIENTE_APROBACION: skips status update and AI enqueue', async () => {
      const w: any = getDocumentValidationWorker();
      mockFlowiseService.classifyDocument.mockResolvedValueOnce({
        entityType: null,
        entityId: null,
        documentType: null,
        confidence: 0.1,
        raw: null,
      });
      prismaMock.document.findUnique
        .mockResolvedValueOnce({ id: 1 })
        .mockResolvedValueOnce({ id: 1 })
        .mockResolvedValueOnce(null);
      prismaMock.document.update.mockResolvedValue({});
      prismaMock.documentClassification.upsert.mockResolvedValue({});

      const result = await w.processValidation({ data: makeJobData() });
      expect(result.isValid).toBe(true);
      expect(mockQueueService.addDocumentAIValidation).not.toHaveBeenCalled();
    });

    it('enqueueAIValidation handles error gracefully', async () => {
      const w: any = getDocumentValidationWorker();
      prismaMock.document.findUnique
        .mockResolvedValueOnce({ id: 1 })
        .mockResolvedValueOnce({ id: 1 })
        .mockResolvedValueOnce({ id: 1 })
        .mockResolvedValueOnce({ id: 1 });
      prismaMock.document.update.mockResolvedValue({});
      prismaMock.documentClassification.upsert.mockResolvedValue({});
      prismaMock.documentTemplate.findFirst.mockResolvedValueOnce(null);
      mockQueueService.addDocumentAIValidation.mockRejectedValueOnce(new Error('queue fail'));

      const result = await w.processValidation({ data: makeJobData() });
      expect(result.isValid).toBe(true);
      expect(AppLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Error encolando'),
        expect.anything(),
      );
    });

    it('classifyDocument normalizes null entityId and unknown values', async () => {
      const w: any = getDocumentValidationWorker();
      mockFlowiseService.classifyDocument.mockResolvedValueOnce({
        entityType: 'INVALIDO',
        entityId: null,
        documentType: 'DESCONOCIDO',
        expirationDate: 'not-a-date',
        confidence: 0,
        raw: null,
      });
      prismaMock.document.findUnique
        .mockResolvedValueOnce({ id: 1 })
        .mockResolvedValueOnce({ id: 1 })
        .mockResolvedValueOnce({ id: 1 });
      prismaMock.document.update.mockResolvedValue({});
      prismaMock.documentClassification.upsert.mockResolvedValue({});

      const result = await w.processValidation({ data: makeJobData() });
      expect(result.isValid).toBe(true);
    });

    it('classifyDocument handles entityId from raw metadata fallback', async () => {
      const w: any = getDocumentValidationWorker();
      mockFlowiseService.classifyDocument.mockResolvedValueOnce({
        entityType: 'CHOFER',
        entityId: undefined,
        documentType: 'DNI',
        expirationDate: undefined,
        confidence: 0.8,
        raw: { metadata: { aiParsed: { idEntidad: '87654321' } } },
      });
      prismaMock.document.findUnique
        .mockResolvedValueOnce({ id: 1 })
        .mockResolvedValueOnce({ id: 1 })
        .mockResolvedValueOnce({ id: 1 })
        .mockResolvedValueOnce({ id: 1 });
      prismaMock.document.update.mockResolvedValue({});
      prismaMock.documentClassification.upsert.mockResolvedValue({});
      prismaMock.documentTemplate.findFirst.mockResolvedValueOnce({ id: 10 });

      const result = await w.processValidation({ data: makeJobData() });
      expect(result.isValid).toBe(true);
    });

    it('classifyDocument normalizes UNKNOWN, N/A, - as null', async () => {
      const w: any = getDocumentValidationWorker();
      mockFlowiseService.classifyDocument.mockResolvedValueOnce({
        entityType: 'CHOFER',
        entityId: 'N/A',
        documentType: '-',
        expirationDate: undefined,
        confidence: 0,
        raw: null,
      });
      prismaMock.document.findUnique
        .mockResolvedValueOnce({ id: 1 })
        .mockResolvedValueOnce({ id: 1 })
        .mockResolvedValueOnce({ id: 1 });
      prismaMock.document.update.mockResolvedValue({});
      prismaMock.documentClassification.upsert.mockResolvedValue({});

      await w.processValidation({ data: makeJobData() });
      expect(prismaMock.documentClassification.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({ detectedEntityId: null }),
        }),
      );
    });

    it('classifyDocument handles entityId with empty string after trim', async () => {
      const w: any = getDocumentValidationWorker();
      mockFlowiseService.classifyDocument.mockResolvedValueOnce({
        entityType: 'CHOFER',
        entityId: '   ',
        documentType: 'DNI',
        confidence: 0.5,
        raw: null,
      });
      prismaMock.document.findUnique
        .mockResolvedValueOnce({ id: 1 })
        .mockResolvedValueOnce({ id: 1 })
        .mockResolvedValueOnce({ id: 1 });
      prismaMock.document.update.mockResolvedValue({});
      prismaMock.documentClassification.upsert.mockResolvedValue({});

      await w.processValidation({ data: makeJobData() });
      expect(prismaMock.documentClassification.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({ detectedEntityId: null }),
        }),
      );
    });

    it('classifyDocument handles entityId=0 (falsy but valid)', async () => {
      const w: any = getDocumentValidationWorker();
      mockFlowiseService.classifyDocument.mockResolvedValueOnce({
        entityType: 'CHOFER',
        entityId: 0,
        documentType: 'DNI',
        confidence: 0.5,
        raw: null,
      });
      prismaMock.document.findUnique
        .mockResolvedValueOnce({ id: 1 })
        .mockResolvedValueOnce({ id: 1 })
        .mockResolvedValueOnce({ id: 1 });
      prismaMock.document.update.mockResolvedValue({});
      prismaMock.documentClassification.upsert.mockResolvedValue({});

      await w.processValidation({ data: makeJobData() });
      expect(prismaMock.documentClassification.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({ detectedEntityId: '0' }),
        }),
      );
    });

    it('classifyDocument uses confidence fallback of 0 when undefined', async () => {
      const w: any = getDocumentValidationWorker();
      mockFlowiseService.classifyDocument.mockResolvedValueOnce({
        entityType: 'CHOFER',
        entityId: '123',
        documentType: 'DNI',
        confidence: undefined,
        raw: undefined,
      });
      prismaMock.document.findUnique
        .mockResolvedValueOnce({ id: 1 })
        .mockResolvedValueOnce({ id: 1 })
        .mockResolvedValueOnce({ id: 1 })
        .mockResolvedValueOnce({ id: 1 });
      prismaMock.document.update.mockResolvedValue({});
      prismaMock.documentClassification.upsert.mockResolvedValue({});
      prismaMock.documentTemplate.findFirst.mockResolvedValueOnce({ id: 1 });

      const result = await w.processValidation({ data: makeJobData() });
      expect(result.confidence).toBe(0);
      expect(prismaMock.documentClassification.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({ confidence: 0, aiResponse: null }),
        }),
      );
    });

    it('associateTemplate handles error gracefully (catch noop)', async () => {
      const w: any = getDocumentValidationWorker();
      prismaMock.document.findUnique
        .mockResolvedValueOnce({ id: 1 })
        .mockResolvedValueOnce({ id: 1 })
        .mockResolvedValueOnce({ id: 1 })
        .mockResolvedValueOnce({ id: 1 });
      prismaMock.document.update.mockResolvedValue({});
      prismaMock.documentClassification.upsert.mockResolvedValue({});
      prismaMock.documentTemplate.findFirst.mockRejectedValueOnce(new Error('template err'));

      const result = await w.processValidation({ data: makeJobData() });
      expect(result.isValid).toBe(true);
    });

    it('filePath split separates bucket and nested path correctly', async () => {
      const w: any = getDocumentValidationWorker();
      prismaMock.document.findUnique
        .mockResolvedValueOnce({ id: 1 })
        .mockResolvedValueOnce({ id: 1 })
        .mockResolvedValueOnce({ id: 1 });
      prismaMock.document.update.mockResolvedValue({});
      prismaMock.documentClassification.upsert.mockResolvedValue({});
      mockFlowiseService.classifyDocument.mockResolvedValueOnce({
        entityType: null, entityId: null, documentType: null,
        confidence: 0, raw: null,
      });

      await w.processValidation({
        data: makeJobData({ filePath: 'my-bucket/deep/nested/file.pdf' }),
      });
      expect(mockMinioService.getSignedUrl).toHaveBeenCalledWith(
        'my-bucket', 'deep/nested/file.pdf', 3600,
      );
    });
  });

  // =========================================================================
  // markDocumentAsApproved
  // =========================================================================
  describe('markDocumentAsApproved', () => {
    it('no-op when document not found', async () => {
      prismaMock.document.findUnique.mockResolvedValueOnce(null);
      const w = getDocumentValidationWorker();
      await w.markDocumentAsApproved(99, {});
      expect(prismaMock.document.update).not.toHaveBeenCalled();
    });

    it('approves document without entity resolution when AI data is empty', async () => {
      prismaMock.document.findUnique.mockResolvedValueOnce(makeDoc());
      prismaMock.document.update.mockResolvedValueOnce(
        makeDoc({ status: 'APROBADO', template: { name: 'DNI' } }),
      );
      prismaMock.document.findMany.mockResolvedValue([]);

      const w = getDocumentValidationWorker();
      await w.markDocumentAsApproved(1, {});
      expect(prismaMock.document.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'APROBADO' }),
        }),
      );
      expect(mockWebSocketService.notifyDocumentStatusChange).toHaveBeenCalled();
    });

    it('approves with CHOFER entity resolution and creates chofer if not found', async () => {
      prismaMock.document.findUnique.mockResolvedValueOnce(makeDoc());
      prismaMock.chofer.findFirst.mockResolvedValueOnce(null);
      prismaMock.document.update.mockResolvedValueOnce(
        makeDoc({ status: 'APROBADO', expiresAt: new Date(), template: { name: 'DNI' } }),
      );
      prismaMock.document.findMany.mockResolvedValue([]);

      const w = getDocumentValidationWorker();
      await w.markDocumentAsApproved(1, {
        metadata: {
          aiParsed: { entidad: 'chofer', idEntidad: '12345678', vencimientoDate: '2026-06-15' },
        },
      });
      expect(prismaMock.document.update).toHaveBeenCalled();
    });

    it('approves with existing EMPRESA_TRANSPORTISTA entity', async () => {
      prismaMock.document.findUnique.mockResolvedValueOnce(makeDoc({ entityType: 'EMPRESA_TRANSPORTISTA' }));
      prismaMock.empresaTransportista.findFirst.mockResolvedValueOnce({ id: 50, dadorCargaId: 2 });
      prismaMock.document.update.mockResolvedValueOnce(
        makeDoc({ status: 'APROBADO', template: { name: 'CUIT' } }),
      );
      prismaMock.document.findMany.mockResolvedValue([]);

      const w = getDocumentValidationWorker();
      await w.markDocumentAsApproved(1, {
        metadata: {
          aiParsed: { entidad: 'EMPRESA_TRANSPORTISTA', idEntidad: '20-12345678-9' },
        },
      });
      expect(prismaMock.document.update).toHaveBeenCalled();
    });

    it('approves with CAMION entity resolution and creates camion if not found', async () => {
      prismaMock.document.findUnique.mockResolvedValueOnce(makeDoc());
      prismaMock.camion.findFirst.mockResolvedValueOnce(null);
      prismaMock.document.update.mockResolvedValueOnce(
        makeDoc({ status: 'APROBADO', template: { name: 'VTV' } }),
      );
      prismaMock.document.findMany.mockResolvedValue([]);

      const w = getDocumentValidationWorker();
      await w.markDocumentAsApproved(1, {
        metadata: { aiParsed: { entidad: 'CAMION', idEntidad: 'AB-123-CD' } },
      });
      expect(prismaMock.document.update).toHaveBeenCalled();
    });

    it('approves with ACOPLADO entity resolution and creates if not found', async () => {
      prismaMock.document.findUnique.mockResolvedValueOnce(makeDoc());
      prismaMock.acoplado.findFirst.mockResolvedValueOnce(null);
      prismaMock.document.update.mockResolvedValueOnce(
        makeDoc({ status: 'APROBADO', template: { name: 'VTV' } }),
      );
      prismaMock.document.findMany.mockResolvedValue([]);

      const w = getDocumentValidationWorker();
      await w.markDocumentAsApproved(1, {
        metadata: { aiParsed: { entidad: 'ACOPLADO', idEntidad: 'XY-999-ZZ' } },
      });
      expect(prismaMock.document.update).toHaveBeenCalled();
    });

    it('approves with DADOR entity type (routes to empresa transportista)', async () => {
      prismaMock.document.findUnique.mockResolvedValueOnce(makeDoc());
      prismaMock.empresaTransportista.findFirst.mockResolvedValueOnce({ id: 30, dadorCargaId: 2 });
      prismaMock.document.update.mockResolvedValueOnce(
        makeDoc({ status: 'APROBADO', template: { name: 'DNI' } }),
      );
      prismaMock.document.findMany.mockResolvedValue([]);

      const w = getDocumentValidationWorker();
      await w.markDocumentAsApproved(1, {
        metadata: { aiParsed: { entidad: 'DADOR', idEntidad: '20-11111111-1' } },
      });
      expect(prismaMock.empresaTransportista.findFirst).toHaveBeenCalled();
    });

    it('resolveEntity returns null for unknown entity type', async () => {
      prismaMock.document.findUnique.mockResolvedValueOnce(makeDoc());
      prismaMock.document.update.mockResolvedValueOnce(
        makeDoc({ status: 'APROBADO', template: { name: 'X' } }),
      );
      prismaMock.document.findMany.mockResolvedValue([]);

      const w = getDocumentValidationWorker();
      await w.markDocumentAsApproved(1, {
        metadata: { aiParsed: { entidad: 'UNKNOWN_TYPE', idEntidad: '123' } },
      });
      expect(prismaMock.document.update).toHaveBeenCalled();
    });

    it('resolveEntity skips when entidad is Desconocido', async () => {
      prismaMock.document.findUnique.mockResolvedValueOnce(makeDoc());
      prismaMock.document.update.mockResolvedValueOnce(
        makeDoc({ status: 'APROBADO', template: { name: 'X' } }),
      );
      prismaMock.document.findMany.mockResolvedValue([]);

      const w = getDocumentValidationWorker();
      await w.markDocumentAsApproved(1, {
        metadata: { aiParsed: { entidad: 'DESCONOCIDO', idEntidad: 'Desconocido' } },
      });
      expect(prismaMock.chofer.findFirst).not.toHaveBeenCalled();
    });

    it('resolveEntity skips when idEntidad is Desconocido', async () => {
      prismaMock.document.findUnique.mockResolvedValueOnce(makeDoc());
      prismaMock.document.update.mockResolvedValueOnce(
        makeDoc({ status: 'APROBADO', template: { name: 'X' } }),
      );
      prismaMock.document.findMany.mockResolvedValue([]);

      const w = getDocumentValidationWorker();
      await w.markDocumentAsApproved(1, {
        metadata: { aiParsed: { entidad: 'CHOFER', idEntidad: 'Desconocido' } },
      });
      expect(prismaMock.chofer.findFirst).not.toHaveBeenCalled();
    });

    it('resolveEntity skips when ai.entidad or ai.idEntidad is missing', async () => {
      prismaMock.document.findUnique.mockResolvedValueOnce(makeDoc());
      prismaMock.document.update.mockResolvedValueOnce(
        makeDoc({ status: 'APROBADO', template: { name: 'X' } }),
      );
      prismaMock.document.findMany.mockResolvedValue([]);

      const w = getDocumentValidationWorker();
      await w.markDocumentAsApproved(1, {
        metadata: { aiParsed: { entidad: null, idEntidad: null } },
      });
      expect(prismaMock.chofer.findFirst).not.toHaveBeenCalled();
    });

    it('resolveEntity skips when ai is empty object', async () => {
      prismaMock.document.findUnique.mockResolvedValueOnce(makeDoc());
      prismaMock.document.update.mockResolvedValueOnce(
        makeDoc({ status: 'APROBADO', template: { name: 'X' } }),
      );
      prismaMock.document.findMany.mockResolvedValue([]);

      const w = getDocumentValidationWorker();
      await w.markDocumentAsApproved(1, {
        metadata: { aiParsed: {} },
      });
      expect(prismaMock.chofer.findFirst).not.toHaveBeenCalled();
    });

    it('resolveEntity skips when extractedData has no metadata', async () => {
      prismaMock.document.findUnique.mockResolvedValueOnce(makeDoc());
      prismaMock.document.update.mockResolvedValueOnce(
        makeDoc({ status: 'APROBADO', template: { name: 'X' } }),
      );
      prismaMock.document.findMany.mockResolvedValue([]);

      const w = getDocumentValidationWorker();
      await w.markDocumentAsApproved(1, { someOtherData: true });
      expect(prismaMock.chofer.findFirst).not.toHaveBeenCalled();
    });

    it('handles deprecateDuplicates with stale documents', async () => {
      prismaMock.document.findUnique.mockResolvedValueOnce(makeDoc());
      prismaMock.document.update
        .mockResolvedValueOnce(
          makeDoc({
            status: 'APROBADO',
            expiresAt: new Date('2026-06-15'),
            template: { name: 'DNI' },
          }),
        )
        .mockResolvedValue({});
      prismaMock.document.findMany
        .mockResolvedValueOnce([
          { id: 22, validationData: { old: true } },
          { id: 23, validationData: {} },
        ])
        .mockResolvedValueOnce([]);

      const w = getDocumentValidationWorker();
      await w.markDocumentAsApproved(1, {});
      expect(prismaMock.document.update).toHaveBeenCalledTimes(3);
      expect(AppLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Deprecados'),
        expect.anything(),
      );
    });

    it('handles applyRetentionPolicy: deletes excess deprecated docs and files', async () => {
      prismaMock.document.findUnique.mockResolvedValueOnce(makeDoc());
      prismaMock.document.update
        .mockResolvedValueOnce(
          makeDoc({
            status: 'APROBADO',
            expiresAt: new Date('2026-06-15'),
            template: { name: 'DNI' },
          }),
        )
        .mockResolvedValue({});
      prismaMock.document.findMany
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([
          { id: 33, filePath: 'bkt/file1.png' },
          { id: 34, filePath: 'bkt/file2.png' },
          { id: 35, filePath: null },
        ]);
      prismaMock.document.delete.mockResolvedValue({});

      const w = getDocumentValidationWorker();
      await w.markDocumentAsApproved(1, {});
      expect(mockMinioService.deleteDocument).toHaveBeenCalled();
      expect(prismaMock.document.delete).toHaveBeenCalled();
    });

    it('applyRetentionPolicy handles MinIO delete error gracefully', async () => {
      prismaMock.document.findUnique.mockResolvedValueOnce(makeDoc());
      prismaMock.document.update.mockResolvedValueOnce(
        makeDoc({
          status: 'APROBADO',
          expiresAt: new Date(),
          template: { name: 'DNI' },
        }),
      );
      prismaMock.document.findMany
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([
          { id: 40, filePath: 'bkt/fail.png' },
          { id: 41, filePath: 'bkt/ok.png' },
        ]);
      mockMinioService.deleteDocument.mockRejectedValueOnce(new Error('minio err'));
      prismaMock.document.delete
        .mockResolvedValueOnce({})
        .mockRejectedValueOnce(new Error('db err'));

      const w = getDocumentValidationWorker();
      await w.markDocumentAsApproved(1, {});
      expect(AppLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('No se pudo eliminar'),
        expect.anything(),
      );
    });

    it('applyRetentionPolicy handles DB delete error gracefully', async () => {
      prismaMock.document.findUnique.mockResolvedValueOnce(makeDoc());
      prismaMock.document.update.mockResolvedValueOnce(
        makeDoc({
          status: 'APROBADO',
          expiresAt: new Date(),
          template: { name: 'DNI' },
        }),
      );
      prismaMock.document.findMany
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([
          { id: 50, filePath: 'bkt/doc.png' },
          { id: 51, filePath: 'bkt/doc2.png' },
        ]);
      prismaMock.document.delete
        .mockRejectedValueOnce(new Error('db delete err'))
        .mockResolvedValueOnce({});

      const w = getDocumentValidationWorker();
      await w.markDocumentAsApproved(1, {});
      expect(AppLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('No se pudo eliminar registro'),
        expect.anything(),
      );
    });

    it('applyRetentionPolicy skips when deprecated count <= maxKeep', async () => {
      prismaMock.document.findUnique.mockResolvedValueOnce(makeDoc());
      prismaMock.document.update.mockResolvedValueOnce(
        makeDoc({
          status: 'APROBADO',
          expiresAt: new Date(),
          template: { name: 'DNI' },
        }),
      );
      prismaMock.document.findMany
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ id: 55, filePath: 'bkt/only-one.png' }]);

      const w = getDocumentValidationWorker();
      await w.markDocumentAsApproved(1, {});
      expect(prismaMock.document.delete).not.toHaveBeenCalled();
    });

    it('applyPostApprovalActions handles error gracefully', async () => {
      prismaMock.document.findUnique.mockResolvedValueOnce(makeDoc());
      prismaMock.document.update.mockResolvedValueOnce(
        makeDoc({ status: 'APROBADO', expiresAt: new Date(), template: { name: 'X' } }),
      );
      prismaMock.document.findMany.mockRejectedValueOnce(new Error('deprecate err'));

      const w = getDocumentValidationWorker();
      await w.markDocumentAsApproved(1, {});
      expect(AppLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('No se pudo aplicar deprecación'),
      );
    });

    it('deprecateDuplicates skips when updatedDoc has no expiresAt', async () => {
      prismaMock.document.findUnique.mockResolvedValueOnce(makeDoc());
      prismaMock.document.update.mockResolvedValueOnce(
        makeDoc({ status: 'APROBADO', expiresAt: null, template: { name: 'X' } }),
      );

      const w = getDocumentValidationWorker();
      await w.markDocumentAsApproved(1, {});
      expect(prismaMock.document.findMany).not.toHaveBeenCalled();
    });

    it('approves and notifies using empresaId fallback when dadorCargaId is null', async () => {
      prismaMock.document.findUnique.mockResolvedValueOnce(
        makeDoc({ dadorCargaId: null, empresaId: 99 }),
      );
      prismaMock.document.update.mockResolvedValueOnce(
        makeDoc({ status: 'APROBADO', dadorCargaId: null, empresaId: 99, template: { name: 'X' } }),
      );
      prismaMock.document.findMany.mockResolvedValue([]);

      const w = getDocumentValidationWorker();
      await w.markDocumentAsApproved(1, {});
      expect(mockWebSocketService.notifyDocumentStatusChange).toHaveBeenCalledWith(
        expect.objectContaining({ empresaId: 99 }),
      );
    });

    it('notifyStatusChange passes validationNotes as joined errors', async () => {
      prismaMock.document.findUnique.mockResolvedValueOnce(makeDoc());
      prismaMock.document.update.mockResolvedValueOnce({});
      const w = getDocumentValidationWorker();
      await w.markDocumentAsRejected(1, ['error1', 'error2']);
      expect(mockWebSocketService.notifyDocumentStatusChange).toHaveBeenCalledWith(
        expect.objectContaining({ validationNotes: 'error1, error2' }),
      );
    });

    it('notifyStatusChange passes undefined validationNotes when no errors', async () => {
      prismaMock.document.findUnique.mockResolvedValueOnce(makeDoc());
      prismaMock.document.update.mockResolvedValueOnce(
        makeDoc({ status: 'APROBADO', template: { name: 'X' } }),
      );
      prismaMock.document.findMany.mockResolvedValue([]);

      const w = getDocumentValidationWorker();
      await w.markDocumentAsApproved(1, {});
      expect(mockWebSocketService.notifyDocumentStatusChange).toHaveBeenCalledWith(
        expect.objectContaining({ validationNotes: undefined }),
      );
    });

    it('handles error in markDocumentAsApproved catch block', async () => {
      prismaMock.document.findUnique.mockRejectedValueOnce(new Error('crash'));
      const w = getDocumentValidationWorker();
      await w.markDocumentAsApproved(1, {});
      expect(AppLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Error marcando documento como aprobado'),
        expect.anything(),
      );
    });

    it('resolveEmpresaTransportista returns null when cuit is empty', async () => {
      prismaMock.document.findUnique.mockResolvedValueOnce(makeDoc());
      prismaMock.document.update.mockResolvedValueOnce(
        makeDoc({ status: 'APROBADO', template: { name: 'X' } }),
      );
      prismaMock.document.findMany.mockResolvedValue([]);

      const w = getDocumentValidationWorker();
      await w.markDocumentAsApproved(1, {
        metadata: { aiParsed: { entidad: 'EMPRESA_TRANSPORTISTA', idEntidad: '' } },
      });
    });

    it('parseSafeExpirationDate returns undefined for future date > 15 years', async () => {
      prismaMock.document.findUnique.mockResolvedValueOnce(makeDoc());
      prismaMock.document.update.mockResolvedValueOnce(
        makeDoc({ status: 'APROBADO', template: { name: 'X' } }),
      );
      prismaMock.document.findMany.mockResolvedValue([]);

      const w = getDocumentValidationWorker();
      await w.markDocumentAsApproved(1, {
        metadata: { aiParsed: { vencimientoDate: '2099-01-01' } },
      });
      expect(prismaMock.document.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ expiresAt: undefined }),
        }),
      );
    });

    it('parseSafeExpirationDate returns undefined for date before 1970', async () => {
      prismaMock.document.findUnique.mockResolvedValueOnce(makeDoc());
      prismaMock.document.update.mockResolvedValueOnce(
        makeDoc({ status: 'APROBADO', template: { name: 'X' } }),
      );
      prismaMock.document.findMany.mockResolvedValue([]);

      const w = getDocumentValidationWorker();
      await w.markDocumentAsApproved(1, {
        metadata: { aiParsed: { vencimientoDate: '1960-01-01' } },
      });
      expect(prismaMock.document.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ expiresAt: undefined }),
        }),
      );
    });

    it('parseSafeExpirationDate returns undefined for invalid date string', async () => {
      prismaMock.document.findUnique.mockResolvedValueOnce(makeDoc());
      prismaMock.document.update.mockResolvedValueOnce(
        makeDoc({ status: 'APROBADO', template: { name: 'X' } }),
      );
      prismaMock.document.findMany.mockResolvedValue([]);

      const w = getDocumentValidationWorker();
      await w.markDocumentAsApproved(1, {
        metadata: { aiParsed: { vencimientoDate: 'not-a-date' } },
      });
      expect(prismaMock.document.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ expiresAt: undefined }),
        }),
      );
    });

    it('parseSafeExpirationDate returns undefined when dateStr is undefined', async () => {
      prismaMock.document.findUnique.mockResolvedValueOnce(makeDoc());
      prismaMock.document.update.mockResolvedValueOnce(
        makeDoc({ status: 'APROBADO', template: { name: 'X' } }),
      );
      prismaMock.document.findMany.mockResolvedValue([]);

      const w = getDocumentValidationWorker();
      await w.markDocumentAsApproved(1, {
        metadata: { aiParsed: {} },
      });
      expect(prismaMock.document.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ expiresAt: undefined }),
        }),
      );
    });

    it('parseSafeExpirationDate returns date for valid date within range', async () => {
      prismaMock.document.findUnique.mockResolvedValueOnce(makeDoc());
      prismaMock.document.update.mockResolvedValueOnce(
        makeDoc({ status: 'APROBADO', template: { name: 'X' } }),
      );
      prismaMock.document.findMany.mockResolvedValue([]);

      const w = getDocumentValidationWorker();
      await w.markDocumentAsApproved(1, {
        metadata: { aiParsed: { vencimientoDate: '2027-06-15' } },
      });
      expect(prismaMock.document.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            expiresAt: expect.any(Date),
          }),
        }),
      );
    });

    it('parseSafeExpirationDate returns undefined for date equal to 1970-01-01 (boundary)', async () => {
      prismaMock.document.findUnique.mockResolvedValueOnce(makeDoc());
      prismaMock.document.update.mockResolvedValueOnce(
        makeDoc({ status: 'APROBADO', template: { name: 'X' } }),
      );
      prismaMock.document.findMany.mockResolvedValue([]);

      const w = getDocumentValidationWorker();
      await w.markDocumentAsApproved(1, {
        metadata: { aiParsed: { vencimientoDate: '1970-01-01' } },
      });
      expect(prismaMock.document.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ expiresAt: undefined }),
        }),
      );
    });

    it('deprecateDuplicates handles empty stale result (no deprecation needed)', async () => {
      prismaMock.document.findUnique.mockResolvedValueOnce(makeDoc());
      prismaMock.document.update.mockResolvedValueOnce(
        makeDoc({
          status: 'APROBADO',
          expiresAt: new Date('2026-06-15'),
          template: { name: 'DNI' },
        }),
      );
      prismaMock.document.findMany
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      const w = getDocumentValidationWorker();
      await w.markDocumentAsApproved(1, {});
      const deprecatedCalls = (AppLogger.info as jest.Mock).mock.calls.filter(
        (c: any[]) => typeof c[0] === 'string' && c[0].includes('Deprecados'),
      );
      expect(deprecatedCalls.length).toBe(0);
    });
  });

  // =========================================================================
  // markDocumentAsRejected
  // =========================================================================
  describe('markDocumentAsRejected', () => {
    it('no-op when document not found', async () => {
      prismaMock.document.findUnique.mockResolvedValueOnce(null);
      const w = getDocumentValidationWorker();
      await w.markDocumentAsRejected(99, ['bad']);
      expect(prismaMock.document.update).not.toHaveBeenCalled();
    });

    it('rejects document and notifies', async () => {
      prismaMock.document.findUnique.mockResolvedValueOnce(makeDoc());
      prismaMock.document.update.mockResolvedValueOnce({});
      const w = getDocumentValidationWorker();
      await w.markDocumentAsRejected(1, ['invalid format']);
      expect(prismaMock.document.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'RECHAZADO' }),
        }),
      );
      expect(mockWebSocketService.notifyDocumentStatusChange).toHaveBeenCalled();
    });

    it('rejects document with default error when no errors provided', async () => {
      prismaMock.document.findUnique.mockResolvedValueOnce(makeDoc());
      prismaMock.document.update.mockResolvedValueOnce({});
      const w = getDocumentValidationWorker();
      await w.markDocumentAsRejected(1);
      expect(prismaMock.document.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            validationData: expect.objectContaining({ errors: ['Error de validación'] }),
          }),
        }),
      );
    });

    it('handles error in markDocumentAsRejected catch block', async () => {
      prismaMock.document.findUnique.mockRejectedValueOnce(new Error('db err'));
      const w = getDocumentValidationWorker();
      await w.markDocumentAsRejected(1, ['x']);
      expect(AppLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Error marcando documento como rechazado'),
        expect.anything(),
      );
    });
  });

  // =========================================================================
  // moveToDeadLetterQueue
  // =========================================================================
  describe('moveToDeadLetterQueue', () => {
    it('moves failed job to DLQ', async () => {
      const w: any = getDocumentValidationWorker();
      const job = {
        id: 'j-fail',
        data: { documentId: 5 },
        attemptsMade: 3,
      };
      await w.moveToDeadLetterQueue(job, new Error('max retries'));
      expect(mockQueueAdd).toHaveBeenCalledWith(
        'dead-letter',
        expect.objectContaining({
          originalJobId: 'j-fail',
          error: 'max retries',
        }),
      );
      expect(mockQueueClose).toHaveBeenCalled();
    });

    it('handles DLQ error gracefully', async () => {
      mockQueueAdd.mockRejectedValueOnce(new Error('dlq fail'));
      const w: any = getDocumentValidationWorker();
      await w.moveToDeadLetterQueue(
        { id: 'j-x', data: { documentId: 1 }, attemptsMade: 3 },
        new Error('orig'),
      );
      expect(AppLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Error moviendo job a DLQ'),
        expect.anything(),
      );
    });
  });

  // =========================================================================
  // close
  // =========================================================================
  describe('close', () => {
    it('closes worker and redis', async () => {
      const w = getDocumentValidationWorker();
      await w.close();
      expect(AppLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Worker cerrado'),
      );
    });
  });

  // =========================================================================
  // Normalizer helpers (tested indirectly via classifyDocument)
  // =========================================================================
  describe('normalizer edge cases', () => {
    it('normalizeUnknown returns null for empty string', async () => {
      const w: any = getDocumentValidationWorker();
      mockFlowiseService.classifyDocument.mockResolvedValueOnce({
        entityType: 'CHOFER',
        entityId: '',
        documentType: '   ',
        confidence: 0,
        raw: null,
      });
      prismaMock.document.findUnique
        .mockResolvedValueOnce({ id: 1 })
        .mockResolvedValueOnce({ id: 1 })
        .mockResolvedValueOnce({ id: 1 });
      prismaMock.document.update.mockResolvedValue({});
      prismaMock.documentClassification.upsert.mockResolvedValue({});

      await w.processValidation({ data: makeJobData() });
      expect(prismaMock.documentClassification.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({ detectedEntityId: null }),
        }),
      );
    });

    it('normalizeUnknown returns null for UNKNOWN value', async () => {
      const w: any = getDocumentValidationWorker();
      mockFlowiseService.classifyDocument.mockResolvedValueOnce({
        entityType: 'CAMION',
        entityId: 'UNKNOWN',
        documentType: 'UNKNOWN',
        confidence: 0.5,
        raw: null,
      });
      prismaMock.document.findUnique
        .mockResolvedValueOnce({ id: 1 })
        .mockResolvedValueOnce({ id: 1 })
        .mockResolvedValueOnce({ id: 1 });
      prismaMock.document.update.mockResolvedValue({});
      prismaMock.documentClassification.upsert.mockResolvedValue({});

      await w.processValidation({ data: makeJobData() });
      expect(prismaMock.documentClassification.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({ detectedEntityId: null, detectedDocumentType: null }),
        }),
      );
    });

    it('normalizeUnknown returns null for undefined value', async () => {
      const w: any = getDocumentValidationWorker();
      mockFlowiseService.classifyDocument.mockResolvedValueOnce({
        entityType: 'CHOFER',
        entityId: undefined,
        documentType: undefined,
        confidence: 0.5,
        raw: null,
      });
      prismaMock.document.findUnique
        .mockResolvedValueOnce({ id: 1 })
        .mockResolvedValueOnce({ id: 1 })
        .mockResolvedValueOnce({ id: 1 });
      prismaMock.document.update.mockResolvedValue({});
      prismaMock.documentClassification.upsert.mockResolvedValue({});

      await w.processValidation({ data: makeJobData() });
      expect(prismaMock.documentClassification.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({ detectedEntityId: null }),
        }),
      );
    });

    it('sanitizeEntityType returns null for invalid entity type', async () => {
      const w: any = getDocumentValidationWorker();
      mockFlowiseService.classifyDocument.mockResolvedValueOnce({
        entityType: 'INVALID_TYPE',
        entityId: '123',
        documentType: 'DNI',
        confidence: 0.5,
        raw: null,
      });
      prismaMock.document.findUnique
        .mockResolvedValueOnce({ id: 1 })
        .mockResolvedValueOnce({ id: 1 })
        .mockResolvedValueOnce({ id: 1 });
      prismaMock.document.update.mockResolvedValue({});
      prismaMock.documentClassification.upsert.mockResolvedValue({});

      await w.processValidation({ data: makeJobData() });
      expect(prismaMock.documentClassification.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({ detectedEntityType: null }),
        }),
      );
    });

    it('sanitizeEntityType handles null/undefined val', async () => {
      const w: any = getDocumentValidationWorker();
      mockFlowiseService.classifyDocument.mockResolvedValueOnce({
        entityType: null,
        entityId: '123',
        documentType: 'DNI',
        confidence: 0.5,
        raw: null,
      });
      prismaMock.document.findUnique
        .mockResolvedValueOnce({ id: 1 })
        .mockResolvedValueOnce({ id: 1 })
        .mockResolvedValueOnce({ id: 1 });
      prismaMock.document.update.mockResolvedValue({});
      prismaMock.documentClassification.upsert.mockResolvedValue({});

      await w.processValidation({ data: makeJobData() });
      expect(prismaMock.documentClassification.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({ detectedEntityType: null }),
        }),
      );
    });

    it('sanitizeEntityType accepts valid ACOPLADO type', async () => {
      const w: any = getDocumentValidationWorker();
      mockFlowiseService.classifyDocument.mockResolvedValueOnce({
        entityType: 'acoplado',
        entityId: 'AB123',
        documentType: 'VTV',
        confidence: 0.7,
        raw: null,
      });
      prismaMock.document.findUnique
        .mockResolvedValueOnce({ id: 1 })
        .mockResolvedValueOnce({ id: 1 })
        .mockResolvedValueOnce({ id: 1 })
        .mockResolvedValueOnce({ id: 1 });
      prismaMock.document.update.mockResolvedValue({});
      prismaMock.documentClassification.upsert.mockResolvedValue({});
      prismaMock.documentTemplate.findFirst.mockResolvedValueOnce({ id: 5 });

      await w.processValidation({ data: makeJobData() });
      expect(prismaMock.documentClassification.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({ detectedEntityType: 'ACOPLADO' }),
        }),
      );
    });

    it('parseExpirationDate returns null for undefined', async () => {
      const w: any = getDocumentValidationWorker();
      mockFlowiseService.classifyDocument.mockResolvedValueOnce({
        entityType: 'CHOFER',
        entityId: '123',
        documentType: 'DNI',
        expirationDate: undefined,
        confidence: 0.9,
        raw: null,
      });
      prismaMock.document.findUnique
        .mockResolvedValueOnce({ id: 1 })
        .mockResolvedValueOnce({ id: 1 })
        .mockResolvedValueOnce({ id: 1 })
        .mockResolvedValueOnce({ id: 1 });
      prismaMock.document.update.mockResolvedValue({});
      prismaMock.documentClassification.upsert.mockResolvedValue({});
      prismaMock.documentTemplate.findFirst.mockResolvedValueOnce({ id: 1 });

      await w.processValidation({ data: makeJobData() });
      expect(prismaMock.documentClassification.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({ detectedExpiration: null }),
        }),
      );
    });

    it('parseExpirationDate returns null for invalid ISO', async () => {
      const w: any = getDocumentValidationWorker();
      mockFlowiseService.classifyDocument.mockResolvedValueOnce({
        entityType: 'CHOFER',
        entityId: '123',
        documentType: 'DNI',
        expirationDate: 'invalid-date',
        confidence: 0.9,
        raw: null,
      });
      prismaMock.document.findUnique
        .mockResolvedValueOnce({ id: 1 })
        .mockResolvedValueOnce({ id: 1 })
        .mockResolvedValueOnce({ id: 1 })
        .mockResolvedValueOnce({ id: 1 });
      prismaMock.document.update.mockResolvedValue({});
      prismaMock.documentClassification.upsert.mockResolvedValue({});
      prismaMock.documentTemplate.findFirst.mockResolvedValueOnce({ id: 1 });

      await w.processValidation({ data: makeJobData() });
      expect(prismaMock.documentClassification.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({ detectedExpiration: null }),
        }),
      );
    });

    it('parseExpirationDate returns valid Date for valid ISO', async () => {
      const w: any = getDocumentValidationWorker();
      mockFlowiseService.classifyDocument.mockResolvedValueOnce({
        entityType: 'CHOFER',
        entityId: '123',
        documentType: 'DNI',
        expirationDate: '2026-12-31T00:00:00.000Z',
        confidence: 0.9,
        raw: null,
      });
      prismaMock.document.findUnique
        .mockResolvedValueOnce({ id: 1 })
        .mockResolvedValueOnce({ id: 1 })
        .mockResolvedValueOnce({ id: 1 })
        .mockResolvedValueOnce({ id: 1 });
      prismaMock.document.update.mockResolvedValue({});
      prismaMock.documentClassification.upsert.mockResolvedValue({});
      prismaMock.documentTemplate.findFirst.mockResolvedValueOnce({ id: 1 });

      await w.processValidation({ data: makeJobData() });
      expect(prismaMock.documentClassification.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({
            detectedExpiration: expect.any(Date),
          }),
        }),
      );
    });

    it('normalizeDni strips non-numeric characters', async () => {
      prismaMock.document.findUnique.mockResolvedValueOnce(makeDoc());
      prismaMock.chofer.findFirst.mockResolvedValueOnce({ id: 100, dadorCargaId: 2 });
      prismaMock.document.update.mockResolvedValueOnce(
        makeDoc({ status: 'APROBADO', template: { name: 'DNI' } }),
      );
      prismaMock.document.findMany.mockResolvedValue([]);

      const w = getDocumentValidationWorker();
      await w.markDocumentAsApproved(1, {
        metadata: { aiParsed: { entidad: 'CHOFER', idEntidad: '12.345.678' } },
      });
      expect(prismaMock.chofer.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ dniNorm: '12345678' }),
        }),
      );
    });

    it('normalizeCuit strips non-numeric characters', async () => {
      prismaMock.document.findUnique.mockResolvedValueOnce(makeDoc());
      prismaMock.empresaTransportista.findFirst.mockResolvedValueOnce({ id: 50, dadorCargaId: 2 });
      prismaMock.document.update.mockResolvedValueOnce(
        makeDoc({ status: 'APROBADO', template: { name: 'CUIT' } }),
      );
      prismaMock.document.findMany.mockResolvedValue([]);

      const w = getDocumentValidationWorker();
      await w.markDocumentAsApproved(1, {
        metadata: { aiParsed: { entidad: 'EMPRESA_TRANSPORTISTA', idEntidad: '20-12345678-9' } },
      });
      expect(prismaMock.empresaTransportista.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ cuit: '20123456789' }),
        }),
      );
    });

    it('normalizePlate uppercases and strips special chars', async () => {
      prismaMock.document.findUnique.mockResolvedValueOnce(makeDoc());
      prismaMock.camion.findFirst.mockResolvedValueOnce({ id: 200, dadorCargaId: 3 });
      prismaMock.document.update.mockResolvedValueOnce(
        makeDoc({ status: 'APROBADO', template: { name: 'VTV' } }),
      );
      prismaMock.document.findMany.mockResolvedValue([]);

      const w = getDocumentValidationWorker();
      await w.markDocumentAsApproved(1, {
        metadata: { aiParsed: { entidad: 'CAMION', idEntidad: 'ab-123-cd' } },
      });
      expect(prismaMock.camion.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ patenteNorm: 'AB123CD' }),
        }),
      );
    });
  });

  // =========================================================================
  // Entity resolution edge cases
  // =========================================================================
  describe('entity resolution edge cases', () => {
    it('resolveEmpresaTransportista returns null when dadorId is 0/falsy', async () => {
      prismaMock.document.findUnique.mockResolvedValueOnce(
        makeDoc({ dadorCargaId: 0 }),
      );
      prismaMock.document.update.mockResolvedValueOnce(
        makeDoc({ status: 'APROBADO', dadorCargaId: 0, template: { name: 'X' } }),
      );
      prismaMock.document.findMany.mockResolvedValue([]);

      const w = getDocumentValidationWorker();
      await w.markDocumentAsApproved(1, {
        metadata: { aiParsed: { entidad: 'EMPRESA_TRANSPORTISTA', idEntidad: '20-11111111-1' } },
      });
    });

    it('resolveChofer returns existing chofer with its dadorCargaId', async () => {
      prismaMock.document.findUnique.mockResolvedValueOnce(makeDoc());
      prismaMock.chofer.findFirst.mockResolvedValueOnce({ id: 100, dadorCargaId: 7 });
      prismaMock.document.update.mockResolvedValueOnce(
        makeDoc({ status: 'APROBADO', template: { name: 'DNI' } }),
      );
      prismaMock.document.findMany.mockResolvedValue([]);

      const w = getDocumentValidationWorker();
      await w.markDocumentAsApproved(1, {
        metadata: { aiParsed: { entidad: 'CHOFER', idEntidad: '12345678' } },
      });
      expect(prismaMock.document.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            entityType: 'CHOFER',
            entityId: 100,
            dadorCargaId: 7,
          }),
        }),
      );
    });

    it('resolveCamion returns existing camion', async () => {
      prismaMock.document.findUnique.mockResolvedValueOnce(makeDoc());
      prismaMock.camion.findFirst.mockResolvedValueOnce({ id: 200, dadorCargaId: 3 });
      prismaMock.document.update.mockResolvedValueOnce(
        makeDoc({ status: 'APROBADO', template: { name: 'VTV' } }),
      );
      prismaMock.document.findMany.mockResolvedValue([]);

      const w = getDocumentValidationWorker();
      await w.markDocumentAsApproved(1, {
        metadata: { aiParsed: { entidad: 'CAMION', idEntidad: 'AB123CD' } },
      });
      expect(prismaMock.document.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            entityType: 'CAMION',
            entityId: 200,
          }),
        }),
      );
    });

    it('resolveAcoplado returns existing acoplado', async () => {
      prismaMock.document.findUnique.mockResolvedValueOnce(makeDoc());
      prismaMock.acoplado.findFirst.mockResolvedValueOnce({ id: 300, dadorCargaId: 4 });
      prismaMock.document.update.mockResolvedValueOnce(
        makeDoc({ status: 'APROBADO', template: { name: 'VTV' } }),
      );
      prismaMock.document.findMany.mockResolvedValue([]);

      const w = getDocumentValidationWorker();
      await w.markDocumentAsApproved(1, {
        metadata: { aiParsed: { entidad: 'ACOPLADO', idEntidad: 'XY999ZZ' } },
      });
      expect(prismaMock.document.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            entityType: 'ACOPLADO',
            entityId: 300,
          }),
        }),
      );
    });

    it('resolveChofer create failure returns null', async () => {
      prismaMock.document.findUnique.mockResolvedValueOnce(makeDoc());
      prismaMock.chofer.findFirst.mockResolvedValueOnce(null);

      const { MaestrosService } = require('../src/services/maestros.service');
      MaestrosService.createChofer.mockRejectedValueOnce(new Error('create fail'));

      prismaMock.document.update.mockResolvedValueOnce(
        makeDoc({ status: 'APROBADO', template: { name: 'DNI' } }),
      );
      prismaMock.document.findMany.mockResolvedValue([]);

      const w = getDocumentValidationWorker();
      await w.markDocumentAsApproved(1, {
        metadata: { aiParsed: { entidad: 'CHOFER', idEntidad: '12345678' } },
      });
      expect(prismaMock.document.update).toHaveBeenCalled();
    });

    it('resolveCamion create failure returns null', async () => {
      prismaMock.document.findUnique.mockResolvedValueOnce(makeDoc());
      prismaMock.camion.findFirst.mockResolvedValueOnce(null);

      const { MaestrosService } = require('../src/services/maestros.service');
      MaestrosService.createCamion.mockRejectedValueOnce(new Error('create camion fail'));

      prismaMock.document.update.mockResolvedValueOnce(
        makeDoc({ status: 'APROBADO', template: { name: 'VTV' } }),
      );
      prismaMock.document.findMany.mockResolvedValue([]);

      const w = getDocumentValidationWorker();
      await w.markDocumentAsApproved(1, {
        metadata: { aiParsed: { entidad: 'CAMION', idEntidad: 'AB123CD' } },
      });
      expect(prismaMock.document.update).toHaveBeenCalled();
    });

    it('resolveAcoplado create failure returns null', async () => {
      prismaMock.document.findUnique.mockResolvedValueOnce(makeDoc());
      prismaMock.acoplado.findFirst.mockResolvedValueOnce(null);

      const { MaestrosService } = require('../src/services/maestros.service');
      MaestrosService.createAcoplado.mockRejectedValueOnce(new Error('create acoplado fail'));

      prismaMock.document.update.mockResolvedValueOnce(
        makeDoc({ status: 'APROBADO', template: { name: 'VTV' } }),
      );
      prismaMock.document.findMany.mockResolvedValue([]);

      const w = getDocumentValidationWorker();
      await w.markDocumentAsApproved(1, {
        metadata: { aiParsed: { entidad: 'ACOPLADO', idEntidad: 'XY999ZZ' } },
      });
      expect(prismaMock.document.update).toHaveBeenCalled();
    });

    it('resolveEmpresaTransportista create failure returns null', async () => {
      prismaMock.document.findUnique.mockResolvedValueOnce(makeDoc());
      prismaMock.empresaTransportista.findFirst.mockResolvedValueOnce(null);

      const { EmpresaTransportistaService } = require('../src/services/empresa-transportista.service');
      EmpresaTransportistaService.create.mockRejectedValueOnce(new Error('create empresa fail'));

      prismaMock.document.update.mockResolvedValueOnce(
        makeDoc({ status: 'APROBADO', template: { name: 'CUIT' } }),
      );
      prismaMock.document.findMany.mockResolvedValue([]);

      const w = getDocumentValidationWorker();
      await w.markDocumentAsApproved(1, {
        metadata: { aiParsed: { entidad: 'EMPRESA_TRANSPORTISTA', idEntidad: '20-12345678-9' } },
      });
      expect(prismaMock.document.update).toHaveBeenCalled();
    });
  });

  // =========================================================================
  // cleanError helper (tested indirectly)
  // =========================================================================
  describe('cleanError edge cases', () => {
    it('handles error with no message/stack/name', async () => {
      prismaMock.document.findUnique.mockResolvedValueOnce({ id: 1 });
      prismaMock.document.update.mockRejectedValueOnce({});
      const w: any = getDocumentValidationWorker();
      const result = await w.processValidation({ data: makeJobData() });
      expect(result.isValid).toBe(false);
    });

    it('handles error with code property', async () => {
      const errWithCode = new Error('ECONN');
      (errWithCode as any).code = 'ECONNREFUSED';
      prismaMock.document.findUnique.mockResolvedValueOnce({ id: 1 });
      prismaMock.document.update.mockRejectedValueOnce(errWithCode);
      const w: any = getDocumentValidationWorker();
      const result = await w.processValidation({ data: makeJobData() });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('ECONN');
    });

    it('handles null error object', async () => {
      prismaMock.document.findUnique.mockResolvedValueOnce({ id: 1 });
      prismaMock.document.update.mockRejectedValueOnce(null);
      const w: any = getDocumentValidationWorker();
      const result = await w.processValidation({ data: makeJobData() });
      expect(result.isValid).toBe(false);
    });
  });
});
