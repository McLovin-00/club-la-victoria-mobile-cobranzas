/**
 * Tests for sync-resolver-config.ts
 */

jest.mock('../../config/logger', () => ({
  AppLogger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

jest.mock('../../config/database', () => ({
  prisma: {
    resolverConfig: {
      upsert: jest.fn(),
    },
  },
}));

import { syncResolverConfigFromEnv } from '../../config/sync-resolver-config';
import { prisma } from '../../config/database';
import { AppLogger } from '../../config/logger';

describe('syncResolverConfigFromEnv', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('should do nothing when no env vars are set', async () => {
    delete process.env.HELPDESK_TELEGRAM_GROUP_TECHNICAL_ID;
    delete process.env.HELPDESK_TELEGRAM_GROUP_OPERATIONAL_ID;

    await syncResolverConfigFromEnv();

    expect(prisma.resolverConfig.upsert).not.toHaveBeenCalled();
  });

  it('should sync TECHNICAL config when env var is set', async () => {
    process.env.HELPDESK_TELEGRAM_GROUP_TECHNICAL_ID = '-1001234567890';
    delete process.env.HELPDESK_TELEGRAM_GROUP_OPERATIONAL_ID;

    await syncResolverConfigFromEnv();

    expect(prisma.resolverConfig.upsert).toHaveBeenCalledWith({
      where: { category: 'TECHNICAL' },
      create: expect.objectContaining({
        category: 'TECHNICAL',
        telegramGroupId: '-1001234567890',
        isActive: true,
      }),
      update: expect.objectContaining({
        telegramGroupId: '-1001234567890',
      }),
    });
    expect(AppLogger.info).toHaveBeenCalled();
  });

  it('should sync OPERATIONAL config when env var is set', async () => {
    delete process.env.HELPDESK_TELEGRAM_GROUP_TECHNICAL_ID;
    process.env.HELPDESK_TELEGRAM_GROUP_OPERATIONAL_ID = '-1009876543210';

    await syncResolverConfigFromEnv();

    expect(prisma.resolverConfig.upsert).toHaveBeenCalledWith({
      where: { category: 'OPERATIONAL' },
      create: expect.objectContaining({
        category: 'OPERATIONAL',
        telegramGroupId: '-1009876543210',
        isActive: true,
      }),
      update: expect.objectContaining({
        telegramGroupId: '-1009876543210',
      }),
    });
    expect(AppLogger.info).toHaveBeenCalled();
  });

  it('should sync both configs when both env vars are set', async () => {
    process.env.HELPDESK_TELEGRAM_GROUP_TECHNICAL_ID = '-1001111111111';
    process.env.HELPDESK_TELEGRAM_GROUP_OPERATIONAL_ID = '-1002222222222';

    await syncResolverConfigFromEnv();

    expect(prisma.resolverConfig.upsert).toHaveBeenCalledTimes(2);
  });

  it('should handle errors gracefully', async () => {
    process.env.HELPDESK_TELEGRAM_GROUP_TECHNICAL_ID = '-1001234567890';
    (prisma.resolverConfig.upsert as jest.Mock).mockRejectedValue(new Error('DB error'));

    await syncResolverConfigFromEnv();

    expect(AppLogger.error).toHaveBeenCalled();
  });

  it('should trim whitespace from env vars', async () => {
    process.env.HELPDESK_TELEGRAM_GROUP_TECHNICAL_ID = '  -1001234567890  ';

    await syncResolverConfigFromEnv();

    expect(prisma.resolverConfig.upsert).toHaveBeenCalledWith({
      where: { category: 'TECHNICAL' },
      create: expect.objectContaining({
        telegramGroupId: '-1001234567890',
      }),
      update: expect.objectContaining({
        telegramGroupId: '-1001234567890',
      }),
    });
  });

  it('should skip empty string env vars', async () => {
    process.env.HELPDESK_TELEGRAM_GROUP_TECHNICAL_ID = '   ';
    delete process.env.HELPDESK_TELEGRAM_GROUP_OPERATIONAL_ID;

    await syncResolverConfigFromEnv();

    expect(prisma.resolverConfig.upsert).not.toHaveBeenCalled();
  });
});
