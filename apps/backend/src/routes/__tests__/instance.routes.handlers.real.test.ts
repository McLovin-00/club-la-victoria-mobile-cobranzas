/**
 * Cubre handlers inline de instance.routes.ts (permisos/users/available/audit-logs).
 * @jest-environment node
 */

import { createMockRes } from '../../__tests__/helpers/testUtils';
import { getRouteHandlers } from '../../__tests__/helpers/routerTestUtils';
import { UserRole } from '@prisma/client';

jest.mock('../../controllers/instance.controller', () => ({
  getInstances: jest.fn(),
  getInstanceById: jest.fn(),
  createInstance: jest.fn(),
  updateInstance: jest.fn(),
  deleteInstance: jest.fn(),
  getInstanceStats: jest.fn(),
  changeInstanceEstado: jest.fn(),
}));

jest.mock('../../middlewares/platformAuth.middleware', () => ({
  authenticateUser: (_req: any, _res: any, next: any) => next(),
  authorizeRoles: () => (_req: any, _res: any, next: any) => next(),
}));

jest.mock('../../config/logger', () => ({
  AppLogger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

let validationErrors: any[] = [];
// express-validator chains are middleware functions with chainable methods
const chainFn: any = (_req: any, _res: any, next: any) => next();
const chain: any = new Proxy(chainFn, {
  get: (t: any, prop: any) => {
    if (prop === 'length') return t.length;
    if (prop === 'name') return t.name;
    return () => chain;
  },
});
jest.mock('express-validator', () => ({
  body: () => chain,
  query: () => chain,
  param: () => chain,
  validationResult: () => ({
    isEmpty: () => validationErrors.length === 0,
    array: () => validationErrors,
  }),
}));

const instanceSvc = {
  findById: jest.fn(),
};
jest.mock('../../services/instance.service', () => ({
  InstanceService: { getInstance: () => instanceSvc },
}));

const prisma = {
  permiso: { findMany: jest.fn(), findFirst: jest.fn(), create: jest.fn() },
  endUser: { findUnique: jest.fn(), findMany: jest.fn() },
};
jest.mock('../../config/prisma', () => ({
  prismaService: { getClient: () => prisma },
}));

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

describe('instance.routes inline handlers (real)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    validationErrors = [];
  });

  it('GET /:id/permisos returns 400 on validation errors', async () => {
    const router = (await import('../instance.routes')).default;
    const handlers = getRouteHandlers(router, 'get', '/:id/permisos');
    validationErrors = [{ msg: 'bad' }];
    const res = createMockRes();
    await runMiddlewares(handlers, { params: { id: '1' }, user: { userId: 1, role: UserRole.SUPERADMIN } }, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('GET /:id/permisos -> 404/403/200', async () => {
    const router = (await import('../instance.routes')).default;
    const handlers = getRouteHandlers(router, 'get', '/:id/permisos');

    instanceSvc.findById.mockResolvedValueOnce(null);
    const res0 = createMockRes();
    await runMiddlewares(handlers, { params: { id: '1' }, user: { userId: 1, role: UserRole.SUPERADMIN } }, res0);
    expect(res0.status).toHaveBeenCalledWith(404);

    instanceSvc.findById.mockResolvedValueOnce({ id: 1, empresaId: 2 });
    const res1 = createMockRes();
    await runMiddlewares(handlers, { params: { id: '1' }, user: { userId: 1, role: UserRole.ADMIN, empresaId: 1 } }, res1);
    expect(res1.status).toHaveBeenCalledWith(403);

    instanceSvc.findById.mockResolvedValueOnce({ id: 1, empresaId: 2 });
    prisma.permiso.findMany.mockResolvedValueOnce([{ id: 1 }]);
    const res2 = createMockRes();
    await runMiddlewares(handlers, { params: { id: '1' }, user: { userId: 1, role: UserRole.SUPERADMIN } }, res2);
    expect(res2.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });

  it('POST /:id/permisos covers validation + permission + existing + create + P2002', async () => {
    const router = (await import('../instance.routes')).default;
    const handlers = getRouteHandlers(router, 'post', '/:id/permisos');

    // validation error
    validationErrors = [{ msg: 'bad' }];
    const res0 = createMockRes();
    await runMiddlewares(handlers, { params: { id: '1' }, body: {}, user: { userId: 1, role: UserRole.SUPERADMIN } }, res0);
    expect(res0.status).toHaveBeenCalledWith(400);

    validationErrors = [];
    // instance missing
    instanceSvc.findById.mockResolvedValueOnce(null);
    const res1 = createMockRes();
    await runMiddlewares(handlers, { params: { id: '1' }, body: { userId: 1 }, user: { userId: 1, role: UserRole.SUPERADMIN } }, res1);
    expect(res1.status).toHaveBeenCalledWith(404);

    // forbidden by empresa mismatch
    instanceSvc.findById.mockResolvedValueOnce({ id: 1, empresaId: 2 });
    const res2 = createMockRes();
    await runMiddlewares(handlers, { params: { id: '1' }, body: { userId: 1 }, user: { userId: 1, role: UserRole.ADMIN, empresaId: 1 } }, res2);
    expect(res2.status).toHaveBeenCalledWith(403);

    // target user missing
    instanceSvc.findById.mockResolvedValueOnce({ id: 1, empresaId: 1 });
    prisma.endUser.findUnique.mockResolvedValueOnce(null);
    const res3 = createMockRes();
    await runMiddlewares(handlers, { params: { id: '1' }, body: { userId: 99 }, user: { userId: 1, role: UserRole.ADMIN, empresaId: 1 } }, res3);
    expect(res3.status).toHaveBeenCalledWith(404);

    // target user other empresa
    instanceSvc.findById.mockResolvedValueOnce({ id: 1, empresaId: 1 });
    prisma.endUser.findUnique.mockResolvedValueOnce({ id: 2, email: 'x', empresaId: 2 });
    const res4 = createMockRes();
    await runMiddlewares(handlers, { params: { id: '1' }, body: { userId: 2 }, user: { userId: 1, role: UserRole.ADMIN, empresaId: 1 } }, res4);
    expect(res4.status).toHaveBeenCalledWith(403);

    // existing permiso
    instanceSvc.findById.mockResolvedValueOnce({ id: 1, empresaId: 1 });
    prisma.endUser.findUnique.mockResolvedValueOnce({ id: 2, email: 'x', empresaId: 1 });
    prisma.permiso.findFirst.mockResolvedValueOnce({ id: 1 });
    const res5 = createMockRes();
    await runMiddlewares(handlers, { params: { id: '1' }, body: { userId: 2 }, user: { userId: 1, role: UserRole.ADMIN, empresaId: 1 } }, res5);
    expect(res5.status).toHaveBeenCalledWith(400);

    // create ok
    instanceSvc.findById.mockResolvedValueOnce({ id: 1, empresaId: 1 });
    prisma.endUser.findUnique.mockResolvedValueOnce({ id: 2, email: 'x', empresaId: 1 });
    prisma.permiso.findFirst.mockResolvedValueOnce(null);
    prisma.permiso.create.mockResolvedValueOnce({ id: 10, endUser: { id: 2, email: 'x' } });
    const res6 = createMockRes();
    await runMiddlewares(handlers, { params: { id: '1' }, body: { userId: 2 }, user: { userId: 1, role: UserRole.SUPERADMIN } }, res6);
    expect(res6.status).toHaveBeenCalledWith(201);

    // P2002
    instanceSvc.findById.mockResolvedValueOnce({ id: 1, empresaId: 1 });
    prisma.endUser.findUnique.mockResolvedValueOnce({ id: 2, email: 'x', empresaId: 1 });
    prisma.permiso.findFirst.mockResolvedValueOnce(null);
    prisma.permiso.create.mockRejectedValueOnce({ code: 'P2002' });
    const res7 = createMockRes();
    await runMiddlewares(handlers, { params: { id: '1' }, body: { userId: 2 }, user: { userId: 1, role: UserRole.SUPERADMIN } }, res7);
    expect(res7.status).toHaveBeenCalledWith(400);
  });

  it('GET /:id/users/available success + 500 on prisma error', async () => {
    const router = (await import('../instance.routes')).default;
    const handlers = getRouteHandlers(router, 'get', '/:id/users/available');

    instanceSvc.findById.mockResolvedValueOnce({ id: 1, empresaId: 1 });
    prisma.endUser.findMany.mockResolvedValueOnce([{ id: 1 }]);
    const res1 = createMockRes();
    await runMiddlewares(handlers, { params: { id: '1' }, query: {}, user: { userId: 1, role: UserRole.SUPERADMIN } }, res1);
    expect(res1.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));

    instanceSvc.findById.mockResolvedValueOnce({ id: 1, empresaId: 1 });
    prisma.endUser.findMany.mockRejectedValueOnce(new Error('db'));
    const res2 = createMockRes();
    await runMiddlewares(handlers, { params: { id: '1' }, query: {}, user: { userId: 1, role: UserRole.SUPERADMIN } }, res2);
    expect(res2.status).toHaveBeenCalledWith(500);
  });

  it('GET /:id/audit-logs returns empty list', async () => {
    const router = (await import('../instance.routes')).default;
    const handlers = getRouteHandlers(router, 'get', '/:id/audit-logs');
    const res = createMockRes();
    await runMiddlewares(handlers, { params: { id: '1' }, query: { page: '2', limit: '5' }, user: { userId: 1 } }, res);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, page: 2, limit: 5 }));
  });

  it('PUT/DELETE /:instanceId/permisos/:permisoId stubs respond', async () => {
    const router = (await import('../instance.routes')).default;

    const putHandlers = getRouteHandlers(router, 'put', '/:instanceId/permisos/:permisoId');
    const res1 = createMockRes();
    await runMiddlewares(putHandlers, { params: { instanceId: '1', permisoId: '9' }, body: { esWhitelist: true } }, res1);
    expect(res1.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));

    const delHandlers = getRouteHandlers(router, 'delete', '/:instanceId/permisos/:permisoId');
    const res2: any = { ...createMockRes(), send: jest.fn().mockReturnThis() };
    await runMiddlewares(delHandlers, { params: { instanceId: '1', permisoId: '9' } }, res2);
    expect(res2.status).toHaveBeenCalledWith(204);
  });
});


