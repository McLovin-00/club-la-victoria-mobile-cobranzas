/**
 * Ejecuta handlers de endUser.routes.ts para subir cobertura real (sin supertest).
 * @jest-environment node
 */

import { createMockRes } from '../../__tests__/helpers/testUtils';
import { getRouteHandler } from '../../__tests__/helpers/routerTestUtils';

jest.mock('../../middlewares/platformAuth.middleware', () => ({
  authenticateUser: (_req: any, _res: any, next: any) => next(),
  authorizeRoles: () => (_req: any, _res: any, next: any) => next(),
  logAction: () => async (_req: any, _res: any, next: any) => next(),
}));

jest.mock('../../config/logger', () => ({
  AppLogger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

let validationErrors: any[] = [];
// express-validator devuelve una función middleware "chainable" (callable + métodos).
const chainFn: any = () => (_req: any, _res: any, next: any) => next();
const chain: any = new Proxy(chainFn, {
  get: (_t, _prop) => () => chain,
});
jest.mock('express-validator', () => ({
  body: () => chain,
  query: () => chain,
  validationResult: () => ({
    isEmpty: () => validationErrors.length === 0,
    array: () => validationErrors,
  }),
}));

const EndUserService = {
  searchEndUsers: jest.fn(),
  createEndUser: jest.fn(),
  updateEndUser: jest.fn(),
  deactivateEndUser: jest.fn(),
  getEndUserStats: jest.fn(),
  identifyUser: jest.fn(),
};
jest.mock('../../services/endUser.service', () => ({ EndUserService }));

describe('endUser.routes handlers (real)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    validationErrors = [];
  });

  it('GET / returns 400 on validation errors, otherwise calls searchEndUsers with empresaId per role', async () => {
    const router = (await import('../endUser.routes')).default;
    const handler = getRouteHandler(router, 'get', '/');

    validationErrors = [{ msg: 'bad' }];
    const res0 = createMockRes();
    await handler({ user: { userId: 1, role: 'SUPERADMIN' }, query: {} } as any, res0);
    expect(res0.status).toHaveBeenCalledWith(400);

    validationErrors = [];
    EndUserService.searchEndUsers.mockResolvedValueOnce({ users: [{ id: 1 }], total: 1, page: 1, limit: 50, totalPages: 1 });
    const res1 = createMockRes();
    await handler({ user: { userId: 1, role: 'SUPERADMIN' }, query: { empresaId: '9', page: '1', limit: '50' } } as any, res1);
    expect(EndUserService.searchEndUsers).toHaveBeenCalledWith(expect.objectContaining({ empresaId: 9 }));
    expect(res1.status).toHaveBeenCalledWith(200);

    EndUserService.searchEndUsers.mockResolvedValueOnce({ users: [], total: 0, page: 1, limit: 50, totalPages: 0 });
    const res2 = createMockRes();
    await handler({ user: { userId: 2, role: 'ADMIN', empresaId: 3 }, query: { page: '1', limit: '50' } } as any, res2);
    expect(EndUserService.searchEndUsers).toHaveBeenCalledWith(expect.objectContaining({ empresaId: 3 }));
  });

  it('POST / validates, enforces ADMIN empresa restriction, normalizes identifierValue', async () => {
    const router = (await import('../endUser.routes')).default;
    const handler = getRouteHandler(router, 'post', '/');

    validationErrors = [{ msg: 'bad' }];
    const res0 = createMockRes();
    await handler({ user: { userId: 1, role: 'SUPERADMIN' }, body: {} } as any, res0);
    expect(res0.status).toHaveBeenCalledWith(400);

    validationErrors = [];
    const res1 = createMockRes();
    await handler(
      { user: { userId: 1, role: 'ADMIN', empresaId: 2 }, body: { empresaId: 999, identifierType: 'email', identifierValue: 'a@b.com' } } as any,
      res1
    );
    expect(res1.status).toHaveBeenCalledWith(403);

    EndUserService.createEndUser.mockResolvedValueOnce({ id: 1 });
    const res2 = createMockRes();
    const req2: any = { user: { userId: 1, role: 'ADMIN', empresaId: 2 }, body: { identifierType: 'email', identifierValue: 'a@b.com' } };
    await handler(req2, res2);
    expect(req2.body.identifier_value).toBe('a@b.com');
    expect(req2.body.empresaId).toBe(2);
    expect(res2.status).toHaveBeenCalledWith(201);
  });

  it('PUT /:id returns 400 on validation errors and 200 on success', async () => {
    const router = (await import('../endUser.routes')).default;
    const handler = getRouteHandler(router, 'put', '/:id');

    validationErrors = [{ msg: 'bad' }];
    const res0 = createMockRes();
    await handler({ user: { userId: 1, role: 'SUPERADMIN' }, params: { id: '1' }, body: {} } as any, res0);
    expect(res0.status).toHaveBeenCalledWith(400);

    validationErrors = [];
    EndUserService.updateEndUser.mockResolvedValueOnce({ id: 1 });
    const res1 = createMockRes();
    await handler({ user: { userId: 1, role: 'SUPERADMIN' }, params: { id: '1' }, body: { nombre: 'X' } } as any, res1);
    expect(res1.status).toHaveBeenCalledWith(200);
  });

  it('DELETE /:id calls deactivateEndUser', async () => {
    const router = (await import('../endUser.routes')).default;
    const handler = getRouteHandler(router, 'delete', '/:id');
    EndUserService.deactivateEndUser.mockResolvedValueOnce({ id: 1 });
    const res = createMockRes();
    await handler({ user: { userId: 1, role: 'SUPERADMIN' }, params: { id: '1' } } as any, res);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('GET /stats uses empresaId for ADMIN only', async () => {
    const router = (await import('../endUser.routes')).default;
    const handler = getRouteHandler(router, 'get', '/stats');

    EndUserService.getEndUserStats.mockResolvedValueOnce({ total: 1 });
    const res1 = createMockRes();
    await handler({ user: { userId: 1, role: 'ADMIN', empresaId: 9 } } as any, res1);
    expect(EndUserService.getEndUserStats).toHaveBeenCalledWith(9);

    EndUserService.getEndUserStats.mockResolvedValueOnce({ total: 1 });
    const res2 = createMockRes();
    await handler({ user: { userId: 1, role: 'SUPERADMIN', empresaId: null } } as any, res2);
    expect(EndUserService.getEndUserStats).toHaveBeenCalledWith(undefined);
  });

  it('POST /identify returns 400/404/200', async () => {
    const router = (await import('../endUser.routes')).default;
    const handler = getRouteHandler(router, 'post', '/identify');

    validationErrors = [{ msg: 'bad' }];
    const res0 = createMockRes();
    await handler({ user: { userId: 1, role: 'ADMIN' }, body: {} } as any, res0);
    expect(res0.status).toHaveBeenCalledWith(400);

    validationErrors = [];
    EndUserService.identifyUser.mockResolvedValueOnce(null);
    const res1 = createMockRes();
    await handler({ user: { userId: 1, role: 'ADMIN' }, body: { identifierType: 'email', identifierValue: 'a@b.com' } } as any, res1);
    expect(res1.status).toHaveBeenCalledWith(404);

    EndUserService.identifyUser.mockResolvedValueOnce({ id: 1 });
    const res2 = createMockRes();
    await handler({ user: { userId: 1, role: 'ADMIN' }, body: { identifierType: 'email', identifierValue: 'a@b.com' } } as any, res2);
    expect(res2.status).toHaveBeenCalledWith(200);
  });
});


