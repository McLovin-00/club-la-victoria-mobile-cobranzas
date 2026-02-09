/**
 * Tests adicionales para endUser.routes.ts - Aumentar coverage
 * @jest-environment node
 */

import { createMockRes } from '../../__tests__/helpers/testUtils';
import { getRouteHandlers } from '../../__tests__/helpers/routerTestUtils';
import { UserRole } from '@prisma/client';

// Mock del servicio
const endUserService = {
    searchEndUsers: jest.fn(),
    createEndUser: jest.fn(),
    updateEndUser: jest.fn(),
    deactivateEndUser: jest.fn(),
    getEndUserStats: jest.fn(),
    identifyUser: jest.fn(),
};

jest.mock('../../services/endUser.service', () => ({
    EndUserService: endUserService,
}));

jest.mock('../../middlewares/platformAuth.middleware', () => ({
    authenticateUser: (_req: any, _res: any, next: any) => next(),
    authorizeRoles: () => (_req: any, _res: any, next: any) => next(),
    logAction: () => (_req: any, _res: any, next: any) => next(),
}));

jest.mock('../../config/logger', () => ({
    AppLogger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

let validationErrors: any[] = [];
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

describe('endUser.routes additional coverage', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        validationErrors = [];
    });

    describe('GET /', () => {
        it('should return 400 on validation errors', async () => {
            const router = (await import('../endUser.routes')).default;
            const handlers = getRouteHandlers(router, 'get', '/');

            validationErrors = [{ msg: 'Invalid param' }];

            const res = createMockRes();
            await runMiddlewares(
                handlers,
                {
                    query: {},
                    user: { userId: 1, role: UserRole.SUPERADMIN },
                },
                res
            );

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: false,
                    message: 'Parámetros inválidos',
                })
            );
        });

        it('should return users for SUPERADMIN with filters', async () => {
            const router = (await import('../endUser.routes')).default;
            const handlers = getRouteHandlers(router, 'get', '/');

            endUserService.searchEndUsers.mockResolvedValueOnce({
                users: [{ id: 1, email: 'test@test.com' }],
                total: 1,
                page: 1,
                limit: 50,
                totalPages: 1,
            });

            const res = createMockRes();
            await runMiddlewares(
                handlers,
                {
                    query: { empresaId: '5', search: 'test', page: '1', limit: '50' },
                    user: { userId: 1, role: UserRole.SUPERADMIN },
                },
                res
            );

            expect(res.status).toHaveBeenCalledWith(200);
            expect(endUserService.searchEndUsers).toHaveBeenCalledWith(
                expect.objectContaining({
                    empresaId: 5,
                    search: 'test',
                    page: 1,
                    limit: 50,
                })
            );
        });

        it('should filter by empresaId for ADMIN', async () => {
            const router = (await import('../endUser.routes')).default;
            const handlers = getRouteHandlers(router, 'get', '/');

            endUserService.searchEndUsers.mockResolvedValueOnce({
                users: [],
                total: 0,
                page: 1,
                limit: 50,
                totalPages: 0,
            });

            const res = createMockRes();
            await runMiddlewares(
                handlers,
                {
                    query: {},
                    user: { userId: 1, role: UserRole.ADMIN, empresaId: 10 },
                },
                res
            );

            expect(endUserService.searchEndUsers).toHaveBeenCalledWith(
                expect.objectContaining({
                    empresaId: 10,
                })
            );
        });

        it('should handle service errors', async () => {
            const router = (await import('../endUser.routes')).default;
            const handlers = getRouteHandlers(router, 'get', '/');

            endUserService.searchEndUsers.mockRejectedValueOnce(new Error('DB error'));

            const res = createMockRes();
            await runMiddlewares(
                handlers,
                {
                    query: {},
                    user: { userId: 1, role: UserRole.SUPERADMIN },
                },
                res
            );

            expect(res.status).toHaveBeenCalledWith(500);
        });
    });

    describe('POST /', () => {
        it('should return 400 on validation errors', async () => {
            const router = (await import('../endUser.routes')).default;
            const handlers = getRouteHandlers(router, 'post', '/');

            validationErrors = [{ msg: 'Invalid data' }];

            const res = createMockRes();
            await runMiddlewares(
                handlers,
                {
                    body: {},
                    user: { userId: 1, role: UserRole.SUPERADMIN },
                },
                res
            );

            expect(res.status).toHaveBeenCalledWith(400);
        });

        it('should create end user successfully', async () => {
            const router = (await import('../endUser.routes')).default;
            const handlers = getRouteHandlers(router, 'post', '/');

            endUserService.createEndUser.mockResolvedValueOnce({
                id: 1,
                email: 'new@test.com',
            });

            const res = createMockRes();
            await runMiddlewares(
                handlers,
                {
                    body: {
                        identifierType: 'email',
                        identifierValue: 'new@test.com',
                    },
                    user: { userId: 1, role: UserRole.SUPERADMIN },
                },
                res
            );

            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: true,
                    message: 'Usuario final creado exitosamente',
                })
            );
        });

        it('should prevent ADMIN from creating users for other empresas', async () => {
            const router = (await import('../endUser.routes')).default;
            const handlers = getRouteHandlers(router, 'post', '/');

            const res = createMockRes();
            await runMiddlewares(
                handlers,
                {
                    body: {
                        identifierType: 'email',
                        identifierValue: 'test@test.com',
                        empresaId: 999,
                    },
                    user: { userId: 1, role: UserRole.ADMIN, empresaId: 1 },
                },
                res
            );

            expect(res.status).toHaveBeenCalledWith(403);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: false,
                    message: 'No puede crear usuarios para otras empresas',
                })
            );
        });

        it('should handle Error instances from service', async () => {
            const router = (await import('../endUser.routes')).default;
            const handlers = getRouteHandlers(router, 'post', '/');

            endUserService.createEndUser.mockRejectedValueOnce(new Error('User already exists'));

            const res = createMockRes();
            await runMiddlewares(
                handlers,
                {
                    body: {
                        identifierType: 'email',
                        identifierValue: 'duplicate@test.com',
                    },
                    user: { userId: 1, role: UserRole.SUPERADMIN },
                },
                res
            );

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: false,
                    message: 'User already exists',
                })
            );
        });

        it('should handle non-Error exceptions', async () => {
            const router = (await import('../endUser.routes')).default;
            const handlers = getRouteHandlers(router, 'post', '/');

            endUserService.createEndUser.mockRejectedValueOnce('String error');

            const res = createMockRes();
            await runMiddlewares(
                handlers,
                {
                    body: {
                        identifierType: 'email',
                        identifierValue: 'test@test.com',
                    },
                    user: { userId: 1, role: UserRole.SUPERADMIN },
                },
                res
            );

            expect(res.status).toHaveBeenCalledWith(500);
        });
    });

    describe('PUT /:id', () => {
        it('should return 400 on validation errors', async () => {
            const router = (await import('../endUser.routes')).default;
            const handlers = getRouteHandlers(router, 'put', '/:id');

            validationErrors = [{ msg: 'Invalid data' }];

            const res = createMockRes();
            await runMiddlewares(
                handlers,
                {
                    params: { id: '1' },
                    body: {},
                    user: { userId: 1, role: UserRole.SUPERADMIN },
                },
                res
            );

            expect(res.status).toHaveBeenCalledWith(400);
        });

        it('should update end user successfully', async () => {
            const router = (await import('../endUser.routes')).default;
            const handlers = getRouteHandlers(router, 'put', '/:id');

            endUserService.updateEndUser.mockResolvedValueOnce({
                id: 1,
                nombre: 'Updated',
            });

            const res = createMockRes();
            await runMiddlewares(
                handlers,
                {
                    params: { id: '1' },
                    body: { nombre: 'Updated' },
                    user: { userId: 1, role: UserRole.SUPERADMIN },
                },
                res
            );

            expect(res.status).toHaveBeenCalledWith(200);
            expect(endUserService.updateEndUser).toHaveBeenCalledWith(1, { nombre: 'Updated' });
        });

        it('should handle errors', async () => {
            const router = (await import('../endUser.routes')).default;
            const handlers = getRouteHandlers(router, 'put', '/:id');

            endUserService.updateEndUser.mockRejectedValueOnce(new Error('Update failed'));

            const res = createMockRes();
            await runMiddlewares(
                handlers,
                {
                    params: { id: '1' },
                    body: { nombre: 'Test' },
                    user: { userId: 1, role: UserRole.SUPERADMIN },
                },
                res
            );

            expect(res.status).toHaveBeenCalledWith(500);
        });
    });

    describe('DELETE /:id', () => {
        it('should deactivate end user successfully', async () => {
            const router = (await import('../endUser.routes')).default;
            const handlers = getRouteHandlers(router, 'delete', '/:id');

            endUserService.deactivateEndUser.mockResolvedValueOnce({
                id: 1,
                isActive: false,
            });

            const res = createMockRes();
            await runMiddlewares(
                handlers,
                {
                    params: { id: '1' },
                    user: { userId: 1, role: UserRole.SUPERADMIN },
                },
                res
            );

            expect(res.status).toHaveBeenCalledWith(200);
            expect(endUserService.deactivateEndUser).toHaveBeenCalledWith(1);
        });

        it('should handle errors', async () => {
            const router = (await import('../endUser.routes')).default;
            const handlers = getRouteHandlers(router, 'delete', '/:id');

            endUserService.deactivateEndUser.mockRejectedValueOnce(new Error('Deactivate failed'));

            const res = createMockRes();
            await runMiddlewares(
                handlers,
                {
                    params: { id: '1' },
                    user: { userId: 1, role: UserRole.SUPERADMIN },
                },
                res
            );

            expect(res.status).toHaveBeenCalledWith(500);
        });
    });

    describe('GET /stats', () => {
        it('should return stats for SUPERADMIN', async () => {
            const router = (await import('../endUser.routes')).default;
            const handlers = getRouteHandlers(router, 'get', '/stats');

            endUserService.getEndUserStats.mockResolvedValueOnce({
                total: 100,
                active: 80,
                inactive: 20,
            });

            const res = createMockRes();
            await runMiddlewares(
                handlers,
                {
                    query: {},
                    user: { userId: 1, role: UserRole.SUPERADMIN },
                },
                res
            );

            expect(res.status).toHaveBeenCalledWith(200);
            expect(endUserService.getEndUserStats).toHaveBeenCalledWith(undefined);
        });

        it('should filter stats by empresaId for ADMIN', async () => {
            const router = (await import('../endUser.routes')).default;
            const handlers = getRouteHandlers(router, 'get', '/stats');

            endUserService.getEndUserStats.mockResolvedValueOnce({
                total: 50,
                active: 40,
                inactive: 10,
            });

            const res = createMockRes();
            await runMiddlewares(
                handlers,
                {
                    query: {},
                    user: { userId: 1, role: UserRole.ADMIN, empresaId: 5 },
                },
                res
            );

            expect(endUserService.getEndUserStats).toHaveBeenCalledWith(5);
        });

        it('should handle errors', async () => {
            const router = (await import('../endUser.routes')).default;
            const handlers = getRouteHandlers(router, 'get', '/stats');

            endUserService.getEndUserStats.mockRejectedValueOnce(new Error('Stats failed'));

            const res = createMockRes();
            await runMiddlewares(
                handlers,
                {
                    query: {},
                    user: { userId: 1, role: UserRole.SUPERADMIN },
                },
                res
            );

            expect(res.status).toHaveBeenCalledWith(500);
        });
    });

    describe('POST /identify', () => {
        it('should return 400 on validation errors', async () => {
            const router = (await import('../endUser.routes')).default;
            const handlers = getRouteHandlers(router, 'post', '/identify');

            validationErrors = [{ msg: 'Invalid identifier' }];

            const res = createMockRes();
            await runMiddlewares(
                handlers,
                {
                    body: {},
                    user: { userId: 1, role: UserRole.SUPERADMIN },
                },
                res
            );

            expect(res.status).toHaveBeenCalledWith(400);
        });

        it('should identify user successfully', async () => {
            const router = (await import('../endUser.routes')).default;
            const handlers = getRouteHandlers(router, 'post', '/identify');

            endUserService.identifyUser.mockResolvedValueOnce({
                id: 1,
                email: 'found@test.com',
            });

            const res = createMockRes();
            await runMiddlewares(
                handlers,
                {
                    body: {
                        identifierType: 'email',
                        identifierValue: 'found@test.com',
                    },
                    user: { userId: 1, role: UserRole.SUPERADMIN },
                },
                res
            );

            expect(res.status).toHaveBeenCalledWith(200);
            expect(endUserService.identifyUser).toHaveBeenCalledWith('email', 'found@test.com');
        });

        it('should return 404 if user not found', async () => {
            const router = (await import('../endUser.routes')).default;
            const handlers = getRouteHandlers(router, 'post', '/identify');

            endUserService.identifyUser.mockResolvedValueOnce(null);

            const res = createMockRes();
            await runMiddlewares(
                handlers,
                {
                    body: {
                        identifierType: 'email',
                        identifierValue: 'notfound@test.com',
                    },
                    user: { userId: 1, role: UserRole.SUPERADMIN },
                },
                res
            );

            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: false,
                    message: 'Usuario final no encontrado',
                })
            );
        });

        it('should handle errors', async () => {
            const router = (await import('../endUser.routes')).default;
            const handlers = getRouteHandlers(router, 'post', '/identify');

            endUserService.identifyUser.mockRejectedValueOnce(new Error('Identify failed'));

            const res = createMockRes();
            await runMiddlewares(
                handlers,
                {
                    body: {
                        identifierType: 'email',
                        identifierValue: 'test@test.com',
                    },
                    user: { userId: 1, role: UserRole.SUPERADMIN },
                },
                res
            );

            expect(res.status).toHaveBeenCalledWith(500);
        });
    });
});
