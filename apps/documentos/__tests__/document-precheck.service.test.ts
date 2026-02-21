/**
 * Tests unitarios para DocumentPreCheckService (métodos con DB)
 * @jest-environment node
 */

jest.mock('../src/config/database', () => {
  const prismaMock: Record<string, any> = {
    chofer: { findFirst: jest.fn(), findUnique: jest.fn() },
    camion: { findFirst: jest.fn(), findUnique: jest.fn() },
    acoplado: { findFirst: jest.fn(), findUnique: jest.fn() },
    empresaTransportista: { findFirst: jest.fn(), findUnique: jest.fn() },
    dadorCarga: { findUnique: jest.fn() },
    equipo: { findFirst: jest.fn() },
    document: { findMany: jest.fn() },
    documentTemplate: { findMany: jest.fn() },
    plantillaRequisitoTemplate: { findMany: jest.fn() },
    internalNotification: { findMany: jest.fn() },
  };
  return { prisma: prismaMock };
});

jest.mock('../src/config/logger', () => ({
  AppLogger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

import { DocumentPreCheckService } from '../src/services/document-precheck.service';
import { prisma as prismaClient } from '../src/config/database';

// NOSONAR: mock tipado genérico para tests
const prisma = prismaClient as any;

describe('DocumentPreCheckService', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('preCheck', () => {
    it('retorna entidad no existente con faltantes', async () => {
      prisma.chofer.findFirst.mockResolvedValue(null);
      prisma.documentTemplate.findMany.mockResolvedValue([
        { id: 100, name: 'DNI' },
        { id: 101, name: 'Licencia' },
      ]);

      const result = await DocumentPreCheckService.preCheck({
        tenantEmpresaId: 1,
        dadorCargaIdSolicitante: 1,
        entidades: [{ entityType: 'CHOFER', identificador: '12.345.678' }],
      });

      expect(result.entidades).toHaveLength(1);
      expect(result.entidades[0].existe).toBe(false);
      expect(result.entidades[0].identificador).toBe('12345678');
      expect(result.entidades[0].resumen.faltantes).toBe(2);
      expect(result.hayEntidadesDeOtroDador).toBe(false);
    });

    it('detecta entidad de otro dador que requiere transferencia', async () => {
      prisma.chofer.findFirst.mockResolvedValue({
        id: 10,
        dadorCargaId: 99,
        nombre: 'Juan',
        apellido: 'Pérez',
      });
      prisma.dadorCarga.findUnique.mockResolvedValue({ razonSocial: 'Otro Dador' });
      prisma.equipo.findFirst.mockResolvedValue(null);
      prisma.document.findMany.mockResolvedValue([]);
      prisma.documentTemplate.findMany.mockResolvedValue([]);

      const result = await DocumentPreCheckService.preCheck({
        tenantEmpresaId: 1,
        dadorCargaIdSolicitante: 1,
        entidades: [{ entityType: 'CHOFER', identificador: '12345678' }],
      });

      expect(result.entidades[0].existe).toBe(true);
      expect(result.entidades[0].requiereTransferencia).toBe(true);
      expect(result.hayEntidadesDeOtroDador).toBe(true);
      expect(result.dadorActualIds).toContain(99);
    });

    it('detecta entidad propia sin transferencia', async () => {
      prisma.camion.findFirst.mockResolvedValue({
        id: 20,
        dadorCargaId: 1,
        marca: 'Scania',
        modelo: 'R500',
      });
      prisma.dadorCarga.findUnique.mockResolvedValue({ razonSocial: 'Mi Dador' });
      prisma.equipo.findFirst.mockResolvedValue(null);
      prisma.document.findMany.mockResolvedValue([]);
      prisma.documentTemplate.findMany.mockResolvedValue([]);

      const result = await DocumentPreCheckService.preCheck({
        tenantEmpresaId: 1,
        dadorCargaIdSolicitante: 1,
        entidades: [{ entityType: 'CAMION', identificador: 'ABC-123' }],
      });

      expect(result.entidades[0].perteneceSolicitante).toBe(true);
      expect(result.entidades[0].requiereTransferencia).toBe(false);
      expect(result.entidades[0].nombre).toBe('Scania R500');
    });

    it('detecta entidad asignada a equipo activo', async () => {
      prisma.acoplado.findFirst.mockResolvedValue({
        id: 30,
        dadorCargaId: 1,
        tipo: 'Baranda',
      });
      prisma.dadorCarga.findUnique.mockResolvedValue({ razonSocial: 'Mi Dador' });
      prisma.equipo.findFirst.mockResolvedValue({
        id: 100,
        driverId: 10,
        truckId: 20,
        trailerId: 30,
      });
      prisma.chofer.findUnique.mockResolvedValue({ nombre: 'Juan', apellido: 'Pérez' });
      prisma.camion.findUnique.mockResolvedValue({ patente: 'ABC123' });
      prisma.document.findMany.mockResolvedValue([]);
      prisma.documentTemplate.findMany.mockResolvedValue([]);

      const result = await DocumentPreCheckService.preCheck({
        tenantEmpresaId: 1,
        dadorCargaIdSolicitante: 1,
        entidades: [{ entityType: 'ACOPLADO', identificador: 'DEF456' }],
      });

      expect(result.entidades[0].asignadaAOtroEquipo).toBe(true);
      expect(result.entidades[0].equipoActual).toBeDefined();
      expect(result.entidades[0].equipoActual!.id).toBe(100);
    });

    it('incluye documentos existentes con estados correctos', async () => {
      prisma.chofer.findFirst.mockResolvedValue({
        id: 10,
        dadorCargaId: 1,
        nombre: 'Test',
        apellido: 'Driver',
      });
      prisma.dadorCarga.findUnique.mockResolvedValue({ razonSocial: 'Mi Dador' });
      prisma.equipo.findFirst.mockResolvedValue(null);

      const futureDate = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);
      prisma.document.findMany.mockResolvedValue([
        {
          id: 1,
          templateId: 100,
          status: 'APROBADO',
          expiresAt: futureDate,
          uploadedAt: new Date(),
          dadorCargaId: 1,
          template: { name: 'DNI' },
        },
      ]);

      prisma.documentTemplate.findMany.mockResolvedValue([
        { id: 100, name: 'DNI' },
      ]);

      const result = await DocumentPreCheckService.preCheck({
        tenantEmpresaId: 1,
        dadorCargaIdSolicitante: 1,
        entidades: [{ entityType: 'CHOFER', identificador: '12345678' }],
      });

      expect(result.entidades[0].documentos).toHaveLength(1);
      expect(result.entidades[0].documentos[0].estado).toBe('VIGENTE');
      expect(result.entidades[0].resumen.vigentes).toBe(1);
      expect(result.entidades[0].resumen.completo).toBe(true);
    });

    it('usa templates de plantilla cuando clienteId especificado', async () => {
      prisma.chofer.findFirst.mockResolvedValue(null);
      prisma.plantillaRequisitoTemplate.findMany.mockResolvedValue([
        { templateId: 100, obligatorio: true, template: { name: 'DNI' } },
      ]);

      const result = await DocumentPreCheckService.preCheck({
        tenantEmpresaId: 1,
        dadorCargaIdSolicitante: 1,
        entidades: [{ entityType: 'CHOFER', identificador: '12345678' }],
        clienteId: 5,
      });

      expect(result.entidades[0].resumen.total).toBe(1);
    });

    it('busca EMPRESA_TRANSPORTISTA por CUIT', async () => {
      prisma.empresaTransportista.findFirst.mockResolvedValue({
        id: 40,
        dadorCargaId: 1,
        razonSocial: 'Transportes SA',
      });
      prisma.dadorCarga.findUnique.mockResolvedValue({ razonSocial: 'Mi Dador' });
      prisma.document.findMany.mockResolvedValue([]);
      prisma.documentTemplate.findMany.mockResolvedValue([]);

      const result = await DocumentPreCheckService.preCheck({
        tenantEmpresaId: 1,
        dadorCargaIdSolicitante: 1,
        entidades: [{ entityType: 'EMPRESA_TRANSPORTISTA', identificador: '20-12345678-9' }],
      });

      expect(result.entidades[0].existe).toBe(true);
      expect(result.entidades[0].nombre).toBe('Transportes SA');
    });

    it('DADOR retorna null (no transferible)', async () => {
      const result = await DocumentPreCheckService.preCheck({
        tenantEmpresaId: 1,
        dadorCargaIdSolicitante: 1,
        entidades: [{ entityType: 'DADOR', identificador: '99' }],
      });

      expect(result.entidades[0].existe).toBe(false);
    });
  });

  describe('preCheckEntidad', () => {
    it('verifica una entidad individual', async () => {
      prisma.chofer.findFirst.mockResolvedValue(null);
      prisma.documentTemplate.findMany.mockResolvedValue([]);

      const result = await DocumentPreCheckService.preCheckEntidad(
        1, 1, 'CHOFER', '12345678',
      );

      expect(result.entityType).toBe('CHOFER');
      expect(result.existe).toBe(false);
    });
  });
});
