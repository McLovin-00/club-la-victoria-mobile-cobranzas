/**
 * Import tests para scripts (ahora sin side-effects al importar).
 * @jest-environment node
 */

jest.mock('@prisma/client', () => ({
  PrismaClient: function PrismaClient() {
    return {
      $disconnect: jest.fn(),
      $executeRawUnsafe: jest.fn(async () => 1),
      $queryRaw: jest.fn(async () => [{ inet_server_addr: '127.0.0.1' }]),
      user: {
        count: jest.fn(async () => 1),
        findMany: jest.fn(async () => []),
        findUnique: jest.fn(async () => null),
        update: jest.fn(async () => ({ email: 'x' })),
        create: jest.fn(async () => ({})),
      },
      empresa: {
        count: jest.fn(async () => 0),
        findMany: jest.fn(async () => []),
        findFirst: jest.fn(async () => null),
        create: jest.fn(async () => ({})),
      },
      service: {
        count: jest.fn(async () => 0),
        findMany: jest.fn(async () => []),
      },
      endUser: {
        findMany: jest.fn(async () => []),
      },
    };
  },
  UserRole: { SUPERADMIN: 'SUPERADMIN' },
}));

jest.mock('bcrypt', () => ({
  __esModule: true,
  default: { hash: jest.fn(async () => 'hashed') },
  hash: jest.fn(async () => 'hashed'),
}));

jest.mock('child_process', () => ({
  execSync: jest.fn(),
}));

describe('scripts imports (real)', () => {
  it('imports scripts modules', async () => {
    const mods = await Promise.all([
      import('../baseline-after-split'),
      import('../check-db-status'),
      import('../debug-migration'),
      import('../fix-password'),
      import('../migrate-user-split'),
      import('../setup-database'),
    ]);
    for (const m of mods) expect(m).toBeDefined();
  });
});


