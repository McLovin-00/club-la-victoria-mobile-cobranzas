/**
 * Tests reales para scripts: ejecutan las funciones exportadas (sin DB real).
 * @jest-environment node
 */
export {};

// Mocks must be at the top level, before any imports
jest.mock('child_process', () => ({
  execSync: jest.fn(),
}));

jest.mock('bcrypt', () => require('bcryptjs'));

// Create prisma instance factory
function makePrisma(overrides: Record<string, unknown> = {}) {
  return {
    $disconnect: jest.fn().mockResolvedValue(undefined),
    $executeRawUnsafe: jest.fn().mockResolvedValue(1),
    $queryRaw: jest.fn().mockResolvedValue([{ inet_server_addr: '127.0.0.1' }]),
    user: {
      count: jest.fn().mockResolvedValue(1),
      findMany: jest.fn().mockResolvedValue([]),
      findUnique: jest.fn().mockResolvedValue(null),
      update: jest.fn().mockResolvedValue({ email: 'x', id: 1 }),
      create: jest.fn().mockResolvedValue({}),
      ...((overrides as Record<string, Record<string, unknown>>).user ?? {}),
    },
    empresa: {
      count: jest.fn().mockResolvedValue(0),
      findMany: jest.fn().mockResolvedValue([]),
      findFirst: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue({ id: 1 }),
      ...((overrides as Record<string, Record<string, unknown>>).empresa ?? {}),
    },
    service: {
      count: jest.fn().mockResolvedValue(0),
      findMany: jest.fn().mockResolvedValue([]),
      ...((overrides as Record<string, Record<string, unknown>>).service ?? {}),
    },
    endUser: {
      findMany: jest.fn().mockResolvedValue([]),
      ...((overrides as Record<string, Record<string, unknown>>).endUser ?? {}),
    },
    ...overrides,
  };
}

// Set up prisma mock before importing PrismaClient
let prismaInstance: any;
jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn(function () {
    return prismaInstance;
  }),
  UserRole: { SUPERADMIN: 'SUPERADMIN' },
}));

