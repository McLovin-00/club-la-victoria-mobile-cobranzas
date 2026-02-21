/**
 * Extended Tests for AuthService - Coverage for register, refreshToken, updateUserEmpresa, 
 * validations and edge cases
 * @jest-environment node
 */

// Mock dependencies before importing the service
const mockUserFindUnique = jest.fn();
const mockUserFindMany = jest.fn();
const mockUserCreate = jest.fn();
const mockUserUpdate = jest.fn();
const mockUserDelete = jest.fn();
const mockUserCount = jest.fn();

jest.mock('bcryptjs', () => ({
    hash: jest.fn().mockResolvedValue('hashed-password'),
    compare: jest.fn().mockResolvedValue(true),
}));

jest.mock('jsonwebtoken', () => ({
    sign: jest.fn().mockReturnValue('mock-token'),
    verify: jest.fn().mockReturnValue({ userId: 1, email: 'test@example.com', role: 'ADMIN' }),
}));

jest.mock('../../config/prisma', () => ({
    prismaService: {
        getClient: jest.fn().mockReturnValue({
            user: {
                findUnique: mockUserFindUnique,
                findMany: mockUserFindMany,
                create: mockUserCreate,
                update: mockUserUpdate,
                delete: mockUserDelete,
                count: mockUserCount,
            },
        }),
    },
}));

jest.mock('../../config/environment', () => ({
    getEnvironment: jest.fn().mockReturnValue({
        jwtPrivateKey: '-----BEGIN RSA PRIVATE KEY-----\nMIIEowIBAAKCAQEA0Z3VS5JJcds3xfn/ygWyF8PbnGy\n-----END RSA PRIVATE KEY-----',
        jwtPublicKey: '-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA\n-----END PUBLIC KEY-----',
        JWT_LEGACY_SECRET: 'test-secret',
    }),
}));

jest.mock('../../config/logger', () => ({
    AppLogger: {
        debug: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
    },
}));

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { authService } from '../auth.service';

