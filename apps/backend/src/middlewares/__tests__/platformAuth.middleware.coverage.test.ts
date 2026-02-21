/**
 * Tests de cobertura para platformAuth.middleware.ts
 * @jest-environment node
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { createMockRes, createNext } from '../../__tests__/helpers/testUtils';
import { UserRole } from '@prisma/client';

const mockAppLogger = {
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

const mockVerifyToken = jest.fn() as jest.Mock;
// @ts-expect-error - jest.Mock infers never for mockResolvedValue in strict mode
const mockAuditLogCreate = (jest.fn() as jest.Mock).mockResolvedValue({ id: 1 });
const mockPrisma = {
  auditLog: {
    create: mockAuditLogCreate,
  },
};

jest.mock('../../config/logger', () => ({
  AppLogger: mockAppLogger,
}));

jest.mock('../../services/platformAuth.service', () => ({
  PlatformAuthService: {
    verifyToken: mockVerifyToken,
  },
}));

jest.mock('../../config/prisma', () => ({
  prismaService: {
    getClient: () => mockPrisma,
  },
}));

describe('platformAuth.middleware - Coverage Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('authenticateUser', () => {
    it('debe obtener token de header Authorization Bearer', async () => {
      // @ts-expect-error - jest.Mock infers never for mockResolvedValue in strict mode
      (mockVerifyToken as jest.Mock).mockResolvedValue({
        userId: 1,
        email: 'test@example.com',
        role: 'SUPERADMIN',
        empresaId: null,
      } as any);

      const { authenticateUser } = await import('../platformAuth.middleware');
      const req: any = {
        headers: { authorization: 'Bearer valid-token-123' },
        cookies: {},
      };
      const res = createMockRes();
      const next = createNext();

      await authenticateUser(req, res, next);

      expect(mockVerifyToken).toHaveBeenCalledWith('valid-token-123');
      expect(req.user).toBeDefined();
      expect(req.platformUser).toBeDefined();
    });

    it('debe obtener token de cookie platformToken', async () => {
      // @ts-expect-error - jest.Mock infers never for mockResolvedValue in strict mode
      (mockVerifyToken as jest.Mock).mockResolvedValue({
        userId: 2,
        email: 'user@example.com',
        role: 'ADMIN',
        empresaId: 1,
      } as any);

      const { authenticateUser } = await import('../platformAuth.middleware');
      const req: any = {
        headers: {},
        cookies: { platformToken: 'cookie-token-456' },
      };
      const res = createMockRes();
      const next = createNext();

      await authenticateUser(req, res, next);

      expect(mockVerifyToken).toHaveBeenCalledWith('cookie-token-456');
      expect(req.user).toBeDefined();
    });

    it('debe priorizar header sobre cookie', async () => {
      // @ts-expect-error - jest.Mock infers never for mockResolvedValue in strict mode
      (mockVerifyToken as jest.Mock).mockResolvedValue({
        userId: 3,
        email: 'user3@example.com',
        role: 'OPERATOR',
        empresaId: 2,
      } as any);

      const { authenticateUser } = await import('../platformAuth.middleware');
      const req: any = {
        headers: { authorization: 'Bearer header-token' },
        cookies: { platformToken: 'cookie-token' },
      };
      const res = createMockRes();
      const next = createNext();

      await authenticateUser(req, res, next);

      expect(mockVerifyToken).toHaveBeenCalledWith('header-token');
      expect(mockVerifyToken).not.toHaveBeenCalledWith('cookie-token');
    });

    it('debe retornar 401 si no hay token', async () => {
      const { authenticateUser } = await import('../platformAuth.middleware');
      const req: any = {
        headers: {},
        cookies: {},
      };
      const res = createMockRes();
      const next = createNext();

      await authenticateUser(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'Token de autenticación requerido',
          code: 'MISSING_TOKEN',
        })
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('debe retornar 401 si token es inválido', async () => {
      // @ts-expect-error - jest.Mock infers never for mockResolvedValue in strict mode
      (mockVerifyToken as jest.Mock).mockResolvedValue(null);

      const { authenticateUser } = await import('../platformAuth.middleware');
      const req: any = {
        headers: { authorization: 'Bearer invalid-token' },
        cookies: {},
      };
      const res = createMockRes();
      const next = createNext();

      await authenticateUser(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'Token inválido o expirado',
          code: 'INVALID_TOKEN',
        })
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('debe adjuntar payload a req.user', async () => {
      const payload = {
        userId: 10,
        email: 'admin@example.com',
        role: 'ADMIN',
        empresaId: 5,
      };
      // @ts-expect-error - jest.Mock infers never for mockResolvedValue in strict mode
      (mockVerifyToken as jest.Mock).mockResolvedValue(payload);

      const { authenticateUser } = await import('../platformAuth.middleware');
      const req: any = {
        headers: { authorization: 'Bearer test-token' },
        cookies: {},
      };
      const res = createMockRes();
      const next = createNext();

      await authenticateUser(req, res, next);

      expect(req.user).toEqual(payload);
    });

    it('debe adjuntar payload a req.platformUser para compatibilidad', async () => {
      const payload = {
        userId: 20,
        email: 'compat@example.com',
        role: 'SUPERADMIN',
        empresaId: null,
      };
      // @ts-expect-error - jest.Mock infers never for mockResolvedValue in strict mode
      (mockVerifyToken as jest.Mock).mockResolvedValue(payload);

      const { authenticateUser } = await import('../platformAuth.middleware');
      const req: any = {
        headers: { authorization: 'Bearer compat-token' },
        cookies: {},
      };
      const res = createMockRes();
      const next = createNext();

      await authenticateUser(req, res, next);

      expect(req.platformUser).toEqual(payload);
    });

    it('debe manejar errores y retornar 500', async () => {
      // @ts-expect-error - jest.Mock infers never for mockRejectedValue in strict mode
      (mockVerifyToken as jest.Mock).mockRejectedValue(new Error('Database error'));

      const { authenticateUser } = await import('../platformAuth.middleware');
      const req: any = {
        headers: { authorization: 'Bearer error-token' },
        cookies: {},
      };
      const res = createMockRes();
      const next = createNext();

      await authenticateUser(req, res, next);

      expect(mockAppLogger.error).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'Error interno del servidor',
          code: 'INTERNAL_ERROR',
        })
      );
    });
  });

  describe('authorizeRoles', () => {
    it('debe retornar 401 si no hay user', () => {
      const { authorizeRoles } = require('../platformAuth.middleware');
      const req: any = {};
      const res = createMockRes();
      const next = createNext();

      authorizeRoles(['SUPERADMIN'])(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'Usuario no autenticado',
          code: 'NOT_AUTHENTICATED',
        })
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('debe permitir si role está en allowedRoles', () => {
      const { authorizeRoles } = require('../platformAuth.middleware');
      const req: any = {
        user: { role: 'SUPERADMIN', userId: 1 },
      };
      const res = createMockRes();
      const next = createNext();

      authorizeRoles(['SUPERADMIN'])(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('debe denegar si role NO está en allowedRoles', () => {
      const { authorizeRoles } = require('../platformAuth.middleware');
      const req: any = {
        user: { role: 'OPERATOR', userId: 2 },
      };
      const res = createMockRes();
      const next = createNext();

      authorizeRoles(['SUPERADMIN'])(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'Permisos insuficientes',
          code: 'INSUFFICIENT_PERMISSIONS',
        })
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('debe soportar múltiples roles permitidos', () => {
      const { authorizeRoles } = require('../platformAuth.middleware');
      const req: any = {
        user: { role: 'ADMIN', userId: 3 },
      };
      const res = createMockRes();
      const next = createNext();

      authorizeRoles(['SUPERADMIN', 'ADMIN', 'OPERATOR'])(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('debe permitir con UserRole enum', () => {
      const { authorizeRoles } = require('../platformAuth.middleware');
      const req: any = {
        user: { role: UserRole.ADMIN, userId: 4 },
      };
      const res = createMockRes();
      const next = createNext();

      authorizeRoles([UserRole.SUPERADMIN, UserRole.ADMIN])(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('debe loggear verificación de rol', () => {
      const { authorizeRoles } = require('../platformAuth.middleware');
      const req: any = {
        user: { role: 'ADMIN', userId: 5 },
      };
      const res = createMockRes();
      const next = createNext();

      authorizeRoles(['SUPERADMIN', 'ADMIN'])(req, res, next);

      expect(mockAppLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Verificando rol'),
        expect.objectContaining({
          userId: 5,
          userRole: 'ADMIN',
          allowedRoles: ['SUPERADMIN', 'ADMIN'],
        })
      );
    });

    it('debe manejar errores y retornar 500', () => {
      const { authorizeRoles } = require('../platformAuth.middleware');
      const req: any = {
        user: { role: 'TEST' as any, userId: 6 },
      };
      const res = createMockRes();
      const next = createNext();

      const middleware = authorizeRoles(['SUPERADMIN']);

      res.status = jest.fn().mockImplementation(() => {
        throw new Error('Test error');
      });

      try {
        middleware(req, res, next);
      } catch (_e) {
        // Expected to throw
      }

      expect(mockAppLogger.error).toHaveBeenCalled();
    });
  });

  describe('authorizeEmpresaAccess', () => {
    it('debe permitir acceso a SUPERADMIN sin importar empresa', () => {
      const { authorizeEmpresaAccess } = require('../platformAuth.middleware');
      const req: any = {
        user: { role: 'SUPERADMIN', userId: 1, empresaId: null },
        params: { empresaId: '999' },
        body: {},
        query: {},
      };
      const res = createMockRes();
      const next = createNext();

      authorizeEmpresaAccess(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('debe permitir a ADMIN si coincide empresaId', () => {
      const { authorizeEmpresaAccess } = require('../platformAuth.middleware');
      const req: any = {
        user: { role: 'ADMIN', userId: 2, empresaId: 10 },
        params: { empresaId: '10' },
        body: {},
        query: {},
      };
      const res = createMockRes();
      const next = createNext();

      authorizeEmpresaAccess(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('debe permitir a OPERATOR si coincide empresaId', () => {
      const { authorizeEmpresaAccess } = require('../platformAuth.middleware');
      const req: any = {
        user: { role: 'OPERATOR', userId: 3, empresaId: 20 },
        params: { empresaId: '20' },
        body: {},
        query: {},
      };
      const res = createMockRes();
      const next = createNext();

      authorizeEmpresaAccess(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('debe denegar a ADMIN si no tiene empresa asignada', () => {
      const { authorizeEmpresaAccess } = require('../platformAuth.middleware');
      const req: any = {
        user: { role: 'ADMIN', userId: 4, empresaId: null },
        params: { empresaId: '5' },
        body: {},
        query: {},
      };
      const res = createMockRes();
      const next = createNext();

      authorizeEmpresaAccess(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'Usuario no asociado a ninguna empresa',
          code: 'NO_EMPRESA_ASSIGNED',
        })
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('debe denegar a OPERATOR si no tiene empresa asignada', () => {
      const { authorizeEmpresaAccess } = require('../platformAuth.middleware');
      const req: any = {
        user: { role: 'OPERATOR', userId: 5, empresaId: null },
        params: { empresaId: '5' },
        body: {},
        query: {},
      };
      const res = createMockRes();
      const next = createNext();

      authorizeEmpresaAccess(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 'NO_EMPRESA_ASSIGNED',
        })
      );
    });

    it('debe denegar acceso a empresa diferente del usuario', () => {
      const { authorizeEmpresaAccess } = require('../platformAuth.middleware');
      const req: any = {
        user: { role: 'ADMIN', userId: 6, empresaId: 10 },
        params: { empresaId: '99' },
        body: {},
        query: {},
      };
      const res = createMockRes();
      const next = createNext();

      authorizeEmpresaAccess(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Acceso denegado a la empresa solicitada',
          code: 'EMPRESA_ACCESS_DENIED',
        })
      );
      expect(mockAppLogger.warn).toHaveBeenCalled();
    });

    it('debe leer empresaId de params', () => {
      const { authorizeEmpresaAccess } = require('../platformAuth.middleware');
      const req: any = {
        user: { role: 'ADMIN', userId: 7, empresaId: 30 },
        params: { empresaId: '30' },
        body: {},
        query: {},
      };
      const res = createMockRes();
      const next = createNext();

      authorizeEmpresaAccess(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('debe leer empresaId de body', () => {
      const { authorizeEmpresaAccess } = require('../platformAuth.middleware');
      const req: any = {
        user: { role: 'ADMIN', userId: 8, empresaId: 40 },
        params: {},
        body: { empresaId: 40 },
        query: {},
      };
      const res = createMockRes();
      const next = createNext();

      authorizeEmpresaAccess(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('debe leer empresaId de query', () => {
      const { authorizeEmpresaAccess } = require('../platformAuth.middleware');
      const req: any = {
        user: { role: 'ADMIN', userId: 9, empresaId: 50 },
        params: {},
        body: {},
        query: { empresaId: '50' },
      };
      const res = createMockRes();
      const next = createNext();

      authorizeEmpresaAccess(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('debe manejar casos normales sin errores', () => {
      const { authorizeEmpresaAccess } = require('../platformAuth.middleware');
      const req: any = {
        user: { role: 'ADMIN', userId: 10, empresaId: 5 },
        params: {},
        body: {},
        query: {},
      };
      const res = createMockRes();
      const next = createNext();

      authorizeEmpresaAccess(req, res, next);

      expect(next).toHaveBeenCalled();
    });
  });

  describe('tenantResolver', () => {
    it('debe retornar null si no hay user', () => {
      const { tenantResolver } = require('../platformAuth.middleware');
      const req: any = {};
      const res = createMockRes();
      const next = createNext();

      tenantResolver(req, res, next);

      expect(req.tenantId).toBeNull();
      expect(next).toHaveBeenCalled();
    });

    it('SUPERADMIN: debe usar header x-empresa-id si está presente', () => {
      const { tenantResolver } = require('../platformAuth.middleware');
      const req: any = {
        user: { role: 'SUPERADMIN' },
        headers: { 'x-empresa-id': '5' },
        query: {},
        body: {},
      };
      const res = createMockRes();
      const next = createNext();

      tenantResolver(req, res, next);

      expect(req.tenantId).toBe(5);
    });

    it('SUPERADMIN: debe usar query.empresaId si no hay header', () => {
      const { tenantResolver } = require('../platformAuth.middleware');
      const req: any = {
        user: { role: 'SUPERADMIN' },
        headers: {},
        query: { empresaId: '10' },
        body: {},
      };
      const res = createMockRes();
      const next = createNext();

      tenantResolver(req, res, next);

      expect(req.tenantId).toBe(10);
    });

    it('SUPERADMIN: debe usar body.empresaId si no hay header/query', () => {
      const { tenantResolver } = require('../platformAuth.middleware');
      const req: any = {
        user: { role: 'SUPERADMIN' },
        headers: {},
        query: {},
        body: { empresaId: '15' },
      };
      const res = createMockRes();
      const next = createNext();

      tenantResolver(req, res, next);

      expect(req.tenantId).toBe(15);
    });

    it('SUPERADMIN: debe retornar null si no hay selección', () => {
      const { tenantResolver } = require('../platformAuth.middleware');
      const req: any = {
        user: { role: 'SUPERADMIN' },
        headers: {},
        query: {},
        body: {},
      };
      const res = createMockRes();
      const next = createNext();

      tenantResolver(req, res, next);

      expect(req.tenantId).toBeNull();
    });

    it('SUPERADMIN: debe ignorar valores no numéricos en header', () => {
      const { tenantResolver } = require('../platformAuth.middleware');
      const req: any = {
        user: { role: 'SUPERADMIN' },
        headers: { 'x-empresa-id': 'abc' },
        query: {},
        body: {},
      };
      const res = createMockRes();
      const next = createNext();

      tenantResolver(req, res, next);

      expect(req.tenantId).toBeNull();
    });

    it('SUPERADMIN: debe ignorar valores <= 0', () => {
      const { tenantResolver } = require('../platformAuth.middleware');
      const req: any = {
        user: { role: 'SUPERADMIN' },
        headers: { 'x-empresa-id': '0' },
        query: {},
        body: {},
      };
      const res = createMockRes();
      const next = createNext();

      tenantResolver(req, res, next);

      expect(req.tenantId).toBeNull();
    });

    it('ADMIN: debe usar empresaId del token', () => {
      const { tenantResolver } = require('../platformAuth.middleware');
      const req: any = {
        user: { role: 'ADMIN', empresaId: 100 },
        headers: { 'x-empresa-id': '999' },
        query: {},
        body: {},
      };
      const res = createMockRes();
      const next = createNext();

      tenantResolver(req, res, next);

      expect(req.tenantId).toBe(100);
    });

    it('OPERATOR: debe usar empresaId del token', () => {
      const { tenantResolver } = require('../platformAuth.middleware');
      const req: any = {
        user: { role: 'OPERATOR', empresaId: 200 },
        headers: {},
        query: { empresaId: '999' },
        body: {},
      };
      const res = createMockRes();
      const next = createNext();

      tenantResolver(req, res, next);

      expect(req.tenantId).toBe(200);
    });

    it('debe manejar errores y continuar con tenantId null', () => {
      const { tenantResolver } = require('../platformAuth.middleware');
      const req: any = {
        user: { role: 'ADMIN' },
        headers: {},
        query: {},
        body: {},
      };
      const res = createMockRes();
      const next = createNext();

      const middleware = tenantResolver;

      req.body = { get: () => { throw new Error('Test'); } };

      middleware(req, res, next);

      expect(req.tenantId).toBeNull();
      expect(next).toHaveBeenCalled();
    });
  });

  describe('optionalAuth', () => {
    it('debe continuar sin user si no hay token', async () => {
      const { optionalAuth } = await import('../platformAuth.middleware');
      const req: any = {
        headers: {},
        cookies: {},
      };
      const res = createMockRes();
      const next = createNext();

      await optionalAuth(req, res, next);

      expect(req.user).toBeUndefined();
      expect(next).toHaveBeenCalled();
    });

    it('debe intentar obtener token de header', async () => {
      // @ts-expect-error - jest.Mock infers never for mockResolvedValue in strict mode
      (mockVerifyToken as jest.Mock).mockResolvedValue({
        userId: 1,
        email: 'test@example.com',
        role: 'SUPERADMIN',
        empresaId: null,
      });

      const { optionalAuth } = await import('../platformAuth.middleware');
      const req: any = {
        headers: { authorization: 'Bearer token-123' },
        cookies: {},
      };
      const res = createMockRes();
      const next = createNext();

      await optionalAuth(req, res, next);

      expect(mockVerifyToken).toHaveBeenCalledWith('token-123');
      expect(req.user).toBeDefined();
    });

    it('debe intentar obtener token de cookie', async () => {
      // @ts-expect-error - jest.Mock infers never for mockResolvedValue in strict mode
      (mockVerifyToken as jest.Mock).mockResolvedValue({
        userId: 2,
        email: 'cookie@example.com',
        role: 'ADMIN',
        empresaId: 1,
      });

      const { optionalAuth } = await import('../platformAuth.middleware');
      const req: any = {
        headers: {},
        cookies: { platformToken: 'cookie-token' },
      };
      const res = createMockRes();
      const next = createNext();

      await optionalAuth(req, res, next);

      expect(mockVerifyToken).toHaveBeenCalledWith('cookie-token');
      expect(req.user).toBeDefined();
    });

    it('debe adjuntar user si token es válido', async () => {
      const payload = {
        userId: 10,
        email: 'valid@example.com',
        role: 'OPERATOR',
        empresaId: 5,
      };
      // @ts-expect-error - jest.Mock infers never for mockResolvedValue in strict mode
      (mockVerifyToken as jest.Mock).mockResolvedValue(payload);

      const { optionalAuth } = await import('../platformAuth.middleware');
      const req: any = {
        headers: { authorization: 'Bearer valid-token' },
        cookies: {},
      };
      const res = createMockRes();
      const next = createNext();

      await optionalAuth(req, res, next);

      expect(req.user).toEqual(payload);
      expect(next).toHaveBeenCalled();
    });

    it('debe continuar sin user si token es inválido', async () => {
      // @ts-expect-error - jest.Mock infers never for mockResolvedValue in strict mode
      (mockVerifyToken as jest.Mock).mockResolvedValue(null);

      const { optionalAuth } = await import('../platformAuth.middleware');
      const req: any = {
        headers: { authorization: 'Bearer invalid' },
        cookies: {},
      };
      const res = createMockRes();
      const next = createNext();

      await optionalAuth(req, res, next);

      expect(req.user).toBeUndefined();
      expect(next).toHaveBeenCalled();
    });

    it('debe manejar errores y continuar', async () => {
      // @ts-expect-error - jest.Mock infers never for mockRejectedValue in strict mode
      (mockVerifyToken as jest.Mock).mockRejectedValue(new Error('Validation error'));

      const { optionalAuth } = await import('../platformAuth.middleware');
      const req: any = {
        headers: { authorization: 'Bearer error' },
        cookies: {},
      };
      const res = createMockRes();
      const next = createNext();

      await optionalAuth(req, res, next);

      expect(mockAppLogger.warn).toHaveBeenCalled();
      expect(req.user).toBeUndefined();
      expect(next).toHaveBeenCalled();
    });
  });

  describe('logAction', () => {
    it('debe continuar sin log si no hay user', async () => {
      const { logAction } = await import('../platformAuth.middleware');
      const req: any = {
        user: undefined,
        params: {},
        method: 'GET',
        path: '/api/test',
        get: jest.fn(),
        ip: '127.0.0.1',
      };
      const res = createMockRes();
      const next = createNext();

      await logAction('TEST_ACTION')(req, res, next);

      expect(mockAuditLogCreate).not.toHaveBeenCalled();
      expect(next).toHaveBeenCalled();
    });

    it('debe crear auditLog en DB con user autenticado', async () => {
      const { logAction } = await import('../platformAuth.middleware');
      const req: any = {
        user: {
          userId: 1,
          email: 'test@example.com',
          role: 'ADMIN',
        },
        params: { instanceId: '5' },
        method: 'POST',
        path: '/api/create',
        get: jest.fn(() => 'Mozilla/5.0'),
        ip: '192.168.1.1',
      };
      const res = createMockRes();
      const next = createNext();

      await logAction('CREATE_ACTION')(req, res, next);

      expect(mockAuditLogCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            accion: 'CREATE_ACTION',
            platformAdminId: 1,
          })
        })
      );
      expect(next).toHaveBeenCalled();
    });

    it('debe manejar errores de DB sin bloquear el flujo', async () => {
      // @ts-expect-error - jest.Mock infers never for mockRejectedValue in strict mode
      (mockAuditLogCreate as jest.Mock).mockRejectedValue(new Error('DB connection failed'));

      const { logAction } = await import('../platformAuth.middleware');
      const req: any = {
        user: {
          userId: 5,
          email: 'db-error@example.com',
          role: 'SUPERADMIN',
        },
        params: {},
        method: 'POST',
        path: '/api/error',
        get: jest.fn(),
        ip: '198.51.100.1',
      };
      const res = createMockRes();
      const next = createNext();

      await logAction('ERROR_ACTION')(req, res, next);

      expect(mockAppLogger.error).toHaveBeenCalled();
      expect(next).toHaveBeenCalled();
    });
  });

  describe('module exports', () => {
    it('debe exportar todos los middlewares', async () => {
      const module = await import('../platformAuth.middleware');

      expect(module.authenticateUser).toBeDefined();
      expect(module.authorizeRoles).toBeDefined();
      expect(module.authorizeEmpresaAccess).toBeDefined();
      expect(module.tenantResolver).toBeDefined();
      expect(module.optionalAuth).toBeDefined();
      expect(module.logAction).toBeDefined();
    });
  });
});
