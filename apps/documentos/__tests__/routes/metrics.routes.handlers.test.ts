import type { Request, Response } from 'express';

import { prismaMock, resetPrismaMock } from '../mocks/prisma.mock';

type SystemMetrics = {
  databaseConnections: number;
  materializedViewAge: number;
};

type GlobalStats = {
  totalDocuments: number;
  pendingCount: number;
  validatingCount: number;
  approvedCount: number;
  rejectedCount: number;
  expiredCount: number;
  activeCompanies: number;
  avgProcessingHours: number;
};

type QueueStats = {
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
};

type TenantAggregate = {
  tenantId: number;
  redCount: number;
  yellowCount: number;
  greenCount: number;
  totalCount: number;
};

type CriticalAlert = {
  entityType: 'DADOR' | 'CHOFER' | 'CAMION' | 'ACOPLADO';
};

const systemMetrics: SystemMetrics = { databaseConnections: 2, materializedViewAge: 15 };
const globalStats: GlobalStats = {
  totalDocuments: 100,
  pendingCount: 10,
  validatingCount: 5,
  approvedCount: 70,
  rejectedCount: 10,
  expiredCount: 5,
  activeCompanies: 12,
  avgProcessingHours: 1.5,
};
const queueStats: QueueStats = { waiting: 1, active: 2, completed: 3, failed: 0, delayed: 0 };
const tenantAggregates: TenantAggregate[] = [{ tenantId: 1, redCount: 1, yellowCount: 2, greenCount: 3, totalCount: 6 }];
const criticalAlerts: CriticalAlert[] = [
  { entityType: 'DADOR' },
  { entityType: 'CHOFER' },
  { entityType: 'CAMION' },
  { entityType: 'ACOPLADO' },
];

const performanceServiceMock = {
  getSystemMetrics: jest.fn<Promise<SystemMetrics>, []>(async () => systemMetrics),
  getOptimizedGlobalStats: jest.fn<Promise<GlobalStats>, []>(async () => globalStats),
  getPerTenantAggregates: jest.fn<Promise<TenantAggregate[]>, []>(async () => tenantAggregates),
  getOptimizedCriticalAlerts: jest.fn<Promise<CriticalAlert[]>, []>(async () => criticalAlerts),
};

const queueServiceMock = {
  getQueueStats: jest.fn<Promise<QueueStats>, []>(async () => queueStats),
};

jest.mock('../../src/services/performance.service', () => ({
  performanceService: performanceServiceMock,
}));

jest.mock('../../src/services/queue.service', () => ({
  queueService: queueServiceMock,
}));

jest.mock('../../src/config/database', () => ({
  db: { getClient: () => prismaMock },
  prisma: prismaMock,
}));

jest.mock('../../src/config/logger', () => ({
  AppLogger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

import router from '../../src/routes/metrics.routes';

type MockResponse = Response & {
  status: jest.Mock;
  send: jest.Mock;
  set: jest.Mock;
};

type RouterLayer = {
  route?: {
    path?: string;
    methods?: Record<string, boolean>;
    stack: Array<{ handle: (req: Request, res: Response) => Promise<void> | void }>;
  };
};

const findHandler = (method: 'get', path: string) => {
  const stack = (router as unknown as { stack: RouterLayer[] }).stack;
  const layer = stack.find((item) => item.route?.path === path && item.route?.methods?.[method]);
  if (!layer?.route) throw new Error(`Route not found: ${method.toUpperCase()} ${path}`);
  const routeStack = layer.route.stack;
  return routeStack[routeStack.length - 1].handle;
};

const createRes = (): MockResponse => {
  const res = {
    status: jest.fn(),
    send: jest.fn(),
    set: jest.fn(),
  } as unknown as MockResponse;
  res.status.mockReturnValue(res);
  res.send.mockReturnValue(res);
  res.set.mockReturnValue(res);
  return res;
};

describe('metrics.routes handlers', () => {
  beforeEach(() => {
    resetPrismaMock();
    jest.clearAllMocks();
    (globalThis as { __DOCS_METRICS?: Record<string, number> }).__DOCS_METRICS = {
      batch_total: 2,
      batch_completed: 1,
      batch_failed: 0,
    };
  });

  it('GET / genera métricas Prometheus', async () => {
    prismaMock.document.count.mockResolvedValueOnce(4);
    prismaMock.document.groupBy.mockResolvedValueOnce([
      { entityType: 'CHOFER', _count: { entityType: 2 } },
    ]);
    prismaMock.equipoHistory.count
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(2)
      .mockResolvedValueOnce(3)
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(1);
    prismaMock.equipo.findMany.mockResolvedValueOnce([{ tenantEmpresaId: 1 }]);

    const handler = findHandler('get', '/');
    const res = createRes();
    await handler({} as Request, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith(expect.stringContaining('documentos_info'));
    expect(res.send).toHaveBeenCalledWith(expect.stringContaining('documentos_pending_approval_total'));
  });

  it('GET / expone health status degradado', async () => {
    performanceServiceMock.getSystemMetrics.mockResolvedValueOnce({ databaseConnections: 0, materializedViewAge: 0 });
    queueServiceMock.getQueueStats.mockResolvedValueOnce({ waiting: -1, active: 0, completed: 0, failed: 0, delayed: 0 });
    performanceServiceMock.getOptimizedGlobalStats.mockResolvedValueOnce(globalStats);
    performanceServiceMock.getPerTenantAggregates.mockResolvedValueOnce([]);
    prismaMock.document.count.mockResolvedValueOnce(0);
    prismaMock.document.groupBy.mockResolvedValueOnce([]);
    prismaMock.equipoHistory.count
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0);
    prismaMock.equipo.findMany.mockResolvedValueOnce([]);

    const handler = findHandler('get', '/');
    const res = createRes();
    await handler({} as Request, res);

    const metrics = (res.send as jest.Mock).mock.calls[0][0] as string;
    expect(metrics).toContain('documentos_health_status{service="database"} 0');
    expect(metrics).toContain('documentos_health_status{service="redis"} 0');
  });

  it('GET / maneja errores de servicio', async () => {
    performanceServiceMock.getSystemMetrics.mockRejectedValueOnce(new Error('boom'));
    const handler = findHandler('get', '/');
    const res = createRes();
    await handler({} as Request, res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith('# Error generating metrics\n');
  });

  it('GET /custom genera métricas custom', async () => {
    const handler = findHandler('get', '/custom');
    const res = createRes();
    await handler({} as Request, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith(expect.stringContaining('documentos_critical_alerts_total'));
  });

  it('GET /custom responde error si falla', async () => {
    performanceServiceMock.getOptimizedCriticalAlerts.mockRejectedValueOnce(new Error('fail'));
    const handler = findHandler('get', '/custom');
    const res = createRes();
    await handler({} as Request, res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith('# Error generating custom metrics\n');
  });
});
