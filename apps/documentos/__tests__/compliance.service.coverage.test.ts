/**
 * Coverage tests for ComplianceService - all branches, cache eviction,
 * batch evaluation, helper functions, and edge cases.
 * @jest-environment node
 */

jest.mock('../src/config/database', () => {
  const prismaMock: Record<string, any> = {
    equipo: { findUnique: jest.fn(), findMany: jest.fn() },
    plantillaRequisitoTemplate: { findMany: jest.fn() },
    document: { findMany: jest.fn() },
    equipoPlantillaRequisito: { findMany: jest.fn() },
    equipoCliente: { findMany: jest.fn() },
  };
  return { prisma: prismaMock };
});

jest.mock('../src/config/logger', () => ({
  AppLogger: { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

import { prisma } from '../src/config/database';
import {
  ComplianceService,
  invalidateComplianceCache,
} from '../src/services/compliance.service';
import type {
  EquipoInfo,
} from '../src/services/compliance.service';

// NOSONAR: mock genérico para tests
const db = prisma as any;

function makeEquipo(overrides: Partial<EquipoInfo> = {}): EquipoInfo {
  return {
    id: 1,
    tenantEmpresaId: 1,
    dadorCargaId: 5,
    driverId: 10,
    truckId: 20,
    trailerId: 30,
    empresaTransportistaId: null,
    ...overrides,
  };
}

function futureDate(days: number): Date {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

function pastDate(days: number): Date {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

describe('ComplianceService (coverage)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    invalidateComplianceCache();
  });

  // ==========================================================================
  // CACHE FUNCTIONS
  // ==========================================================================
  describe('cache functions', () => {
    it('invalidateComplianceCache(equipoId) limpia solo ese equipo', async () => {
      db.equipo.findUnique.mockResolvedValue(makeEquipo({ id: 1 }));
      db.plantillaRequisitoTemplate.findMany.mockResolvedValue([]);

      await ComplianceService.evaluateEquipoClienteDetailed(1, 100);

      invalidateComplianceCache(1);

      db.equipo.findUnique.mockResolvedValue(null);
      const result = await ComplianceService.evaluateEquipoClienteDetailed(1, 100);
      expect(result).toEqual([]);
    });

    it('invalidateComplianceCache() limpia todo el cache', async () => {
      db.equipo.findUnique.mockResolvedValue(makeEquipo({ id: 2 }));
      db.plantillaRequisitoTemplate.findMany.mockResolvedValue([]);

      await ComplianceService.evaluateEquipoClienteDetailed(2, 100);

      invalidateComplianceCache();

      db.equipo.findUnique.mockResolvedValue(null);
      const result = await ComplianceService.evaluateEquipoClienteDetailed(2, 100);
      expect(result).toEqual([]);
    });

    it('usa cache en segunda llamada sin volver a consultar DB', async () => {
      db.equipo.findUnique.mockResolvedValue(makeEquipo({ id: 3 }));
      db.plantillaRequisitoTemplate.findMany.mockResolvedValue([{
        templateId: 1, entityType: 'CHOFER', obligatorio: true, diasAnticipacion: 5,
      }]);
      db.document.findMany.mockResolvedValue([{
        id: 50, templateId: 1, entityType: 'CHOFER', entityId: 10,
        tenantEmpresaId: 1, dadorCargaId: 5,
        status: 'APROBADO', expiresAt: futureDate(90),
        uploadedAt: new Date(),
      }]);

      const r1 = await ComplianceService.evaluateEquipoClienteDetailed(3, 100);
      const r2 = await ComplianceService.evaluateEquipoClienteDetailed(3, 100);

      expect(r1).toEqual(r2);
      expect(db.equipo.findUnique).toHaveBeenCalledTimes(1);
    });

    it('cache expira después del TTL y recarga', async () => {
      const now = Date.now();
      jest.spyOn(Date, 'now').mockReturnValue(now);

      db.equipo.findUnique.mockResolvedValue(makeEquipo({ id: 20 }));
      db.plantillaRequisitoTemplate.findMany.mockResolvedValue([{
        templateId: 1, entityType: 'CHOFER', obligatorio: true, diasAnticipacion: 5,
      }]);
      db.document.findMany.mockResolvedValue([]);

      await ComplianceService.evaluateEquipoClienteDetailed(20, 200);
      expect(db.equipo.findUnique).toHaveBeenCalledTimes(1);

      // Advance past TTL (5 min)
      (Date.now as any).mockReturnValue(now + 6 * 60 * 1000);

      await ComplianceService.evaluateEquipoClienteDetailed(20, 200);
      expect(db.equipo.findUnique).toHaveBeenCalledTimes(2);

      (Date.now as any).mockRestore();
    });

    it('invalidateComplianceCache con equipoId=0 (falsy) limpia todo', () => {
      invalidateComplianceCache(0);
      // Verifies it doesn't crash and executes the clear() branch
    });

    it('invalidateComplianceCache(equipoId) no borra entries de otros equipos', async () => {
      db.equipo.findUnique.mockResolvedValue(makeEquipo({ id: 10 }));
      db.plantillaRequisitoTemplate.findMany.mockResolvedValue([]);

      await ComplianceService.evaluateEquipoClienteDetailed(10, 100);

      db.equipo.findUnique.mockResolvedValue(makeEquipo({ id: 11 }));
      await ComplianceService.evaluateEquipoClienteDetailed(11, 200);

      invalidateComplianceCache(10);

      db.equipo.findUnique.mockResolvedValue(null);
      const r11 = await ComplianceService.evaluateEquipoClienteDetailed(11, 200);
      expect(r11).toEqual([]);
      expect(db.equipo.findUnique).toHaveBeenCalledTimes(2);
    });
  });

  // ==========================================================================
  // evaluateEquipoClienteDetailed - all document states
  // ==========================================================================
  describe('evaluateEquipoClienteDetailed', () => {
    it('retorna vacío si equipo no existe', async () => {
      db.equipo.findUnique.mockResolvedValue(null);
      const result = await ComplianceService.evaluateEquipoClienteDetailed(999, 100);
      expect(result).toEqual([]);
    });

    it('retorna vacío si no hay requisitos', async () => {
      db.equipo.findUnique.mockResolvedValue(makeEquipo({ id: 4, trailerId: null }));
      db.plantillaRequisitoTemplate.findMany.mockResolvedValue([]);

      const result = await ComplianceService.evaluateEquipoClienteDetailed(4, 100);
      expect(result).toEqual([]);
    });

    it('marca FALTANTE si entityId no existe para entityType', async () => {
      db.equipo.findUnique.mockResolvedValue(makeEquipo({ id: 5, driverId: 0 }));
      db.plantillaRequisitoTemplate.findMany.mockResolvedValue([{
        templateId: 1, entityType: 'CHOFER', obligatorio: true, diasAnticipacion: 5,
      }]);
      db.document.findMany.mockResolvedValue([]);

      const result = await ComplianceService.evaluateEquipoClienteDetailed(5, 100);
      expect(result[0].state).toBe('FALTANTE');
    });

    it('marca FALTANTE si no hay documento subido', async () => {
      db.equipo.findUnique.mockResolvedValue(makeEquipo({ id: 6 }));
      db.plantillaRequisitoTemplate.findMany.mockResolvedValue([{
        templateId: 1, entityType: 'CHOFER', obligatorio: true, diasAnticipacion: 5,
      }]);
      db.document.findMany.mockResolvedValue([]);

      const result = await ComplianceService.evaluateEquipoClienteDetailed(6, 100);
      expect(result[0].state).toBe('FALTANTE');
    });

    it('marca RECHAZADO para documento rechazado', async () => {
      db.equipo.findUnique.mockResolvedValue(makeEquipo({ id: 60 }));
      db.plantillaRequisitoTemplate.findMany.mockResolvedValue([{
        templateId: 1, entityType: 'CHOFER', obligatorio: true, diasAnticipacion: 5,
      }]);
      db.document.findMany.mockResolvedValue([{
        id: 80, templateId: 1, entityType: 'CHOFER', entityId: 10,
        tenantEmpresaId: 1, dadorCargaId: 5,
        status: 'RECHAZADO', expiresAt: null,
        uploadedAt: new Date(),
      }]);

      const result = await ComplianceService.evaluateEquipoClienteDetailed(60, 100);
      expect(result[0].state).toBe('RECHAZADO');
    });

    it('marca PENDIENTE para doc en estado VALIDANDO', async () => {
      db.equipo.findUnique.mockResolvedValue(makeEquipo({ id: 61 }));
      db.plantillaRequisitoTemplate.findMany.mockResolvedValue([{
        templateId: 1, entityType: 'CHOFER', obligatorio: true, diasAnticipacion: 5,
      }]);
      db.document.findMany.mockResolvedValue([{
        id: 81, templateId: 1, entityType: 'CHOFER', entityId: 10,
        tenantEmpresaId: 1, dadorCargaId: 5,
        status: 'VALIDANDO', expiresAt: null,
        uploadedAt: new Date(),
      }]);

      const result = await ComplianceService.evaluateEquipoClienteDetailed(61, 100);
      expect(result[0].state).toBe('PENDIENTE');
    });

    it('marca PENDIENTE para doc en estado CLASIFICANDO', async () => {
      db.equipo.findUnique.mockResolvedValue(makeEquipo({ id: 62 }));
      db.plantillaRequisitoTemplate.findMany.mockResolvedValue([{
        templateId: 1, entityType: 'CHOFER', obligatorio: true, diasAnticipacion: 5,
      }]);
      db.document.findMany.mockResolvedValue([{
        id: 82, templateId: 1, entityType: 'CHOFER', entityId: 10,
        tenantEmpresaId: 1, dadorCargaId: 5,
        status: 'CLASIFICANDO', expiresAt: null,
        uploadedAt: new Date(),
      }]);

      const result = await ComplianceService.evaluateEquipoClienteDetailed(62, 100);
      expect(result[0].state).toBe('PENDIENTE');
    });

    it('marca PENDIENTE para doc en estado PENDIENTE_APROBACION', async () => {
      db.equipo.findUnique.mockResolvedValue(makeEquipo({ id: 63 }));
      db.plantillaRequisitoTemplate.findMany.mockResolvedValue([{
        templateId: 1, entityType: 'CHOFER', obligatorio: true, diasAnticipacion: 5,
      }]);
      db.document.findMany.mockResolvedValue([{
        id: 83, templateId: 1, entityType: 'CHOFER', entityId: 10,
        tenantEmpresaId: 1, dadorCargaId: 5,
        status: 'PENDIENTE_APROBACION', expiresAt: null,
        uploadedAt: new Date(),
      }]);

      const result = await ComplianceService.evaluateEquipoClienteDetailed(63, 100);
      expect(result[0].state).toBe('PENDIENTE');
    });

    it('marca PENDIENTE para doc en estado PENDIENTE (raw status)', async () => {
      db.equipo.findUnique.mockResolvedValue(makeEquipo({ id: 163 }));
      db.plantillaRequisitoTemplate.findMany.mockResolvedValue([{
        templateId: 1, entityType: 'CHOFER', obligatorio: true, diasAnticipacion: 5,
      }]);
      db.document.findMany.mockResolvedValue([{
        id: 183, templateId: 1, entityType: 'CHOFER', entityId: 10,
        tenantEmpresaId: 1, dadorCargaId: 5,
        status: 'PENDIENTE', expiresAt: null,
        uploadedAt: new Date(),
      }]);

      const result = await ComplianceService.evaluateEquipoClienteDetailed(163, 100);
      expect(result[0].state).toBe('PENDIENTE');
    });

    it('marca VENCIDO para doc con status VENCIDO', async () => {
      db.equipo.findUnique.mockResolvedValue(makeEquipo({ id: 64 }));
      db.plantillaRequisitoTemplate.findMany.mockResolvedValue([{
        templateId: 1, entityType: 'CHOFER', obligatorio: true, diasAnticipacion: 5,
      }]);
      db.document.findMany.mockResolvedValue([{
        id: 84, templateId: 1, entityType: 'CHOFER', entityId: 10,
        tenantEmpresaId: 1, dadorCargaId: 5,
        status: 'VENCIDO', expiresAt: pastDate(5),
        uploadedAt: new Date(),
      }]);

      const result = await ComplianceService.evaluateEquipoClienteDetailed(64, 100);
      expect(result[0].state).toBe('VENCIDO');
    });

    it('marca VENCIDO para doc APROBADO con expiresAt pasado', async () => {
      db.equipo.findUnique.mockResolvedValue(makeEquipo({ id: 65 }));
      db.plantillaRequisitoTemplate.findMany.mockResolvedValue([{
        templateId: 3, entityType: 'CHOFER', obligatorio: true, diasAnticipacion: 5,
      }]);
      db.document.findMany.mockResolvedValue([{
        id: 85, templateId: 3, entityType: 'CHOFER', entityId: 10,
        tenantEmpresaId: 1, dadorCargaId: 5,
        status: 'APROBADO', expiresAt: pastDate(2),
        uploadedAt: new Date(),
      }]);

      const result = await ComplianceService.evaluateEquipoClienteDetailed(65, 100);
      expect(result[0].state).toBe('VENCIDO');
    });

    it('marca PROXIMO para doc APROBADO dentro del período de anticipación', async () => {
      db.equipo.findUnique.mockResolvedValue(makeEquipo({ id: 66 }));
      db.plantillaRequisitoTemplate.findMany.mockResolvedValue([{
        templateId: 4, entityType: 'CHOFER', obligatorio: true, diasAnticipacion: 10,
      }]);
      db.document.findMany.mockResolvedValue([{
        id: 86, templateId: 4, entityType: 'CHOFER', entityId: 10,
        tenantEmpresaId: 1, dadorCargaId: 5,
        status: 'APROBADO', expiresAt: futureDate(3),
        uploadedAt: new Date(),
      }]);

      const result = await ComplianceService.evaluateEquipoClienteDetailed(66, 100);
      expect(result[0].state).toBe('PROXIMO');
    });

    it('marca VIGENTE para doc APROBADO sin expiresAt', async () => {
      db.equipo.findUnique.mockResolvedValue(makeEquipo({ id: 67 }));
      db.plantillaRequisitoTemplate.findMany.mockResolvedValue([{
        templateId: 5, entityType: 'CHOFER', obligatorio: true, diasAnticipacion: 5,
      }]);
      db.document.findMany.mockResolvedValue([{
        id: 87, templateId: 5, entityType: 'CHOFER', entityId: 10,
        tenantEmpresaId: 1, dadorCargaId: 5,
        status: 'APROBADO', expiresAt: null,
        uploadedAt: new Date(),
      }]);

      const result = await ComplianceService.evaluateEquipoClienteDetailed(67, 100);
      expect(result[0].state).toBe('VIGENTE');
    });

    it('marca VIGENTE para doc APROBADO con fecha lejana', async () => {
      db.equipo.findUnique.mockResolvedValue(makeEquipo({ id: 7 }));
      db.plantillaRequisitoTemplate.findMany.mockResolvedValue([{
        templateId: 2, entityType: 'CHOFER', obligatorio: true, diasAnticipacion: 5,
      }]);
      db.document.findMany.mockResolvedValue([{
        id: 60, templateId: 2, entityType: 'CHOFER', entityId: 10,
        tenantEmpresaId: 1, dadorCargaId: 5,
        status: 'APROBADO', expiresAt: futureDate(90),
        uploadedAt: new Date(),
      }]);

      const result = await ComplianceService.evaluateEquipoClienteDetailed(7, 100);
      expect(result[0].state).toBe('VIGENTE');
      expect(result[0].documentId).toBe(60);
    });

    it('PENDIENTE (default branch) para status desconocido', async () => {
      db.equipo.findUnique.mockResolvedValue(makeEquipo({ id: 68 }));
      db.plantillaRequisitoTemplate.findMany.mockResolvedValue([{
        templateId: 6, entityType: 'CHOFER', obligatorio: true, diasAnticipacion: 5,
      }]);
      db.document.findMany.mockResolvedValue([{
        id: 88, templateId: 6, entityType: 'CHOFER', entityId: 10,
        tenantEmpresaId: 1, dadorCargaId: 5,
        status: 'UNKNOWN_STATUS', expiresAt: null,
        uploadedAt: new Date(),
      }]);

      const result = await ComplianceService.evaluateEquipoClienteDetailed(68, 100);
      expect(result[0].state).toBe('PENDIENTE');
    });

    it('evalúa múltiples entity types incluyendo EMPRESA_TRANSPORTISTA', async () => {
      db.equipo.findUnique.mockResolvedValue(makeEquipo({
        id: 11,
        empresaTransportistaId: 40,
      }));
      db.plantillaRequisitoTemplate.findMany.mockResolvedValue([
        { templateId: 1, entityType: 'CHOFER', obligatorio: true, diasAnticipacion: 5 },
        { templateId: 2, entityType: 'CAMION', obligatorio: true, diasAnticipacion: 5 },
        { templateId: 3, entityType: 'ACOPLADO', obligatorio: false, diasAnticipacion: 5 },
        { templateId: 4, entityType: 'EMPRESA_TRANSPORTISTA', obligatorio: true, diasAnticipacion: 5 },
      ]);
      db.document.findMany.mockResolvedValue([]);

      const result = await ComplianceService.evaluateEquipoClienteDetailed(11, 100);
      expect(result).toHaveLength(4);
      expect(result.every((r: any) => r.state === 'FALTANTE')).toBe(true);
    });

    it('maneja entityType desconocido (default branch en getEntityIdFromEquipo)', async () => {
      db.equipo.findUnique.mockResolvedValue(makeEquipo({ id: 69 }));
      db.plantillaRequisitoTemplate.findMany.mockResolvedValue([{
        templateId: 7, entityType: 'UNKNOWN_ENTITY', obligatorio: true, diasAnticipacion: 5,
      }]);
      db.document.findMany.mockResolvedValue([]);

      const result = await ComplianceService.evaluateEquipoClienteDetailed(69, 100);
      expect(result[0].state).toBe('FALTANTE');
    });

    it('incluye documentStatus y expiresAt del doc encontrado', async () => {
      const expDate = futureDate(60);
      db.equipo.findUnique.mockResolvedValue(makeEquipo({ id: 200 }));
      db.plantillaRequisitoTemplate.findMany.mockResolvedValue([{
        templateId: 1, entityType: 'CHOFER', obligatorio: true, diasAnticipacion: 5,
      }]);
      db.document.findMany.mockResolvedValue([{
        id: 300, templateId: 1, entityType: 'CHOFER', entityId: 10,
        tenantEmpresaId: 1, dadorCargaId: 5,
        status: 'APROBADO', expiresAt: expDate,
        uploadedAt: new Date(),
      }]);

      const result = await ComplianceService.evaluateEquipoClienteDetailed(200, 100);
      expect(result[0].documentId).toBe(300);
      expect(result[0].documentStatus).toBe('APROBADO');
      expect(result[0].expiresAt).toEqual(expDate);
    });

    it('expiresAt es null cuando doc no tiene expiresAt', async () => {
      db.equipo.findUnique.mockResolvedValue(makeEquipo({ id: 201 }));
      db.plantillaRequisitoTemplate.findMany.mockResolvedValue([{
        templateId: 1, entityType: 'CHOFER', obligatorio: true, diasAnticipacion: 5,
      }]);
      db.document.findMany.mockResolvedValue([{
        id: 301, templateId: 1, entityType: 'CHOFER', entityId: 10,
        tenantEmpresaId: 1, dadorCargaId: 5,
        status: 'APROBADO', expiresAt: null,
        uploadedAt: new Date(),
      }]);

      const result = await ComplianceService.evaluateEquipoClienteDetailed(201, 100);
      expect(result[0].expiresAt).toBeNull();
    });

    it('evalúa ACOPLADO y CAMION entity types correctamente', async () => {
      db.equipo.findUnique.mockResolvedValue(makeEquipo({ id: 202, trailerId: 30 }));
      db.plantillaRequisitoTemplate.findMany.mockResolvedValue([
        { templateId: 1, entityType: 'CAMION', obligatorio: true, diasAnticipacion: 5 },
        { templateId: 2, entityType: 'ACOPLADO', obligatorio: true, diasAnticipacion: 5 },
      ]);
      db.document.findMany.mockResolvedValue([
        {
          id: 400, templateId: 1, entityType: 'CAMION', entityId: 20,
          tenantEmpresaId: 1, dadorCargaId: 5,
          status: 'APROBADO', expiresAt: futureDate(60),
          uploadedAt: new Date(),
        },
        {
          id: 401, templateId: 2, entityType: 'ACOPLADO', entityId: 30,
          tenantEmpresaId: 1, dadorCargaId: 5,
          status: 'APROBADO', expiresAt: futureDate(60),
          uploadedAt: new Date(),
        },
      ]);

      const result = await ComplianceService.evaluateEquipoClienteDetailed(202, 100);
      expect(result).toHaveLength(2);
      expect(result[0].state).toBe('VIGENTE');
      expect(result[1].state).toBe('VIGENTE');
    });

    it('FALTANTE cuando equipo trailerId es null para ACOPLADO requisito', async () => {
      db.equipo.findUnique.mockResolvedValue(makeEquipo({ id: 203, trailerId: null }));
      db.plantillaRequisitoTemplate.findMany.mockResolvedValue([{
        templateId: 1, entityType: 'ACOPLADO', obligatorio: true, diasAnticipacion: 5,
      }]);
      db.document.findMany.mockResolvedValue([]);

      const result = await ComplianceService.evaluateEquipoClienteDetailed(203, 100);
      expect(result[0].state).toBe('FALTANTE');
    });

    it('múltiples requisitos del mismo entityType, solo el primer doc en index cuenta', async () => {
      db.equipo.findUnique.mockResolvedValue(makeEquipo({ id: 204 }));
      db.plantillaRequisitoTemplate.findMany.mockResolvedValue([
        { templateId: 1, entityType: 'CHOFER', obligatorio: true, diasAnticipacion: 5 },
        { templateId: 2, entityType: 'CHOFER', obligatorio: false, diasAnticipacion: 10 },
      ]);
      db.document.findMany.mockResolvedValue([
        {
          id: 500, templateId: 1, entityType: 'CHOFER', entityId: 10,
          tenantEmpresaId: 1, dadorCargaId: 5,
          status: 'APROBADO', expiresAt: futureDate(90),
          uploadedAt: new Date(),
        },
      ]);

      const result = await ComplianceService.evaluateEquipoClienteDetailed(204, 100);
      expect(result).toHaveLength(2);
      expect(result[0].state).toBe('VIGENTE');
      expect(result[1].state).toBe('FALTANTE');
    });

    it('APROBADO con expiresAt exactamente en el límite de diasAnticipacion es PROXIMO', async () => {
      const now = Date.now();
      jest.spyOn(Date, 'now').mockReturnValue(now);

      db.equipo.findUnique.mockResolvedValue(makeEquipo({ id: 205 }));
      db.plantillaRequisitoTemplate.findMany.mockResolvedValue([{
        templateId: 1, entityType: 'CHOFER', obligatorio: true, diasAnticipacion: 5,
      }]);
      db.document.findMany.mockResolvedValue([{
        id: 600, templateId: 1, entityType: 'CHOFER', entityId: 10,
        tenantEmpresaId: 1, dadorCargaId: 5,
        status: 'APROBADO', expiresAt: new Date(now + 5 * 24 * 60 * 60 * 1000),
        uploadedAt: new Date(),
      }]);

      const result = await ComplianceService.evaluateEquipoClienteDetailed(205, 100);
      expect(result[0].state).toBe('PROXIMO');

      (Date.now as any).mockRestore();
    });

    it('APROBADO con expiresAt exactamente igual a now es VENCIDO', async () => {
      const now = Date.now();
      jest.spyOn(Date, 'now').mockReturnValue(now);

      db.equipo.findUnique.mockResolvedValue(makeEquipo({ id: 206 }));
      db.plantillaRequisitoTemplate.findMany.mockResolvedValue([{
        templateId: 1, entityType: 'CHOFER', obligatorio: true, diasAnticipacion: 5,
      }]);
      db.document.findMany.mockResolvedValue([{
        id: 601, templateId: 1, entityType: 'CHOFER', entityId: 10,
        tenantEmpresaId: 1, dadorCargaId: 5,
        status: 'APROBADO', expiresAt: new Date(now - 1),
        uploadedAt: new Date(),
      }]);

      const result = await ComplianceService.evaluateEquipoClienteDetailed(206, 100);
      expect(result[0].state).toBe('VENCIDO');

      (Date.now as any).mockRestore();
    });
  });

  // ==========================================================================
  // evaluateEquipoCliente (legado) - mapDetailedToSimple
  // ==========================================================================
  describe('evaluateEquipoCliente (legado)', () => {
    it('mapea VIGENTE → OK', async () => {
      db.equipo.findUnique.mockResolvedValue(makeEquipo({ id: 70 }));
      db.plantillaRequisitoTemplate.findMany.mockResolvedValue([{
        templateId: 1, entityType: 'CHOFER', obligatorio: true, diasAnticipacion: 5,
      }]);
      db.document.findMany.mockResolvedValue([{
        id: 90, templateId: 1, entityType: 'CHOFER', entityId: 10,
        tenantEmpresaId: 1, dadorCargaId: 5,
        status: 'APROBADO', expiresAt: futureDate(90),
        uploadedAt: new Date(),
      }]);

      const result = await ComplianceService.evaluateEquipoCliente(70, 100);
      expect(result[0].state).toBe('OK');
    });

    it('mapea FALTANTE → FALTANTE', async () => {
      db.equipo.findUnique.mockResolvedValue(makeEquipo({ id: 71 }));
      db.plantillaRequisitoTemplate.findMany.mockResolvedValue([{
        templateId: 1, entityType: 'CHOFER', obligatorio: true, diasAnticipacion: 5,
      }]);
      db.document.findMany.mockResolvedValue([]);

      const result = await ComplianceService.evaluateEquipoCliente(71, 100);
      expect(result[0].state).toBe('FALTANTE');
    });

    it('mapea VENCIDO → FALTANTE', async () => {
      db.equipo.findUnique.mockResolvedValue(makeEquipo({ id: 72 }));
      db.plantillaRequisitoTemplate.findMany.mockResolvedValue([{
        templateId: 1, entityType: 'CHOFER', obligatorio: true, diasAnticipacion: 5,
      }]);
      db.document.findMany.mockResolvedValue([{
        id: 91, templateId: 1, entityType: 'CHOFER', entityId: 10,
        tenantEmpresaId: 1, dadorCargaId: 5,
        status: 'VENCIDO', expiresAt: pastDate(5),
        uploadedAt: new Date(),
      }]);

      const result = await ComplianceService.evaluateEquipoCliente(72, 100);
      expect(result[0].state).toBe('FALTANTE');
    });

    it('mapea PENDIENTE → FALTANTE', async () => {
      db.equipo.findUnique.mockResolvedValue(makeEquipo({ id: 73 }));
      db.plantillaRequisitoTemplate.findMany.mockResolvedValue([{
        templateId: 1, entityType: 'CHOFER', obligatorio: true, diasAnticipacion: 5,
      }]);
      db.document.findMany.mockResolvedValue([{
        id: 92, templateId: 1, entityType: 'CHOFER', entityId: 10,
        tenantEmpresaId: 1, dadorCargaId: 5,
        status: 'PENDIENTE', expiresAt: null,
        uploadedAt: new Date(),
      }]);

      const result = await ComplianceService.evaluateEquipoCliente(73, 100);
      expect(result[0].state).toBe('FALTANTE');
    });

    it('mapea RECHAZADO → FALTANTE', async () => {
      db.equipo.findUnique.mockResolvedValue(makeEquipo({ id: 74 }));
      db.plantillaRequisitoTemplate.findMany.mockResolvedValue([{
        templateId: 1, entityType: 'CHOFER', obligatorio: true, diasAnticipacion: 5,
      }]);
      db.document.findMany.mockResolvedValue([{
        id: 93, templateId: 1, entityType: 'CHOFER', entityId: 10,
        tenantEmpresaId: 1, dadorCargaId: 5,
        status: 'RECHAZADO', expiresAt: null,
        uploadedAt: new Date(),
      }]);

      const result = await ComplianceService.evaluateEquipoCliente(74, 100);
      expect(result[0].state).toBe('FALTANTE');
    });

    it('mapea PROXIMO → PROXIMO', async () => {
      db.equipo.findUnique.mockResolvedValue(makeEquipo({ id: 75 }));
      db.plantillaRequisitoTemplate.findMany.mockResolvedValue([{
        templateId: 4, entityType: 'CHOFER', obligatorio: true, diasAnticipacion: 10,
      }]);
      db.document.findMany.mockResolvedValue([{
        id: 94, templateId: 4, entityType: 'CHOFER', entityId: 10,
        tenantEmpresaId: 1, dadorCargaId: 5,
        status: 'APROBADO', expiresAt: futureDate(3),
        uploadedAt: new Date(),
      }]);

      const result = await ComplianceService.evaluateEquipoCliente(75, 100);
      expect(result[0].state).toBe('PROXIMO');
    });

    it('retorna vacío si equipo no existe', async () => {
      db.equipo.findUnique.mockResolvedValue(null);
      const result = await ComplianceService.evaluateEquipoCliente(999, 100);
      expect(result).toEqual([]);
    });

    it('incluye expiresAt null cuando doc no tiene fecha', async () => {
      db.equipo.findUnique.mockResolvedValue(makeEquipo({ id: 76 }));
      db.plantillaRequisitoTemplate.findMany.mockResolvedValue([{
        templateId: 1, entityType: 'CHOFER', obligatorio: true, diasAnticipacion: 5,
      }]);
      db.document.findMany.mockResolvedValue([{
        id: 95, templateId: 1, entityType: 'CHOFER', entityId: 10,
        tenantEmpresaId: 1, dadorCargaId: 5,
        status: 'APROBADO', expiresAt: null,
        uploadedAt: new Date(),
      }]);

      const result = await ComplianceService.evaluateEquipoCliente(76, 100);
      expect(result[0].expiresAt).toBeNull();
    });

    it('incluye expiresAt con valor cuando doc tiene fecha', async () => {
      const exp = futureDate(30);
      db.equipo.findUnique.mockResolvedValue(makeEquipo({ id: 77 }));
      db.plantillaRequisitoTemplate.findMany.mockResolvedValue([{
        templateId: 1, entityType: 'CHOFER', obligatorio: true, diasAnticipacion: 5,
      }]);
      db.document.findMany.mockResolvedValue([{
        id: 96, templateId: 1, entityType: 'CHOFER', entityId: 10,
        tenantEmpresaId: 1, dadorCargaId: 5,
        status: 'APROBADO', expiresAt: exp,
        uploadedAt: new Date(),
      }]);

      const result = await ComplianceService.evaluateEquipoCliente(77, 100);
      expect(result[0].expiresAt).toEqual(exp);
    });
  });

  // ==========================================================================
  // evaluateBatchEquiposCliente
  // ==========================================================================
  describe('evaluateBatchEquiposCliente', () => {
    it('retorna mapa vacío si no hay equipos', async () => {
      const result = await ComplianceService.evaluateBatchEquiposCliente([]);
      expect(result.size).toBe(0);
    });

    it('evalúa batch con clienteId explícito (skip loadEquipoClienteAssignments)', async () => {
      db.plantillaRequisitoTemplate.findMany.mockResolvedValue([{
        templateId: 11, entityType: 'CAMION', obligatorio: true, diasAnticipacion: 5,
        plantillaRequisito: { clienteId: 60 },
      }]);
      db.document.findMany.mockResolvedValue([]);

      const equipos = [makeEquipo({ id: 2, trailerId: null })];

      const result = await ComplianceService.evaluateBatchEquiposCliente(equipos, 60);

      expect(result.size).toBe(1);
      expect(result.get(2)!.tieneFaltantes).toBe(true);
      expect(db.equipoCliente.findMany).not.toHaveBeenCalled();
    });

    it('evalúa batch sin clienteId (carga assignments)', async () => {
      db.equipoCliente.findMany.mockResolvedValue([
        { equipoId: 1, clienteId: 50 },
      ]);
      db.plantillaRequisitoTemplate.findMany.mockResolvedValue([{
        templateId: 10, entityType: 'CHOFER', obligatorio: true, diasAnticipacion: 5,
        plantillaRequisito: { clienteId: 50 },
      }]);
      db.document.findMany.mockResolvedValue([{
        id: 70, templateId: 10, entityType: 'CHOFER', entityId: 10,
        tenantEmpresaId: 1, dadorCargaId: 5,
        status: 'APROBADO', expiresAt: futureDate(90),
        uploadedAt: new Date(),
      }]);

      const equipos = [makeEquipo({ id: 1 })];

      const result = await ComplianceService.evaluateBatchEquiposCliente(equipos);

      expect(result.size).toBe(1);
      expect(result.get(1)).toBeDefined();
      expect(db.equipoCliente.findMany).toHaveBeenCalled();
    });

    it('evalúa batch sin requisitos (todos vigentes)', async () => {
      db.equipoCliente.findMany.mockResolvedValue([
        { equipoId: 1, clienteId: 50 },
      ]);
      db.plantillaRequisitoTemplate.findMany.mockResolvedValue([]);

      const equipos = [makeEquipo({ id: 1, trailerId: null })];

      const result = await ComplianceService.evaluateBatchEquiposCliente(equipos);

      expect(result.size).toBe(1);
      const eq = result.get(1)!;
      expect(eq.tieneVencidos).toBe(false);
      expect(eq.tieneFaltantes).toBe(false);
      expect(eq.tieneProximos).toBe(false);
      expect(eq.requirements).toEqual([]);
    });

    it('detecta tieneVencidos cuando hay doc vencido', async () => {
      db.equipoCliente.findMany.mockResolvedValue([
        { equipoId: 1, clienteId: 50 },
      ]);
      db.plantillaRequisitoTemplate.findMany.mockResolvedValue([{
        templateId: 10, entityType: 'CHOFER', obligatorio: true, diasAnticipacion: 5,
        plantillaRequisito: { clienteId: 50 },
      }]);
      db.document.findMany.mockResolvedValue([{
        id: 70, templateId: 10, entityType: 'CHOFER', entityId: 10,
        tenantEmpresaId: 1, dadorCargaId: 5,
        status: 'APROBADO', expiresAt: pastDate(5),
        uploadedAt: new Date(),
      }]);

      const equipos = [makeEquipo({ id: 1 })];
      const result = await ComplianceService.evaluateBatchEquiposCliente(equipos);

      expect(result.get(1)!.tieneVencidos).toBe(true);
    });

    it('detecta tieneProximos cuando hay doc próximo a vencer', async () => {
      db.equipoCliente.findMany.mockResolvedValue([
        { equipoId: 1, clienteId: 50 },
      ]);
      db.plantillaRequisitoTemplate.findMany.mockResolvedValue([{
        templateId: 10, entityType: 'CHOFER', obligatorio: true, diasAnticipacion: 15,
        plantillaRequisito: { clienteId: 50 },
      }]);
      db.document.findMany.mockResolvedValue([{
        id: 70, templateId: 10, entityType: 'CHOFER', entityId: 10,
        tenantEmpresaId: 1, dadorCargaId: 5,
        status: 'APROBADO', expiresAt: futureDate(5),
        uploadedAt: new Date(),
      }]);

      const equipos = [makeEquipo({ id: 1 })];
      const result = await ComplianceService.evaluateBatchEquiposCliente(equipos);

      expect(result.get(1)!.tieneProximos).toBe(true);
    });

    it('equipo sin clientes asignados recibe array vacío de requisitos', async () => {
      db.equipoCliente.findMany.mockResolvedValue([]);
      db.plantillaRequisitoTemplate.findMany.mockResolvedValue([]);

      const equipos = [makeEquipo({ id: 99 })];
      const result = await ComplianceService.evaluateBatchEquiposCliente(equipos);

      expect(result.size).toBe(1);
      expect(result.get(99)!.requirements).toEqual([]);
    });

    it('consolida requisitos de múltiples clientes (obligatorio override)', async () => {
      db.equipoCliente.findMany.mockResolvedValue([
        { equipoId: 1, clienteId: 50 },
        { equipoId: 1, clienteId: 51 },
      ]);
      db.plantillaRequisitoTemplate.findMany.mockResolvedValue([
        {
          templateId: 10, entityType: 'CHOFER', obligatorio: false, diasAnticipacion: 5,
          plantillaRequisito: { clienteId: 50 },
        },
        {
          templateId: 10, entityType: 'CHOFER', obligatorio: true, diasAnticipacion: 5,
          plantillaRequisito: { clienteId: 51 },
        },
      ]);
      db.document.findMany.mockResolvedValue([]);

      const equipos = [makeEquipo({ id: 1 })];
      const result = await ComplianceService.evaluateBatchEquiposCliente(equipos);

      const req = result.get(1)!.requirements[0];
      expect(req.obligatorio).toBe(true);
    });

    it('consolida requisitos - mayor diasAnticipacion gana', async () => {
      db.equipoCliente.findMany.mockResolvedValue([
        { equipoId: 1, clienteId: 50 },
        { equipoId: 1, clienteId: 51 },
      ]);
      db.plantillaRequisitoTemplate.findMany.mockResolvedValue([
        {
          templateId: 10, entityType: 'CHOFER', obligatorio: false, diasAnticipacion: 5,
          plantillaRequisito: { clienteId: 50 },
        },
        {
          templateId: 10, entityType: 'CHOFER', obligatorio: false, diasAnticipacion: 15,
          plantillaRequisito: { clienteId: 51 },
        },
      ]);
      db.document.findMany.mockResolvedValue([]);

      const equipos = [makeEquipo({ id: 1 })];
      const result = await ComplianceService.evaluateBatchEquiposCliente(equipos);

      const req = result.get(1)!.requirements[0];
      expect(req.diasAnticipacion).toBe(15);
    });

    it('consolida requisitos - mismo diasAnticipacion y ambos no obligatorios mantiene original', async () => {
      db.equipoCliente.findMany.mockResolvedValue([
        { equipoId: 1, clienteId: 50 },
        { equipoId: 1, clienteId: 51 },
      ]);
      db.plantillaRequisitoTemplate.findMany.mockResolvedValue([
        {
          templateId: 10, entityType: 'CHOFER', obligatorio: false, diasAnticipacion: 5,
          plantillaRequisito: { clienteId: 50 },
        },
        {
          templateId: 10, entityType: 'CHOFER', obligatorio: false, diasAnticipacion: 5,
          plantillaRequisito: { clienteId: 51 },
        },
      ]);
      db.document.findMany.mockResolvedValue([]);

      const equipos = [makeEquipo({ id: 1 })];
      const result = await ComplianceService.evaluateBatchEquiposCliente(equipos);

      const req = result.get(1)!.requirements[0];
      expect(req.obligatorio).toBe(false);
      expect(req.diasAnticipacion).toBe(5);
    });

    it('consolida requisitos - obligatorio true existente no se reemplaza por false', async () => {
      db.equipoCliente.findMany.mockResolvedValue([
        { equipoId: 1, clienteId: 50 },
        { equipoId: 1, clienteId: 51 },
      ]);
      db.plantillaRequisitoTemplate.findMany.mockResolvedValue([
        {
          templateId: 10, entityType: 'CHOFER', obligatorio: true, diasAnticipacion: 5,
          plantillaRequisito: { clienteId: 50 },
        },
        {
          templateId: 10, entityType: 'CHOFER', obligatorio: false, diasAnticipacion: 5,
          plantillaRequisito: { clienteId: 51 },
        },
      ]);
      db.document.findMany.mockResolvedValue([]);

      const equipos = [makeEquipo({ id: 1 })];
      const result = await ComplianceService.evaluateBatchEquiposCliente(equipos);

      const req = result.get(1)!.requirements[0];
      expect(req.obligatorio).toBe(true);
    });

    it('evalúa batch con todas las entidades (chofer, camion, acoplado, empresa)', async () => {
      const eq = makeEquipo({ id: 1, empresaTransportistaId: 40 });
      db.equipoCliente.findMany.mockResolvedValue([{ equipoId: 1, clienteId: 50 }]);
      db.plantillaRequisitoTemplate.findMany.mockResolvedValue([
        { templateId: 1, entityType: 'CHOFER', obligatorio: true, diasAnticipacion: 5, plantillaRequisito: { clienteId: 50 } },
        { templateId: 2, entityType: 'CAMION', obligatorio: true, diasAnticipacion: 5, plantillaRequisito: { clienteId: 50 } },
        { templateId: 3, entityType: 'ACOPLADO', obligatorio: true, diasAnticipacion: 5, plantillaRequisito: { clienteId: 50 } },
        { templateId: 4, entityType: 'EMPRESA_TRANSPORTISTA', obligatorio: true, diasAnticipacion: 5, plantillaRequisito: { clienteId: 50 } },
      ]);
      db.document.findMany.mockResolvedValue([]);

      const result = await ComplianceService.evaluateBatchEquiposCliente([eq]);
      expect(result.get(1)!.requirements).toHaveLength(4);
    });

    it('evalúa batch con múltiples equipos', async () => {
      const eq1 = makeEquipo({ id: 1, driverId: 10, truckId: 20 });
      const eq2 = makeEquipo({ id: 2, driverId: 11, truckId: 21 });

      db.equipoCliente.findMany.mockResolvedValue([
        { equipoId: 1, clienteId: 50 },
        { equipoId: 2, clienteId: 50 },
      ]);
      db.plantillaRequisitoTemplate.findMany.mockResolvedValue([{
        templateId: 10, entityType: 'CHOFER', obligatorio: true, diasAnticipacion: 5,
        plantillaRequisito: { clienteId: 50 },
      }]);
      db.document.findMany.mockResolvedValue([]);

      const result = await ComplianceService.evaluateBatchEquiposCliente([eq1, eq2]);

      expect(result.size).toBe(2);
      expect(result.get(1)).toBeDefined();
      expect(result.get(2)).toBeDefined();
    });

    it('equipo con trailerId null y empresaTransportistaId null en collectEntitySets', async () => {
      const eq = makeEquipo({ id: 1, trailerId: null, empresaTransportistaId: null });

      db.equipoCliente.findMany.mockResolvedValue([{ equipoId: 1, clienteId: 50 }]);
      db.plantillaRequisitoTemplate.findMany.mockResolvedValue([{
        templateId: 10, entityType: 'CHOFER', obligatorio: true, diasAnticipacion: 5,
        plantillaRequisito: { clienteId: 50 },
      }]);
      db.document.findMany.mockResolvedValue([]);

      const result = await ComplianceService.evaluateBatchEquiposCliente([eq]);
      expect(result.size).toBe(1);
    });

    it('equipo sin driverId y truckId 0 en collectEntitySets', async () => {
      const eq = makeEquipo({ id: 1, driverId: 0, truckId: 0, trailerId: null });

      db.equipoCliente.findMany.mockResolvedValue([{ equipoId: 1, clienteId: 50 }]);
      db.plantillaRequisitoTemplate.findMany.mockResolvedValue([{
        templateId: 10, entityType: 'CHOFER', obligatorio: true, diasAnticipacion: 5,
        plantillaRequisito: { clienteId: 50 },
      }]);
      db.document.findMany.mockResolvedValue([]);

      const result = await ComplianceService.evaluateBatchEquiposCliente([eq]);
      expect(result.get(1)!.tieneFaltantes).toBe(true);
    });

    it('doc con dadorCargaId null genera key válido', async () => {
      const eq = makeEquipo({ id: 1, dadorCargaId: 0 });

      db.equipoCliente.findMany.mockResolvedValue([{ equipoId: 1, clienteId: 50 }]);
      db.plantillaRequisitoTemplate.findMany.mockResolvedValue([{
        templateId: 10, entityType: 'CHOFER', obligatorio: true, diasAnticipacion: 5,
        plantillaRequisito: { clienteId: 50 },
      }]);
      db.document.findMany.mockResolvedValue([{
        id: 70, templateId: 10, entityType: 'CHOFER', entityId: 10,
        tenantEmpresaId: 1, dadorCargaId: null,
        status: 'APROBADO', expiresAt: futureDate(90),
        uploadedAt: new Date(),
      }]);

      const result = await ComplianceService.evaluateBatchEquiposCliente([eq]);
      expect(result.size).toBe(1);
    });

    it('loadDocuments solo usa primer doc por key (orderBy desc)', async () => {
      db.equipoCliente.findMany.mockResolvedValue([{ equipoId: 1, clienteId: 50 }]);
      db.plantillaRequisitoTemplate.findMany.mockResolvedValue([{
        templateId: 10, entityType: 'CHOFER', obligatorio: true, diasAnticipacion: 5,
        plantillaRequisito: { clienteId: 50 },
      }]);
      db.document.findMany.mockResolvedValue([
        {
          id: 70, templateId: 10, entityType: 'CHOFER', entityId: 10,
          tenantEmpresaId: 1, dadorCargaId: 5,
          status: 'APROBADO', expiresAt: futureDate(90),
          uploadedAt: new Date(),
        },
        {
          id: 69, templateId: 10, entityType: 'CHOFER', entityId: 10,
          tenantEmpresaId: 1, dadorCargaId: 5,
          status: 'VENCIDO', expiresAt: pastDate(30),
          uploadedAt: pastDate(60),
        },
      ]);

      const equipos = [makeEquipo({ id: 1 })];
      const result = await ComplianceService.evaluateBatchEquiposCliente(equipos);

      expect(result.get(1)!.tieneVencidos).toBe(false);
    });

    it('batch con RECHAZADO en evaluateSingleEquipo marca tieneFaltantes', async () => {
      db.equipoCliente.findMany.mockResolvedValue([{ equipoId: 1, clienteId: 50 }]);
      db.plantillaRequisitoTemplate.findMany.mockResolvedValue([{
        templateId: 10, entityType: 'CHOFER', obligatorio: true, diasAnticipacion: 5,
        plantillaRequisito: { clienteId: 50 },
      }]);
      db.document.findMany.mockResolvedValue([{
        id: 70, templateId: 10, entityType: 'CHOFER', entityId: 10,
        tenantEmpresaId: 1, dadorCargaId: 5,
        status: 'RECHAZADO', expiresAt: null,
        uploadedAt: new Date(),
      }]);

      const equipos = [makeEquipo({ id: 1 })];
      const result = await ComplianceService.evaluateBatchEquiposCliente(equipos);

      expect(result.get(1)!.tieneFaltantes).toBe(true);
    });

    it('batch con entityType desconocido en equipo marca FALTANTE', async () => {
      db.equipoCliente.findMany.mockResolvedValue([{ equipoId: 1, clienteId: 50 }]);
      db.plantillaRequisitoTemplate.findMany.mockResolvedValue([{
        templateId: 10, entityType: 'UNKNOWN', obligatorio: true, diasAnticipacion: 5,
        plantillaRequisito: { clienteId: 50 },
      }]);
      db.document.findMany.mockResolvedValue([]);

      const equipos = [makeEquipo({ id: 1 })];
      const result = await ComplianceService.evaluateBatchEquiposCliente(equipos);

      expect(result.get(1)!.tieneFaltantes).toBe(true);
    });

    it('batch con VENCIDO doc status marca tieneVencidos', async () => {
      db.equipoCliente.findMany.mockResolvedValue([{ equipoId: 1, clienteId: 50 }]);
      db.plantillaRequisitoTemplate.findMany.mockResolvedValue([{
        templateId: 10, entityType: 'CHOFER', obligatorio: true, diasAnticipacion: 5,
        plantillaRequisito: { clienteId: 50 },
      }]);
      db.document.findMany.mockResolvedValue([{
        id: 70, templateId: 10, entityType: 'CHOFER', entityId: 10,
        tenantEmpresaId: 1, dadorCargaId: 5,
        status: 'VENCIDO', expiresAt: pastDate(10),
        uploadedAt: new Date(),
      }]);

      const equipos = [makeEquipo({ id: 1 })];
      const result = await ComplianceService.evaluateBatchEquiposCliente(equipos);

      expect(result.get(1)!.tieneVencidos).toBe(true);
    });

    it('batch con clienteId explícito y equipo sin assignments usa clienteId directamente', async () => {
      db.plantillaRequisitoTemplate.findMany.mockResolvedValue([{
        templateId: 10, entityType: 'CHOFER', obligatorio: true, diasAnticipacion: 5,
        plantillaRequisito: { clienteId: 60 },
      }]);
      db.document.findMany.mockResolvedValue([{
        id: 70, templateId: 10, entityType: 'CHOFER', entityId: 10,
        tenantEmpresaId: 1, dadorCargaId: 5,
        status: 'APROBADO', expiresAt: futureDate(90),
        uploadedAt: new Date(),
      }]);

      const equipos = [makeEquipo({ id: 1 }), makeEquipo({ id: 2, driverId: 11 })];
      const result = await ComplianceService.evaluateBatchEquiposCliente(equipos, 60);

      expect(result.size).toBe(2);
      expect(db.equipoCliente.findMany).not.toHaveBeenCalled();
    });

    it('loadClienteAssignmentsForBatch agrega equipos faltantes al mapa', async () => {
      db.equipoCliente.findMany.mockResolvedValue([
        { equipoId: 1, clienteId: 50 },
      ]);
      db.plantillaRequisitoTemplate.findMany.mockResolvedValue([{
        templateId: 10, entityType: 'CHOFER', obligatorio: true, diasAnticipacion: 5,
        plantillaRequisito: { clienteId: 50 },
      }]);
      db.document.findMany.mockResolvedValue([]);

      const equipos = [
        makeEquipo({ id: 1 }),
        makeEquipo({ id: 3, driverId: 15 }),
      ];
      const result = await ComplianceService.evaluateBatchEquiposCliente(equipos);

      expect(result.size).toBe(2);
      expect(result.get(3)).toBeDefined();
      expect(result.get(3)!.requirements).toEqual([]);
    });

    it('collectEntitySets handles equipos con todos los entity ids', async () => {
      const eq = makeEquipo({
        id: 1, driverId: 10, truckId: 20, trailerId: 30, empresaTransportistaId: 40,
      });

      db.equipoCliente.findMany.mockResolvedValue([{ equipoId: 1, clienteId: 50 }]);
      db.plantillaRequisitoTemplate.findMany.mockResolvedValue([
        { templateId: 1, entityType: 'CHOFER', obligatorio: true, diasAnticipacion: 5, plantillaRequisito: { clienteId: 50 } },
        { templateId: 2, entityType: 'CAMION', obligatorio: true, diasAnticipacion: 5, plantillaRequisito: { clienteId: 50 } },
        { templateId: 3, entityType: 'ACOPLADO', obligatorio: true, diasAnticipacion: 5, plantillaRequisito: { clienteId: 50 } },
        { templateId: 4, entityType: 'EMPRESA_TRANSPORTISTA', obligatorio: true, diasAnticipacion: 5, plantillaRequisito: { clienteId: 50 } },
      ]);
      db.document.findMany.mockResolvedValue([
        { id: 101, templateId: 1, entityType: 'CHOFER', entityId: 10, tenantEmpresaId: 1, dadorCargaId: 5, status: 'APROBADO', expiresAt: futureDate(90), uploadedAt: new Date() },
        { id: 102, templateId: 2, entityType: 'CAMION', entityId: 20, tenantEmpresaId: 1, dadorCargaId: 5, status: 'APROBADO', expiresAt: futureDate(90), uploadedAt: new Date() },
        { id: 103, templateId: 3, entityType: 'ACOPLADO', entityId: 30, tenantEmpresaId: 1, dadorCargaId: 5, status: 'APROBADO', expiresAt: futureDate(90), uploadedAt: new Date() },
        { id: 104, templateId: 4, entityType: 'EMPRESA_TRANSPORTISTA', entityId: 40, tenantEmpresaId: 1, dadorCargaId: 5, status: 'APROBADO', expiresAt: futureDate(90), uploadedAt: new Date() },
      ]);

      const result = await ComplianceService.evaluateBatchEquiposCliente([eq]);
      const reqs = result.get(1)!.requirements;
      expect(reqs).toHaveLength(4);
      expect(reqs.every((r: any) => r.state === 'VIGENTE')).toBe(true);
    });

    it('batch con multiple clientes para un equipo consolida correctamente', async () => {
      db.equipoCliente.findMany.mockResolvedValue([
        { equipoId: 1, clienteId: 50 },
        { equipoId: 1, clienteId: 51 },
        { equipoId: 1, clienteId: 52 },
      ]);
      db.plantillaRequisitoTemplate.findMany.mockResolvedValue([
        { templateId: 10, entityType: 'CHOFER', obligatorio: false, diasAnticipacion: 5, plantillaRequisito: { clienteId: 50 } },
        { templateId: 10, entityType: 'CHOFER', obligatorio: false, diasAnticipacion: 10, plantillaRequisito: { clienteId: 51 } },
        { templateId: 10, entityType: 'CHOFER', obligatorio: true, diasAnticipacion: 3, plantillaRequisito: { clienteId: 52 } },
      ]);
      db.document.findMany.mockResolvedValue([]);

      const equipos = [makeEquipo({ id: 1 })];
      const result = await ComplianceService.evaluateBatchEquiposCliente(equipos);

      const req = result.get(1)!.requirements[0];
      expect(req.obligatorio).toBe(true);
      expect(req.diasAnticipacion).toBe(10);
    });

    it('consolidateRequirements maneja cliente sin requisitos', async () => {
      db.equipoCliente.findMany.mockResolvedValue([
        { equipoId: 1, clienteId: 50 },
        { equipoId: 1, clienteId: 51 },
      ]);
      db.plantillaRequisitoTemplate.findMany.mockResolvedValue([
        { templateId: 10, entityType: 'CHOFER', obligatorio: true, diasAnticipacion: 5, plantillaRequisito: { clienteId: 50 } },
      ]);
      db.document.findMany.mockResolvedValue([]);

      const equipos = [makeEquipo({ id: 1 })];
      const result = await ComplianceService.evaluateBatchEquiposCliente(equipos);

      expect(result.get(1)!.requirements).toHaveLength(1);
    });

    it('evaluateSingleEquipo sets documentStatus and expiresAt from doc', async () => {
      const expDate = futureDate(60);
      db.equipoCliente.findMany.mockResolvedValue([{ equipoId: 1, clienteId: 50 }]);
      db.plantillaRequisitoTemplate.findMany.mockResolvedValue([{
        templateId: 10, entityType: 'CHOFER', obligatorio: true, diasAnticipacion: 5,
        plantillaRequisito: { clienteId: 50 },
      }]);
      db.document.findMany.mockResolvedValue([{
        id: 70, templateId: 10, entityType: 'CHOFER', entityId: 10,
        tenantEmpresaId: 1, dadorCargaId: 5,
        status: 'APROBADO', expiresAt: expDate,
        uploadedAt: new Date(),
      }]);

      const equipos = [makeEquipo({ id: 1 })];
      const result = await ComplianceService.evaluateBatchEquiposCliente(equipos);

      const req = result.get(1)!.requirements[0];
      expect(req.documentId).toBe(70);
      expect(req.documentStatus).toBe('APROBADO');
      expect(req.expiresAt).toEqual(expDate);
    });

    it('evaluateSingleEquipo expiresAt null when doc has no expiresAt', async () => {
      db.equipoCliente.findMany.mockResolvedValue([{ equipoId: 1, clienteId: 50 }]);
      db.plantillaRequisitoTemplate.findMany.mockResolvedValue([{
        templateId: 10, entityType: 'CHOFER', obligatorio: true, diasAnticipacion: 5,
        plantillaRequisito: { clienteId: 50 },
      }]);
      db.document.findMany.mockResolvedValue([{
        id: 70, templateId: 10, entityType: 'CHOFER', entityId: 10,
        tenantEmpresaId: 1, dadorCargaId: 5,
        status: 'APROBADO', expiresAt: null,
        uploadedAt: new Date(),
      }]);

      const equipos = [makeEquipo({ id: 1 })];
      const result = await ComplianceService.evaluateBatchEquiposCliente(equipos);

      const req = result.get(1)!.requirements[0];
      expect(req.expiresAt).toBeNull();
    });
  });
});
