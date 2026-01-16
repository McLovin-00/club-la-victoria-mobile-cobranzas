/**
 * Tests reales para config/prisma.ts (sin DB real)
 * @jest-environment node
 */

jest.mock('../logger', () => ({
  AppLogger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

jest.mock('../database', () => ({
  databaseConfig: {
    getApplicationUrl: () => 'postgresql://x',
    getConfig: () => ({ database: 'db', host: 'h', enableLogging: false, enableQueryLogging: false }),
  },
}));

let connectCalls = 0;
class PrismaClientMock {
  public $connect = jest.fn(async () => {
    connectCalls++;
    if (connectCalls === 1) return; // ok
  });
  public $disconnect = jest.fn(async () => undefined);
  public $queryRaw = jest.fn(async () => [{ ok: 1 }]);
  public $transaction = jest.fn(async (op: any) => op(this));
}

jest.mock('@prisma/client', () => ({
  PrismaClient: PrismaClientMock,
}));

describe('prismaService (real)', () => {
  it('initializePrisma connects', async () => {
    const { initializePrisma } = await import('../prisma');
    await initializePrisma();
    expect(connectCalls).toBeGreaterThan(0);
  });

  it('checkConnection true/false', async () => {
    const { prismaService } = await import('../prisma');
    // queryRaw ok
    await prismaService.connect();
    expect(await prismaService.checkConnection()).toBe(true);
    (prismaService.getClient().$queryRaw as any).mockRejectedValueOnce(new Error('x'));
    expect(await prismaService.checkConnection()).toBe(false);
  });

  it('getDatabaseInfo returns rows', async () => {
    const { prismaService } = await import('../prisma');
    const info = await prismaService.getDatabaseInfo();
    expect(info).toBeDefined();
  });

  it('executeTransaction retries and succeeds', async () => {
    const { prismaService } = await import('../prisma');
    let tries = 0;
    (prismaService.getClient().$transaction as any).mockImplementation(async (op: any) => {
      tries++;
      if (tries < 2) throw new Error('fail');
      return op(prismaService.getClient());
    });
    const out = await prismaService.executeTransaction(async () => 'ok', 2);
    expect(out).toBe('ok');
  });
});


