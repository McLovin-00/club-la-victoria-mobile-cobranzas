/**
 * Unit Tests for Auth Middleware
 */

import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { authMiddleware, optionalAuthMiddleware, AuthenticatedRequest } from '../../middlewares/auth.middleware';

// Mock dependencies
jest.mock('../../config/logger', () => ({
  AppLogger: {
    warn: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  },
}));

jest.mock('../../config/environment', () => ({
  getEnvironment: jest.fn().mockReturnValue({
    JWT_PUBLIC_KEY: `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA0Z3VS5JJcds3xfn/ygWy
5a7hRT5m0R5l8mU3m4fCqL3n9d9C2Xz3h2m0k4C6k1D6Z1wX5u1T1r5l0v2j8C7m
6n5k4o1p2q3r4s5t6u7v8w9x0y1z2a3b4c5d6e7f8g9h0i1j2k3l4m5n6o7p8q9r
0s1t2u3v4w5x6y7z8a9b0c1d2e3f4g5h6i7j8k9l0m1n2o3p4q5r6s7t8u9v0w1x
2y3z4a5b6c7d8e9f0g1h2i3j4k5l6m7n8o9p0q1r2s3t4u5v6w7x8y9z0abcdef
QIDAQAB
-----END PUBLIC KEY-----`,
    JWT_PUBLIC_KEY_PATH: '',
  }),
}));