describe('scripts (real execution)', () => {
  const originalExit = process.exit;

  beforeEach(() => {
    prismaInstance = makePrisma();
    jest.clearAllMocks();
    process.exit = jest.fn() as unknown as (code?: number) => never;
  });

  afterEach(() => {
    process.exit = originalExit;
  });

  describe('baseline-after-split.ts', () => {
    it('backfill runs raw updates and disconnects', async () => {
      const { backfill } = await import('../baseline-after-split');
      await backfill();

      expect(prismaInstance.$executeRawUnsafe).toHaveBeenCalledTimes(3);
      expect(prismaInstance.$disconnect).toHaveBeenCalled();
    });

    it('handles errors gracefully', async () => {
      prismaInstance.$executeRawUnsafe = jest.fn().mockRejectedValue(new Error('Query failed'));

      const { backfill } = await import('../baseline-after-split');

      // The error is thrown, but finally block runs first
      await expect(backfill()).rejects.toThrow('Query failed');
      expect(prismaInstance.$disconnect).toHaveBeenCalled();
    });
  });

  describe('migrate-user-split.ts', () => {
    it('migrate runs raw inserts and count', async () => {
      const { migrate } = await import('../migrate-user-split');
      await migrate();

      expect(prismaInstance.$executeRawUnsafe).toHaveBeenCalled();
      expect(prismaInstance.user.count).toHaveBeenCalled();
      expect(prismaInstance.$disconnect).toHaveBeenCalled();
    });

    it('logs total users processed', async () => {
      prismaInstance.user.count = jest.fn().mockResolvedValue(100);
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      const { migrate } = await import('../migrate-user-split');
      await migrate();

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Total procesados'));
      consoleSpy.mockRestore();
    });
  });

  describe('fix-password.ts', () => {
    it('updates user password and disconnects', async () => {
      prismaInstance.user.update = jest.fn().mockResolvedValue({
        email: 'superadmin@empresa.com',
        id: 1,
      });

      const { fixPassword } = await import('../fix-password');
      await fixPassword();

      expect(prismaInstance.user.update).toHaveBeenCalled();
      expect(prismaInstance.$disconnect).toHaveBeenCalled();
    });

    it('handles errors and disconnects', async () => {
      prismaInstance.user.update = jest.fn().mockRejectedValue(new Error('User not found'));

      const { fixPassword } = await import('../fix-password');

      // The error is thrown, but finally block runs first
      await expect(fixPassword()).rejects.toThrow('User not found');
      expect(prismaInstance.$disconnect).toHaveBeenCalled();
    });
  });

  describe('debug-migration.ts', () => {
    beforeEach(() => {
      // Set up default mocks for debug-migration
      prismaInstance.user.findMany = jest.fn().mockResolvedValue([]);
      prismaInstance.endUser.findMany = jest.fn().mockResolvedValue([]);
      prismaInstance.user.findUnique = jest.fn().mockResolvedValue(null);
      prismaInstance.empresa.findMany = jest.fn().mockResolvedValue([]);
      prismaInstance.empresa.create = jest.fn().mockResolvedValue({ id: 1 });
      prismaInstance.user.create = jest.fn().mockResolvedValue({ id: 1 });
    });

    it('runs migration and may create empresa/user', async () => {
      const { debugMigration } = await import('../debug-migration');
      await debugMigration();

      expect(prismaInstance.user.findMany).toHaveBeenCalled();
      expect(prismaInstance.$disconnect).toHaveBeenCalled();
    });

    it('logs each platform user in forEach callback', async () => {
      prismaInstance.user.findMany = jest.fn().mockResolvedValue([
        { id: 1, email: 'admin@test.com', role: 'admin' },
        { id: 2, email: 'superadmin@test.com', role: 'superadmin' },
      ]);

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      const { debugMigration } = await import('../debug-migration');
      await debugMigration();

      // forEach callback should be called for each user
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('admin@test.com'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('superadmin@test.com'));
      consoleSpy.mockRestore();
    });

    it('creates empresa when it does not exist', async () => {
      prismaInstance.empresa.findMany = jest.fn().mockResolvedValue([]);

      const { debugMigration } = await import('../debug-migration');
      await debugMigration();

      expect(prismaInstance.empresa.create).toHaveBeenCalled();
    });

    it('skips creating empresa when already exists', async () => {
      prismaInstance.empresa.findMany = jest.fn().mockResolvedValue([{ id: 1, nombre: 'Demo' }]);

      const { debugMigration } = await import('../debug-migration');
      await debugMigration();

      expect(prismaInstance.empresa.create).not.toHaveBeenCalled();
    });

    it('creates user when it does not exist', async () => {
      prismaInstance.user.findUnique = jest.fn().mockResolvedValue(null);

      const { debugMigration } = await import('../debug-migration');
      await debugMigration();

      expect(prismaInstance.user.create).toHaveBeenCalled();
    });

    it('skips creating user when already exists', async () => {
      prismaInstance.user.findUnique = jest.fn().mockResolvedValue({ id: 1, email: 'admin@test.com' });

      const { debugMigration } = await import('../debug-migration');
      await debugMigration();

      expect(prismaInstance.user.create).not.toHaveBeenCalled();
    });

    it('handles errors and exits with code 1', async () => {
      prismaInstance.user.findMany = jest.fn().mockRejectedValue(new Error('Query failed'));

      const { debugMigration } = await import('../debug-migration');
      await debugMigration();

      expect(process.exit).toHaveBeenCalledWith(1);
    });
  });

  describe('check-db-status.ts', () => {
    it('prints counts and disconnects', async () => {
      const { checkStatus } = await import('../check-db-status');
      await checkStatus();

      expect(prismaInstance.$queryRaw).toHaveBeenCalled();
      expect(prismaInstance.$disconnect).toHaveBeenCalled();
    });

    it('displays empresas when empresaCount > 0', async () => {
      prismaInstance.empresa.count = jest.fn().mockResolvedValue(2);
      prismaInstance.empresa.findMany = jest.fn().mockResolvedValue([
        { id: 1, nombre: 'Empresa 1' },
        { id: 2, nombre: 'Empresa 2' },
      ]);

      const { checkStatus } = await import('../check-db-status');
      await checkStatus();

      expect(prismaInstance.empresa.count).toHaveBeenCalled();
      expect(prismaInstance.empresa.findMany).toHaveBeenCalled();
    });

    it('displays users when userCount > 0', async () => {
      prismaInstance.user.count = jest.fn().mockResolvedValue(2);
      prismaInstance.user.findMany = jest.fn().mockResolvedValue([
        { id: 1, email: 'user1@test.com', role: 'user' },
        { id: 2, email: 'user2@test.com', role: 'admin' },
      ]);

      const { checkStatus } = await import('../check-db-status');
      await checkStatus();

      expect(prismaInstance.user.count).toHaveBeenCalled();
      expect(prismaInstance.user.findMany).toHaveBeenCalled();
    });

    it('displays services when serviceCount > 0', async () => {
      prismaInstance.service.count = jest.fn().mockResolvedValue(2);
      prismaInstance.service.findMany = jest.fn().mockResolvedValue([
        { id: 1, nombre: 'Service 1', estado: 'active' },
        { id: 2, nombre: 'Service 2', estado: 'inactive' },
      ]);

      const { checkStatus } = await import('../check-db-status');
      await checkStatus();

      expect(prismaInstance.service.count).toHaveBeenCalled();
      expect(prismaInstance.service.findMany).toHaveBeenCalled();
    });

    it('detects empty database', async () => {
      prismaInstance.empresa.count = jest.fn().mockResolvedValue(0);
      prismaInstance.user.count = jest.fn().mockResolvedValue(0);
      prismaInstance.service.count = jest.fn().mockResolvedValue(0);

      const { checkStatus } = await import('../check-db-status');
      await checkStatus();

      expect(prismaInstance.empresa.count).toHaveBeenCalled();
      expect(prismaInstance.user.count).toHaveBeenCalled();
      expect(prismaInstance.service.count).toHaveBeenCalled();
    });

    it('handles errors and exits with code 1', async () => {
      prismaInstance.$queryRaw = jest.fn().mockRejectedValue(new Error('Connection failed'));

      const { checkStatus } = await import('../check-db-status');
      await checkStatus();

      expect(process.exit).toHaveBeenCalledWith(1);
    });
  });

  describe('setup-database.ts', () => {
    it('main runs db push and optionally seed', async () => {
      const { execSync } = await import('child_process');
      prismaInstance.empresa.findFirst = jest.fn().mockResolvedValue(null);

      const { main } = await import('../setup-database');
      await main();

      expect(execSync).toHaveBeenCalled();
    });

    it('skips seeding when empresa exists', async () => {
      const { execSync } = await import('child_process');
      prismaInstance.empresa.findFirst = jest.fn().mockResolvedValue({
        id: 1,
        nombre: 'Empresa de Prueba',
      });

      const { main } = await import('../setup-database');
      await main();

      expect(execSync).toHaveBeenCalledTimes(1); // Only db push, no seed
    });

    it('handles errors in empresa check', async () => {
      prismaInstance.empresa.findFirst = jest.fn().mockRejectedValue(new Error('DB error'));

      const { main } = await import('../setup-database');
      await main();

      expect(process.exit).toHaveBeenCalledWith(1);
    });

    it('handles execSync errors and exits', async () => {
      const { execSync } = await import('child_process');
      (execSync as jest.Mock).mockImplementation(() => {
        throw new Error('Command failed');
      });
      prismaInstance.empresa.findFirst = jest.fn().mockResolvedValue(null);

      const { main } = await import('../setup-database');
      await main();

      expect(process.exit).toHaveBeenCalledWith(1);
    });
  });
});
