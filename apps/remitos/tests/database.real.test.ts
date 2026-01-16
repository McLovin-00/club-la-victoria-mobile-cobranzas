/**
 * Tests reales para database.ts
 * @jest-environment node
 */

import { createPrismaMock } from '../helpers/prismaMock';

const prismaInstance = createPrismaMock();
const PrismaClientCtor = jest.fn(() => prismaInstance);

jest.mock('../../node_modules/.prisma/remitos', () => ({
  PrismaClient: function MockPrismaClient(this: any, ...args: any[]) {
    // No nos interesan los args en tests; evitar error de TS con spread.
    return PrismaClientCtor();
  },
}));

jest.mock('../../src/config/logger', () => ({
  AppLogger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('database', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  it('connect initializes prisma and connects', async () => {
    const mod = await import('../../src/config/database');
    await mod.db.connect();
    expect(prismaInstance.$connect).toHaveBeenCalled();
    expect(mod.db.getClient()).toBe(prismaInstance);
  });

  it('getClient throws if not connected', async () => {
    const mod = await import('../../src/config/database');
    expect(() => mod.db.getClient()).toThrow('Database not connected');
  });
});


