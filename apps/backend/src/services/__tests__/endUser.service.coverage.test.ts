/**
 * Tests de cobertura adicionales para endUser.service.ts
 * @jest-environment node
 */

import { EndUserService } from '../endUser.service';
import { prismaService } from '../../config/prisma';
import { AppLogger } from '../../config/logger';
import { IdentifierType } from '@prisma/client';

jest.mock('../../config/prisma', () => ({
  prismaService: {
    getClient: jest.fn(),
  },
}));

jest.mock('../../config/logger', () => ({
  AppLogger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

describe('EndUserService - Coverage adicional', () => {
  const prismaClientMock: any = {
    endUser: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
      groupBy: jest.fn(),
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (prismaService.getClient as jest.Mock).mockReturnValue(prismaClientMock);
  });

  describe('identifyUser', () => {
    it('should return null when user not found', async () => {
      prismaClientMock.endUser.findUnique.mockResolvedValue(null);

      const result = await EndUserService.identifyUser('EMAIL' as IdentifierType, 'nonexistent@example.com');

      expect(result).toBeNull();
      expect(AppLogger.debug).toHaveBeenCalledWith(
        expect.stringContaining('Usuario final no encontrado'),
        expect.any(Object)
      );
    });

    it('should return null when database error occurs', async () => {
      prismaClientMock.endUser.findUnique.mockRejectedValue(new Error('DB Error'));

      const result = await EndUserService.identifyUser('EMAIL' as IdentifierType, 'test@example.com');

      expect(result).toBeNull();
      expect(AppLogger.error).toHaveBeenCalled();
    });
  });

  describe('createEndUser', () => {
    it('should throw error when user already exists', async () => {
      prismaClientMock.endUser.findUnique.mockResolvedValue({
        id: 1,
        email: 'existing@example.com',
      });

      const createData: any = {
        identifierType: 'EMAIL' as IdentifierType,
        identifier_value: 'existing@example.com',
      };

      await expect(EndUserService.createEndUser(createData)).rejects.toThrow(
        'Usuario final ya existe con este identificador'
      );
    });

    it('should handle legacy identifier_value field', async () => {
      prismaClientMock.endUser.findUnique.mockResolvedValue(null);
      prismaClientMock.endUser.create.mockResolvedValue({
        id: 1,
        email: 'test@example.com',
        empresa: { id: 1, nombre: 'Test Co', descripcion: null },
      });

      const createData: any = {
        identifierType: 'EMAIL' as IdentifierType,
        identifier_value: 'test@example.com',
        empresaId: 1,
      };

      await EndUserService.createEndUser(createData);

      expect(prismaClientMock.endUser.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            email: 'test@example.com',
            identifier_value: 'test@example.com',
          }),
        })
      );
    });

    it('should handle camelCase identifierValue field', async () => {
      prismaClientMock.endUser.findUnique.mockResolvedValue(null);
      prismaClientMock.endUser.create.mockResolvedValue({
        id: 1,
        email: 'test@example.com',
        empresa: { id: 1, nombre: 'Test Co', descripcion: null },
      });

      const createData: any = {
        identifierType: 'EMAIL' as IdentifierType,
        identifierValue: 'test@example.com',
        empresaId: 1,
      };

      await EndUserService.createEndUser(createData);

      expect(prismaClientMock.endUser.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            email: 'test@example.com',
            identifier_value: 'test@example.com',
          }),
        })
      );
    });
  });

  describe('getOrCreateEndUser', () => {
    it('should reactivate inactive user', async () => {
      prismaClientMock.endUser.findUnique.mockResolvedValue({
        id: 1,
        email: 'inactive@example.com',
        is_active: false,
        empresa: { id: 1, nombre: 'Test Co', descripcion: null },
      });
      prismaClientMock.endUser.update.mockResolvedValue({
        id: 1,
        is_active: true,
        empresa: { id: 1, nombre: 'Test Co', descripcion: null },
      });

      const createData: any = {
        identifierType: 'EMAIL' as IdentifierType,
        identifier_value: 'inactive@example.com',
      };

      const result = await EndUserService.getOrCreateEndUser(createData);

      expect(result).toBeDefined();
      expect(prismaClientMock.endUser.update).toHaveBeenCalled();
    });

    it('should return existing active user', async () => {
      const existingUser = {
        id: 1,
        email: 'active@example.com',
        is_active: true,
        empresa: { id: 1, nombre: 'Test Co', descripcion: null },
      };
      prismaClientMock.endUser.findUnique.mockResolvedValue(existingUser);

      const createData: any = {
        identifierType: 'EMAIL' as IdentifierType,
        identifier_value: 'active@example.com',
      };

      const result = await EndUserService.getOrCreateEndUser(createData);

      expect(result).toEqual(existingUser);
      expect(prismaClientMock.endUser.create).not.toHaveBeenCalled();
    });
  });

  describe('updateEndUser', () => {
    it('should handle when all update fields are undefined', async () => {
      prismaClientMock.endUser.update.mockResolvedValue({
        id: 1,
        updatedAt: new Date(),
        empresa: { id: 1, nombre: 'Test Co', descripcion: null },
      });

      const updateData: any = {};

      await EndUserService.updateEndUser(1, updateData);

      expect(prismaClientMock.endUser.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: {
            updatedAt: expect.any(Date),
          },
        })
      );
    });

    it('should convert isActive boolean to is_active', async () => {
      prismaClientMock.endUser.update.mockResolvedValue({
        id: 1,
        is_active: true,
        empresa: { id: 1, nombre: 'Test Co', descripcion: null },
      });

      const updateData: any = {
        isActive: true,
      };

      await EndUserService.updateEndUser(1, updateData);

      expect(prismaClientMock.endUser.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: {
            updatedAt: expect.any(Date),
            is_active: true,
          },
        })
      );
    });

    it('should convert isActive false boolean correctly', async () => {
      prismaClientMock.endUser.update.mockResolvedValue({
        id: 1,
        is_active: false,
        empresa: { id: 1, nombre: 'Test Co', descripcion: null },
      });

      const updateData: any = {
        isActive: false,
      };

      await EndUserService.updateEndUser(1, updateData);

      expect(prismaClientMock.endUser.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: {
            updatedAt: expect.any(Date),
            is_active: false,
          },
        })
      );
    });

    it('should include empresaId in update when provided', async () => {
      prismaClientMock.endUser.update.mockResolvedValue({
        id: 1,
        empresaId: 2,
        empresa: { id: 2, nombre: 'New Co', descripcion: null },
      });

      const updateData: any = {
        empresaId: 2,
      };

      await EndUserService.updateEndUser(1, updateData);

      expect(prismaClientMock.endUser.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: {
            updatedAt: expect.any(Date),
            empresaId: 2,
          },
        })
      );
    });
  });

  describe('updateLastAccess', () => {
    it('should log warning when update fails', async () => {
      prismaClientMock.endUser.update.mockRejectedValue(new Error('Update failed'));

      await EndUserService.updateLastAccess(1);

      expect(AppLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Error actualizando último acceso'),
        expect.any(Error)
      );
    });
  });
});
