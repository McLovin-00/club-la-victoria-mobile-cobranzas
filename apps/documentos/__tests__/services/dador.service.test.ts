/**
 * Tests unitarios para DadorService
 */
import { prismaMock, resetPrismaMock } from '../mocks/prisma.mock';

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

import { DadorService } from '../../src/services/dador.service';

describe('DadorService', () => {
  beforeEach(() => {
    resetPrismaMock();
    jest.clearAllMocks();
  });

  describe('list', () => {
    it('should return list of dadores de carga', async () => {
      const mockDadores = [
        { id: 1, nombre: 'Dador 1', cuit: '20123456789', activo: true },
        { id: 2, nombre: 'Dador 2', cuit: '20987654321', activo: true },
      ];

      prismaMock.dadorCarga.findMany.mockResolvedValue(mockDadores);

      const result = await DadorService.list(1);

      expect(result).toHaveLength(2);
      expect(prismaMock.dadorCarga.findMany).toHaveBeenCalled();
    });
  });

  describe('getById', () => {
    it('should return dador by id', async () => {
      const mockDador = {
        id: 1,
        nombre: 'Dador 1',
        cuit: '20123456789',
        activo: true,
      };

      prismaMock.dadorCarga.findFirst.mockResolvedValue(mockDador);

      const result = await DadorService.getById(1, 1);

      expect(result).toBeDefined();
      expect(result?.id).toBe(1);
    });

    it('should return null if dador not found', async () => {
      prismaMock.dadorCarga.findFirst.mockResolvedValue(null);

      const result = await DadorService.getById(999, 1);

      expect(result).toBeNull();
    });
  });

  describe('create', () => {
    it('should create a new dador de carga', async () => {
      const mockDador = {
        id: 1,
        nombre: 'New Dador',
        cuit: '20123456789',
        tenantEmpresaId: 1,
        activo: true,
      };

      prismaMock.dadorCarga.create.mockResolvedValue(mockDador);

      const result = await DadorService.create({
        nombre: 'New Dador',
        cuit: '20123456789',
        tenantEmpresaId: 1,
      });

      expect(result.id).toBe(1);
      expect(prismaMock.dadorCarga.create).toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('should update dador de carga', async () => {
      const mockUpdated = {
        id: 1,
        nombre: 'Updated Dador',
        cuit: '20123456789',
        activo: true,
      };

      prismaMock.dadorCarga.update.mockResolvedValue(mockUpdated);

      const result = await DadorService.update(1, 1, { nombre: 'Updated Dador' });

      expect(result.nombre).toBe('Updated Dador');
    });
  });
});



