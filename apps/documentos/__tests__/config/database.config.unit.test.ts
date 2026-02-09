jest.mock('../../src/config/logger', () => ({
  AppLogger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

const prismaInstance: any = {
  $on: jest.fn(),
  $connect: jest.fn(async () => undefined),
  $disconnect: jest.fn(async () => undefined),
  $queryRaw: jest.fn(async () => 1),
  $executeRaw: jest.fn(async () => undefined),
};

jest.mock('.prisma/documentos', () => ({
  PrismaClient: jest.fn(() => prismaInstance),
}));

describe('config/database', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    process.env.ENABLE_QUERY_LOGGING = 'false';
  });

  it('db singleton connects/disconnects and healthCheck', async () => {
    const { AppLogger } = await import('../../src/config/logger');
    const { db } = await import('../../src/config/database');
    await db.connect();
    await db.disconnect();
    await expect(db.healthCheck()).resolves.toBe(true);
    await db.refreshMaterializedView();
    expect(AppLogger.debug).toHaveBeenCalledWith(expect.stringContaining('Materialized view refreshed'));
  });

  it('refreshMaterializedView throws on error', async () => {
    prismaInstance.$executeRaw.mockRejectedValueOnce(new Error('boom'));
    const { db } = await import('../../src/config/database');
    await expect(db.refreshMaterializedView()).rejects.toThrow('boom');
  });

  it('sets up prisma event listeners and logs query/info/warn/error', async () => {
    process.env.ENABLE_QUERY_LOGGING = 'true';
    const { AppLogger } = await import('../../src/config/logger');
    await import('../../src/config/database');

    const queryCb = prismaInstance.$on.mock.calls.find((c: any[]) => c[0] === 'query')?.[1];
    const infoCb = prismaInstance.$on.mock.calls.find((c: any[]) => c[0] === 'info')?.[1];
    const warnCb = prismaInstance.$on.mock.calls.find((c: any[]) => c[0] === 'warn')?.[1];
    const errorCb = prismaInstance.$on.mock.calls.find((c: any[]) => c[0] === 'error')?.[1];

    expect(queryCb).toBeInstanceOf(Function);
    queryCb({ query: 'SELECT 1', params: '[]', duration: 3 });
    expect(AppLogger.debug).toHaveBeenCalledWith(expect.stringContaining('Query:'));

    infoCb({ message: 'hello' });
    warnCb({ message: 'warn' });
    errorCb({ message: 'err' });
    expect(AppLogger.info).toHaveBeenCalledWith(expect.stringContaining('Database Info'));
    expect(AppLogger.warn).toHaveBeenCalledWith(expect.stringContaining('Database Warning'));
    expect(AppLogger.error).toHaveBeenCalledWith(expect.stringContaining('Database Error'), expect.anything());
  });

  it('connect/disconnect error branches throw and healthCheck returns false', async () => {
    const { AppLogger } = await import('../../src/config/logger');
    prismaInstance.$connect.mockRejectedValueOnce(new Error('nope'));
    const { db } = await import('../../src/config/database');
    await expect(db.connect()).rejects.toThrow('nope');
    expect(AppLogger.error).toHaveBeenCalledWith(expect.stringContaining('Failed to connect'), expect.anything());

    prismaInstance.$disconnect.mockRejectedValueOnce(new Error('nope2'));
    await expect(db.disconnect()).rejects.toThrow('nope2');
    expect(AppLogger.error).toHaveBeenCalledWith(expect.stringContaining('Error disconnecting'), expect.anything());

    prismaInstance.$queryRaw.mockRejectedValueOnce(new Error('nope3'));
    await expect(db.healthCheck()).resolves.toBe(false);
  });

  it('exports prisma client from singleton', async () => {
    const mod = await import('../../src/config/database');
    expect(mod.prisma).toBe(prismaInstance);
  });
});


