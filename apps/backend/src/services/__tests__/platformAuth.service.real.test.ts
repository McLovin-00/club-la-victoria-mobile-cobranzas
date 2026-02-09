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

const prisma = {
  user: {
    findUnique: jest.fn(),
    update: jest.fn(),
    create: jest.fn(),
    delete: jest.fn(),
  },
};
jest.mock('../../config/prisma', () => ({
  prismaService: { getClient: () => prisma },
}));

import { PlatformAuthService } from '../platformAuth.service';
import * as bcrypt from 'bcrypt';

describe('PlatformAuthService (real)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.JWT_EXPIRES_IN;
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
      expect(out.message).toContain('desactivado');
    });

    it('repairs invalid hash only for seed + default password', async () => {
      // invalid hash length -> triggers repair path for seed account if default password
      prisma.user.findUnique.mockResolvedValueOnce({ id: 1, email: 'admin@empresa.com', role: 'ADMIN', password: 'bad', activo: true });
      prisma.user.update.mockResolvedValueOnce({});
      const out = await PlatformAuthService.login({ email: 'admin@empresa.com', password: 'admin123' });
      expect(out.success).toBe(true);
      expect(prisma.user.update).toHaveBeenCalled();
    });

    it('rejects invalid hash for non-seed user', async () => {
      prisma.user.findUnique.mockResolvedValueOnce({ id: 2, email: 'user@x.com', role: 'ADMIN', password: 'bad', activo: true });
      const out = await PlatformAuthService.login({ email: 'user@x.com', password: 'x' });
      expect(out.success).toBe(false);
      expect(out.message).toContain('Contacte al administrador');
    });

    it('returns token + profile on success', async () => {
      // usar hash bcrypt válido para no disparar rama de "hash inválido"
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
      prisma.user.update.mockResolvedValueOnce({ id: 1, email: 'x', role: 'OPERATOR', empresaId: 1, createdAt: new Date(), updatedAt: new Date() });

      await expect(
        PlatformAuthService.updatePlatformUser(1, { role: 'ADMIN' as any }, { id: 1, role: 'ADMIN' as any, empresaId: 1 } as any)
      ).rejects.toThrow('no puede cambiar el rol');

      await expect(
        PlatformAuthService.updatePlatformUser(1, { empresaId: 2 }, { id: 1, role: 'ADMIN' as any, empresaId: 1 } as any)
      ).rejects.toThrow('No puede asignar otra empresa');

      const out = await PlatformAuthService.updatePlatformUser(
        1,
        { email: '  A@B.COM ', password: 'p' },
        { id: 1, role: 'SUPERADMIN' as any } as any
      );
      expect(out.id).toBe(1);
      const call = prisma.user.update.mock.calls[0][0];
      expect(call.data.email).toBe('a@b.com');
      expect(typeof call.data.password).toBe('string');
      expect(call.data.password).not.toBe('p');
    });

    it('deletePlatformUser only for SUPERADMIN', async () => {
      await expect(
        PlatformAuthService.deletePlatformUser(1, { id: 1, role: 'ADMIN' as any } as any)
      ).rejects.toThrow('Solo superadmin');
      prisma.user.delete.mockResolvedValueOnce({});
      await PlatformAuthService.deletePlatformUser(1, { id: 1, role: 'SUPERADMIN' as any } as any);
      expect(prisma.user.delete).toHaveBeenCalled();
    });

    it('updatePassword returns not found / wrong current / success', async () => {
      prisma.user.findUnique.mockResolvedValueOnce(null);
      expect((await PlatformAuthService.updatePassword(1, 'a', 'b')).success).toBe(false);

      prisma.user.findUnique.mockResolvedValueOnce({ id: 1, password: await bcrypt.hash('right', 12) });
      expect((await PlatformAuthService.updatePassword(1, 'a', 'b')).message).toContain('incorrecta');

      prisma.user.findUnique.mockResolvedValueOnce({ id: 1, password: await bcrypt.hash('a', 12) });
      prisma.user.update.mockResolvedValueOnce({});
      const out = await PlatformAuthService.updatePassword(1, 'a', 'b');
      expect(out.success).toBe(true);
      expect(prisma.user.update).toHaveBeenCalled();
    });
  });

  describe('wizard registrations', () => {
    async function runWizard(fn: any, role: any) {
      prisma.user.findUnique.mockResolvedValueOnce(null);
      prisma.user.create.mockResolvedValueOnce({ id: 1, email: 'a', role, createdAt: new Date(), updatedAt: new Date() });
      return fn({ email: 'a', empresaId: null, nombre: 'n', apellido: 'a', clienteId: 1, dadorCargaId: 1, empresaTransportistaId: 1, choferId: 1 }, { id: 9, role: 'SUPERADMIN', empresaId: 2 } as any);
    }

    it('permission denied throws, existing email returns failure, success returns tempPassword', async () => {
      await expect(
        PlatformAuthService.registerClientWithTempPassword({ email: 'a', clienteId: 1 }, { id: 1, role: 'OPERATOR' as any } as any)
      ).rejects.toThrow('permisos');

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
      const outT = await runWizard(PlatformAuthService.registerTransportistaWithTempPassword.bind(PlatformAuthService), 'TRANSPORTISTA');
      expect(outT.success).toBe(true);
      const outC = await runWizard(PlatformAuthService.registerChoferWithTempPassword.bind(PlatformAuthService), 'CHOFER');
      expect(outC.success).toBe(true);
    });
  });
});


