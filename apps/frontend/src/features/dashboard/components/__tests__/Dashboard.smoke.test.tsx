/**
 * Smoke tests para componentes de dashboard
 * 
 * Solo verifican que los componentes puedan importarse sin errores.
 */
import { describe, it, expect } from '@jest/globals';

describe('Dashboard Components - Smoke Tests', () => {
  it('UserDashboard puede importarse', async () => {
    const mod = await import('../UserDashboard');
    expect(mod.UserDashboard).toBeDefined();
  });

  it('AdminDashboard puede importarse', async () => {
    const mod = await import('../AdminDashboard');
    expect(mod.AdminDashboard).toBeDefined();
  });

  it('SuperAdminDashboard puede importarse', async () => {
    const mod = await import('../SuperAdminDashboard');
    expect(mod.SuperAdminDashboard).toBeDefined();
  });

  it('ServiceWidgetsContainer puede importarse', async () => {
    const mod = await import('../ServiceWidgets');
    expect(mod.ServiceWidgetsContainer).toBeDefined();
  });
});
