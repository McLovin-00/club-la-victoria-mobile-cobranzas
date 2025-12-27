/**
 * Tests unitarios para PortalTransportistaController
 */
import { Response } from 'express';
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

import { PortalTransportistaController } from '../../src/controllers/portal-transportista.controller';
import { AuthRequest } from '../../src/types/auth.types';

describe('PortalTransportistaController', () => {
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

  describe('getDocumentosRechazados', () => {
    it('should return rejected documents for transportista', async () => {
      mockReq = {
        tenantId: 1,
        user: {
          userId: 1,
          role: 'TRANSPORTISTA',
          empresaId: 1,
          tenantEmpresaId: 1,
          empresaTransportistaId: 5,
        },
      };

      prismaMock.equipo.findMany.mockResolvedValue([
        { id: 1, driverId: 1, truckId: 1, trailerId: null },
      ]);

      prismaMock.document.findMany.mockResolvedValue([
        {
          id: 1,
          status: 'REJECTED',
          entityType: 'CHOFER',
          entityId: 1,
          template: { nombre: 'DNI' },
          rejectionReason: 'Documento ilegible',
        },
      ]);

      prismaMock.chofer.findUnique.mockResolvedValue({ id: 1, nombre: 'Juan', apellido: 'Pérez' });

      await PortalTransportistaController.getDocumentosRechazados(mockReq as AuthRequest, mockRes as Response);

      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.any(Array),
        })
      );
    });

    it('should return empty array if no equipos', async () => {
      mockReq = {
        tenantId: 1,
        user: {
          userId: 1,
          role: 'TRANSPORTISTA',
          empresaId: 1,
          tenantEmpresaId: 1,
          empresaTransportistaId: 5,
        },
      };

      prismaMock.equipo.findMany.mockResolvedValue([]);

      await PortalTransportistaController.getDocumentosRechazados(mockReq as AuthRequest, mockRes as Response);

      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: [],
        })
      );
    });
  });

  describe('getEquipos', () => {
    it('should return equipos for transportista', async () => {
      mockReq = {
        tenantId: 1,
        user: {
          userId: 1,
          role: 'TRANSPORTISTA',
          empresaId: 1,
          tenantEmpresaId: 1,
          empresaTransportistaId: 5,
        },
        query: {},
      };

      const mockEquipos = [
        { id: 1, driverDniNorm: '12345678', truckPlateNorm: 'ABC123' },
      ];

      prismaMock.equipo.findMany.mockResolvedValue(mockEquipos);
      prismaMock.equipo.count.mockResolvedValue(1);

      await PortalTransportistaController.getEquipos(mockReq as AuthRequest, mockRes as Response);

      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
        })
      );
    });
  });
});



