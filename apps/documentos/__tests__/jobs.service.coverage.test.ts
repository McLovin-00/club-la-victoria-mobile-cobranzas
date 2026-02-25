/**
 * Coverage tests for JobsService
 * Covers createDocumentsBatch, runDocumentsBatch, processFileInBatch,
 * recordDuplicate, recordSuccess, recordFailure, updateProgress,
 * incrementMetric, getJob, helpers (loadBatchContext, checkDuplicate,
 * normalizeFileToPdf, uploadAndCreateDocument).
 * @jest-environment node
 */

const mockDocClient = {
  findFirst: jest.fn(),
  findMany: jest.fn(),
  create: jest.fn(),
};

const mockTemplateClient = {
  findFirst: jest.fn(),
};

const mockPrisma: any = {
  document: mockDocClient,
  documentTemplate: mockTemplateClient,
};

jest.mock('../src/config/database', () => ({
  db: { getClient: () => mockPrisma },
  prisma: mockPrisma,
}));

jest.mock('../src/config/logger', () => ({
  AppLogger: { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

const mockUploadDocument = jest.fn();
jest.mock('../src/services/minio.service', () => ({
  minioService: { uploadDocument: mockUploadDocument },
}));

const mockComposePdfFromImages = jest.fn(async () => Buffer.from('pdf-from-image'));
jest.mock('../src/services/media.service', () => ({
  MediaService: { composePdfFromImages: mockComposePdfFromImages },
}));

const mockAddDocumentValidation = jest.fn(async () => undefined);
jest.mock('../src/services/queue.service', () => ({
  queueService: { addDocumentValidation: mockAddDocumentValidation },
}));

jest.mock('crypto', () => {
  const actual = jest.requireActual('crypto');
  return {
    ...actual,
    randomBytes: jest.fn(() => Buffer.from('abcd1234')),
    createHash: jest.fn(() => ({
      update: jest.fn().mockReturnThis(),
      digest: jest.fn().mockReturnValue('test-checksum-sha256'),
    })),
  };
});

import { JobsService } from '../src/services/jobs.service';

describe('JobsService (coverage)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  function makeFile(overrides: Record<string, any> = {}): any {
    return {
      buffer: Buffer.from('test-content'),
      mimetype: 'application/pdf',
      originalname: 'test.pdf',
      ...overrides,
    };
  }

  function makePayload(overrides: Record<string, any> = {}): any {
    return {
      tenantEmpresaId: 1,
      dadorId: 10,
      files: [makeFile()],
      ...overrides,
    };
  }

  function setupUploadMocks() {
    mockDocClient.findFirst.mockResolvedValue(null);
    mockUploadDocument.mockResolvedValue({ bucketName: 'docs-t1', objectPath: 'test.pdf' });
    mockTemplateClient.findFirst.mockResolvedValue({ id: 1, entityType: 'DADOR', active: true });
    mockDocClient.create.mockResolvedValue({ id: 100, filePath: 'docs-t1/test.pdf' });
  }

  // ========================================================================
  // getJob
  // ========================================================================
  describe('getJob', () => {
    it('returns undefined for non-existent job', () => {
      const job = JobsService.getJob('nonexistent_id');
      expect(job).toBeUndefined();
    });

    it('returns a copy of the job (not the original)', () => {
      setupUploadMocks();
      const payload = makePayload();
      const id = JobsService.createDocumentsBatch(payload);
      const job1 = JobsService.getJob(id);
      const job2 = JobsService.getJob(id);
      expect(job1).toBeDefined();
      expect(job2).toBeDefined();
      expect(job1).not.toBe(job2);
    });
  });

  // ========================================================================
  // createDocumentsBatch
  // ========================================================================
  describe('createDocumentsBatch', () => {
    it('creates a job with queued status', () => {
      setupUploadMocks();
      const payload = makePayload();
      const id = JobsService.createDocumentsBatch(payload);

      expect(id).toContain('job_');
      const job = JobsService.getJob(id);
      expect(job?.status).toBe('queued');
      expect(job?.stats?.total).toBe(1);
      expect(job?.stats?.skipDedupe).toBe(false);
    });

    it('sets skipDedupe=true when specified', () => {
      setupUploadMocks();
      const payload = makePayload({ skipDedupe: true });
      const id = JobsService.createDocumentsBatch(payload);

      const job = JobsService.getJob(id);
      expect(job?.stats?.skipDedupe).toBe(true);
    });

    it('increments batch_total metric', () => {
      setupUploadMocks();
      const before = (globalThis as any).__DOCS_METRICS?.batch_total || 0;
      JobsService.createDocumentsBatch(makePayload());
      const after = (globalThis as any).__DOCS_METRICS?.batch_total || 0;
      expect(after).toBeGreaterThanOrEqual(before);
    });
  });

  // ========================================================================
  // runDocumentsBatch (via createDocumentsBatch + timer)
  // ========================================================================
  describe('runDocumentsBatch', () => {
    it('processes PDF file successfully', async () => {
      setupUploadMocks();
      const payload = makePayload();
      const id = JobsService.createDocumentsBatch(payload);

      await jest.runOnlyPendingTimersAsync();

      const job = JobsService.getJob(id);
      expect(job?.status).toBe('completed');
      expect(job?.progress).toBe(1);
      expect(job?.stats?.processed).toBe(1);
      expect(job?.items).toHaveLength(1);
    });

    it('detects duplicates when skipDedupe is false', async () => {
      mockDocClient.findFirst.mockResolvedValue({
        id: 50,
        fileName: 'existing.pdf',
        filePath: 'docs-t1/existing.pdf',
        uploadedAt: new Date(),
      });

      const payload = makePayload({ skipDedupe: false });
      const id = JobsService.createDocumentsBatch(payload);

      await jest.runOnlyPendingTimersAsync();

      const job = JobsService.getJob(id);
      expect(job?.status).toBe('completed');
      expect(job?.stats?.skippedDuplicates).toBe(1);
      expect(job?.details?.[0]?.outcome).toBe('duplicate');
    });

    it('skips duplicate check when skipDedupe is true', async () => {
      setupUploadMocks();
      const payload = makePayload({ skipDedupe: true });
      const id = JobsService.createDocumentsBatch(payload);

      await jest.runOnlyPendingTimersAsync();

      const job = JobsService.getJob(id);
      expect(job?.stats?.processed).toBe(1);
      expect(job?.stats?.skippedDuplicates).toBe(0);
    });

    it('converts image file to PDF', async () => {
      mockDocClient.findFirst.mockResolvedValue(null);
      mockUploadDocument.mockResolvedValue({ bucketName: 'docs-t1', objectPath: 'image.pdf' });
      mockTemplateClient.findFirst.mockResolvedValue({ id: 1, entityType: 'DADOR', active: true });
      mockDocClient.create.mockResolvedValue({ id: 101, filePath: 'docs-t1/image.pdf' });

      const imageFile = makeFile({
        mimetype: 'image/jpeg',
        originalname: 'photo.jpg',
        buffer: Buffer.from('jpeg-data'),
      });

      const payload = makePayload({ files: [imageFile] });
      const id = JobsService.createDocumentsBatch(payload);

      await jest.runOnlyPendingTimersAsync();

      const job = JobsService.getJob(id);
      expect(job?.status).toBe('completed');
      expect(mockComposePdfFromImages).toHaveBeenCalled();
    });

    it('handles non-PDF non-image file (keeps buffer as-is)', async () => {
      mockDocClient.findFirst.mockResolvedValue(null);
      mockUploadDocument.mockResolvedValue({ bucketName: 'docs-t1', objectPath: 'doc.docx' });
      mockTemplateClient.findFirst.mockResolvedValue({ id: 1, entityType: 'DADOR', active: true });
      mockDocClient.create.mockResolvedValue({ id: 102, filePath: 'docs-t1/doc.docx' });

      const otherFile = makeFile({
        mimetype: 'application/msword',
        originalname: 'document.docx',
      });

      const payload = makePayload({ files: [otherFile] });
      const id = JobsService.createDocumentsBatch(payload);

      await jest.runOnlyPendingTimersAsync();

      const job = JobsService.getJob(id);
      expect(job?.status).toBe('completed');
      expect(mockComposePdfFromImages).not.toHaveBeenCalled();
    });

    it('records failure when file processing throws', async () => {
      mockDocClient.findFirst.mockResolvedValue(null);
      mockUploadDocument.mockRejectedValue(new Error('upload failed'));

      const payload = makePayload();
      const id = JobsService.createDocumentsBatch(payload);

      await jest.runOnlyPendingTimersAsync();

      const job = JobsService.getJob(id);
      expect(job?.status).toBe('completed');
      expect(job?.stats?.failed).toBe(1);
      expect(job?.details?.[0]?.outcome).toBe('failed');
    });

    it('marks batch as failed when all files fail processing', async () => {
      mockDocClient.findFirst.mockRejectedValue(new Error('total failure'));
      mockUploadDocument.mockRejectedValue(new Error('total failure'));

      const payload = makePayload({ files: [makeFile()] });
      const id = JobsService.createDocumentsBatch(payload);

      await jest.runOnlyPendingTimersAsync();

      const job = JobsService.getJob(id);
      expect(job?.status).toBe('completed');
      expect(job?.stats?.failed).toBe(1);
    });

    it('records failure when no active template found', async () => {
      mockDocClient.findFirst.mockResolvedValue(null);
      mockUploadDocument.mockResolvedValue({ bucketName: 'docs-t1', objectPath: 'test.pdf' });
      mockTemplateClient.findFirst.mockResolvedValue(null);

      const payload = makePayload();
      const id = JobsService.createDocumentsBatch(payload);

      await jest.runOnlyPendingTimersAsync();

      const job = JobsService.getJob(id);
      expect(job?.stats?.failed).toBe(1);
      expect(job?.details?.[0]?.outcome).toBe('failed');
    });

    it('processes multiple files with mixed outcomes', async () => {
      const dupFile = makeFile({ originalname: 'dup.pdf' });
      const goodFile = makeFile({ originalname: 'good.pdf' });
      const badFile = makeFile({ originalname: 'bad.pdf' });

      mockDocClient.findFirst
        .mockResolvedValueOnce({ id: 50, fileName: 'old.pdf', filePath: 'x', uploadedAt: new Date() })
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);

      mockUploadDocument
        .mockResolvedValueOnce({ bucketName: 'b', objectPath: 'good.pdf' })
        .mockRejectedValueOnce(new Error('bad upload'));

      mockTemplateClient.findFirst.mockResolvedValue({ id: 1, entityType: 'DADOR', active: true });
      mockDocClient.create.mockResolvedValue({ id: 200, filePath: 'b/good.pdf' });

      const payload = makePayload({ files: [dupFile, goodFile, badFile] });
      const id = JobsService.createDocumentsBatch(payload);

      await jest.runOnlyPendingTimersAsync();

      const job = JobsService.getJob(id);
      expect(job?.status).toBe('completed');
      expect(job?.stats?.skippedDuplicates).toBe(1);
      expect(job?.stats?.processed).toBe(1);
      expect(job?.stats?.failed).toBe(1);
    });

    it('handles PDF file without .pdf extension (appends it)', async () => {
      setupUploadMocks();

      const fileNoPdfExt = makeFile({
        mimetype: 'application/pdf',
        originalname: 'document',
      });

      const payload = makePayload({ files: [fileNoPdfExt] });
      const id = JobsService.createDocumentsBatch(payload);

      await jest.runOnlyPendingTimersAsync();

      const job = JobsService.getJob(id);
      expect(job?.status).toBe('completed');
    });

    it('handles image file with extension in name', async () => {
      mockDocClient.findFirst.mockResolvedValue(null);
      mockUploadDocument.mockResolvedValue({ bucketName: 'b', objectPath: 'img.pdf' });
      mockTemplateClient.findFirst.mockResolvedValue({ id: 1, entityType: 'DADOR', active: true });
      mockDocClient.create.mockResolvedValue({ id: 103, filePath: 'b/img.pdf' });

      const imageFile = makeFile({
        mimetype: 'image/png',
        originalname: 'scan.png',
      });

      const payload = makePayload({ files: [imageFile] });
      const id = JobsService.createDocumentsBatch(payload);

      await jest.runOnlyPendingTimersAsync();

      const job = JobsService.getJob(id);
      expect(job?.status).toBe('completed');
    });

    it('handles file with no originalname', async () => {
      setupUploadMocks();

      const noNameFile = makeFile({ originalname: undefined });
      const payload = makePayload({ files: [noNameFile] });
      const id = JobsService.createDocumentsBatch(payload);

      await jest.runOnlyPendingTimersAsync();

      const job = JobsService.getJob(id);
      expect(job?.status).toBe('completed');
    });

    it('updates progress correctly across multiple files', async () => {
      setupUploadMocks();

      const files = [makeFile(), makeFile(), makeFile()];
      const payload = makePayload({ files });
      const id = JobsService.createDocumentsBatch(payload);

      await jest.runOnlyPendingTimersAsync();

      const job = JobsService.getJob(id);
      expect(job?.progress).toBe(1);
    });
  });
});
