/**
 * Tests for notifications.routes.ts
 */

import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { createMockRes } from '../../__tests__/helpers/testUtils';
import { getRouteHandlers } from '../../__tests__/helpers/routerTestUtils';

// Mock dependencies
jest.mock('../../config/logger', () => ({
  AppLogger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

jest.mock('../../middlewares/platformAuth.middleware', () => ({
  authenticateUser: jest.fn((_req: any, _res: any, next: any) => next()),
  authorizeRoles: jest.fn(() => (_req: any, _res: any, next: any) => next()),
  logAction: jest.fn(() => (_req: any, _res: any, next: any) => next()),
}));

async function runMiddlewares(handlers: Function[], req: any, res: any) {
  let idx = 0;
  const next = async () => {
    const fn = handlers[idx++];
    if (!fn) return;
    if (fn.length >= 3) {
      return fn(req, res, next);
    }
    return fn(req, res);
  };
  await next();
}

const fixedDate = new Date('2024-01-01T00:00:00.000Z');
const fixedIso = fixedDate.toISOString();
const fixedNow = fixedDate.getTime();

describe('notifications.routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    jest.setSystemTime(fixedDate);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('router exports', () => {
    it('exporta el router correctamente', async () => {
      const router = await import('../notifications.routes');
      expect(router.default).toBeDefined();
    });

    it('tiene rutas definidas', async () => {
      const router = await import('../notifications.routes');
      const routes = router.default.stack || [];
      expect(routes.length).toBeGreaterThan(0);
    });
  });

  it('GET /whatsapp/config devuelve defaults', async () => {
    const router = (await import('../notifications.routes')).default;
    const handlers = getRouteHandlers(router, 'get', '/whatsapp/config');
    const res = createMockRes();

    await runMiddlewares(handlers, {}, res);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: {
          enabled: false,
          instanceId: '',
          phoneNumber: '',
          templates: expect.objectContaining({
            documentExpiry: '',
            urgentAlert: '',
            equipmentUpdate: '',
            general: '',
          }),
        },
        timestamp: fixedIso,
      })
    );
  });

  it('PUT /whatsapp/config refleja el payload (vacio y completo)', async () => {
    const router = (await import('../notifications.routes')).default;
    const handlers = getRouteHandlers(router, 'put', '/whatsapp/config');

    const res1 = createMockRes();
    await runMiddlewares(handlers, { body: undefined }, res1);
    expect(res1.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true, data: {}, timestamp: fixedIso })
    );

    const payload = { enabled: true, phoneNumber: '+5491100000000' };
    const res2 = createMockRes();
    await runMiddlewares(handlers, { body: payload }, res2);
    expect(res2.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true, data: payload, timestamp: fixedIso })
    );
  });

  it('GET /whatsapp/templates devuelve lista vacia', async () => {
    const router = (await import('../notifications.routes')).default;
    const handlers = getRouteHandlers(router, 'get', '/whatsapp/templates');
    const res = createMockRes();

    await runMiddlewares(handlers, {}, res);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true, data: [], timestamp: fixedIso })
    );
  });

  it('POST /whatsapp/templates genera id con Date.now', async () => {
    const router = (await import('../notifications.routes')).default;
    const handlers = getRouteHandlers(router, 'post', '/whatsapp/templates');

    const res = createMockRes();
    await runMiddlewares(handlers, { body: { name: 'Aviso' } }, res);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: { id: `tpl_${fixedNow}`, name: 'Aviso' },
        timestamp: fixedIso,
      })
    );
  });

  it('PATCH y DELETE /whatsapp/templates/:id usan params', async () => {
    const router = (await import('../notifications.routes')).default;

    const patchHandlers = getRouteHandlers(router, 'patch', '/whatsapp/templates/:id');
    const res1 = createMockRes();
    await runMiddlewares(patchHandlers, { params: { id: 'tpl_1' }, body: { active: true } }, res1);
    expect(res1.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: { id: 'tpl_1', active: true },
        timestamp: fixedIso,
      })
    );

    const deleteHandlers = getRouteHandlers(router, 'delete', '/whatsapp/templates/:id');
    const res2 = createMockRes();
    await runMiddlewares(deleteHandlers, { params: { id: 'tpl_2' } }, res2);
    expect(res2.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: { id: 'tpl_2' },
        timestamp: fixedIso,
      })
    );
  });

  it('POST /whatsapp/test usa variables por defecto', async () => {
    const router = (await import('../notifications.routes')).default;
    const handlers = getRouteHandlers(router, 'post', '/whatsapp/test');

    const res = createMockRes();
    await runMiddlewares(
      handlers,
      { body: { phoneNumber: '+5491100000000', templateId: 'tpl_9' } },
      res
    );

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: {
          sent: true,
          phoneNumber: '+5491100000000',
          templateId: 'tpl_9',
          variables: {},
        },
        timestamp: fixedIso,
      })
    );
  });

  it('POST /whatsapp/test devuelve variables provistas', async () => {
    const router = (await import('../notifications.routes')).default;
    const handlers = getRouteHandlers(router, 'post', '/whatsapp/test');

    const variables = { name: 'Juan' };
    const res = createMockRes();
    await runMiddlewares(
      handlers,
      { body: { phoneNumber: '11', templateId: 'tpl_10', variables } },
      res
    );

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: {
          sent: true,
          phoneNumber: '11',
          templateId: 'tpl_10',
          variables,
        },
        timestamp: fixedIso,
      })
    );
  });
});

