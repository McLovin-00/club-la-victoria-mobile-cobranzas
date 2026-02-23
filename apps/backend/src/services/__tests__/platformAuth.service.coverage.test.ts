/**
 * Propósito: subir "Coverage on New Code" de PlatformAuthService.
 * Cubre refresh tokens, soft delete y verificación de JWT (RS256/legacy HS256).
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { UserRole } from '@prisma/client';

const prismaMock = {
  user: {
    findUnique: jest.fn(),
    update: jest.fn(),
    create: jest.fn(),
  },
  refreshToken: {
    create: jest.fn(),
    findUnique: jest.fn(),
    updateMany: jest.fn(),
  },
  $queryRawUnsafe: jest.fn(),
  $transaction: jest.fn(),
};

jest.mock('../../config/prisma', () => ({
  prismaService: {
    getClient: () => prismaMock,
  },
}));

jest.mock('../../config/logger', () => ({
  AppLogger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

jest.mock('../../config/environment', () => ({
  getEnvironment: () => ({
    jwtPrivateKey: '-----BEGIN PRIVATE KEY-----\nmock\n-----END PRIVATE KEY-----',
    jwtPublicKey: '-----BEGIN PUBLIC KEY-----\nmock\n-----END PUBLIC KEY-----',
    JWT_PRIVATE_KEY: '-----BEGIN PRIVATE KEY-----\nmock\n-----END PRIVATE KEY-----',
    JWT_PUBLIC_KEY: '-----BEGIN PUBLIC KEY-----\nmock\n-----END PUBLIC KEY-----',
    JWT_LEGACY_SECRET: 'legacy-secret',
  }),
}));

jest.mock('bcrypt', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

jest.mock('crypto', () => ({
  randomBytes: jest.fn(() => Buffer.from('a'.repeat(32))),
  randomInt: jest.fn((_min: number, max: number) => Math.floor(Math.random() * max)),
}));

jest.mock('jsonwebtoken', () => ({
  sign: jest.fn(() => 'mock-token'),
  verify: jest.fn(),
  decode: jest.fn(),
}));

import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';

// Evitar handles abiertos por setInterval en el módulo bajo test.
jest.useFakeTimers();

// Import diferido para que `useFakeTimers` ya esté activo.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { PlatformAuthService } = require('../platformAuth.service') as typeof import('../platformAuth.service');
type PlatformUserProfile = import('../platformAuth.service').PlatformUserProfile;

describe('PlatformAuthService (coverage)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Resetear caches estáticos y cualquier estado derivado de env
    (PlatformAuthService as any).privateKey = undefined;
    (PlatformAuthService as any).publicKey = undefined;
    (PlatformAuthService as any).legacySecret = null;
  });

  describe('refreshAccessToken', () => {
    it('retorna error si refresh token es inválido', async () => {
      (prismaMock.refreshToken.findUnique as any).mockResolvedValueOnce(null);

      const result = await PlatformAuthService.refreshAccessToken('bad');

      expect(result).toEqual({ success: false, message: 'Refresh token inválido o expirado' });
    });

    it('retorna error si el usuario no existe', async () => {
      (prismaMock.refreshToken.findUnique as any).mockResolvedValueOnce({
        userId: 10,
        expiresAt: new Date(Date.now() + 60_000),
        revokedAt: null,
      });
      (prismaMock.user.findUnique as any).mockResolvedValueOnce(null);

      const result = await PlatformAuthService.refreshAccessToken('rt');

      expect(result).toEqual({ success: false, message: 'Usuario no encontrado' });
    });

    it('retorna error si el usuario está desactivado', async () => {
      (prismaMock.refreshToken.findUnique as any).mockResolvedValueOnce({
        userId: 10,
        expiresAt: new Date(Date.now() + 60_000),
        revokedAt: null,
      });
      (prismaMock.user.findUnique as any)
        .mockResolvedValueOnce({
          id: 10,
          email: 'a@b.com',
          role: UserRole.ADMIN,
          empresaId: 1,
          activo: true,
          password: '$2b$12$' + 'a'.repeat(53),
          dadorCargaId: null,
          empresaTransportistaId: null,
          choferId: null,
          clienteId: null,
          mustChangePassword: false,
          nombre: null,
          apellido: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .mockResolvedValueOnce({
          id: 10,
          email: 'a@b.com',
          role: UserRole.ADMIN,
          empresaId: 1,
          activo: false,
          password: '$2b$12$' + 'a'.repeat(53),
          dadorCargaId: null,
          empresaTransportistaId: null,
          choferId: null,
          clienteId: null,
          mustChangePassword: false,
          nombre: null,
          apellido: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        });

      const result = await PlatformAuthService.refreshAccessToken('rt');

      expect(result).toEqual({ success: false, message: 'Usuario desactivado' });
    });

    it('rota el refresh token y devuelve un nuevo access token', async () => {
      (prismaMock.refreshToken.findUnique as any).mockResolvedValueOnce({
        userId: 11,
        expiresAt: new Date(Date.now() + 60_000),
        revokedAt: null,
      });
      const user = {
        id: 11,
        email: 'u@b.com',
        role: UserRole.OPERATOR,
        empresaId: 1,
        activo: true,
        password: '$2b$12$' + 'b'.repeat(53),
        dadorCargaId: null,
        empresaTransportistaId: null,
        choferId: null,
        clienteId: null,
        mustChangePassword: false,
        nombre: null,
        apellido: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      (prismaMock.user.findUnique as any).mockResolvedValue(user);
      (prismaMock.refreshToken.updateMany as any).mockResolvedValueOnce({ count: 1 });
      (prismaMock.refreshToken.create as any).mockResolvedValueOnce({ id: 1 });

      const result = await PlatformAuthService.refreshAccessToken('old');

      expect(prismaMock.refreshToken.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { token: 'old' } })
      );
      expect(result.success).toBe(true);
      expect(result.token).toBe('mock-token');
      expect(result.refreshToken).toBeDefined();
      expect(result.platformUser?.id).toBe(11);
    });
  });

  describe('deletePlatformUser (soft delete)', () => {
    it('soft-deletea un usuario como SUPERADMIN, revocando refresh tokens', async () => {
      (bcrypt.hash as any).mockResolvedValueOnce('$2b$12$' + 'c'.repeat(53));
      (prismaMock.user.update as any).mockResolvedValueOnce({ id: 5 });
      (prismaMock.refreshToken.updateMany as any).mockResolvedValueOnce({ count: 1 });

      const actor: PlatformUserProfile = {
        id: 1,
        email: 'sa@b.com',
        role: UserRole.SUPERADMIN,
        empresaId: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await PlatformAuthService.deletePlatformUser(5, actor);

      expect(prismaMock.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 5 },
          data: expect.objectContaining({
            activo: false,
            password: '$2b$12$' + 'c'.repeat(53),
            nombre: null,
            apellido: null,
          }),
        })
      );
      expect(prismaMock.refreshToken.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: 5, revokedAt: null } })
      );
    });
  });

  describe('verifyToken', () => {
    it('usa fallback legacy HS256 si falla RS256', async () => {
      const payload = { userId: 1, email: 'a@b.com', role: UserRole.ADMIN };
      (jwt.verify as any)
        .mockImplementationOnce(() => {
          throw new Error('bad signature');
        })
        .mockImplementationOnce(() => payload);

      const out = await PlatformAuthService.verifyToken('token');

      expect(out).toEqual(payload);
      expect((jwt.verify as any).mock.calls.length).toBe(2);
    });

    it('retorna null si el token está en blacklist', async () => {
      (jwt.decode as any).mockReturnValueOnce({ exp: Math.floor(Date.now() / 1000) + 60 });
      PlatformAuthService.revokeToken('t');

      const out = await PlatformAuthService.verifyToken('t');

      expect(out).toBeNull();
    });
  });

  describe('revokeAllUserTokens', () => {
    it('revoca todos los refresh tokens de un usuario', async () => {
      (prismaMock.refreshToken.updateMany as any).mockResolvedValueOnce({ count: 3 });

      await PlatformAuthService.revokeAllUserTokens(42);

      expect(prismaMock.refreshToken.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ userId: 42 }) })
      );
    });
  });

  describe('revokeToken', () => {
    it('agrega token a blacklist con exp del JWT', () => {
      (jwt.decode as any).mockReturnValueOnce({ exp: Math.floor(Date.now() / 1000) + 3600 });
      PlatformAuthService.revokeToken('mytoken');
      expect(jwt.decode).toHaveBeenCalledWith('mytoken');
    });

    it('maneja error de decode usando fallback TTL', () => {
      (jwt.decode as any).mockImplementationOnce(() => { throw new Error('bad'); });
      PlatformAuthService.revokeToken('badtoken');
    });
  });

  describe('cleanupBlacklist (via timer)', () => {
    it('limpia tokens expirados al dispararse el timer', () => {
      (jwt.decode as any).mockReturnValue({ exp: Math.floor(Date.now() / 1000) - 1 });
      PlatformAuthService.revokeToken('expired-tok');

      jest.advanceTimersByTime(10 * 60 * 1000 + 100);
    });
  });

  describe('toggleUserActivo', () => {
    const superadmin: PlatformUserProfile = {
      id: 1, email: 'sa@b.com', role: UserRole.SUPERADMIN,
      empresaId: 1, createdAt: new Date(), updatedAt: new Date(),
    };

    it('activa un usuario existente', async () => {
      (prismaMock.user.findUnique as any).mockResolvedValueOnce({
        id: 5, role: 'OPERATOR', empresaId: 1,
      });
      (prismaMock.user.update as any).mockResolvedValueOnce({
        id: 5, email: 'u@b.com', activo: true,
      });

      const result = await PlatformAuthService.toggleUserActivo(5, true, superadmin);

      expect(result.activo).toBe(true);
      expect(prismaMock.user.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 5 }, data: { activo: true } })
      );
    });

    it('lanza error si usuario no existe', async () => {
      (prismaMock.user.findUnique as any).mockResolvedValueOnce(null);

      await expect(
        PlatformAuthService.toggleUserActivo(999, true, superadmin)
      ).rejects.toThrow('Usuario no encontrado');
    });

    it('lanza error al intentar desactivarse a sí mismo', async () => {
      (prismaMock.user.findUnique as any).mockResolvedValueOnce({
        id: 1, role: 'SUPERADMIN', empresaId: 1,
      });

      await expect(
        PlatformAuthService.toggleUserActivo(1, false, superadmin)
      ).rejects.toThrow('No puede desactivarse a sí mismo');
    });

    it('lanza error si no tiene permisos', async () => {
      const operator: PlatformUserProfile = {
        id: 50, email: 'op@b.com', role: UserRole.OPERATOR,
        empresaId: 1, createdAt: new Date(), updatedAt: new Date(),
      };
      (prismaMock.user.findUnique as any).mockResolvedValueOnce({
        id: 5, role: 'ADMIN', empresaId: 1,
      });

      await expect(
        PlatformAuthService.toggleUserActivo(5, false, operator)
      ).rejects.toThrow('No tiene permisos');
    });
  });

  describe('canModifyUser (via toggleUserActivo/delete)', () => {
    it('ADMIN puede modificar usuarios de su empresa', async () => {
      const admin: PlatformUserProfile = {
        id: 2, email: 'admin@b.com', role: UserRole.ADMIN,
        empresaId: 1, createdAt: new Date(), updatedAt: new Date(),
      };
      (prismaMock.user.findUnique as any).mockResolvedValueOnce({
        id: 5, role: 'OPERATOR', empresaId: 1,
      });
      (prismaMock.user.update as any).mockResolvedValueOnce({
        id: 5, email: 'u@b.com', activo: false,
      });

      const result = await PlatformAuthService.toggleUserActivo(5, false, admin);

      expect(result.activo).toBe(false);
    });

    it('DADOR_DE_CARGA puede modificar CHOFER creado por él', async () => {
      const dador: PlatformUserProfile = {
        id: 3, email: 'd@b.com', role: UserRole.DADOR_DE_CARGA,
        empresaId: 1, dadorCargaId: 10, createdAt: new Date(), updatedAt: new Date(),
      };
      (prismaMock.user.findUnique as any).mockResolvedValueOnce({
        id: 7, role: 'CHOFER', empresaId: 1, creadoPorId: 3, dadorCargaId: 10,
      });
      (prismaMock.user.update as any).mockResolvedValueOnce({
        id: 7, email: 'ch@b.com', activo: false,
      });

      const result = await PlatformAuthService.toggleUserActivo(7, false, dador);

      expect(result.activo).toBe(false);
    });

    it('TRANSPORTISTA puede modificar CHOFER de su empresa', async () => {
      const transp: PlatformUserProfile = {
        id: 4, email: 't@b.com', role: UserRole.TRANSPORTISTA,
        empresaId: 1, empresaTransportistaId: 20, createdAt: new Date(), updatedAt: new Date(),
      };
      (prismaMock.user.findUnique as any).mockResolvedValueOnce({
        id: 8, role: 'CHOFER', empresaId: 1, empresaTransportistaId: 20,
      });
      (prismaMock.user.update as any).mockResolvedValueOnce({
        id: 8, email: 'ch2@b.com', activo: true,
      });

      const result = await PlatformAuthService.toggleUserActivo(8, true, transp);

      expect(result.activo).toBe(true);
    });
  });

  describe('createUserWithTempPassword (via registerXxxWithTempPassword)', () => {
    const admin: PlatformUserProfile = {
      id: 1, email: 'admin@b.com', role: UserRole.SUPERADMIN,
      empresaId: 1, createdAt: new Date(), updatedAt: new Date(),
    };

    it('registerClientWithTempPassword crea usuario exitosamente', async () => {
      (prismaMock.$queryRawUnsafe as any).mockResolvedValue([{ id: 5 }]);
      (prismaMock.$transaction as any).mockImplementation(async (cb: any) => cb(prismaMock));
      (prismaMock.user.findUnique as any).mockResolvedValueOnce(null);
      (prismaMock.user.create as any).mockResolvedValueOnce({
        id: 100, email: 'new@b.com', role: 'CLIENTE',
        empresaId: 1, activo: true, nombre: 'N', apellido: 'A',
        createdAt: new Date(), updatedAt: new Date(),
        dadorCargaId: null, empresaTransportistaId: null, choferId: null, clienteId: 5,
      });
      (bcrypt.hash as any).mockResolvedValueOnce('$2b$12$hash');

      const result = await PlatformAuthService.registerClientWithTempPassword(
        { email: 'new@b.com', nombre: 'N', apellido: 'A', empresaId: 1, clienteId: 5 },
        admin
      );

      expect(result.success).toBe(true);
      expect(result.tempPassword).toBeDefined();
    });

    it('registerClientWithTempPassword retorna error si email duplicado', async () => {
      (prismaMock.$queryRawUnsafe as any).mockResolvedValue([{ id: 5 }]);
      (prismaMock.$transaction as any).mockImplementation(async (cb: any) => cb(prismaMock));
      (prismaMock.user.findUnique as any).mockResolvedValueOnce({ id: 99, email: 'dup@b.com' });
      (bcrypt.hash as any).mockResolvedValueOnce('$2b$12$hash');

      const result = await PlatformAuthService.registerClientWithTempPassword(
        { email: 'dup@b.com', nombre: 'N', apellido: 'A', empresaId: 1, clienteId: 5 },
        admin
      );

      expect(result.success).toBe(false);
      expect(result.message).toContain('email');
    });

    it('validateEntityAccess permite SUPERADMIN sin restricción', async () => {
      (prismaMock.$queryRawUnsafe as any).mockResolvedValue([{ id: 5, dador_carga_id: 99 }]);
      (prismaMock.$transaction as any).mockImplementation(async (cb: any) => cb(prismaMock));
      (prismaMock.user.findUnique as any).mockResolvedValueOnce(null);
      (prismaMock.user.create as any).mockResolvedValueOnce({
        id: 101, email: 'sa@b.com', role: 'DADOR_DE_CARGA',
        empresaId: 1, activo: true, nombre: 'N', apellido: 'A',
        createdAt: new Date(), updatedAt: new Date(),
        dadorCargaId: 5, empresaTransportistaId: null, choferId: null, clienteId: null,
      });
      (bcrypt.hash as any).mockResolvedValueOnce('$2b$12$hash');

      const result = await PlatformAuthService.registerDadorWithTempPassword(
        { email: 'sa@b.com', nombre: 'N', apellido: 'A', empresaId: 1, dadorCargaId: 5 },
        admin
      );

      expect(result.success).toBe(true);
    });

    it('validateEntityAccess lanza error si entidad no existe', async () => {
      (prismaMock.$queryRawUnsafe as any).mockResolvedValue([]);
      (bcrypt.hash as any).mockResolvedValueOnce('$2b$12$hash');

      await expect(
        PlatformAuthService.registerDadorWithTempPassword(
          { email: 'x@b.com', nombre: 'N', apellido: 'A', empresaId: 1, dadorCargaId: 999 },
          admin
        )
      ).rejects.toThrow('no existe');
    });

    it('validateEntityAccess lanza error si DADOR no tiene permisos sobre entidad', async () => {
      const dador: PlatformUserProfile = {
        id: 3, email: 'd@b.com', role: UserRole.DADOR_DE_CARGA,
        empresaId: 1, dadorCargaId: 10, createdAt: new Date(), updatedAt: new Date(),
      };
      (prismaMock.$queryRawUnsafe as any).mockResolvedValue([{ id: 5, dador_carga_id: 99 }]);
      (bcrypt.hash as any).mockResolvedValueOnce('$2b$12$hash');

      await expect(
        PlatformAuthService.registerChoferWithTempPassword(
          { email: 'x@b.com', nombre: 'N', apellido: 'A', empresaId: 1, choferId: 5 },
          dador
        )
      ).rejects.toThrow('No tiene permisos');
    });
  });
});

