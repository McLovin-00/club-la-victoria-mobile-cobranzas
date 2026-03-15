/**
 * Tests reales para PlatformAuthService (sin DB real)
 * @jest-environment node
 */

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
    JWT_LEGACY_SECRET: 'legacy',
    jwtPrivateKey: 'priv',
    jwtPublicKey: 'pub',
  }),
}));

const jwt = {
  sign: jest.fn(() => 'token'),
  verify: jest.fn(),
};
jest.mock('jsonwebtoken', () => jwt);

const prisma: any = {
  user: {
    findUnique: jest.fn(),
    update: jest.fn(),
    create: jest.fn(),
    delete: jest.fn(),
  },
  refreshToken: {
    create: jest.fn(),
    findUnique: jest.fn(),
    updateMany: jest.fn(),
  },
  $queryRawUnsafe: jest.fn(),
  $transaction: jest.fn(),
};
prisma.$transaction.mockImplementation((fn: any) => fn({
  user: {
    findUnique: prisma.user.findUnique,
    create: prisma.user.create,
  },
}));
jest.mock('../../config/prisma', () => ({
  prismaService: { getClient: () => prisma },
}));

import { PlatformAuthService } from '../platformAuth.service';
import * as bcrypt from 'bcrypt';

describe('PlatformAuthService (real)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.JWT_EXPIRES_IN;
    prisma.$transaction.mockImplementation((fn: any) => fn({
      user: {
        findUnique: prisma.user.findUnique,
        create: prisma.user.create,
      },
    }));
  });

  describe('verifyToken', () => {
    it('verifies RS256, falls back to legacy HS256, or returns null', async () => {
      jwt.verify.mockReturnValueOnce({ userId: 1 });
      expect(await PlatformAuthService.verifyToken('t')).toEqual({ userId: 1 });

      jwt.verify.mockImplementationOnce(() => { throw new Error('rs'); });
      jwt.verify.mockReturnValueOnce({ userId: 2 });
      expect(await PlatformAuthService.verifyToken('t')).toEqual({ userId: 2 });

      jwt.verify.mockImplementationOnce(() => { throw new Error('rs'); });
      jwt.verify.mockImplementationOnce(() => { throw new Error('hs'); });
      expect(await PlatformAuthService.verifyToken('t')).toBeNull();
    });
  });

  describe('login', () => {
    it('returns invalid credentials when user missing or password mismatch', async () => {
      prisma.user.findUnique.mockResolvedValueOnce(null);
      expect((await PlatformAuthService.login({ email: 'a', password: 'b' })).success).toBe(false);

      const goodHash = await bcrypt.hash('correct', 12);
      prisma.user.findUnique.mockResolvedValueOnce({ id: 1, email: 'a', role: 'ADMIN', password: goodHash, activo: true });
      const out = await PlatformAuthService.login({ email: 'a', password: 'b' });
      expect(out.success).toBe(false);
    });

    it('returns disabled when activo=false', async () => {
      prisma.user.findUnique.mockResolvedValueOnce({ id: 1, email: 'a', role: 'ADMIN', password: 'hashed', activo: false });
      const out = await PlatformAuthService.login({ email: 'a', password: 'b' });
      expect(out.success).toBe(false);
      expect(out.message).toContain('Credenciales inválidas');
    });

    it('repairs invalid hash only for seed + default password', async () => {
      process.env.SEED_REPAIR_EMAILS = 'admin@bca.com';
      process.env.SEED_REPAIR_PASSWORDS = 'password123';
      try {
        prisma.user.findUnique.mockResolvedValueOnce({ id: 1, email: 'admin@bca.com', role: 'ADMIN', password: 'bad', activo: true });
        prisma.user.update.mockResolvedValueOnce({});
        prisma.refreshToken.create.mockResolvedValueOnce({});
        const out = await PlatformAuthService.login({ email: 'admin@bca.com', password: 'password123' });
        expect(out.success).toBe(true);
        expect(prisma.user.update).toHaveBeenCalled();
      } finally {
        delete process.env.SEED_REPAIR_EMAILS;
        delete process.env.SEED_REPAIR_PASSWORDS;
      }
    });

    it('rejects invalid hash for non-seed user', async () => {
      prisma.user.findUnique.mockResolvedValueOnce({ id: 2, email: 'user@x.com', role: 'ADMIN', password: 'bad', activo: true });
      const out = await PlatformAuthService.login({ email: 'user@x.com', password: 'x' });
      expect(out.success).toBe(false);
      expect(out.message).toContain('Credenciales inválidas');
    });

    it('returns token + profile on success', async () => {
      prisma.user.findUnique.mockResolvedValueOnce({
        id: 1,
        email: 'a',
        role: 'ADMIN',
        password: await bcrypt.hash('b', 12),
        activo: true,
        empresaId: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      prisma.refreshToken.create.mockResolvedValueOnce({});
      const out = await PlatformAuthService.login({ email: 'a', password: 'b' });
      expect(out.success).toBe(true);
      expect(out.token).toBe('token');
      expect(out.platformUser?.email).toBe('a');
    });
  });

  describe('register / permissions', () => {
    it('throws when creator lacks permission; returns message if email exists; creates user otherwise', async () => {
      await expect(
        PlatformAuthService.register({ email: 'a', password: 'p', role: 'SUPERADMIN' as any }, { id: 1, role: 'ADMIN' as any } as any)
      ).rejects.toThrow('no tiene permiso');

      prisma.user.findUnique.mockResolvedValueOnce({ id: 1 });
      const out1 = await PlatformAuthService.register({ email: 'a', password: 'p', role: 'OPERATOR' as any }, { id: 1, role: 'SUPERADMIN' as any, empresaId: 2 } as any);
      expect(out1.success).toBe(false);

      prisma.user.findUnique.mockResolvedValueOnce(null);
      prisma.user.create.mockResolvedValueOnce({ id: 9, email: 'a', role: 'OPERATOR', empresaId: 2, createdAt: new Date(), updatedAt: new Date() });
      const out2 = await PlatformAuthService.register({ email: 'a', password: 'p', role: 'OPERATOR' as any }, { id: 1, role: 'ADMIN' as any, empresaId: 2 } as any);
      expect(out2.success).toBe(true);
      expect(out2.platformUser?.id).toBe(9);
    });
  });

  describe('updatePlatformUser / deletePlatformUser / updatePassword', () => {
    it('updatePlatformUser enforces ADMIN rules and normalizes email/password', async () => {
      prisma.user.findUnique.mockResolvedValueOnce({ empresaId: 1 });
      await expect(
        PlatformAuthService.updatePlatformUser(1, { role: 'ADMIN' as any }, { id: 1, role: 'ADMIN' as any, empresaId: 1 } as any)
      ).rejects.toThrow('no puede cambiar el rol');

      prisma.user.findUnique.mockResolvedValueOnce({ empresaId: 1 });
      await expect(
        PlatformAuthService.updatePlatformUser(1, { empresaId: 2 }, { id: 1, role: 'ADMIN' as any, empresaId: 1 } as any)
      ).rejects.toThrow('No puede asignar otra empresa');

      prisma.user.update.mockResolvedValueOnce({ id: 1, email: 'a@b.com', role: 'OPERATOR', empresaId: 1, createdAt: new Date(), updatedAt: new Date() });
      const out = await PlatformAuthService.updatePlatformUser(
        1,
        { email: '  A@B.COM ', password: 'NewPass1x' },
        { id: 1, role: 'SUPERADMIN' as any } as any
      );
      expect(out.id).toBe(1);
      const call = prisma.user.update.mock.calls[0][0];
      expect(call.data.email).toBe('a@b.com');
      expect(typeof call.data.password).toBe('string');
      expect(call.data.password).not.toBe('NewPass1x');
    });

    it('deletePlatformUser only for SUPERADMIN', async () => {
      await expect(
        PlatformAuthService.deletePlatformUser(1, { id: 1, role: 'ADMIN' as any } as any)
      ).rejects.toThrow('Solo superadmin');
      prisma.user.update.mockResolvedValueOnce({});
      prisma.refreshToken.updateMany.mockResolvedValueOnce({});
      await PlatformAuthService.deletePlatformUser(1, { id: 1, role: 'SUPERADMIN' as any } as any);
      expect(prisma.user.update).toHaveBeenCalled();
    });

    it('updatePassword returns not found / wrong current / success', async () => {
      prisma.user.findUnique.mockResolvedValueOnce(null);
      expect((await PlatformAuthService.updatePassword(1, 'OldPass1x', 'NewPass1x')).success).toBe(false);

      prisma.user.findUnique.mockResolvedValueOnce({ id: 1, password: await bcrypt.hash('RightPass1', 12) });
      expect((await PlatformAuthService.updatePassword(1, 'WrongPass1', 'NewPass1x')).message).toContain('incorrecta');

      prisma.user.findUnique.mockResolvedValueOnce({ id: 1, password: await bcrypt.hash('OldPass1x', 12) });
      prisma.user.update.mockResolvedValueOnce({});
      prisma.refreshToken.updateMany.mockResolvedValueOnce({});
      const out = await PlatformAuthService.updatePassword(1, 'OldPass1x', 'NewPass1x');
      expect(out.success).toBe(true);
      expect(prisma.user.update).toHaveBeenCalled();
    });
  });

  describe('wizard registrations', () => {
    async function runWizard(fn: any, role: any, queryRawCalls = 1) {
      for (let i = 0; i < queryRawCalls; i++) {
        prisma.$queryRawUnsafe.mockResolvedValueOnce([{ id: 1, dador_carga_id: 1 }]);
      }
      prisma.user.findUnique.mockResolvedValueOnce(null);
      prisma.user.create.mockResolvedValueOnce({ id: 1, email: 'a', role, createdAt: new Date(), updatedAt: new Date() });
      return fn({ email: 'a', empresaId: null, nombre: 'n', apellido: 'a', clienteId: 1, dadorCargaId: 1, empresaTransportistaId: 1, choferId: 1 }, { id: 9, role: 'SUPERADMIN', empresaId: 2 } as any);
    }

    it('permission denied throws, existing email returns failure, success returns tempPassword', async () => {
      await expect(
        PlatformAuthService.registerClientWithTempPassword({ email: 'a', clienteId: 1 }, { id: 1, role: 'OPERATOR' as any } as any)
      ).rejects.toThrow('permisos');

      prisma.$queryRawUnsafe.mockResolvedValueOnce([{ id: 1 }]);
      prisma.user.findUnique.mockResolvedValueOnce({ id: 1 });
      const out1 = await PlatformAuthService.registerClientWithTempPassword({ email: 'a', clienteId: 1 }, { id: 1, role: 'SUPERADMIN' as any, empresaId: 2 } as any);
      expect(out1.success).toBe(false);

      const out2 = await runWizard(PlatformAuthService.registerClientWithTempPassword.bind(PlatformAuthService), 'CLIENTE');
      expect(out2.success).toBe(true);
      expect(out2.tempPassword).toBeDefined();
    });

    it('other wizard methods execute and return success', async () => {
      const outD = await runWizard(PlatformAuthService.registerDadorWithTempPassword.bind(PlatformAuthService), 'DADOR_DE_CARGA');
      expect(outD.success).toBe(true);
      const outT = await runWizard(PlatformAuthService.registerTransportistaWithTempPassword.bind(PlatformAuthService), 'TRANSPORTISTA', 3);
      expect(outT.success).toBe(true);
      const outC = await runWizard(PlatformAuthService.registerChoferWithTempPassword.bind(PlatformAuthService), 'CHOFER', 3);
      expect(outC.success).toBe(true);
    });
  });
});


