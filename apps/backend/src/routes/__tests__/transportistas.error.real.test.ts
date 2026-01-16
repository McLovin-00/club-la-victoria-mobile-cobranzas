/**
 * Fuerza paths de error (catch) en transportistas.ts para subir cobertura.
 * @jest-environment node
 */

import { getRouteHandler } from '../../__tests__/helpers/routerTestUtils';

jest.mock('../../middlewares/platformAuth.middleware', () => ({
  authenticateUser: (_req: any, _res: any, next: any) => next(),
  authorizeRoles: () => (_req: any, _res: any, next: any) => next(),
}));

describe('transportistas error paths (real)', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  function makeResThatThrowsOnce() {
    const res: any = {};
    let first = true;
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockImplementation((payload: any) => {
      if (first) {
        first = false;
        throw new Error('boom');
      }
      return payload;
    });
    return res;
  }

  it('each route hits catch and responds 500', async () => {
    const router = (await import('../transportistas')).default;
    const routes: Array<['get' | 'post', string, any]> = [
      ['get', '/dashboard-stats', {}],
      ['get', '/alertas-urgentes', {}],
      ['get', '/mis-equipos', {}],
      ['get', '/calendar-events', {}],
      ['get', '/profile', {}],
      ['post', '/avatar', { body: { file: 'x' } }],
      ['get', '/preferences', {}],
    ];

    for (const [method, path, req] of routes) {
      const handler = getRouteHandler(router, method, path);
      const res = makeResThatThrowsOnce();
      await handler(req as any, res as any);
      expect(res.status).toHaveBeenCalledWith(500);
    }
  });
});


