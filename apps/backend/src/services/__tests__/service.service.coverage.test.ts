/**
 * Tests de cobertura adicionales para service.service.ts
 * @jest-environment node
 */

import { ServiceService, CreateServiceData, UpdateServiceData } from '../service.service';
import { prisma } from '../../config/prisma';
import { AppLogger } from '../../config/logger';

jest.mock('../../config/prisma', () => ({
  prisma: {
    service: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    instance: {
      count: jest.fn(),
    },
  },
}));

jest.mock('../../config/logger', () => ({
  AppLogger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    logError: jest.fn(),
    logDatabaseOperation: jest.fn(),
  },
}));

describe('ServiceService - Coverage adicional', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Limpiar instancia singleton para evitar interferencia entre tests
    (ServiceService as any).instance = undefined;
  });

  describe('findByNombre', () => {
    it('should throw error when database query fails', async () => {
      const serviceService = ServiceService.getInstance();
      (prisma.service.findUnique as jest.Mock).mockRejectedValue(new Error('Database error'));

      await expect(serviceService.findByNombre('Test Service')).rejects.toThrow('Database error');
      expect(AppLogger.logError).toHaveBeenCalledWith(
        expect.any(Error),
        'Service.findByNombre'
      );
    });
  });

  describe('findAllSimple', () => {
    it('should throw error when database query fails', async () => {
      const serviceService = ServiceService.getInstance();
      (prisma.service.findMany as jest.Mock).mockRejectedValue(new Error('Database error'));

      await expect(serviceService.findAllSimple()).rejects.toThrow('Database error');
      expect(AppLogger.logError).toHaveBeenCalledWith(
        expect.any(Error),
        'ServiceService.findAllSimple'
      );
    });
  });

  describe('findByEstado', () => {
    it('should throw error when database query fails', async () => {
      const serviceService = ServiceService.getInstance();
      (prisma.service.findMany as jest.Mock).mockRejectedValue(new Error('Database error'));

      await expect(serviceService.findByEstado('activo')).rejects.toThrow('Database error');
      expect(AppLogger.logError).toHaveBeenCalledWith(
        expect.any(Error),
        'Service.findByEstado'
      );
    });
  });

  describe('getStats', () => {
    it('should throw error when database query fails', async () => {
      const serviceService = ServiceService.getInstance();
      (prisma.service.findMany as jest.Mock).mockRejectedValue(new Error('Database error'));
      (prisma.service.count as jest.Mock).mockResolvedValue(0);

      await expect(serviceService.getStats()).rejects.toThrow('Database error');
      expect(AppLogger.logError).toHaveBeenCalledWith(
        expect.any(Error),
        'ServiceService.getStats'
      );
    });

    it('should handle zero services correctly', async () => {
      const serviceService = ServiceService.getInstance();
      (prisma.service.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.service.count as jest.Mock).mockResolvedValue(0);

      const stats = await serviceService.getStats();

      expect(stats).toEqual({
        total: 0,
        activos: 0,
        inactivos: 0,
        mantenimiento: 0,
        withInstances: 0,
        withoutInstances: 0,
        averageInstancesPerService: 0,
      });
    });

    it('should calculate stats with mixed states', async () => {
      const serviceService = ServiceService.getInstance();
      (prisma.service.findMany as jest.Mock).mockResolvedValue([
        {
          estado: 'activo',
          _count: { instances: 2 },
        },
        {
          estado: 'inactivo',
          _count: { instances: 0 },
        },
        {
          estado: 'mantenimiento',
          _count: { instances: 1 },
        },
        {
          estado: 'activo',
          _count: { instances: 0 },
        },
      ]);
      (prisma.service.count as jest.Mock).mockResolvedValue(4);

      const stats = await serviceService.getStats();

      expect(stats).toEqual({
        total: 4,
        activos: 2,
        inactivos: 1,
        mantenimiento: 1,
        withInstances: 2,
        withoutInstances: 2,
        averageInstancesPerService: 0.75,
      });
    });
  });

  describe('changeEstado', () => {
    it('should throw error when update fails', async () => {
      const serviceService = ServiceService.getInstance();
      (prisma.service.update as jest.Mock).mockRejectedValue(new Error('Update failed'));

      await expect(serviceService.changeEstado(1, 'inactivo')).rejects.toThrow('Update failed');
      expect(AppLogger.logError).toHaveBeenCalledWith(
        expect.any(Error),
        'Service.changeEstado'
      );
    });
  });

  describe('createImplementation', () => {
    it('should create service with default estado when not provided', async () => {
      const serviceService = ServiceService.getInstance();
      const createData: CreateServiceData = {
        nombre: 'Test Service',
        descripcion: 'Test description',
      };

      (prisma.service.create as jest.Mock).mockResolvedValue({
        id: 1,
        nombre: 'Test Service',
        descripcion: 'Test description',
        version: null,
        estado: 'activo',
        _count: { instances: 0 },
      });

      const result = await serviceService.create(createData);

      expect(prisma.service.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          nombre: 'Test Service',
          descripcion: 'Test description',
          version: null,
          estado: 'activo',
        }),
        include: {
          _count: {
            select: {
              instances: true,
            },
          },
        },
      });
      expect(result).toBeDefined();
    });
  });

  describe('updateImplementation', () => {
    it('should handle empty descripcion by setting it to null', async () => {
      const serviceService = ServiceService.getInstance();
      const updateData: UpdateServiceData = {
        descripcion: '',
      };

      (prisma.service.update as jest.Mock).mockResolvedValue({
        id: 1,
        descripcion: null,
        _count: { instances: 0 },
      });

      await serviceService.update(1, updateData);

      expect(prisma.service.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: expect.objectContaining({
          descripcion: null,
        }),
        include: expect.any(Object),
      });
    });

    it('should handle undefined descripcion', async () => {
      const serviceService = ServiceService.getInstance();
      const updateData: UpdateServiceData = {};

      (prisma.service.update as jest.Mock).mockResolvedValue({
        id: 1,
        _count: { instances: 0 },
      });

      await serviceService.update(1, updateData);

      expect(prisma.service.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: expect.objectContaining({}),
        include: expect.any(Object),
      });
    });
  });

  describe('deleteImplementation', () => {
    it('should throw error when service has associated instances', async () => {
      const serviceService = ServiceService.getInstance();
      (prisma.instance.count as jest.Mock).mockResolvedValue(5);

      await expect(serviceService.delete(1)).rejects.toThrow(
        'No se puede eliminar el servicio porque tiene 5 instancias asociadas'
      );
    });
  });
});
