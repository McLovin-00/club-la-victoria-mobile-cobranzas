/**
 * Tests adicionales para src/seed/index.ts
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

jest.mock('bcryptjs', () => ({
  __esModule: true,
  default: { hash: jest.fn(async () => 'hashed') },
  hash: jest.fn(async () => 'hashed'),
}));

const prisma = {
  user: {
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    findMany: jest.fn(),
  },
  empresa: {
    findUnique: jest.fn(),
    create: jest.fn(),
    findMany: jest.fn(),
  },
  service: {
    findUnique: jest.fn(),
    create: jest.fn(),
  },
  instance: {
    findFirst: jest.fn(),
    create: jest.fn(),
  },
};

jest.mock('../../config/prisma', () => ({ prisma }));

import { runSeeds } from '../index';

describe('seed additional coverage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createExampleUsers', () => {
    it('should warn and return when no companies exist', async () => {
      prisma.user.findFirst = jest.fn(async () => ({ id: 1 }));
      prisma.empresa.findMany = jest.fn(async () => []);
      prisma.empresa.findUnique = jest.fn(async () => null);
      prisma.empresa.create = jest.fn(async ({ data }: any) => ({ id: 10, ...data }));
      prisma.service.findUnique = jest.fn(async () => ({ id: 200, nombre: 'Chat Processor' }));
      prisma.service.create = jest.fn(async ({ data }: any) => ({ id: 201, ...data }));

      await runSeeds();

      expect(prisma.user.create).not.toHaveBeenCalled();
    });
  });

  describe('createChatProcessorInstances', () => {
    it('should warn and return when no companies exist', async () => {
      prisma.user.findFirst = jest.fn(async () => ({ id: 1 }));
      prisma.empresa.findMany = jest.fn(async () => []);
      prisma.empresa.findUnique = jest.fn(async () => null);
      prisma.empresa.create = jest.fn(async ({ data }: any) => ({ id: 10, ...data }));
      prisma.service.findUnique = jest.fn(async () => ({ id: 200, nombre: 'Chat Processor' }));
      prisma.service.create = jest.fn(async ({ data }: any) => ({ id: 201, ...data }));

      await runSeeds();

      expect(prisma.instance.create).not.toHaveBeenCalled();
    });

    it('should skip when instance already exists', async () => {
      prisma.user.findFirst = jest.fn(async () => ({ id: 1 }));
      prisma.empresa.findMany = jest.fn(async () => [{ id: 10, nombre: 'Empresa Demo' }]);
      prisma.empresa.findUnique = jest.fn(async () => null);
      prisma.empresa.create = jest.fn(async ({ data }: any) => ({ id: 10, ...data }));
      prisma.user.findUnique = jest.fn(async () => null);
      prisma.user.create = jest.fn(async ({ data }: any) => ({ id: 2, ...data }));
      prisma.service.findUnique = jest.fn(async () => ({ id: 200, nombre: 'Chat Processor' }));
      prisma.service.create = jest.fn(async ({ data }: any) => ({ id: 201, ...data }));
      prisma.instance.findFirst = jest.fn(async () => ({ id: 99, nombre: 'Instancia de Chat Processor para Empresa Demo' }));

      await runSeeds();

      expect(prisma.instance.create).not.toHaveBeenCalled();
    });
  });
});
