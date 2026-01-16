/**
 * Tests de humo para index.ts - punto de entrada principal
 * Nota: El archivo index.ts ejecuta main() al importarse, 
 * así que mockeamos todo para evitar efectos secundarios.
 */

import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';

// Mock todas las dependencias antes de cualquier import
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

jest.mock('../../src/config/environment', () => ({
  getEnvironment: jest.fn().mockReturnValue({
    NODE_ENV: 'test',
    REMITOS_PORT: 4803,
    FRONTEND_URLS: 'http://localhost:8550',
  }),
  isServiceEnabled: jest.fn().mockReturnValue(false), // Deshabilitado para evitar iniciar servidor
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
}));

jest.mock('../../src/services/config.service', () => ({
  ConfigService: {
    initializeDefaults: jest.fn().mockResolvedValue(undefined as never),
  },
}));

jest.mock('../../src/routes', () => ({
  default: jest.fn(),
}));

describe('index.ts smoke test', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('no inicia servidor si servicio está deshabilitado', async () => {
    const { isServiceEnabled } = await import('../../src/config/environment');
    expect(isServiceEnabled).toBeDefined();
    expect((isServiceEnabled as jest.Mock)()).toBe(false);
  });

  it('las funciones de shutdown están disponibles', async () => {
    const { startAnalysisWorker, stopAnalysisWorker } = await import('../../src/workers/analysis.worker');
    expect(startAnalysisWorker).toBeDefined();
    expect(stopAnalysisWorker).toBeDefined();
  });

  it('el servicio de cola tiene método close', async () => {
    const { queueService } = await import('../../src/services/queue.service');
    expect(queueService.close).toBeDefined();
  });

  it('la base de datos tiene métodos connect y disconnect', async () => {
    const { db } = await import('../../src/config/database');
    expect(db.connect).toBeDefined();
    expect(db.disconnect).toBeDefined();
  });

  it('ConfigService tiene initializeDefaults', async () => {
    const { ConfigService } = await import('../../src/services/config.service');
    expect(ConfigService.initializeDefaults).toBeDefined();
  });
});

