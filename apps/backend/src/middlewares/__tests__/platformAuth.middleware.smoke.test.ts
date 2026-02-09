/**
 * Smoke tests para platformAuth.middleware.ts
 */

describe('PlatformAuthMiddleware - Smoke Tests', () => {
  it('should import platformAuth middleware without errors', () => {
    expect(() => require('../platformAuth.middleware')).not.toThrow();
  });

  it('should export platformAuth middleware', () => {
    const platformAuthMiddleware = require('../platformAuth.middleware');
    expect(platformAuthMiddleware).toBeDefined();
  });
});

