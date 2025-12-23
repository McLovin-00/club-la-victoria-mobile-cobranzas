/**
 * Tests for UserService
 * @jest-environment node
 */

import bcrypt from 'bcryptjs';

// Mock dependencies
jest.mock('bcryptjs');
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
jest.mock('../../config/logger', () => ({
  AppLogger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    logError: jest.fn(),
    logDatabaseOperation: jest.fn(),
    logSecurityEvent: jest.fn(),
    logPerformance: jest.fn(),
  },
}));

import { prismaService } from '../../config/prisma';
import { UserService } from '../user.service';

describe('UserService', () => {
  const mockPrisma = prismaService.getClient() as any;
  const mockBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;
  let userService: UserService;

  beforeEach(() => {
    jest.clearAllMocks();
    userService = UserService.getInstance();
  });

  describe('getInstance', () => {
    it('should return singleton instance', () => {
      const instance1 = UserService.getInstance();
      const instance2 = UserService.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('findById', () => {
    it('should find user by id', async () => {
      const mockUser = {
        id: 1,
        email: 'test@example.com',
        role: 'ADMIN',
        empresaId: 100,
        empresa: { id: 100, nombre: 'Test Company', descripcion: 'Test' },
      };
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      const result = await userService.findById(1);

      expect(result).toEqual(mockUser);
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
        include: { empresa: { select: { id: true, nombre: true, descripcion: true } } },
      });
    });

    it('should return null for non-existent user', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const result = await userService.findById(999);

      expect(result).toBeNull();
    });
  });

  describe('findMany', () => {
    it('should find users with filters', async () => {
      const mockUsers = [
        { id: 1, email: 'user1@example.com', role: 'ADMIN' },
        { id: 2, email: 'user2@example.com', role: 'ADMIN' },
      ];
      mockPrisma.user.findMany.mockResolvedValue(mockUsers);

      const result = await userService.findMany({ role: 'ADMIN' as any });

      expect(result).toEqual(mockUsers);
      expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { role: 'ADMIN' },
        })
      );
    });

    it('should apply search filter', async () => {
      mockPrisma.user.findMany.mockResolvedValue([]);

      await userService.findMany({ search: 'test' });

      expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { email: { contains: 'test', mode: 'insensitive' } },
        })
      );
    });

    it('should apply pagination', async () => {
      mockPrisma.user.findMany.mockResolvedValue([]);

      await userService.findMany({ limit: 10, offset: 20 });

      expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 10,
          skip: 20,
        })
      );
    });
  });

  describe('create', () => {
    it('should create user with hashed password', async () => {
      const userData = {
        email: 'new@example.com',
        password: 'plainpassword',
        role: 'OPERATOR' as any,
      };
      const createdUser = {
        id: 1,
        email: 'new@example.com',
        role: 'OPERATOR',
        empresaId: null,
      };
      mockBcrypt.hash.mockResolvedValue('hashedpassword' as never);
      mockPrisma.user.create.mockResolvedValue(createdUser);

      const result = await userService.create(userData);

      expect(result).toEqual(createdUser);
      expect(mockBcrypt.hash).toHaveBeenCalledWith('plainpassword', 12);
      expect(mockPrisma.user.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          email: 'new@example.com',
          password: 'hashedpassword',
        }),
        include: expect.any(Object),
      });
    });

    it('should normalize email to lowercase', async () => {
      mockBcrypt.hash.mockResolvedValue('hashedpassword' as never);
      mockPrisma.user.create.mockResolvedValue({ id: 1 });

      await userService.create({
        email: 'Test@EXAMPLE.com  ',
        password: 'password',
      });

      expect(mockPrisma.user.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          email: 'test@example.com',
        }),
        include: expect.any(Object),
      });
    });
  });

  describe('update', () => {
    it('should update user', async () => {
      const updatedUser = {
        id: 1,
        email: 'updated@example.com',
        role: 'ADMIN',
      };
      mockPrisma.user.update.mockResolvedValue(updatedUser);

      const result = await userService.update(1, { email: 'updated@example.com' });

      expect(result).toEqual(updatedUser);
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { email: 'updated@example.com' },
        include: expect.any(Object),
      });
    });

    it('should hash password when updating', async () => {
      mockBcrypt.hash.mockResolvedValue('newhash' as never);
      mockPrisma.user.update.mockResolvedValue({ id: 1 });

      await userService.update(1, { password: 'newpassword' });

      expect(mockBcrypt.hash).toHaveBeenCalledWith('newpassword', 12);
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: expect.objectContaining({ password: 'newhash' }),
        include: expect.any(Object),
      });
    });
  });

  describe('delete', () => {
    it('should delete user', async () => {
      mockPrisma.user.delete.mockResolvedValue({ id: 1 });

      await userService.delete(1);

      expect(mockPrisma.user.delete).toHaveBeenCalledWith({ where: { id: 1 } });
    });
  });

  describe('count', () => {
    it('should count users with filters', async () => {
      mockPrisma.user.count.mockResolvedValue(5);

      const result = await userService.count({ role: 'ADMIN' as any });

      expect(result).toBe(5);
      expect(mockPrisma.user.count).toHaveBeenCalledWith({
        where: { role: 'ADMIN' },
      });
    });

    it('should count all users without filters', async () => {
      mockPrisma.user.count.mockResolvedValue(10);

      const result = await userService.count();

      expect(result).toBe(10);
    });
  });
});

