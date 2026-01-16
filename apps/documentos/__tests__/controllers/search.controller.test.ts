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

jest.mock('../../src/services/compliance.service', () => ({
  ComplianceService: {
    evaluateEquipoCliente: jest.fn().mockResolvedValue({ estadoCompliance: 'VIGENTE' }),
  },
}));

import { SearchController } from '../../src/controllers/search.controller';
import type { AuthRequest } from '../../src/middlewares/auth.middleware';


describe('SearchController', () => {
  let mockReq: Partial<AuthRequest>;
  let mockRes: Partial<Response>;
  let jsonMock: jest.Mock;
  let statusMock: jest.Mock;
  const superadminUser = { userId: 1, role: 'SUPERADMIN' } as unknown as AuthRequest['user'];


  beforeEach(() => {
    resetPrismaMock();
    jest.clearAllMocks();

    // Defaults para evitar errores al mapear resultados en el controller.
    prismaMock.equipoCliente.findMany.mockResolvedValue([]);

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
        user: superadminUser,

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
            expect.objectContaining({
              equipo: expect.objectContaining({ driverDniNorm: '12345678' }),
              clientes: expect.any(Array),
            }),
          ]),
        })
      );
    });

    it('should search equipos by truck plate', async () => {
      mockReq = {
        tenantId: 1,
        user: superadminUser,

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
        user: superadminUser,

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
        user: superadminUser,
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

    it('caps limit at 100', async () => {
      mockReq = {
        tenantId: 1,
        user: superadminUser,
        query: {
          limit: '999',
        },
      };

      prismaMock.equipo.findMany.mockResolvedValue([]);

      await SearchController.search(mockReq as AuthRequest, mockRes as Response);

      expect(prismaMock.equipo.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 100,
        })
      );
    });

    it('returns empty when clienteId has no equipos', async () => {
      mockReq = {
        tenantId: 1,
        user: superadminUser,
        query: {
          clienteId: '7',
        },
      };

      prismaMock.equipoCliente.findMany.mockResolvedValueOnce([]);

      await SearchController.search(mockReq as AuthRequest, mockRes as Response);

      expect(prismaMock.equipo.findMany).not.toHaveBeenCalled();
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({ success: true, data: [] })
      );
    });


    it('should handle errors gracefully', async () => {
      mockReq = {
        tenantId: 1,
        user: superadminUser,

        query: {},
      };

      prismaMock.equipo.findMany.mockRejectedValue(new Error('Database error'));

      await expect(SearchController.search(mockReq as AuthRequest, mockRes as Response)).rejects.toThrow('Database error');
    });
  });
});


