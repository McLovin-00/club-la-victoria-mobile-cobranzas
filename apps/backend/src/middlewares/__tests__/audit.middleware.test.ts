/**
 * Tests for audit.middleware.ts
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';

// Mock dependencies
jest.mock('../../config/logger', () => ({
  AppLogger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

jest.mock('../../config/prisma', () => ({
  prismaService: {
    getClient: () => ({
      auditLog: {
        // @ts-expect-error - jest.Mock infers never for mockResolvedValue in strict mode
        create: (jest.fn() as jest.Mock).mockResolvedValue({ id: 1 }),
      },
    }),
  },
}));

describe('audit.middleware', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('module exports', () => {
    it('importa el middleware sin errores', async () => {
      const module = await import('../audit.middleware');
      expect(module).toBeDefined();
    });

    it('exporta auditMiddleware', async () => {
      const module = await import('../audit.middleware');
      expect(module.auditMiddleware).toBeDefined();
      expect(typeof module.auditMiddleware).toBe('function');
    });
  });

  describe('auditMiddleware behavior', () => {
    it('es una función factory que retorna middleware', async () => {
      const { auditMiddleware } = await import('../audit.middleware');

      const middleware = auditMiddleware();
      expect(typeof middleware).toBe('function');
    });
  });
});

