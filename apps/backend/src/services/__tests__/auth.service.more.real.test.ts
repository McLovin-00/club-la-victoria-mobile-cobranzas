/**
 * Tests adicionales para subir cobertura de services/auth.service.ts
 * @jest-environment node
 */

jest.mock('../../config/logger', () => ({
  AppLogger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn(), logError: jest.fn(), logDatabaseOperation: jest.fn() },
}));

const prisma = {
  user: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
};

jest.mock('../../config/prisma', () => ({
  prismaService: { getClient: () => prisma },
}));

jest.mock('../../config/environment', () => ({
  getEnvironment: () => ({
    JWT_PRIVATE_KEY: '-----BEGIN PRIVATE KEY-----\nX\n-----END PRIVATE KEY-----',
    JWT_PUBLIC_KEY: '-----BEGIN PUBLIC KEY-----\nX\n-----END PUBLIC KEY-----',
    JWT_PRIVATE_KEY_PATH: undefined,
    JWT_PUBLIC_KEY_PATH: undefined,
    jwtPrivateKey: '-----BEGIN PRIVATE KEY-----\nX\n-----END PRIVATE KEY-----',
    jwtPublicKey: '-----BEGIN PUBLIC KEY-----\nX\n-----END PUBLIC KEY-----',
    JWT_LEGACY_SECRET: 'legacy',
  }),
}));

const jwt = {
  sign: jest.fn(() => 'token'),
  verify: jest.fn(() => ({ userId: 1, email: 'a@b.com', role: 'ADMIN' })),
};
jest.mock('jsonwebtoken', () => jwt);

const bcrypt = {
  hash: jest.fn(async () => 'hashed'),
  compare: jest.fn(async () => true),
};
jest.mock('bcrypt', () => bcrypt);

import { UserRole } from '@prisma/client';
import { authService } from '../auth.service';

describe('auth.service (more real)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // limpiar implementations previas (clearAllMocks no resetea mockImplementation)
    for (const m of Object.values(prisma.user)) {
      (m as jest.Mock).mockReset();
    }
  });

  it('BaseService wrappers hit CRUD implementations', async () => {
    prisma.user.findUnique.mockResolvedValueOnce({ id: 1 } as any);
    await expect((authService as any).findById(1)).resolves.toBeTruthy();

    prisma.user.findMany.mockResolvedValueOnce([{ id: 1 }] as any);
    await expect((authService as any).findMany({ where: {} })).resolves.toHaveLength(1);

    prisma.user.create.mockResolvedValueOnce({ id: 2 } as any);
    await expect((authService as any).create({ email: 'x', password: 'y', role: UserRole.OPERATOR } as any)).resolves.toBeTruthy();

    prisma.user.update.mockResolvedValueOnce({ id: 2 } as any);
    await expect((authService as any).update(2, { email: 'z' } as any)).resolves.toBeTruthy();

    prisma.user.delete.mockResolvedValueOnce({} as any);
    await expect((authService as any).delete(2)).resolves.toBeUndefined();

    prisma.user.count.mockResolvedValueOnce(3);
    await expect((authService as any).count({ where: {} })).resolves.toBe(3);
  });

  it('findByEmail returns payload and catches errors', async () => {
    prisma.user.findUnique.mockResolvedValueOnce({ id: 1, email: 'a@b.com', role: UserRole.ADMIN, empresaId: 9 } as any);
    const ok = await authService.findByEmail('A@B.COM');
    expect(ok?.userId).toBe(1);

    prisma.user.findUnique.mockRejectedValueOnce(new Error('db'));
    await expect(authService.findByEmail('x@y.com')).rejects.toThrow('db');
  });

  it('refreshToken returns null on verify failure; otherwise returns new token', async () => {
    (jwt.verify as jest.Mock).mockImplementationOnce(() => {
      throw new Error('bad');
    });
    await expect(authService.refreshToken('t' as any)).resolves.toBeNull();

    (jwt.verify as jest.Mock).mockReturnValueOnce({ userId: 1, email: 'a@b.com', role: UserRole.ADMIN } as any);
    jest.spyOn(authService as any, 'getProfile').mockResolvedValueOnce({ userId: 1, email: 'a@b.com', role: UserRole.ADMIN } as any);
    const out = await authService.refreshToken('t');
    expect(out?.token).toBe('token');
  });

  it('verifyToken falls back to HS256 legacy secret', async () => {
    (jwt.verify as jest.Mock)
      .mockImplementationOnce(() => {
        throw new Error('rs256 fail');
      })
      .mockReturnValueOnce({ userId: 1, email: 'a@b.com', role: UserRole.ADMIN } as any);

    const payload = await authService.verifyToken('t');
    expect(payload).toEqual(expect.objectContaining({ userId: 1 }));

    (jwt.verify as jest.Mock)
      .mockImplementationOnce(() => {
        throw new Error('rs256 fail');
      })
      .mockImplementationOnce(() => {
        throw new Error('hs256 fail');
      });
    expect(authService.verifyToken('t')).toBeNull();
  });

  it('updateUserEmpresa success and error', async () => {
    prisma.user.update.mockResolvedValueOnce({ id: 1, email: 'a@b.com', role: UserRole.ADMIN, empresaId: 10 } as any);
    const out = await authService.updateUserEmpresa(1, 10);
    expect(out.success).toBe(true);
    expect(out.token).toBe('token');

    prisma.user.update.mockRejectedValueOnce(new Error('db'));
    await expect(authService.updateUserEmpresa(1, 10)).rejects.toThrow('db');
  });

  it('register permission validations throw early', async () => {
    await expect(
      authService.register({ email: 'x@y.com', password: 'p', role: UserRole.ADMIN } as any, { userId: 1, role: UserRole.OPERATOR } as any)
    ).rejects.toThrow('No tienes permisos para crear usuarios');

    await expect(
      authService.register({ email: 'x@y.com', password: 'p', role: UserRole.SUPERADMIN } as any, { userId: 1, role: UserRole.SUPERADMIN } as any)
    ).rejects.toThrow('No se puede crear otro superadministrador');
  });

  it('determineFinalEmpresaId branches', () => {
    const fn = (authService as any).determineFinalEmpresaId.bind(authService);
    expect(fn(UserRole.SUPERADMIN, 123, { role: UserRole.ADMIN, empresaId: 9 })).toBeNull();
    expect(fn(UserRole.OPERATOR, 7, { role: UserRole.SUPERADMIN })).toBe(7);
    expect(fn(UserRole.OPERATOR, undefined, { role: UserRole.ADMIN, empresaId: 9 })).toBe(9);
    expect(() => fn(UserRole.OPERATOR, undefined, { role: UserRole.SUPERADMIN })).toThrow('No se pudo determinar la empresa');
  });
});


