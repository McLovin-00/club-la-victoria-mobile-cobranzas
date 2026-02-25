/**
 * Coverage tests for EquipoEvaluationService – clasificarDocumento,
 * determinarEstadoDocumental, evaluarEquipo (all branches),
 * evaluarEquipos, reevaluarPorDocumento, buscarEquiposPorEntidad,
 * evaluarTodosEquipos, and private helpers (obtenerEntidadesEquipo,
 * obtenerTemplatesRequeridos, contarDocumentos).
 * @jest-environment node
 */

const mockPrisma: any = {
  equipo: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
  },
  empresaTransportista: {
    findUnique: jest.fn(),
  },
  equipoPlantillaRequisito: {
    findMany: jest.fn(),
  },
  plantillaRequisitoTemplate: {
    findMany: jest.fn(),
  },
  documentTemplate: {
    findMany: jest.fn(),
  },
  document: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
  },
};

jest.mock('../src/config/database', () => ({ prisma: mockPrisma }));

jest.mock('../src/config/logger', () => ({
  AppLogger: { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

import {
  EquipoEvaluationService,
  clasificarDocumento,
  determinarEstadoDocumental,
} from '../src/services/equipo-evaluation.service';

function makeStats(overrides: Partial<Record<string, number>> = {}) {
  return {
    vigentes: 0,
    porVencer: 0,
    vencidos: 0,
    pendientes: 0,
    rechazados: 0,
    faltantes: 0,
    ...overrides,
  };
}

describe('EquipoEvaluationService (coverage)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ==========================================================================
  // clasificarDocumento
  // ==========================================================================
  describe('clasificarDocumento', () => {
    const now = new Date();
    const future30 = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    it('counts RECHAZADO', () => {
      const stats = { vigentes: 0, porVencer: 0, vencidos: 0, pendientes: 0, rechazados: 0 };
      clasificarDocumento({ status: 'RECHAZADO', expiresAt: null }, now, future30, stats);
      expect(stats.rechazados).toBe(1);
    });

    it('counts VENCIDO by status', () => {
      const stats = { vigentes: 0, porVencer: 0, vencidos: 0, pendientes: 0, rechazados: 0 };
      clasificarDocumento({ status: 'VENCIDO', expiresAt: null }, now, future30, stats);
      expect(stats.vencidos).toBe(1);
    });

    it('counts vencido by expired date', () => {
      const stats = { vigentes: 0, porVencer: 0, vencidos: 0, pendientes: 0, rechazados: 0 };
      const pastDate = new Date(now.getTime() - 1000);
      clasificarDocumento({ status: 'APROBADO', expiresAt: pastDate }, now, future30, stats);
      expect(stats.vencidos).toBe(1);
    });

    it('counts PENDIENTE for pending statuses', () => {
      const stats = { vigentes: 0, porVencer: 0, vencidos: 0, pendientes: 0, rechazados: 0 };
      clasificarDocumento({ status: 'PENDIENTE', expiresAt: null }, now, future30, stats);
      expect(stats.pendientes).toBe(1);
    });

    it('counts PENDIENTE_APROBACION', () => {
      const stats = { vigentes: 0, porVencer: 0, vencidos: 0, pendientes: 0, rechazados: 0 };
      clasificarDocumento({ status: 'PENDIENTE_APROBACION', expiresAt: null }, now, future30, stats);
      expect(stats.pendientes).toBe(1);
    });

    it('counts VALIDANDO', () => {
      const stats = { vigentes: 0, porVencer: 0, vencidos: 0, pendientes: 0, rechazados: 0 };
      clasificarDocumento({ status: 'VALIDANDO', expiresAt: null }, now, future30, stats);
      expect(stats.pendientes).toBe(1);
    });

    it('counts CLASIFICANDO', () => {
      const stats = { vigentes: 0, porVencer: 0, vencidos: 0, pendientes: 0, rechazados: 0 };
      clasificarDocumento({ status: 'CLASIFICANDO', expiresAt: null }, now, future30, stats);
      expect(stats.pendientes).toBe(1);
    });

    it('counts APROBADO por vencer', () => {
      const stats = { vigentes: 0, porVencer: 0, vencidos: 0, pendientes: 0, rechazados: 0 };
      const soonDate = new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000);
      clasificarDocumento({ status: 'APROBADO', expiresAt: soonDate }, now, future30, stats);
      expect(stats.porVencer).toBe(1);
    });

    it('counts APROBADO vigente (no expiry)', () => {
      const stats = { vigentes: 0, porVencer: 0, vencidos: 0, pendientes: 0, rechazados: 0 };
      clasificarDocumento({ status: 'APROBADO', expiresAt: null }, now, future30, stats);
      expect(stats.vigentes).toBe(1);
    });

    it('counts APROBADO vigente (far future expiry)', () => {
      const stats = { vigentes: 0, porVencer: 0, vencidos: 0, pendientes: 0, rechazados: 0 };
      const farFuture = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
      clasificarDocumento({ status: 'APROBADO', expiresAt: farFuture }, now, future30, stats);
      expect(stats.vigentes).toBe(1);
    });

    it('ignores unknown status', () => {
      const stats = { vigentes: 0, porVencer: 0, vencidos: 0, pendientes: 0, rechazados: 0 };
      clasificarDocumento({ status: 'UNKNOWN', expiresAt: null }, now, future30, stats);
      expect(stats).toEqual({ vigentes: 0, porVencer: 0, vencidos: 0, pendientes: 0, rechazados: 0 });
    });
  });

  // ==========================================================================
  // determinarEstadoDocumental
  // ==========================================================================
  describe('determinarEstadoDocumental', () => {
    it('returns DOCUMENTACION_VENCIDA when vencidos > 0', () => {
      expect(determinarEstadoDocumental(makeStats({ vencidos: 1 }))).toBe('DOCUMENTACION_VENCIDA');
    });

    it('returns DOCUMENTACION_INCOMPLETA when faltantes > 0', () => {
      expect(determinarEstadoDocumental(makeStats({ faltantes: 1 }))).toBe('DOCUMENTACION_INCOMPLETA');
    });

    it('returns DOCUMENTACION_INCOMPLETA when rechazados > 0', () => {
      expect(determinarEstadoDocumental(makeStats({ rechazados: 1 }))).toBe('DOCUMENTACION_INCOMPLETA');
    });

    it('returns PENDIENTE_VALIDACION when pendientes > 0', () => {
      expect(determinarEstadoDocumental(makeStats({ pendientes: 1 }))).toBe('PENDIENTE_VALIDACION');
    });

    it('returns DOCUMENTACION_POR_VENCER when porVencer > 0', () => {
      expect(determinarEstadoDocumental(makeStats({ porVencer: 1 }))).toBe('DOCUMENTACION_POR_VENCER');
    });

    it('returns COMPLETO when all vigentes', () => {
      expect(determinarEstadoDocumental(makeStats({ vigentes: 5 }))).toBe('COMPLETO');
    });

    it('returns DOCUMENTACION_INCOMPLETA when no docs at all', () => {
      expect(determinarEstadoDocumental(makeStats())).toBe('DOCUMENTACION_INCOMPLETA');
    });

    it('vencidos takes priority over other states', () => {
      expect(determinarEstadoDocumental(makeStats({ vencidos: 1, faltantes: 1, pendientes: 1, vigentes: 5 }))).toBe('DOCUMENTACION_VENCIDA');
    });
  });

  // ==========================================================================
  // evaluarEquipo
  // ==========================================================================
  describe('evaluarEquipo', () => {
    it('returns null when equipo not found (first check)', async () => {
      mockPrisma.equipo.findUnique.mockResolvedValue(null);

      const result = await EquipoEvaluationService.evaluarEquipo(999);

      expect(result).toBeNull();
    });

    it('returns null when obtenerEntidadesEquipo returns null', async () => {
      mockPrisma.equipo.findUnique
        .mockResolvedValueOnce({ estadoDocumental: 'COMPLETO' })
        .mockResolvedValueOnce(null); // second call from obtenerEntidadesEquipo

      const result = await EquipoEvaluationService.evaluarEquipo(1);

      expect(result).toBeNull();
    });

    it('evaluates equipo with state change', async () => {
      // findUnique for current state
      mockPrisma.equipo.findUnique
        .mockResolvedValueOnce({ estadoDocumental: 'COMPLETO' })
        // findUnique from obtenerEntidadesEquipo
        .mockResolvedValueOnce({
          dadorCargaId: 5,
          tenantEmpresaId: 1,
          driverId: 10,
          truckId: 20,
          trailerId: null,
          empresaTransportistaId: null,
          driverDniNorm: '12345',
          truckPlateNorm: 'AB123',
          trailerPlateNorm: null,
        });

      // obtenerTemplatesRequeridos: no plantillas assigned, falls back to global templates
      mockPrisma.equipoPlantillaRequisito.findMany.mockResolvedValue([]);
      mockPrisma.documentTemplate.findMany
        .mockResolvedValueOnce([{ id: 1 }]) // CHOFER templates
        .mockResolvedValueOnce([{ id: 2 }]); // CAMION templates

      // contarDocumentos: no docs => all faltantes
      mockPrisma.document.findMany.mockResolvedValue([]);

      mockPrisma.equipo.update.mockResolvedValue({});

      const result = await EquipoEvaluationService.evaluarEquipo(1);

      expect(result).toBeDefined();
      expect(result!.cambio).toBe(true);
      expect(result!.estadoNuevo).toBe('DOCUMENTACION_INCOMPLETA');
    });

    it('evaluates equipo without state change (only updates timestamp)', async () => {
      mockPrisma.equipo.findUnique
        .mockResolvedValueOnce({ estadoDocumental: 'DOCUMENTACION_INCOMPLETA' })
        .mockResolvedValueOnce({
          dadorCargaId: 5,
          tenantEmpresaId: 1,
          driverId: null,
          truckId: null,
          trailerId: null,
          empresaTransportistaId: null,
          driverDniNorm: '',
          truckPlateNorm: '',
          trailerPlateNorm: '',
        });

      mockPrisma.equipoPlantillaRequisito.findMany.mockResolvedValue([]);
      mockPrisma.document.findMany.mockResolvedValue([]);
      mockPrisma.equipo.update.mockResolvedValue({});

      const result = await EquipoEvaluationService.evaluarEquipo(2);

      expect(result).toBeDefined();
      expect(result!.cambio).toBe(false);
    });

    it('includes empresaTransportista entity when present', async () => {
      mockPrisma.equipo.findUnique
        .mockResolvedValueOnce({ estadoDocumental: 'COMPLETO' })
        .mockResolvedValueOnce({
          dadorCargaId: 5,
          tenantEmpresaId: 1,
          driverId: 10,
          truckId: null,
          trailerId: 30,
          empresaTransportistaId: 40,
          driverDniNorm: '12345',
          truckPlateNorm: '',
          trailerPlateNorm: 'TR001',
        });

      mockPrisma.empresaTransportista.findUnique.mockResolvedValue({ cuit: '30-12345678-9' });

      // With plantillas assigned
      mockPrisma.equipoPlantillaRequisito.findMany.mockResolvedValue([
        { plantillaRequisitoId: 100 },
      ]);
      mockPrisma.plantillaRequisitoTemplate.findMany.mockResolvedValue([
        { templateId: 1, entityType: 'CHOFER', diasAnticipacion: 60 },
        { templateId: 2, entityType: 'EMPRESA_TRANSPORTISTA', diasAnticipacion: 30 },
      ]);

      mockPrisma.document.findMany.mockResolvedValue([]);
      mockPrisma.equipo.update.mockResolvedValue({});

      const result = await EquipoEvaluationService.evaluarEquipo(3);

      expect(result).toBeDefined();
      expect(result!.detalles.entidadesEvaluadas.length).toBe(3); // CHOFER, ACOPLADO, EMPRESA_TRANSPORTISTA
    });

    it('skips empresaTransportista when not found in DB', async () => {
      mockPrisma.equipo.findUnique
        .mockResolvedValueOnce({ estadoDocumental: 'COMPLETO' })
        .mockResolvedValueOnce({
          dadorCargaId: 5,
          tenantEmpresaId: 1,
          driverId: null,
          truckId: null,
          trailerId: null,
          empresaTransportistaId: 99,
          driverDniNorm: '',
          truckPlateNorm: '',
          trailerPlateNorm: '',
        });

      mockPrisma.empresaTransportista.findUnique.mockResolvedValue(null);

      mockPrisma.equipoPlantillaRequisito.findMany.mockResolvedValue([]);
      mockPrisma.document.findMany.mockResolvedValue([]);
      mockPrisma.equipo.update.mockResolvedValue({});

      const result = await EquipoEvaluationService.evaluarEquipo(4);

      expect(result).toBeDefined();
      expect(result!.detalles.entidadesEvaluadas.length).toBe(0);
    });
  });

  // ==========================================================================
  // evaluarEquipos (batch)
  // ==========================================================================
  describe('evaluarEquipos', () => {
    it('evaluates batch of equipos with concurrency', async () => {
      mockPrisma.equipo.findUnique.mockResolvedValue(null);

      const results = await EquipoEvaluationService.evaluarEquipos([1, 2, 3, 4, 5, 6]);

      expect(results).toEqual([]);
    });

    it('collects fulfilled results and ignores null/rejected', async () => {
      // All equipos not found => all evaluarEquipo return null => filtered out
      mockPrisma.equipo.findUnique.mockResolvedValue(null);

      const results = await EquipoEvaluationService.evaluarEquipos([1, 2, 3]);

      expect(results.length).toBe(0);
    });
  });

  // ==========================================================================
  // reevaluarPorDocumento
  // ==========================================================================
  describe('reevaluarPorDocumento', () => {
    it('returns empty when document not found', async () => {
      mockPrisma.document.findUnique.mockResolvedValue(null);

      const results = await EquipoEvaluationService.reevaluarPorDocumento(999);

      expect(results).toEqual([]);
    });

    it('evaluates equipos affected by document', async () => {
      mockPrisma.document.findUnique.mockResolvedValue({
        entityType: 'CHOFER',
        entityId: 10,
        tenantEmpresaId: 1,
        dadorCargaId: 5,
      });

      mockPrisma.equipo.findMany.mockResolvedValue([{ id: 1 }]);
      mockPrisma.equipo.findUnique.mockResolvedValue(null);

      const results = await EquipoEvaluationService.reevaluarPorDocumento(1);

      expect(results).toEqual([]);
    });
  });

  // ==========================================================================
  // buscarEquiposPorEntidad
  // ==========================================================================
  describe('buscarEquiposPorEntidad', () => {
    it('queries by driverId for CHOFER', async () => {
      mockPrisma.equipo.findMany.mockResolvedValue([{ id: 1 }]);

      const result = await EquipoEvaluationService.buscarEquiposPorEntidad(1, 5, 'CHOFER', 10);

      expect(mockPrisma.equipo.findMany).toHaveBeenCalledWith({
        where: expect.objectContaining({ driverId: 10 }),
        select: { id: true },
      });
      expect(result).toEqual([{ id: 1 }]);
    });

    it('queries by truckId for CAMION', async () => {
      mockPrisma.equipo.findMany.mockResolvedValue([]);

      await EquipoEvaluationService.buscarEquiposPorEntidad(1, 5, 'CAMION', 20);

      expect(mockPrisma.equipo.findMany).toHaveBeenCalledWith({
        where: expect.objectContaining({ truckId: 20 }),
        select: { id: true },
      });
    });

    it('queries by trailerId for ACOPLADO', async () => {
      mockPrisma.equipo.findMany.mockResolvedValue([]);

      await EquipoEvaluationService.buscarEquiposPorEntidad(1, 5, 'ACOPLADO', 30);

      expect(mockPrisma.equipo.findMany).toHaveBeenCalledWith({
        where: expect.objectContaining({ trailerId: 30 }),
        select: { id: true },
      });
    });

    it('queries by empresaTransportistaId for EMPRESA_TRANSPORTISTA', async () => {
      mockPrisma.equipo.findMany.mockResolvedValue([]);

      await EquipoEvaluationService.buscarEquiposPorEntidad(1, 5, 'EMPRESA_TRANSPORTISTA', 40);

      expect(mockPrisma.equipo.findMany).toHaveBeenCalledWith({
        where: expect.objectContaining({ empresaTransportistaId: 40 }),
        select: { id: true },
      });
    });

    it('returns empty for unknown entity type', async () => {
      // NOSONAR: using 'as any' to test default branch
      const result = await EquipoEvaluationService.buscarEquiposPorEntidad(1, 5, 'DADOR' as any, 50);

      expect(result).toEqual([]);
      expect(mockPrisma.equipo.findMany).not.toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // evaluarTodosEquipos
  // ==========================================================================
  describe('evaluarTodosEquipos', () => {
    it('evaluates all active equipos of a tenant', async () => {
      mockPrisma.equipo.findMany.mockResolvedValue([{ id: 1 }, { id: 2 }]);
      mockPrisma.equipo.findUnique.mockResolvedValue(null);

      const result = await EquipoEvaluationService.evaluarTodosEquipos(1);

      expect(result).toEqual({ evaluados: 2, actualizados: 0 });
    });
  });
});
