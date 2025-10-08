import jwt from 'jsonwebtoken';
import { generateKeyPairSync } from 'crypto';

// Mock prisma to avoid requiring DB env/config
jest.mock('../../config/prisma', () => ({
  prismaService: {
    getClient: () => ({
      user: {
        findUnique: jest.fn(),
        update: jest.fn(),
        create: jest.fn(),
        count: jest.fn(),
        delete: jest.fn(),
      },
    }),
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


