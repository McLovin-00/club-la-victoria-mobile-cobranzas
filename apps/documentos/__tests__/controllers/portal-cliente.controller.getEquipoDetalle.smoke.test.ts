/**
 * Propósito: Smoke test de `PortalClienteController.getEquipoDetalle`
 * para cubrir armado de respuesta y cálculo de estados sin DB real.
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import type { Response } from 'express';

const prismaMock = {
  equipoCliente: { findFirst: jest.fn() },
  equipo: { findUnique: jest.fn() },
  chofer: { findUnique: jest.fn() },
  camion: { findUnique: jest.fn() },
  acoplado: { findUnique: jest.fn() },
  document: { findMany: jest.fn() },
};

jest.mock('../../src/config/database', () => ({
  prisma: prismaMock,
}));

jest.mock('../../src/config/logger', () => ({
  AppLogger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

import { PortalClienteController } from '../../src/controllers/portal-cliente.controller';

function createRes() {
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
  return res as unknown as Response;
}

describe('PortalClienteController.getEquipoDetalle (smoke)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('retorna 403 si el equipo no está asignado al cliente', async () => {
    prismaMock.equipoCliente.findFirst.mockResolvedValueOnce(null);

    const req: any = { tenantId: 1, user: { clienteId: 10 }, params: { id: '1' } };
    const res = createRes();

    await PortalClienteController.getEquipoDetalle(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('retorna 200 y resume estados de documentos (vigente/próximo/vencido)', async () => {
    prismaMock.equipoCliente.findFirst.mockResolvedValueOnce({ equipoId: 1, clienteId: 10, asignadoHasta: null, asignadoDesde: new Date('2024-01-01') });
    prismaMock.equipo.findUnique.mockResolvedValueOnce({
      id: 1,
      tenantEmpresaId: 1,
      driverId: 11,
      truckId: 22,
      trailerId: 33,
      empresaTransportistaId: 44,
      empresaTransportista: { razonSocial: 'Transp SA', cuit: '30712345678' },
      dador: { razonSocial: 'Dador' },
    });
    prismaMock.chofer.findUnique.mockResolvedValueOnce({ id: 11, dni: '12345678', nombre: 'Juan', apellido: 'P' });
    prismaMock.camion.findUnique.mockResolvedValueOnce({ id: 22, patente: 'AB123CD', marca: 'M', modelo: 'X' });
    prismaMock.acoplado.findUnique.mockResolvedValueOnce({ id: 33, patente: 'AA001BB', tipo: 'Semi' });

    const now = new Date();
    const in20Days = new Date(now.getTime() + 20 * 24 * 60 * 60 * 1000);
    const expired = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000);

    prismaMock.document.findMany.mockResolvedValueOnce([
      // Vigente (sin expiresAt)
      {
        id: 1,
        tenantEmpresaId: 1,
        status: 'APROBADO',
        expiresAt: null,
        uploadedAt: new Date('2024-01-01'),
        entityType: 'CHOFER',
        entityId: 11,
        templateId: 100,
        template: { name: 'Licencia' },
      },
      // Próximo a vencer (<=30 días)
      {
        id: 2,
        tenantEmpresaId: 1,
        status: 'APROBADO',
        expiresAt: in20Days,
        uploadedAt: new Date('2024-02-01'),
        entityType: 'CAMION',
        entityId: 22,
        templateId: 200,
        template: { name: 'Seguro' },
      },
      // Vencido (status vencido / expiresAt pasado)
      {
        id: 3,
        tenantEmpresaId: 1,
        status: 'VENCIDO',
        expiresAt: expired,
        uploadedAt: new Date('2023-01-01'),
        entityType: 'CAMION',
        entityId: 22,
        templateId: 201,
        template: { name: 'VTV' },
      },
    ]);

    const req: any = { tenantId: 1, user: { clienteId: 10 }, params: { id: '1' } };
    const res = createRes();

    await PortalClienteController.getEquipoDetalle(req, res);

    // La función usa res.json (no res.status(200).json)
    expect(res.json).toHaveBeenCalled();
    const payload = (res.json as unknown as jest.Mock).mock.calls[0][0] as any;
    expect(payload.success).toBe(true);
    expect(payload.data.resumenDocs).toEqual(
      expect.objectContaining({
        total: 3,
        vigentes: 1,
        proximosVencer: 1,
        vencidos: 1,
      })
    );
  });
});


