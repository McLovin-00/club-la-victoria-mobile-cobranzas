/**
 * Tests adicionales para dashboard.controller.ts - Aumentar coverage de error handling
 * @jest-environment node
 */

import { createMockRes } from '../../__tests__/helpers/testUtils';

jest.mock('../../config/logger', () => ({
    AppLogger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

const prisma = {
    user: { findMany: jest.fn(), count: jest.fn() },
    empresa: { count: jest.fn(), findMany: jest.fn(), groupBy: jest.fn() },
};
jest.mock('../../config/prisma', () => ({ prisma }));

import * as controller from '../dashboard.controller';
import { AppLogger } from '../../config/logger';

describe('dashboard.controller error handling coverage', () => {
    beforeEach(() => jest.clearAllMocks());

    describe('getDashboardUser error handling', () => {
        it('should handle errors gracefully', async () => {
            const req: any = {
                platformUser: { userId: 1, email: 'test@test.com', role: 'OPERATOR' },
            };
            const res = createMockRes();

            // Force an error by making res.json throw
            res.json.mockImplementationOnce(() => {
                throw new Error('JSON serialization error');
            });

            await controller.getDashboardUser(req, res);

            expect(AppLogger.error).toHaveBeenCalledWith(
                'Error en dashboard de usuario',
                expect.objectContaining({
                    error: 'JSON serialization error',
                    userId: 1,
                })
            );
            expect(res.status).toHaveBeenCalledWith(500);
        });
    });

    describe('getDashboardAdmin error handling', () => {
        it('should handle database errors', async () => {
            const req: any = {
                platformUser: { userId: 1, email: 'admin@test.com', role: 'ADMIN' },
            };
            const res = createMockRes();

            prisma.user.findMany.mockRejectedValueOnce(new Error('Database connection failed'));

            await controller.getDashboardAdmin(req, res);

            expect(AppLogger.error).toHaveBeenCalledWith(
                'Error en dashboard de admin',
                expect.objectContaining({
                    error: 'Database connection failed',
                    userId: 1,
                })
            );
            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({
                message: 'Error al obtener dashboard',
            });
        });
    });

    describe('getDashboardSuperAdmin error handling', () => {
        it('should handle errors during stats collection', async () => {
            const req: any = {
                platformUser: { userId: 1, email: 'super@test.com', role: 'SUPERADMIN' },
            };
            const res = createMockRes();

            prisma.user.count.mockRejectedValueOnce(new Error('Count query failed'));

            await controller.getDashboardSuperAdmin(req, res);

            expect(AppLogger.error).toHaveBeenCalledWith(
                'Error en dashboard de superadmin',
                expect.objectContaining({
                    error: 'Count query failed',
                    userId: 1,
                })
            );
            expect(res.status).toHaveBeenCalledWith(500);
        });

        it('should handle errors during empresa groupBy', async () => {
            const req: any = {
                platformUser: { userId: 1, email: 'super@test.com', role: 'SUPERADMIN' },
            };
            const res = createMockRes();

            prisma.user.count.mockResolvedValueOnce(10);
            prisma.empresa.count.mockResolvedValueOnce(5);
            prisma.empresa.findMany.mockResolvedValueOnce([]);
            prisma.empresa.groupBy.mockRejectedValueOnce(new Error('GroupBy failed'));

            await controller.getDashboardSuperAdmin(req, res);

            expect(AppLogger.error).toHaveBeenCalledWith(
                'Error en dashboard de superadmin',
                expect.objectContaining({
                    error: 'GroupBy failed',
                })
            );
            expect(res.status).toHaveBeenCalledWith(500);
        });

        it('should successfully return dashboard with all stats', async () => {
            const req: any = {
                platformUser: { userId: 1, email: 'super@test.com', role: 'SUPERADMIN' },
            };
            const res = createMockRes();

            const mockDate = new Date('2025-01-15');
            prisma.user.count.mockResolvedValueOnce(100);
            prisma.empresa.count.mockResolvedValueOnce(10);
            prisma.empresa.findMany.mockResolvedValueOnce([
                { id: 1, nombre: 'Empresa 1', descripcion: 'Desc 1', createdAt: mockDate, updatedAt: mockDate },
                { id: 2, nombre: 'Empresa 2', descripcion: null, createdAt: mockDate, updatedAt: mockDate },
            ]);
            prisma.empresa.groupBy.mockResolvedValueOnce([
                { createdAt: mockDate, _count: { id: 5 } },
            ]);
            prisma.user.findMany.mockResolvedValueOnce([
                { id: 10, email: 'user1@test.com', role: 'ADMIN', createdAt: mockDate, updatedAt: mockDate },
                { id: 11, email: 'user2@test.com', role: 'OPERATOR', createdAt: mockDate, updatedAt: mockDate },
            ]);

            await controller.getDashboardSuperAdmin(req, res);

            expect(AppLogger.info).toHaveBeenCalledWith(
                'Dashboard de superadmin obtenido exitosamente',
                expect.objectContaining({
                    userId: 1,
                    usersCount: 100,
                    empresasCount: 10,
                })
            );

            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    empresasCount: 10,
                    totalUsersCount: 100,
                    empresas: expect.arrayContaining([
                        expect.objectContaining({
                            id: 1,
                            nombre: 'Empresa 1',
                            usuariosCount: 0,
                        }),
                    ]),
                    empresasStats: expect.arrayContaining([
                        expect.objectContaining({
                            month: '2025-01',
                            count: 5,
                        }),
                    ]),
                    systemActivity: expect.any(Array),
                    serverUsage: expect.any(Number),
                })
            );
        });
    });

    describe('getDashboard routing', () => {
        it('should route to SUPERADMIN dashboard', async () => {
            const req: any = {
                platformUser: { userId: 1, email: 'super@test.com', role: 'SUPERADMIN' },
            };
            const res = createMockRes();

            prisma.user.count.mockResolvedValueOnce(10);
            prisma.empresa.count.mockResolvedValueOnce(5);
            prisma.empresa.findMany.mockResolvedValueOnce([]);
            prisma.empresa.groupBy.mockResolvedValueOnce([]);
            prisma.user.findMany.mockResolvedValueOnce([]);

            await controller.getDashboard(req, res);

            expect(AppLogger.info).toHaveBeenCalledWith(
                'Solicitando dashboard',
                expect.objectContaining({
                    userId: 1,
                    role: 'SUPERADMIN',
                })
            );
            expect(res.json).toHaveBeenCalled();
        });

        it('should route to OPERATOR dashboard', async () => {
            const req: any = {
                platformUser: { userId: 2, email: 'operator@test.com', role: 'OPERATOR' },
            };
            const res = createMockRes();

            await controller.getDashboard(req, res);

            expect(AppLogger.info).toHaveBeenCalledWith(
                'Solicitando dashboard',
                expect.objectContaining({
                    userId: 2,
                    role: 'OPERATOR',
                })
            );
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    user: expect.objectContaining({
                        id: 2,
                        email: 'operator@test.com',
                        role: 'OPERATOR',
                    }),
                    recentActivity: expect.any(Array),
                })
            );
        });

        it('should handle errors in getDashboard', async () => {
            const req: any = {
                platformUser: { userId: 1, email: 'admin@test.com', role: 'ADMIN' },
            };
            const res = createMockRes();

            prisma.user.findMany.mockRejectedValueOnce(new Error('Routing error'));

            await controller.getDashboard(req, res);

            // El error se captura en getDashboardAdmin, no en getDashboard
            expect(AppLogger.error).toHaveBeenCalledWith(
                'Error en dashboard de admin',
                expect.objectContaining({
                    error: 'Routing error',
                    userId: 1,
                })
            );
            expect(res.status).toHaveBeenCalledWith(500);
        });
    });

    describe('refreshDashboard', () => {
        it('should successfully refresh dashboard', async () => {
            const req: any = {
                platformUser: { userId: 1, email: 'user@test.com', role: 'OPERATOR' },
            };
            const res = createMockRes();

            await controller.refreshDashboard(req, res);

            expect(AppLogger.info).toHaveBeenCalledWith(
                'Refrescando dashboard',
                expect.objectContaining({ userId: 1 })
            );
            expect(res.json).toHaveBeenCalled();
        });

        it('should handle errors during refresh', async () => {
            const req: any = {
                platformUser: { userId: 1, email: 'admin@test.com', role: 'ADMIN' },
            };
            const res = createMockRes();

            prisma.user.findMany.mockRejectedValueOnce(new Error('Refresh failed'));

            await controller.refreshDashboard(req, res);

            // El error se captura en getDashboardAdmin, no en refreshDashboard
            expect(AppLogger.error).toHaveBeenCalledWith(
                'Error en dashboard de admin',
                expect.objectContaining({
                    error: 'Refresh failed',
                    userId: 1,
                })
            );
            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({
                message: 'Error al obtener dashboard',
            });
        });
    });
});
