import { prismaMock, resetPrismaMock } from '../mocks/prisma.mock';

jest.mock('../../src/config/database', () => ({
  prisma: prismaMock,
}));

jest.mock('../../src/config/logger', () => ({
  AppLogger: { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

import { ComplianceService } from '../../src/services/compliance.service';

describe('ComplianceService', () => {
  beforeEach(() => {
    resetPrismaMock();
    jest.clearAllMocks();
  });

  it('evaluateEquipoClienteDetailed returns [] when equipo not found', async () => {
    prismaMock.equipo.findUnique.mockResolvedValueOnce(null);
    await expect(ComplianceService.evaluateEquipoClienteDetailed(1, 2)).resolves.toEqual([]);
  });

  it('evaluateEquipoClienteDetailed computes states (FALTANTE, RECHAZADO, PROXIMO)', async () => {
    prismaMock.equipo.findUnique.mockResolvedValueOnce({ id: 1, tenantEmpresaId: 1, dadorCargaId: 2, driverId: 10, truckId: 20, trailerId: null, empresaTransportistaId: null } as any);
    prismaMock.clienteDocumentRequirement.findMany.mockResolvedValueOnce([
      { templateId: 1, entityType: 'ACOPLADO', obligatorio: true, diasAnticipacion: 10 }, // trailerId null -> FALTANTE
      { templateId: 2, entityType: 'CHOFER', obligatorio: true, diasAnticipacion: 10 }, // rejected -> RECHAZADO
      { templateId: 3, entityType: 'CAMION', obligatorio: true, diasAnticipacion: 10 }, // approved expires soon -> PROXIMO
    ] as any);

    prismaMock.document.findFirst
      .mockResolvedValueOnce({ id: 22, status: 'RECHAZADO', expiresAt: null } as any)
      .mockResolvedValueOnce({ id: 33, status: 'APROBADO', expiresAt: new Date(Date.now() + 2 * 24 * 3600 * 1000) } as any);

    const out = await ComplianceService.evaluateEquipoClienteDetailed(1, 2);
    expect(out[0].state).toBe('FALTANTE');
    expect(out[1].state).toBe('RECHAZADO');
    expect(out[2].state).toBe('PROXIMO');
  });

  it('evaluateBatchEquiposCliente returns empty map for empty equipos and short-circuits when no requirements', async () => {
    await expect(ComplianceService.evaluateBatchEquiposCliente([])).resolves.toEqual(new Map());

    prismaMock.equipoCliente.findMany.mockResolvedValueOnce([{ equipoId: 1, clienteId: 7 }] as any);
    prismaMock.clienteDocumentRequirement.findMany.mockResolvedValueOnce([] as any);

    const equipos = [{ id: 1, tenantEmpresaId: 1, dadorCargaId: 2, driverId: 10, truckId: 20, trailerId: null, empresaTransportistaId: null }];
    const map = await ComplianceService.evaluateBatchEquiposCliente(equipos as any);
    expect(map.get(1)?.requirements).toEqual([]);
  });

  it('evaluateBatchEquiposCliente loads docs once and evaluates flags', async () => {
    // assignments for batch
    prismaMock.equipoCliente.findMany.mockResolvedValueOnce([{ equipoId: 1, clienteId: 7 }] as any);
    // requirements
    prismaMock.clienteDocumentRequirement.findMany.mockResolvedValueOnce([
      { clienteId: 7, templateId: 1, entityType: 'CHOFER', obligatorio: true, diasAnticipacion: 10 },
    ] as any);
    // documents (approved, expiring soon => PROXIMO)
    prismaMock.document.findMany.mockResolvedValueOnce([
      { id: 1, templateId: 1, entityType: 'CHOFER', entityId: 10, tenantEmpresaId: 1, dadorCargaId: 2, status: 'APROBADO', expiresAt: new Date(Date.now() + 2 * 24 * 3600 * 1000) },
    ] as any);

    const equipos = [{ id: 1, tenantEmpresaId: 1, dadorCargaId: 2, driverId: 10, truckId: 20, trailerId: null, empresaTransportistaId: null }];
    const map = await ComplianceService.evaluateBatchEquiposCliente(equipos as any);
    const res = map.get(1)!;
    expect(res.tieneProximos).toBe(true);
    expect(res.requirements[0].state).toBe('PROXIMO');
  });
});


