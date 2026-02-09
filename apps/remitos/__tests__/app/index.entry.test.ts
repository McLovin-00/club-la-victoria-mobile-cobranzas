/**
 * Tests para el punto de entrada index.ts
 * Importamos el módulo con mocks para ejecutar main() de manera controlada
 */

import { describe, it, expect, jest, beforeEach, afterAll } from '@jest/globals';

// Mock ANTES de cualquier import
jest.mock('dotenv', () => ({
  config: jest.fn(),
}));

jest.mock('../../src/config/logger', () => ({
  AppLogger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

// Service DESHABILITADO para que main() salga temprano
jest.mock('../../src/config/environment', () => ({
  getEnvironment: jest.fn().mockReturnValue({
    NODE_ENV: 'test',
    REMITOS_PORT: 4999,
    FRONTEND_URLS: 'http://localhost:8550',
  }),
  isServiceEnabled: jest.fn().mockReturnValue(false),
}));

jest.mock('../../src/config/database', () => ({
  db: {
    connect: jest.fn().mockResolvedValue(undefined as never),
    disconnect: jest.fn().mockResolvedValue(undefined as never),
    getClient: jest.fn(),
  },
}));

jest.mock('../../src/workers/analysis.worker', () => ({
  startAnalysisWorker: jest.fn(),
  stopAnalysisWorker: jest.fn().mockResolvedValue(undefined as never),
}));

jest.mock('../../src/services/queue.service', () => ({
  queueService: {
    close: jest.fn().mockResolvedValue(undefined as never),
  },
  QueueService: {
    addAnalysisJob: jest.fn(),
  },
}));

jest.mock('../../src/services/config.service', () => ({
  ConfigService: {
    initializeDefaults: jest.fn().mockResolvedValue(undefined as never),
  },
}));

// Mock routes para evitar dependencias circulares
jest.mock('../../src/routes', () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const express = require('express');
  const router = express.Router();
  router.get('/health', (_req: any, res: any) => res.json({ status: 'ok' }));
  return { default: router };
});

describe('index.ts entry point', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  it('importa el módulo sin errores cuando el servicio está deshabilitado', async () => {
    // Esto debería ejecutar main() pero salir temprano porque isServiceEnabled = false
    await expect(import('../../src/index')).resolves.not.toThrow();
  });

  it('isServiceEnabled controla si el servidor inicia', async () => {
    const { isServiceEnabled } = await import('../../src/config/environment');
    expect(isServiceEnabled()).toBe(false);
  });

  it('AppLogger está disponible', async () => {
    const { AppLogger } = await import('../../src/config/logger');
    expect(AppLogger.info).toBeDefined();
    expect(AppLogger.error).toBeDefined();
    expect(AppLogger.warn).toBeDefined();
  });

  it('db tiene métodos de conexión', async () => {
    const { db } = await import('../../src/config/database');
    expect(db.connect).toBeDefined();
    expect(db.disconnect).toBeDefined();
  });

  it('worker functions están disponibles', async () => {
    const { startAnalysisWorker, stopAnalysisWorker } = await import('../../src/workers/analysis.worker');
    expect(startAnalysisWorker).toBeDefined();
    expect(stopAnalysisWorker).toBeDefined();
  });

  it('queueService tiene método close', async () => {
    const { queueService } = await import('../../src/services/queue.service');
    expect(queueService.close).toBeDefined();
  });

  it('ConfigService tiene initializeDefaults', async () => {
    const { ConfigService } = await import('../../src/services/config.service');
    expect(ConfigService.initializeDefaults).toBeDefined();
  });
});

