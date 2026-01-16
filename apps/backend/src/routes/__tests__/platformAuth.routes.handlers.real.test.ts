/**
 * Tests para handlers inline de platformAuth.routes.ts
 * Cubre: toggle-activo, usuarios, update-empresa
 * @jest-environment node
 */

import { createMockRes } from '../../__tests__/helpers/testUtils';
import { getRouteHandlers } from '../../__tests__/helpers/routerTestUtils';
import { UserRole } from '@prisma/client';

// Mock de controlador
jest.mock('../../controllers/platformAuth.controller', () => ({
    PlatformAuthController: {
        login: jest.fn(),
        logout: jest.fn(),
        register: jest.fn(),
        registerClientWizard: jest.fn(),
        registerDadorWizard: jest.fn(),
        registerTransportistaWizard: jest.fn(),
        registerChoferWizard: jest.fn(),
        getProfile: jest.fn(),
        changePassword: jest.fn(),
        verifyToken: jest.fn(),
        updateUser: jest.fn(),
        deleteUser: jest.fn(),
    },
    platformAuthValidation: {
        updateUser: (_req: any, _res: any, next: any) => next(),
    },
}));

// Mock de middlewares
jest.mock('../../middlewares/platformAuth.middleware', () => ({
    authenticateUser: (_req: any, _res: any, next: any) => next(),
    authorizeRoles: () => (_req: any, _res: any, next: any) => next(),
    logAction: () => (_req: any, _res: any, next: any) => next(),
}));

jest.mock('../../middlewares/validation.middleware', () => ({
    ValidationMiddleware: {
        validateBody: () => (_req: any, _res: any, next: any) => next(),
    },
}));

jest.mock('../../middlewares/rateLimit.middleware', () => ({
    loginRateLimiter: (_req: any, _res: any, next: any) => next(),
    passwordChangeRateLimiter: (_req: any, _res: any, next: any) => next(),
}));

