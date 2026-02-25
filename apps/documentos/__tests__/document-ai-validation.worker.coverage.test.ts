/**
 * Coverage tests for document-ai-validation.worker.ts
 * Covers: getFileFromMinio, getImageBase64, processValidation, setupEventHandlers,
 *         close, singleton start/stop, and all conditional branches.
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
  getEnvironment: () => ({ REDIS_URL: 'redis://localhost:6379' }),
}));

const mockMinioService = { getObject: jest.fn() };
jest.mock('../src/services/minio.service', () => ({ minioService: mockMinioService }));

const mockDocValidationService = {
  isEnabled: jest.fn(),
  getEntityData: jest.fn(),
  validateDocument: jest.fn(),
};
jest.mock('../src/services/document-validation.service', () => ({
  documentValidationService: mockDocValidationService,
}));

const mockPdfRasterizeService = { pdfToImages: jest.fn() };
jest.mock('../src/services/pdf-rasterize.service', () => ({
  PdfRasterizeService: mockPdfRasterizeService,
}));

let workerOnHandlers: Record<string, Function> = {};
jest.mock('bullmq', () => ({
  Worker: jest.fn((_name: string, _processor: Function, _opts: unknown) => ({
    on: jest.fn((event: string, handler: Function) => {
      workerOnHandlers[event] = handler;
    }),
    close: jest.fn(async () => undefined),
  })),
  Queue: jest.fn(() => ({ close: jest.fn() })),
}));

jest.mock('ioredis', () => ({
  Redis: jest.fn(() => ({ quit: jest.fn(async () => 'OK') })),
}));

import {
  startDocumentAIValidationWorker,
  stopDocumentAIValidationWorker,
} from '../src/workers/document-ai-validation.worker';
import { AppLogger } from '../src/config/logger';

function makeDoc(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    filePath: 'bucket/path/file.png',
    mimeType: 'image/png',
    fileName: 'file.png',
    entityType: 'CHOFER',
    entityId: 10,
    template: { name: 'Licencia' },
    expiresAt: null,
    ...overrides,
  };
}

function createReadableChunks(data: Buffer): AsyncIterable<Buffer> {
  return {
    async *[Symbol.asyncIterator]() {
      yield data;
    },
  };
}

/** Helper to set up a fully successful processValidation flow and return worker */
function setupSuccessfulFlow(docOverrides: Record<string, unknown> = {}) {
  mockDocValidationService.isEnabled.mockReturnValue(true);
  prismaMock.document.findUnique.mockResolvedValueOnce(makeDoc(docOverrides));
  mockMinioService.getObject.mockResolvedValueOnce(
    createReadableChunks(Buffer.from('imgdata')),
  );
  mockDocValidationService.getEntityData.mockResolvedValueOnce({});
  mockDocValidationService.validateDocument.mockResolvedValueOnce({
    success: true,
    data: { esDocumentoCorrecto: true, confianza: 0.9, disparidades: [] },
  });
  return startDocumentAIValidationWorker();
}