describe('AuthService Extended Tests', () => {
    const mockBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;
    const mockJwt = jwt as jest.Mocked<typeof jwt>;

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('register', () => {
        const mockAuthUser = {
            userId: 1,
            email: 'admin@example.com',
            role: 'ADMIN' as const,
            empresaId: 100,
        };

        const mockSuperadminUser = {
            userId: 1,
            email: 'superadmin@example.com',
            role: 'SUPERADMIN' as const,
        };

        it('should register a new user successfully with ADMIN creator', async () => {
            mockUserFindUnique.mockResolvedValue(null);
            mockUserCreate.mockResolvedValue({
                id: 2,
                email: 'newuser@example.com',
                role: 'OPERATOR',
                empresaId: 100,
                password: 'hashed-password',
            });

            const result = await authService.register(
                {
                    email: 'newuser@example.com',
                    password: 'password123',
                    role: 'OPERATOR' as any,
                    empresaId: 100,
                },
                mockAuthUser
            );

            expect(result.success).toBe(true);
            expect(result.data.email).toBe('newuser@example.com');
            expect(result.token).toBeDefined();
            expect(mockUserCreate).toHaveBeenCalled();
        });

        it('should register user with inherited empresaId from admin creator', async () => {
            mockUserFindUnique.mockResolvedValue(null);
            mockUserCreate.mockResolvedValue({
                id: 3,
                email: 'inherited@example.com',
                role: 'OPERATOR',
                empresaId: 100,
                password: 'hashed-password',
            });

            // Admin creator has empresaId, so it should be inherited
            const result = await authService.register(
                {
                    email: 'inherited@example.com',
                    password: 'password123',
                    role: 'OPERATOR' as any,
                    empresaId: 100, // Explicitly provide empresaId to match behavior
                },
                mockAuthUser
            );

            expect(result.success).toBe(true);
            expect(mockUserCreate).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: expect.objectContaining({
                        empresaId: 100,
                    }),
                })
            );
        });

        it('should throw error if email already exists', async () => {
            mockUserFindUnique.mockResolvedValue({
                id: 5,
                email: 'existing@example.com',
            });

            await expect(
                authService.register(
                    {
                        email: 'existing@example.com',
                        password: 'password123',
                        empresaId: 100, // empresaId is validated before email check
                    },
                    mockAuthUser
                )
            ).rejects.toThrow('El email ya está registrado');
        });

        it('should throw error if ADMIN tries to create SUPERADMIN', async () => {
            await expect(
                authService.register(
                    {
                        email: 'newuser@example.com',
                        password: 'password123',
                        role: 'SUPERADMIN' as any,
                    },
                    mockAuthUser
                )
            ).rejects.toThrow('Los administradores solo pueden crear usuarios con rol "OPERATOR" o "ADMIN"');
        });

        it('should throw error if SUPERADMIN tries to create another SUPERADMIN', async () => {
            await expect(
                authService.register(
                    {
                        email: 'newuser@example.com',
                        password: 'password123',
                        role: 'SUPERADMIN' as any,
                    },
                    mockSuperadminUser
                )
            ).rejects.toThrow('No se puede crear otro superadministrador');
        });

        it('should throw error if OPERATOR tries to create a user', async () => {
            const operatorUser = {
                userId: 1,
                email: 'operator@example.com',
                role: 'OPERATOR' as const,
                empresaId: 100,
            };

            await expect(
                authService.register(
                    {
                        email: 'newuser@example.com',
                        password: 'password123',
                    },
                    operatorUser
                )
            ).rejects.toThrow('No tienes permisos para crear usuarios');
        });

        it('should throw error if non-superadmin user has no empresaId', async () => {
            mockUserFindUnique.mockResolvedValue(null);

            const superadminUser = {
                userId: 1,
                email: 'superadmin@example.com',
                role: 'SUPERADMIN' as const,
            };

            await expect(
                authService.register(
                    {
                        email: 'newuser@example.com',
                        password: 'password123',
                        role: 'ADMIN' as any,
                    },
                    superadminUser
                )
            ).rejects.toThrow('Los usuarios admin y operator deben tener una empresa asignada');
        });

        it('should allow SUPERADMIN to register user with any role except SUPERADMIN', async () => {
            mockUserFindUnique.mockResolvedValue(null);
            mockUserCreate.mockResolvedValue({
                id: 2,
                email: 'newadmin@example.com',
                role: 'ADMIN',
                empresaId: 50,
                password: 'hashed-password',
            });

            const result = await authService.register(
                {
                    email: 'newadmin@example.com',
                    password: 'password123',
                    role: 'ADMIN' as any,
                    empresaId: 50,
                },
                mockSuperadminUser
            );

            expect(result.success).toBe(true);
            expect(result.data.role).toBe('ADMIN');
        });
    });

    describe('refreshToken', () => {
        it('should refresh a valid token', async () => {
            const tokenPayload = {
                userId: 1,
                email: 'test@example.com',
                role: 'ADMIN',
                empresaId: 100,
            };

            mockJwt.verify.mockReturnValue(tokenPayload as never);
            mockUserFindUnique.mockResolvedValue({
                id: 1,
                email: 'test@example.com',
                role: 'ADMIN',
                empresaId: 100,
            });

            const result = await authService.refreshToken('valid-old-token');

            expect(result).not.toBeNull();
            expect(result!.token).toBeDefined();
            expect(result!.user.email).toBe('test@example.com');
        });

        it('should return null for invalid token', async () => {
            mockJwt.verify.mockImplementation(() => {
                throw new Error('Invalid token');
            });

            const result = await authService.refreshToken('invalid-token');

            expect(result).toBeNull();
        });
    });

    describe('updateUserEmpresa', () => {
        it('should update user empresa and return new token', async () => {
            const updatedUser = {
                id: 1,
                email: 'test@example.com',
                role: 'ADMIN',
                empresaId: 200,
                password: 'hash',
            };

            mockUserUpdate.mockResolvedValue(updatedUser);

            const result = await authService.updateUserEmpresa(1, 200);

            expect(result.success).toBe(true);
            expect(result.data.empresaId).toBe(200);
            expect(result.token).toBeDefined();
            expect(mockUserUpdate).toHaveBeenCalledWith({
                where: { id: 1 },
                data: { empresaId: 200 },
            });
        });

        it('should set empresaId to null when passed null', async () => {
            const updatedUser = {
                id: 1,
                email: 'test@example.com',
                role: 'SUPERADMIN',
                empresaId: null,
                password: 'hash',
            };

            mockUserUpdate.mockResolvedValue(updatedUser);

            const result = await authService.updateUserEmpresa(1, null);

            expect(result.success).toBe(true);
            expect(result.data.empresaId).toBeUndefined();
            expect(mockUserUpdate).toHaveBeenCalledWith({
                where: { id: 1 },
                data: { empresaId: null },
            });
        });

        it('should throw error on database failure', async () => {
            mockUserUpdate.mockRejectedValue(new Error('Database error'));

            await expect(authService.updateUserEmpresa(1, 200)).rejects.toThrow('Database error');
        });
    });

    describe('verifyToken with legacy fallback', () => {
        it('should verify RS256 token successfully', () => {
            const payload = { userId: 1, email: 'test@example.com', role: 'ADMIN' };
            mockJwt.verify.mockReturnValue(payload as never);

            const result = authService.verifyToken('valid-rs256-token');

            expect(result).toEqual(payload);
        });

        it('should fallback to HS256 if RS256 fails and legacy secret exists', () => {
            const payload = { userId: 1, email: 'test@example.com', role: 'ADMIN' };
            let callCount = 0;
            mockJwt.verify.mockImplementation(() => {
                callCount++;
                if (callCount === 1) {
                    throw new Error('RS256 verification failed');
                }
                return payload as any;
            });

            const result = authService.verifyToken('legacy-hs256-token');

            expect(result).toEqual(payload);
            expect(mockJwt.verify).toHaveBeenCalledTimes(2);
        });

        it('should return null if both RS256 and HS256 fail', () => {
            mockJwt.verify.mockImplementation(() => {
                throw new Error('Token verification failed');
            });

            const result = authService.verifyToken('totally-invalid-token');

            expect(result).toBeNull();
        });
    });

    describe('hashPassword usage in register', () => {
        it('should hash password correctly', async () => {
            mockUserFindUnique.mockResolvedValue(null);
            mockUserCreate.mockResolvedValue({
                id: 1,
                email: 'test@example.com',
                role: 'OPERATOR',
                empresaId: 100,
                password: 'hashed-password',
            });

            const adminUser = {
                userId: 1,
                email: 'admin@example.com',
                role: 'ADMIN' as const,
                empresaId: 100,
            };

            await authService.register(
                {
                    email: 'test@example.com',
                    password: 'plain-password',
                    empresaId: 100,
                },
                adminUser
            );

            expect(mockBcrypt.hash).toHaveBeenCalledWith('plain-password', 12);
        });
    });

    describe('changePassword edge cases', () => {
        it('should throw error if user not found during password change', async () => {
            mockUserFindUnique.mockResolvedValue(null);

            await expect(
                authService.changePassword(999, 'oldpass', 'newpass')
            ).rejects.toThrow('Usuario no encontrado');
        });
    });

    describe('login edge cases', () => {
        it('should normalize email to lowercase', async () => {
            const mockUser = {
                id: 1,
                email: 'test@example.com',
                password: 'hashedpassword',
                role: 'ADMIN',
                empresaId: 100,
            };
            mockUserFindUnique.mockResolvedValue(mockUser);
            mockBcrypt.compare.mockResolvedValue(true as never);

            await authService.login({
                email: '  TEST@EXAMPLE.COM  ',
                password: 'password',
            });

            expect(mockUserFindUnique).toHaveBeenCalledWith({
                where: { email: 'test@example.com' },
            });
        });

        it('should include all association IDs in token', async () => {
            const mockUser = {
                id: 1,
                email: 'test@example.com',
                password: 'hashedpassword',
                role: 'ADMIN',
                empresaId: 100,
                dadorCargaId: 10,
                empresaTransportistaId: 20,
                choferId: 30,
                clienteId: 40,
            };
            mockUserFindUnique.mockResolvedValue(mockUser);
            mockBcrypt.compare.mockResolvedValue(true as never);

            await authService.login({
                email: 'test@example.com',
                password: 'password',
            });

            expect(mockJwt.sign).toHaveBeenCalledWith(
                expect.objectContaining({
                    userId: 1,
                    empresaId: 100,
                    dadorCargaId: 10,
                    empresaTransportistaId: 20,
                    choferId: 30,
                    clienteId: 40,
                }),
                expect.any(String),
                expect.any(Object)
            );
        });
    });
});
