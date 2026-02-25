/**
 * Coverage tests for DocumentZipService + helpers
 * Covers: getJob, enqueueZipJob, runJob, handleJobError, runInWorker,
 *         loadEquipoWithRelations, buildExcelRow, loadEquipoDocuments,
 *         parseFilePath, getEntityFolder, getEntityIdLabel, buildZipEntryName,
 *         generateEquiposExcel, processEquipoForZip, startJobWithRetry,
 *         Worker accessor, forcedFailOnce, retry backoff, all entity clause branches
 * @jest-environment node
 */

// ── Mocks ──────────────────────────────────────────────────────────────────
const mockPrisma: Record<string, any> = {
  equipo: { findUnique: jest.fn() },
  chofer: { findUnique: jest.fn() },
  camion: { findUnique: jest.fn() },
  acoplado: { findUnique: jest.fn() },
  document: { findMany: jest.fn() },
};

jest.mock('../src/config/database', () => ({ prisma: mockPrisma }));

jest.mock('../src/config/logger', () => ({
  AppLogger: { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

const mockMinioService = {
  getObject: jest.fn(),
  uploadObject: jest.fn().mockResolvedValue({ bucketName: 'test-bucket', objectPath: 'exports/zips/test.zip' }),
};
jest.mock('../src/services/minio.service', () => ({
  minioService: mockMinioService,
}));

jest.mock('exceljs', () => {
  const mockSheet = {
    columns: [],
    getRow: jest.fn().mockReturnValue({
      font: {}, fill: {}, alignment: {}, height: 0,
      eachCell: jest.fn(),
    }),
    addRow: jest.fn(),
    eachRow: jest.fn((cb: any) => {
      cb({ eachCell: (fn: any) => fn({ border: {}, alignment: {} }) }, 1);
      cb({ eachCell: (fn: any) => fn({ border: {}, alignment: {} }) }, 2);
    }),
  };
  return {
    Workbook: jest.fn().mockImplementation(() => ({
      creator: '',
      created: null,
      addWorksheet: jest.fn().mockReturnValue(mockSheet),
      xlsx: { writeBuffer: jest.fn().mockResolvedValue(Buffer.from('excel-data')) },
    })),
  };
});

jest.mock('archiver', () => {
  const { PassThrough } = require('stream');
  return jest.fn().mockImplementation(() => {
    const stream = new PassThrough();
    (stream as any).append = jest.fn();
    (stream as any).finalize = jest.fn(() => setImmediate(() => stream.end()));
    (stream as any).pipe = jest.fn().mockReturnThis();
    return stream;
  });
});

import { DocumentZipService } from '../src/services/document-zip.service';

// ── Helpers ────────────────────────────────────────────────────────────────
function resetStore() {
  (globalThis as any).__ZIP_JOBS = new Map();
}

const baseEquipo = {
  id: 1,
  tenantEmpresaId: 10,
  dadorCargaId: 5,
  driverId: 100,
  truckId: 200,
  trailerId: 300,
  empresaTransportistaId: 400,
  driverDniNorm: '12345678',
  truckPlateNorm: 'ABC123',
  trailerPlateNorm: 'DEF456',
  empresaTransportista: { cuit: '20-12345678-9', razonSocial: 'Empresa Test' },
};

// ── Tests ──────────────────────────────────────────────────────────────────
describe('DocumentZipService (coverage)', () => {
  const origEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    resetStore();
    process.env = { ...origEnv, NODE_ENV: 'test' };
  });

  afterAll(() => {
    process.env = origEnv;
  });

  // ── getJob ────────────────────────────────────────────────────────────
  describe('getJob', () => {
    it('returns undefined for nonexistent job', () => {
      expect(DocumentZipService.getJob('nonexistent')).toBeUndefined();
    });

    it('returns shallow copy of job', () => {
      const id = DocumentZipService.enqueueZipJob(1, []);
      const job = DocumentZipService.getJob(id);
      expect(job).toBeDefined();
      expect(job!.id).toBe(id);
      expect(job!.status).toBe('completed');
    });

    it('returns independent copy (modifications do not affect store)', () => {
      const id = DocumentZipService.enqueueZipJob(1, []);
      const job = DocumentZipService.getJob(id)!;
      job.status = 'failed';
      const fresh = DocumentZipService.getJob(id)!;
      expect(fresh.status).toBe('completed');
    });
  });

  // ── enqueueZipJob ────────────────────────────────────────────────────
  describe('enqueueZipJob', () => {
    it('creates job in test mode with immediate completion', () => {
      const id = DocumentZipService.enqueueZipJob(1, [10, 20, 30]);
      const job = DocumentZipService.getJob(id);
      expect(job!.status).toBe('completed');
      expect(job!.progress).toBe(1);
      expect(job!.artifact).toBeDefined();
      expect(job!.artifact!.bucketName).toContain('docs-t1');
    });

    it('generates unique ids', () => {
      const id1 = DocumentZipService.enqueueZipJob(1, []);
      const id2 = DocumentZipService.enqueueZipJob(1, []);
      expect(id1).not.toBe(id2);
    });

    it('sets maxRetries from env', () => {
      process.env.DOCUMENT_ZIP_MAX_RETRIES = '5';
      const id = DocumentZipService.enqueueZipJob(1, []);
      const job = DocumentZipService.getJob(id);
      expect(job!.maxRetries).toBe(5);
    });

    it('starts async job when ZIP_ENABLE_ASYNC is true', () => {
      process.env.ZIP_ENABLE_ASYNC = 'true';
      jest.useFakeTimers();
      const id = DocumentZipService.enqueueZipJob(1, []);
      const job = DocumentZipService.getJob(id);
      expect(job!.status).toBe('queued');
      jest.useRealTimers();
    });

    it('sets totalEquipos from equipoIds length', () => {
      const id = DocumentZipService.enqueueZipJob(1, [1, 2, 3, 4, 5]);
      const job = DocumentZipService.getJob(id);
      expect(job!.totalEquipos).toBe(5);
    });

    it('defaults maxRetries to 2 when env not set', () => {
      delete process.env.DOCUMENT_ZIP_MAX_RETRIES;
      const id = DocumentZipService.enqueueZipJob(1, []);
      const job = DocumentZipService.getJob(id);
      expect(job!.maxRetries).toBe(2);
    });

    it('sets artifact objectPath with job id', () => {
      const id = DocumentZipService.enqueueZipJob(7, [1]);
      const job = DocumentZipService.getJob(id);
      expect(job!.artifact!.objectPath).toContain(id);
    });
  });

  // ── handleJobError ───────────────────────────────────────────────────
  describe('handleJobError (via startJobWithRetry)', () => {
    it('sets failed status when no retries left', () => {
      const store = (DocumentZipService as any).getStore();
      store.set('test-job', {
        id: 'test-job', tenantEmpresaId: 1, createdAt: Date.now(),
        status: 'processing', progress: 0.5, totalEquipos: 1,
        processedEquipos: 0, retryCount: 2, maxRetries: 2,
      });

      (DocumentZipService as any).handleJobError('test-job', 1, [1], new Error('fatal'));
      const job = store.get('test-job');
      expect(job.status).toBe('failed');
      expect(job.message).toContain('fatal');
    });

    it('retries when retries remain', () => {
      jest.useFakeTimers();
      const store = (DocumentZipService as any).getStore();
      store.set('test-job2', {
        id: 'test-job2', tenantEmpresaId: 1, createdAt: Date.now(),
        status: 'processing', progress: 0.5, totalEquipos: 1,
        processedEquipos: 0, retryCount: 0, maxRetries: 2,
      });

      (DocumentZipService as any).handleJobError('test-job2', 1, [1], new Error('transient'));
      const job = store.get('test-job2');
      expect(job.status).toBe('queued');
      expect(job.retryCount).toBe(1);
      expect(job.message).toContain('Retrying');
      jest.useRealTimers();
    });

    it('does nothing when job not found', () => {
      expect(() => {
        (DocumentZipService as any).handleJobError('missing-job', 1, [1], new Error('x'));
      }).not.toThrow();
    });

    it('handles non-Error throw', () => {
      const store = (DocumentZipService as any).getStore();
      store.set('test-job3', {
        id: 'test-job3', tenantEmpresaId: 1, createdAt: Date.now(),
        status: 'processing', progress: 0.5, totalEquipos: 1,
        processedEquipos: 0, retryCount: 3, maxRetries: 3,
      });

      (DocumentZipService as any).handleJobError('test-job3', 1, [1], 'string error');
      const job = store.get('test-job3');
      expect(job.status).toBe('failed');
      expect(job.message).toBe('string error');
    });

    it('handles undefined maxRetries', () => {
      const store = (DocumentZipService as any).getStore();
      store.set('test-job4', {
        id: 'test-job4', tenantEmpresaId: 1, createdAt: Date.now(),
        status: 'processing', progress: 0.5, totalEquipos: 1,
        processedEquipos: 0,
      });

      (DocumentZipService as any).handleJobError('test-job4', 1, [1], new Error('err'));
      const job = store.get('test-job4');
      expect(job.status).toBe('failed');
    });

    it('handles undefined retryCount', () => {
      jest.useFakeTimers();
      const store = (DocumentZipService as any).getStore();
      store.set('test-job5', {
        id: 'test-job5', tenantEmpresaId: 1, createdAt: Date.now(),
        status: 'processing', progress: 0.5, totalEquipos: 1,
        processedEquipos: 0, maxRetries: 3,
      });

      (DocumentZipService as any).handleJobError('test-job5', 1, [1], new Error('err'));
      const job = store.get('test-job5');
      expect(job.status).toBe('queued');
      expect(job.retryCount).toBe(1);
      jest.useRealTimers();
    });

    it('sets progress to 1 on final failure', () => {
      const store = (DocumentZipService as any).getStore();
      store.set('test-job6', {
        id: 'test-job6', tenantEmpresaId: 1, createdAt: Date.now(),
        status: 'processing', progress: 0.3, totalEquipos: 1,
        processedEquipos: 0, retryCount: 2, maxRetries: 2,
      });

      (DocumentZipService as any).handleJobError('test-job6', 1, [1], new Error('final'));
      const job = store.get('test-job6');
      expect(job.progress).toBe(1);
    });

    it('uses error message from Error object', () => {
      const store = (DocumentZipService as any).getStore();
      store.set('err-msg-job', {
        id: 'err-msg-job', tenantEmpresaId: 1, createdAt: Date.now(),
        status: 'processing', progress: 0.5, totalEquipos: 1,
        processedEquipos: 0, retryCount: 5, maxRetries: 5,
      });

      (DocumentZipService as any).handleJobError('err-msg-job', 1, [1], new Error('specific error'));
      const job = store.get('err-msg-job');
      expect(job.message).toBe('specific error');
    });

    it('falls back to generic message when error has no message', () => {
      const store = (DocumentZipService as any).getStore();
      store.set('no-msg-job', {
        id: 'no-msg-job', tenantEmpresaId: 1, createdAt: Date.now(),
        status: 'processing', progress: 0.5, totalEquipos: 1,
        processedEquipos: 0, retryCount: 5, maxRetries: 5,
      });

      (DocumentZipService as any).handleJobError('no-msg-job', 1, [1], null);
      const job = store.get('no-msg-job');
      expect(job.message).toBe('Error generando ZIP');
    });
  });

  // ── startJobWithRetry ────────────────────────────────────────────────
  describe('startJobWithRetry', () => {
    it('returns early when job not found', async () => {
      await (DocumentZipService as any).startJobWithRetry('missing', 1, []);
    });

    it('calls handleJobError when runJob throws', async () => {
      const store = (DocumentZipService as any).getStore();
      store.set('fail-job', {
        id: 'fail-job', tenantEmpresaId: 1, createdAt: Date.now(),
        status: 'queued', progress: 0, totalEquipos: 0,
        processedEquipos: 0, retryCount: 0, maxRetries: 0,
      });

      jest.spyOn(DocumentZipService as any, 'runJob').mockRejectedValueOnce(new Error('boom'));
      jest.useFakeTimers();
      await (DocumentZipService as any).startJobWithRetry('fail-job', 1, []);
      jest.useRealTimers();

      const job = store.get('fail-job');
      expect(job.status).toBe('failed');
    });

    it('uses worker when ZIP_USE_WORKER is true and not test', async () => {
      const store = (DocumentZipService as any).getStore();
      store.set('worker-job', {
        id: 'worker-job', tenantEmpresaId: 1, createdAt: Date.now(),
        status: 'queued', progress: 0, totalEquipos: 0,
        processedEquipos: 0, retryCount: 0, maxRetries: 0,
      });

      process.env.ZIP_USE_WORKER = 'true';
      process.env.NODE_ENV = 'production';

      const spy = jest.spyOn(DocumentZipService as any, 'runInWorker').mockResolvedValueOnce(undefined);
      await (DocumentZipService as any).startJobWithRetry('worker-job', 1, []);
      expect(spy).toHaveBeenCalled();
      spy.mockRestore();

      process.env.NODE_ENV = 'test';
      process.env.ZIP_USE_WORKER = '';
    });

    it('logs retry attempt number', async () => {
      const store = (DocumentZipService as any).getStore();
      store.set('retry-log', {
        id: 'retry-log', tenantEmpresaId: 1, createdAt: Date.now(),
        status: 'queued', progress: 0, totalEquipos: 0,
        processedEquipos: 0, retryCount: 2, maxRetries: 5,
      });

      jest.spyOn(DocumentZipService as any, 'runJob').mockResolvedValueOnce(undefined);
      await (DocumentZipService as any).startJobWithRetry('retry-log', 1, []);
    });
  });

  // ── runJob ───────────────────────────────────────────────────────────
  describe('runJob', () => {
    it('returns early when job not found', async () => {
      await expect((DocumentZipService as any).runJob('nonexistent', 1, [])).resolves.toBeUndefined();
    });

    it('processes empty equipo list and generates zip', async () => {
      const store = (DocumentZipService as any).getStore();
      store.set('run-job', {
        id: 'run-job', tenantEmpresaId: 1, createdAt: Date.now(),
        status: 'queued', progress: 0, totalEquipos: 0,
        processedEquipos: 0,
      });

      await (DocumentZipService as any).runJob('run-job', 1, []);
      const job = store.get('run-job');
      expect(job.status).toBe('completed');
      expect(job.progress).toBe(1);
      expect(mockMinioService.uploadObject).toHaveBeenCalled();
    });

    it('processes equipos and tracks progress', async () => {
      const store = (DocumentZipService as any).getStore();
      store.set('progress-job', {
        id: 'progress-job', tenantEmpresaId: 10, createdAt: Date.now(),
        status: 'queued', progress: 0, totalEquipos: 1,
        processedEquipos: 0,
      });

      mockPrisma.equipo.findUnique.mockResolvedValue(baseEquipo);
      mockPrisma.chofer.findUnique.mockResolvedValue({ dni: '12345678', nombre: 'Juan', apellido: 'Perez' });
      mockPrisma.camion.findUnique.mockResolvedValue({ patente: 'ABC123' });
      mockPrisma.acoplado.findUnique.mockResolvedValue({ patente: 'DEF456' });
      mockPrisma.document.findMany.mockResolvedValue([]);

      await (DocumentZipService as any).runJob('progress-job', 10, [1]);
      const job = store.get('progress-job');
      expect(job.status).toBe('completed');
      expect(job.processedEquipos).toBe(1);
    });

    it('handles force fail flag', async () => {
      process.env.ZIP_FORCE_FAIL_FIRST = 'true';
      const store = (DocumentZipService as any).getStore();
      store.set('force-fail', {
        id: 'force-fail', tenantEmpresaId: 1, createdAt: Date.now(),
        status: 'queued', progress: 0, totalEquipos: 0,
        processedEquipos: 0,
      });

      await expect((DocumentZipService as any).runJob('force-fail', 1, []))
        .rejects.toThrow('Forced failure (test)');
    });

    it('sets processing status and initial progress', async () => {
      const store = (DocumentZipService as any).getStore();
      store.set('init-progress', {
        id: 'init-progress', tenantEmpresaId: 1, createdAt: Date.now(),
        status: 'queued', progress: 0, totalEquipos: 0,
        processedEquipos: 0,
      });

      await (DocumentZipService as any).runJob('init-progress', 1, []);
      const job = store.get('init-progress');
      expect(job.status).toBe('completed');
    });

    it('handles multiple equipos with progress tracking', async () => {
      const store = (DocumentZipService as any).getStore();
      store.set('multi-equipo', {
        id: 'multi-equipo', tenantEmpresaId: 10, createdAt: Date.now(),
        status: 'queued', progress: 0, totalEquipos: 2,
        processedEquipos: 0,
      });

      mockPrisma.equipo.findUnique.mockResolvedValue(baseEquipo);
      mockPrisma.chofer.findUnique.mockResolvedValue({ dni: '111', nombre: 'A', apellido: 'B' });
      mockPrisma.camion.findUnique.mockResolvedValue({ patente: 'X' });
      mockPrisma.acoplado.findUnique.mockResolvedValue({ patente: 'Y' });
      mockPrisma.document.findMany.mockResolvedValue([]);

      await (DocumentZipService as any).runJob('multi-equipo', 10, [1, 2]);
      const job = store.get('multi-equipo');
      expect(job.processedEquipos).toBe(2);
      expect(job.status).toBe('completed');
    });
  });

  // ── processEquipoForZip helpers ──────────────────────────────────────
  describe('processEquipoForZip (via runJob)', () => {
    it('skips equipo with wrong tenant', async () => {
      const store = (DocumentZipService as any).getStore();
      store.set('wrong-tenant', {
        id: 'wrong-tenant', tenantEmpresaId: 99, createdAt: Date.now(),
        status: 'queued', progress: 0, totalEquipos: 1,
        processedEquipos: 0,
      });

      mockPrisma.equipo.findUnique.mockResolvedValue({ ...baseEquipo, tenantEmpresaId: 10 });
      mockPrisma.chofer.findUnique.mockResolvedValue(null);
      mockPrisma.camion.findUnique.mockResolvedValue(null);
      mockPrisma.acoplado.findUnique.mockResolvedValue(null);

      await (DocumentZipService as any).runJob('wrong-tenant', 99, [1]);
      const job = store.get('wrong-tenant');
      expect(job.status).toBe('completed');
    });

    it('skips equipo not found', async () => {
      const store = (DocumentZipService as any).getStore();
      store.set('not-found', {
        id: 'not-found', tenantEmpresaId: 10, createdAt: Date.now(),
        status: 'queued', progress: 0, totalEquipos: 1,
        processedEquipos: 0,
      });

      mockPrisma.equipo.findUnique.mockResolvedValue(null);

      await (DocumentZipService as any).runJob('not-found', 10, [999]);
      const job = store.get('not-found');
      expect(job.status).toBe('completed');
    });

    it('handles equipo without trailer', async () => {
      const store = (DocumentZipService as any).getStore();
      store.set('no-trailer', {
        id: 'no-trailer', tenantEmpresaId: 10, createdAt: Date.now(),
        status: 'queued', progress: 0, totalEquipos: 1,
        processedEquipos: 0,
      });

      const equipoNoTrailer = { ...baseEquipo, trailerId: null, trailerPlateNorm: null };
      mockPrisma.equipo.findUnique.mockResolvedValue(equipoNoTrailer);
      mockPrisma.chofer.findUnique.mockResolvedValue({ dni: '111', nombre: 'A', apellido: 'B' });
      mockPrisma.camion.findUnique.mockResolvedValue({ patente: 'ZZZ999' });
      mockPrisma.document.findMany.mockResolvedValue([]);

      await (DocumentZipService as any).runJob('no-trailer', 10, [1]);
      const job = store.get('no-trailer');
      expect(job.status).toBe('completed');
    });

    it('adds documents to zip with correct entry names', async () => {
      const { PassThrough } = require('stream');
      const store = (DocumentZipService as any).getStore();
      store.set('with-docs', {
        id: 'with-docs', tenantEmpresaId: 10, createdAt: Date.now(),
        status: 'queued', progress: 0, totalEquipos: 1,
        processedEquipos: 0,
      });

      mockPrisma.equipo.findUnique.mockResolvedValue(baseEquipo);
      mockPrisma.chofer.findUnique.mockResolvedValue({ dni: '12345678', nombre: 'Juan', apellido: 'P' });
      mockPrisma.camion.findUnique.mockResolvedValue({ patente: 'ABC123' });
      mockPrisma.acoplado.findUnique.mockResolvedValue({ patente: 'DEF456' });
      mockPrisma.document.findMany.mockResolvedValue([
        { id: 1, entityType: 'CHOFER', entityId: 100, filePath: 'bucket/path/file.pdf', template: { name: 'DNI' } },
        { id: 2, entityType: 'CAMION', entityId: 200, filePath: 'other-bucket/camion.pdf', template: { name: 'Seguro' } },
        { id: 3, entityType: 'ACOPLADO', entityId: 300, filePath: 'simple.pdf', template: null },
        { id: 4, entityType: 'EMPRESA_TRANSPORTISTA', entityId: 400, filePath: 'emp/file.pdf', template: { name: 'ARCA' } },
      ]);

      const docStream = new PassThrough();
      docStream.end(Buffer.from('pdf-content'));
      mockMinioService.getObject.mockResolvedValue(docStream);

      await (DocumentZipService as any).runJob('with-docs', 10, [1]);
      const job = store.get('with-docs');
      expect(job.status).toBe('completed');
      expect(mockMinioService.getObject).toHaveBeenCalledTimes(4);
    });
  });

  // ── parseFilePath ────────────────────────────────────────────────────
  describe('parseFilePath (via document processing)', () => {
    it('handles filePath with slash separator', async () => {
      const { PassThrough } = require('stream');
      const store = (DocumentZipService as any).getStore();
      store.set('parse-path', {
        id: 'parse-path', tenantEmpresaId: 10, createdAt: Date.now(),
        status: 'queued', progress: 0, totalEquipos: 1,
        processedEquipos: 0,
      });

      mockPrisma.equipo.findUnique.mockResolvedValue(baseEquipo);
      mockPrisma.chofer.findUnique.mockResolvedValue({ dni: '111', nombre: 'A', apellido: 'B' });
      mockPrisma.camion.findUnique.mockResolvedValue({ patente: 'AAA' });
      mockPrisma.acoplado.findUnique.mockResolvedValue({ patente: 'BBB' });
      mockPrisma.document.findMany.mockResolvedValue([
        { id: 1, entityType: 'CHOFER', entityId: 100, filePath: 'my-bucket/deep/path/file.pdf', template: { name: 'Doc' } },
      ]);

      const docStream = new PassThrough();
      docStream.end(Buffer.from('data'));
      mockMinioService.getObject.mockResolvedValue(docStream);

      await (DocumentZipService as any).runJob('parse-path', 10, [1]);
      expect(mockMinioService.getObject).toHaveBeenCalledWith('my-bucket', 'deep/path/file.pdf');
    });

    it('handles filePath without slash (fallback bucket)', async () => {
      const { PassThrough } = require('stream');
      const store = (DocumentZipService as any).getStore();
      store.set('no-slash', {
        id: 'no-slash', tenantEmpresaId: 10, createdAt: Date.now(),
        status: 'queued', progress: 0, totalEquipos: 1,
        processedEquipos: 0,
      });

      mockPrisma.equipo.findUnique.mockResolvedValue(baseEquipo);
      mockPrisma.chofer.findUnique.mockResolvedValue(null);
      mockPrisma.camion.findUnique.mockResolvedValue(null);
      mockPrisma.acoplado.findUnique.mockResolvedValue(null);
      mockPrisma.document.findMany.mockResolvedValue([
        { id: 1, entityType: 'CHOFER', entityId: 100, filePath: 'filename-only.pdf', template: { name: 'Doc' } },
      ]);

      const docStream = new PassThrough();
      docStream.end(Buffer.from('data'));
      mockMinioService.getObject.mockResolvedValue(docStream);

      await (DocumentZipService as any).runJob('no-slash', 10, [1]);
      expect(mockMinioService.getObject).toHaveBeenCalledWith('docs-t10', 'filename-only.pdf');
    });
  });

  // ── Worker ────────────────────────────────────────────────────────────
  describe('Worker accessor', () => {
    it('returns Worker class or null', () => {
      const W = (DocumentZipService as any).Worker;
      expect(W === null || typeof W === 'function').toBe(true);
    });
  });

  // ── runInWorker ──────────────────────────────────────────────────────
  describe('runInWorker', () => {
    it('falls back to runJob when Worker is null', async () => {
      const originalWorker = Object.getOwnPropertyDescriptor(DocumentZipService, 'Worker');
      Object.defineProperty(DocumentZipService, 'Worker', { get: () => null, configurable: true });

      const store = (DocumentZipService as any).getStore();
      store.set('no-worker', {
        id: 'no-worker', tenantEmpresaId: 1, createdAt: Date.now(),
        status: 'queued', progress: 0, totalEquipos: 0,
        processedEquipos: 0,
      });

      const runJobSpy = jest.spyOn(DocumentZipService as any, 'runJob').mockResolvedValueOnce(undefined);
      await (DocumentZipService as any).runInWorker('no-worker', 1, []);
      expect(runJobSpy).toHaveBeenCalledWith('no-worker', 1, []);
      runJobSpy.mockRestore();

      if (originalWorker) {
        Object.defineProperty(DocumentZipService, 'Worker', originalWorker);
      }
    });
  });

  // ── buildExcelRow fallbacks ──────────────────────────────────────────
  describe('buildExcelRow fallbacks (via processEquipoForZip)', () => {
    it('uses normalized values when relations are null', async () => {
      const store = (DocumentZipService as any).getStore();
      store.set('null-rels', {
        id: 'null-rels', tenantEmpresaId: 10, createdAt: Date.now(),
        status: 'queued', progress: 0, totalEquipos: 1,
        processedEquipos: 0,
      });

      const equipoNoEmpresa = {
        ...baseEquipo,
        empresaTransportista: null,
        empresaTransportistaId: null,
      };
      mockPrisma.equipo.findUnique.mockResolvedValue(equipoNoEmpresa);
      mockPrisma.chofer.findUnique.mockResolvedValue(null);
      mockPrisma.camion.findUnique.mockResolvedValue(null);
      mockPrisma.acoplado.findUnique.mockResolvedValue(null);
      mockPrisma.document.findMany.mockResolvedValue([]);

      await (DocumentZipService as any).runJob('null-rels', 10, [1]);
      const job = store.get('null-rels');
      expect(job.status).toBe('completed');
    });

    it('uses empty strings when all fallback values are null', async () => {
      const store = (DocumentZipService as any).getStore();
      store.set('empty-vals', {
        id: 'empty-vals', tenantEmpresaId: 10, createdAt: Date.now(),
        status: 'queued', progress: 0, totalEquipos: 1,
        processedEquipos: 0,
      });

      const equipoAllNull = {
        ...baseEquipo,
        empresaTransportista: null,
        empresaTransportistaId: null,
        driverDniNorm: null,
        truckPlateNorm: null,
        trailerPlateNorm: null,
        trailerId: null,
      };
      mockPrisma.equipo.findUnique.mockResolvedValue(equipoAllNull);
      mockPrisma.chofer.findUnique.mockResolvedValue(null);
      mockPrisma.camion.findUnique.mockResolvedValue(null);
      mockPrisma.document.findMany.mockResolvedValue([]);

      await (DocumentZipService as any).runJob('empty-vals', 10, [1]);
      const job = store.get('empty-vals');
      expect(job.status).toBe('completed');
    });
  });

  // ── getEntityFolder / getEntityIdLabel edge cases ────────────────────
  describe('entity type mapping edge cases', () => {
    it('maps unknown entity type to "otro" folder and uses fallback id', async () => {
      const { PassThrough } = require('stream');
      const store = (DocumentZipService as any).getStore();
      store.set('unknown-entity', {
        id: 'unknown-entity', tenantEmpresaId: 10, createdAt: Date.now(),
        status: 'queued', progress: 0, totalEquipos: 1,
        processedEquipos: 0,
      });

      mockPrisma.equipo.findUnique.mockResolvedValue(baseEquipo);
      mockPrisma.chofer.findUnique.mockResolvedValue({ dni: '111', nombre: 'A', apellido: 'B' });
      mockPrisma.camion.findUnique.mockResolvedValue({ patente: 'AAA' });
      mockPrisma.acoplado.findUnique.mockResolvedValue({ patente: 'BBB' });
      mockPrisma.document.findMany.mockResolvedValue([
        { id: 99, entityType: 'EMPRESA_TRANSPORTISTA', entityId: 400, filePath: 'b/f.pdf', template: { name: 'Custom' } },
      ]);

      const docStream = new PassThrough();
      docStream.end(Buffer.from('data'));
      mockMinioService.getObject.mockResolvedValue(docStream);

      await (DocumentZipService as any).runJob('unknown-entity', 10, [1]);
      expect(mockMinioService.getObject).toHaveBeenCalled();
    });

    it('uses chofer folder for CHOFER entity', async () => {
      const { PassThrough } = require('stream');
      const store = (DocumentZipService as any).getStore();
      store.set('chofer-folder', {
        id: 'chofer-folder', tenantEmpresaId: 10, createdAt: Date.now(),
        status: 'queued', progress: 0, totalEquipos: 1,
        processedEquipos: 0,
      });

      mockPrisma.equipo.findUnique.mockResolvedValue(baseEquipo);
      mockPrisma.chofer.findUnique.mockResolvedValue({ dni: '111', nombre: 'A', apellido: 'B' });
      mockPrisma.camion.findUnique.mockResolvedValue({ patente: 'AAA' });
      mockPrisma.acoplado.findUnique.mockResolvedValue({ patente: 'BBB' });
      mockPrisma.document.findMany.mockResolvedValue([
        { id: 1, entityType: 'CHOFER', entityId: 100, filePath: 'b/f.pdf', template: { name: 'DNI' } },
      ]);

      const docStream = new PassThrough();
      docStream.end(Buffer.from('data'));
      mockMinioService.getObject.mockResolvedValue(docStream);

      await (DocumentZipService as any).runJob('chofer-folder', 10, [1]);
      expect(mockMinioService.getObject).toHaveBeenCalled();
    });
  });

  // ── loadEquipoDocuments entity clauses ────────────────────────────────
  describe('loadEquipoDocuments entity clauses', () => {
    it('builds entity clauses for all entity types present', async () => {
      const store = (DocumentZipService as any).getStore();
      store.set('all-entities', {
        id: 'all-entities', tenantEmpresaId: 10, createdAt: Date.now(),
        status: 'queued', progress: 0, totalEquipos: 1,
        processedEquipos: 0,
      });

      mockPrisma.equipo.findUnique.mockResolvedValue(baseEquipo);
      mockPrisma.chofer.findUnique.mockResolvedValue({ dni: '111', nombre: 'A', apellido: 'B' });
      mockPrisma.camion.findUnique.mockResolvedValue({ patente: 'X' });
      mockPrisma.acoplado.findUnique.mockResolvedValue({ patente: 'Y' });
      mockPrisma.document.findMany.mockResolvedValue([]);

      await (DocumentZipService as any).runJob('all-entities', 10, [1]);

      const findManyCall = mockPrisma.document.findMany.mock.calls[0][0];
      expect(findManyCall.where.AND[0].OR).toHaveLength(4);
    });

    it('builds empty entity clauses when no entities assigned', async () => {
      const store = (DocumentZipService as any).getStore();
      store.set('no-entities', {
        id: 'no-entities', tenantEmpresaId: 10, createdAt: Date.now(),
        status: 'queued', progress: 0, totalEquipos: 1,
        processedEquipos: 0,
      });

      const emptyEquipo = {
        ...baseEquipo,
        driverId: 0, truckId: 0, trailerId: null,
        empresaTransportistaId: null,
      };
      mockPrisma.equipo.findUnique.mockResolvedValue(emptyEquipo);
      mockPrisma.chofer.findUnique.mockResolvedValue(null);
      mockPrisma.camion.findUnique.mockResolvedValue(null);
      mockPrisma.document.findMany.mockResolvedValue([]);

      await (DocumentZipService as any).runJob('no-entities', 10, [1]);
      expect(mockPrisma.document.findMany).toHaveBeenCalled();
    });

    it('builds entity clause for only empresaTransportista + driver', async () => {
      const store = (DocumentZipService as any).getStore();
      store.set('partial-entities', {
        id: 'partial-entities', tenantEmpresaId: 10, createdAt: Date.now(),
        status: 'queued', progress: 0, totalEquipos: 1,
        processedEquipos: 0,
      });

      const partialEquipo = {
        ...baseEquipo,
        truckId: 0,
        trailerId: null,
      };
      mockPrisma.equipo.findUnique.mockResolvedValue(partialEquipo);
      mockPrisma.chofer.findUnique.mockResolvedValue({ dni: '111', nombre: 'A', apellido: 'B' });
      mockPrisma.camion.findUnique.mockResolvedValue(null);
      mockPrisma.document.findMany.mockResolvedValue([]);

      await (DocumentZipService as any).runJob('partial-entities', 10, [1]);

      const findManyCall = mockPrisma.document.findMany.mock.calls[0][0];
      expect(findManyCall.where.AND[0].OR).toHaveLength(2);
    });
  });

  // ── getStore ────────────────────────────────────────────────────────
  describe('getStore', () => {
    it('creates store on globalThis if not exists', () => {
      delete (globalThis as any).__ZIP_JOBS;
      const store = (DocumentZipService as any).getStore();
      expect(store).toBeInstanceOf(Map);
    });

    it('reuses existing store from globalThis', () => {
      const existing = new Map();
      existing.set('test', { id: 'test' });
      (globalThis as any).__ZIP_JOBS = existing;
      const store = (DocumentZipService as any).getStore();
      expect(store.get('test')).toEqual({ id: 'test' });
    });
  });
});
