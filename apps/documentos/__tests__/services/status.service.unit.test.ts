import { prismaMock, resetPrismaMock } from '../mocks/prisma.mock';

jest.mock('../../src/config/logger', () => ({
  AppLogger: { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

jest.mock('../../src/config/database', () => ({
  db: { getClient: () => prismaMock },
}));

import { StatusService } from '../../src/services/status.service';

describe('StatusService', () => {
  beforeEach(() => {
    resetPrismaMock();
    jest.clearAllMocks();
  });

  it('calculateEntityStatus returns rojo/verde/amarillo based on counts', () => {
    expect(StatusService.calculateEntityStatus({ total: 0, aprobado: 0, pendiente: 0, rechazado: 0, vencido: 0 })).toBe('rojo');
    expect(StatusService.calculateEntityStatus({ total: 2, aprobado: 2, pendiente: 0, rechazado: 0, vencido: 0 })).toBe('verde');
    expect(StatusService.calculateEntityStatus({ total: 2, aprobado: 1, pendiente: 1, rechazado: 0, vencido: 0 })).toBe('amarillo');
    expect(StatusService.calculateEntityStatus({ total: 2, aprobado: 1, pendiente: 0, rechazado: 2, vencido: 0 })).toBe('rojo');
  });

  it('getEntityStatus aggregates groupBy + expiredByDate', async () => {
    prismaMock.document.groupBy.mockResolvedValueOnce([
      { status: 'APROBADO', _count: { status: 1 } },
      { status: 'VALIDANDO', _count: { status: 1 } },
    ] as any);
    prismaMock.document.count.mockResolvedValueOnce(2);
    const out = await StatusService.getEntityStatus(1, 2, 'CHOFER' as any, 10);
    expect(out?.documentCount.total).toBeGreaterThan(0);
  });

  it('getEntityStatus counts PENDIENTE_APROBACION and handles expiredByDate errors', async () => {
    prismaMock.document.groupBy.mockResolvedValueOnce([
      { status: 'PENDIENTE_APROBACION', _count: { status: 2 } },
      { status: 'CLASIFICANDO', _count: { status: 1 } },
      { status: 'RECHAZADO', _count: { status: 1 } },
    ] as any);
    prismaMock.document.count.mockRejectedValueOnce(new Error('count failed'));

    const out = await StatusService.getEntityStatus(1, 2, 'CAMION' as any, 10);
    expect(out?.documentCount.pendiente).toBe(3);
    expect(out?.documentCount.rechazado).toBe(1);
  });

  it('getEmpresaStatusSummary builds per-entity statuses and overall', async () => {
    prismaMock.document.findMany.mockResolvedValueOnce([
      { entityType: 'CHOFER', entityId: 10 },
      { entityType: 'CAMION', entityId: 20 },
    ] as any);

    // getEntityStatus -> groupBy + expiredByDate for each entity
    prismaMock.document.groupBy
      .mockResolvedValueOnce([{ status: 'APROBADO', _count: { status: 1 } }] as any)
      .mockResolvedValueOnce([{ status: 'VENCIDO', _count: { status: 1 } }] as any);
    prismaMock.document.count.mockResolvedValue(0 as any);

    const out = await StatusService.getEmpresaStatusSummary(1, 2);
    expect(out.empresaId).toBe(2);
    expect(out.overallStatus).toBe('rojo');
  });

  it('getEntitiesWithAlarms returns rojo entities from summaries', async () => {
    // empresaId path uses findFirst to infer tenant
    prismaMock.document.findFirst.mockResolvedValueOnce({ tenantEmpresaId: 1 } as any);
    prismaMock.document.findMany.mockResolvedValueOnce([{ entityType: 'CHOFER', entityId: 10 }] as any);
    prismaMock.document.groupBy.mockResolvedValueOnce([{ status: 'VENCIDO', _count: { status: 1 } }] as any);
    prismaMock.document.count.mockResolvedValueOnce(0);

    const out = await StatusService.getEntitiesWithAlarms(2);
    expect(out.length).toBeGreaterThanOrEqual(1);
  });

  it('getGlobalStatusSummary and getEntitiesWithAlarms (no empresaId) should aggregate across multiple empresas', async () => {
    prismaMock.document.findMany.mockResolvedValue([{ dadorCargaId: 10 }, { dadorCargaId: 11 }] as any);

    // Stub getEmpresaStatusSummary to avoid deep mocking (it is called by getGlobalStatusSummary inside getEntitiesWithAlarms)
    const spy = jest.spyOn(StatusService, 'getEmpresaStatusSummary').mockImplementation(async (_tenant, empresaId) => {
      if (empresaId === 10) {
        return {
          empresaId: 10,
          overallStatus: 'verde',
          entities: {
            empresa: null,
            empresasTransportistas: [],
            choferes: [{ entityType: 'CHOFER', entityId: 1, status: 'rojo', documentCount: { total: 1, aprobado: 0, pendiente: 0, rechazado: 0, vencido: 1 } } as any],
            camiones: [],
            acoplados: [],
          },
        } as any;
      }
      return {
        empresaId,
        overallStatus: 'amarillo',
        entities: {
          empresa: { entityType: 'DADOR', entityId: empresaId, status: 'rojo', documentCount: { total: 1, aprobado: 0, pendiente: 0, rechazado: 0, vencido: 1 } } as any,
          empresasTransportistas: [],
          choferes: [],
          camiones: [],
          acoplados: [],
        },
      } as any;
    });

    const alarms = await StatusService.getEntitiesWithAlarms();
    expect(alarms.length).toBeGreaterThanOrEqual(2);
    spy.mockRestore();
  });
});


