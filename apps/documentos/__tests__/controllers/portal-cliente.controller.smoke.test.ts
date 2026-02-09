/**
 * Propósito: Smoke tests de `PortalClienteController` para subir coverage sin DB real.
 * Cubre el path principal de `getEquiposAsignados` (con filtros/paginación simples).
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

jest.mock('../../src/config/logger', () => ({
  AppLogger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

jest.mock('../../src/services/compliance.service', () => ({
  ComplianceService: {
    evaluateBatchEquiposCliente: jest.fn().mockResolvedValue(new Map([[1, { estadoCompliance: 'VIGENTE' }]])),
  },
}));

import { PortalClienteController } from '../../src/controllers/portal-cliente.controller';

function createRes() {
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
  return res as unknown as Response;
}

describe('PortalClienteController (smoke)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('getEquiposAsignados retorna paginación con equipos', async () => {
    prismaMock.equipoCliente.findMany.mockResolvedValueOnce([
      {
        asignadoDesde: new Date(),
        equipo: {
          id: 1,
          tenantEmpresaId: 1,
          dadorCargaId: 1,
          driverId: 10,
          truckId: 20,
          trailerId: null,
          empresaTransportistaId: null,
          driverDniNorm: '12345678',
          truckPlateNorm: 'AB123CD',
          trailerPlateNorm: null,
          empresaTransportista: null,
          dador: null,
        },
      },
    ]);
    prismaMock.chofer.findMany.mockResolvedValueOnce([{ id: 10, dni: '12345678', nombre: 'Juan', apellido: 'Perez' }]);
    prismaMock.camion.findMany.mockResolvedValueOnce([{ id: 20, patente: 'AB123CD', marca: 'X', modelo: 'Y' }]);
    prismaMock.acoplado.findMany.mockResolvedValueOnce([]);

    const req: any = {
      tenantId: 1,
      user: { clienteId: 99 },
      query: { page: '1', limit: '10', search: '', estado: 'all' },
    };
    const res = createRes();

    await PortalClienteController.getEquiposAsignados(req, res);

    const payload = (res.json as unknown as jest.Mock).mock.calls[0][0];
    expect(payload.success).toBe(true);
    expect(payload.data).toEqual(
      expect.objectContaining({
        equipos: expect.any(Array),
        resumen: expect.any(Object),
        pagination: expect.objectContaining({ page: 1, limit: 10 }),
      })
    );
  });
});


