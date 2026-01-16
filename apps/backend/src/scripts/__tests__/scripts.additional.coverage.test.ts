/**
 * Tests adicionales para scripts para mejorar cobertura de branches.
 * @jest-environment node
 */

jest.mock('child_process', () => ({
  execSync: jest.fn(),
}));

jest.mock('bcrypt', () => ({
  __esModule: true,
  default: { hash: jest.fn(async () => 'hashed') },
  hash: jest.fn(async () => 'hashed'),
}));

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
      create: jest.fn(async () => ({ id: 1 })),
      ...(overrides.user || {}),
    },
    empresa: {
      count: jest.fn(async () => 0),
      findMany: jest.fn(async () => []),
      findFirst: jest.fn(async () => null),
      create: jest.fn(async () => ({ id: 1 })),
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

describe('scripts additional coverage', () => {
  beforeEach(() => {
    prismaInstance = makePrisma();
    jest.clearAllMocks();
  });

  describe('check-db-status.ts', () => {
    it('should display empresas when empresaCount > 0', async () => {
      prismaInstance.empresa.count = jest.fn(async () => 2);
      prismaInstance.empresa.findMany = jest.fn(async () => [
        { id: 1, nombre: 'Empresa 1' },
        { id: 2, nombre: 'Empresa 2' },
      ]);

      const { checkStatus } = await import('../check-db-status');
      await checkStatus();

      expect(prismaInstance.empresa.count).toHaveBeenCalled();
      expect(prismaInstance.empresa.findMany).toHaveBeenCalled();
    });

    it('should display users when userCount > 0', async () => {
      prismaInstance.user.count = jest.fn(async () => 2);
      prismaInstance.user.findMany = jest.fn(async () => [
        { id: 1, email: 'user1@test.com', role: 'user' },
        { id: 2, email: 'user2@test.com', role: 'admin' },
      ]);

      const { checkStatus } = await import('../check-db-status');
      await checkStatus();

      expect(prismaInstance.user.count).toHaveBeenCalled();
      expect(prismaInstance.user.findMany).toHaveBeenCalled();
    });

    it('should display services when serviceCount > 0', async () => {
      prismaInstance.service.count = jest.fn(async () => 2);
      prismaInstance.service.findMany = jest.fn(async () => [
        { id: 1, nombre: 'Service 1', estado: 'active' },
        { id: 2, nombre: 'Service 2', estado: 'inactive' },
      ]);

      const { checkStatus } = await import('../check-db-status');
      await checkStatus();

      expect(prismaInstance.service.count).toHaveBeenCalled();
      expect(prismaInstance.service.findMany).toHaveBeenCalled();
    });

    it('should detect empty database', async () => {
      prismaInstance.empresa.count = jest.fn(async () => 0);
      prismaInstance.user.count = jest.fn(async () => 0);
      prismaInstance.service.count = jest.fn(async () => 0);

      const { checkStatus } = await import('../check-db-status');
      await checkStatus();

      expect(prismaInstance.empresa.count).toHaveBeenCalled();
      expect(prismaInstance.user.count).toHaveBeenCalled();
      expect(prismaInstance.service.count).toHaveBeenCalled();
    });

    it('should handle errors and exit with code 1', async () => {
      prismaInstance.$queryRaw = jest.fn(async () => {
        throw new Error('Database connection failed');
      });

      const { checkStatus } = await import('../check-db-status');
      const originalExit = process.exit;
      process.exit = jest.fn() as any;

      await checkStatus();

      expect(process.exit).toHaveBeenCalledWith(1);
      process.exit = originalExit;
    });
  });

  describe('setup-database.ts', () => {
    it('should skip seeding when empresa exists', async () => {
      prismaInstance.empresa.findFirst = jest.fn(async () => ({
        id: 1,
        nombre: 'Empresa de Prueba',
      }));

      const { execSync } = await import('child_process');
      const { main } = await import('../setup-database');
      await main();

      expect(prismaInstance.empresa.findFirst).toHaveBeenCalled();
      expect(execSync).toHaveBeenCalledTimes(1);
    });

    it('should run seeding when empresa does not exist', async () => {
      prismaInstance.empresa.findFirst = jest.fn(async () => null);

      const { execSync } = await import('child_process');
      const { main } = await import('../setup-database');
      await main();

      expect(prismaInstance.empresa.findFirst).toHaveBeenCalled();
      expect(execSync).toHaveBeenCalledTimes(2);
    });

    it('should handle errors in empresa check and exit', async () => {
      prismaInstance.empresa.findFirst = jest.fn(async () => {
        throw new Error('Database error');
      });

      const { main } = await import('../setup-database');
      const originalExit = process.exit;
      process.exit = jest.fn() as any;

      await main();

      expect(process.exit).toHaveBeenCalledWith(1);
      process.exit = originalExit;
    });

    it('should handle errors in main and exit with code 1', async () => {
      const { execSync } = await import('child_process');
      (execSync as jest.Mock).mockImplementation(() => {
        throw new Error('Command failed');
      });

      const originalExit = process.exit;
      process.exit = jest.fn() as any;

      try {
        const { main } = await import('../setup-database');
        await main();
      } catch {
        // Expected error
      }

      expect(process.exit).toHaveBeenCalledWith(1);
      process.exit = originalExit;
    });
  });



  describe('debug-migration.ts', () => {
    it('should skip creating test user when already exists', async () => {
      prismaInstance.user.findMany = jest.fn(async () => []);
      prismaInstance.endUser.findMany = jest.fn(async () => []);
      prismaInstance.user.findUnique = jest.fn(async () => ({
        id: 1,
        email: 'superadmin@empresa.com',
      }));
      prismaInstance.empresa.findMany = jest.fn(async () => []);

      const { debugMigration } = await import('../debug-migration');
      await debugMigration();

      expect(prismaInstance.user.findUnique).toHaveBeenCalled();
      expect(prismaInstance.user.create).not.toHaveBeenCalled();
    });

    it('should skip creating empresa when already exists', async () => {
      prismaInstance.user.findMany = jest.fn(async () => []);
      prismaInstance.endUser.findMany = jest.fn(async () => []);
      prismaInstance.user.findUnique = jest.fn(async () => ({
        id: 1,
        email: 'superadmin@empresa.com',
      }));
      prismaInstance.empresa.findMany = jest.fn(async () => [
        { id: 1, nombre: 'Empresa Demo' },
      ]);

      const { debugMigration } = await import('../debug-migration');
      await debugMigration();

      expect(prismaInstance.empresa.findMany).toHaveBeenCalled();
      expect(prismaInstance.empresa.create).not.toHaveBeenCalled();
    });
  });
});
