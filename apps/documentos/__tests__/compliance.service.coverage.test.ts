/**
 * Coverage tests for ComplianceService - cache functions, batch helpers,
 * and evaluateEquipoClienteDetailed with plantillaRequisitoTemplate model.
 * @jest-environment node
 */

jest.mock('../src/config/database', () => {
  const prismaMock: Record<string, any> = {
    equipo: { findUnique: jest.fn(), findMany: jest.fn() },
    plantillaRequisitoTemplate: { findMany: jest.fn() },
    document: { findMany: jest.fn() },
    equipoPlantillaRequisito: { findMany: jest.fn() },
  };
  return { prisma: prismaMock };
});

jest.mock('../src/config/logger', () => ({
  AppLogger: { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

import { prisma } from '../src/config/database';
import { ComplianceService, invalidateComplianceCache } from '../src/services/compliance.service';

// NOSONAR: mock genérico para tests
const db = prisma as any;

describe('ComplianceService (coverage)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    invalidateComplianceCache();
  });

  describe('cache functions', () => {
    it('invalidateComplianceCache(equipoId) limpia solo ese equipo', async () => {
      db.equipo.findUnique.mockResolvedValue({
        id: 1, driverId: 10, truckId: 20, trailerId: 30,
        tenantEmpresaId: 1, dadorCargaId: 5,
      });
      db.plantillaRequisitoTemplate.findMany.mockResolvedValue([]);

      await ComplianceService.evaluateEquipoClienteDetailed(1, 100);

      invalidateComplianceCache(1);

      db.equipo.findUnique.mockResolvedValue(null);
      const result = await ComplianceService.evaluateEquipoClienteDetailed(1, 100);
      expect(result).toEqual([]);
    });

    it('invalidateComplianceCache() limpia todo el cache', async () => {
      db.equipo.findUnique.mockResolvedValue({
        id: 2, driverId: 10, truckId: 20, trailerId: 30,
        tenantEmpresaId: 1, dadorCargaId: 5,
      });
      db.plantillaRequisitoTemplate.findMany.mockResolvedValue([]);

      await ComplianceService.evaluateEquipoClienteDetailed(2, 100);

      invalidateComplianceCache();

      db.equipo.findUnique.mockResolvedValue(null);
      const result = await ComplianceService.evaluateEquipoClienteDetailed(2, 100);
      expect(result).toEqual([]);
    });

    it('usa cache en segunda llamada', async () => {
      db.equipo.findUnique.mockResolvedValue({
        id: 3, driverId: 10, truckId: 20, trailerId: 30,
        tenantEmpresaId: 1, dadorCargaId: 5,
      });
      db.plantillaRequisitoTemplate.findMany.mockResolvedValue([{
        templateId: 1, entityType: 'CHOFER', obligatorio: true, diasAnticipacion: 5,
      }]);
      db.document.findMany.mockResolvedValue([{
        id: 50, templateId: 1, entityType: 'CHOFER', entityId: 10,
        tenantEmpresaId: 1, dadorCargaId: 5,
        status: 'APROBADO', expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
        uploadedAt: new Date(),
      }]);

      const r1 = await ComplianceService.evaluateEquipoClienteDetailed(3, 100);
      const r2 = await ComplianceService.evaluateEquipoClienteDetailed(3, 100);

      expect(r1).toEqual(r2);
      expect(db.equipo.findUnique).toHaveBeenCalledTimes(1);
    });
  });

  describe('evaluateEquipoClienteDetailed', () => {
    it('retorna vacío si equipo no existe', async () => {
      db.equipo.findUnique.mockResolvedValue(null);
      const result = await ComplianceService.evaluateEquipoClienteDetailed(999, 100);
      expect(result).toEqual([]);
    });

    it('retorna vacío si no hay requisitos', async () => {
      db.equipo.findUnique.mockResolvedValue({
        id: 4, driverId: 10, truckId: 20, trailerId: null,
        tenantEmpresaId: 1, dadorCargaId: 5,
      });
      db.plantillaRequisitoTemplate.findMany.mockResolvedValue([]);

      const result = await ComplianceService.evaluateEquipoClienteDetailed(4, 100);
      expect(result).toEqual([]);
    });

    it('marca FALTANTE si no hay entityId', async () => {
      db.equipo.findUnique.mockResolvedValue({
        id: 5, driverId: null, truckId: 20, trailerId: null,
        tenantEmpresaId: 1, dadorCargaId: 5,
      });
      db.plantillaRequisitoTemplate.findMany.mockResolvedValue([{
        templateId: 1, entityType: 'CHOFER', obligatorio: true, diasAnticipacion: 5,
      }]);
      db.document.findMany.mockResolvedValue([]);

      const result = await ComplianceService.evaluateEquipoClienteDetailed(5, 100);

      expect(result[0].state).toBe('FALTANTE');
    });

    it('marca FALTANTE si no hay documento', async () => {
      db.equipo.findUnique.mockResolvedValue({
        id: 6, driverId: 10, truckId: 20, trailerId: null,
        tenantEmpresaId: 1, dadorCargaId: 5,
      });
      db.plantillaRequisitoTemplate.findMany.mockResolvedValue([{
        templateId: 1, entityType: 'CHOFER', obligatorio: true, diasAnticipacion: 5,
      }]);
      db.document.findMany.mockResolvedValue([]);

      const result = await ComplianceService.evaluateEquipoClienteDetailed(6, 100);

      expect(result[0].state).toBe('FALTANTE');
    });

    it('marca VIGENTE para doc aprobado con fecha lejana', async () => {
      db.equipo.findUnique.mockResolvedValue({
        id: 7, driverId: 10, truckId: 20, trailerId: 30,
        tenantEmpresaId: 1, dadorCargaId: 5,
      });
      db.plantillaRequisitoTemplate.findMany.mockResolvedValue([{
        templateId: 2, entityType: 'CHOFER', obligatorio: true, diasAnticipacion: 5,
      }]);
      db.document.findMany.mockResolvedValue([{
        id: 60, templateId: 2, entityType: 'CHOFER', entityId: 10,
        tenantEmpresaId: 1, dadorCargaId: 5,
        status: 'APROBADO', expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
        uploadedAt: new Date(),
      }]);

      const result = await ComplianceService.evaluateEquipoClienteDetailed(7, 100);

      expect(result[0].state).toBe('VIGENTE');
      expect(result[0].documentId).toBe(60);
    });

    it('marca VENCIDO para doc aprobado expirado', async () => {
      db.equipo.findUnique.mockResolvedValue({
        id: 8, driverId: 10, truckId: 20, trailerId: 30,
        tenantEmpresaId: 1, dadorCargaId: 5,
      });
      db.plantillaRequisitoTemplate.findMany.mockResolvedValue([{
        templateId: 3, entityType: 'CHOFER', obligatorio: true, diasAnticipacion: 5,
      }]);
      db.document.findMany.mockResolvedValue([{
        id: 61, templateId: 3, entityType: 'CHOFER', entityId: 10,
        tenantEmpresaId: 1, dadorCargaId: 5,
        status: 'APROBADO', expiresAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        uploadedAt: new Date(),
      }]);

      const result = await ComplianceService.evaluateEquipoClienteDetailed(8, 100);

      expect(result[0].state).toBe('VENCIDO');
    });

    it('marca PROXIMO_VENCER para doc próximo a vencer', async () => {
      db.equipo.findUnique.mockResolvedValue({
        id: 9, driverId: 10, truckId: 20, trailerId: 30,
        tenantEmpresaId: 1, dadorCargaId: 5,
      });
      db.plantillaRequisitoTemplate.findMany.mockResolvedValue([{
        templateId: 4, entityType: 'CHOFER', obligatorio: true, diasAnticipacion: 10,
      }]);
      db.document.findMany.mockResolvedValue([{
        id: 62, templateId: 4, entityType: 'CHOFER', entityId: 10,
        tenantEmpresaId: 1, dadorCargaId: 5,
        status: 'APROBADO', expiresAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
        uploadedAt: new Date(),
      }]);

      const result = await ComplianceService.evaluateEquipoClienteDetailed(9, 100);

      expect(result[0].state).toBe('PROXIMO');
    });

    it('marca PENDIENTE para doc pendiente', async () => {
      db.equipo.findUnique.mockResolvedValue({
        id: 10, driverId: 10, truckId: 20, trailerId: 30,
        tenantEmpresaId: 1, dadorCargaId: 5,
      });
      db.plantillaRequisitoTemplate.findMany.mockResolvedValue([{
        templateId: 5, entityType: 'CHOFER', obligatorio: true, diasAnticipacion: 5,
      }]);
      db.document.findMany.mockResolvedValue([{
        id: 63, templateId: 5, entityType: 'CHOFER', entityId: 10,
        tenantEmpresaId: 1, dadorCargaId: 5,
        status: 'PENDIENTE', expiresAt: null,
        uploadedAt: new Date(),
      }]);

      const result = await ComplianceService.evaluateEquipoClienteDetailed(10, 100);

      expect(result[0].state).toBe('PENDIENTE');
    });

    it('evalúa múltiples entity types (CHOFER, CAMION, ACOPLADO)', async () => {
      db.equipo.findUnique.mockResolvedValue({
        id: 11, driverId: 10, truckId: 20, trailerId: 30,
        tenantEmpresaId: 1, dadorCargaId: 5,
      });
      db.plantillaRequisitoTemplate.findMany.mockResolvedValue([
        { templateId: 1, entityType: 'CHOFER', obligatorio: true, diasAnticipacion: 5 },
        { templateId: 2, entityType: 'CAMION', obligatorio: true, diasAnticipacion: 5 },
        { templateId: 3, entityType: 'ACOPLADO', obligatorio: false, diasAnticipacion: 5 },
      ]);
      db.document.findMany.mockResolvedValue([]);

      const result = await ComplianceService.evaluateEquipoClienteDetailed(11, 100);

      expect(result).toHaveLength(3);
      expect(result.every((r: any) => r.state === 'FALTANTE')).toBe(true);
    });
  });
});
