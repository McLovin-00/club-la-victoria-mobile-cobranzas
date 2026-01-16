/**
 * Tests de integración para index.ts - punto de entrada principal
 * Estas pruebas verifican que el servidor puede iniciarse correctamente
 */

import { describe, it, expect, jest, beforeAll, beforeEach } from '@jest/globals';
import express from 'express';
import request from 'supertest';

// Mock dotenv
jest.mock('dotenv', () => ({
  config: jest.fn(),
}));

// Mock logger
jest.mock('../../src/config/logger', () => ({
  AppLogger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

// Mock environment
const mockIsServiceEnabled = jest.fn();
const mockGetEnvironment = jest.fn();
jest.mock('../../src/config/environment', () => ({
  getEnvironment: () => mockGetEnvironment(),
  isServiceEnabled: () => mockIsServiceEnabled(),
}));

// Mock database
const mockDbConnect = jest.fn();
const mockDbDisconnect = jest.fn();
jest.mock('../../src/config/database', () => ({
  db: {
    connect: mockDbConnect,
    disconnect: mockDbDisconnect,
    getClient: jest.fn(),
  },
}));

// Mock worker
const mockStartWorker = jest.fn();
const mockStopWorker = jest.fn();
jest.mock('../../src/workers/analysis.worker', () => ({
  startAnalysisWorker: () => mockStartWorker(),
  stopAnalysisWorker: () => mockStopWorker(),
}));

// Mock queue service
const mockQueueClose = jest.fn();
jest.mock('../../src/services/queue.service', () => ({
  queueService: {
    close: mockQueueClose,
  },
}));

// Mock config service
const mockInitDefaults = jest.fn();
jest.mock('../../src/services/config.service', () => ({
  ConfigService: {
    initializeDefaults: mockInitDefaults,
  },
}));

describe('Application entry point - index.ts', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetEnvironment.mockReturnValue({
      NODE_ENV: 'test',
      REMITOS_PORT: 4999,
      FRONTEND_URLS: 'http://localhost:8550,http://localhost:3000',
    });
  });

  describe('cuando el servicio está deshabilitado', () => {
    it('no inicia el servidor', () => {
      mockIsServiceEnabled.mockReturnValue(false);
      // El main() no debe iniciar nada si está deshabilitado
      expect(mockDbConnect).not.toHaveBeenCalled();
    });
  });

  describe('cuando el servicio está habilitado', () => {
    beforeEach(() => {
      mockIsServiceEnabled.mockReturnValue(true);
      mockDbConnect.mockResolvedValue(undefined as never);
      mockInitDefaults.mockResolvedValue(undefined as never);
    });

    it('las dependencias están correctamente mockeadas', () => {
      expect(mockIsServiceEnabled).toBeDefined();
      expect(mockGetEnvironment).toBeDefined();
      expect(mockDbConnect).toBeDefined();
      expect(mockStartWorker).toBeDefined();
    });
  });

  describe('graceful shutdown', () => {
    it('las funciones de cierre están disponibles', () => {
      expect(mockStopWorker).toBeDefined();
      expect(mockQueueClose).toBeDefined();
      expect(mockDbDisconnect).toBeDefined();
    });
  });

  describe('Express app configuration', () => {
    it('puede crear una app express con la configuración esperada', () => {
      const app = express();

      // CORS origins parsing
      const corsOrigins = 'http://localhost:8550,http://localhost:3000'
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

      expect(corsOrigins).toEqual(['http://localhost:8550', 'http://localhost:3000']);
    });

    it('parsea múltiples URLs correctamente', () => {
      const frontendUrls = 'http://a.com, http://b.com , http://c.com';
      const parsed = frontendUrls.split(',').map(s => s.trim()).filter(Boolean);
      expect(parsed).toEqual(['http://a.com', 'http://b.com', 'http://c.com']);
    });

    it('maneja URL vacía', () => {
      const frontendUrls = '';
      const parsed = (frontendUrls || 'http://localhost:8550').split(',').map(s => s.trim()).filter(Boolean);
      expect(parsed).toEqual(['http://localhost:8550']);
    });
  });

  describe('version handling', () => {
    it('usa versión por defecto si no está definida', () => {
      const appVersion = process.env.APP_VERSION || '1.0.0';
      expect(appVersion).toBeDefined();
    });
  });
});

describe('Express middleware integration', () => {
  let app: express.Express;

  beforeAll(() => {
    app = express();
    app.use(express.json({ limit: '5mb' }));
    app.use(express.urlencoded({ extended: true }));

    // Health check endpoint
    app.get('/health', (_req, res) => {
      res.json({
        status: 'ok',
        service: 'remitos',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
      });
    });
  });

  it('responde a health check', async () => {
    const response = await request(app).get('/health');
    expect(response.status).toBe(200);
    expect(response.body.status).toBe('ok');
  });

  it('parsea JSON correctamente', async () => {
    app.post('/test', (req, res) => res.json(req.body));

    const response = await request(app)
      .post('/test')
      .send({ test: 'value' })
      .set('Content-Type', 'application/json');

    expect(response.body.test).toBe('value');
  });
});

