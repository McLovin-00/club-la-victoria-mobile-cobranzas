/**
 * Smoke tests para user.routes.ts
 */

describe('UserRoutes - Smoke Tests', () => {
  it('should import user routes without errors', () => {
    expect(() => require('../user.routes')).not.toThrow();
  });

  it('should export a router', () => {
    const userRoutes = require('../user.routes');
    expect(userRoutes).toBeDefined();
  });
});

