/**
 * Tests for permiso.routes.ts
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { UserRole } from '@prisma/client';
import { createMockRes } from '../../__tests__/helpers/testUtils';
import { getRouteHandlers } from '../../__tests__/helpers/routerTestUtils';

let validationErrors: any[] = [];
const chainFn: any = (_req: any, _res: any, next: any) => next();
chainFn.isInt = jest.fn().mockReturnValue(chainFn);
chainFn.withMessage = jest.fn().mockReturnValue(chainFn);

// Mock dependencies
jest.mock('../../config/prisma', () => ({
  prisma: {
    permiso: {
      findMany: jest.fn().mockResolvedValue([]),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    $transaction: jest.fn(),
  },
  prismaService: {
    getClient: () => ({
      permiso: {
        findMany: jest.fn().mockResolvedValue([]),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    }),
  },
}));

jest.mock('../../config/logger', () => ({
  AppLogger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

jest.mock('express-validator', () => ({
  param: jest.fn(() => chainFn),
  validationResult: jest.fn(() => ({
    isEmpty: () => validationErrors.length === 0,
    array: () => validationErrors,
  })),
}));

jest.mock('../../middlewares/platformAuth.middleware', () => ({
  authenticateUser: jest.fn((_req: any, _res: any, next: any) => next()),
  authorizeRoles: jest.fn(() => (_req: any, _res: any, next: any) => next()),
  logAction: jest.fn(() => (_req: any, _res: any, next: any) => next()),
  tenantResolver: jest.fn((_req: any, _res: any, next: any) => next()),
}));

const prismaMock = (jest.requireMock('../../config/prisma') as any).prisma;

async function runMiddlewares(handlers: Function[], req: any, res: any) {
  let idx = 0;
  const next = async () => {
    const fn = handlers[idx++];
    if (!fn) return;
    if (fn.length >= 3) {
      return fn(req, res, next);
    }
    return fn(req, res);
  };
  await next();
}

describe('permiso.routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    validationErrors = [];
  });

  describe('router exports', () => {
    it('exporta el router correctamente', async () => {
      const router = await import('../permiso.routes');
      expect(router.default).toBeDefined();
    });

    it('tiene rutas definidas', async () => {
      const router = await import('../permiso.routes');
      const routes = router.default.stack || [];
      expect(routes.length).toBeGreaterThan(0);
    });
  });

  describe('DELETE /:id', () => {
    it('retorna 400 cuando hay errores de validacion', async () => {
      const router = (await import('../permiso.routes')).default;
      const handlers = getRouteHandlers(router, 'delete', '/:id');

      validationErrors = [{ msg: 'invalid' }];
      const res = createMockRes();
      await runMiddlewares(
        handlers,
        { params: { id: '0' }, user: { userId: 1, role: UserRole.SUPERADMIN } },
        res
      );

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: false }));
    });

    it('retorna 404 si el permiso no existe', async () => {
      const router = (await import('../permiso.routes')).default;
      const handlers = getRouteHandlers(router, 'delete', '/:id');

      prismaMock.permiso.findUnique.mockResolvedValueOnce(null);
      const res = createMockRes();
      await runMiddlewares(
        handlers,
        { params: { id: '1' }, user: { userId: 1, role: UserRole.SUPERADMIN } },
        res
      );

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'Permiso no encontrado' }));
    });

    it('retorna 403 si la empresa no coincide', async () => {
      const router = (await import('../permiso.routes')).default;
      const handlers = getRouteHandlers(router, 'delete', '/:id');

      prismaMock.permiso.findUnique.mockResolvedValueOnce({
        id: 2,
        instanciaId: 7,
        instancia: { empresaId: 99 },
      });
      const res = createMockRes();
      await runMiddlewares(
        handlers,
        { params: { id: '2' }, user: { userId: 1, role: UserRole.ADMIN, empresaId: 1 } },
        res
      );

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'No tienes permisos para eliminar este permiso' })
      );
    });

    it('retorna 403 si el rol no tiene permisos', async () => {
      const router = (await import('../permiso.routes')).default;
      const handlers = getRouteHandlers(router, 'delete', '/:id');

      prismaMock.permiso.findUnique.mockResolvedValueOnce({
        id: 3,
        instanciaId: 8,
        instancia: { empresaId: 1 },
      });
      const res = createMockRes();
      await runMiddlewares(
        handlers,
        { params: { id: '3' }, user: { userId: 1, role: UserRole.ADMIN } },
        res
      );

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'No tienes permisos para eliminar permisos' })
      );
    });

    it('retorna 204 cuando elimina correctamente', async () => {
      const router = (await import('../permiso.routes')).default;
      const handlers = getRouteHandlers(router, 'delete', '/:id');

      prismaMock.permiso.findUnique.mockResolvedValueOnce({
        id: 10,
        instanciaId: 4,
        instancia: { empresaId: 1 },
      });
      prismaMock.permiso.delete.mockResolvedValueOnce({ id: 10 });

      const res = createMockRes();
      await runMiddlewares(
        handlers,
        { params: { id: '10' }, user: { userId: 1, role: UserRole.SUPERADMIN } },
        res
      );

      expect(prismaMock.permiso.delete).toHaveBeenCalledWith({ where: { id: 10 } });
      expect(res.status).toHaveBeenCalledWith(204);
      expect(res.send).toHaveBeenCalled();
    });

    it('retorna 500 cuando ocurre un error inesperado', async () => {
      const router = (await import('../permiso.routes')).default;
      const handlers = getRouteHandlers(router, 'delete', '/:id');

      prismaMock.permiso.findUnique.mockResolvedValueOnce({
        id: 11,
        instanciaId: 5,
        instancia: { empresaId: 1 },
      });
      prismaMock.permiso.delete.mockRejectedValueOnce(new Error('db fail'));

      const res = createMockRes();
      await runMiddlewares(
        handlers,
        { params: { id: '11' }, user: { userId: 1, role: UserRole.SUPERADMIN } },
        res
      );

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'Error interno del servidor' }));
    });
  });
});

