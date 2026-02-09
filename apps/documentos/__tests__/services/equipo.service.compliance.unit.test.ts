import { prismaMock, resetPrismaMock } from '../mocks/prisma.mock';

jest.mock('../../src/config/database', () => ({
  prisma: prismaMock,
}));

jest.mock('../../src/config/logger', () => ({
  AppLogger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

jest.mock('../../src/middlewares/error.middleware', () => ({
  createError: (message: string, _status: number, code: string) => {
    const e: any = new Error(message);
    e.code = code;
    return e;
  },
}));

jest.mock('../../src/services/compliance.service', () => ({
  ComplianceService: { evaluateBatchEquiposCliente: jest.fn(async () => new Map()) },
}));

import { ComplianceService } from '../../src/services/compliance.service';
import { EquipoService } from '../../src/services/equipo.service';

describe('EquipoService (compliance/search)', () => {
  beforeEach(() => {
    resetPrismaMock();
    jest.clearAllMocks();
  });

  it('searchPaginated returns empty when filtering by cliente with no asignaciones', async () => {
    prismaMock.equipoCliente.findMany.mockResolvedValueOnce([] as any);
    const out = await EquipoService.searchPaginated(1, { clienteId: 7 }, 1, 10);
    expect(out.total).toBe(0);
    expect(out.equipos).toEqual([]);
  });

  it('getComplianceStats returns empty when no equipos or no asignaciones for cliente', async () => {
    prismaMock.equipo.findMany.mockResolvedValueOnce([] as any);
    const out1 = await EquipoService.getComplianceStats(1, {});
    expect(out1.total).toBe(0);

    prismaMock.equipoCliente.findMany.mockResolvedValueOnce([] as any);
    const out2 = await EquipoService.getComplianceStats(1, { clienteId: 7 });
    expect(out2.total).toBe(0);
  });

  it('getComplianceStats counts flags from batch compliance results', async () => {
    prismaMock.equipo.findMany.mockResolvedValueOnce([
      { id: 1, driverId: 10, truckId: 20, trailerId: null, tenantEmpresaId: 1, dadorCargaId: 2, empresaTransportistaId: null },
      { id: 2, driverId: 11, truckId: 21, trailerId: null, tenantEmpresaId: 1, dadorCargaId: 2, empresaTransportistaId: null },
    ] as any);

    (ComplianceService.evaluateBatchEquiposCliente as jest.Mock).mockResolvedValueOnce(new Map([
      [1, { equipoId: 1, tieneVencidos: true, tieneFaltantes: false, tieneProximos: false, requirements: [] }],
      [2, { equipoId: 2, tieneVencidos: false, tieneFaltantes: true, tieneProximos: true, requirements: [] }],
    ]));

    const out = await EquipoService.getComplianceStats(1, {});
    expect(out.total).toBe(2);
    expect(out.conVencidos).toBe(1);
    expect(out.conFaltantes).toBe(1);
    expect(out.conPorVencer).toBe(1);
  });

  it('searchPaginatedWithCompliance filters ids and paginates', async () => {
    jest.spyOn(EquipoService, 'getComplianceStats').mockResolvedValueOnce({
      total: 3,
      conFaltantes: 2,
      conVencidos: 1,
      conPorVencer: 1,
      equipoIds: [1, 2, 3],
      _complianceMap: new Map([
        [1, { tieneVencidos: false, tieneFaltantes: true, tieneProximos: false }],
        [2, { tieneVencidos: true, tieneFaltantes: false, tieneProximos: false }],
        [3, { tieneVencidos: false, tieneFaltantes: true, tieneProximos: true }],
      ]),
    } as any);

    prismaMock.equipo.findMany.mockResolvedValueOnce([{ id: 1 }, { id: 3 }] as any);
    const out = await EquipoService.searchPaginatedWithCompliance(1, { complianceFilter: 'faltantes' }, 1, 10);
    expect(out.total).toBe(2);
    expect(out.equipos).toHaveLength(2);
  });

  it('getById throws when not found and returns enriched when found', async () => {
    prismaMock.equipo.findUnique.mockResolvedValueOnce(null);
    await expect(EquipoService.getById(1)).rejects.toMatchObject({ code: 'EQUIPO_NOT_FOUND' });

    prismaMock.equipo.findUnique.mockResolvedValueOnce({ id: 1, driverId: 10, truckId: 20, trailerId: null } as any);
    prismaMock.chofer.findUnique.mockResolvedValueOnce({ id: 10 } as any);
    prismaMock.camion.findUnique.mockResolvedValueOnce({ id: 20 } as any);
    const out = await EquipoService.getById(1);
    expect(out.chofer.id).toBe(10);
  });
});


