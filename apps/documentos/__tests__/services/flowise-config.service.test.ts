/**
 * Tests unitarios para FlowiseConfigController y SystemConfigService
 */
import { prismaMock, resetPrismaMock } from '../mocks/prisma.mock';

jest.mock('../../src/config/database', () => ({
  prisma: prismaMock,
  db: { getClient: () => prismaMock },
}));

jest.mock('../../src/config/logger', () => ({
  AppLogger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

import { SystemConfigService } from '../../src/services/system-config.service';

describe('SystemConfigService', () => {
  beforeEach(() => {
    resetPrismaMock();
    jest.clearAllMocks();

    // resetPrismaMock resetea también $transaction, lo volvemos a setear para que ejecute el callback.
    prismaMock.$transaction.mockImplementation((fn: any) => fn(prismaMock));
  });

  describe('getFlowiseConfig', () => {
    it('should return flowise config from database', async () => {
      prismaMock.systemConfig.findMany.mockResolvedValue([
        { key: 'flowise.enabled', value: 'true' },
        { key: 'flowise.baseUrl', value: 'http://flowise:3000' },
        { key: 'flowise.apiKey', value: 'secret' },
        { key: 'flowise.flowId', value: 'test-flow-id' },
        { key: 'flowise.timeout', value: '30000' },
      ]);

      const result = await SystemConfigService.getFlowiseConfig();

      expect(result).toBeDefined();
      expect(result.enabled).toBe(true);
      expect(result.baseUrl).toBe('http://flowise:3000');
    });

    it('should return default config if not found', async () => {
      prismaMock.systemConfig.findMany.mockResolvedValue([]);

      const result = await SystemConfigService.getFlowiseConfig();

      expect(result).toBeDefined();
      expect(result.enabled).toBe(false);
    });
  });

  describe('updateFlowiseConfig', () => {
    it('should update flowise config', async () => {
      prismaMock.systemConfig.upsert.mockResolvedValue({ key: 'flowise.enabled', value: 'true' });

      const _result = await SystemConfigService.updateFlowiseConfig({
        enabled: true,
        baseUrl: 'http://new-flowise:3000',
        flowId: 'new-flow-id',
        timeout: 60000,
      });

      expect(prismaMock.$transaction).toHaveBeenCalled();
      expect(prismaMock.systemConfig.upsert).toHaveBeenCalled();
    });
  });

  describe('getConfig', () => {
    it('should return config by key', async () => {
      const mockConfig = {
        id: 1,
        key: 'test-key',
        value: 'test-value',
      };

      prismaMock.systemConfig.findUnique.mockResolvedValue(mockConfig);

      const result = await SystemConfigService.getConfig('test-key');

      expect(result).toBe('test-value');
    });

    it('should return null if config not found', async () => {
      prismaMock.systemConfig.findUnique.mockResolvedValue(null);

      const result = await SystemConfigService.getConfig('non-existent-key');

      expect(result).toBeNull();
    });
  });

  describe('setConfig', () => {
    it('should set config value', async () => {
      prismaMock.systemConfig.upsert.mockResolvedValue({
        id: 1,
        key: 'new-key',
        value: 'new-value',
      });

      await SystemConfigService.setConfig('new-key', 'new-value');

      expect(prismaMock.systemConfig.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { key: 'new-key' },
          update: expect.objectContaining({ value: 'new-value', encrypted: false }),
          create: expect.objectContaining({ key: 'new-key', value: 'new-value', encrypted: false }),
        })
      );
    });
  });
});



