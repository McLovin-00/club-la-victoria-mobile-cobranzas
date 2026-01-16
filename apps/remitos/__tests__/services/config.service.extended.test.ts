/**
 * Tests extendidos para config.service.ts - cubrir líneas faltantes (initializeDefaults)
 */

import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';

jest.mock('../../src/config/logger', () => ({
  AppLogger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

const mockPrismaClient: any = {
  remitoSystemConfig: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    createMany: jest.fn(),
    upsert: jest.fn(),
  },
  $transaction: jest.fn(),
};

jest.mock('../../src/config/database', () => ({
  db: {
    getClient: () => mockPrismaClient,
  },
}));

describe('ConfigService extended', () => {
  let ConfigService: any;
  const originalEnv = process.env;

  beforeEach(async () => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
    const module = await import('../../src/services/config.service');
    ConfigService = module.ConfigService;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('getFlowiseConfig', () => {
    it('retorna configuración desde DB', async () => {
      mockPrismaClient.remitoSystemConfig.findMany.mockResolvedValue([
        { key: 'flowise.enabled', value: 'true' },
        { key: 'flowise.baseUrl', value: 'http://flowise.test' },
        { key: 'flowise.apiKey', value: 'secret' },
        { key: 'flowise.flowId', value: 'flow123' },
        { key: 'flowise.timeout', value: '30000' },
        { key: 'flowise.systemPrompt', value: 'Custom prompt' },
      ]);

      const config = await ConfigService.getFlowiseConfig();

      expect(config.enabled).toBe(true);
      expect(config.baseUrl).toBe('http://flowise.test');
      expect(config.apiKey).toBe('secret');
      expect(config.flowId).toBe('flow123');
      expect(config.timeout).toBe(30000);
      expect(config.systemPrompt).toBe('Custom prompt');
    });

    it('usa variables de entorno como fallback', async () => {
      process.env.FLOWISE_ENABLED = 'true';
      process.env.FLOWISE_BASE_URL = 'http://env.test';
      process.env.FLOWISE_API_KEY = 'envkey';
      process.env.FLOWISE_FLOW_ID = 'envflow';
      process.env.FLOWISE_TIMEOUT = '45000';

      mockPrismaClient.remitoSystemConfig.findMany.mockResolvedValue([]);

      const config = await ConfigService.getFlowiseConfig();

      expect(config.enabled).toBe(true);
      expect(config.baseUrl).toBe('http://env.test');
      expect(config.apiKey).toBe('envkey');
      expect(config.flowId).toBe('envflow');
      expect(config.timeout).toBe(45000);
    });

    it('retorna fallback completo si hay error en DB', async () => {
      process.env.FLOWISE_ENABLED = 'true';
      process.env.FLOWISE_BASE_URL = 'http://fallback.test';

      mockPrismaClient.remitoSystemConfig.findMany.mockRejectedValue(new Error('DB error'));

      const config = await ConfigService.getFlowiseConfig();

      expect(config.enabled).toBe(true);
      expect(config.baseUrl).toBe('http://fallback.test');
    });
  });

  describe('updateFlowiseConfig', () => {
    it('actualiza configuraciones en transacción', async () => {
      const transactionCallback = jest.fn();
      mockPrismaClient.$transaction.mockImplementation(async (cb: any) => {
        await cb({
          remitoSystemConfig: {
            upsert: transactionCallback,
          },
        });
      });

      await ConfigService.updateFlowiseConfig(
        {
          enabled: true,
          baseUrl: 'http://new.test',
          apiKey: 'newkey',
          flowId: 'newflow',
          timeout: 60000,
          systemPrompt: 'New prompt',
        },
        1
      );

      expect(transactionCallback).toHaveBeenCalledTimes(6);
    });

    it('solo actualiza campos proporcionados', async () => {
      const transactionCallback = jest.fn();
      mockPrismaClient.$transaction.mockImplementation(async (cb: any) => {
        await cb({
          remitoSystemConfig: {
            upsert: transactionCallback,
          },
        });
      });

      await ConfigService.updateFlowiseConfig(
        { enabled: false },
        1
      );

      expect(transactionCallback).toHaveBeenCalledTimes(1);
    });
  });

  describe('initializeDefaults', () => {
    it('crea configuraciones si no existen', async () => {
      process.env.FLOWISE_ENABLED = 'true';
      process.env.FLOWISE_BASE_URL = 'http://init.test';
      process.env.FLOWISE_API_KEY = 'initkey';
      process.env.FLOWISE_FLOW_ID = 'initflow';
      process.env.FLOWISE_TIMEOUT = '30000';

      mockPrismaClient.remitoSystemConfig.findFirst.mockResolvedValue(null);
      mockPrismaClient.remitoSystemConfig.createMany.mockResolvedValue({ count: 6 });

      await ConfigService.initializeDefaults();

      expect(mockPrismaClient.remitoSystemConfig.createMany).toHaveBeenCalledWith({
        data: expect.arrayContaining([
          expect.objectContaining({ key: 'flowise.enabled', value: 'true' }),
          expect.objectContaining({ key: 'flowise.baseUrl', value: 'http://init.test' }),
        ]),
        skipDuplicates: true,
      });
    });

    it('no crea si ya existen configuraciones', async () => {
      mockPrismaClient.remitoSystemConfig.findFirst.mockResolvedValue({
        key: 'flowise.enabled',
        value: 'true',
      });

      await ConfigService.initializeDefaults();

      expect(mockPrismaClient.remitoSystemConfig.createMany).not.toHaveBeenCalled();
    });

    it('usa valores por defecto si no hay env vars', async () => {
      delete process.env.FLOWISE_ENABLED;
      delete process.env.FLOWISE_BASE_URL;

      mockPrismaClient.remitoSystemConfig.findFirst.mockResolvedValue(null);
      mockPrismaClient.remitoSystemConfig.createMany.mockResolvedValue({ count: 6 });

      await ConfigService.initializeDefaults();

      expect(mockPrismaClient.remitoSystemConfig.createMany).toHaveBeenCalledWith({
        data: expect.arrayContaining([
          expect.objectContaining({ key: 'flowise.enabled', value: 'false' }),
          expect.objectContaining({ key: 'flowise.baseUrl', value: '' }),
        ]),
        skipDuplicates: true,
      });
    });
  });
});

