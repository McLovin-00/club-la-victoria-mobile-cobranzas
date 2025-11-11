const { SystemConfigService } = require('../src/services/system-config.service');

jest.mock('../src/config/database', () => ({
  db: {
    getClient: () => ({
      systemConfig: {
        findUnique: jest.fn().mockResolvedValue({ key: 'k', value: 'v' }),
        upsert: jest.fn().mockResolvedValue({}),
        findMany: jest.fn().mockResolvedValue([{ key: 'a', value: '1', encrypted: false, updatedAt: new Date() }]),
      },
      $transaction: (fn: any) => fn(({} as any)),
    }),
  },
}));

describe('SystemConfigService', () => {
  it('getConfig returns value', async () => {
    const v = await SystemConfigService.getConfig('k');
    expect(v).toBe('v');
  });

  it('setConfig ok', async () => {
    await SystemConfigService.setConfig('k', 'v');
    expect(true).toBe(true);
  });

  it('listConfigs returns array', async () => {
    const arr = await SystemConfigService.listConfigs();
    expect(Array.isArray(arr)).toBe(true);
  });
});
