/**
 * Tests para transportistas.routes.ts - Aumentar coverage
 * @jest-environment node
 */

import { createMockRes } from '../../__tests__/helpers/testUtils';
import { getRouteHandlers } from '../../__tests__/helpers/routerTestUtils';
import { UserRole } from '@prisma/client';

jest.mock('../../middlewares/platformAuth.middleware', () => ({
    authenticateUser: (_req: any, _res: any, next: any) => next(),
    authorizeRoles: () => (_req: any, _res: any, next: any) => next(),
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

describe('transportistas.routes coverage', () => {
    let consoleErrorSpy: jest.SpyInstance;

    beforeEach(() => {
        jest.clearAllMocks();
        consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    });

    afterEach(() => {
        consoleErrorSpy.mockRestore();
    });

    describe('GET /dashboard-stats', () => {
        it('should return mock dashboard stats successfully', async () => {
            const router = (await import('../transportistas')).default;
            const handlers = getRouteHandlers(router, 'get', '/dashboard-stats');

            const res = createMockRes();
            await runMiddlewares(
                handlers,
                {
                    user: { userId: 1, role: UserRole.OPERATOR },
                },
                res
            );

            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: true,
                    data: expect.objectContaining({
                        cumplimiento: expect.any(Number),
                        vigentes: expect.any(Number),
                        vencidos: expect.any(Number),
                        proximos: expect.any(Number),
                        total: expect.any(Number),
                    }),
                    timestamp: expect.any(String),
                })
            );
        });

        it('should handle errors gracefully', async () => {
            const router = (await import('../transportistas')).default;
            const handlers = getRouteHandlers(router, 'get', '/dashboard-stats');

            // Force an error by making res.json throw
            const res = createMockRes();
            res.json.mockImplementationOnce(() => {
                throw new Error('JSON error');
            });

            await runMiddlewares(
                handlers,
                {
                    user: { userId: 1, role: UserRole.OPERATOR },
                },
                res
            );

            expect(consoleErrorSpy).toHaveBeenCalledWith(
                'Error getting dashboard stats:',
                expect.any(Error)
            );
        });
    });

    describe('GET /alertas-urgentes', () => {
        it('should return mock alertas successfully', async () => {
            const router = (await import('../transportistas')).default;
            const handlers = getRouteHandlers(router, 'get', '/alertas-urgentes');

            const res = createMockRes();
            await runMiddlewares(
                handlers,
                {
                    user: { userId: 1, role: UserRole.ADMIN },
                },
                res
            );

            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: true,
                    data: expect.arrayContaining([
                        expect.objectContaining({
                            id: expect.any(String),
                            equipoId: expect.any(Number),
                            documentoTipo: expect.any(String),
                            diasVencimiento: expect.any(Number),
                            mensaje: expect.any(String),
                        }),
                    ]),
                    timestamp: expect.any(String),
                })
            );
        });

        it('should handle errors gracefully', async () => {
            const router = (await import('../transportistas')).default;
            const handlers = getRouteHandlers(router, 'get', '/alertas-urgentes');

            const res = createMockRes();
            res.json.mockImplementationOnce(() => {
                throw new Error('JSON error');
            });

            await runMiddlewares(
                handlers,
                {
                    user: { userId: 1, role: UserRole.ADMIN },
                },
                res
            );

            expect(consoleErrorSpy).toHaveBeenCalledWith(
                'Error getting alertas urgentes:',
                expect.any(Error)
            );
        });
    });

    describe('GET /mis-equipos', () => {
        it('should return mock equipos successfully', async () => {
            const router = (await import('../transportistas')).default;
            const handlers = getRouteHandlers(router, 'get', '/mis-equipos');

            const res = createMockRes();
            await runMiddlewares(
                handlers,
                {
                    user: { userId: 1, role: UserRole.SUPERADMIN },
                },
                res
            );

            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: true,
                    data: expect.arrayContaining([
                        expect.objectContaining({
                            id: expect.any(Number),
                            driverDniNorm: expect.any(String),
                            truckPlateNorm: expect.any(String),
                            estado: expect.any(String),
                            cumplimiento: expect.any(Number),
                        }),
                    ]),
                    timestamp: expect.any(String),
                })
            );
        });

        it('should handle errors gracefully', async () => {
            const router = (await import('../transportistas')).default;
            const handlers = getRouteHandlers(router, 'get', '/mis-equipos');

            const res = createMockRes();
            res.json.mockImplementationOnce(() => {
                throw new Error('JSON error');
            });

            await runMiddlewares(
                handlers,
                {
                    user: { userId: 1, role: UserRole.OPERATOR },
                },
                res
            );

            expect(consoleErrorSpy).toHaveBeenCalledWith(
                'Error getting mis equipos:',
                expect.any(Error)
            );
        });
    });

    describe('GET /calendar-events', () => {
        it('should return mock calendar events successfully', async () => {
            const router = (await import('../transportistas')).default;
            const handlers = getRouteHandlers(router, 'get', '/calendar-events');

            const res = createMockRes();
            await runMiddlewares(
                handlers,
                {
                    user: { userId: 1, role: UserRole.ADMIN },
                },
                res
            );

            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: true,
                    data: expect.arrayContaining([
                        expect.objectContaining({
                            id: expect.any(String),
                            equipoId: expect.any(String),
                            equipoNombre: expect.any(String),
                            documentoTipo: expect.any(String),
                            estado: expect.any(String),
                            prioridad: expect.any(String),
                        }),
                    ]),
                    timestamp: expect.any(String),
                })
            );
        });

        it('should handle errors gracefully', async () => {
            const router = (await import('../transportistas')).default;
            const handlers = getRouteHandlers(router, 'get', '/calendar-events');

            const res = createMockRes();
            res.json.mockImplementationOnce(() => {
                throw new Error('JSON error');
            });

            await runMiddlewares(
                handlers,
                {
                    user: { userId: 1, role: UserRole.ADMIN },
                },
                res
            );

            expect(consoleErrorSpy).toHaveBeenCalledWith(
                'Error getting calendar events:',
                expect.any(Error)
            );
        });
    });

    describe('GET /profile', () => {
        it('should return mock profile successfully', async () => {
            const router = (await import('../transportistas')).default;
            const handlers = getRouteHandlers(router, 'get', '/profile');

            const res = createMockRes();
            await runMiddlewares(
                handlers,
                {
                    user: { userId: 1, role: UserRole.OPERATOR },
                },
                res
            );

            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: true,
                    data: expect.objectContaining({
                        id: expect.any(String),
                        nombre: expect.any(String),
                        apellido: expect.any(String),
                        email: expect.any(String),
                    }),
                    timestamp: expect.any(String),
                })
            );
        });

        it('should handle errors gracefully', async () => {
            const router = (await import('../transportistas')).default;
            const handlers = getRouteHandlers(router, 'get', '/profile');

            const res = createMockRes();
            res.json.mockImplementationOnce(() => {
                throw new Error('JSON error');
            });

            await runMiddlewares(
                handlers,
                {
                    user: { userId: 1, role: UserRole.OPERATOR },
                },
                res
            );

            expect(consoleErrorSpy).toHaveBeenCalledWith(
                'Error getting profile:',
                expect.any(Error)
            );
        });
    });

    describe('POST /avatar', () => {
        it('should upload avatar successfully', async () => {
            const router = (await import('../transportistas')).default;
            const handlers = getRouteHandlers(router, 'post', '/avatar');

            const res = createMockRes();
            await runMiddlewares(
                handlers,
                {
                    body: { file: 'base64data' },
                    user: { userId: 1, role: UserRole.OPERATOR },
                },
                res
            );

            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: true,
                    data: expect.objectContaining({
                        avatarUrl: expect.any(String),
                        message: expect.any(String),
                    }),
                    timestamp: expect.any(String),
                })
            );
        });

        it('should handle errors gracefully', async () => {
            const router = (await import('../transportistas')).default;
            const handlers = getRouteHandlers(router, 'post', '/avatar');

            const res = createMockRes();
            res.json.mockImplementationOnce(() => {
                throw new Error('Upload error');
            });

            await runMiddlewares(
                handlers,
                {
                    body: { file: 'base64data' },
                    user: { userId: 1, role: UserRole.OPERATOR },
                },
                res
            );

            expect(consoleErrorSpy).toHaveBeenCalledWith(
                'Error uploading avatar:',
                expect.any(Error)
            );
        });
    });

    describe('GET /preferences', () => {
        it('should return mock preferences successfully', async () => {
            const router = (await import('../transportistas')).default;
            const handlers = getRouteHandlers(router, 'get', '/preferences');

            const res = createMockRes();
            await runMiddlewares(
                handlers,
                {
                    user: { userId: 1, role: UserRole.ADMIN },
                },
                res
            );

            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: true,
                    data: expect.objectContaining({
                        notifications: expect.any(Object),
                        app: expect.any(Object),
                    }),
                    timestamp: expect.any(String),
                })
            );
        });

        it('should handle errors gracefully', async () => {
            const router = (await import('../transportistas')).default;
            const handlers = getRouteHandlers(router, 'get', '/preferences');

            const res = createMockRes();
            res.json.mockImplementationOnce(() => {
                throw new Error('Preferences error');
            });

            await runMiddlewares(
                handlers,
                {
                    user: { userId: 1, role: UserRole.ADMIN },
                },
                res
            );

            expect(consoleErrorSpy).toHaveBeenCalledWith(
                'Error getting preferences:',
                expect.any(Error)
            );
        });
    });
});
