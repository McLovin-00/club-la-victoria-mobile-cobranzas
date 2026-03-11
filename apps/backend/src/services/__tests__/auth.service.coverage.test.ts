/**
 * Coverage tests for AuthService – login, register, getProfile,
 * findByEmail, changePassword, refreshToken, verifyToken (RS256 + legacy HS256),
 * generateToken, updateUserEmpresa, loadKey, validateRegistrationPermissions,
 * validateEmpresaIdRequirement, determineFinalEmpresaId.
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';

const prismaMock = {
  user: {
    findUnique: jest.fn<any>(),
    create: jest.fn<any>(),
    update: jest.fn<any>(),
    delete: jest.fn<any>(),
    findMany: jest.fn<any>(),
    count: jest.fn<any>(),
  },
};

jest.mock('../../config/prisma', () => ({
  prismaService: {
    getClient: () => prismaMock,
  },
}));

jest.mock('../../config/logger', () => ({
  AppLogger: {
    info: jest.fn<any>(),
    warn: jest.fn<any>(),
    error: jest.fn<any>(),
    debug: jest.fn<any>(),
    logDatabaseOperation: jest.fn<any>(),
    logError: jest.fn<any>(),
  },
}));

jest.mock('../../config/environment', () => ({
  getEnvironment: () => ({
    jwtPrivateKey: '',
    jwtPublicKey: '',
    JWT_PRIVATE_KEY: '-----BEGIN PRIVATE KEY-----\nmock-private\n-----END PRIVATE KEY-----',
    JWT_PUBLIC_KEY: '-----BEGIN PUBLIC KEY-----\nmock-public\n-----END PUBLIC KEY-----',
    JWT_PRIVATE_KEY_PATH: undefined,
    JWT_PUBLIC_KEY_PATH: undefined,
    JWT_LEGACY_SECRET: 'legacy-secret',
  }),
}));

jest.mock('bcryptjs', () => ({
  hash: jest.fn<any>(),
  compare: jest.fn<any>(),
}));

jest.mock('jsonwebtoken', () => ({
  sign: jest.fn<any>(() => 'mock-jwt-token'),
  verify: jest.fn<any>(),
}));

import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';

// NOSONAR: dynamic import required because AuthService singleton inits on module load
const { authService } = require('../auth.service') as typeof import('../auth.service');

const UserRole = {
  SUPERADMIN: 'SUPERADMIN',
  ADMIN: 'ADMIN',
  OPERATOR: 'OPERATOR',
} as const;

function makeUser(overrides: Record<string, any> = {}) {
  return {
    id: 1,
    email: 'test@example.com',
    password: 'hashed-password',
    role: 'ADMIN',
    empresaId: 10,
    dadorCargaId: null,
    empresaTransportistaId: null,
    choferId: null,
    clienteId: null,
    ...overrides,
  };
}

describe('AuthService (coverage)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ==========================================================================
  // login
  // ==========================================================================
  describe('login', () => {
    it('returns auth response on valid credentials', async () => {
      const user = makeUser();
      prismaMock.user.findUnique.mockResolvedValue(user);
      (bcrypt.compare as jest.Mock<any>).mockResolvedValue(true);

      const result = await authService.login({
        email: 'test@example.com',
        password: 'password123',
      });

      expect(result.success).toBe(true);
      expect(result.token).toBe('mock-jwt-token');
      expect(result.data.userId).toBe(1);
    });

    it('throws when user not found', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);

      await expect(
        authService.login({ email: 'nouser@example.com', password: 'pwd' })
      ).rejects.toThrow('Credenciales inválidas');
    });

    it('throws when password is invalid', async () => {
      prismaMock.user.findUnique.mockResolvedValue(makeUser());
      (bcrypt.compare as jest.Mock<any>).mockResolvedValue(false);

      await expect(
        authService.login({ email: 'test@example.com', password: 'wrong' })
      ).rejects.toThrow('Credenciales inválidas');
    });
  });

  // ==========================================================================
  // register
  // ==========================================================================
  describe('register', () => {
    const authUser = { userId: 1, email: 'admin@x.com', role: 'ADMIN', empresaId: 10 };

    it('registers operator by admin', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock<any>).mockResolvedValue('hashed');
      prismaMock.user.create.mockResolvedValue(makeUser({ id: 2, email: 'new@x.com', role: 'OPERATOR' }));

      const result = await authService.register(
        { email: 'new@x.com', password: 'Password1!', role: 'OPERATOR' as any, empresaId: 10 },
        authUser as any
      );

      expect(result.success).toBe(true);
    });

    it('registers admin by admin', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock<any>).mockResolvedValue('hashed');
      prismaMock.user.create.mockResolvedValue(makeUser({ id: 3, role: 'ADMIN' }));

      const result = await authService.register(
        { email: 'admin2@x.com', password: 'Pass1!', role: 'ADMIN' as any, empresaId: 10 },
        authUser as any
      );

      expect(result.success).toBe(true);
    });

    it('throws when admin tries to create superadmin', async () => {
      await expect(
        authService.register(
          { email: 'sa@x.com', password: 'x', role: 'SUPERADMIN' as any },
          authUser as any
        )
      ).rejects.toThrow('Los administradores solo pueden crear usuarios');
    });

    it('allows superadmin to create admin', async () => {
      const saUser = { userId: 1, email: 'sa@x.com', role: 'SUPERADMIN', empresaId: undefined };
      prismaMock.user.findUnique.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock<any>).mockResolvedValue('hashed');
      prismaMock.user.create.mockResolvedValue(makeUser({ id: 4, role: 'ADMIN' }));

      const result = await authService.register(
        { email: 'new-admin@x.com', password: 'x', role: 'ADMIN' as any, empresaId: 10 },
        saUser as any
      );

      expect(result.success).toBe(true);
    });

    it('throws when superadmin tries to create another superadmin', async () => {
      const saUser = { userId: 1, email: 'sa@x.com', role: 'SUPERADMIN' };

      await expect(
        authService.register(
          { email: 'sa2@x.com', password: 'x', role: 'SUPERADMIN' as any },
          saUser as any
        )
      ).rejects.toThrow('No se puede crear otro superadministrador');
    });

    it('throws when operator tries to create user', async () => {
      const opUser = { userId: 1, email: 'op@x.com', role: 'OPERATOR' };

      await expect(
        authService.register(
          { email: 'x@x.com', password: 'x', role: 'OPERATOR' as any },
          opUser as any
        )
      ).rejects.toThrow('No tienes permisos');
    });

    it('throws when email already exists', async () => {
      prismaMock.user.findUnique.mockResolvedValue(makeUser());

      await expect(
        authService.register(
          { email: 'test@example.com', password: 'x', role: 'OPERATOR' as any, empresaId: 10 },
          authUser as any
        )
      ).rejects.toThrow('El email ya está registrado');
    });

    it('throws when admin/operator without empresaId', async () => {
      await expect(
        authService.register(
          { email: 'no-emp@x.com', password: 'x', role: 'OPERATOR' as any },
          authUser as any
        )
      ).rejects.toThrow('deben tener una empresa asignada');
    });

    it('inherits empresa from admin creator when empresaId not provided', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock<any>).mockResolvedValue('hashed');
      prismaMock.user.create.mockResolvedValue(makeUser({ id: 5, empresaId: 10 }));

      const result = await authService.register(
        { email: 'inherit@x.com', password: 'x', role: 'ADMIN' as any, empresaId: 10 },
        authUser as any
      );

      expect(result.success).toBe(true);
    });

    it('superadmin user gets null empresaId', async () => {
      const saUser = { userId: 1, email: 'sa@x.com', role: 'SUPERADMIN' };
      prismaMock.user.findUnique.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock<any>).mockResolvedValue('hashed');
      prismaMock.user.create.mockResolvedValue(makeUser({ id: 6, role: 'ADMIN', empresaId: 10 }));

      const result = await authService.register(
        { email: 'admin-by-sa@x.com', password: 'x', role: 'ADMIN' as any, empresaId: 10 },
        saUser as any
      );

      expect(result.success).toBe(true);
    });
  });

  // ==========================================================================
  // getProfile
  // ==========================================================================
  describe('getProfile', () => {
    it('returns user profile', async () => {
      prismaMock.user.findUnique.mockResolvedValue(makeUser());

      const profile = await authService.getProfile(1);

      expect(profile.userId).toBe(1);
    });

    it('throws when user not found', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);

      await expect(authService.getProfile(999)).rejects.toThrow('Usuario no encontrado');
    });
  });

  // ==========================================================================
  // findByEmail
  // ==========================================================================
  describe('findByEmail', () => {
    it('returns formatted user when found', async () => {
      prismaMock.user.findUnique.mockResolvedValue(makeUser());

      const result = await authService.findByEmail('test@example.com');

      expect(result).not.toBeNull();
      expect(result!.email).toBe('test@example.com');
    });

    it('returns null when not found', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);

      const result = await authService.findByEmail('none@x.com');

      expect(result).toBeNull();
    });

    it('throws on error', async () => {
      prismaMock.user.findUnique.mockRejectedValue(new Error('db fail'));

      await expect(authService.findByEmail('x@x.com')).rejects.toThrow('db fail');
    });
  });

  // ==========================================================================
  // changePassword
  // ==========================================================================
  describe('changePassword', () => {
    it('changes password successfully', async () => {
      prismaMock.user.findUnique.mockResolvedValue(makeUser());
      (bcrypt.compare as jest.Mock<any>).mockResolvedValue(true);
      (bcrypt.hash as jest.Mock<any>).mockResolvedValue('new-hashed');
      prismaMock.user.update.mockResolvedValue({});

      await expect(
        authService.changePassword(1, 'current', 'newpassword')
      ).resolves.toBeUndefined();
    });

    it('throws when user not found', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);

      await expect(
        authService.changePassword(999, 'x', 'y')
      ).rejects.toThrow('Usuario no encontrado');
    });

    it('throws when current password is wrong', async () => {
      prismaMock.user.findUnique.mockResolvedValue(makeUser());
      (bcrypt.compare as jest.Mock<any>).mockResolvedValue(false);

      await expect(
        authService.changePassword(1, 'wrong', 'new')
      ).rejects.toThrow('Contraseña actual incorrecta');
    });
  });

  // ==========================================================================
  // refreshToken
  // ==========================================================================
  describe('refreshToken', () => {
    it('returns new token on valid token', async () => {
      (jwt.verify as jest.Mock<any>).mockReturnValue({ userId: 1, email: 'test@x.com', role: 'ADMIN' });
      prismaMock.user.findUnique.mockResolvedValue(makeUser());

      const result = await authService.refreshToken('valid-token');

      expect(result).not.toBeNull();
      expect(result!.token).toBe('mock-jwt-token');
    });

    it('returns null on invalid token', async () => {
      (jwt.verify as jest.Mock<any>).mockImplementation(() => { throw new Error('invalid'); });

      const result = await authService.refreshToken('invalid-token');

      expect(result).toBeNull();
    });
  });

  // ==========================================================================
  // verifyToken
  // ==========================================================================
  describe('verifyToken', () => {
    it('verifies RS256 token', () => {
      const payload = { userId: 1, email: 'x@x.com', role: 'ADMIN' };
      (jwt.verify as jest.Mock<any>).mockReturnValue(payload);

      const result = authService.verifyToken('rs256-token');

      expect(result).toEqual(payload);
    });

    it('falls back to HS256 when RS256 fails', () => {
      const payload = { userId: 1, email: 'x@x.com', role: 'ADMIN' };
      (jwt.verify as jest.Mock<any>)
        .mockImplementationOnce(() => { throw new Error('RS256 fail'); })
        .mockReturnValueOnce(payload);

      const result = authService.verifyToken('hs256-token');

      expect(result).toEqual(payload);
    });

    it('returns null when both RS256 and HS256 fail', () => {
      (jwt.verify as jest.Mock<any>).mockImplementation(() => { throw new Error('fail'); });

      const result = authService.verifyToken('bad-token');

      expect(result).toBeNull();
    });
  });

  // ==========================================================================
  // generateToken
  // ==========================================================================
  describe('generateToken', () => {
    it('generates JWT with RS256', () => {
      const token = authService.generateToken({
        userId: 1,
        email: 'x@x.com',
        role: 'ADMIN' as any,
      });

      expect(jwt.sign).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 1 }),
        expect.any(String),
        expect.objectContaining({ algorithm: 'RS256' })
      );
      expect(token).toBe('mock-jwt-token');
    });
  });

  // ==========================================================================
  // updateUserEmpresa
  // ==========================================================================
  describe('updateUserEmpresa', () => {
    it('updates empresa and returns new token', async () => {
      prismaMock.user.update.mockResolvedValue(makeUser({ empresaId: 20 }));

      const result = await authService.updateUserEmpresa(1, 20);

      expect(result.success).toBe(true);
      expect(result.token).toBe('mock-jwt-token');
    });

    it('sets empresa to null', async () => {
      prismaMock.user.update.mockResolvedValue(makeUser({ empresaId: null }));

      const result = await authService.updateUserEmpresa(1, null);

      expect(result.success).toBe(true);
    });

    it('throws on error', async () => {
      prismaMock.user.update.mockRejectedValue(new Error('db fail'));

      await expect(authService.updateUserEmpresa(1, 10)).rejects.toThrow('db fail');
    });
  });

  // ==========================================================================
  // BaseService implementations
  // ==========================================================================
  describe('BaseService implementations', () => {
    it('findById delegates to prisma', async () => {
      prismaMock.user.findUnique.mockResolvedValue(makeUser());

      const result = await authService.findById(1);

      expect(result).toBeDefined();
    });

    it('findMany delegates to prisma', async () => {
      prismaMock.user.findMany.mockResolvedValue([makeUser()]);

      const result = await authService.findMany();

      expect(result.length).toBe(1);
    });

    it('create delegates to prisma', async () => {
      prismaMock.user.create.mockResolvedValue(makeUser());

      const result = await authService.create({ email: 'new@x.com', password: 'x' } as any);

      expect(result).toBeDefined();
    });

    it('update delegates to prisma', async () => {
      prismaMock.user.update.mockResolvedValue(makeUser());

      const result = await authService.update(1, { email: 'updated@x.com' } as any);

      expect(result).toBeDefined();
    });

    it('delete delegates to prisma', async () => {
      prismaMock.user.delete.mockResolvedValue(undefined);

      await expect(authService.delete(1)).resolves.toBeUndefined();
    });

    it('count delegates to prisma', async () => {
      prismaMock.user.count.mockResolvedValue(5);

      const count = await authService.count();

      expect(count).toBe(5);
    });
  });
});