describe('Auth Middleware', () => {
  let mockReq: Partial<AuthenticatedRequest>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;
  let mockJson: jest.Mock;
  let mockStatus: jest.Mock;

  beforeEach(() => {
    mockJson = jest.fn();
    mockStatus = jest.fn().mockReturnValue({ json: mockJson });
    mockReq = {
      headers: {},
    };
    mockRes = {
      status: mockStatus,
      json: mockJson,
    };
    mockNext = jest.fn();
    jest.clearAllMocks();
  });

  describe('authMiddleware', () => {
    test('should return 401 if no authorization header', () => {
      authMiddleware(
        mockReq as AuthenticatedRequest,
        mockRes as Response,
        mockNext
      );

      expect(mockStatus).toHaveBeenCalledWith(401);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        message: 'Token de autenticación requerido',
        error: 'MISSING_TOKEN',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    test('should return 401 if authorization header does not start with Bearer', () => {
      mockReq.headers = { authorization: 'Basic abc123' };

      authMiddleware(
        mockReq as AuthenticatedRequest,
        mockRes as Response,
        mockNext
      );

      expect(mockStatus).toHaveBeenCalledWith(401);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        message: 'Token de autenticación requerido',
        error: 'MISSING_TOKEN',
      });
    });

    test('should return 401 if token is invalid', () => {
      mockReq.headers = { authorization: 'Bearer invalid-token' };

      authMiddleware(
        mockReq as AuthenticatedRequest,
        mockRes as Response,
        mockNext
      );

      expect(mockStatus).toHaveBeenCalledWith(401);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        message: 'Token inválido',
        error: 'INVALID_TOKEN',
      });
    });

    test('should call next and attach user for valid token', () => {
      // Create a valid test token using the mock public key's matching private key
      // For testing purposes, we'll mock jwt.verify
      const mockDecoded = {
        id: 123,
        email: 'test@test.com',
        role: 'USER',
        nombre: 'Test',
        apellido: 'User',
        empresaId: 1,
        empresaNombre: 'Test Company',
      };

      jest.spyOn(jwt, 'verify').mockReturnValue(mockDecoded as any);
      mockReq.headers = { authorization: 'Bearer valid-token' };

      authMiddleware(
        mockReq as AuthenticatedRequest,
        mockRes as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalled();
      expect(mockReq.user).toEqual({
        id: 123,
        email: 'test@test.com',
        role: 'USER',
        nombre: 'Test',
        apellido: 'User',
        empresaId: 1,
        empresaNombre: 'Test Company',
      });
    });

    test('should handle userId instead of id in token', () => {
      const mockDecoded = {
        userId: 456,
        email: 'test2@test.com',
        role: 'ADMIN',
      };

      jest.spyOn(jwt, 'verify').mockReturnValue(mockDecoded as any);
      mockReq.headers = { authorization: 'Bearer valid-token' };

      authMiddleware(
        mockReq as AuthenticatedRequest,
        mockRes as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalled();
      expect(mockReq.user?.id).toBe(456);
    });

    test('should return 401 if id is not a valid number', () => {
      const mockDecoded = {
        id: 'not-a-number',
        email: 'test@test.com',
        role: 'USER',
      };

      jest.spyOn(jwt, 'verify').mockReturnValue(mockDecoded as any);
      mockReq.headers = { authorization: 'Bearer valid-token' };

      authMiddleware(
        mockReq as AuthenticatedRequest,
        mockRes as Response,
        mockNext
      );

      expect(mockStatus).toHaveBeenCalledWith(401);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        message: 'Token inválido: falta identificador de usuario',
        error: 'INVALID_TOKEN',
      });
    });

    test('should return 401 if id is undefined', () => {
      const mockDecoded = {
        email: 'test@test.com',
        role: 'USER',
      };

      jest.spyOn(jwt, 'verify').mockReturnValue(mockDecoded as any);
      mockReq.headers = { authorization: 'Bearer valid-token' };

      authMiddleware(
        mockReq as AuthenticatedRequest,
        mockRes as Response,
        mockNext
      );

      expect(mockStatus).toHaveBeenCalledWith(401);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        message: 'Token inválido: falta identificador de usuario',
        error: 'INVALID_TOKEN',
      });
    });

    test('should return 401 for TokenExpiredError', () => {
      const expiredError = new jwt.TokenExpiredError('Token expired', new Date());
      jest.spyOn(jwt, 'verify').mockImplementation(() => {
        throw expiredError;
      });
      mockReq.headers = { authorization: 'Bearer expired-token' };

      authMiddleware(
        mockReq as AuthenticatedRequest,
        mockRes as Response,
        mockNext
      );

      expect(mockStatus).toHaveBeenCalledWith(401);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        message: 'Token expirado',
        error: 'TOKEN_EXPIRED',
      });
    });

    test('should return 401 for JsonWebTokenError', () => {
      const jwtError = new jwt.JsonWebTokenError('Invalid signature');
      jest.spyOn(jwt, 'verify').mockImplementation(() => {
        throw jwtError;
      });
      mockReq.headers = { authorization: 'Bearer invalid-token' };

      authMiddleware(
        mockReq as AuthenticatedRequest,
        mockRes as Response,
        mockNext
      );

      expect(mockStatus).toHaveBeenCalledWith(401);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        message: 'Token inválido',
        error: 'INVALID_TOKEN',
      });
    });

    test('should return 500 for unexpected errors', () => {
      jest.spyOn(jwt, 'verify').mockImplementation(() => {
        throw new Error('Unexpected error');
      });
      mockReq.headers = { authorization: 'Bearer some-token' };

      authMiddleware(
        mockReq as AuthenticatedRequest,
        mockRes as Response,
        mockNext
      );

      expect(mockStatus).toHaveBeenCalledWith(500);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        message: 'Error de autenticación',
        error: 'AUTH_ERROR',
      });
    });
  });

  describe('optionalAuthMiddleware', () => {
    test('should call next even without authorization header', () => {
      optionalAuthMiddleware(
        mockReq as AuthenticatedRequest,
        mockRes as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalled();
      expect(mockReq.user).toBeUndefined();
    });

    test('should attach user for valid token', () => {
      const mockDecoded = {
        id: 789,
        email: 'optional@test.com',
        role: 'USER',
      };

      jest.spyOn(jwt, 'verify').mockReturnValue(mockDecoded as any);
      mockReq.headers = { authorization: 'Bearer valid-token' };

      optionalAuthMiddleware(
        mockReq as AuthenticatedRequest,
        mockRes as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalled();
      expect(mockReq.user?.id).toBe(789);
    });

    test('should call next even if token is invalid', () => {
      jest.spyOn(jwt, 'verify').mockImplementation(() => {
        throw new Error('Invalid token');
      });
      mockReq.headers = { authorization: 'Bearer invalid-token' };

      optionalAuthMiddleware(
        mockReq as AuthenticatedRequest,
        mockRes as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalled();
      expect(mockReq.user).toBeUndefined();
    });

    test('should not attach user if id is invalid', () => {
      const mockDecoded = {
        id: 'invalid',
        email: 'test@test.com',
        role: 'USER',
      };

      jest.spyOn(jwt, 'verify').mockReturnValue(mockDecoded as any);
      mockReq.headers = { authorization: 'Bearer valid-token' };

      optionalAuthMiddleware(
        mockReq as AuthenticatedRequest,
        mockRes as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalled();
      expect(mockReq.user).toBeUndefined();
    });
  });
});
