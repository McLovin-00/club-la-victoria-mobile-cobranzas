/**
 * Tests unitarios para helpers de EquipoService
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

import { EquipoService } from '../../src/services/equipo.service';

describe('EquipoService', () => {
  beforeEach(() => {
    resetPrismaMock();
    jest.clearAllMocks();
  });

  describe('list', () => {
    it('should return equipos array', async () => {
      const mockEquipos = [
        { id: 1, driverDniNorm: '12345678', truckPlateNorm: 'ABC123', clientes: [], dador: {} },
        { id: 2, driverDniNorm: '87654321', truckPlateNorm: 'XYZ789', clientes: [], dador: {} },
      ];
      
      prismaMock.equipo.findMany.mockResolvedValue(mockEquipos);

      const result = await EquipoService.list(1, undefined, 1, 10);

      expect(result).toHaveLength(2);
      expect(prismaMock.equipo.findMany).toHaveBeenCalled();
    });

    it('should filter by dadorCargaId', async () => {
      prismaMock.equipo.findMany.mockResolvedValue([]);

      await EquipoService.list(1, 5, 1, 10);

      expect(prismaMock.equipo.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            dadorCargaId: 5,
          }),
        })
      );
    });

    it('should apply activo filter', async () => {
      prismaMock.equipo.findMany.mockResolvedValue([]);

      await EquipoService.list(1, undefined, 1, 10, { activo: true });

      expect(prismaMock.equipo.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            activo: true,
          }),
        })
      );
    });

    it('should skip activo filter when set to all', async () => {
      prismaMock.equipo.findMany.mockResolvedValue([]);

      await EquipoService.list(1, undefined, 1, 10, { activo: 'all' });

      expect(prismaMock.equipo.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.not.objectContaining({
            activo: expect.anything(),
          }),
        })
      );
    });
  });

  describe('getById', () => {
    it('should return equipo by id', async () => {
      const mockEquipo = {
        id: 1,
        tenantEmpresaId: 1,
        driverDniNorm: '12345678',
        truckPlateNorm: 'ABC123',
      };

      prismaMock.equipo.findUnique.mockResolvedValue(mockEquipo);

      const result = await EquipoService.getById(1);

      expect(result).toBeDefined();
      expect(result?.id).toBe(1);
    });

    it('should throw error if equipo not found', async () => {
      prismaMock.equipo.findUnique.mockResolvedValue(null);

      await expect(EquipoService.getById(999)).rejects.toThrow();
    });
  });

  describe('updateEquipo', () => {
    it('should throw error if equipo not found', async () => {
      prismaMock.equipo.findUnique.mockResolvedValue(null);

      await expect(
        EquipoService.updateEquipo({
          equipoId: 999,
          usuarioId: 1,
          tenantEmpresaId: 1,
        })
      ).rejects.toThrow('Equipo no encontrado');
    });

    it('should return equipo if no changes provided', async () => {
      const mockEquipo = {
        id: 1,
        tenantEmpresaId: 1,
        driverId: 1,
        truckId: 1,
        trailerId: null,
        empresaTransportistaId: null,
        dadorCargaId: 1,
        clientes: [],
      };

      prismaMock.equipo.findUnique.mockResolvedValue(mockEquipo);

      const result = await EquipoService.updateEquipo({
        equipoId: 1,
        usuarioId: 1,
        tenantEmpresaId: 1,
      });

      expect(result).toEqual(mockEquipo);
      expect(prismaMock.equipo.update).not.toHaveBeenCalled();
    });
  });

  describe('listByCliente', () => {
    it('should return equipos for a specific cliente', async () => {
      const mockEquipoClientes = [
        { equipoId: 1 },
        { equipoId: 2 },
      ];

      const mockEquipos = [
        { id: 1, driverDniNorm: '12345678' },
        { id: 2, driverDniNorm: '87654321' },
      ];

      prismaMock.equipoCliente.findMany.mockResolvedValue(mockEquipoClientes);
      prismaMock.equipo.findMany.mockResolvedValue(mockEquipos);

      const result = await EquipoService.listByCliente(1, 5, false);

      expect(result).toBeDefined();
      expect(prismaMock.equipoCliente.findMany).toHaveBeenCalled();
    });
  });
});
