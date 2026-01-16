/**
 * Tests de cobertura para dashboardApiSlice
 */
import { describe, it, expect, jest } from '@jest/globals';

// Mock del apiSlice base
jest.mock('../../../../store/apiSlice', () => ({
  apiSlice: {
    injectEndpoints: jest.fn((endpoints: unknown) => ({
      endpoints: endpoints,
      reducer: 'dashboardReducer',
      reducerPath: 'dashboardApi',
      middleware: () => (next: (action: unknown) => unknown) => (action: unknown) => next(action),
      util: {
        prefetch: jest.fn(),
        invalidateTags: jest.fn(),
        getRunningQueriesThunk: jest.fn(),
        getRunningMutationThunk: jest.fn(),
      },
    })),
  },
}));

describe('dashboardApiSlice - Coverage', () => {
  beforeAll(async () => {
    // Importar después del mock
    await import('../dashboardApiSlice');
  });

  it('debería importar el módulo', async () => {
    const module = await import('../dashboardApiSlice');
    expect(module.dashboardApiSlice).toBeDefined();
  });

  it('debería exportar los hooks', async () => {
    const module = await import('../dashboardApiSlice');
    expect(module.useGetUserDashboardQuery).toBeDefined();
    expect(module.useGetAdminDashboardQuery).toBeDefined();
    expect(module.useGetSuperAdminDashboardQuery).toBeDefined();
    expect(module.useRefreshDashboardMutation).toBeDefined();
  });

  it('debería exportar dashboardApiSlice con estructura correcta', async () => {
    const module = await import('../dashboardApiSlice');
    expect(module.dashboardApiSlice).toBeDefined();
    expect(module.dashboardApiSlice.endpoints).toBeDefined();
    expect(module.dashboardApiSlice.util).toBeDefined();
  });

  it('debería tener endpoints definidos', async () => {
    const module = await import('../dashboardApiSlice');
    const slice = module.dashboardApiSlice;
    expect(slice.endpoints).toBeDefined();
    expect(typeof slice.endpoints).toBe('object');
  });

  it('debería tener utilidades definidas', async () => {
    const module = await import('../dashboardApiSlice');
    const slice = module.dashboardApiSlice;
    expect(slice.util).toBeDefined();
    expect(slice.util.prefetch).toBeDefined();
    expect(slice.util.invalidateTags).toBeDefined();
  });
});
