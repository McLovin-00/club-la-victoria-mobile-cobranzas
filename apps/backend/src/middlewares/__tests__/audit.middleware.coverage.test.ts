/**
 * Tests de cobertura para audit.middleware.ts
 * @jest-environment node
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { createMockRes, createNext } from '../../__tests__/helpers/testUtils';

const mockAppLogger = {
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

jest.mock('../../config/logger', () => ({
  AppLogger: mockAppLogger,
}));

describe('audit.middleware - Coverage Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('auditMiddleware', () => {
    it('debe ser una función factory que retorna middleware', async () => {
      const { auditMiddleware } = await import('../audit.middleware');
      
      expect(typeof auditMiddleware).toBe('function');
      const middleware = auditMiddleware();
      expect(typeof middleware).toBe('function');
    });

    it('debe agregar startTime a la request', async () => {
      const { auditMiddleware } = await import('../audit.middleware');
      const req = {
        method: 'GET',
        path: '/test',
        get: jest.fn((name: string) => {
          if (name === 'User-Agent') return 'Mozilla/5.0';
          return undefined;
        }),
        headers: {},
      } as any;
      const res = createMockRes();
      const next = createNext();
      
      const middleware = auditMiddleware();
      await middleware(req, res, next);
      
      expect(req.startTime).toBeDefined();
      expect(typeof req.startTime).toBe('number');
      expect(next).toHaveBeenCalled();
    });

    it('debe capturar IP de x-forwarded-for', async () => {
      const { auditMiddleware } = await import('../audit.middleware');
      const req = {
        method: 'POST',
        path: '/api/users',
        headers: { 'x-forwarded-for': '192.168.1.1' },
        get: jest.fn(() => 'UA'),
      } as any;
      const res = createMockRes();
      const next = createNext();
      
      const middleware = auditMiddleware();
      await middleware(req, res, next);
      
      expect(mockAppLogger.debug).toHaveBeenCalledWith(
        'Request audit',
        expect.objectContaining({ ip: '192.168.1.1' })
      );
    });

    it('debe capturar IP de x-real-ip', async () => {
      const { auditMiddleware } = await import('../audit.middleware');
      const req = {
        method: 'GET',
        path: '/api/test',
        headers: { 'x-real-ip': '10.0.0.5' },
        get: jest.fn(() => 'UA'),
      } as any;
      const res = createMockRes();
      const next = createNext();
      
      const middleware = auditMiddleware();
      await middleware(req, res, next);
      
      expect(mockAppLogger.debug).toHaveBeenCalledWith(
        'Request audit',
        expect.objectContaining({ ip: '10.0.0.5' })
      );
    });

    it('debe capturar IP de req.ip', async () => {
      const { auditMiddleware } = await import('../audit.middleware');
      const req = {
        method: 'GET',
        path: '/api/test2',
        ip: '203.0.113.10',
        headers: {},
        get: jest.fn(() => 'UA'),
      } as any;
      const res = createMockRes();
      const next = createNext();
      
      const middleware = auditMiddleware();
      await middleware(req, res, next);
      
      expect(mockAppLogger.debug).toHaveBeenCalledWith(
        'Request audit',
        expect.objectContaining({ ip: '203.0.113.10' })
      );
    });

    it('debe usar "unknown" si no hay IP', async () => {
      const { auditMiddleware } = await import('../audit.middleware');
      const req = {
        method: 'GET',
        path: '/api/unknown',
        headers: {},
        get: jest.fn(() => 'UA'),
      } as any;
      const res = createMockRes();
      const next = createNext();
      
      const middleware = auditMiddleware();
      await middleware(req, res, next);
      
      expect(mockAppLogger.debug).toHaveBeenCalledWith(
        'Request audit',
        expect.objectContaining({ ip: 'unknown' })
      );
    });

    it('debe sanitizar user agent con caracteres especiales', async () => {
      const { auditMiddleware } = await import('../audit.middleware');
      const req = {
        method: 'GET',
        path: '/api/sanitize',
        headers: {},
        get: jest.fn(() => 'Mozilla/5.0 <script>alert(1)</script>'),
      } as any;
      const res = createMockRes();
      const next = createNext();
      
      const middleware = auditMiddleware();
      await middleware(req, res, next);
      
      const logCall = mockAppLogger.debug.mock.calls[0];
      const userAgent = (logCall[1] as any).userAgent;
      expect(userAgent).not.toContain('<');
      expect(userAgent).not.toContain('>');
    });

    it('debe limitar userAgent a 500 caracteres', async () => {
      const { auditMiddleware } = await import('../audit.middleware');
      const longUA = 'a'.repeat(600);
      const req = {
        method: 'GET',
        path: '/api/long-ua',
        headers: {},
        get: jest.fn(() => longUA),
      } as any;
      const res = createMockRes();
      const next = createNext();
      
      const middleware = auditMiddleware();
      await middleware(req, res, next);
      
      const logCall = mockAppLogger.debug.mock.calls[0];
      const loggedUA = (logCall[1] as any).userAgent;
      expect(typeof loggedUA).toBe('string');
      expect(loggedUA.length).toBeLessThanOrEqual(500);
    });

    it('debe loggear información de request completa con user', async () => {
      const { auditMiddleware } = await import('../audit.middleware');
      const req = {
        method: 'PUT',
        path: '/api/users/1',
        get: jest.fn(() => 'Mozilla/5.0'),
        user: { id: 42 },
        headers: {},
      } as any;
      const res = createMockRes();
      const next = createNext();
      
      const middleware = auditMiddleware();
      await middleware(req, res, next);
      
      expect(mockAppLogger.debug).toHaveBeenCalledWith(
        'Request audit',
        expect.objectContaining({
          method: 'PUT',
          path: '/api/users/1',
          userId: 42,
        })
      );
    });

    it('debe manejar request sin user', async () => {
      const { auditMiddleware } = await import('../audit.middleware');
      const req = {
        method: 'GET',
        path: '/api/public',
        get: jest.fn(() => 'Mozilla/5.0'),
        headers: {},
      } as any;
      const res = createMockRes();
      const next = createNext();
      
      const middleware = auditMiddleware();
      await middleware(req, res, next);
      
      expect(mockAppLogger.debug).toHaveBeenCalledWith(
        'Request audit',
        expect.objectContaining({
          userId: undefined,
        })
      );
    });

    it('debe manejar userAgent undefined', async () => {
      const { auditMiddleware } = await import('../audit.middleware');
      const req = {
        method: 'GET',
        path: '/api/no-ua',
        headers: {},
        get: jest.fn(() => undefined),
      } as any;
      const res = createMockRes();
      const next = createNext();
      
      const middleware = auditMiddleware();
      await middleware(req, res, next);
      
      expect(mockAppLogger.debug).toHaveBeenCalled();
      expect(next).toHaveBeenCalled();
    });

    it('debe capturar IP de socket.remoteAddress cuando disponible (connection deprecated)', async () => {
      const { auditMiddleware } = await import('../audit.middleware');
      const req = {
        method: 'GET',
        path: '/api/conn',
        headers: {},
        socket: { remoteAddress: '192.168.2.50' },
        get: jest.fn(() => 'UA'),
      } as any;
      const res = createMockRes();
      const next = createNext();
      
      const middleware = auditMiddleware();
      await middleware(req, res, next);
      
      expect(mockAppLogger.debug).toHaveBeenCalledWith(
        'Request audit',
        expect.objectContaining({ ip: '192.168.2.50' })
      );
    });

    it('debe capturar IP de socket.remoteAddress cuando disponible', async () => {
      const { auditMiddleware } = await import('../audit.middleware');
      const req = {
        method: 'GET',
        path: '/api/socket',
        headers: {},
        socket: { remoteAddress: '172.16.5.10' },
        get: jest.fn(() => 'UA'),
      } as any;
      const res = createMockRes();
      const next = createNext();
      
      const middleware = auditMiddleware();
      await middleware(req, res, next);
      
      expect(mockAppLogger.debug).toHaveBeenCalledWith(
        'Request audit',
        expect.objectContaining({ ip: '172.16.5.10' })
      );
    });

    it('debe usar IP de req.ip como fallback final', async () => {
      const { auditMiddleware } = await import('../audit.middleware');
      const req = {
        method: 'GET',
        path: '/api/ip',
        headers: {},
        ip: '10.20.30.40',
        get: jest.fn(() => 'UA'),
      } as any;
      const res = createMockRes();
      const next = createNext();
      
      const middleware = auditMiddleware();
      await middleware(req, res, next);
      
      expect(mockAppLogger.debug).toHaveBeenCalledWith(
        'Request audit',
        expect.objectContaining({ ip: '10.20.30.40' })
      );
    });

    it('debe usar IP de x-real-ip como fallback', async () => {
      const { auditMiddleware } = await import('../audit.middleware');
      const req = {
        method: 'GET',
        path: '/api/real-ip',
        headers: { 'x-real-ip': '203.0.113.20' },
        get: jest.fn(() => 'UA'),
      } as any;
      const res = createMockRes();
      const next = createNext();
      
      const middleware = auditMiddleware();
      await middleware(req, res, next);
      
      expect(mockAppLogger.debug).toHaveBeenCalledWith(
        'Request audit',
        expect.objectContaining({ ip: '203.0.113.20' })
      );
    });

    it('debe mantener userAgent con longitud exacta de 500 caracteres (recortado en log)', async () => {
      const { auditMiddleware } = await import('../audit.middleware');
      const exactUA = 'a'.repeat(500);
      const req = {
        method: 'GET',
        path: '/api/exact-500',
        headers: {},
        get: jest.fn(() => exactUA),
      } as any;
      const res = createMockRes();
      const next = createNext();
      
      const middleware = auditMiddleware();
      await middleware(req, res, next);
      
      const logCall = mockAppLogger.debug.mock.calls[0];
      const loggedUA = (logCall[1] as any).userAgent;
      // El middleware recorta a 100 en el log, pero la función sanitizeUserAgent mantiene 500
      expect(loggedUA.length).toBe(100);
    });

    it('debe recortar userAgent cuando tiene > 500 caracteres (log recortado a 100)', async () => {
      const { auditMiddleware } = await import('../audit.middleware');
      const longUA = 'b'.repeat(1000);
      const req = {
        method: 'GET',
        path: '/api/long-ua',
        headers: {},
        get: jest.fn(() => longUA),
      } as any;
      const res = createMockRes();
      const next = createNext();
      
      const middleware = auditMiddleware();
      await middleware(req, res, next);
      
      const logCall = mockAppLogger.debug.mock.calls[0];
      const loggedUA = (logCall[1] as any).userAgent;
      // Sanitización mantiene 500, pero el log recorta a 100
      expect(loggedUA.length).toBe(100);
    });

    it('debe remover caracteres <> y <> del userAgent', async () => {
      const { auditMiddleware } = await import('../audit.middleware');
      const dangerousUA = 'Mozilla/5.0 <script>evil()</script> <> <test>';
      const req = {
        method: 'GET',
        path: '/api/dangerous',
        headers: {},
        get: jest.fn(() => dangerousUA),
      } as any;
      const res = createMockRes();
      const next = createNext();
      
      const middleware = auditMiddleware();
      await middleware(req, res, next);
      
      const logCall = mockAppLogger.debug.mock.calls[0];
      const loggedUA = (logCall[1] as any).userAgent;
      expect(loggedUA).not.toContain('<');
      expect(loggedUA).not.toContain('>');
    });
  });

  describe('auditAccessDenied', () => {
    it('debe loggear acceso denegado con user completo', async () => {
      const { auditAccessDenied } = await import('../audit.middleware');
      const req = {
        method: 'DELETE',
        path: '/api/admin/users/1',
        get: jest.fn(() => 'Mozilla/5.0'),
        headers: {},
        user: { id: 42, email: 'user@example.com' },
      } as any;
      const res = createMockRes();
      const next = createNext();
      
      auditAccessDenied(req, res, next);
      
      expect(mockAppLogger.warn).toHaveBeenCalledWith(
        'Access denied audit',
        expect.objectContaining({
          userId: 42,
          email: 'user@example.com',
          action: 'ACCESS_DENIED',
        })
      );
    });

    it('debe loggear acceso denegado sin user', async () => {
      const { auditAccessDenied } = await import('../audit.middleware');
      const req = {
        method: 'POST',
        path: '/api/admin',
        get: jest.fn(() => 'UA'),
        headers: {},
        user: undefined,
      } as any;
      const res = createMockRes();
      const next = createNext();
      
      auditAccessDenied(req, res, next);
      
      expect(mockAppLogger.warn).toHaveBeenCalledWith(
        'Access denied audit',
        expect.objectContaining({
          userId: undefined,
          email: undefined,
        })
      );
    });

    it('debe incluir IP de x-forwarded-for en log', async () => {
      const { auditAccessDenied } = await import('../audit.middleware');
      const req = {
        method: 'POST',
        path: '/api/resource',
        get: jest.fn(() => 'CustomUserAgent/1.0'),
        headers: { 'x-forwarded-for': '10.0.0.5' },
        user: { id: 5 },
      } as any;
      const res = createMockRes();
      const next = createNext();
      
      auditAccessDenied(req, res, next);
      
      expect(mockAppLogger.warn).toHaveBeenCalledWith(
        'Access denied audit',
        expect.objectContaining({ ip: '10.0.0.5' })
      );
    });

    it('debe incluir userAgent en log', async () => {
      const { auditAccessDenied } = await import('../audit.middleware');
      const req = {
        method: 'PUT',
        path: '/api/admin',
        get: jest.fn(() => 'TestUA/1.0'),
        headers: {},
        user: { id: 10 },
      } as any;
      const res = createMockRes();
      const next = createNext();
      
      auditAccessDenied(req, res, next);
      
      expect(mockAppLogger.warn).toHaveBeenCalledWith(
        'Access denied audit',
        expect.objectContaining({ userAgent: 'TestUA/1.0' })
      );
    });

    it('debe incluir timestamp en log', async () => {
      const { auditAccessDenied } = await import('../audit.middleware');
      const req = {
        method: 'PUT',
        path: '/api/admin',
        get: jest.fn(() => 'UA'),
        headers: {},
        user: { id: 10 },
      } as any;
      const res = createMockRes();
      const next = createNext();
      
      const beforeDate = new Date();
      auditAccessDenied(req, res, next);
      const afterDate = new Date();
      
      const warnCalls = mockAppLogger.warn.mock.calls;
      const logTimestamp = new Date((warnCalls[0][1] as any).timestamp);
      
      expect(logTimestamp.getTime()).toBeGreaterThanOrEqual(beforeDate.getTime());
      expect(logTimestamp.getTime()).toBeLessThanOrEqual(afterDate.getTime());
    });

    it('debe llamar a next()', async () => {
      const { auditAccessDenied } = await import('../audit.middleware');
      const req = {
        method: 'DELETE',
        path: '/api/resource/1',
        get: jest.fn(() => 'UA'),
        headers: {},
        user: { id: 3 },
      } as any;
      const res = createMockRes();
      const next = createNext();
      
      auditAccessDenied(req, res, next);
      
      expect(next).toHaveBeenCalled();
    });

    it('debe capturar IP de x-forwarded-for con múltiples IPs', async () => {
      const { auditAccessDenied } = await import('../audit.middleware');
      const req = {
        method: 'POST',
        path: '/api/multi-ip',
        get: jest.fn(() => 'UA'),
        headers: { 'x-forwarded-for': '192.168.1.1,10.0.0.1,172.16.0.1' },
        user: { id: 7 },
      } as any;
      const res = createMockRes();
      const next = createNext();
      
      auditAccessDenied(req, res, next);
      
      expect(mockAppLogger.warn).toHaveBeenCalledWith(
        'Access denied audit',
        expect.objectContaining({ ip: '192.168.1.1' })
      );
    });

    it('debe usar IP de x-real-ip si no hay x-forwarded-for', async () => {
      const { auditAccessDenied } = await import('../audit.middleware');
      const req = {
        method: 'PUT',
        path: '/api/real-ip',
        get: jest.fn(() => 'UA'),
        headers: { 'x-real-ip': '198.51.100.50' },
        user: { id: 8 },
      } as any;
      const res = createMockRes();
      const next = createNext();
      
      auditAccessDenied(req, res, next);
      
      expect(mockAppLogger.warn).toHaveBeenCalledWith(
        'Access denied audit',
        expect.objectContaining({ ip: '198.51.100.50' })
      );
    });

    it('debe usar IP de socket.remoteAddress como fallback (connection deprecated)', async () => {
      const { auditAccessDenied } = await import('../audit.middleware');
      const req = {
        method: 'GET',
        path: '/api/connection',
        get: jest.fn(() => 'UA'),
        headers: {},
        socket: { remoteAddress: '172.16.10.5' },
        user: { id: 9 },
      } as any;
      const res = createMockRes();
      const next = createNext();
      
      auditAccessDenied(req, res, next);
      
      expect(mockAppLogger.warn).toHaveBeenCalledWith(
        'Access denied audit',
        expect.objectContaining({ ip: '172.16.10.5' })
      );
    });

    it('debe usar IP de socket.remoteAddress como fallback', async () => {
      const { auditAccessDenied } = await import('../audit.middleware');
      const req = {
        method: 'POST',
        path: '/api/socket',
        get: jest.fn(() => 'UA'),
        headers: {},
        socket: { remoteAddress: '10.5.20.30' },
        user: { id: 10 },
      } as any;
      const res = createMockRes();
      const next = createNext();
      
      auditAccessDenied(req, res, next);
      
      expect(mockAppLogger.warn).toHaveBeenCalledWith(
        'Access denied audit',
        expect.objectContaining({ ip: '10.5.20.30' })
      );
    });

    it('debe usar IP de req.ip como fallback final', async () => {
      const { auditAccessDenied } = await import('../audit.middleware');
      const req = {
        method: 'DELETE',
        path: '/api/req-ip',
        get: jest.fn(() => 'UA'),
        headers: {},
        ip: '192.0.2.100',
        user: { id: 11 },
      } as any;
      const res = createMockRes();
      const next = createNext();
      
      auditAccessDenied(req, res, next);
      
      expect(mockAppLogger.warn).toHaveBeenCalledWith(
        'Access denied audit',
        expect.objectContaining({ ip: '192.0.2.100' })
      );
    });

    it('debe usar "unknown" si no hay ninguna IP disponible', async () => {
      const { auditAccessDenied } = await import('../audit.middleware');
      const req = {
        method: 'PATCH',
        path: '/api/unknown-ip',
        get: jest.fn(() => 'UA'),
        headers: {},
        user: { id: 12 },
      } as any;
      const res = createMockRes();
      const next = createNext();
      
      auditAccessDenied(req, res, next);
      
      expect(mockAppLogger.warn).toHaveBeenCalledWith(
        'Access denied audit',
        expect.objectContaining({ ip: 'unknown' })
      );
    });

    it('debe recortar userAgent cuando tiene > 500 caracteres (log recortado a 100)', async () => {
      const { auditAccessDenied } = await import('../audit.middleware');
      const longUA = 'x'.repeat(1000);
      const req = {
        method: 'GET',
        path: '/api/long-ua-deny',
        get: jest.fn(() => longUA),
        headers: {},
        user: { id: 13 },
      } as any;
      const res = createMockRes();
      const next = createNext();
      
      auditAccessDenied(req, res, next);
      
      const warnCalls = mockAppLogger.warn.mock.calls;
      const userAgent = (warnCalls[0][1] as any).userAgent;
      expect(typeof userAgent).toBe('string');
      expect(userAgent.length).toBe(100);
    });

    it('debe sanitizar userAgent con caracteres especiales en access denied', async () => {
      const { auditAccessDenied } = await import('../audit.middleware');
      const dangerousUA = '<script>alert(1)</script> <xss>';
      const req = {
        method: 'POST',
        path: '/api/xss-deny',
        get: jest.fn(() => dangerousUA),
        headers: {},
        user: { id: 14 },
      } as any;
      const res = createMockRes();
      const next = createNext();
      
      auditAccessDenied(req, res, next);
      
      const warnCalls = mockAppLogger.warn.mock.calls;
      const userAgent = (warnCalls[0][1] as any).userAgent;
      expect(userAgent).not.toContain('<');
      expect(userAgent).not.toContain('>');
    });

    it('debe incluir todos los campos esperados en el log', async () => {
      const { auditAccessDenied } = await import('../audit.middleware');
      const req = {
        method: 'PUT',
        path: '/api/admin/secret',
        get: jest.fn(() => 'TestUA/1.0'),
        headers: { 'x-forwarded-for': '10.0.1.5' },
        user: { id: 20, email: 'admin@test.com' },
      } as any;
      const res = createMockRes();
      const next = createNext();
      
      auditAccessDenied(req, res, next);
      
      expect(mockAppLogger.warn).toHaveBeenCalledWith(
        'Access denied audit',
        expect.objectContaining({
          userId: 20,
          email: 'admin@test.com',
          action: 'ACCESS_DENIED',
          path: '/api/admin/secret',
          method: 'PUT',
          ip: '10.0.1.5',
          userAgent: 'TestUA/1.0',
          timestamp: expect.any(String),
        })
      );
    });
  });

  describe('captureOldValues', () => {
    it('debe ser una función factory', async () => {
      const { captureOldValues } = await import('../audit.middleware');
      
      expect(typeof captureOldValues).toBe('function');
      const middleware = captureOldValues();
      expect(typeof middleware).toBe('function');
    });

    it('debe loggear con resourceKey default', async () => {
      const { captureOldValues } = await import('../audit.middleware');
      const req = {
        path: '/api/users/1',
      } as any;
      const res = createMockRes();
      const next = createNext();
      
      const middleware = captureOldValues();
      middleware(req, res, next);
      
      expect(mockAppLogger.debug).toHaveBeenCalledWith(
        'Capturing old values',
        expect.objectContaining({
          resourceKey: 'id',
          path: '/api/users/1',
        })
      );
    });

    it('debe loggear con resourceKey custom', async () => {
      const { captureOldValues } = await import('../audit.middleware');
      const req = {
        path: '/api/empresas/1',
      } as any;
      const res = createMockRes();
      const next = createNext();
      
      const middleware = captureOldValues('empresaId');
      middleware(req, res, next);
      
      expect(mockAppLogger.debug).toHaveBeenCalledWith(
        'Capturing old values',
        expect.objectContaining({
          resourceKey: 'empresaId',
          path: '/api/empresas/1',
        })
      );
    });

    it('debe llamar a next()', async () => {
      const { captureOldValues } = await import('../audit.middleware');
      const req = {
        path: '/api/items/5',
      } as any;
      const res = createMockRes();
      const next = createNext();
      
      const middleware = captureOldValues('itemId');
      middleware(req, res, next);
      
      expect(next).toHaveBeenCalled();
    });

    it('debe manejar resourceKey vacío', async () => {
      const { captureOldValues } = await import('../audit.middleware');
      const req = {
        path: '/api/test',
      } as any;
      const res = createMockRes();
      const next = createNext();
      
      const middleware = captureOldValues('');
      middleware(req, res, next);
      
      expect(mockAppLogger.debug).toHaveBeenCalledWith(
        'Capturing old values',
        expect.objectContaining({
          resourceKey: '',
          path: '/api/test',
        })
      );
    });

    it('debe manejar resourceKey numérico (cast a string)', async () => {
      const { captureOldValues } = await import('../audit.middleware');
      const req = {
        path: '/api/resource',
      } as any;
      const res = createMockRes();
      const next = createNext();
      
      const middleware = captureOldValues(123 as any);
      middleware(req, res, next);
      
      expect(mockAppLogger.debug).toHaveBeenCalledWith(
        'Capturing old values',
        expect.objectContaining({
          resourceKey: 123,
          path: '/api/resource',
        })
      );
    });

    it('debe manejar paths vacíos', async () => {
      const { captureOldValues } = await import('../audit.middleware');
      const req = {
        path: '',
      } as any;
      const res = createMockRes();
      const next = createNext();
      
      const middleware = captureOldValues('testKey');
      middleware(req, res, next);
      
      expect(mockAppLogger.debug).toHaveBeenCalledWith(
        'Capturing old values',
        expect.objectContaining({
          resourceKey: 'testKey',
          path: '',
        })
      );
    });

    it('debe manejar paths con caracteres especiales', async () => {
      const { captureOldValues } = await import('../audit.middleware');
      const req = {
        path: '/api/test/with/special?param=value#anchor',
      } as any;
      const res = createMockRes();
      const next = createNext();
      
      const middleware = captureOldValues('specialKey');
      middleware(req, res, next);
      
      expect(mockAppLogger.debug).toHaveBeenCalledWith(
        'Capturing old values',
        expect.objectContaining({
          resourceKey: 'specialKey',
          path: '/api/test/with/special?param=value#anchor',
        })
      );
    });
  });

  describe('module exports', () => {
    it('debe exportar todas las funciones y enums', async () => {
      const module = await import('../audit.middleware');
      
      expect(module.auditMiddleware).toBeDefined();
      expect(module.auditAccessDenied).toBeDefined();
      expect(module.captureOldValues).toBeDefined();
      expect(module.AuditActionType).toBeDefined();
      expect(module.AuditResult).toBeDefined();
      expect(module.AuditSeverity).toBeDefined();
      expect(module.AuditActionType.USER_CREATE).toBe('USER_CREATE');
      expect(module.AuditResult.SUCCESS).toBe('SUCCESS');
      expect(module.AuditSeverity.HIGH).toBe('HIGH');
    });
  });

  describe('_getSessionInfo (función exportada para testing)', () => {
    it('debe retornar undefined si no hay auth header', async () => {
      const { _getSessionInfo } = await import('../audit.middleware');
      const req = { headers: {} } as any;
      
      const result = _getSessionInfo(req);
      expect(result).toBeUndefined();
    });

    it('debe extraer session ID de Bearer token', async () => {
      const { _getSessionInfo } = await import('../audit.middleware');
      const req = {
        headers: { authorization: 'Bearer my-secret-token-1234567890abcdef' },
      } as any;
      
      const result = _getSessionInfo(req);
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
    });

    it('debe retornar sessionID de req.sessionID si no hay Bearer', async () => {
      const { _getSessionInfo } = await import('../audit.middleware');
      const req = {
        headers: {},
        sessionID: 'session-abc-123',
      } as any;
      
      const result = _getSessionInfo(req);
      expect(result).toBe('session-abc-123');
    });

    it('debe ignorar auth header sin "Bearer" prefix', async () => {
      const { _getSessionInfo } = await import('../audit.middleware');
      const req = {
        headers: { authorization: 'Basic dXNlcjpwYXNz' },
        sessionID: 'session-xyz',
      } as any;
      
      const result = _getSessionInfo(req);
      expect(result).toBe('session-xyz');
    });

    it('debe manejar token corto', async () => {
      const { _getSessionInfo } = await import('../audit.middleware');
      const req = {
        headers: { authorization: 'Bearer abc' },
      } as any;
      
      const result = _getSessionInfo(req);
      expect(result).toBeDefined();
      expect(result?.length).toBeLessThanOrEqual(32);
    });
  });

  describe('_determineSeverity (función exportada para testing)', () => {
    it('CRITICAL: statusCode >= 500', async () => {
      const { _determineSeverity, AuditActionType } = await import('../audit.middleware');
      
      const result = _determineSeverity(AuditActionType.USER_LOGIN, 500);
      expect(result).toBe('CRITICAL');
    });

    it('CRITICAL: statusCode 503', async () => {
      const { _determineSeverity, AuditActionType } = await import('../audit.middleware');
      
      const result = _determineSeverity(AuditActionType.USER_CREATE, 503);
      expect(result).toBe('CRITICAL');
    });

    it('CRITICAL: statusCode 599', async () => {
      const { _determineSeverity, AuditActionType } = await import('../audit.middleware');
      
      const result = _determineSeverity(AuditActionType.EMPRESA_CREATE, 599);
      expect(result).toBe('CRITICAL');
    });

    it('HIGH: statusCode >= 400', async () => {
      const { _determineSeverity, AuditActionType } = await import('../audit.middleware');
      
      const result = _determineSeverity(AuditActionType.USER_LOGIN, 400);
      expect(result).toBe('HIGH');
    });

    it('HIGH: statusCode 404', async () => {
      const { _determineSeverity, AuditActionType } = await import('../audit.middleware');
      
      const result = _determineSeverity(AuditActionType.EMPRESA_CREATE, 404);
      expect(result).toBe('HIGH');
    });

    it('HIGH: statusCode 499', async () => {
      const { _determineSeverity, AuditActionType } = await import('../audit.middleware');
      
      const result = _determineSeverity(AuditActionType.USER_UPDATE, 499);
      expect(result).toBe('HIGH');
    });

    it('HIGH: USER_DELETE action con código 200', async () => {
      const { _determineSeverity, AuditActionType } = await import('../audit.middleware');
      
      const result = _determineSeverity(AuditActionType.USER_DELETE, 200);
      expect(result).toBe('HIGH');
    });

    it('HIGH: EMPRESA_DELETE action con código 200', async () => {
      const { _determineSeverity, AuditActionType } = await import('../audit.middleware');
      
      const result = _determineSeverity(AuditActionType.EMPRESA_DELETE, 200);
      expect(result).toBe('HIGH');
    });

    it('HIGH: USER_DELETE action con código 201', async () => {
      const { _determineSeverity, AuditActionType } = await import('../audit.middleware');
      
      const result = _determineSeverity(AuditActionType.USER_DELETE, 201);
      expect(result).toBe('HIGH');
    });

    it('MEDIUM: USER_PASSWORD_CHANGE action', async () => {
      const { _determineSeverity, AuditActionType } = await import('../audit.middleware');
      
      const result = _determineSeverity(AuditActionType.USER_PASSWORD_CHANGE, 200);
      expect(result).toBe('MEDIUM');
    });

    it('MEDIUM: USER_PASSWORD_CHANGE action con código 201', async () => {
      const { _determineSeverity, AuditActionType } = await import('../audit.middleware');
      
      const result = _determineSeverity(AuditActionType.USER_PASSWORD_CHANGE, 201);
      expect(result).toBe('MEDIUM');
    });

    it('LOW: acción normal con código 200', async () => {
      const { _determineSeverity, AuditActionType } = await import('../audit.middleware');
      
      const result = _determineSeverity(AuditActionType.USER_LOGIN, 200);
      expect(result).toBe('LOW');
    });

    it('LOW: acción con código < 400', async () => {
      const { _determineSeverity, AuditActionType } = await import('../audit.middleware');
      
      const result = _determineSeverity(AuditActionType.USER_CREATE, 201);
      expect(result).toBe('LOW');
    });

    it('LOW: código 304 (Not Modified)', async () => {
      const { _determineSeverity, AuditActionType } = await import('../audit.middleware');
      
      const result = _determineSeverity(AuditActionType.EMPRESA_UPDATE, 304);
      expect(result).toBe('LOW');
    });

    it('LOW: código 100 (Continue)', async () => {
      const { _determineSeverity, AuditActionType } = await import('../audit.middleware');
      
      const result = _determineSeverity(AuditActionType.USER_LOGIN, 100);
      expect(result).toBe('LOW');
    });

    it('LOW: código 399', async () => {
      const { _determineSeverity, AuditActionType } = await import('../audit.middleware');
      
      const result = _determineSeverity(AuditActionType.USER_UPDATE, 399);
      expect(result).toBe('LOW');
    });
  });
});
