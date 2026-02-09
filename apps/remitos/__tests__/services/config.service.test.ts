/**
 * Tests para ConfigService - Ejecuta código real
 * @jest-environment node
 */

const mockRemitoSystemConfig = {
  findMany: jest.fn(),
  upsert: jest.fn(),
};

const mockTransaction = jest.fn(async (fn: any) => fn({ remitoSystemConfig: mockRemitoSystemConfig }));

jest.mock('../../src/config/database', () => ({
  db: {
    getClient: () => ({ remitoSystemConfig: mockRemitoSystemConfig, $transaction: mockTransaction }),
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

import { ConfigService } from '../../src/services/config.service';

describe('ConfigService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset env variables
    delete process.env.FLOWISE_ENABLED;
    delete process.env.FLOWISE_BASE_URL;
    delete process.env.FLOWISE_API_KEY;
    delete process.env.FLOWISE_FLOW_ID;
    delete process.env.FLOWISE_TIMEOUT;
  });

  describe('getFlowiseConfig', () => {
    it('should return config from database', async () => {
      mockRemitoSystemConfig.findMany.mockResolvedValue([
        { key: 'flowise.enabled', value: 'true' },
        { key: 'flowise.baseUrl', value: 'http://flowise.local' },
        { key: 'flowise.apiKey', value: 'api-key-123' },
        { key: 'flowise.flowId', value: 'flow-id-456' },
        { key: 'flowise.timeout', value: '30000' },
      ]);

      const result = await ConfigService.getFlowiseConfig();

      expect(result.enabled).toBe(true);
      expect(result.baseUrl).toBe('http://flowise.local');
      expect(result.apiKey).toBe('api-key-123');
      expect(result.flowId).toBe('flow-id-456');
      expect(result.timeout).toBe(30000);
    });

    it('should fallback to env variables when DB is empty', async () => {
      process.env.FLOWISE_ENABLED = 'true';
      process.env.FLOWISE_BASE_URL = 'http://env.flowise.local';
      process.env.FLOWISE_API_KEY = 'env-api-key';
      process.env.FLOWISE_FLOW_ID = 'env-flow-id';
      process.env.FLOWISE_TIMEOUT = '45000';

      mockRemitoSystemConfig.findMany.mockResolvedValue([]);

      const result = await ConfigService.getFlowiseConfig();

      expect(result.enabled).toBe(true);
      expect(result.baseUrl).toBe('http://env.flowise.local');
      expect(result.apiKey).toBe('env-api-key');
      expect(result.flowId).toBe('env-flow-id');
      expect(result.timeout).toBe(45000);
    });

    it('should return default values when DB fails', async () => {
      mockRemitoSystemConfig.findMany.mockRejectedValue(new Error('DB error'));

      const result = await ConfigService.getFlowiseConfig();

      expect(result.enabled).toBe(false);
      expect(result.baseUrl).toBe('');
    });

    it('should include system prompt', async () => {
      mockRemitoSystemConfig.findMany.mockResolvedValue([]);

      const result = await ConfigService.getFlowiseConfig();

      expect(result.systemPrompt).toContain('experto en lectura de remitos');
    });

    it('should use custom system prompt from DB', async () => {
      mockRemitoSystemConfig.findMany.mockResolvedValue([
        { key: 'flowise.systemPrompt', value: 'Custom prompt here' },
      ]);

      const result = await ConfigService.getFlowiseConfig();

      expect(result.systemPrompt).toBe('Custom prompt here');
    });
  });

  describe('updateFlowiseConfig', () => {
    it('should update flowise config in DB', async () => {
      mockRemitoSystemConfig.upsert.mockResolvedValue({});

      await ConfigService.updateFlowiseConfig({
        enabled: true,
        baseUrl: 'http://new.url',
        apiKey: 'new-key',
        flowId: 'new-flow',
        timeout: 60000,
        systemPrompt: 'New prompt',
      }, 1);

      expect(mockRemitoSystemConfig.upsert).toHaveBeenCalled();
    });

    it('should handle update errors gracefully', async () => {
      mockRemitoSystemConfig.upsert.mockRejectedValue(new Error('DB error'));

      await expect(
        ConfigService.updateFlowiseConfig({
          enabled: true,
          baseUrl: '',
          apiKey: '',
          flowId: '',
          timeout: 0,
          systemPrompt: '',
        }, 1)
      ).rejects.toThrow();
    });
  });
});




