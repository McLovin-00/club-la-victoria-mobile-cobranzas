/**
 * Unit tests for ComplianceService
 * @jest-environment node
 */

// Mock database before imports
jest.mock('../src/config/database', () => ({
  prisma: {
    equipo: { findUnique: jest.fn(), findMany: jest.fn() },
    clienteDocumentRequirement: { findMany: jest.fn() },
    document: { findFirst: jest.fn(), findMany: jest.fn() },
    equipoCliente: { findMany: jest.fn() }, // Added missing mock
    chofer: { findUnique: jest.fn() },
    camion: { findUnique: jest.fn() },
    acoplado: { findUnique: jest.fn() },
    empresaTransportista: { findUnique: jest.fn() },
  },
}));

jest.mock('../src/services/minio.service', () => ({
  minioService: {
    moveObject: jest.fn(),
  },
}));

jest.mock('../src/config/logger', () => ({
  AppLogger: {
    debug: jest.fn(),
  },
}));

import { ComplianceService } from '../src/services/compliance.service';
import { prisma as prismaClient } from '../src/config/database';

const prisma = prismaClient as any;

describe('ComplianceService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('evaluateEquipoCliente', () => {
    it('debe retornar lista vacía cuando equipo no existe', async () => {
      prisma.equipo.findUnique.mockResolvedValue(null);

      const result = await ComplianceService.evaluateEquipoCliente(999, 1);

      expect(result).toEqual([]);
      expect(prisma.equipo.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 999 },
        })
      );
    });

    it('debe evaluar requisitos correctamente para equipo con chofer', async () => {
      const equipo = {
        id: 1,
        tenantEmpresaId: 1,
        dadorCargaId: 1,
        driverId: 123,
        truckId: 456,
        trailerId: null,
        empresaTransportistaId: null,
      };

      prisma.equipo.findUnique.mockResolvedValue(equipo as any);
      prisma.clienteDocumentRequirement.findMany.mockResolvedValue([
        {
          templateId: 1,
          entityType: 'CHOFER',
          obligatorio: true,
          diasAnticipacion: 30,
        },
      ]);
      prisma.document.findFirst.mockResolvedValue({
        id: 100,
        status: 'APROBADO',
        expiresAt: new Date('2026-12-31'),
      });

      const result = await ComplianceService.evaluateEquipoCliente(1, 1);

      expect(result).toHaveLength(1);
      expect(result[0].state).toBe('OK');
      expect(result[0].obligatorio).toBe(true);
    });

    it('debe retornar FALTANTE cuando no existe documento', async () => {
      const equipo = {
        id: 1,
        tenantEmpresaId: 1,
        dadorCargaId: 1,
        driverId: 123,
        truckId: 456,
        trailerId: null,
        empresaTransportistaId: null,
      };

      prisma.equipo.findUnique.mockResolvedValue(equipo as any);
      prisma.clienteDocumentRequirement.findMany.mockResolvedValue([
        {
          templateId: 1,
          entityType: 'CHOFER',
          obligatorio: true,
          diasAnticipacion: 30,
        },
      ]);
      prisma.document.findFirst.mockResolvedValue(null);

      const result = await ComplianceService.evaluateEquipoCliente(1, 1);

      expect(result[0].state).toBe('FALTANTE');
      expect(prisma.document.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            templateId: 1,
            entityType: 'CHOFER',
            entityId: 123,
          }),
        })
      );
    });
  });

  describe('evaluateBatchEquiposCliente', () => {
    it('debe retornar mapa vacío cuando no hay equipos', async () => {
      const result = await ComplianceService.evaluateBatchEquiposCliente([]);

      expect(result.size).toBe(0);
      expect(prisma.equipoCliente.findMany).not.toHaveBeenCalled();
    });

    it('debe evaluar múltiples equipos en lote', async () => {
      const equipos = [
        {
          id: 1,
          tenantEmpresaId: 1,
          dadorCargaId: 1,
          driverId: 123,
          truckId: 456,
          trailerId: null,
          empresaTransportistaId: null,
        },
        {
          id: 2,
          tenantEmpresaId: 1,
          dadorCargaId: 1,
          driverId: 124,
          truckId: 457,
          trailerId: null,
          empresaTransportistaId: null,
        },
      ];

      prisma.equipoCliente.findMany.mockResolvedValue([
        { equipoId: 1, clienteId: 1 },
        { equipoId: 2, clienteId: 1 },
      ]);
      prisma.clienteDocumentRequirement.findMany.mockResolvedValue([
        {
          clienteId: 1,
          templateId: 1,
          entityType: 'CHOFER',
          obligatorio: true,
          diasAnticipacion: 30,
        },
      ]);
      prisma.document.findMany.mockResolvedValue([
        {
          id: 100,
          templateId: 1,
          entityType: 'CHOFER',
          entityId: 123,
          tenantEmpresaId: 1,
          dadorCargaId: 1,
          status: 'APROBADO',
          expiresAt: new Date('2026-12-31'),
        },
        {
          id: 101,
          templateId: 1,
          entityType: 'CHOFER',
          entityId: 124,
          tenantEmpresaId: 1,
          dadorCargaId: 1,
          status: 'APROBADO',
          expiresAt: new Date('2026-12-31'),
        },
      ]);

      const result = await ComplianceService.evaluateBatchEquiposCliente(equipos);

      expect(result.size).toBe(2);
      expect(result.get(1)).toBeDefined();
      expect(result.get(2)).toBeDefined();
      expect(prisma.equipoCliente.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            equipoId: expect.objectContaining({ in: expect.any(Array) }),
          }),
        })
      );
    });

    it('debe usar clienteId proporcionado en lugar de buscar asignaciones', async () => {
      const equipos = [
        {
          id: 1,
          tenantEmpresaId: 1,
          dadorCargaId: 1,
          driverId: 123,
          truckId: 456,
          trailerId: null,
          empresaTransportistaId: null,
        },
      ];

      prisma.clienteDocumentRequirement.findMany.mockResolvedValue([]);
      prisma.document.findMany.mockResolvedValue([]);

      const result = await ComplianceService.evaluateBatchEquiposCliente(equipos, 1);

      expect(prisma.equipoCliente.findMany).not.toHaveBeenCalled();
      expect(result.size).toBe(1);
    });

    it('debe retornar requisitos vacíos cuando no hay requisitos configurados', async () => {
      const equipos = [
        {
          id: 1,
          tenantEmpresaId: 1,
          dadorCargaId: 1,
          driverId: 123,
          truckId: 456,
          trailerId: null,
          empresaTransportistaId: null,
        },
      ];

      prisma.equipoCliente.findMany.mockResolvedValue([
        { equipoId: 1, clienteId: 1 },
      ]);
      prisma.clienteDocumentRequirement.findMany.mockResolvedValue([]);

      const result = await ComplianceService.evaluateBatchEquiposCliente(equipos);

      expect(result.get(1)).toBeDefined();
      expect(result.get(1).requirements).toHaveLength(0);
      expect(result.get(1).tieneVencidos).toBe(false);
      expect(result.get(1).tieneFaltantes).toBe(false);
      expect(result.get(1).tieneProximos).toBe(false);
    });
  });
});
