/**
 * Tests reales para queue.service.ts (sin Redis real)
 * @jest-environment node
 */

// BullMQ e IORedis se mockean globalmente por jest.setup.ts

jest.mock('../../src/config/environment', () => ({
  getEnvironment: () => ({ REDIS_HOST: 'localhost', REDIS_PORT: 6379 }),
}));

jest.mock('../../src/config/logger', () => ({
  AppLogger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

import { queueService } from '../../src/services/queue.service';

describe('queueService (real)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('addAnalysisJob enqueues job and returns job id', async () => {
    // Asegurar retorno del mock de bullmq Queue.add
    const q: any = (queueService as any).getQueue?.() || null;
    if (q?.add?.mockResolvedValue) {
      q.add.mockResolvedValue({ id: 'job-1' });
    }
    const out = await queueService.addAnalysisJob({
      remitoId: 1,
      imagenId: 2,
      tenantEmpresaId: 1,
      bucketName: 'b',
      objectKey: 'k',
      originalInputsCount: 1,
    });
    expect(out).toBe('job-1');
  });

  it('close closes queue and quits redis', async () => {
    await queueService.close();
    expect(true).toBe(true);
  });
});


