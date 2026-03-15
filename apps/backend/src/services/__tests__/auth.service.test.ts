/**
 * Tests for AuthService
 * @jest-environment node
 */

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

// Mock dependencies before importing the service
jest.mock('bcryptjs');
jest.mock('jsonwebtoken');
jest.mock('../../config/prisma', () => ({
  prismaService: {
    getClient: jest.fn().mockReturnValue({
      user: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        count: jest.fn(),
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

import { prismaService } from '../../config/prisma';

describe('AuthService', () => {
  const mockPrisma = prismaService.getClient() as any;
  const mockBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;
  const mockJwt = jwt as jest.Mocked<typeof jwt>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('login', () => {
    const mockUser = {
      id: 1,
      email: 'test@example.com',
      password: 'hashedpassword',
      role: 'ADMIN',
      empresaId: 100,
    };

    it('should return auth response on successful login', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockBcrypt.compare.mockResolvedValue(true as never);
      mockJwt.sign.mockReturnValue('mock-token' as never);

      // Import after mocks are set up
      const { authService } = await import('../auth.service');

      const result = await authService.login({
        email: 'test@example.com',
        password: 'validpassword',
      });

      expect(result.success).toBe(true);
      expect(result.token).toBe('mock-token');
      expect(result.data.email).toBe('test@example.com');
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
      });
    });

    it('should throw error for non-existent user', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const { authService } = await import('../auth.service');

      await expect(
        authService.login({ email: 'nonexistent@example.com', password: 'pass' })
      ).rejects.toThrow('Credenciales inválidas');
    });

    it('should throw error for invalid password', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockBcrypt.compare.mockResolvedValue(false as never);

      const { authService } = await import('../auth.service');

      await expect(
        authService.login({ email: 'test@example.com', password: 'wrongpassword' })
      ).rejects.toThrow('Credenciales inválidas');
    });
  });

  describe('getProfile', () => {
    it('should return user profile', async () => {
      const mockUser = {
        id: 1,
        email: 'test@example.com',
        role: 'ADMIN',
        empresaId: 100,
      };
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      const { authService } = await import('../auth.service');

      const result = await authService.getProfile(1);

      expect(result.userId).toBe(1);
      expect(result.email).toBe('test@example.com');
    });

    it('should throw error for non-existent user', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const { authService } = await import('../auth.service');

      await expect(authService.getProfile(999)).rejects.toThrow('Usuario no encontrado');
    });
  });

  describe('findByEmail', () => {
    it('should return user by email', async () => {
      const mockUser = {
        id: 1,
        email: 'test@example.com',
        role: 'ADMIN',
        empresaId: 100,
      };
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      const { authService } = await import('../auth.service');

      const result = await authService.findByEmail('test@example.com');

      expect(result?.userId).toBe(1);
      expect(result?.email).toBe('test@example.com');
    });

    it('should return null for non-existent email', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const { authService } = await import('../auth.service');

      const result = await authService.findByEmail('nonexistent@example.com');

      expect(result).toBeNull();
    });
  });

  describe('changePassword', () => {
    it('should change password successfully', async () => {
      const mockUser = {
        id: 1,
        email: 'test@example.com',
        password: 'currenthash',
        role: 'ADMIN',
      };
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockBcrypt.compare.mockResolvedValue(true as never);
      mockBcrypt.hash.mockResolvedValue('newhash' as never);
      mockPrisma.user.update.mockResolvedValue({ ...mockUser, password: 'newhash' });

      const { authService } = await import('../auth.service');

      await expect(
        authService.changePassword(1, 'currentpass', 'NewPass1x')
      ).resolves.toBeUndefined();

      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { password: 'newhash' },
      });
    });

    it('should throw error for wrong current password', async () => {
      const mockUser = {
        id: 1,
        email: 'test@example.com',
        password: 'currenthash',
        role: 'ADMIN',
      };
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockBcrypt.compare.mockResolvedValue(false as never);

      const { authService } = await import('../auth.service');

      await expect(
        authService.changePassword(1, 'wrongpass', 'NewPass1x')
      ).rejects.toThrow('Contraseña actual incorrecta');
    });
  });

  describe('generateToken', () => {
    it('should generate JWT token', async () => {
      mockJwt.sign.mockReturnValue('generated-token' as never);

      const { authService } = await import('../auth.service');

      const token = authService.generateToken({
        userId: 1,
        email: 'test@example.com',
        role: 'ADMIN' as any,
        empresaId: 100,
      });

      expect(token).toBe('generated-token');
      expect(mockJwt.sign).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 1,
          email: 'test@example.com',
        }),
        expect.any(String),
        expect.objectContaining({ algorithm: 'RS256' })
      );
    });
  });

  describe('verifyToken', () => {
    it('should verify valid token', async () => {
      const payload = { userId: 1, email: 'test@example.com', role: 'ADMIN' };
      mockJwt.verify.mockReturnValue(payload as never);

      const { authService } = await import('../auth.service');

      const result = authService.verifyToken('valid-token');

      expect(result).toEqual(payload);
    });

    it('should return null for invalid token', async () => {
      mockJwt.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      const { authService } = await import('../auth.service');

      const result = authService.verifyToken('invalid-token');

      expect(result).toBeNull();
    });
  });
});




