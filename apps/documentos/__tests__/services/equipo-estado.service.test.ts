/**
 * Tests unitarios para EquipoEstadoService
 */
import { prismaMock, resetPrismaMock } from '../mocks/prisma.mock';

// Mock database before importing
jest.mock('../../src/config/database', () => ({
  prisma: prismaMock,
  db: { getClient: () => prismaMock },
}));

jest.mock('../../src/config/logger', () => ({
  AppLogger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

jest.mock('../../src/services/compliance.service', () => ({
  ComplianceService: {
    evaluateEquipoClienteDetailed: jest.fn().mockResolvedValue([]),
  },
}));

import { EquipoEstadoService } from '../../src/services/equipo-estado.service';

describe('EquipoEstadoService', () => {
  beforeEach(() => {
    resetPrismaMock();
    jest.clearAllMocks();
  });

  describe('calculateEquipoEstado', () => {
    it('retorna gris si el equipo no existe', async () => {
      prismaMock.equipo.findUnique.mockResolvedValue(null);

      const result = await EquipoEstadoService.calculateEquipoEstado(123);

      expect(result.estado).toBe('gris');
      expect(result.equipoId).toBe(123);
    });

    it('retorna rojo si hay faltantes (compliance)', async () => {
      prismaMock.equipo.findUnique.mockResolvedValue({
        id: 1,
        tenantEmpresaId: 1,
        dadorCargaId: 1,
        driverId: 10,
        truckId: null,
        trailerId: null,
      });
      prismaMock.document.findMany.mockResolvedValue([]);

      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { ComplianceService } = require('../../src/services/compliance.service');
      (ComplianceService.evaluateEquipoClienteDetailed as jest.Mock).mockResolvedValue([{ state: 'FALTANTE' }]);

      const result = await EquipoEstadoService.calculateEquipoEstado(1, 99);
      expect(result.estado).toBe('rojo');
      expect(result.breakdown.faltantes).toBe(1);
    });

    it('retorna rojo_azul si hay faltantes y pendientes', async () => {
      prismaMock.equipo.findUnique.mockResolvedValue({
        id: 1,
        tenantEmpresaId: 1,
        dadorCargaId: 1,
        driverId: 10,
        truckId: null,
        trailerId: null,
      });
      prismaMock.document.findMany.mockResolvedValue([{ status: 'PENDIENTE', expiresAt: null }]);

      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { ComplianceService } = require('../../src/services/compliance.service');
      (ComplianceService.evaluateEquipoClienteDetailed as jest.Mock).mockResolvedValue([{ state: 'FALTANTE' }]);

      const result = await EquipoEstadoService.calculateEquipoEstado(1, 99);
      expect(result.estado).toBe('rojo_azul');
      expect(result.breakdown.pendientes).toBe(1);
    });

    it('retorna amarillo si hay proximos (sin vencidos/rechazados/faltantes)', async () => {
      prismaMock.equipo.findUnique.mockResolvedValue({
        id: 1,
        tenantEmpresaId: 1,
        dadorCargaId: 1,
        driverId: 10,
        truckId: null,
        trailerId: null,
      });
      prismaMock.document.findMany.mockResolvedValue([]);

      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { ComplianceService } = require('../../src/services/compliance.service');
      (ComplianceService.evaluateEquipoClienteDetailed as jest.Mock).mockResolvedValue([{ state: 'PROXIMO' }]);

      const result = await EquipoEstadoService.calculateEquipoEstado(1, 99);
      expect(result.estado).toBe('amarillo');
      expect(result.breakdown.proximos).toBe(1);
    });
  });

  describe('Coverage Improvements', () => {
    it('handles no clienteId (compliance empty)', async () => {
      prismaMock.equipo.findUnique.mockResolvedValue({ id: 1, driverId: 10 } as any);
      prismaMock.document.findMany.mockResolvedValue([]);
      const result = await EquipoEstadoService.calculateEquipoEstado(1); // no clienteId
      expect(result.breakdown.sinRequisitos).toBe(false);
      expect(result.estado).toBe('gris'); // Nothing found
    });

    it('handles empty equipo entities (no clauses)', async () => {
      prismaMock.equipo.findUnique.mockResolvedValue({ id: 1, driverId: null, truckId: null, trailerId: null } as any);
      const result = await EquipoEstadoService.calculateEquipoEstado(1);
      expect(result.breakdown.pendientes).toBe(0);
      expect(prismaMock.document.findMany).not.toHaveBeenCalled();
    });

    it('returns ROJO if rejected detected', async () => {
      prismaMock.equipo.findUnique.mockResolvedValue({ id: 1, driverId: 10 } as any);
      prismaMock.document.findMany.mockResolvedValue([{ status: 'RECHAZADO', expiresAt: null }] as any);
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { ComplianceService } = require('../../src/services/compliance.service');
      (ComplianceService.evaluateEquipoClienteDetailed as jest.Mock).mockResolvedValue([]);

      const result = await EquipoEstadoService.calculateEquipoEstado(1);
      expect(result.estado).toBe('rojo');
      expect(result.breakdown.rechazados).toBe(1);
    });

    it('returns ROJO if expired detected', async () => {
      prismaMock.equipo.findUnique.mockResolvedValue({ id: 1, driverId: 10 } as any);
      const past = new Date();
      past.setFullYear(past.getFullYear() - 1);
      prismaMock.document.findMany.mockResolvedValue([{ status: 'APROBADO', expiresAt: past }] as any);
      const result = await EquipoEstadoService.calculateEquipoEstado(1);
      expect(result.estado).toBe('rojo');
      expect(result.breakdown.vencidos).toBe(1);
    });

    it('returns AZUL if only pending', async () => {
      prismaMock.equipo.findUnique.mockResolvedValue({ id: 1, driverId: 10 } as any);
      prismaMock.document.findMany.mockResolvedValue([{ status: 'PENDIENTE', expiresAt: null }] as any);
      const result = await EquipoEstadoService.calculateEquipoEstado(1);
      expect(result.estado).toBe('azul');
      expect(result.breakdown.pendientes).toBe(1);
    });

    it('returns VERDE if only vigente', async () => {
      prismaMock.equipo.findUnique.mockResolvedValue({ id: 1, driverId: 10 } as any);
      prismaMock.document.findMany.mockResolvedValue([]);
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { ComplianceService } = require('../../src/services/compliance.service');
      (ComplianceService.evaluateEquipoClienteDetailed as jest.Mock).mockResolvedValue([{ state: 'VIGENTE' }]);

      const result = await EquipoEstadoService.calculateEquipoEstado(1, 99);
      expect(result.estado).toBe('verde');
      expect(result.breakdown.vigentes).toBe(1);
    });
  });

});


