/**
 * Smoke tests para endUser.service.ts
 */

describe('EndUserService - Smoke Tests', () => {
  it('should import endUser service without errors', () => {
    expect(() => require('../endUser.service')).not.toThrow();
  });

  it('should export endUser service', () => {
    const endUserService = require('../endUser.service');
    expect(endUserService).toBeDefined();
  });
});

