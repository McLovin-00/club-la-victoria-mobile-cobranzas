/**
 * Smoke tests para dashboard.routes.ts
 */

describe('DashboardRoutes - Smoke Tests', () => {
  it('should import dashboard routes without errors', () => {
    expect(() => require('../dashboard.routes')).not.toThrow();
  });

  it('should export a router', () => {
    const dashboardRoutes = require('../dashboard.routes');
    expect(dashboardRoutes).toBeDefined();
  });
});

