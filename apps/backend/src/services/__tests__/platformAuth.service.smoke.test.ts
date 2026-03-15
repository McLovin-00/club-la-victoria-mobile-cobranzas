/**
 * Propósito: Smoke tests de `PlatformAuthService` para subir coverage sin DB real.
 * Cubre ramas clave de `login` (usuario inexistente, inactivo, hash inválido, password inválida y success).
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { UserRole } from '@prisma/client';

const prismaMock = {
  user: {
    findUnique: jest.fn(),
    update: jest.fn(),
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
  }),
}));

jest.mock('bcrypt', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

jest.mock('jsonwebtoken', () => ({
  sign: jest.fn(() => 'mock-token'),
  verify: jest.fn(),
}));

import * as bcrypt from 'bcrypt';
import { PlatformAuthService } from '../platformAuth.service';

describe('PlatformAuthService.login (smoke)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Resetear cachés estáticos para no contaminar tests
    (PlatformAuthService as any).privateKey = undefined;
    (PlatformAuthService as any).publicKey = undefined;
    (PlatformAuthService as any).legacySecret = null;
  });

  it('retorna credenciales inválidas si el usuario no existe', async () => {
    (prismaMock.user.findUnique as any).mockResolvedValueOnce(null);

    const result = await PlatformAuthService.login({ email: 'no@existe.com', password: 'x' });

    expect(result).toEqual({ success: false, message: 'Credenciales inválidas' });
  });

  it('retorna usuario desactivado si activo=false', async () => {
    (prismaMock.user.findUnique as any).mockResolvedValueOnce({
      id: 1,
      email: 'a@b.com',
      password: '$2b$12$' + 'a'.repeat(53),
      role: UserRole.ADMIN,
      activo: false,
      empresaId: 1,
      dadorCargaId: null,
      empresaTransportistaId: null,
      choferId: null,
      clienteId: null,
    });

    const result = await PlatformAuthService.login({ email: 'a@b.com', password: 'x' });

    expect(result.success).toBe(false);
    expect(result.message).toMatch(/Credenciales inválidas/i);
  });

  it('retorna error si el hash es inválido y no es cuenta semilla', async () => {
    (prismaMock.user.findUnique as any).mockResolvedValueOnce({
      id: 2,
      email: 'usuario@empresa.com',
      password: 'hash-malo',
      role: UserRole.OPERATOR,
      activo: true,
      empresaId: 1,
      dadorCargaId: null,
      empresaTransportistaId: null,
      choferId: null,
      clienteId: null,
    });

    const result = await PlatformAuthService.login({ email: 'usuario@empresa.com', password: 'password123' });

    expect(result.success).toBe(false);
    expect(result.message).toMatch(/Credenciales inválidas/i);
    expect((prismaMock.user.update as any)).not.toHaveBeenCalled();
  });

  it('repara hash para cuenta semilla con password default y luego autentica', async () => {
    process.env.SEED_REPAIR_EMAILS = 'admin@bca.com,admin@empresa.com,superadmin@empresa.com,admin@mfh.com.ar';
    process.env.SEED_REPAIR_PASSWORDS = 'password123,admin123,Mfh@#2024A';

    try {
      const seedUser: any = {
        id: 3,
        email: 'admin@bca.com',
        password: 'hash-malo',
        role: UserRole.SUPERADMIN,
        activo: true,
        empresaId: 1,
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
      (prismaMock.user.findUnique as any).mockResolvedValueOnce(seedUser);

      const repairedHash = '$2b$12$' + 'b'.repeat(53); // 60 chars, formato bcrypt
      (bcrypt.hash as any).mockResolvedValueOnce(repairedHash);
      (bcrypt.compare as any).mockResolvedValueOnce(true);
      (prismaMock.user.update as any).mockResolvedValueOnce({ ...seedUser, password: repairedHash });

      const result = await PlatformAuthService.login({ email: 'admin@bca.com', password: 'password123' });

      expect((prismaMock.user.update as any)).toHaveBeenCalledWith({
        where: { id: 3 },
        data: { password: repairedHash },
      });
      expect(result.success).toBe(true);
      expect(result.token).toBe('mock-token');
    } finally {
      delete process.env.SEED_REPAIR_EMAILS;
      delete process.env.SEED_REPAIR_PASSWORDS;
    }
  });

  it('retorna credenciales inválidas si bcrypt.compare=false', async () => {
    (prismaMock.user.findUnique as any).mockResolvedValueOnce({
      id: 4,
      email: 'a@b.com',
      password: '$2b$12$' + 'c'.repeat(53),
      role: UserRole.ADMIN,
      activo: true,
      empresaId: 1,
      dadorCargaId: null,
      empresaTransportistaId: null,
      choferId: null,
      clienteId: null,
    });
    (bcrypt.compare as any).mockResolvedValueOnce(false);

    const result = await PlatformAuthService.login({ email: 'a@b.com', password: 'bad' });

    expect(result).toEqual({ success: false, message: 'Credenciales inválidas' });
  });
});


