import { resetPrismaMock, prismaMock } from '../mocks/prisma.mock';

jest.mock('../../src/config/logger', () => ({
  AppLogger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

// Mock dynamic imports used by JobsService.loadBatchContext()
const minioService = { uploadDocument: jest.fn() };
jest.mock('../../src/services/minio.service', () => ({ minioService }));
jest.mock('../../src/services/media.service', () => ({
  MediaService: { composePdfFromImages: jest.fn(async () => Buffer.from('pdf')) },
}));
jest.mock('../../src/config/database', () => ({
  db: { getClient: () => prismaMock },
}));
jest.mock('../../src/services/queue.service', () => ({
  queueService: { addDocumentValidation: jest.fn(async () => undefined) },
}));
jest.mock('crypto', () => {
  const actual = jest.requireActual('crypto');
  return {
    ...actual,
    randomBytes: jest.fn(() => Buffer.from('abcd')),
    createHash: jest.fn(() => ({
      update: () => ({ digest: () => 'checksum' }),
      digest: () => 'checksum',
    })),
  };
});

import { JobsService } from '../../src/services/jobs.service';

describe('JobsService', () => {
  beforeEach(() => {
    resetPrismaMock();
    jest.clearAllMocks();
    // Avoid real timers in createDocumentsBatch
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('createDocumentsBatch creates job, schedules async processing, updates metrics', async () => {
    prismaMock.documentTemplate.findFirst.mockResolvedValueOnce({ id: 1, entityType: 'DADOR', active: true } as any);
    prismaMock.document.findFirst.mockResolvedValueOnce(null); // no duplicate
    minioService.uploadDocument.mockResolvedValueOnce({ bucketName: 'b', objectPath: 'x.pdf' });
    prismaMock.document.create.mockResolvedValueOnce({ id: 10, filePath: 'b/x.pdf' } as any);

    const payload: any = {
      tenantEmpresaId: 1,
      dadorId: 1,
      files: [{ buffer: Buffer.from('a'), mimetype: 'application/pdf', originalname: 'a.pdf' }],
    };
    const id = JobsService.createDocumentsBatch(payload);
    expect(id).toContain('job_');
    expect(JobsService.getJob(id)?.status).toBe('queued');

    // Run the scheduled job
    await jest.runOnlyPendingTimersAsync();
    const job = JobsService.getJob(id);
    expect(job?.status).toBe('completed');
    expect(job?.progress).toBe(1);
  });

  it('skips duplicates when checksum already exists', async () => {
    prismaMock.documentTemplate.findFirst.mockResolvedValueOnce({ id: 1, entityType: 'DADOR', active: true } as any);
    prismaMock.document.findFirst.mockResolvedValueOnce({ id: 99, fileName: 'old.pdf', filePath: 'b/old.pdf', uploadedAt: new Date() } as any);

    const payload: any = {
      tenantEmpresaId: 1,
      dadorId: 1,
      files: [{ buffer: Buffer.from('a'), mimetype: 'application/pdf', originalname: 'a.pdf' }],
      skipDedupe: false,
    };
    const id = JobsService.createDocumentsBatch(payload);
    await jest.runOnlyPendingTimersAsync();
    const job = JobsService.getJob(id)!;
    expect(job.stats?.skippedDuplicates).toBe(1);
    expect(job.details?.[0]?.outcome).toBe('duplicate');
  });

  it('records file failure when missing template (batch still completes)', async () => {
    prismaMock.documentTemplate.findFirst.mockResolvedValueOnce(null);
    prismaMock.document.findFirst.mockResolvedValueOnce(null);
    minioService.uploadDocument.mockResolvedValueOnce({ bucketName: 'b', objectPath: 'x.pdf' });

    const payload: any = {
      tenantEmpresaId: 1,
      dadorId: 1,
      files: [{ buffer: Buffer.from('a'), mimetype: 'application/pdf', originalname: 'a.pdf' }],
    };
    const id = JobsService.createDocumentsBatch(payload);
    await jest.runOnlyPendingTimersAsync();
    const job = JobsService.getJob(id)!;
    expect(job.status).toBe('completed');
    expect(job.stats?.failed).toBe(1);
    expect(job.details?.[0]?.outcome).toBe('failed');
    expect(job.details?.[0]?.error || '').toContain('plantilla');
  });
});


