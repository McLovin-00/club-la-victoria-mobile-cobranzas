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
  },
  refreshToken: {
    create: jest.fn(),
    findUnique: jest.fn(),
    updateMany: jest.fn(),
  },
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
});

