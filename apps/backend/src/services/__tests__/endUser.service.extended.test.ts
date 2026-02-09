/**
 * Extended Tests for EndUserService - Coverage for all static methods
 * @jest-environment node
 */

const mockEndUserFindUnique = jest.fn();
const mockEndUserFindMany = jest.fn();
const mockEndUserCreate = jest.fn();
const mockEndUserUpdate = jest.fn();
const mockEndUserCount = jest.fn();
const mockEndUserGroupBy = jest.fn();

jest.mock('../../config/prisma', () => ({
    prismaService: {
        getClient: jest.fn().mockReturnValue({
            endUser: {
                findUnique: mockEndUserFindUnique,
                findMany: mockEndUserFindMany,
                create: mockEndUserCreate,
                update: mockEndUserUpdate,
                count: mockEndUserCount,
                groupBy: mockEndUserGroupBy,
            },
        }),
    },
}));

jest.mock('../../config/logger', () => ({
    AppLogger: {
        debug: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
    },
}));

import { EndUserService } from '../endUser.service';

describe('EndUserService Extended Tests', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('identifyUser', () => {
        it('should find user by identifier type and value', async () => {
            const mockUser = {
                id: 1,
                identifierType: 'EMAIL',
                identifier_value: 'test@example.com',
                nombre: 'Test',
                apellido: 'User',
                empresaId: 100,
                is_active: true,
                createdAt: new Date(),
                updatedAt: new Date(),
                empresa: { id: 100, nombre: 'Test Company' },
            };
            mockEndUserFindUnique.mockResolvedValue(mockUser);
            mockEndUserUpdate.mockResolvedValue(mockUser);

            const result = await EndUserService.identifyUser('EMAIL' as any, 'test@example.com');

            expect(result).toBeDefined();
            expect(result?.id).toBe(1);
            expect(mockEndUserFindUnique).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: {
                        identifierType_identifier_value: {
                            identifierType: 'EMAIL',
                            identifier_value: 'test@example.com',
                        },
                    },
                })
            );
        });

        it('should return null when user not found', async () => {
            mockEndUserFindUnique.mockResolvedValue(null);

            const result = await EndUserService.identifyUser('EMAIL' as any, 'nonexistent@example.com');

            expect(result).toBeNull();
        });

        it('should return null on database error', async () => {
            mockEndUserFindUnique.mockRejectedValue(new Error('Database error'));

            const result = await EndUserService.identifyUser('EMAIL' as any, 'test@example.com');

            expect(result).toBeNull();
        });
    });

    describe('createEndUser', () => {
        it('should create a new end user with all fields', async () => {
            const createData = {
                identifierType: 'EMAIL',
                identifier_value: 'new@example.com',
                empresaId: 100,
                nombre: 'New',
                apellido: 'User',
                direccion: 'Street 123',
                localidad: 'City',
                provincia: 'Province',
                pais: 'Argentina',
                metadata: { custom: 'value' },
            };

            // First call to identifyUser returns null (user doesn't exist)
            mockEndUserFindUnique.mockResolvedValue(null);
            mockEndUserCreate.mockResolvedValue({
                id: 2,
                identifierType: 'EMAIL',
                identifier_value: 'new@example.com',
                email: 'new@example.com',
                empresaId: 100,
                nombre: 'New',
                apellido: 'User',
                direccion: 'Street 123',
                localidad: 'City',
                provincia: 'Province',
                pais: 'Argentina',
                metadata: { custom: 'value' },
                is_active: true,
                createdAt: new Date(),
                updatedAt: new Date(),
            });

            const result = await EndUserService.createEndUser(createData);

            expect(result).toBeDefined();
            expect(result.id).toBe(2);
            expect(mockEndUserCreate).toHaveBeenCalled();
        });

        it('should throw error if user already exists', async () => {
            mockEndUserFindUnique.mockResolvedValue({
                id: 1,
                identifierType: 'EMAIL',
                identifier_value: 'existing@example.com',
            });
            mockEndUserUpdate.mockResolvedValue({
                id: 1,
                identifierType: 'EMAIL',
                identifier_value: 'existing@example.com',
            });

            await expect(
                EndUserService.createEndUser({
                    identifierType: 'EMAIL' as any,
                    identifier_value: 'existing@example.com',
                })
            ).rejects.toThrow('Usuario final ya existe con este identificador');
        });
    });

    describe('getOrCreateEndUser', () => {
        it('should return existing user if found', async () => {
            const existingUser = {
                id: 1,
                identifierType: 'PHONE',
                identifier_value: '+5491112345678',
                nombre: 'Existing',
                is_active: true,
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            mockEndUserFindUnique.mockResolvedValue(existingUser);
            mockEndUserUpdate.mockResolvedValue(existingUser);

            const result = await EndUserService.getOrCreateEndUser({
                identifierType: 'PHONE' as any,
                identifier_value: '+5491112345678',
            });

            expect(result.id).toBe(1);
            expect(mockEndUserCreate).not.toHaveBeenCalled();
        });

        it('should reactivate inactive user', async () => {
            const inactiveUser = {
                id: 1,
                identifierType: 'EMAIL',
                identifier_value: 'inactive@example.com',
                is_active: false,
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            const reactivatedUser = { ...inactiveUser, is_active: true };

            mockEndUserFindUnique.mockResolvedValue(inactiveUser);
            mockEndUserUpdate.mockResolvedValue(reactivatedUser);

            const _result = await EndUserService.getOrCreateEndUser({
                identifierType: 'EMAIL' as any,
                identifier_value: 'inactive@example.com',
            });

            expect(mockEndUserUpdate).toHaveBeenCalled();
        });

        it('should create new user if not found', async () => {
            mockEndUserFindUnique.mockResolvedValue(null);
            mockEndUserCreate.mockResolvedValue({
                id: 3,
                identifierType: 'PHONE',
                identifier_value: '+5491198765432',
                email: '+5491198765432',
                is_active: true,
                createdAt: new Date(),
                updatedAt: new Date(),
            });

            const result = await EndUserService.getOrCreateEndUser({
                identifierType: 'PHONE' as any,
                identifier_value: '+5491198765432',
            });

            expect(result.id).toBe(3);
            expect(mockEndUserCreate).toHaveBeenCalled();
        });
    });

    describe('updateEndUser', () => {
        it('should update user with new data', async () => {
            const updatedUser = {
                id: 1,
                identifierType: 'EMAIL',
                identifier_value: 'test@example.com',
                nombre: 'Updated',
                apellido: 'Name',
                is_active: true,
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            mockEndUserUpdate.mockResolvedValue(updatedUser);

            const result = await EndUserService.updateEndUser(1, {
                nombre: 'Updated',
                apellido: 'Name',
            });

            expect(result.nombre).toBe('Updated');
            expect(mockEndUserUpdate).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: { id: 1 },
                })
            );
        });

        it('should throw error for non-existent user', async () => {
            mockEndUserUpdate.mockRejectedValue(new Error('Record to update not found'));

            await expect(
                EndUserService.updateEndUser(999, { nombre: 'Test' })
            ).rejects.toThrow('Record to update not found');
        });
    });

    describe('searchEndUsers', () => {
        it('should search users with pagination', async () => {
            const mockUsers = [
                { id: 1, identifierType: 'EMAIL', identifier_value: 'a@test.com' },
                { id: 2, identifierType: 'EMAIL', identifier_value: 'b@test.com' },
            ];

            mockEndUserFindMany.mockResolvedValue(mockUsers);
            mockEndUserCount.mockResolvedValue(10);

            const result = await EndUserService.searchEndUsers({
                page: 1,
                limit: 10,
                empresaId: 100,
            });

            expect(result.users).toHaveLength(2);
            expect(result.total).toBe(10);
            expect(result.page).toBe(1);
            expect(result.limit).toBe(10);
            expect(result.totalPages).toBe(1);
        });

        it('should filter by search term', async () => {
            mockEndUserFindMany.mockResolvedValue([]);
            mockEndUserCount.mockResolvedValue(0);

            const result = await EndUserService.searchEndUsers({
                search: 'test',
                page: 1,
                limit: 10,
            });

            expect(result.users).toHaveLength(0);
            expect(result.total).toBe(0);
            expect(mockEndUserFindMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: expect.objectContaining({
                        OR: expect.any(Array),
                    }),
                })
            );
        });

        it('should filter by identifier type', async () => {
            mockEndUserFindMany.mockResolvedValue([]);
            mockEndUserCount.mockResolvedValue(0);

            await EndUserService.searchEndUsers({
                identifierType: 'EMAIL' as any,
                page: 1,
                limit: 10,
            });

            expect(mockEndUserFindMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: expect.objectContaining({
                        identifierType: 'EMAIL',
                    }),
                })
            );
        });
    });

    describe('deactivateEndUser', () => {
        it('should deactivate user by setting isActive to false', async () => {
            mockEndUserUpdate.mockResolvedValue({
                id: 1,
                is_active: false,
            });

            await EndUserService.deactivateEndUser(1);

            expect(mockEndUserUpdate).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: { id: 1 },
                    data: expect.objectContaining({
                        is_active: false,
                    }),
                })
            );
        });
    });

    describe('getEndUserStats', () => {
        it('should get stats for all users', async () => {
            mockEndUserCount
                .mockResolvedValueOnce(80)  // totalActive
                .mockResolvedValueOnce(20); // totalInactive
            mockEndUserGroupBy.mockResolvedValue([
                { identifierType: 'EMAIL', _count: { id: 60 } },
                { identifierType: 'PHONE', _count: { id: 40 } },
            ]);

            const result = await EndUserService.getEndUserStats();

            expect(result).toBeDefined();
            expect(result.total).toBe(100);
            expect(result.totalActive).toBe(80);
            expect(result.totalInactive).toBe(20);
            expect(result.byIdentifierType).toEqual({
                EMAIL: 60,
                PHONE: 40,
            });
        });

        it('should get stats filtered by empresaId', async () => {
            mockEndUserCount
                .mockResolvedValueOnce(30)
                .mockResolvedValueOnce(10);
            mockEndUserGroupBy.mockResolvedValue([
                { identifierType: 'EMAIL', _count: { id: 40 } },
            ]);

            const result = await EndUserService.getEndUserStats(100);

            expect(result).toBeDefined();
            expect(result.total).toBe(40);
            expect(mockEndUserCount).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: expect.objectContaining({
                        empresaId: 100,
                    }),
                })
            );
        });
    });

    describe('updateLastAccess', () => {
        it('should update last_access timestamp', async () => {
            mockEndUserUpdate.mockResolvedValue({
                id: 1,
                last_access: new Date(),
            });

            await EndUserService.updateLastAccess(1);

            expect(mockEndUserUpdate).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: { id: 1 },
                    data: expect.objectContaining({
                        last_access: expect.any(Date),
                    }),
                })
            );
        });

        it('should not throw on error (just logs warning)', async () => {
            mockEndUserUpdate.mockRejectedValue(new Error('DB error'));

            // Should not throw
            await EndUserService.updateLastAccess(1);
        });
    });
});
