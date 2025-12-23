/**
 * Tests para Auth Middleware - Ejecuta código real
 * @jest-environment node
 */

import { Request, Response, NextFunction } from 'express';

jest.mock('../../src/config/auth', () => ({
  DocumentosAuthService: {
    isServiceEnabled: jest.fn().mockReturnValue(true),
    verifyToken: jest.fn(),
    verifyTokenRoles: jest.fn(),
    hasPermission: jest.fn(),
  },
}));

jest.mock('../../src/config/logger', () => ({
  AppLogger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

import { authenticate, authorize, AuthRequest } from '../../src/middlewares/auth.middleware';
import { DocumentosAuthService } from '../../src/config/auth';

describe('Auth Middleware', () => {
  let mockReq: Partial<AuthRequest>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    jest.clearAllMocks();
    mockReq = {
      headers: {},
      body: {},
      method: 'GET',
      url: '/api/test',
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    mockNext = jest.fn();
  });

  describe('authenticate', () => {
    it('should authenticate with valid Bearer token', async () => {
      mockReq.headers = { authorization: 'Bearer valid-token' };
      (DocumentosAuthService.verifyToken as jest.Mock).mockResolvedValue({
        userId: 1,
        email: 'test@test.com',
        role: 'ADMIN',
        empresaId: 100,
      });

      await authenticate(mockReq as AuthRequest, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockReq.user).toEqual({
        userId: 1,
        email: 'test@test.com',
        role: 'ADMIN',
        empresaId: 100,
      });
    });

    it('should return 401 when no token provided', async () => {
      await authenticate(mockReq as AuthRequest, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({ code: 'MISSING_TOKEN' })
      );
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 401 when token is invalid', async () => {
      mockReq.headers = { authorization: 'Bearer invalid-token' };
      (DocumentosAuthService.verifyToken as jest.Mock).mockResolvedValue(null);

      await authenticate(mockReq as AuthRequest, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({ code: 'INVALID_TOKEN' })
      );
    });

    it('should return 503 when service is disabled', async () => {
      (DocumentosAuthService.isServiceEnabled as jest.Mock).mockReturnValue(false);

      await authenticate(mockReq as AuthRequest, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(503);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({ code: 'SERVICE_DISABLED' })
      );
    });

    it('should accept token from body for form downloads', async () => {
      mockReq.method = 'POST';
      mockReq.url = '/api/docs/equipos/download/vigentes-form';
      mockReq.originalUrl = '/api/docs/equipos/download/vigentes-form';
      mockReq.body = { token: 'form-token' };
      (DocumentosAuthService.isServiceEnabled as jest.Mock).mockReturnValue(true);
      (DocumentosAuthService.verifyToken as jest.Mock).mockResolvedValue({
        userId: 2,
        email: 'user@test.com',
        role: 'USER',
      });

      await authenticate(mockReq as AuthRequest, mockRes as Response, mockNext);

      expect(DocumentosAuthService.verifyToken).toHaveBeenCalledWith('form-token');
      expect(mockNext).toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      mockReq.headers = { authorization: 'Bearer token' };
      (DocumentosAuthService.verifyToken as jest.Mock).mockRejectedValue(new Error('Unexpected'));

      await authenticate(mockReq as AuthRequest, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({ code: 'INTERNAL_ERROR' })
      );
    });
  });

  describe('authorize', () => {
    it('should allow access for authorized roles', async () => {
      mockReq.user = { userId: 1, email: 'admin@test.com', role: 'ADMIN' as any };
      const middleware = authorize(['ADMIN', 'SUPER_ADMIN']);

      await middleware(mockReq as AuthRequest, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should deny access for unauthorized roles', async () => {
      mockReq.user = { userId: 1, email: 'user@test.com', role: 'USER' as any };
      const middleware = authorize(['ADMIN']);

      await middleware(mockReq as AuthRequest, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 401 when user is not authenticated', async () => {
      const middleware = authorize(['ADMIN']);

      await middleware(mockReq as AuthRequest, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
    });
  });

  describe('authorization edge cases', () => {
    it('should handle empty roles array', async () => {
      mockReq.user = { userId: 1, email: 'admin@test.com', role: 'ADMIN' as any };
      const middleware = authorize([]);

      await middleware(mockReq as AuthRequest, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
    });
  });
});

