/**
 * Tests unitarios para SchedulerService.runTaskManually y helpers.
 * @jest-environment node
 */

jest.mock('node-cron', () => ({
  schedule: jest.fn(() => ({
    start: jest.fn(),
    stop: jest.fn(),
    getStatus: jest.fn(() => 'scheduled'),
  })),
}));

jest.mock('../src/config/logger', () => ({
  AppLogger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

jest.mock('../src/services/document.service', () => ({
  DocumentService: { checkExpiredDocuments: jest.fn() },
}));

jest.mock('../src/services/alert.service', () => ({
  alertService: { runScheduledChecks: jest.fn() },
}));

jest.mock('../src/services/queue.service', () => ({
  queueService: { cleanQueue: jest.fn(), addMissingCheckForEquipo: jest.fn() },
}));

jest.mock('../src/services/performance.service', () => ({
  performanceService: { refreshMaterializedView: jest.fn() },
}));

jest.mock('../src/services/system-config.service', () => ({
  SystemConfigService: { getConfig: jest.fn() },
}));

jest.mock('../src/services/equipo-evaluation.service', () => ({
  EquipoEvaluationService: { evaluarEquipos: jest.fn() },
}));

jest.mock('../src/services/compliance.service', () => ({
  invalidateComplianceCache: jest.fn(),
}));

jest.mock('../src/services/minio.service', () => ({
  minioService: {
    getResolvedBucketName: jest.fn((tenantEmpresaId: number) => `t-${tenantEmpresaId}`),
    listObjectKeys: jest.fn(),
    deleteDocument: jest.fn(),
  },
}));

jest.mock('../src/config/database', () => {
  const client = {
    equipo: { findMany: jest.fn() },
    dadorCarga: { findMany: jest.fn() },
    document: { findMany: jest.fn() },
  };
  return {
    prisma: {
      auditLog: { deleteMany: jest.fn() },
    },
    db: {
      getClient: () => client,
    },
  };
});

import { SchedulerService } from '../src/services/scheduler.service';
import { DocumentService } from '../src/services/document.service';
import { alertService } from '../src/services/alert.service';
import { queueService } from '../src/services/queue.service';
import { performanceService } from '../src/services/performance.service';
import { SystemConfigService } from '../src/services/system-config.service';
import { EquipoEvaluationService } from '../src/services/equipo-evaluation.service';
import { invalidateComplianceCache } from '../src/services/compliance.service';
import { minioService } from '../src/services/minio.service';
import { prisma, db } from '../src/config/database';

// NOSONAR: mocks genéricos para tests
const prismaMock = prisma as any;
const dbMock = db as any;

describe('SchedulerService.runTaskManually', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (SchedulerService as any).instance = undefined;
  });

  it('ejecuta document-expiration-check', async () => {
    const svc = SchedulerService.getInstance();
    (DocumentService.checkExpiredDocuments as jest.Mock).mockResolvedValue(0);

    await svc.runTaskManually('document-expiration-check');

    expect(DocumentService.checkExpiredDocuments).toHaveBeenCalled();
  });

  it('ejecuta alert-checks', async () => {
    const svc = SchedulerService.getInstance();
    (alertService.runScheduledChecks as jest.Mock).mockResolvedValue(undefined);

    await svc.runTaskManually('alert-checks');

    expect(alertService.runScheduledChecks).toHaveBeenCalled();
  });

  it('ejecuta queue-cleanup', async () => {
    const svc = SchedulerService.getInstance();
    (queueService.cleanQueue as jest.Mock).mockResolvedValue(undefined);

    await svc.runTaskManually('queue-cleanup');

    expect(queueService.cleanQueue).toHaveBeenCalled();
  });

  it('ejecuta performance-optimization', async () => {
    const svc = SchedulerService.getInstance();
    (performanceService.refreshMaterializedView as jest.Mock).mockResolvedValue(undefined);

    await svc.runTaskManually('performance-optimization');

    expect(performanceService.refreshMaterializedView).toHaveBeenCalled();
  });

  it('ejecuta audit-retention usando default de días y borra logs', async () => {
    const svc = SchedulerService.getInstance();
    (SystemConfigService.getConfig as jest.Mock).mockResolvedValue(null);
    prismaMock.auditLog.deleteMany.mockResolvedValue({ count: 3 });

    await svc.runTaskManually('audit-retention');

    expect(prismaMock.auditLog.deleteMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { createdAt: expect.any(Object) } })
    );
  });

  it('ejecuta daily-compliance-evaluation e invalida cache', async () => {
    const svc = SchedulerService.getInstance();
    const client = dbMock.getClient();
    client.equipo.findMany.mockResolvedValue([{ id: 1 }, { id: 2 }]);
    (EquipoEvaluationService.evaluarEquipos as jest.Mock).mockResolvedValue([]);

    await svc.runTaskManually('daily-compliance-evaluation');

    expect(invalidateComplianceCache).toHaveBeenCalled();
    expect(EquipoEvaluationService.evaluarEquipos).toHaveBeenCalledWith([1, 2]);
  });

  it('ejecuta minio-orphan-cleanup y borra orphans (hasta 100)', async () => {
    const svc = SchedulerService.getInstance();
    const client = dbMock.getClient();
    client.dadorCarga.findMany.mockResolvedValue([{ tenantEmpresaId: 1 }]);
    client.document.findMany.mockResolvedValue([{ filePath: 't-1/a.pdf' }]);
    (minioService.listObjectKeys as jest.Mock).mockResolvedValue(['a.pdf', 'b.pdf']);
    (minioService.deleteDocument as jest.Mock).mockResolvedValue(undefined);

    await svc.runTaskManually('minio-orphan-cleanup');

    expect(minioService.getResolvedBucketName).toHaveBeenCalledWith(1);
    expect(minioService.deleteDocument).toHaveBeenCalledWith('t-1', 'b.pdf');
  });

  it('lanza error para tarea desconocida', async () => {
    const svc = SchedulerService.getInstance();
    await expect(svc.runTaskManually('nope')).rejects.toThrow('Tarea desconocida');
  });
});

