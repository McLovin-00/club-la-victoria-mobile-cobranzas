/**
 * Tests unitarios para authorizeTransportista middleware
 */
import { Response, NextFunction } from 'express';
import { authorizeTransportista } from '../../src/middlewares/authorizeTransportista.middleware';
import { AuthRequest } from '../../src/types/auth.types';

jest.mock('../../src/config/logger', () => ({
  AppLogger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('authorizeTransportista middleware', () => {
  let mockReq: Partial<AuthRequest>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;
  let jsonMock: jest.Mock;
  let statusMock: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    jsonMock = jest.fn();
    statusMock = jest.fn().mockReturnValue({ json: jsonMock });
    mockNext = jest.fn();

    mockRes = {
      json: jsonMock,
      status: statusMock,
    };

    mockReq = {
      query: {},
      body: {},
    };
  });

  describe('non-transportista roles', () => {
    it('should call next() for SUPERADMIN', () => {
      mockReq.user = {
        userId: 1,
        role: 'SUPERADMIN',
        tenantEmpresaId: 1,
        empresaId: 1,
      };

      authorizeTransportista(mockReq as AuthRequest, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(statusMock).not.toHaveBeenCalled();
    });

    it('should call next() for ADMIN_INTERNO', () => {
      mockReq.user = {
        userId: 1,
        role: 'ADMIN_INTERNO',
        tenantEmpresaId: 1,
        empresaId: 1,
      };

      authorizeTransportista(mockReq as AuthRequest, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should call next() for DADOR_DE_CARGA', () => {
      mockReq.user = {
        userId: 1,
        role: 'DADOR_DE_CARGA',
        tenantEmpresaId: 1,
        empresaId: 1,
      };

      authorizeTransportista(mockReq as AuthRequest, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('TRANSPORTISTA role', () => {
    it('should apply empresaTransportistaId filter', () => {
      mockReq.user = {
        userId: 1,
        role: 'TRANSPORTISTA',
        tenantEmpresaId: 1,
        empresaId: 1,
        empresaTransportistaId: 5,
      };

      authorizeTransportista(mockReq as AuthRequest, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockReq.query?.empresaTransportistaId).toBe(5);
    });

    it('should reject if trying to access different empresaTransportistaId', () => {
      mockReq.user = {
        userId: 1,
        role: 'TRANSPORTISTA',
        tenantEmpresaId: 1,
        empresaId: 1,
        empresaTransportistaId: 5,
      };
      mockReq.query = { empresaTransportistaId: '10' };

      authorizeTransportista(mockReq as AuthRequest, mockRes as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(403);
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('CHOFER role', () => {
    it('should apply choferId filter', () => {
      mockReq.user = {
        userId: 1,
        role: 'CHOFER',
        tenantEmpresaId: 1,
        empresaId: 1,
        choferId: 10,
        choferDniNorm: '12345678',
      };

      authorizeTransportista(mockReq as AuthRequest, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockReq.query?.choferId).toBe(10);
    });
  });

  describe('error handling', () => {
    it('should return 401 if no user', () => {
      mockReq.user = undefined;

      authorizeTransportista(mockReq as AuthRequest, mockRes as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(mockNext).not.toHaveBeenCalled();
    });
  });
});



