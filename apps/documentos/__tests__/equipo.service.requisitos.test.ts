/**
 * Coverage tests for EquipoService.getRequisitosEquipo
 * Covers: consolidarRequisitos, enriquecerConDocumentos, buscarDocumentoActual, determinarEstadoDocumento
 * @jest-environment node
 */

jest.mock('../src/config/database', () => {
  const prismaMock: Record<string, any> = {
    equipo: { findUnique: jest.fn() },
    plantillaRequisitoTemplate: { findMany: jest.fn() },
    document: { findFirst: jest.fn() },
  };
  return { prisma: prismaMock };
});

jest.mock('../src/config/logger', () => ({
  AppLogger: { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

import { EquipoService } from '../src/services/equipo.service';
import { prisma } from '../src/config/database';

// NOSONAR: mock genérico para tests
const db = prisma as any;

describe('EquipoService.getRequisitosEquipo', () => {
  beforeEach(() => jest.clearAllMocks());

  const baseEquipo = {
    id: 1,
    tenantEmpresaId: 10,
    dadorCargaId: 5,
    driverId: 100,
    truckId: 200,
    trailerId: 300,
    clientes: [
      { clienteId: 50, cliente: { id: 50, razonSocial: 'Cliente A' } },
    ],
  };

  it('lanza error si equipo no existe', async () => {
    db.equipo.findUnique.mockResolvedValue(null);

    await expect(
      EquipoService.getRequisitosEquipo(999, 10)
    ).rejects.toThrow('Equipo no encontrado');
  });

  it('lanza error si tenantEmpresaId no coincide', async () => {
    db.equipo.findUnique.mockResolvedValue({ ...baseEquipo, tenantEmpresaId: 99 });

    await expect(
      EquipoService.getRequisitosEquipo(1, 10)
    ).rejects.toThrow('Equipo no encontrado');
  });

  it('retorna array vacío sin requisitos', async () => {
    db.equipo.findUnique.mockResolvedValue(baseEquipo);
    db.plantillaRequisitoTemplate.findMany.mockResolvedValue([]);

    const result = await EquipoService.getRequisitosEquipo(1, 10);

    expect(result).toEqual([]);
  });

  it('consolida requisitos de múltiples plantillas', async () => {
    db.equipo.findUnique.mockResolvedValue(baseEquipo);
    db.plantillaRequisitoTemplate.findMany.mockResolvedValue([
      {
        templateId: 1, entityType: 'CHOFER', obligatorio: true, diasAnticipacion: 5,
        template: { name: 'DNI Chofer' },
        plantillaRequisito: { cliente: { id: 50, razonSocial: 'Cliente A' } },
      },
      {
        templateId: 1, entityType: 'CHOFER', obligatorio: false, diasAnticipacion: 10,
        template: { name: 'DNI Chofer' },
        plantillaRequisito: { cliente: { id: 60, razonSocial: 'Cliente B' } },
      },
    ]);
    db.document.findFirst.mockResolvedValue(null);

    const result = await EquipoService.getRequisitosEquipo(1, 10);

    expect(result).toHaveLength(1);
    expect(result[0].templateName).toBe('DNI Chofer');
    expect(result[0].obligatorio).toBe(true);
    expect(result[0].diasAnticipacion).toBe(10);
    expect(result[0].requeridoPor).toHaveLength(2);
    expect(result[0].estado).toBe('FALTANTE');
  });

  it('enriquece con documento VIGENTE', async () => {
    db.equipo.findUnique.mockResolvedValue(baseEquipo);
    db.plantillaRequisitoTemplate.findMany.mockResolvedValue([{
      templateId: 2, entityType: 'CAMION', obligatorio: true, diasAnticipacion: 5,
      template: { name: 'VTV' },
      plantillaRequisito: { cliente: { id: 50, razonSocial: 'Cliente A' } },
    }]);
    db.document.findFirst.mockResolvedValue({
      id: 60, status: 'APROBADO',
      expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
    });

    const result = await EquipoService.getRequisitosEquipo(1, 10);

    expect(result[0].documentoActual).not.toBeNull();
    expect(result[0].documentoActual!.estado).toBe('VIGENTE');
  });

  it('enriquece con documento VENCIDO', async () => {
    db.equipo.findUnique.mockResolvedValue(baseEquipo);
    db.plantillaRequisitoTemplate.findMany.mockResolvedValue([{
      templateId: 3, entityType: 'ACOPLADO', obligatorio: true, diasAnticipacion: 5,
      template: { name: 'Seguro' },
      plantillaRequisito: { cliente: { id: 50, razonSocial: 'Cliente A' } },
    }]);
    db.document.findFirst.mockResolvedValue({
      id: 61, status: 'APROBADO',
      expiresAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    });

    const result = await EquipoService.getRequisitosEquipo(1, 10);

    expect(result[0].documentoActual!.estado).toBe('VENCIDO');
  });

  it('enriquece con documento PROXIMO_VENCER', async () => {
    db.equipo.findUnique.mockResolvedValue(baseEquipo);
    db.plantillaRequisitoTemplate.findMany.mockResolvedValue([{
      templateId: 4, entityType: 'CHOFER', obligatorio: true, diasAnticipacion: 15,
      template: { name: 'Carnet' },
      plantillaRequisito: { cliente: { id: 50, razonSocial: 'Cliente A' } },
    }]);
    db.document.findFirst.mockResolvedValue({
      id: 62, status: 'APROBADO',
      expiresAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
    });

    const result = await EquipoService.getRequisitosEquipo(1, 10);

    expect(result[0].documentoActual!.estado).toBe('PROXIMO_VENCER');
  });

  it('enriquece con documento PENDIENTE', async () => {
    db.equipo.findUnique.mockResolvedValue(baseEquipo);
    db.plantillaRequisitoTemplate.findMany.mockResolvedValue([{
      templateId: 5, entityType: 'CAMION', obligatorio: true, diasAnticipacion: 5,
      template: { name: 'Habilitación' },
      plantillaRequisito: { cliente: { id: 50, razonSocial: 'Cliente A' } },
    }]);
    db.document.findFirst.mockResolvedValue({
      id: 63, status: 'PENDIENTE', expiresAt: null,
    });

    const result = await EquipoService.getRequisitosEquipo(1, 10);

    expect(result[0].documentoActual!.estado).toBe('PENDIENTE');
  });

  it('maneja entityType sin ID en equipo (FALTANTE)', async () => {
    const equipoSinTrailer = { ...baseEquipo, trailerId: null };
    db.equipo.findUnique.mockResolvedValue(equipoSinTrailer);
    db.plantillaRequisitoTemplate.findMany.mockResolvedValue([{
      templateId: 6, entityType: 'ACOPLADO', obligatorio: true, diasAnticipacion: 5,
      template: { name: 'RTO Acoplado' },
      plantillaRequisito: { cliente: { id: 50, razonSocial: 'Cliente A' } },
    }]);

    const result = await EquipoService.getRequisitosEquipo(1, 10);

    expect(result[0].entityId).toBeNull();
    expect(result[0].estado).toBe('FALTANTE');
  });
});
