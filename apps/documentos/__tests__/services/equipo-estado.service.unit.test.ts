import { prismaMock, resetPrismaMock } from '../mocks/prisma.mock';

jest.mock('../../src/config/database', () => ({
  prisma: prismaMock,
}));

jest.mock('../../src/services/compliance.service', () => ({
  ComplianceService: {
    evaluateEquipoClienteDetailed: jest.fn(),
  },
}));

import { EquipoEstadoService } from '../../src/services/equipo-estado.service';
import { ComplianceService } from '../../src/services/compliance.service';

describe('EquipoEstadoService', () => {
  beforeEach(() => {
    resetPrismaMock();
    jest.clearAllMocks();
  });

  describe('calculateEquipoEstado', () => {
    it('should return gris with empty breakdown when equipo not found', async () => {
      prismaMock.equipo.findUnique.mockResolvedValueOnce(null);

      const result = await EquipoEstadoService.calculateEquipoEstado(999);

      expect(result).toEqual({
        equipoId: 999,
        clienteId: undefined,
        estado: 'gris',
        breakdown: {
          faltantes: 0,
          proximos: 0,
          vigentes: 0,
          pendientes: 0,
          rechazados: 0,
          vencidos: 0,
          sinRequisitos: true,
        },
      });
    });

    it('should calculate estado with clienteId compliance', async () => {
      const mockEquipo = {
        id: 1,
        tenantEmpresaId: 1,
        dadorCargaId: 2,
        driverId: 10,
        truckId: 20,
        trailerId: null,
      };

      prismaMock.equipo.findUnique.mockResolvedValueOnce(mockEquipo as any);

      // Mock compliance for cliente
      (ComplianceService.evaluateEquipoClienteDetailed as jest.Mock).mockResolvedValueOnce([
        { state: 'VIGENTE', templateId: 1 },
        { state: 'PROXIMO', templateId: 2 },
      ] as any);

      // Mock document statuses
      prismaMock.document.findMany.mockResolvedValueOnce([
        { status: 'APROBADO', expiresAt: new Date(Date.now() + 86400000) },
        { status: 'PENDIENTE', expiresAt: null },
      ] as any);

      const result = await EquipoEstadoService.calculateEquipoEstado(1, 5);

      expect(ComplianceService.evaluateEquipoClienteDetailed).toHaveBeenCalledWith(1, 5);
      expect(result.estado).toBe('amarillo'); // proximos > 0
      expect(result.breakdown.proximos).toBe(1);
    });

    it('should calculate estado without clienteId', async () => {
      const mockEquipo = {
        id: 1,
        tenantEmpresaId: 1,
        dadorCargaId: 2,
        driverId: 10,
        truckId: 20,
        trailerId: 30,
      };

      prismaMock.equipo.findUnique.mockResolvedValueOnce(mockEquipo as any);

      // Mock document statuses
      prismaMock.document.findMany.mockResolvedValueOnce([
        { status: 'VIGENTE', expiresAt: new Date(Date.now() + 86400000) },
        { status: 'APROBADO', expiresAt: new Date(Date.now() + 86400000) },
        { status: 'PENDIENTE', expiresAt: null },
      ] as any);

      const result = await EquipoEstadoService.calculateEquipoEstado(1);

      expect(ComplianceService.evaluateEquipoClienteDetailed).not.toHaveBeenCalled();
      // La lógica actual devuelve 'azul' cuando hay pendientes y no hay problemas críticos
      expect(result.estado).toBe('azul');
    });
  });

  // FIXME: determineSemaforo, countDocumentStatuses, calculateClienteCompliance are private functions
  // To test these, we should test the public behavior through calculateEquipoEstado instead
  /*
  describe('determineSemaforo', () => {
    const determineSemaforo = (EquipoEstadoService as any).determineSemaforo;

    it('should return rojo when faltantes > 0', () => {
      const breakdown = {
        faltantes: 1,
        proximos: 0,
        vigentes: 0,
        pendientes: 0,
        rechazados: 0,
        vencidos: 0,
      };

      expect(determineSemaforo(breakdown)).toBe('rojo');
    });

    it('should return rojo when vencidos > 0', () => {
      const breakdown = {
        faltantes: 0,
        proximos: 0,
        vigentes: 0,
        pendientes: 0,
        rechazados: 0,
        vencidos: 1,
      };

      expect(determineSemaforo(breakdown)).toBe('rojo');
    });

    it('should return rojo when rechazados > 0', () => {
      const breakdown = {
        faltantes: 0,
        proximos: 0,
        vigentes: 0,
        pendientes: 0,
        rechazados: 1,
        vencidos: 0,
      };

      expect(determineSemaforo(breakdown)).toBe('rojo');
    });

    it('should return rojo_azul when rojo conditions + pendientes > 0', () => {
      const breakdown = {
        faltantes: 1,
        proximos: 0,
        vigentes: 0,
        pendientes: 1,
        rechazados: 0,
        vencidos: 0,
      };

      expect(determineSemaforo(breakdown)).toBe('rojo_azul');
    });

    it('should return amarillo when proximos > 0 and no rojo conditions', () => {
      const breakdown = {
        faltantes: 0,
        proximos: 1,
        vigentes: 0,
        pendientes: 0,
        rechazados: 0,
        vencidos: 0,
      };

      expect(determineSemaforo(breakdown)).toBe('amarillo');
    });

    it('should return verde when vigentes > 0 and no critical issues', () => {
      const breakdown = {
        faltantes: 0,
        proximos: 0,
        vigentes: 1,
        pendientes: 0,
        rechazados: 0,
        vencidos: 0,
      };

      expect(determineSemaforo(breakdown)).toBe('verde');
    });

    it('should return azul when only pendientes > 0', () => {
      const breakdown = {
        faltantes: 0,
        proximos: 0,
        vigentes: 0,
        pendientes: 1,
        rechazados: 0,
        vencidos: 0,
      };

      expect(determineSemaforo(breakdown)).toBe('azul');
    });

    it('should return gris when all zeros', () => {
      const breakdown = {
        faltantes: 0,
        proximos: 0,
        vigentes: 0,
        pendientes: 0,
        rechazados: 0,
        vencidos: 0,
      };

      expect(determineSemaforo(breakdown)).toBe('gris');
    });
  });

  describe('countDocumentStatuses', () => {
    const countDocumentStatuses = (EquipoEstadoService as any).countDocumentStatuses;

    it('should return zeros when no entities', async () => {
      const equipo = {
        tenantEmpresaId: 1,
        dadorCargaId: 2,
        driverId: null,
        truckId: null,
        trailerId: null,
      };

      prismaMock.document.findMany.mockResolvedValueOnce([]);

      const result = await countDocumentStatuses(equipo);

      expect(result).toEqual({
        pendientes: 0,
        rechazados: 0,
        vencidos: 0,
      });
    });

    it('should count all document statuses correctly', async () => {
      const equipo = {
        tenantEmpresaId: 1,
        dadorCargaId: 2,
        driverId: 10,
        truckId: 20,
        trailerId: 30,
      };

      prismaMock.document.findMany.mockResolvedValueOnce([
        { status: 'RECHAZADO', expiresAt: null },
        { status: 'PENDIENTE', expiresAt: null },
        { status: 'PENDIENTE_APROBACION', expiresAt: null },
        { status: 'VALIDANDO', expiresAt: null },
        { status: 'CLASIFICANDO', expiresAt: null },
        { status: 'APROBADO', expiresAt: new Date('2020-01-01') }, // expired
        { status: 'APROBADO', expiresAt: new Date(Date.now() + 86400000) }, // not expired
      ] as any);

      const result = await countDocumentStatuses(equipo);

      expect(result.pendientes).toBe(4); // PENDIENTE, PENDIENTE_APROBACION, VALIDANDO, CLASIFICANDO
      expect(result.rechazados).toBe(1);
      expect(result.vencidos).toBe(1);
    });

    it('should only query for entities that exist', async () => {
      const equipo = {
        tenantEmpresaId: 1,
        dadorCargaId: 2,
        driverId: 10,
        truckId: null,
        trailerId: null,
      };

      prismaMock.document.findMany.mockResolvedValueOnce([]);

      await countDocumentStatuses(equipo);

      expect(prismaMock.document.findMany).toHaveBeenCalledWith({
        where: {
          tenantEmpresaId: 1,
          dadorCargaId: 2,
          OR: [{ entityType: 'CHOFER', entityId: 10 }],
        },
        select: { status: true, expiresAt: true },
      });
    });
  });

  describe('calculateClienteCompliance', () => {
    const calculateClienteCompliance = (EquipoEstadoService as any).calculateClienteCompliance;

    it('should return sinRequisitos true when no requirements', async () => {
      (ComplianceService.evaluateEquipoClienteDetailed as jest.Mock).mockResolvedValueOnce([]);

      const result = await calculateClienteCompliance(1, 2);

      expect(result).toEqual({
        faltantes: 0,
        proximos: 0,
        vigentes: 0,
        sinRequisitos: true,
      });
    });

    it('should count states correctly', async () => {
      (ComplianceService.evaluateEquipoClienteDetailed as jest.Mock).mockResolvedValueOnce([
        { state: 'FALTANTE' },
        { state: 'FALTANTE' },
        { state: 'PROXIMO' },
        { state: 'VIGENTE' },
        { state: 'VIGENTE' },
        { state: 'VIGENTE' },
      ] as any);

      const result = await calculateClienteCompliance(1, 2);

      expect(result).toEqual({
        faltantes: 2,
        proximos: 1,
        vigentes: 3,
        sinRequisitos: false,
      });
    });
  });
  */
});