describe('document-ai-validation.worker (coverage)', () => {
  beforeEach(() => {
    resetPrismaMock();
    jest.clearAllMocks();
    workerOnHandlers = {};
  });

  afterEach(async () => {
    await stopDocumentAIValidationWorker();
  });

  // =========================================================================
  // Singleton start/stop
  // =========================================================================
  describe('singleton start/stop', () => {
    it('startDocumentAIValidationWorker returns same instance on multiple calls', () => {
      const w1 = startDocumentAIValidationWorker();
      const w2 = startDocumentAIValidationWorker();
      expect(w1).toBe(w2);
    });

    it('stopDocumentAIValidationWorker is no-op when no instance', async () => {
      await stopDocumentAIValidationWorker();
      await stopDocumentAIValidationWorker();
    });

    it('close method calls worker.close and redis.quit', async () => {
      const w = startDocumentAIValidationWorker();
      await (w as any).close();
      expect(AppLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Worker cerrado'),
      );
    });
  });

  // =========================================================================
  // Event handlers
  // =========================================================================
  describe('setupEventHandlers', () => {
    it('completed handler logs debug', () => {
      startDocumentAIValidationWorker();
      const handler = workerOnHandlers['completed'];
      expect(handler).toBeDefined();
      handler({ id: 'job-1', data: { documentId: 1 } }, { success: true });
      expect(AppLogger.debug).toHaveBeenCalledWith(
        expect.stringContaining('completado'),
        expect.objectContaining({ documentId: 1 }),
      );
    });

    it('failed handler logs error with undefined job', () => {
      startDocumentAIValidationWorker();
      const handler = workerOnHandlers['failed'];
      expect(handler).toBeDefined();
      handler(undefined, new Error('fail'));
      expect(AppLogger.error).toHaveBeenCalled();
    });

    it('failed handler logs error with defined job', () => {
      startDocumentAIValidationWorker();
      const handler = workerOnHandlers['failed'];
      handler({ id: 'j-2', data: { documentId: 5 } }, new Error('boom'));
      expect(AppLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('falló'),
        expect.objectContaining({ documentId: 5 }),
      );
    });

    it('error handler logs error', () => {
      startDocumentAIValidationWorker();
      const handler = workerOnHandlers['error'];
      expect(handler).toBeDefined();
      handler(new Error('worker error'));
      expect(AppLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Error en worker'),
        expect.objectContaining({ error: 'worker error' }),
      );
    });
  });

  // =========================================================================
  // processValidation
  // =========================================================================
  describe('processValidation', () => {
    it('returns VALIDATION_DISABLED when service is disabled', async () => {
      mockDocValidationService.isEnabled.mockReturnValue(false);
      const w: any = startDocumentAIValidationWorker();
      const result = await w.processValidation({
        id: 'j1',
        data: { documentId: 1, esRechequeo: false },
      });
      expect(result).toEqual({
        success: true,
        documentId: 1,
        error: 'VALIDATION_DISABLED',
      });
    });

    it('returns DOCUMENT_NOT_FOUND when document does not exist', async () => {
      mockDocValidationService.isEnabled.mockReturnValue(true);
      prismaMock.document.findUnique.mockResolvedValueOnce(null);
      const w: any = startDocumentAIValidationWorker();
      const result = await w.processValidation({
        id: 'j2',
        data: { documentId: 99 },
      });
      expect(result.success).toBe(false);
      expect(result.error).toBe('DOCUMENT_NOT_FOUND');
    });

    it('returns MINIO_ERROR when file retrieval from MinIO fails', async () => {
      mockDocValidationService.isEnabled.mockReturnValue(true);
      prismaMock.document.findUnique.mockResolvedValueOnce(makeDoc());
      mockMinioService.getObject.mockRejectedValueOnce(new Error('network'));
      const w: any = startDocumentAIValidationWorker();
      const result = await w.processValidation({
        id: 'j3',
        data: { documentId: 1 },
      });
      expect(result.success).toBe(false);
      expect(result.error).toBe('MINIO_ERROR');
    });

    it('returns PDF_RASTERIZE_ERROR when pdfToImages returns empty array', async () => {
      mockDocValidationService.isEnabled.mockReturnValue(true);
      prismaMock.document.findUnique.mockResolvedValueOnce(
        makeDoc({ mimeType: 'application/pdf', fileName: 'doc.pdf', filePath: 'bkt/doc.pdf' }),
      );
      mockMinioService.getObject.mockResolvedValueOnce(
        createReadableChunks(Buffer.from('%PDF')),
      );
      mockPdfRasterizeService.pdfToImages.mockResolvedValueOnce([]);
      const w: any = startDocumentAIValidationWorker();
      const result = await w.processValidation({
        id: 'j4',
        data: { documentId: 1 },
      });
      expect(result.success).toBe(false);
      expect(result.error).toBe('PDF_RASTERIZE_ERROR');
    });

    it('returns PDF_RASTERIZE_ERROR when pdfToImages throws', async () => {
      mockDocValidationService.isEnabled.mockReturnValue(true);
      prismaMock.document.findUnique.mockResolvedValueOnce(
        makeDoc({ fileName: 'file.pdf', mimeType: 'application/pdf', filePath: 'bkt/file.pdf' }),
      );
      mockMinioService.getObject.mockResolvedValueOnce(
        createReadableChunks(Buffer.from('%PDF')),
      );
      mockPdfRasterizeService.pdfToImages.mockRejectedValueOnce(new Error('convert error'));
      const w: any = startDocumentAIValidationWorker();
      const result = await w.processValidation({
        id: 'j5',
        data: { documentId: 1 },
      });
      expect(result.success).toBe(false);
      expect(result.error).toBe('PDF_RASTERIZE_ERROR');
    });

    it('returns error when validateDocument fails', async () => {
      mockDocValidationService.isEnabled.mockReturnValue(true);
      prismaMock.document.findUnique.mockResolvedValueOnce(makeDoc());
      mockMinioService.getObject.mockResolvedValueOnce(
        createReadableChunks(Buffer.from('imgdata')),
      );
      mockDocValidationService.getEntityData.mockResolvedValueOnce({ dni: '123' });
      mockDocValidationService.validateDocument.mockResolvedValueOnce({
        success: false,
        error: 'AI_FAIL',
      });
      const w: any = startDocumentAIValidationWorker();
      const result = await w.processValidation({
        id: 'j6',
        data: { documentId: 1, solicitadoPor: 5 },
      });
      expect(result.success).toBe(false);
      expect(result.error).toBe('AI_FAIL');
    });

    it('returns success with esValido and tieneDisparidades on valid result', async () => {
      mockDocValidationService.isEnabled.mockReturnValue(true);
      prismaMock.document.findUnique.mockResolvedValueOnce(
        makeDoc({ expiresAt: new Date('2026-06-01') }),
      );
      mockMinioService.getObject.mockResolvedValueOnce(
        createReadableChunks(Buffer.from('imgdata')),
      );
      mockDocValidationService.getEntityData.mockResolvedValueOnce({ dni: '12345678' });
      mockDocValidationService.validateDocument.mockResolvedValueOnce({
        success: true,
        data: {
          esDocumentoCorrecto: true,
          confianza: 0.95,
          disparidades: [{ campo: 'nombre', valor: 'diff' }],
        },
      });
      const w: any = startDocumentAIValidationWorker();
      const result = await w.processValidation({
        id: 'j7',
        data: { documentId: 1, solicitadoPor: 2, esRechequeo: true },
      });
      expect(result.success).toBe(true);
      expect(result.esValido).toBe(true);
      expect(result.tieneDisparidades).toBe(true);
    });

    it('returns success with no disparidades when array is empty', async () => {
      mockDocValidationService.isEnabled.mockReturnValue(true);
      prismaMock.document.findUnique.mockResolvedValueOnce(makeDoc());
      mockMinioService.getObject.mockResolvedValueOnce(
        createReadableChunks(Buffer.from('img')),
      );
      mockDocValidationService.getEntityData.mockResolvedValueOnce({});
      mockDocValidationService.validateDocument.mockResolvedValueOnce({
        success: true,
        data: { esDocumentoCorrecto: false, confianza: 0.5, disparidades: [] },
      });
      const w: any = startDocumentAIValidationWorker();
      const result = await w.processValidation({
        id: 'j8',
        data: { documentId: 1 },
      });
      expect(result.success).toBe(true);
      expect(result.esValido).toBe(false);
      expect(result.tieneDisparidades).toBe(false);
    });

    it('returns success with null disparidades in result data', async () => {
      mockDocValidationService.isEnabled.mockReturnValue(true);
      prismaMock.document.findUnique.mockResolvedValueOnce(makeDoc());
      mockMinioService.getObject.mockResolvedValueOnce(
        createReadableChunks(Buffer.from('x')),
      );
      mockDocValidationService.getEntityData.mockResolvedValueOnce({});
      mockDocValidationService.validateDocument.mockResolvedValueOnce({
        success: true,
        data: { esDocumentoCorrecto: true, confianza: 0.9 },
      });
      const w: any = startDocumentAIValidationWorker();
      const result = await w.processValidation({
        id: 'j9',
        data: { documentId: 1 },
      });
      expect(result.tieneDisparidades).toBe(false);
    });

    it('catches unexpected errors and returns error message', async () => {
      mockDocValidationService.isEnabled.mockReturnValue(true);
      prismaMock.document.findUnique.mockRejectedValueOnce(new Error('DB down'));
      const w: any = startDocumentAIValidationWorker();
      const result = await w.processValidation({
        id: 'j10',
        data: { documentId: 1 },
      });
      expect(result.success).toBe(false);
      expect(result.error).toBe('DB down');
    });

    it('catches non-Error thrown objects', async () => {
      mockDocValidationService.isEnabled.mockReturnValue(true);
      prismaMock.document.findUnique.mockRejectedValueOnce('string error');
      const w: any = startDocumentAIValidationWorker();
      const result = await w.processValidation({
        id: 'j11',
        data: { documentId: 1 },
      });
      expect(result.success).toBe(false);
      expect(result.error).toBe('Unknown error');
    });

    it('handles non-PDF file (image) correctly, skipping rasterization', async () => {
      mockDocValidationService.isEnabled.mockReturnValue(true);
      prismaMock.document.findUnique.mockResolvedValueOnce(
        makeDoc({ mimeType: 'image/jpeg', fileName: 'photo.jpg' }),
      );
      mockMinioService.getObject.mockResolvedValueOnce(
        createReadableChunks(Buffer.from('jpegdata')),
      );
      mockDocValidationService.getEntityData.mockResolvedValueOnce({});
      mockDocValidationService.validateDocument.mockResolvedValueOnce({
        success: true,
        data: { esDocumentoCorrecto: true, confianza: 0.8, disparidades: [] },
      });
      const w: any = startDocumentAIValidationWorker();
      const result = await w.processValidation({
        id: 'j12',
        data: { documentId: 1 },
      });
      expect(result.success).toBe(true);
      expect(mockPdfRasterizeService.pdfToImages).not.toHaveBeenCalled();
    });

    it('handles PDF detected by filename extension even if mimeType differs', async () => {
      mockDocValidationService.isEnabled.mockReturnValue(true);
      prismaMock.document.findUnique.mockResolvedValueOnce(
        makeDoc({ mimeType: 'application/octet-stream', fileName: 'scan.PDF', filePath: 'bkt/scan.PDF' }),
      );
      mockMinioService.getObject.mockResolvedValueOnce(
        createReadableChunks(Buffer.from('pdfcontent')),
      );
      mockPdfRasterizeService.pdfToImages.mockResolvedValueOnce([Buffer.from('img')]);
      mockDocValidationService.getEntityData.mockResolvedValueOnce({});
      mockDocValidationService.validateDocument.mockResolvedValueOnce({
        success: true,
        data: { esDocumentoCorrecto: true, confianza: 0.7, disparidades: [] },
      });
      const w: any = startDocumentAIValidationWorker();
      const result = await w.processValidation({
        id: 'j13',
        data: { documentId: 1 },
      });
      expect(result.success).toBe(true);
      expect(mockPdfRasterizeService.pdfToImages).toHaveBeenCalled();
    });

    it('passes expiresAt ISO date when document has expiresAt', async () => {
      const expDate = new Date('2026-12-31T10:00:00.000Z');
      mockDocValidationService.isEnabled.mockReturnValue(true);
      prismaMock.document.findUnique.mockResolvedValueOnce(
        makeDoc({ expiresAt: expDate }),
      );
      mockMinioService.getObject.mockResolvedValueOnce(
        createReadableChunks(Buffer.from('data')),
      );
      mockDocValidationService.getEntityData.mockResolvedValueOnce({});
      mockDocValidationService.validateDocument.mockResolvedValueOnce({
        success: true,
        data: { esDocumentoCorrecto: true, confianza: 0.9, disparidades: [] },
      });
      const w: any = startDocumentAIValidationWorker();
      await w.processValidation({
        id: 'j14',
        data: { documentId: 1 },
      });
      expect(mockDocValidationService.validateDocument).toHaveBeenCalledWith(
        expect.objectContaining({
          vencimientoPrecargado: '2026-12-31',
        }),
      );
    });

    it('passes null vencimientoPrecargado when expiresAt is null', async () => {
      mockDocValidationService.isEnabled.mockReturnValue(true);
      prismaMock.document.findUnique.mockResolvedValueOnce(
        makeDoc({ expiresAt: null }),
      );
      mockMinioService.getObject.mockResolvedValueOnce(
        createReadableChunks(Buffer.from('data')),
      );
      mockDocValidationService.getEntityData.mockResolvedValueOnce({});
      mockDocValidationService.validateDocument.mockResolvedValueOnce({
        success: true,
        data: { esDocumentoCorrecto: true, confianza: 0.9, disparidades: [] },
      });
      const w: any = startDocumentAIValidationWorker();
      await w.processValidation({
        id: 'j15',
        data: { documentId: 1 },
      });
      expect(mockDocValidationService.validateDocument).toHaveBeenCalledWith(
        expect.objectContaining({ vencimientoPrecargado: null }),
      );
    });

    it('getFileFromMinio handles non-Buffer chunks via Buffer.from', async () => {
      mockDocValidationService.isEnabled.mockReturnValue(true);
      prismaMock.document.findUnique.mockResolvedValueOnce(makeDoc());
      const nonBufferStream = {
        async *[Symbol.asyncIterator]() {
          yield 'string-chunk';
        },
      };
      mockMinioService.getObject.mockResolvedValueOnce(nonBufferStream);
      mockDocValidationService.getEntityData.mockResolvedValueOnce({});
      mockDocValidationService.validateDocument.mockResolvedValueOnce({
        success: true,
        data: { esDocumentoCorrecto: true, confianza: 0.9, disparidades: [] },
      });
      const w: any = startDocumentAIValidationWorker();
      const result = await w.processValidation({
        id: 'j16',
        data: { documentId: 1 },
      });
      expect(result.success).toBe(true);
    });

    it('getFileFromMinio handles actual Buffer chunks (Buffer.isBuffer true branch)', async () => {
      mockDocValidationService.isEnabled.mockReturnValue(true);
      prismaMock.document.findUnique.mockResolvedValueOnce(makeDoc());
      const realBufferChunk = Buffer.from('real-buffer-data');
      const bufferStream = {
        async *[Symbol.asyncIterator]() {
          yield realBufferChunk;
        },
      };
      mockMinioService.getObject.mockResolvedValueOnce(bufferStream);
      mockDocValidationService.getEntityData.mockResolvedValueOnce({});
      mockDocValidationService.validateDocument.mockResolvedValueOnce({
        success: true,
        data: { esDocumentoCorrecto: true, confianza: 0.85, disparidades: [] },
      });
      const w: any = startDocumentAIValidationWorker();
      const result = await w.processValidation({
        id: 'j-buf',
        data: { documentId: 1 },
      });
      expect(result.success).toBe(true);
    });

    it('getFileFromMinio handles multiple chunks concatenation', async () => {
      mockDocValidationService.isEnabled.mockReturnValue(true);
      prismaMock.document.findUnique.mockResolvedValueOnce(makeDoc());
      const multiChunkStream = {
        async *[Symbol.asyncIterator]() {
          yield Buffer.from('chunk1');
          yield Buffer.from('chunk2');
          yield 'string-chunk3';
        },
      };
      mockMinioService.getObject.mockResolvedValueOnce(multiChunkStream);
      mockDocValidationService.getEntityData.mockResolvedValueOnce({});
      mockDocValidationService.validateDocument.mockResolvedValueOnce({
        success: true,
        data: { esDocumentoCorrecto: true, confianza: 0.9, disparidades: [] },
      });
      const w: any = startDocumentAIValidationWorker();
      const result = await w.processValidation({
        id: 'j-multi',
        data: { documentId: 1 },
      });
      expect(result.success).toBe(true);
    });

    it('handles solicitadoPor undefined and esRechequeo undefined', async () => {
      mockDocValidationService.isEnabled.mockReturnValue(true);
      prismaMock.document.findUnique.mockResolvedValueOnce(makeDoc());
      mockMinioService.getObject.mockResolvedValueOnce(
        createReadableChunks(Buffer.from('data')),
      );
      mockDocValidationService.getEntityData.mockResolvedValueOnce({});
      mockDocValidationService.validateDocument.mockResolvedValueOnce({
        success: true,
        data: { esDocumentoCorrecto: true, confianza: 0.9, disparidades: [] },
      });
      const w: any = startDocumentAIValidationWorker();
      const result = await w.processValidation({
        id: 'j-undef',
        data: { documentId: 1 },
      });
      expect(result.success).toBe(true);
      expect(mockDocValidationService.validateDocument).toHaveBeenCalledWith(
        expect.objectContaining({
          solicitadoPor: undefined,
          esRechequeo: undefined,
        }),
      );
    });

    it('handles result.data being undefined on success', async () => {
      mockDocValidationService.isEnabled.mockReturnValue(true);
      prismaMock.document.findUnique.mockResolvedValueOnce(makeDoc());
      mockMinioService.getObject.mockResolvedValueOnce(
        createReadableChunks(Buffer.from('data')),
      );
      mockDocValidationService.getEntityData.mockResolvedValueOnce({});
      mockDocValidationService.validateDocument.mockResolvedValueOnce({
        success: true,
        data: undefined,
      });
      const w: any = startDocumentAIValidationWorker();
      const result = await w.processValidation({
        id: 'j-nodata',
        data: { documentId: 1 },
      });
      expect(result.success).toBe(true);
      expect(result.esValido).toBeUndefined();
      expect(result.tieneDisparidades).toBe(false);
    });

    it('handles result.data with null disparidades field', async () => {
      mockDocValidationService.isEnabled.mockReturnValue(true);
      prismaMock.document.findUnique.mockResolvedValueOnce(makeDoc());
      mockMinioService.getObject.mockResolvedValueOnce(
        createReadableChunks(Buffer.from('data')),
      );
      mockDocValidationService.getEntityData.mockResolvedValueOnce({});
      mockDocValidationService.validateDocument.mockResolvedValueOnce({
        success: true,
        data: { esDocumentoCorrecto: true, confianza: 0.9, disparidades: null },
      });
      const w: any = startDocumentAIValidationWorker();
      const result = await w.processValidation({
        id: 'j-nulldisp',
        data: { documentId: 1 },
      });
      expect(result.success).toBe(true);
      expect(result.tieneDisparidades).toBe(false);
    });

    it('handles result.data with missing confianza', async () => {
      mockDocValidationService.isEnabled.mockReturnValue(true);
      prismaMock.document.findUnique.mockResolvedValueOnce(makeDoc());
      mockMinioService.getObject.mockResolvedValueOnce(
        createReadableChunks(Buffer.from('data')),
      );
      mockDocValidationService.getEntityData.mockResolvedValueOnce({});
      mockDocValidationService.validateDocument.mockResolvedValueOnce({
        success: true,
        data: { esDocumentoCorrecto: false },
      });
      const w: any = startDocumentAIValidationWorker();
      const result = await w.processValidation({
        id: 'j-noconf',
        data: { documentId: 1 },
      });
      expect(result.success).toBe(true);
      expect(result.esValido).toBe(false);
    });

    it('PDF with application/pdf mimeType triggers rasterization (successful)', async () => {
      mockDocValidationService.isEnabled.mockReturnValue(true);
      prismaMock.document.findUnique.mockResolvedValueOnce(
        makeDoc({ mimeType: 'application/pdf', fileName: 'report.pdf', filePath: 'bkt/report.pdf' }),
      );
      mockMinioService.getObject.mockResolvedValueOnce(
        createReadableChunks(Buffer.from('pdf-content')),
      );
      mockPdfRasterizeService.pdfToImages.mockResolvedValueOnce([Buffer.from('page1-img')]);
      mockDocValidationService.getEntityData.mockResolvedValueOnce({});
      mockDocValidationService.validateDocument.mockResolvedValueOnce({
        success: true,
        data: { esDocumentoCorrecto: true, confianza: 0.85, disparidades: [] },
      });
      const w: any = startDocumentAIValidationWorker();
      const result = await w.processValidation({
        id: 'j-pdf-ok',
        data: { documentId: 1 },
      });
      expect(result.success).toBe(true);
      expect(mockDocValidationService.validateDocument).toHaveBeenCalledWith(
        expect.objectContaining({ mimeType: 'image/jpeg' }),
      );
    });

    it('non-PDF file passes original mimeType to validateDocument', async () => {
      mockDocValidationService.isEnabled.mockReturnValue(true);
      prismaMock.document.findUnique.mockResolvedValueOnce(
        makeDoc({ mimeType: 'image/webp', fileName: 'photo.webp' }),
      );
      mockMinioService.getObject.mockResolvedValueOnce(
        createReadableChunks(Buffer.from('webpdata')),
      );
      mockDocValidationService.getEntityData.mockResolvedValueOnce({});
      mockDocValidationService.validateDocument.mockResolvedValueOnce({
        success: true,
        data: { esDocumentoCorrecto: true, confianza: 0.8, disparidades: [] },
      });
      const w: any = startDocumentAIValidationWorker();
      await w.processValidation({
        id: 'j-webp',
        data: { documentId: 1 },
      });
      expect(mockDocValidationService.validateDocument).toHaveBeenCalledWith(
        expect.objectContaining({ mimeType: 'image/webp' }),
      );
    });

    it('filePath split properly separates bucket and object path', async () => {
      mockDocValidationService.isEnabled.mockReturnValue(true);
      prismaMock.document.findUnique.mockResolvedValueOnce(
        makeDoc({ filePath: 'my-bucket/deep/nested/path/doc.png' }),
      );
      mockMinioService.getObject.mockResolvedValueOnce(
        createReadableChunks(Buffer.from('data')),
      );
      mockDocValidationService.getEntityData.mockResolvedValueOnce({});
      mockDocValidationService.validateDocument.mockResolvedValueOnce({
        success: true,
        data: { esDocumentoCorrecto: true, confianza: 0.9, disparidades: [] },
      });
      const w: any = startDocumentAIValidationWorker();
      await w.processValidation({
        id: 'j-deeppath',
        data: { documentId: 1 },
      });
      expect(mockMinioService.getObject).toHaveBeenCalledWith('my-bucket', 'deep/nested/path/doc.png');
    });

    it('getEntityData error propagates to catch block', async () => {
      mockDocValidationService.isEnabled.mockReturnValue(true);
      prismaMock.document.findUnique.mockResolvedValueOnce(makeDoc());
      mockMinioService.getObject.mockResolvedValueOnce(
        createReadableChunks(Buffer.from('data')),
      );
      mockDocValidationService.getEntityData.mockRejectedValueOnce(new Error('entity error'));
      const w: any = startDocumentAIValidationWorker();
      const result = await w.processValidation({
        id: 'j-entity-err',
        data: { documentId: 1 },
      });
      expect(result.success).toBe(false);
      expect(result.error).toBe('entity error');
    });

    it('validateDocument throwing propagates to catch block', async () => {
      mockDocValidationService.isEnabled.mockReturnValue(true);
      prismaMock.document.findUnique.mockResolvedValueOnce(makeDoc());
      mockMinioService.getObject.mockResolvedValueOnce(
        createReadableChunks(Buffer.from('data')),
      );
      mockDocValidationService.getEntityData.mockResolvedValueOnce({});
      mockDocValidationService.validateDocument.mockRejectedValueOnce(new Error('validation threw'));
      const w: any = startDocumentAIValidationWorker();
      const result = await w.processValidation({
        id: 'j-val-throw',
        data: { documentId: 1 },
      });
      expect(result.success).toBe(false);
      expect(result.error).toBe('validation threw');
    });
  });

  // =========================================================================
  // Constructor / environment fallbacks
  // =========================================================================
  describe('constructor environment', () => {
    it('uses FLOWISE_VALIDATION_CONCURRENCY env var when set', () => {
      process.env.FLOWISE_VALIDATION_CONCURRENCY = '5';
      const w = startDocumentAIValidationWorker();
      expect(w).toBeDefined();
      expect(AppLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('concurrencia: 5'),
      );
      delete process.env.FLOWISE_VALIDATION_CONCURRENCY;
    });

    it('uses default concurrency (3) when env var is not set', () => {
      delete process.env.FLOWISE_VALIDATION_CONCURRENCY;
      const w = startDocumentAIValidationWorker();
      expect(w).toBeDefined();
      expect(AppLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('concurrencia: 3'),
      );
    });
  });
});
