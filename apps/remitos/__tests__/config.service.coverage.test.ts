/**
 * @jest-environment node
 */

process.env.REMITOS_DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
process.env.NODE_ENV = 'test';

const mockUpsert = jest.fn();

jest.mock('../src/config/database', () => ({
  db: {
    getClient: jest.fn().mockReturnValue({
      remitoSystemConfig: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        createMany: jest.fn(),
        upsert: jest.fn(),
      },
      $transaction: jest.fn((cb: (prisma: any) => Promise<void>) =>
        cb({ remitoSystemConfig: { upsert: mockUpsert } })
      ),
    }),
  },
}));

jest.mock('../src/config/logger', () => ({
  AppLogger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

import { ConfigService } from '../src/services/config.service';
import { db } from '../src/config/database';

const prisma = (db.getClient as jest.Mock)();

beforeEach(() => {
  jest.clearAllMocks();
  delete process.env.FLOWISE_ENABLED;
  delete process.env.FLOWISE_BASE_URL;
  delete process.env.FLOWISE_API_KEY;
  delete process.env.FLOWISE_FLOW_ID;
  delete process.env.FLOWISE_TIMEOUT;
});

// ============================================================================
// getFlowiseConfig
// ============================================================================
describe('ConfigService.getFlowiseConfig', () => {
  it('returns config from DB values', async () => {
    prisma.remitoSystemConfig.findMany.mockResolvedValue([
      { key: 'flowise.enabled', value: 'true' },
      { key: 'flowise.baseUrl', value: 'https://flowise.db.com' },
      { key: 'flowise.apiKey', value: 'db-key' },
      { key: 'flowise.flowId', value: 'db-flow' },
      { key: 'flowise.timeout', value: '45000' },
      { key: 'flowise.systemPrompt', value: 'DB prompt' },
    ]);

    const config = await ConfigService.getFlowiseConfig();

    expect(config.enabled).toBe(true);
    expect(config.baseUrl).toBe('https://flowise.db.com');
    expect(config.apiKey).toBe('db-key');
    expect(config.flowId).toBe('db-flow');
    expect(config.timeout).toBe(45000);
    expect(config.systemPrompt).toBe('DB prompt');
  });

  it('returns config from DB with enabled=false', async () => {
    prisma.remitoSystemConfig.findMany.mockResolvedValue([
      { key: 'flowise.enabled', value: 'false' },
    ]);

    const config = await ConfigService.getFlowiseConfig();

    expect(config.enabled).toBe(false);
  });

  it('falls back to env variables when DB has no values', async () => {
    prisma.remitoSystemConfig.findMany.mockResolvedValue([]);
    process.env.FLOWISE_ENABLED = 'true';
    process.env.FLOWISE_BASE_URL = 'https://flowise.env.com';
    process.env.FLOWISE_API_KEY = 'env-key';
    process.env.FLOWISE_FLOW_ID = 'env-flow';
    process.env.FLOWISE_TIMEOUT = '20000';

    const config = await ConfigService.getFlowiseConfig();

    expect(config.enabled).toBe(true);
    expect(config.baseUrl).toBe('https://flowise.env.com');
    expect(config.apiKey).toBe('env-key');
    expect(config.flowId).toBe('env-flow');
    expect(config.timeout).toBe(20000);
    expect(config.systemPrompt).toContain('Eres un experto');
  });

  it('defaults env fallback enabled to false when not set', async () => {
    prisma.remitoSystemConfig.findMany.mockResolvedValue([]);

    const config = await ConfigService.getFlowiseConfig();

    expect(config.enabled).toBe(false);
    expect(config.baseUrl).toBe('');
    expect(config.apiKey).toBe('');
    expect(config.flowId).toBe('');
    expect(config.timeout).toBe(60000);
  });

  it('falls back to env on DB error', async () => {
    prisma.remitoSystemConfig.findMany.mockRejectedValue(new Error('DB connection failed'));
    process.env.FLOWISE_ENABLED = 'true';
    process.env.FLOWISE_BASE_URL = 'https://fallback.com';
    process.env.FLOWISE_API_KEY = 'fallback-key';
    process.env.FLOWISE_FLOW_ID = 'fallback-flow';
    process.env.FLOWISE_TIMEOUT = '15000';

    const config = await ConfigService.getFlowiseConfig();

    expect(config.enabled).toBe(true);
    expect(config.baseUrl).toBe('https://fallback.com');
    expect(config.apiKey).toBe('fallback-key');
    expect(config.flowId).toBe('fallback-flow');
    expect(config.timeout).toBe(15000);
  });

  it('uses default timeout on DB error when env not set', async () => {
    prisma.remitoSystemConfig.findMany.mockRejectedValue(new Error('fail'));

    const config = await ConfigService.getFlowiseConfig();

    expect(config.enabled).toBe(false);
    expect(config.timeout).toBe(60000);
  });

  it('uses DB enabled value even when env differs', async () => {
    prisma.remitoSystemConfig.findMany.mockResolvedValue([
      { key: 'flowise.enabled', value: 'false' },
    ]);
    process.env.FLOWISE_ENABLED = 'true';

    const config = await ConfigService.getFlowiseConfig();

    expect(config.enabled).toBe(false);
  });

  it('uses env fallback for fields not present in DB', async () => {
    prisma.remitoSystemConfig.findMany.mockResolvedValue([
      { key: 'flowise.enabled', value: 'true' },
    ]);
    process.env.FLOWISE_BASE_URL = 'https://env-only.com';

    const config = await ConfigService.getFlowiseConfig();

    expect(config.enabled).toBe(true);
    expect(config.baseUrl).toBe('https://env-only.com');
  });
});

// ============================================================================
// updateFlowiseConfig
// ============================================================================
describe('ConfigService.updateFlowiseConfig', () => {
  it('updates all fields when all provided', async () => {
    await ConfigService.updateFlowiseConfig(
      {
        enabled: true,
        baseUrl: 'https://new.com',
        apiKey: 'new-key',
        flowId: 'new-flow',
        timeout: 50000,
        systemPrompt: 'new prompt',
      },
      1
    );

    expect(prisma.$transaction).toHaveBeenCalled();
    expect(mockUpsert).toHaveBeenCalledTimes(6);

    const keys = mockUpsert.mock.calls.map((c: any[]) => c[0].where.key);
    expect(keys).toContain('flowise.enabled');
    expect(keys).toContain('flowise.baseUrl');
    expect(keys).toContain('flowise.apiKey');
    expect(keys).toContain('flowise.flowId');
    expect(keys).toContain('flowise.timeout');
    expect(keys).toContain('flowise.systemPrompt');
  });

  it('updates only partial fields', async () => {
    await ConfigService.updateFlowiseConfig({ baseUrl: 'https://partial.com' }, 2);

    expect(mockUpsert).toHaveBeenCalledTimes(1);
    expect(mockUpsert.mock.calls[0][0].where.key).toBe('flowise.baseUrl');
    expect(mockUpsert.mock.calls[0][0].update.value).toBe('https://partial.com');
  });

  it('does not call upsert when no fields provided', async () => {
    await ConfigService.updateFlowiseConfig({}, 3);

    expect(prisma.$transaction).toHaveBeenCalled();
    expect(mockUpsert).not.toHaveBeenCalled();
  });

  it('converts enabled boolean to string', async () => {
    await ConfigService.updateFlowiseConfig({ enabled: false }, 4);

    expect(mockUpsert).toHaveBeenCalledTimes(1);
    expect(mockUpsert.mock.calls[0][0].create.value).toBe('false');
  });

  it('converts timeout number to string', async () => {
    await ConfigService.updateFlowiseConfig({ timeout: 30000 }, 5);

    expect(mockUpsert).toHaveBeenCalledTimes(1);
    expect(mockUpsert.mock.calls[0][0].create.value).toBe('30000');
  });

  it('sets updatedBy on upsert create and update', async () => {
    await ConfigService.updateFlowiseConfig({ flowId: 'xyz' }, 99);

    const call = mockUpsert.mock.calls[0][0];
    expect(call.update.updatedBy).toBe(99);
    expect(call.create.updatedBy).toBe(99);
  });
});

// ============================================================================
// initializeDefaults
// ============================================================================
describe('ConfigService.initializeDefaults', () => {
  it('creates defaults when no existing config', async () => {
    prisma.remitoSystemConfig.findFirst.mockResolvedValue(null);
    prisma.remitoSystemConfig.createMany.mockResolvedValue({ count: 6 });

    process.env.FLOWISE_ENABLED = 'true';
    process.env.FLOWISE_BASE_URL = 'https://init.com';
    process.env.FLOWISE_API_KEY = 'init-key';
    process.env.FLOWISE_FLOW_ID = 'init-flow';
    process.env.FLOWISE_TIMEOUT = '25000';

    await ConfigService.initializeDefaults();

    expect(prisma.remitoSystemConfig.createMany).toHaveBeenCalledTimes(1);
    const createData = prisma.remitoSystemConfig.createMany.mock.calls[0][0].data;
    expect(createData).toHaveLength(6);

    const enabledEntry = createData.find((d: any) => d.key === 'flowise.enabled');
    expect(enabledEntry.value).toBe('true');

    const baseUrlEntry = createData.find((d: any) => d.key === 'flowise.baseUrl');
    expect(baseUrlEntry.value).toBe('https://init.com');

    const timeoutEntry = createData.find((d: any) => d.key === 'flowise.timeout');
    expect(timeoutEntry.value).toBe('25000');
  });

  it('creates defaults with FLOWISE_ENABLED=false when env is not set', async () => {
    prisma.remitoSystemConfig.findFirst.mockResolvedValue(null);
    prisma.remitoSystemConfig.createMany.mockResolvedValue({ count: 6 });

    await ConfigService.initializeDefaults();

    const createData = prisma.remitoSystemConfig.createMany.mock.calls[0][0].data;
    const enabledEntry = createData.find((d: any) => d.key === 'flowise.enabled');
    expect(enabledEntry.value).toBe('false');
  });

  it('skips creation when config already exists', async () => {
    prisma.remitoSystemConfig.findFirst.mockResolvedValue({
      id: 1,
      key: 'flowise.enabled',
      value: 'true',
    });

    await ConfigService.initializeDefaults();

    expect(prisma.remitoSystemConfig.createMany).not.toHaveBeenCalled();
  });

  it('uses default timeout and empty strings when env vars are not set', async () => {
    prisma.remitoSystemConfig.findFirst.mockResolvedValue(null);
    prisma.remitoSystemConfig.createMany.mockResolvedValue({ count: 6 });

    await ConfigService.initializeDefaults();

    const createData = prisma.remitoSystemConfig.createMany.mock.calls[0][0].data;
    const baseUrlEntry = createData.find((d: any) => d.key === 'flowise.baseUrl');
    expect(baseUrlEntry.value).toBe('');

    const apiKeyEntry = createData.find((d: any) => d.key === 'flowise.apiKey');
    expect(apiKeyEntry.value).toBe('');

    const flowIdEntry = createData.find((d: any) => d.key === 'flowise.flowId');
    expect(flowIdEntry.value).toBe('');

    const timeoutEntry = createData.find((d: any) => d.key === 'flowise.timeout');
    expect(timeoutEntry.value).toBe('60000');
  });

  it('passes skipDuplicates option to createMany', async () => {
    prisma.remitoSystemConfig.findFirst.mockResolvedValue(null);
    prisma.remitoSystemConfig.createMany.mockResolvedValue({ count: 6 });

    await ConfigService.initializeDefaults();

    const createCall = prisma.remitoSystemConfig.createMany.mock.calls[0][0];
    expect(createCall.skipDuplicates).toBe(true);
  });
});
