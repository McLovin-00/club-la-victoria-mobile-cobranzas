/**
 * Tests unitarios para EntityDataController
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

import { EntityDataController } from '../../src/controllers/entity-data.controller';
import { AuthRequest } from '../../src/types/auth.types';

describe('EntityDataController', () => {
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

  describe('getExtractedData', () => {
    it('should return extracted data for chofer', async () => {
      mockReq = {
        tenantId: 1,
        params: { entityType: 'CHOFER', entityId: '1' },
        user: { userId: 1, role: 'SUPERADMIN', empresaId: 1, tenantEmpresaId: 1 },
      };

      prismaMock.document.findMany.mockResolvedValue([
        {
          id: 1,
          entityType: 'CHOFER',
          entityId: 1,
          classifications: [{ extractedData: { nombre: 'Test' } }],
        },
      ]);

      await EntityDataController.getExtractedData(mockReq as AuthRequest, mockRes as Response);

      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
        })
      );
    });

    it('should return 400 for invalid entity type', async () => {
      mockReq = {
        tenantId: 1,
        params: { entityType: 'INVALID', entityId: '1' },
        user: { userId: 1, role: 'SUPERADMIN', empresaId: 1, tenantEmpresaId: 1 },
      };

      await EntityDataController.getExtractedData(mockReq as AuthRequest, mockRes as Response);

      expect(statusMock).toHaveBeenCalledWith(400);
    });

    it('should return 400 for invalid entity id', async () => {
      mockReq = {
        tenantId: 1,
        params: { entityType: 'CHOFER', entityId: 'invalid' },
        user: { userId: 1, role: 'SUPERADMIN', empresaId: 1, tenantEmpresaId: 1 },
      };

      await EntityDataController.getExtractedData(mockReq as AuthRequest, mockRes as Response);

      expect(statusMock).toHaveBeenCalledWith(400);
    });
  });

  describe('deleteExtractedData', () => {
    it('should delete extracted data', async () => {
      mockReq = {
        tenantId: 1,
        params: { entityType: 'CHOFER', entityId: '1' },
        user: { userId: 1, role: 'SUPERADMIN', empresaId: 1, tenantEmpresaId: 1 },
      };

      prismaMock.entityExtractedData.deleteMany.mockResolvedValue({ count: 1 });

      await EntityDataController.deleteExtractedData(mockReq as AuthRequest, mockRes as Response);

      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
        })
      );
    });
  });
});


