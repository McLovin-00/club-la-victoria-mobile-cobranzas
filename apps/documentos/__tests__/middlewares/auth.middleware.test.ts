import type { Request, Response, NextFunction } from 'express';

jest.mock('../../src/config/logger', () => ({
  AppLogger: { debug: jest.fn(), warn: jest.fn(), error: jest.fn(), info: jest.fn() },
}));

import { authenticate, authorize, tenantResolver, authorizeEmpresa, validate } from '../../src/middlewares/auth.middleware';
import { DocumentosAuthService } from '../../src/config/auth';

function createRes(): Response & { status: jest.Mock; json: jest.Mock } {
  const res: any = { status: jest.fn(), json: jest.fn() };
  res.status.mockImplementation(() => res);
  res.json.mockImplementation(() => res);
  return res;
}

describe('auth.middleware', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(DocumentosAuthService, 'isServiceEnabled').mockReturnValue(true);
    jest
      .spyOn(DocumentosAuthService, 'verifyToken')
      .mockResolvedValue({ userId: 1, email: 'a@b.com', role: 'ADMIN' as any, empresaId: 1 } as any);
    // En algunos entornos de test, Jest puede cargar una versión "parcial" del módulo;
    // aseguramos que el método exista para poder espiarlo.
    if (!(DocumentosAuthService as any).hasEmpresaAccess) {
      (DocumentosAuthService as any).hasEmpresaAccess = () => true;
    }
    jest.spyOn(DocumentosAuthService as any, 'hasEmpresaAccess').mockReturnValue(true);
  });

  describe('authenticate', () => {
    it('503 si servicio deshabilitado', async () => {
      (DocumentosAuthService.isServiceEnabled as unknown as jest.Mock).mockReturnValueOnce(false);
      const req: any = { headers: {}, method: 'GET' };
      const res = createRes();
      const next = jest.fn();
      await authenticate(req, res, next);
      expect(res.status).toHaveBeenCalledWith(503);
      expect(next).not.toHaveBeenCalled();
    });

    it('401 si falta token', async () => {
      const req: any = { headers: {}, method: 'GET' };
      const res = createRes();
      const next = jest.fn();
      await authenticate(req, res, next);
      expect(res.status).toHaveBeenCalledWith(401);
    });

    it('extrae token de Bearer header', async () => {
      const req: any = { headers: { authorization: 'Bearer token' }, method: 'GET' };
      const res = createRes();
      const next = jest.fn();
      await authenticate(req, res, next);
      expect(DocumentosAuthService.verifyToken).toHaveBeenCalledWith('token');
      expect(next).toHaveBeenCalled();
    });

    it('extrae token desde body en URLs permitidas', async () => {
      const req: any = {
        headers: {},
        method: 'POST',
        body: { token: 't' },
        originalUrl: '/api/docs/portal-cliente/equipos/bulk-download-form',
      };
      const res = createRes();
      const next = jest.fn();
      await authenticate(req, res, next);
      expect(DocumentosAuthService.verifyToken).toHaveBeenCalledWith('t');
      expect(next).toHaveBeenCalled();
    });

    it('no acepta token en body si URL no está whitelist', async () => {
      const req: any = { headers: {}, method: 'POST', body: { token: 't' }, originalUrl: '/api/docs/other' };
      const res = createRes();
      const next = jest.fn();
      await authenticate(req, res, next);
      expect(res.status).toHaveBeenCalledWith(401);
      expect(DocumentosAuthService.verifyToken).not.toHaveBeenCalled();
    });

    it('401 si verifyToken devuelve null', async () => {
      (DocumentosAuthService.verifyToken as unknown as jest.Mock).mockResolvedValueOnce(null);
      const req: any = { headers: { authorization: 'Bearer token' }, method: 'GET' };
      const res = createRes();
      const next = jest.fn();
      await authenticate(req, res, next);
      expect(res.status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
    });

    it('500 en excepción', async () => {
      (DocumentosAuthService.verifyToken as unknown as jest.Mock).mockRejectedValueOnce(new Error('boom'));
      const req: any = { headers: { authorization: 'Bearer token' }, method: 'GET' };
      const res = createRes();
      const next = jest.fn();
      await authenticate(req, res, next);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('authorize', () => {
    it('401 si no hay user', () => {
      const req: any = { user: undefined };
      const res = createRes();
      const next = jest.fn();
      authorize(['ADMIN'])(req, res, next);
      expect(res.status).toHaveBeenCalledWith(401);
    });

    it('403 si rol no permitido', () => {
      const req: any = { user: { userId: 1, role: 'TRANSPORTISTA' } };
      const res = createRes();
      const next = jest.fn();
      authorize(['ADMIN'])(req, res, next);
      expect(res.status).toHaveBeenCalledWith(403);
      expect(next).not.toHaveBeenCalled();
    });

    it('next si rol permitido', () => {
      const req: any = { user: { userId: 1, role: 'ADMIN' } };
      const res = createRes();
      const next = jest.fn();
      authorize(['ADMIN'])(req, res, next);
      expect(next).toHaveBeenCalled();
    });

    it('500 en excepción', () => {
      const req: any = new Proxy(
        {},
        {
          get() {
            throw new Error('boom');
          },
        }
      );
      const res = createRes();
      const next = jest.fn();
      authorize(['ADMIN'])(req as any, res, next);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('tenantResolver', () => {
    it('401 si no hay user', () => {
      const req: any = { user: undefined, headers: {}, query: {} };
      const res = createRes();
      const next = jest.fn();
      tenantResolver(req, res, next);
      expect(res.status).toHaveBeenCalledWith(401);
    });

    it('SUPERADMIN puede setear tenant por header', () => {
      const req: any = { user: { role: 'SUPERADMIN', empresaId: 1 }, headers: { 'x-tenant-id': '77' }, query: {} };
      const res = createRes();
      const next = jest.fn();
      tenantResolver(req, res, next);
      expect(req.tenantId).toBe(77);
      expect(next).toHaveBeenCalled();
    });

    it('ADMIN_INTERNO puede setear tenant por query', () => {
      const req: any = { user: { role: 'ADMIN_INTERNO', empresaId: 1 }, headers: {}, query: { tenantId: '88' } };
      const res = createRes();
      const next = jest.fn();
      tenantResolver(req, res, next);
      expect(req.tenantId).toBe(88);
      expect(next).toHaveBeenCalled();
    });

    it('rol normal usa empresaId numérico; 400 si falta', () => {
      const req: any = { user: { role: 'ADMIN', empresaId: 1 }, headers: {}, query: {} };
      const res = createRes();
      const next = jest.fn();
      tenantResolver(req, res, next);
      expect(req.tenantId).toBe(1);
      expect(next).toHaveBeenCalled();

      const req2: any = { user: { role: 'ADMIN', empresaId: 'x' }, headers: {}, query: {} };
      const res2 = createRes();
      const next2 = jest.fn();
      tenantResolver(req2, res2, next2);
      expect(res2.status).toHaveBeenCalledWith(400);
    });

    it('500 en excepción', () => {
      const req: any = new Proxy(
        {},
        {
          get() {
            throw new Error('boom');
          },
        }
      );
      const res = createRes();
      const next = jest.fn();
      tenantResolver(req, res, next);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('authorizeEmpresa', () => {
    it('401 si no hay user', () => {
      const req: any = { user: undefined, params: { dadorId: '1' }, body: {}, query: {} };
      const res = createRes();
      const next = jest.fn();
      authorizeEmpresa(req, res, next);
      expect(res.status).toHaveBeenCalledWith(401);
    });

    it('400 si falta dadorId', () => {
      const req: any = { user: { userId: 1, empresaId: 1 }, params: {}, body: {}, query: {} };
      const res = createRes();
      const next = jest.fn();
      authorizeEmpresa(req, res, next);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('403 si no tiene acceso', () => {
      (DocumentosAuthService.hasEmpresaAccess as unknown as jest.Mock).mockReturnValueOnce(false);
      const req: any = { user: { userId: 1, empresaId: 1 }, params: { dadorId: '9' }, body: {}, query: {} };
      const res = createRes();
      const next = jest.fn();
      authorizeEmpresa(req, res, next);
      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('next si tiene acceso', () => {
      const req: any = { user: { userId: 1, empresaId: 1 }, params: { dadorId: '9' }, body: {}, query: {} };
      const res = createRes();
      const next = jest.fn();
      authorizeEmpresa(req, res, next);
      expect(next).toHaveBeenCalled();
    });

    it('500 en excepción', () => {
      (DocumentosAuthService.hasEmpresaAccess as unknown as jest.Mock).mockImplementationOnce(() => {
        throw new Error('boom');
      });
      const req: any = { user: { userId: 1, empresaId: 1 }, params: { dadorId: '9' }, body: {}, query: {} };
      const res = createRes();
      const next = jest.fn();
      authorizeEmpresa(req, res, next);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('validate', () => {
    it('400 si schema falla', () => {
      const schema = { safeParse: () => ({ success: false, error: { format: () => ({ x: 1 }) } }) };
      const req: any = { body: {}, query: {}, params: {} };
      const res = createRes();
      const next = jest.fn();
      validate(schema)(req as Request, res, next as NextFunction);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('setea body/query/params validados', () => {
      const schema = {
        safeParse: () => ({ success: true, data: { body: { a: 1 }, query: { q: 'x' }, params: { id: 1 } } }),
      };
      const req: any = { body: {}, query: {}, params: {} };
      const res = createRes();
      const next = jest.fn();
      validate(schema)(req as Request, res, next as NextFunction);
      expect(req.body).toEqual({ a: 1 });
      expect((req as any).query).toEqual({ q: 'x' });
      expect((req as any).params).toEqual({ id: 1 });
      expect(next).toHaveBeenCalled();
    });

    it('500 si schema.safeParse throw', () => {
      const schema = { safeParse: () => { throw new Error('boom'); } };
      const req: any = { body: {}, query: {}, params: {} };
      const res = createRes();
      const next = jest.fn();
      validate(schema)(req as Request, res, next as NextFunction);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });
});

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