jest.mock('../../config/logger', () => ({
    AppLogger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

const prisma = {
    user: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
    },
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

describe('platformAuth.routes inline handlers (real)', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('PATCH /users/:id/toggle-activo', () => {
        it('should return 400 if activo is not boolean', async () => {
            const router = (await import('../platformAuth.routes')).default;
            const handlers = getRouteHandlers(router, 'patch', '/users/:id/toggle-activo');

            const res = createMockRes();
            await runMiddlewares(
                handlers,
                {
                    params: { id: '1' },
                    body: { activo: 'not-boolean' },
                    user: { userId: 1, role: UserRole.SUPERADMIN },
                },
                res
            );

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: false,
                    message: 'El campo activo debe ser booleano',
                })
            );
        });

        it('should return 404 if user not found', async () => {
            const router = (await import('../platformAuth.routes')).default;
            const handlers = getRouteHandlers(router, 'patch', '/users/:id/toggle-activo');

            prisma.user.findUnique.mockResolvedValueOnce(null);

            const res = createMockRes();
            await runMiddlewares(
                handlers,
                {
                    params: { id: '999' },
                    body: { activo: false },
                    user: { userId: 1, role: UserRole.SUPERADMIN },
                },
                res
            );

            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: false,
                    message: 'Usuario no encontrado',
                })
            );
        });

        it('should return 403 if user cannot modify target', async () => {
            const router = (await import('../platformAuth.routes')).default;
            const handlers = getRouteHandlers(router, 'patch', '/users/:id/toggle-activo');

            prisma.user.findUnique.mockResolvedValueOnce({
                id: 2,
                email: 'other@test.com',
                role: UserRole.ADMIN,
                empresaId: 999, // Different empresa
            });

            const res = createMockRes();
            await runMiddlewares(
                handlers,
                {
                    params: { id: '2' },
                    body: { activo: false },
                    user: { userId: 1, role: UserRole.ADMIN, empresaId: 1 },
                },
                res
            );

            expect(res.status).toHaveBeenCalledWith(403);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: false,
                    message: 'No tiene permisos para modificar este usuario',
                })
            );
        });

        it('should return 400 if user tries to deactivate themselves', async () => {
            const router = (await import('../platformAuth.routes')).default;
            const handlers = getRouteHandlers(router, 'patch', '/users/:id/toggle-activo');

            prisma.user.findUnique.mockResolvedValueOnce({
                id: 1,
                email: 'admin@test.com',
                role: UserRole.SUPERADMIN,
                empresaId: 1,
            });

            const res = createMockRes();
            await runMiddlewares(
                handlers,
                {
                    params: { id: '1' },
                    body: { activo: false },
                    user: { userId: 1, role: UserRole.SUPERADMIN },
                },
                res
            );

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: false,
                    message: 'No puede desactivarse a sí mismo',
                })
            );
        });

        it('should successfully toggle user active status', async () => {
            const router = (await import('../platformAuth.routes')).default;
            const handlers = getRouteHandlers(router, 'patch', '/users/:id/toggle-activo');

            prisma.user.findUnique.mockResolvedValueOnce({
                id: 2,
                email: 'user@test.com',
                role: UserRole.OPERATOR,
                empresaId: 1,
            });

            prisma.user.update.mockResolvedValueOnce({
                id: 2,
                email: 'user@test.com',
                activo: false,
            });

            const res = createMockRes();
            await runMiddlewares(
                handlers,
                {
                    params: { id: '2' },
                    body: { activo: false },
                    user: { userId: 1, role: UserRole.SUPERADMIN },
                },
                res
            );

            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: true,
                    data: expect.objectContaining({ id: 2, activo: false }),
                })
            );
        });

        it('should handle errors gracefully', async () => {
            const router = (await import('../platformAuth.routes')).default;
            const handlers = getRouteHandlers(router, 'patch', '/users/:id/toggle-activo');

            prisma.user.findUnique.mockRejectedValueOnce(new Error('Database error'));

            const res = createMockRes();
            await runMiddlewares(
                handlers,
                {
                    params: { id: '2' },
                    body: { activo: false },
                    user: { userId: 1, role: UserRole.SUPERADMIN },
                },
                res
            );

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: false,
                    message: 'Error interno del servidor',
                })
            );
        });
    });

    describe('GET /usuarios', () => {
        it('should return paginated users for SUPERADMIN', async () => {
            const router = (await import('../platformAuth.routes')).default;
            const handlers = getRouteHandlers(router, 'get', '/usuarios');

            const mockUsers = [
                { id: 1, email: 'user1@test.com', role: UserRole.ADMIN },
                { id: 2, email: 'user2@test.com', role: UserRole.OPERATOR },
            ];

            prisma.user.findMany.mockResolvedValueOnce(mockUsers);
            prisma.user.count.mockResolvedValueOnce(2);

            const res = createMockRes();
            await runMiddlewares(
                handlers,
                {
                    query: { page: '1', limit: '10' },
                    user: { userId: 1, role: UserRole.SUPERADMIN },
                },
                res
            );

            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: true,
                    data: mockUsers,
                    total: 2,
                    page: 1,
                    limit: 10,
                })
            );
        });

        it('should filter users by empresa for ADMIN', async () => {
            const router = (await import('../platformAuth.routes')).default;
            const handlers = getRouteHandlers(router, 'get', '/usuarios');

            prisma.user.findMany.mockResolvedValueOnce([]);
            prisma.user.count.mockResolvedValueOnce(0);

            const res = createMockRes();
            await runMiddlewares(
                handlers,
                {
                    query: {},
                    user: { userId: 1, role: UserRole.ADMIN, empresaId: 5 },
                },
                res
            );

            expect(prisma.user.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: expect.objectContaining({
                        AND: expect.arrayContaining([
                            expect.objectContaining({ empresaId: 5 }),
                            expect.objectContaining({ role: { not: 'SUPERADMIN' } }),
                        ]),
                    }),
                })
            );
        });

        it('should filter users by search term', async () => {
            const router = (await import('../platformAuth.routes')).default;
            const handlers = getRouteHandlers(router, 'get', '/usuarios');

            prisma.user.findMany.mockResolvedValueOnce([]);
            prisma.user.count.mockResolvedValueOnce(0);

            const res = createMockRes();
            await runMiddlewares(
                handlers,
                {
                    query: { search: 'john' },
                    user: { userId: 1, role: UserRole.SUPERADMIN },
                },
                res
            );

            expect(prisma.user.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: expect.objectContaining({
                        AND: expect.arrayContaining([
                            expect.objectContaining({
                                OR: expect.arrayContaining([
                                    expect.objectContaining({ email: { contains: 'john', mode: 'insensitive' } }),
                                    expect.objectContaining({ nombre: { contains: 'john', mode: 'insensitive' } }),
                                    expect.objectContaining({ apellido: { contains: 'john', mode: 'insensitive' } }),
                                ]),
                            }),
                        ]),
                    }),
                })
            );
        });

        it('should filter users by role', async () => {
            const router = (await import('../platformAuth.routes')).default;
            const handlers = getRouteHandlers(router, 'get', '/usuarios');

            prisma.user.findMany.mockResolvedValueOnce([]);
            prisma.user.count.mockResolvedValueOnce(0);

            const res = createMockRes();
            await runMiddlewares(
                handlers,
                {
                    query: { role: 'admin' },
                    user: { userId: 1, role: UserRole.SUPERADMIN },
                },
                res
            );

            expect(prisma.user.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: expect.objectContaining({
                        AND: expect.arrayContaining([expect.objectContaining({ role: 'ADMIN' })]),
                    }),
                })
            );
        });

        it('should filter users for DADOR_DE_CARGA', async () => {
            const router = (await import('../platformAuth.routes')).default;
            const handlers = getRouteHandlers(router, 'get', '/usuarios');

            prisma.user.findMany.mockResolvedValueOnce([]);
            prisma.user.count.mockResolvedValueOnce(0);

            const res = createMockRes();
            await runMiddlewares(
                handlers,
                {
                    query: {},
                    user: { userId: 1, role: UserRole.DADOR_DE_CARGA, dadorCargaId: 10 },
                },
                res
            );

            expect(prisma.user.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: expect.objectContaining({
                        AND: expect.arrayContaining([
                            expect.objectContaining({
                                OR: expect.arrayContaining([
                                    expect.objectContaining({ creadoPorId: 1 }),
                                    expect.objectContaining({ dadorCargaId: 10 }),
                                ]),
                            }),
                            expect.objectContaining({ role: { in: ['TRANSPORTISTA', 'CHOFER'] } }),
                        ]),
                    }),
                })
            );
        });

        it('should filter users for TRANSPORTISTA', async () => {
            const router = (await import('../platformAuth.routes')).default;
            const handlers = getRouteHandlers(router, 'get', '/usuarios');

            prisma.user.findMany.mockResolvedValueOnce([]);
            prisma.user.count.mockResolvedValueOnce(0);

            const res = createMockRes();
            await runMiddlewares(
                handlers,
                {
                    query: {},
                    user: { userId: 1, role: UserRole.TRANSPORTISTA, empresaTransportistaId: 20 },
                },
                res
            );

            expect(prisma.user.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: expect.objectContaining({
                        AND: expect.arrayContaining([
                            expect.objectContaining({
                                OR: expect.arrayContaining([
                                    expect.objectContaining({ creadoPorId: 1 }),
                                    expect.objectContaining({ empresaTransportistaId: 20 }),
                                ]),
                            }),
                            expect.objectContaining({ role: 'CHOFER' }),
                        ]),
                    }),
                })
            );
        });

        it('should handle errors gracefully', async () => {
            const router = (await import('../platformAuth.routes')).default;
            const handlers = getRouteHandlers(router, 'get', '/usuarios');

            prisma.user.findMany.mockRejectedValueOnce(new Error('Database error'));

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
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: false,
                    message: 'Error interno del servidor',
                })
            );
        });
    });

    describe('POST /update-empresa', () => {
        it('should return 302 redirect message', async () => {
            const router = (await import('../platformAuth.routes')).default;
            const handlers = getRouteHandlers(router, 'post', '/update-empresa');

            const res = createMockRes();
            await runMiddlewares(
                handlers,
                {
                    body: {},
                    user: { userId: 1, role: UserRole.SUPERADMIN },
                },
                res
            );

            expect(res.status).toHaveBeenCalledWith(302);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: false,
                    message: 'Esta ruta ha sido movida. Use /api/usuarios/update-empresa',
                    newEndpoint: '/api/usuarios/update-empresa',
                })
            );
        });
    });
});
