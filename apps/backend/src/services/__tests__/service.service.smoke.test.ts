/**
 * Smoke tests para service.service.ts
 */

describe('ServiceService - Smoke Tests', () => {
  it('should import service service without errors', () => {
    expect(() => require('../service.service')).not.toThrow();
  });

  it('should export service service', () => {
    const serviceService = require('../service.service');
    expect(serviceService).toBeDefined();
  });
});

