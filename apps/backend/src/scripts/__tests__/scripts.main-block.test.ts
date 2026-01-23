/**
 * Tests para cubrir el bloque require.main === module
 * @jest-environment node
 */

// Mock process.exit before any imports
const originalExit = process.exit;
process.exit = jest.fn() as unknown as (code?: number) => never;

// Mock child_process
jest.mock('child_process', () => ({
  execSync: jest.fn(),
}));

// Mock bcrypt
jest.mock('bcrypt', () => require('bcryptjs'));

// Mock Prisma
let prismaInstance: Record<string, unknown> = {
  $disconnect: jest.fn().mockResolvedValue(undefined),
  $executeRawUnsafe: jest.fn().mockResolvedValue(1),
  $queryRaw: jest.fn().mockResolvedValue([{ inet_server_addr: '127.0.0.1' }]),
  user: {
    count: jest.fn().mockResolvedValue(1),
    findMany: jest.fn().mockResolvedValue([]),
    findUnique: jest.fn().mockResolvedValue(null),
    update: jest.fn().mockResolvedValue({ email: 'x', id: 1 }),
    create: jest.fn().mockResolvedValue({}),
  },
  empresa: {
    count: jest.fn().mockResolvedValue(0),
    findMany: jest.fn().mockResolvedValue([]),
    findFirst: jest.fn().mockResolvedValue(null),
    create: jest.fn().mockResolvedValue({ id: 1 }),
  },
  service: {
    count: jest.fn().mockResolvedValue(0),
    findMany: jest.fn().mockResolvedValue([]),
  },
  endUser: {
    findMany: jest.fn().mockResolvedValue([]),
  },
};

jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn(function () {
    return prismaInstance;
  }),
  UserRole: { SUPERADMIN: 'SUPERADMIN' },
}));

afterAll(() => {
  process.exit = originalExit;
});

afterEach(() => {
  jest.clearAllMocks();
  // Reset prisma instance
  prismaInstance = {
    $disconnect: jest.fn().mockResolvedValue(undefined),
    $executeRawUnsafe: jest.fn().mockResolvedValue(1),
    $queryRaw: jest.fn().mockResolvedValue([{ inet_server_addr: '127.0.0.1' }]),
    user: {
      count: jest.fn().mockResolvedValue(1),
      findMany: jest.fn().mockResolvedValue([]),
      findUnique: jest.fn().mockResolvedValue(null),
      update: jest.fn().mockResolvedValue({ email: 'x', id: 1 }),
      create: jest.fn().mockResolvedValue({}),
    },
    empresa: {
      count: jest.fn().mockResolvedValue(0),
      findMany: jest.fn().mockResolvedValue([]),
      findFirst: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue({ id: 1 }),
    },
    service: {
      count: jest.fn().mockResolvedValue(0),
      findMany: jest.fn().mockResolvedValue([]),
    },
    endUser: {
      findMany: jest.fn().mockResolvedValue([]),
    },
  };
});

describe('scripts error handling coverage', () => {
  it('covers baseline-after-split.ts error path', async () => {
    prismaInstance.$executeRawUnsafe = jest.fn().mockRejectedValue(new Error('Test error'));

    // Use dynamic import to get fresh module
    const { backfill } = await import('../baseline-after-split');

    // The function should throw but $disconnect should be called in finally
    await expect(backfill()).rejects.toThrow('Test error');
    expect(prismaInstance.$disconnect).toHaveBeenCalled();
  });

  it('covers fix-password.ts error path', async () => {
    prismaInstance.user.update = jest.fn().mockRejectedValue(new Error('User not found'));

    const { fixPassword } = await import('../fix-password');

    await expect(fixPassword()).rejects.toThrow('User not found');
    expect(prismaInstance.$disconnect).toHaveBeenCalled();
  });

  it('covers migrate-user-split.ts error path', async () => {
    prismaInstance.$executeRawUnsafe = jest.fn().mockRejectedValue(new Error('Migration failed'));

    const { migrate } = await import('../migrate-user-split');

    await expect(migrate()).rejects.toThrow('Migration failed');
    expect(prismaInstance.$disconnect).toHaveBeenCalled();
  });

  it('covers check-db-status.ts with error', async () => {
    prismaInstance.$queryRaw = jest.fn().mockRejectedValue(new Error('Connection failed'));

    const { checkStatus } = await import('../check-db-status');

    await checkStatus();
    expect(process.exit).toHaveBeenCalledWith(1);
  });

  it('covers debug-migration.ts with error', async () => {
    prismaInstance.user.findMany = jest.fn().mockRejectedValue(new Error('Query failed'));

    const { debugMigration } = await import('../debug-migration');

    await debugMigration();
    expect(process.exit).toHaveBeenCalledWith(1);
  });

  it('covers setup-database.ts with empresa findFirst error', async () => {
    prismaInstance.empresa.findFirst = jest.fn().mockRejectedValue(new Error('DB error'));

    const { main } = await import('../setup-database');

    await main();
    expect(process.exit).toHaveBeenCalledWith(1);
  });
});
