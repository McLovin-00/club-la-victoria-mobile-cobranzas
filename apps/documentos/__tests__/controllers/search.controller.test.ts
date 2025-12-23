/**
 * Tests unitarios para SearchController
 */
import { Response } from 'express';
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

import { SearchController } from '../../src/controllers/search.controller';
import { AuthRequest } from '../../src/types/auth.types';

describe('SearchController', () => {
  let mockReq: Partial<AuthRequest>;
  let mockRes: Partial<Response>;
  let jsonMock: jest.Mock;
  let statusMock: jest.Mock;

  beforeEach(() => {
    resetPrismaMock();
    jest.clearAllMocks();

    jsonMock = jest.fn();
    statusMock = jest.fn().mockReturnValue({ json: jsonMock });

    mockRes = {
      json: jsonMock,
      status: statusMock,
    };
  });

  describe('search', () => {
    it('should search equipos by dni', async () => {
      mockReq = {
        tenantId: 1,
        user: {
          userId: 1,
          role: 'SUPERADMIN',
          empresaId: 1,
          tenantEmpresaId: 1,
        },
        query: {
          dni: '12345678',
        },
      };

      const mockEquipos = [
        { id: 1, driverDniNorm: '12345678', truckPlateNorm: 'ABC123' },
      ];

      prismaMock.equipo.findMany.mockResolvedValue(mockEquipos);

      await SearchController.search(mockReq as AuthRequest, mockRes as Response);

      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.arrayContaining([
            expect.objectContaining({ driverDniNorm: '12345678' }),
          ]),
        })
      );
    });

    it('should search equipos by truck plate', async () => {
      mockReq = {
        tenantId: 1,
        user: {
          userId: 1,
          role: 'SUPERADMIN',
          empresaId: 1,
          tenantEmpresaId: 1,
        },
        query: {
          truckPlate: 'ABC123',
        },
      };

      const mockEquipos = [
        { id: 1, driverDniNorm: '12345678', truckPlateNorm: 'ABC123' },
      ];

      prismaMock.equipo.findMany.mockResolvedValue(mockEquipos);

      await SearchController.search(mockReq as AuthRequest, mockRes as Response);

      expect(prismaMock.equipo.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            truckPlateNorm: expect.anything(),
          }),
        })
      );
    });

    it('should filter by dadorCargaId', async () => {
      mockReq = {
        tenantId: 1,
        user: {
          userId: 1,
          role: 'SUPERADMIN',
          empresaId: 1,
          tenantEmpresaId: 1,
        },
        query: {
          dadorCargaId: '5',
        },
      };

      prismaMock.equipo.findMany.mockResolvedValue([]);

      await SearchController.search(mockReq as AuthRequest, mockRes as Response);

      expect(prismaMock.equipo.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            dadorCargaId: 5,
          }),
        })
      );
    });

    it('should limit results', async () => {
      mockReq = {
        tenantId: 1,
        user: {
          userId: 1,
          role: 'SUPERADMIN',
          empresaId: 1,
          tenantEmpresaId: 1,
        },
        query: {
          limit: '10',
        },
      };

      prismaMock.equipo.findMany.mockResolvedValue([]);

      await SearchController.search(mockReq as AuthRequest, mockRes as Response);

      expect(prismaMock.equipo.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 10,
        })
      );
    });

    it('should handle errors gracefully', async () => {
      mockReq = {
        tenantId: 1,
        user: {
          userId: 1,
          role: 'SUPERADMIN',
          empresaId: 1,
          tenantEmpresaId: 1,
        },
        query: {},
      };

      prismaMock.equipo.findMany.mockRejectedValue(new Error('Database error'));

      await SearchController.search(mockReq as AuthRequest, mockRes as Response);

      expect(statusMock).toHaveBeenCalledWith(500);
    });
  });
});


