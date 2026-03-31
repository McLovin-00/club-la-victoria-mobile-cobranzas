/**
 * Unit Tests for Admin Middleware
 */

import { Response, NextFunction } from 'express';
import { adminMiddleware, roleMiddleware } from '../../middlewares/admin.middleware';
import { AuthenticatedRequest } from '../../middlewares/auth.middleware';

// Mock logger
jest.mock('../../config/logger', () => ({
  AppLogger: {
    warn: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  },
}));

import { AppLogger } from '../../config/logger';

describe('Admin Middleware', () => {
  let mockReq: Partial<AuthenticatedRequest>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;
  let mockJson: jest.Mock;
  let mockStatus: jest.Mock;

  beforeEach(() => {
    mockJson = jest.fn();
    mockStatus = jest.fn().mockReturnValue({ json: mockJson });
    mockReq = {};
    mockRes = {
      status: mockStatus,
      json: mockJson,
    };
    mockNext = jest.fn();
    jest.clearAllMocks();
  });

  describe('adminMiddleware', () => {
    test('should return 401 if user is not authenticated', () => {
      mockReq.user = undefined;

      adminMiddleware(
        mockReq as AuthenticatedRequest,
        mockRes as Response,
        mockNext
      );

      expect(mockStatus).toHaveBeenCalledWith(401);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        message: 'Usuario no autenticado',
        error: 'UNAUTHORIZED',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    test('should return 403 if user role is not admin', () => {
      mockReq.user = {
        id: 1,
        email: 'user@test.com',
        role: 'USER',
      };

      adminMiddleware(
        mockReq as AuthenticatedRequest,
        mockRes as Response,
        mockNext
      );

      expect(mockStatus).toHaveBeenCalledWith(403);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        message: 'Acceso denegado. Se requiere rol de administrador.',
        error: 'FORBIDDEN',
      });
      expect(AppLogger.warn).toHaveBeenCalled();
      expect(mockNext).not.toHaveBeenCalled();
    });

    test('should call next for SUPERADMIN role', () => {
      mockReq.user = {
        id: 1,
        email: 'admin@test.com',
        role: 'SUPERADMIN',
      };

      adminMiddleware(
        mockReq as AuthenticatedRequest,
        mockRes as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalled();
      expect(mockStatus).not.toHaveBeenCalled();
    });

    test('should call next for RESOLVER role', () => {
      mockReq.user = {
        id: 2,
        email: 'resolver@test.com',
        role: 'RESOLVER',
      };

      adminMiddleware(
        mockReq as AuthenticatedRequest,
        mockRes as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalled();
      expect(mockStatus).not.toHaveBeenCalled();
    });
  });

  describe('roleMiddleware', () => {
    test('should return 401 if user is not authenticated', () => {
      mockReq.user = undefined;
      const middleware = roleMiddleware(['ADMIN', 'SUPERADMIN']);

      middleware(
        mockReq as AuthenticatedRequest,
        mockRes as Response,
        mockNext
      );

      expect(mockStatus).toHaveBeenCalledWith(401);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        message: 'Usuario no autenticado',
        error: 'UNAUTHORIZED',
      });
    });

    test('should return 403 if user role is not allowed', () => {
      mockReq.user = {
        id: 1,
        email: 'user@test.com',
        role: 'USER',
      };
      const middleware = roleMiddleware(['ADMIN', 'SUPERADMIN']);

      middleware(
        mockReq as AuthenticatedRequest,
        mockRes as Response,
        mockNext
      );

      expect(mockStatus).toHaveBeenCalledWith(403);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        message: 'Acceso denegado',
        error: 'FORBIDDEN',
      });
      expect(AppLogger.warn).toHaveBeenCalled();
    });

    test('should call next if user role is allowed', () => {
      mockReq.user = {
        id: 1,
        email: 'admin@test.com',
        role: 'ADMIN',
      };
      const middleware = roleMiddleware(['ADMIN', 'SUPERADMIN']);

      middleware(
        mockReq as AuthenticatedRequest,
        mockRes as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalled();
      expect(mockStatus).not.toHaveBeenCalled();
    });

    test('should work with single role', () => {
      mockReq.user = {
        id: 1,
        email: 'superadmin@test.com',
        role: 'SUPERADMIN',
      };
      const middleware = roleMiddleware(['SUPERADMIN']);

      middleware(
        mockReq as AuthenticatedRequest,
        mockRes as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalled();
    });

    test('should deny access if role is in array but not first', () => {
      mockReq.user = {
        id: 1,
        email: 'user@test.com',
        role: 'USER',
      };
      const middleware = roleMiddleware(['ADMIN', 'SUPERADMIN', 'USER']);

      middleware(
        mockReq as AuthenticatedRequest,
        mockRes as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalled();
    });
  });
});
