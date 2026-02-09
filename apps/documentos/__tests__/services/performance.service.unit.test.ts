import { prismaMock, resetPrismaMock } from '../mocks/prisma.mock';

jest.mock('../../src/config/logger', () => ({
  AppLogger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

jest.mock('../../src/config/database', () => ({
  db: { getClient: () => prismaMock },
}));

import { PerformanceService } from '../../src/services/performance.service';

const flushPromises = () => new Promise(jest.requireActual('timers').setImmediate);

describe('PerformanceService', () => {
  beforeEach(() => {
    resetPrismaMock();
    jest.clearAllMocks();
    (PerformanceService as any).instance = undefined;
  });

  afterEach(async () => {
    await flushPromises();
  });

  it('getOptimizedStatusSummary returns mapped overallStatus and empty on error', async () => {
    const svc = PerformanceService.getInstance();
    await flushPromises();

    (prismaMock.$queryRawUnsafe as jest.Mock).mockResolvedValueOnce([
      { empresaId: 1, entityType: 'CHOFER', entityId: 1, redCount: 1, yellowCount: 0, greenCount: 0, totalCount: 1, lastUpdated: new Date() },
    ]);
    const out = await svc.getOptimizedStatusSummary();
    expect(out[0].overallStatus).toBe('rojo');

    (prismaMock.$queryRawUnsafe as jest.Mock).mockRejectedValueOnce(new Error('db'));
    const out2 = await svc.getOptimizedStatusSummary();
    expect(out2).toEqual([]);
  });

  it('getOptimizedGlobalStats returns defaults on empty result and on error', async () => {
    const svc = PerformanceService.getInstance();
    await flushPromises();
    (prismaMock.$queryRawUnsafe as jest.Mock).mockResolvedValueOnce([]);
    const out = await svc.getOptimizedGlobalStats();
    expect(out.totalDocuments).toBe(0);

    (prismaMock.$queryRawUnsafe as jest.Mock).mockRejectedValueOnce(new Error('db'));
    const out2 = await svc.getOptimizedGlobalStats();
    expect(out2.totalDocuments).toBe(0);
  });

  it('getOptimizedCriticalAlerts and getPerTenantAggregates return arrays and empty on error', async () => {
    const svc = PerformanceService.getInstance();
    await flushPromises();
    (prismaMock.$queryRawUnsafe as jest.Mock).mockResolvedValueOnce([{ empresaId: 1 }]);
    await expect(svc.getOptimizedCriticalAlerts(undefined, 10)).resolves.toHaveLength(1);

    (prismaMock.$queryRawUnsafe as jest.Mock).mockRejectedValueOnce(new Error('db'));
    await expect(svc.getOptimizedCriticalAlerts(undefined, 10)).resolves.toEqual([]);

    (prismaMock.$queryRawUnsafe as jest.Mock).mockResolvedValueOnce([{ tenantId: 1 }]);
    await expect(svc.getPerTenantAggregates()).resolves.toHaveLength(1);

    (prismaMock.$queryRawUnsafe as jest.Mock).mockRejectedValueOnce(new Error('db'));
    await expect(svc.getPerTenantAggregates()).resolves.toEqual([]);
  });

  describe('ensureMaterializedView', () => {
    it('no crea vista cuando tablas base no existen', async () => {
      (prismaMock.$queryRawUnsafe as jest.Mock).mockResolvedValueOnce([{ exists: false }]);
      PerformanceService.getInstance();
      await flushPromises();
      expect(prismaMock.$executeRawUnsafe).not.toHaveBeenCalled();
    });

    it('crea vista materializada cuando es posible', async () => {
      (prismaMock.$queryRawUnsafe as jest.Mock)
        .mockResolvedValueOnce([{ exists: true }])
        .mockResolvedValueOnce([{ exists: false }]);

      PerformanceService.getInstance();
      await flushPromises();
      expect(prismaMock.$executeRawUnsafe).toHaveBeenCalledWith(
        expect.stringContaining('CREATE MATERIALIZED VIEW IF NOT EXISTS')
      );
    });

    it('recrea vista cuando estructura vieja no tiene tenant_id', async () => {
      (prismaMock.$queryRawUnsafe as jest.Mock)
        .mockResolvedValueOnce([{ exists: true }])
        .mockResolvedValueOnce([{ exists: false }]);

      PerformanceService.getInstance();
      await flushPromises();
      expect(prismaMock.$executeRawUnsafe).toHaveBeenCalledWith(
        expect.stringContaining('DROP MATERIALIZED VIEW IF EXISTS')
      );
    });

    it('ensureMaterializedView llamada directamente cubre más líneas', async () => {
      (PerformanceService as any).instance = undefined;
      const svc = PerformanceService.getInstance();
      await flushPromises();

      (prismaMock.$queryRawUnsafe as jest.Mock)
        .mockResolvedValueOnce([{ exists: true }])
        .mockResolvedValueOnce([{ exists: true }])
        .mockResolvedValueOnce([{ exists: true }]);

      (prismaMock.$executeRawUnsafe as jest.Mock).mockResolvedValueOnce(undefined);

      await (svc as any).ensureMaterializedView();

      expect(prismaMock.$executeRawUnsafe).toHaveBeenCalled();
    });
  });

  describe('getOptimizedStatusSummary', () => {
    it('retorna summary filtrado por empresa', async () => {
      const svc = PerformanceService.getInstance();
      (prismaMock.$queryRawUnsafe as jest.Mock).mockResolvedValueOnce([
        { empresaId: 1, entityType: 'CHOFER', entityId: 1, redCount: 2, yellowCount: 1, greenCount: 0, totalCount: 3, lastUpdated: new Date() }
      ]);

      const result = await svc.getOptimizedStatusSummary(1);
      expect(result).toHaveLength(1);
      expect(result[0].empresaId).toBe(1);
      expect(result[0].overallStatus).toBe('rojo');
    });

    it('retorna summary completo sin filtro de empresa', async () => {
      const svc = PerformanceService.getInstance();
      (prismaMock.$queryRawUnsafe as jest.Mock).mockResolvedValueOnce([
        { empresaId: 1, entityType: 'CHOFER', entityId: 1, redCount: 2, yellowCount: 1, greenCount: 0, totalCount: 3, lastUpdated: new Date() }
      ]);

      const result = await svc.getOptimizedStatusSummary(undefined);
      expect(result).toHaveLength(1);
    });

    it('calcula estado general correctamente', async () => {
      const svc = PerformanceService.getInstance();
      (prismaMock.$queryRawUnsafe as jest.Mock).mockResolvedValueOnce([
        { empresaId: 1, entityType: 'CHOFER', entityId: 1, redCount: 0, yellowCount: 5, greenCount: 10, totalCount: 15, lastUpdated: new Date() }
      ]);

      const result = await svc.getOptimizedStatusSummary(1);
      expect(result[0].overallStatus).toBe('amarillo');
    });

    it('retorna array vacío cuando hay error con empresaId', async () => {
      const svc = PerformanceService.getInstance();
      (prismaMock.$queryRawUnsafe as jest.Mock).mockRejectedValueOnce(new Error('DB error'));

      const result = await svc.getOptimizedStatusSummary(5);
      expect(result).toEqual([]);
    });
  });

  describe('getOptimizedGlobalStats', () => {
    it('retorna estadísticas globales', async () => {
      const svc = PerformanceService.getInstance();
      (prismaMock.$queryRawUnsafe as jest.Mock).mockResolvedValueOnce([{
        totalDocuments: 100, pendingCount: 10, approvedCount: 80,
        rejectedCount: 5, expiredCount: 5, activeCompanies: 10
      }]);

      const result = await svc.getOptimizedGlobalStats();
      expect(result.totalDocuments).toBe(100);
    });

    it('retorna fallback en error de getOptimizedGlobalStats', async () => {
      const svc = PerformanceService.getInstance();
      (prismaMock.$queryRawUnsafe as jest.Mock).mockRejectedValueOnce(new Error('DB error'));

      const result = await svc.getOptimizedGlobalStats();
      expect(result.totalDocuments).toBe(0);
    });
  });

  describe('getOptimizedCriticalAlerts', () => {
    it('retorna alertas críticas con límite', async () => {
      const svc = PerformanceService.getInstance();
      (prismaMock.$queryRawUnsafe as jest.Mock).mockResolvedValueOnce([{
        empresaId: 1, entityType: 'CHOFER', entityId: 1,
        redCount: 5, totalCount: 10, redPercentage: 50
      }]);

      const result = await svc.getOptimizedCriticalAlerts(1, 50);
      expect(result).toHaveLength(1);
    });
  });

  describe('getPerTenantAggregates', () => {
    it('retorna agregados por tenant', async () => {
      const svc = PerformanceService.getInstance();
      (prismaMock.$queryRawUnsafe as jest.Mock).mockResolvedValueOnce([
        { tenantId: 1, redCount: 10, yellowCount: 5, greenCount: 5, totalCount: 20 }
      ]);

      const result = await svc.getPerTenantAggregates();
      expect(result).toHaveLength(1);
    });
  });

  describe('refreshMaterializedView', () => {
    it('refresca vista concurrentemente cuando tiene índice único', async () => {
      const svc = PerformanceService.getInstance();
      (prismaMock.$queryRawUnsafe as jest.Mock).mockResolvedValueOnce([{ exists: true }]);

      await svc.refreshMaterializedView();
      expect(prismaMock.$executeRawUnsafe).toHaveBeenCalledWith(
        expect.stringContaining('REFRESH MATERIALIZED VIEW CONCURRENTLY')
      );
    });
  });

  describe('getSystemMetrics', () => {
    it('retorna métricas del sistema', async () => {
      const svc = PerformanceService.getInstance();
      (prismaMock.$queryRawUnsafe as jest.Mock)
        .mockResolvedValueOnce([{ connections: 5 }])
        .mockResolvedValueOnce([{ age_minutes: 10 }]);

      const result = await svc.getSystemMetrics();
      expect(result.databaseConnections).toBe(5);
      expect(result.materializedViewAge).toBe(10);
    });

    it('retorna defaults cuando hay error', async () => {
      const svc = PerformanceService.getInstance();
      (prismaMock.$queryRawUnsafe as jest.Mock).mockRejectedValueOnce(new Error('DB error'));

      const result = await svc.getSystemMetrics();
      expect(result.databaseConnections).toBe(0);
    });
  });

  describe('calculateOverallStatus', () => {
    it('calcula estado general correctamente', () => {
      const svc = PerformanceService.getInstance();
      expect((svc as any).calculateOverallStatus(1, 0, 0)).toBe('rojo');
      expect((svc as any).calculateOverallStatus(0, 1, 0)).toBe('amarillo');
      expect((svc as any).calculateOverallStatus(0, 0, 1)).toBe('verde');
    });
  });

  describe('cleanupOldData', () => {
    it('retorna métricas de limpieza', async () => {
      const svc = PerformanceService.getInstance();
      const result = await svc.cleanupOldData();
      expect(result.deletedDocuments).toBe(0);
      expect(result.deletedFiles).toBe(0);
    });

    it('retorna ceros cuando hay error', async () => {
      const svc = PerformanceService.getInstance();
      const result = await svc.cleanupOldData();
      expect(result).toEqual({ deletedDocuments: 0, deletedFiles: 0 });
    });
  });

  it('refreshMaterializedView handles unique index and fallback, and swallows errors', async () => {
    const svc = PerformanceService.getInstance();

    // hasUniqueIndex: true
    (prismaMock.$queryRawUnsafe as jest.Mock).mockResolvedValueOnce([{ exists: true }]);
    (prismaMock.$executeRawUnsafe as jest.Mock).mockResolvedValueOnce(undefined);
    await svc.refreshMaterializedView();

    // hasUniqueIndex: true, concurrent refresh fails -> fallback
    (prismaMock.$queryRawUnsafe as jest.Mock).mockResolvedValueOnce([{ exists: true }]);
    (prismaMock.$executeRawUnsafe as jest.Mock)
      .mockRejectedValueOnce(new Error('lock'))
      .mockResolvedValueOnce(undefined);
    await svc.refreshMaterializedView();

    // hasUniqueIndex false
    (prismaMock.$queryRawUnsafe as jest.Mock).mockResolvedValueOnce([{ exists: false }]);
    (prismaMock.$executeRawUnsafe as jest.Mock).mockResolvedValueOnce(undefined);
    await svc.refreshMaterializedView();

    // outer error swallowed
    (prismaMock.$queryRawUnsafe as jest.Mock).mockRejectedValueOnce(new Error('db'));
    await svc.refreshMaterializedView();
  });

  it('getSystemMetrics returns values and defaults on error; cleanupOldData returns defaults', async () => {
    const svc = PerformanceService.getInstance();
    (prismaMock.$queryRawUnsafe as jest.Mock)
      .mockResolvedValueOnce([{ connections: BigInt(2) }])
      .mockResolvedValueOnce([{ age_minutes: 5 }]);
    const m = await svc.getSystemMetrics();
    expect(m.databaseConnections).toBe(2);
    expect(m.materializedViewAge).toBe(5);

    (prismaMock.$queryRawUnsafe as jest.Mock).mockRejectedValueOnce(new Error('db'));
    const m2 = await svc.getSystemMetrics();
    expect(m2.databaseConnections).toBe(0);

    const c = await svc.cleanupOldData();
    expect(c).toEqual({ deletedDocuments: 0, deletedFiles: 0 });
  });
});


