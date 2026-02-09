/**
 * Propósito: Smoke/integration test del controlador `PortalClienteController.getEquiposAsignados`
 * para cubrir lógica de filtros y armado de respuesta sin DB real.
 */

import { jest } from '@jest/globals';
import type { Response } from 'express';

const prismaMock = {
  equipoCliente: { findMany: jest.fn() },
  chofer: { findMany: jest.fn() },
  camion: { findMany: jest.fn() },
  acoplado: { findMany: jest.fn() },
};

jest.mock('../../src/config/database', () => ({
  prisma: prismaMock,
}));

jest.mock('../../src/services/compliance.service', () => ({
  ComplianceService: {
    evaluateBatchEquiposCliente: jest.fn(),
  },
}));

import { PortalClienteController } from '../../src/controllers/portal-cliente.controller';
import { ComplianceService } from '../../src/services/compliance.service';

function createRes() {
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
  return res as unknown as Response;
}

describe('PortalClienteController.getEquiposAsignados', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('retorna 400 si no hay clienteId', async () => {
    const req = { tenantId: 1, user: { empresaId: undefined } as unknown, query: {} } as any;
    const res = createRes();

    await PortalClienteController.getEquiposAsignados(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('retorna lista vacía cuando no hay equipos asignados', async () => {
    prismaMock.equipoCliente.findMany.mockResolvedValueOnce([]);
    prismaMock.chofer.findMany.mockResolvedValueOnce([]);
    prismaMock.camion.findMany.mockResolvedValueOnce([]);
    prismaMock.acoplado.findMany.mockResolvedValueOnce([]);
    (ComplianceService.evaluateBatchEquiposCliente as unknown as jest.Mock).mockResolvedValueOnce(new Map());

    const req = { tenantId: 1, user: { clienteId: 10 }, query: { page: '1', limit: '10' } } as any;
    const res = createRes();

    await PortalClienteController.getEquiposAsignados(req, res);

    const payload = (res.json as unknown as jest.Mock).mock.calls[0][0] as any;
    expect(payload.success).toBe(true);
    expect(payload.data?.equipos).toEqual([]);
    expect(payload.data?.resumen).toEqual(
      expect.objectContaining({ total: 0, vigentes: 0, proximosVencer: 0, vencidos: 0, incompletos: 0 })
    );
  });
});


