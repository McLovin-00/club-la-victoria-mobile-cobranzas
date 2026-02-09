import { prismaMock, resetPrismaMock } from '../mocks/prisma.mock';

jest.mock('../../src/config/logger', () => ({
  AppLogger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

jest.mock('../../src/middlewares/error.middleware', () => ({
  createError: (message: string, _status: number, code: string) => {
    const e: any = new Error(message);
    e.code = code;
    return e;
  },
}));

jest.mock('../../src/config/database', () => ({
  db: { getClient: () => prismaMock },
}));

import { SystemConfigService } from '../../src/services/system-config.service';

describe('SystemConfigService', () => {
  beforeEach(() => {
    resetPrismaMock();
    jest.clearAllMocks();
    (prismaMock.$transaction as jest.Mock).mockImplementation(async (arg: any) => arg(prismaMock));
  });

  it('getFlowiseConfig maps flowise.* keys and falls back on error', async () => {
    prismaMock.systemConfig.findMany.mockResolvedValueOnce([
      { key: 'flowise.enabled', value: 'true' },
      { key: 'flowise.baseUrl', value: 'http://x' },
      { key: 'flowise.apiKey', value: 'k' },
      { key: 'flowise.flowId', value: 'f' },
      { key: 'flowise.timeout', value: '123' },
    ] as any);
    const cfg = await SystemConfigService.getFlowiseConfig();
    expect(cfg.enabled).toBe(true);
    expect(cfg.timeout).toBe(123);

    prismaMock.systemConfig.findMany.mockRejectedValueOnce(new Error('db'));
    const cfg2 = await SystemConfigService.getFlowiseConfig();
    expect(cfg2.enabled).toBe(false);
  });

  it('updateFlowiseConfig upserts keys and throws CONFIG_UPDATE_ERROR on failure', async () => {
    prismaMock.systemConfig.upsert.mockResolvedValue({} as any);
    await SystemConfigService.updateFlowiseConfig({ enabled: true, baseUrl: 'x', apiKey: 'k', flowId: 'f', timeout: 1 });
    expect(prismaMock.systemConfig.upsert).toHaveBeenCalled();

    prismaMock.$transaction.mockRejectedValueOnce(new Error('db'));
    await expect(SystemConfigService.updateFlowiseConfig({ enabled: true })).rejects.toMatchObject({ code: 'CONFIG_UPDATE_ERROR' });
  });

  it('getConfig/setConfig/deleteConfig handle success and errors', async () => {
    prismaMock.systemConfig.findUnique.mockResolvedValueOnce({ value: 'v' } as any);
    await expect(SystemConfigService.getConfig('k')).resolves.toBe('v');

    prismaMock.systemConfig.upsert.mockResolvedValueOnce({} as any);
    await expect(SystemConfigService.setConfig('k', 'v', true)).resolves.toBeUndefined();

    prismaMock.systemConfig.delete.mockResolvedValueOnce({} as any);
    await expect(SystemConfigService.deleteConfig('k')).resolves.toBeUndefined();
  });

  it('listConfigs maps hasValue/encrypted and returns [] on error', async () => {
    prismaMock.systemConfig.findMany.mockResolvedValueOnce([{ key: 'a', value: '1', encrypted: true, updatedAt: new Date() }] as any);
    const out = await SystemConfigService.listConfigs();
    expect(out[0].hasValue).toBe(true);

    prismaMock.systemConfig.findMany.mockRejectedValueOnce(new Error('db'));
    await expect(SystemConfigService.listConfigs()).resolves.toEqual([]);
  });

  it('initializeDefaults upserts and swallows errors', async () => {
    prismaMock.systemConfig.upsert.mockResolvedValue({} as any);
    await expect(SystemConfigService.initializeDefaults()).resolves.toBeUndefined();

    prismaMock.$transaction.mockRejectedValueOnce(new Error('db'));
    await expect(SystemConfigService.initializeDefaults()).resolves.toBeUndefined();
  });
});


