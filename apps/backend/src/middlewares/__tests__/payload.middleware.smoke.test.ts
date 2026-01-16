/**
 * Smoke tests para payload.middleware.ts
 */

describe('PayloadMiddleware - Smoke Tests', () => {
  it('should import payload middleware without errors', () => {
    expect(() => require('../payload.middleware')).not.toThrow();
  });

  it('should export payload middleware', () => {
    const payloadMiddleware = require('../payload.middleware');
    expect(payloadMiddleware).toBeDefined();
  });
});

