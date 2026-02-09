/**
 * Smoke tests para validation.middleware.ts
 */

describe('ValidationMiddleware - Smoke Tests', () => {
  it('should import validation middleware without errors', () => {
    expect(() => require('../validation.middleware')).not.toThrow();
  });

  it('should export validation middleware', () => {
    const validationMiddleware = require('../validation.middleware');
    expect(validationMiddleware).toBeDefined();
  });
});

