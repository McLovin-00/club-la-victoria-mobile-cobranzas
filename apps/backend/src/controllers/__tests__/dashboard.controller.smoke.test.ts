/**
 * Smoke tests para dashboard.controller.ts
 */

describe('DashboardController - Smoke Tests', () => {
  it('should import dashboard controller without errors', () => {
    expect(() => require('../dashboard.controller')).not.toThrow();
  });

  it('should export dashboard functions', () => {
    const dashboardController = require('../dashboard.controller');
    expect(dashboardController).toBeDefined();
  });
});

