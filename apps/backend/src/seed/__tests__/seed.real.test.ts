/**
 * Tests reales para src/seed/index.ts (sin Prisma real)
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

describe('seed runSeeds (real)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates seed data when nothing exists', async () => {
    prisma.user.findFirst.mockResolvedValue(null);
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.empresa.findUnique.mockResolvedValue(null);
    prisma.service.findUnique.mockResolvedValue(null);
    prisma.instance.findFirst.mockResolvedValue(null);

    prisma.user.create.mockImplementation(async ({ data }: any) => ({ id: 1, email: data.email, role: data.role, empresaId: data.empresaId }));
    prisma.empresa.create.mockImplementation(async ({ data }: any) => ({ id: Math.floor(Math.random() * 1000) + 1, ...data }));
    prisma.empresa.findMany.mockResolvedValue([{ id: 10, nombre: 'Empresa Demo' }, { id: 11, nombre: 'Empresa Ejemplo' }]);
    prisma.service.create.mockImplementation(async ({ data }: any) => ({ id: Math.floor(Math.random() * 1000) + 1, ...data }));
    prisma.instance.create.mockImplementation(async ({ data }: any) => ({ id: 99, ...data }));

    // Chat Processor debe existir para crear instancias (se crea en createSystemServices)
    prisma.service.findUnique.mockImplementation(async ({ where }: any) => {
      if (where?.nombre === 'Chat Processor') return { id: 200, nombre: 'Chat Processor' };
      return null;
    });

    await runSeeds();

    expect(prisma.user.create).toHaveBeenCalled();
    expect(prisma.empresa.create).toHaveBeenCalled();
    expect(prisma.service.create).toHaveBeenCalled();
    expect(prisma.instance.create).toHaveBeenCalled();
  });

  it('skips creation when entities already exist and handles missing Chat Processor service', async () => {
    prisma.user.findFirst.mockResolvedValue({ id: 1 });
    prisma.empresa.findUnique.mockResolvedValue({ id: 10 });
    prisma.empresa.findMany.mockResolvedValue([{ id: 10 }]);
    prisma.user.findUnique.mockResolvedValue({ id: 2 });
    prisma.service.findUnique.mockResolvedValue(null); // chat processor missing => returns early on instances

    await runSeeds();

    expect(prisma.user.create).not.toHaveBeenCalled();
    expect(prisma.empresa.create).not.toHaveBeenCalled();
    // createSystemServices will attempt create because findUnique returns null for each service definition
    expect(prisma.service.create).toHaveBeenCalled();
    expect(prisma.instance.create).not.toHaveBeenCalled();
  });
});


