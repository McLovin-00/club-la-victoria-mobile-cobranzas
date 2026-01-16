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
import type { AuthRequest } from '../../src/middlewares/auth.middleware';


describe('PortalTransportistaController', () => {
  let mockReq: Partial<AuthRequest>;
  let mockRes: Partial<Response>;
  let jsonMock: jest.Mock;
  let statusMock: jest.Mock;
  const transportistaUser = { userId: 1, role: 'TRANSPORTISTA', empresaTransportistaId: 5 } as unknown as AuthRequest['user'];
  const transportistaUserWithoutEmpresa = { userId: 1, role: 'TRANSPORTISTA' } as unknown as AuthRequest['user'];


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
        user: transportistaUser,

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
        user: transportistaUser,

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
    it('retorna respuesta vacía si el transportista no tiene empresa asignada', async () => {
      mockReq = {
        tenantId: 1,
        user: transportistaUserWithoutEmpresa,

      };

      await PortalTransportistaController.getMisEntidades(mockReq as AuthRequest, mockRes as Response);

      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            empresas: [],
            choferes: [],
            camiones: [],
            acoplados: [],
          }),
        })
      );
    });
  });
});


