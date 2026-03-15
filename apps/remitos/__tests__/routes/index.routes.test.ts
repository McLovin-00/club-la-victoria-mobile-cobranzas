/**
 * Tests para routes/index.ts - router principal y health check
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import express, { Express } from 'express';
import request from 'supertest';

jest.mock('../../src/config/logger', () => ({
  AppLogger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

jest.mock('../../src/middlewares/auth.middleware', () => ({
  authenticate: jest.fn((_req: any, _res: any, next: any) => next()),
  authorize: jest.fn(() => (_req: any, _res: any, next: any) => next()),
  ROLES_UPLOAD: ['ADMIN'],
  ROLES_APPROVE: ['ADMIN'],
  ROLES_VIEW_ALL: ['ADMIN'],
  ROLES_CONFIG: ['ADMIN'],
}));

jest.mock('../../src/middlewares/validation.middleware', () => ({
  validateBody: jest.fn(() => (_req: any, _res: any, next: any) => next()),
  validateQuery: jest.fn(() => (_req: any, _res: any, next: any) => next()),
}));

// Mock controllers
jest.mock('../../src/controllers/remitos.controller', () => ({
  RemitosController: {
    create: jest.fn((_req: any, res: any) => res.status(201).json({ success: true })),
    list: jest.fn((_req: any, res: any) => res.json({ success: true, data: [] })),
    getById: jest.fn((_req: any, res: any) => res.json({ success: true })),
    update: jest.fn((_req: any, res: any) => res.json({ success: true })),
    approve: jest.fn((_req: any, res: any) => res.json({ success: true })),
    reject: jest.fn((_req: any, res: any) => res.json({ success: true })),
    stats: jest.fn((_req: any, res: any) => res.json({ success: true })),
    getImage: jest.fn((_req: any, res: any) => res.json({ success: true })),
    reprocess: jest.fn((_req: any, res: any) => res.json({ success: true })),
    exportExcel: jest.fn((_req: any, res: any) => res.json({ success: true })),
    suggestions: jest.fn((_req: any, res: any) => res.json({ success: true })),
  },
}));

jest.mock('../../src/controllers/config.controller', () => ({
  ConfigController: {
    getFlowiseConfig: jest.fn((_req: any, res: any) => res.json({ success: true })),
    updateFlowiseConfig: jest.fn((_req: any, res: any) => res.json({ success: true })),
    testFlowise: jest.fn((_req: any, res: any) => res.json({ success: true })),
  },
}));

describe('routes/index.ts', () => {
  let app: Express;

  beforeEach(async () => {
    jest.clearAllMocks();
    app = express();
    app.use(express.json());
    const routes = (await import('../../src/routes')).default;
    app.use('/', routes);
  });

  describe('GET /health', () => {
    it('retorna status ok', async () => {
      const response = await request(app).get('/health');
      
      expect(response.status).toBe(200);
      expect(response.body.status).toBe('ok');
      expect(response.body.service).toBe('remitos');
      expect(response.body.timestamp).toBeDefined();
    });

    it('incluye versión de la aplicación', async () => {
      const response = await request(app).get('/health');
      
      expect(response.body.version).toBeDefined();
    });
  });

  describe('API routes', () => {
    it('GET /api/remitos responde correctamente', async () => {
      const response = await request(app).get('/api/remitos');
      expect(response.status).toBe(200);
    });

    it('GET /api/remitos/stats responde correctamente', async () => {
      const response = await request(app).get('/api/remitos/stats');
      expect(response.status).toBe(200);
    });

    it('GET /api/remitos/config/flowise responde correctamente', async () => {
      const response = await request(app).get('/api/remitos/config/flowise');
      expect(response.status).toBe(200);
    });
  });
});

