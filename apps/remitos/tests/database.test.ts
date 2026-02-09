/**
 * Tests unitarios para src/config/database.ts
 * Cobertura de connect(), disconnect() y getClient()
 */
import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';

describe('src/config/database.ts', () => {
  let mockPrismaClient: any;

  beforeEach(async () => {
    jest.resetModules();
    mockPrismaClient = {
      $connect: jest.fn().mockResolvedValue(undefined),
      $disconnect: jest.fn().mockResolvedValue(undefined),
      $transaction: jest.fn((cb) => cb(mockPrismaClient)),
      remito: {
        update: jest.fn().mockResolvedValue({}),
        findMany: jest.fn().mockResolvedValue([]),
        create: jest.fn().mockResolvedValue({}),
      },
      remitoHistory: {
        create: jest.fn().mockResolvedValue({}),
      },
      remitoImagen: {
        update: jest.fn().mockResolvedValue({}),
        findMany: jest.fn().mockResolvedValue([]),
      },
      remitoSystemConfig: {
        findFirst: jest.fn().mockResolvedValue(null),
        findMany: jest.fn().mockResolvedValue([]),
        createMany: jest.fn().mockResolvedValue({}),
        upsert: jest.fn().mockResolvedValue({}),
      },
    };

    jest.doMock('../../node_modules/.prisma/remitos', () => ({
      PrismaClient: jest.fn().mockImplementation(() => mockPrismaClient),
    }));
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.resetModules();
  });

  it('U24: db_connect_idempotent', async () => {
    const { db } = await import('../src/config/database');
    await db.connect();
    await db.connect();
    expect(mockPrismaClient.$connect).toHaveBeenCalledTimes(1);
  });

  it('U25: db_disconnect_nullClient_noOp', async () => {
    const { db } = await import('../src/config/database');
    await db.disconnect();
    expect(mockPrismaClient.$disconnect).not.toHaveBeenCalled();
  });

  it('U26: db_getClient_notConnected_throws', async () => {
    const { db } = await import('../src/config/database');
    expect(() => db.getClient()).toThrow('Database not connected');
  });

  it('U27a: db_connect_success_logs', async () => {
    const { db, mockPrisma } = await import('../src/config/database');
    await db.connect();
    expect(mockPrismaClient.$connect).toHaveBeenCalled();
  });

  it('db_disconnect_success_logs', async () => {
    const { db } = await import('../src/config/database');
    await db.connect();
    await db.disconnect();
    expect(mockPrismaClient.$disconnect).toHaveBeenCalled();
    expect(mockPrismaClient.$connect).toHaveBeenCalled();
  });

  it('db_getClient_afterConnect_returnsClient', async () => {
    const { db } = await import('../src/config/database');
    await db.connect();
    const client = db.getClient();
    expect(client).toBe(mockPrismaClient);
  });
});
