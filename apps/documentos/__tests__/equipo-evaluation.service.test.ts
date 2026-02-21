/**
 * Tests unitarios para EquipoEvaluationService (métodos con DB)
 * @jest-environment node
 */

jest.mock('../src/config/database', () => {
  const prismaMock: Record<string, any> = {
    equipo: { findUnique: jest.fn(), findMany: jest.fn(), update: jest.fn() },
    equipoPlantillaRequisito: { findMany: jest.fn() },
    plantillaRequisitoTemplate: { findMany: jest.fn() },
    documentTemplate: { findMany: jest.fn() },
    empresaTransportista: { findUnique: jest.fn() },
    document: { findUnique: jest.fn(), findMany: jest.fn() },
  };
  return { prisma: prismaMock };
});

jest.mock('../src/config/logger', () => ({
  AppLogger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

import { EquipoEvaluationService } from '../src/services/equipo-evaluation.service';
import { prisma as prismaClient } from '../src/config/database';

// NOSONAR: mock tipado genérico para tests
const prisma = prismaClient as any;

describe('EquipoEvaluationService', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('evaluarEquipo', () => {
    it('retorna null si equipo no existe', async () => {
      prisma.equipo.findUnique.mockResolvedValue(null);
      const result = await EquipoEvaluationService.evaluarEquipo(999);
      expect(result).toBeNull();
    });

    it('retorna null si datos del equipo son incompletos', async () => {
      prisma.equipo.findUnique
        .mockResolvedValueOnce({ estadoDocumental: 'DOCUMENTACION_INCOMPLETA' })
        .mockResolvedValueOnce(null);

      const result = await EquipoEvaluationService.evaluarEquipo(1);
      expect(result).toBeNull();
    });

    it('evalúa equipo COMPLETO cuando documentos vigentes cubren requisitos', async () => {
      prisma.equipo.findUnique
        .mockResolvedValueOnce({ estadoDocumental: 'DOCUMENTACION_INCOMPLETA' })
        .mockResolvedValueOnce({
          dadorCargaId: 1,
          tenantEmpresaId: 1,
          driverId: 10,
          truckId: 20,
          trailerId: null,
          empresaTransportistaId: null,
          driverDniNorm: '12345678',
          truckPlateNorm: 'ABC123',
          trailerPlateNorm: null,
        });

      prisma.equipoPlantillaRequisito.findMany.mockResolvedValue([
        { plantillaRequisitoId: 1 },
      ]);
      prisma.plantillaRequisitoTemplate.findMany.mockResolvedValue([
        { templateId: 100, entityType: 'CHOFER', diasAnticipacion: 30 },
      ]);

      const futureDate = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);
      prisma.document.findMany.mockResolvedValue([
        {
          id: 1,
          entityType: 'CHOFER',
          entityId: 10,
          templateId: 100,
          status: 'APROBADO',
          expiresAt: futureDate,
          uploadedAt: new Date(),
        },
      ]);

      prisma.equipo.update.mockResolvedValue({});

      const result = await EquipoEvaluationService.evaluarEquipo(1);
      expect(result).not.toBeNull();
      expect(result!.estadoNuevo).toBe('COMPLETO');
      expect(result!.cambio).toBe(true);
    });

    it('evalúa equipo con DOCUMENTACION_VENCIDA cuando hay documento vencido', async () => {
      prisma.equipo.findUnique
        .mockResolvedValueOnce({ estadoDocumental: 'COMPLETO' })
        .mockResolvedValueOnce({
          dadorCargaId: 1,
          tenantEmpresaId: 1,
          driverId: 10,
          truckId: 20,
          trailerId: null,
          empresaTransportistaId: null,
          driverDniNorm: '12345678',
          truckPlateNorm: 'ABC123',
          trailerPlateNorm: null,
        });

      prisma.equipoPlantillaRequisito.findMany.mockResolvedValue([]);
      prisma.documentTemplate.findMany
        .mockResolvedValueOnce([{ id: 100 }])
        .mockResolvedValueOnce([{ id: 200 }]);

      const pastDate = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);
      prisma.document.findMany.mockResolvedValue([
        {
          id: 1,
          entityType: 'CHOFER',
          entityId: 10,
          templateId: 100,
          status: 'APROBADO',
          expiresAt: pastDate,
          uploadedAt: new Date(),
        },
      ]);

      prisma.equipo.update.mockResolvedValue({});

      const result = await EquipoEvaluationService.evaluarEquipo(1);
      expect(result).not.toBeNull();
      expect(result!.estadoNuevo).toBe('DOCUMENTACION_VENCIDA');
    });

    it('no actualiza estado cuando no hay cambio', async () => {
      prisma.equipo.findUnique
        .mockResolvedValueOnce({ estadoDocumental: 'DOCUMENTACION_INCOMPLETA' })
        .mockResolvedValueOnce({
          dadorCargaId: 1,
          tenantEmpresaId: 1,
          driverId: 10,
          truckId: null,
          trailerId: null,
          empresaTransportistaId: null,
          driverDniNorm: '12345678',
          truckPlateNorm: '',
          trailerPlateNorm: null,
        });

      prisma.equipoPlantillaRequisito.findMany.mockResolvedValue([]);
      prisma.documentTemplate.findMany.mockResolvedValue([{ id: 100 }]);
      prisma.document.findMany.mockResolvedValue([]);
      prisma.equipo.update.mockResolvedValue({});

      const result = await EquipoEvaluationService.evaluarEquipo(1);
      expect(result).not.toBeNull();
      expect(result!.cambio).toBe(false);
    });
  });

  describe('evaluarEquipos', () => {
    it('evalúa batch de equipos con concurrencia', async () => {
      prisma.equipo.findUnique.mockResolvedValue(null);
      const result = await EquipoEvaluationService.evaluarEquipos([1, 2, 3]);
      expect(result).toEqual([]);
    });
  });

  describe('reevaluarPorDocumento', () => {
    it('retorna vacío cuando documento no existe', async () => {
      prisma.document.findUnique.mockResolvedValue(null);
      const result = await EquipoEvaluationService.reevaluarPorDocumento(999);
      expect(result).toEqual([]);
    });

    it('busca y re-evalúa equipos por entidad del documento', async () => {
      prisma.document.findUnique.mockResolvedValue({
        entityType: 'CHOFER',
        entityId: 10,
        tenantEmpresaId: 1,
        dadorCargaId: 1,
      });
      prisma.equipo.findMany.mockResolvedValue([]);

      const result = await EquipoEvaluationService.reevaluarPorDocumento(1);
      expect(result).toEqual([]);
    });
  });

  describe('buscarEquiposPorEntidad', () => {
    it('busca equipos con CHOFER', async () => {
      prisma.equipo.findMany.mockResolvedValue([{ id: 1 }]);
      const result = await EquipoEvaluationService.buscarEquiposPorEntidad(1, 1, 'CHOFER', 10);
      expect(prisma.equipo.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ driverId: 10 }),
        }),
      );
      expect(result).toHaveLength(1);
    });

    it('busca equipos con CAMION', async () => {
      prisma.equipo.findMany.mockResolvedValue([]);
      await EquipoEvaluationService.buscarEquiposPorEntidad(1, 1, 'CAMION', 20);
      expect(prisma.equipo.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ truckId: 20 }),
        }),
      );
    });

    it('busca equipos con ACOPLADO', async () => {
      prisma.equipo.findMany.mockResolvedValue([]);
      await EquipoEvaluationService.buscarEquiposPorEntidad(1, 1, 'ACOPLADO', 30);
      expect(prisma.equipo.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ trailerId: 30 }),
        }),
      );
    });

    it('busca equipos con EMPRESA_TRANSPORTISTA', async () => {
      prisma.equipo.findMany.mockResolvedValue([]);
      await EquipoEvaluationService.buscarEquiposPorEntidad(1, 1, 'EMPRESA_TRANSPORTISTA', 40);
      expect(prisma.equipo.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ empresaTransportistaId: 40 }),
        }),
      );
    });

    it('retorna vacío para DADOR', async () => {
      const result = await EquipoEvaluationService.buscarEquiposPorEntidad(1, 1, 'DADOR', 1);
      expect(result).toEqual([]);
    });
  });

  describe('evaluarTodosEquipos', () => {
    it('evalúa todos los equipos activos de un tenant', async () => {
      prisma.equipo.findMany.mockResolvedValue([{ id: 1 }]);
      prisma.equipo.findUnique.mockResolvedValue(null);

      const result = await EquipoEvaluationService.evaluarTodosEquipos(1);
      expect(result.evaluados).toBe(1);
      expect(result.actualizados).toBe(0);
    });
  });
});
