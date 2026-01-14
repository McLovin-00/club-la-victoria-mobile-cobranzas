/**
 * Tests unitarios para DashboardController
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

import { DashboardController } from '../../src/controllers/dashboard.controller';
import { AuthRequest } from '../../src/types/auth.types';

describe('DashboardController', () => {
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

  describe('getStatsPorRol', () => {
    it('should return stats for SUPERADMIN role', async () => {
      mockReq = {
        tenantId: 1,
        user: {
          userId: 1,
          role: 'SUPERADMIN',
          empresaId: 1,
          tenantEmpresaId: 1,
        },
      };

      // Mock counts for admin stats
      prismaMock.equipo.count.mockResolvedValue(10);
      prismaMock.document.count.mockResolvedValue(50);
      prismaMock.user.count.mockResolvedValue(5);

      await DashboardController.getStatsPorRol(mockReq as AuthRequest, mockRes as Response);

      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            role: 'SUPERADMIN',
          }),
        })
      );
    });

    it('should return stats for DADOR_DE_CARGA role', async () => {
      mockReq = {
        tenantId: 1,
        user: {
          userId: 1,
          role: 'DADOR_DE_CARGA',
          empresaId: 1,
          tenantEmpresaId: 1,
        },
      };

      prismaMock.equipo.count.mockResolvedValue(5);
      prismaMock.document.count.mockResolvedValue(20);
      prismaMock.document.findMany.mockResolvedValue([]);

      await DashboardController.getStatsPorRol(mockReq as AuthRequest, mockRes as Response);

      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            role: 'DADOR_DE_CARGA',
          }),
        })
      );
    });

    it('should return stats for TRANSPORTISTA role', async () => {
      mockReq = {
        tenantId: 1,
        user: {
          userId: 1,
          role: 'TRANSPORTISTA',
          empresaId: 1,
          tenantEmpresaId: 1,
          empresaTransportistaId: 1,
        },
      };

      prismaMock.equipo.count.mockResolvedValue(3);
      prismaMock.document.count.mockResolvedValue(15);
      prismaMock.document.findMany.mockResolvedValue([]);

      await DashboardController.getStatsPorRol(mockReq as AuthRequest, mockRes as Response);

      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            role: 'TRANSPORTISTA',
          }),
        })
      );
    });

    it('should return stats for CLIENTE role', async () => {
      mockReq = {
        tenantId: 1,
        user: {
          userId: 1,
          role: 'CLIENTE',
          empresaId: 5,
          tenantEmpresaId: 1,
        },
      };

      prismaMock.equipoCliente.count.mockResolvedValue(8);

      await DashboardController.getStatsPorRol(mockReq as AuthRequest, mockRes as Response);

      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            role: 'CLIENTE',
          }),
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
      };

      prismaMock.equipo.count.mockRejectedValue(new Error('Database error'));

      await DashboardController.getStatsPorRol(mockReq as AuthRequest, mockRes as Response);

      expect(statusMock).toHaveBeenCalledWith(500);
    });
  });
});



