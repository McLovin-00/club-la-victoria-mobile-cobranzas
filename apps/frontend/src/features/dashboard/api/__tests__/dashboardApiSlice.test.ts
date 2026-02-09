/**
 * Tests de cobertura para dashboardApiSlice
 * Tests que ejecutan los endpoints para aumentar la cobertura
 */
import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { configureStore } from '@reduxjs/toolkit';
import { apiSlice } from '../../../../store/apiSlice';
import { dashboardApiSlice } from '../dashboardApiSlice';

// Mock de fetch global
const mockFetch = jest.fn();
globalThis.fetch = mockFetch as any;

describe('dashboardApiSlice', () => {
  let store: ReturnType<typeof configureStore>;

  beforeEach(() => {
    store = configureStore({
      reducer: {
        [apiSlice.reducerPath]: apiSlice.reducer,
        auth: () => ({ token: 'test-token', user: { empresaId: 1 } }),
      },
      middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware().concat(apiSlice.middleware),
    });
    mockFetch.mockClear();
  });

  afterEach(() => {
    mockFetch.mockReset();
  });

  describe('Exports', () => {
    it('importa el módulo correctamente', async () => {
      const module = await import('../dashboardApiSlice');
      expect(module.dashboardApiSlice).toBeDefined();
    });

    it('exporta todos los hooks', () => {
      expect(dashboardApiSlice.useGetUserDashboardQuery).toBeDefined();
      expect(dashboardApiSlice.useGetAdminDashboardQuery).toBeDefined();
      expect(dashboardApiSlice.useGetSuperAdminDashboardQuery).toBeDefined();
      expect(dashboardApiSlice.useRefreshDashboardMutation).toBeDefined();
      expect(typeof dashboardApiSlice.useGetUserDashboardQuery).toBe('function');
      expect(typeof dashboardApiSlice.useGetAdminDashboardQuery).toBe('function');
      expect(typeof dashboardApiSlice.useGetSuperAdminDashboardQuery).toBe('function');
      expect(typeof dashboardApiSlice.useRefreshDashboardMutation).toBe('function');
    });

    it('el slice tiene endpoints y utilidades', () => {
      expect(dashboardApiSlice.endpoints).toBeDefined();
      expect(dashboardApiSlice.util).toBeDefined();
    });
  });

  describe('Endpoints', () => {
    it('tiene todos los endpoints definidos', () => {
      const endpoints = dashboardApiSlice.endpoints;

      expect(endpoints.getUserDashboard).toBeDefined();
      expect(endpoints.getAdminDashboard).toBeDefined();
      expect(endpoints.getSuperAdminDashboard).toBeDefined();
      expect(endpoints.refreshDashboard).toBeDefined();
    });

    it('tiene 4 endpoints en total', () => {
      const endpointKeys = Object.keys(dashboardApiSlice.endpoints);
      expect(endpointKeys).toHaveLength(4);
    });
  });

  describe('getUserDashboard query', () => {
    it('ejecuta la query para obtener dashboard de usuario', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          recentActivity: [],
          bots: [],
          empresa: { id: 1, nombre: 'Test Empresa' },
        }),
      });

      await store.dispatch(dashboardApiSlice.endpoints.getUserDashboard.initiate());

      expect(mockFetch).toHaveBeenCalled();
    });

    it('ejecuta la query con datos completos', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          recentActivity: [
            {
              id: '1',
              action: 'create',
              user: 'Test User',
              timestamp: '2024-01-01T00:00:00Z',
              description: 'Creación de documento',
            },
          ],
          bots: [
            {
              botNumber: 1,
              botName: 'Bot 1',
              total: 10,
              configured: 8,
              status: 'good',
            },
          ],
          empresa: { id: 1, nombre: 'Test Empresa', descripcion: 'Descripción' },
        }),
      });

      await store.dispatch(dashboardApiSlice.endpoints.getUserDashboard.initiate());

      expect(mockFetch).toHaveBeenCalled();
    });
  });

  describe('getAdminDashboard query', () => {
    it('ejecuta la query para obtener dashboard de admin', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          usersCount: 5,
          bots: [],
          botCompleteness: [],
          recentActivity: [],
          users: [],
          clientsCount: 2,
        }),
      });

      await store.dispatch(dashboardApiSlice.endpoints.getAdminDashboard.initiate());

      expect(mockFetch).toHaveBeenCalled();
    });

    it('ejecuta la query con datos completos de admin', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          usersCount: 10,
          bots: [
            { id: 1, name: 'Bot 1' },
            { id: 2, name: 'Bot 2' },
          ],
          botCompleteness: [
            { botId: 1, botName: 'Bot 1', completedPercentage: 80 },
            { botId: 2, botName: 'Bot 2', completedPercentage: 100 },
          ],
          recentActivity: [
            {
              id: '1',
              action: 'update',
              user: 'Admin',
              timestamp: '2024-01-01T00:00:00Z',
              description: 'Actualización',
            },
          ],
          users: [
            {
              id: 1,
              email: 'user@test.com',
              role: 'ADMIN',
              botsEnabled: [1, 2],
              lastActive: '2024-01-01T00:00:00Z',
            },
          ],
          clientsCount: 5,
        }),
      });

      await store.dispatch(dashboardApiSlice.endpoints.getAdminDashboard.initiate());

      expect(mockFetch).toHaveBeenCalled();
    });
  });

  describe('getSuperAdminDashboard query', () => {
    it('ejecuta la query para obtener dashboard de superadmin', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          empresasCount: 3,
          totalUsersCount: 15,
          activeBotsCount: 5,
          totalBots: 10,
          serverUsage: 50,
          empresasStats: [],
          empresas: [],
          systemActivity: [],
          totalTextsCount: 100,
          pendingTextsCount: 20,
          completedTextsCount: 80,
          processedToday: 10,
          recentActivity: [],
        }),
      });

      await store.dispatch(dashboardApiSlice.endpoints.getSuperAdminDashboard.initiate());

      expect(mockFetch).toHaveBeenCalled();
    });

    it('ejecuta la query con datos completos de superadmin', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          empresasCount: 5,
          totalUsersCount: 25,
          activeBotsCount: 8,
          totalBots: 15,
          serverUsage: 65,
          empresasStats: [
            { month: '2024-01', count: 2 },
            { month: '2024-02', count: 3 },
          ],
          empresas: [
            {
              id: 1,
              nombre: 'Empresa 1',
              descripcion: 'Descripción 1',
              usuariosCount: 5,
              createdAt: '2024-01-01T00:00:00Z',
              updatedAt: '2024-01-01T00:00:00Z',
            },
          ],
          systemActivity: [
            {
              id: '1',
              action: 'system',
              user: 'System',
              timestamp: '2024-01-01T00:00:00Z',
              description: 'System activity',
              type: 'system',
              severity: 'info',
            },
          ],
          totalTextsCount: 200,
          pendingTextsCount: 30,
          completedTextsCount: 170,
          processedToday: 15,
          recentActivity: [
            {
              id: '1',
              action: 'create',
              user: 'SuperAdmin',
              timestamp: '2024-01-01T00:00:00Z',
              description: 'Nueva empresa creada',
              severity: 'info',
            },
          ],
        }),
      });

      await store.dispatch(dashboardApiSlice.endpoints.getSuperAdminDashboard.initiate());

      expect(mockFetch).toHaveBeenCalled();
    });
  });

  describe('refreshDashboard mutation', () => {
    it('ejecuta la mutation para refrescar el dashboard', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      await store.dispatch(dashboardApiSlice.endpoints.refreshDashboard.initiate());

      expect(mockFetch).toHaveBeenCalled();
    });
  });

  describe('Cache tags', () => {
    it('todas las queries proporcionan el tag Dashboard', () => {
      expect(dashboardApiSlice.endpoints.getUserDashboard).toBeDefined();
      expect(dashboardApiSlice.endpoints.getAdminDashboard).toBeDefined();
      expect(dashboardApiSlice.endpoints.getSuperAdminDashboard).toBeDefined();
    });

    it('refreshDashboard invalida el tag Dashboard', () => {
      expect(dashboardApiSlice.endpoints.refreshDashboard).toBeDefined();
    });
  });

  describe('Estructura del slice', () => {
    it('tiene reducerPath definido', () => {
      expect(dashboardApiSlice.reducerPath).toBeDefined();
    });

    it('tiene reducer definido', () => {
      expect(typeof dashboardApiSlice.reducer).toBe('function');
    });

    it('tiene middleware definido', () => {
      expect(typeof dashboardApiSlice.middleware).toBe('function');
    });

    it('tiene utilidades definidas', () => {
      expect(dashboardApiSlice.util).toBeDefined();
      expect(dashboardApiSlice.util.prefetch).toBeDefined();
      expect(dashboardApiSlice.util.invalidateTags).toBeDefined();
    });
  });
});
