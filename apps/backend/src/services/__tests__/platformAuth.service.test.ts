import jwt from 'jsonwebtoken';
import { generateKeyPairSync } from 'crypto';

// Mock prisma to avoid requiring DB env/config
const mockPrismaClient = {
  user: {
    findUnique: jest.fn(),
    update: jest.fn(),
    create: jest.fn(),
    count: jest.fn(),
    delete: jest.fn(),
  },
};

jest.mock('../../config/prisma', () => ({
  prismaService: {
    getClient: () => mockPrismaClient,
  },
}));

describe('PlatformAuthService JWT', () => {
  const origEnv = { ...process.env };
  afterEach(() => {
    process.env = { ...origEnv };
    jest.resetModules();
  });

  it('signs RS256 tokens when RSA keys are present', async () => {
    // fresh import per test
    jest.resetModules();
    const { privateKey, publicKey } = generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    });
    process.env.JWT_PRIVATE_KEY = privateKey;
    process.env.JWT_PUBLIC_KEY = publicKey;
    const { PlatformAuthService } = await import('../platformAuth.service');
    const payload = { userId: 1, email: 'a@b.com', role: 'ADMIN', empresaId: 2 } as any;
    const token = (PlatformAuthService as any).generateToken(payload);
    expect(() => jwt.verify(token, publicKey, { algorithms: ['RS256'] })).not.toThrow();
  });

  it('verifies HS256 tokens with legacy secret when configured', async () => {
    jest.resetModules();
    delete process.env.JWT_PRIVATE_KEY;
    delete process.env.JWT_PUBLIC_KEY;
    delete process.env.JWT_PRIVATE_KEY_PATH;
    delete process.env.JWT_PUBLIC_KEY_PATH;
    process.env.JWT_LEGACY_SECRET = 'legacy';
    const { PlatformAuthService } = await import('../platformAuth.service');
    const token = jwt.sign({ userId: 1, email: 'a@b.com', role: 'ADMIN' } as any, 'legacy', { algorithm: 'HS256' });
    const decoded = await PlatformAuthService.verifyToken(token);
    expect(decoded?.userId).toBe(1);
  });
});

describe('PlatformAuthService registerClientWithTempPassword', () => {
  const origEnv = { ...process.env };
  afterEach(() => {
    process.env = { ...origEnv };
    jest.resetModules();
  });

  it('creates CLIENTE user with mustChangePassword=true and returns tempPassword', async () => {
    jest.resetModules();
    const { privateKey, publicKey } = generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    });
    process.env.JWT_PRIVATE_KEY = privateKey;
    process.env.JWT_PUBLIC_KEY = publicKey;

    const { prismaService } = await import('../../config/prisma');
    const prisma = prismaService.getClient() as any;

    prisma.user.findUnique.mockResolvedValue(null);
    prisma.user.create.mockImplementation(async ({ data }: any) => ({
      id: 123,
      email: data.email,
      password: data.password,
      role: data.role,
      empresaId: data.empresaId ?? null,
      nombre: data.nombre ?? null,
      apellido: data.apellido ?? null,
      dadorCargaId: null,
      empresaTransportistaId: null,
      choferId: null,
      clienteId: data.clienteId,
      mustChangePassword: data.mustChangePassword,
      createdAt: new Date(),
      updatedAt: new Date(),
    }));

    const { PlatformAuthService } = await import('../platformAuth.service');
    const actor = { id: 1, email: 'admin@x.com', role: 'ADMIN_INTERNO', empresaId: 1 } as any;

    const res = await PlatformAuthService.registerClientWithTempPassword(
      { email: 'cliente@x.com', clienteId: 55, empresaId: 1 },
      actor
    );

    expect(res.success).toBe(true);
    expect(res.tempPassword).toBeTruthy();
    expect(res.platformUser?.role).toBe('CLIENTE');
    expect(res.platformUser?.mustChangePassword).toBe(true);
    expect(prisma.user.create).toHaveBeenCalled();
  });
});


