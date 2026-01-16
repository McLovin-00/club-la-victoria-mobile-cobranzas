/**
 * Tests para AuthService - Ejecuta código real
 * @jest-environment node
 */

const mockUser = {
  findUnique: jest.fn(),
  findMany: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  count: jest.fn(),
};

jest.mock('../../config/prisma', () => ({
  prismaService: {
    getClient: () => ({ user: mockUser }),
  },
}));

jest.mock('bcryptjs', () => ({
  hash: jest.fn().mockResolvedValue('hashed_password'),
  compare: jest.fn(),
}));

jest.mock('jsonwebtoken', () => ({
  sign: jest.fn().mockReturnValue('mock_jwt_token'),
  verify: jest.fn(),
}));

jest.mock('../../config/environment', () => ({
  getEnvironment: () => ({
    jwtPrivateKey: 'mock_private_key',
    jwtPublicKey: 'mock_public_key',
    JWT_LEGACY_SECRET: 'mock_secret',
  }),
}));

jest.mock('../../config/logger', () => ({
  AppLogger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    logDatabaseOperation: jest.fn(),
  },
}));

import { authService } from '../auth.service';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

describe('AuthService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('login', () => {
    it('should login successfully with valid credentials', async () => {
      const mockUserData = {
        id: 1,
        email: 'test@example.com',
        password: 'hashed_password',
        role: 'ADMIN',
        empresaId: 100,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockUser.findUnique.mockResolvedValue(mockUserData);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await authService.login({
        email: 'test@example.com',
        password: 'password123',
      });

      expect(result.success).toBe(true);
      expect(result.token).toBe('mock_jwt_token');
      expect(result.data.email).toBe('test@example.com');
      expect(mockUser.findUnique).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
      });
    });

    it('should throw error for invalid email', async () => {
      mockUser.findUnique.mockResolvedValue(null);

      await expect(
        authService.login({
          email: 'nonexistent@example.com',
          password: 'password123',
        })
      ).rejects.toThrow('Credenciales inválidas');
    });

    it('should throw error for invalid password', async () => {
      mockUser.findUnique.mockResolvedValue({
        id: 1,
        email: 'test@example.com',
        password: 'hashed_password',
        role: 'USER',
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        authService.login({
          email: 'test@example.com',
          password: 'wrong_password',
        })
      ).rejects.toThrow('Credenciales inválidas');
    });
  });

  describe('register', () => {
    it('should register a new user', async () => {
      mockUser.findUnique.mockResolvedValue(null); // No existing user
      mockUser.create.mockResolvedValue({
        id: 1,
        email: 'new@example.com',
        password: 'hashed_password',
        role: 'OPERATOR',
        empresaId: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await authService.register(
        {
          email: 'new@example.com',
          password: 'password123',
          role: 'OPERATOR' as any,
          empresaId: 1,
        },
        { userId: 999, email: 'admin@bca.com', role: 'SUPERADMIN' as any }
      );

      expect(result.success).toBe(true);
      expect(result.data.email).toBe('new@example.com');
      expect(bcrypt.hash).toHaveBeenCalledWith('password123', 12);
    });

    it('should throw error if email already exists', async () => {
      mockUser.findUnique.mockResolvedValue({
        id: 1,
        email: 'existing@example.com',
      });

      await expect(
        authService.register(
          {
            email: 'existing@example.com',
            password: 'password123',
            role: 'OPERATOR' as any,
            empresaId: 1,
          },
          { userId: 999, email: 'admin@bca.com', role: 'SUPERADMIN' as any }
        )
      ).rejects.toThrow('El email ya está registrado');
    });
  });

  describe('getProfile', () => {
    it('should return user profile', async () => {
      mockUser.findUnique.mockResolvedValue({
        id: 1,
        email: 'test@example.com',
        role: 'ADMIN',
        empresaId: 100,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await authService.getProfile(1);

      expect(result).not.toBeNull();
      expect(result?.email).toBe('test@example.com');
    });

    it('should return null for non-existent user', async () => {
      mockUser.findUnique.mockResolvedValue(null);

      await expect(authService.getProfile(999)).rejects.toThrow('Usuario no encontrado');
    });
  });

  describe('verifyToken', () => {
    it('should verify valid token', async () => {
      (jwt.verify as jest.Mock).mockReturnValue({
        userId: 1,
        email: 'test@example.com',
        role: 'ADMIN',
      });

      const result = await authService.verifyToken('valid_token');

      expect(result).not.toBeNull();
      expect(result?.userId).toBe(1);
    });

    it('should return null for invalid token', async () => {
      (jwt.verify as jest.Mock).mockImplementation(() => {
        throw new Error('Invalid token');
      });

      const result = await authService.verifyToken('invalid_token');

      expect(result).toBeNull();
    });
  });

  describe('changePassword', () => {
    it('should change password successfully', async () => {
      mockUser.findUnique.mockResolvedValue({
        id: 1,
        email: 'test@example.com',
        password: 'old_hashed_password',
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      mockUser.update.mockResolvedValue({ id: 1 });

      await expect(authService.changePassword(1, 'oldPassword', 'newPassword')).resolves.toBeUndefined();
      expect(mockUser.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { password: 'hashed_password' },
      });
    });

    it('should throw error for wrong current password', async () => {
      mockUser.findUnique.mockResolvedValue({
        id: 1,
        password: 'hashed_password',
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(authService.changePassword(1, 'wrongPassword', 'newPassword')).rejects.toThrow('Contraseña actual incorrecta');
    });

    it('should throw error for non-existent user', async () => {
      mockUser.findUnique.mockResolvedValue(null);

      await expect(authService.changePassword(999, 'old', 'new')).rejects.toThrow('Usuario no encontrado');
    });
  });

  describe('refreshToken', () => {
    it('should refresh token with valid token', async () => {
      (jwt.verify as jest.Mock).mockReturnValue({
        userId: 1,
        email: 'test@example.com',
        role: 'ADMIN',
      });
      mockUser.findUnique.mockResolvedValue({
        id: 1,
        email: 'test@example.com',
        role: 'ADMIN',
        empresaId: 100,
      });

      const result = await authService.refreshToken('valid_token');

      expect(result).not.toBeNull();
      expect(result?.token).toBe('mock_jwt_token');
    });

    it('should return null for invalid token', async () => {
      (jwt.verify as jest.Mock).mockImplementation(() => {
        throw new Error('Invalid');
      });

      const result = await authService.refreshToken('invalid_token');

      expect(result).toBeNull();
    });
  });
});



