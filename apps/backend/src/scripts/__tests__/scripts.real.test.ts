/**
 * Tests reales para scripts: ejecutan las funciones exportadas (sin DB real).
 * @jest-environment node
 */

jest.mock('child_process', () => ({
  execSync: jest.fn(),
}));

jest.mock('bcrypt', () => require('bcryptjs'));

// Mock PrismaClient
function makePrisma(overrides: Partial<any> = {}) {
  return {
    $disconnect: jest.fn(async () => undefined),
    $executeRawUnsafe: jest.fn(async () => 1),
    $queryRaw: jest.fn(async () => [{ inet_server_addr: '127.0.0.1' }]),
    user: {
      count: jest.fn(async () => 1),
      findMany: jest.fn(async () => []),
      findUnique: jest.fn(async () => null),
      update: jest.fn(async () => ({ email: 'x', id: 1 })),
      create: jest.fn(async () => ({})),
      ...(overrides.user || {}),
    },
    empresa: {
      count: jest.fn(async () => 0),
      findMany: jest.fn(async () => []),
      findFirst: jest.fn(async () => null),
      create: jest.fn(async () => ({})),
      ...(overrides.empresa || {}),
    },
    service: {
      count: jest.fn(async () => 0),
      findMany: jest.fn(async () => []),
      ...(overrides.service || {}),
    },
    endUser: {
      findMany: jest.fn(async () => []),
      ...(overrides.endUser || {}),
    },
    ...overrides,
  };
}

let prismaInstance: any;
jest.mock('@prisma/client', () => ({
  PrismaClient: function PrismaClient() {
    return prismaInstance;
  },
  UserRole: { SUPERADMIN: 'SUPERADMIN' },
}));

describe('scripts (real)', () => {
  beforeEach(() => {
    prismaInstance = makePrisma();
    jest.clearAllMocks();
  });

  it('baseline-after-split backfill runs raw updates', async () => {
    const { backfill } = await import('../baseline-after-split');
    await backfill();
    expect(prismaInstance.$executeRawUnsafe).toHaveBeenCalled();
    expect(prismaInstance.$disconnect).toHaveBeenCalled();
  });

  it('migrate-user-split migrate runs raw inserts + count', async () => {
    const { migrate } = await import('../migrate-user-split');
    await migrate();
    expect(prismaInstance.$executeRawUnsafe).toHaveBeenCalled();
    expect(prismaInstance.user.count).toHaveBeenCalled();
  });

  it('fix-password updates user password', async () => {
    const { fixPassword } = await import('../fix-password');
    await fixPassword();
    expect(prismaInstance.user.update).toHaveBeenCalled();
  });

  it('debug-migration runs and may create empresa/user', async () => {
    prismaInstance.user.findMany = jest.fn(async () => []);
    prismaInstance.endUser.findMany = jest.fn(async () => []);
    prismaInstance.user.findUnique = jest.fn(async () => null);
    prismaInstance.empresa.findMany = jest.fn(async () => []);
    const { debugMigration } = await import('../debug-migration');
    await debugMigration();
    expect(prismaInstance.user.findMany).toHaveBeenCalled();
  });

  it('check-db-status prints counts and disconnects', async () => {
    const { checkStatus } = await import('../check-db-status');
    await checkStatus();
    expect(prismaInstance.$queryRaw).toHaveBeenCalled();
    expect(prismaInstance.$disconnect).toHaveBeenCalled();
  });

  it('setup-database main runs db push and optionally seed', async () => {
    const { execSync } = await import('child_process');
    prismaInstance.empresa.findFirst = jest.fn(async () => null);
    const { main } = await import('../setup-database');
    await main();
    // db push + seed
    expect(execSync).toHaveBeenCalled();
  });
});


