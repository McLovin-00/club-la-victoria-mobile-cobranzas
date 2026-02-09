/**
 * Smoke tests para platformAuth.routes.ts
 */

describe('PlatformAuthRoutes - Smoke Tests', () => {
  it('should import platformAuth routes without errors', () => {
    expect(() => require('../platformAuth.routes')).not.toThrow();
  });

  it('should export a router', () => {
    const platformAuthRoutes = require('../platformAuth.routes');
    expect(platformAuthRoutes).toBeDefined();
  });
});

