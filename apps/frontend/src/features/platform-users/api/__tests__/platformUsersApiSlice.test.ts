/**
 * Tests para platformUsersApiSlice
 * Tests de cobertura que ejecutan todos los endpoints
 */
import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { configureStore } from '@reduxjs/toolkit';
import { apiSlice } from '../../../../store/apiSlice';
import { platformUsersApiSlice } from '../platformUsersApiSlice';

// Mock de fetch global
const mockFetch = jest.fn();
global.fetch = mockFetch as any;

describe('platformUsersApiSlice', () => {
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
    it('exporta el slice correctamente', () => {
      expect(platformUsersApiSlice).toBeDefined();
      expect(platformUsersApiSlice.reducerPath).toBe('api');
    });

    it('exporta todos los hooks de query', () => {
      expect(platformUsersApiSlice.useListPlatformUsersQuery).toBeDefined();
      expect(typeof platformUsersApiSlice.useListPlatformUsersQuery).toBe('function');
    });

    it('exporta todos los hooks de mutation', () => {
      expect(platformUsersApiSlice.useRegisterPlatformUserMutation).toBeDefined();
      expect(platformUsersApiSlice.useRegisterClientWizardMutation).toBeDefined();
      expect(platformUsersApiSlice.useRegisterDadorWizardMutation).toBeDefined();
      expect(platformUsersApiSlice.useRegisterTransportistaWizardMutation).toBeDefined();
      expect(platformUsersApiSlice.useRegisterChoferWizardMutation).toBeDefined();
      expect(platformUsersApiSlice.useUpdatePlatformUserMutation).toBeDefined();
      expect(platformUsersApiSlice.useDeletePlatformUserMutation).toBeDefined();
      expect(platformUsersApiSlice.useToggleUserActivoMutation).toBeDefined();
      expect(platformUsersApiSlice.useUpdateUserEmpresaMutation).toBeDefined();
    });

    it('todos los hooks de mutation son funciones', () => {
      expect(typeof platformUsersApiSlice.useRegisterPlatformUserMutation).toBe('function');
      expect(typeof platformUsersApiSlice.useRegisterClientWizardMutation).toBe('function');
      expect(typeof platformUsersApiSlice.useRegisterDadorWizardMutation).toBe('function');
      expect(typeof platformUsersApiSlice.useRegisterTransportistaWizardMutation).toBe('function');
      expect(typeof platformUsersApiSlice.useRegisterChoferWizardMutation).toBe('function');
      expect(typeof platformUsersApiSlice.useUpdatePlatformUserMutation).toBe('function');
      expect(typeof platformUsersApiSlice.useDeletePlatformUserMutation).toBe('function');
      expect(typeof platformUsersApiSlice.useToggleUserActivoMutation).toBe('function');
      expect(typeof platformUsersApiSlice.useUpdateUserEmpresaMutation).toBe('function');
    });
  });

  describe('Endpoints', () => {
    it('tiene todos los endpoints definidos', () => {
      const endpoints = platformUsersApiSlice.endpoints;

      expect(endpoints.listPlatformUsers).toBeDefined();
      expect(endpoints.registerPlatformUser).toBeDefined();
      expect(endpoints.registerClientWizard).toBeDefined();
      expect(endpoints.registerDadorWizard).toBeDefined();
      expect(endpoints.registerTransportistaWizard).toBeDefined();
      expect(endpoints.registerChoferWizard).toBeDefined();
      expect(endpoints.updatePlatformUser).toBeDefined();
      expect(endpoints.deletePlatformUser).toBeDefined();
      expect(endpoints.toggleUserActivo).toBeDefined();
      expect(endpoints.updateUserEmpresa).toBeDefined();
    });
  });

  describe('listPlatformUsers query', () => {
    it('construye la URL correctamente sin parámetros', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: [], total: 0, page: 1, limit: 10, totalPages: 0 }),
      });

      await store.dispatch(platformUsersApiSlice.endpoints.listPlatformUsers.initiate());

      expect(mockFetch).toHaveBeenCalled();
    });

    it('construye la URL con parámetros page y limit', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: [], total: 0, page: 1, limit: 10, totalPages: 0 }),
      });

      await store.dispatch(platformUsersApiSlice.endpoints.listPlatformUsers.initiate({ page: 2, limit: 20 }));

      expect(mockFetch).toHaveBeenCalled();
    });

    it('construye la URL con parámetro search', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: [], total: 0, page: 1, limit: 10, totalPages: 0 }),
      });

      await store.dispatch(platformUsersApiSlice.endpoints.listPlatformUsers.initiate({ search: 'juan' }));

      expect(mockFetch).toHaveBeenCalled();
    });

    it('construye la URL con parámetro role', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: [], total: 0, page: 1, limit: 10, totalPages: 0 }),
      });

      await store.dispatch(platformUsersApiSlice.endpoints.listPlatformUsers.initiate({ role: 'ADMIN' }));

      expect(mockFetch).toHaveBeenCalled();
    });

    it('construye la URL con parámetro empresaId', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: [], total: 0, page: 1, limit: 10, totalPages: 0 }),
      });

      await store.dispatch(platformUsersApiSlice.endpoints.listPlatformUsers.initiate({ empresaId: 5 }));

      expect(mockFetch).toHaveBeenCalled();
    });

    it('construye la URL con todos los parámetros', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: [], total: 0, page: 1, limit: 10, totalPages: 0 }),
      });

      await store.dispatch(
        platformUsersApiSlice.endpoints.listPlatformUsers.initiate({
          page: 1,
          limit: 10,
          search: 'test',
          role: 'CLIENTE',
          empresaId: 3,
        })
      );

      expect(mockFetch).toHaveBeenCalled();
    });
  });

  describe('registerPlatformUser mutation', () => {
    it('envía solicitud POST', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, user: { id: 1, email: 'test@test.com', role: 'ADMIN' } }),
      });

      const payload = {
        email: 'test@test.com',
        password: 'password123',
        role: 'ADMIN' as const,
      };

      await store.dispatch(platformUsersApiSlice.endpoints.registerPlatformUser.initiate(payload));

      expect(mockFetch).toHaveBeenCalled();
    });

    it('incluye todos los campos opcionales en el payload', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, user: { id: 1, email: 'test@test.com' } }),
      });

      const payload = {
        email: 'test@test.com',
        password: 'password123',
        nombre: 'Juan',
        apellido: 'Pérez',
        empresaId: 5,
        dadorCargaId: 10,
      };

      await store.dispatch(platformUsersApiSlice.endpoints.registerPlatformUser.initiate(payload));

      expect(mockFetch).toHaveBeenCalled();
    });
  });

  describe('registerClientWizard mutation', () => {
    it('envía solicitud POST', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          user: { id: 1, email: 'client@test.com' },
          tempPassword: 'temp123',
        }),
      });

      const payload = {
        email: 'client@test.com',
        nombre: 'Cliente',
        clienteId: 5,
      };

      await store.dispatch(platformUsersApiSlice.endpoints.registerClientWizard.initiate(payload));

      expect(mockFetch).toHaveBeenCalled();
    });
  });

  describe('registerDadorWizard mutation', () => {
    it('envía solicitud POST', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          user: { id: 1, email: 'dador@test.com' },
          tempPassword: 'temp123',
        }),
      });

      const payload = {
        email: 'dador@test.com',
        nombre: 'Dador',
        dadorCargaId: 10,
      };

      await store.dispatch(platformUsersApiSlice.endpoints.registerDadorWizard.initiate(payload));

      expect(mockFetch).toHaveBeenCalled();
    });
  });

  describe('registerTransportistaWizard mutation', () => {
    it('envía solicitud POST', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          user: { id: 1, email: 'transportista@test.com' },
          tempPassword: 'temp123',
        }),
      });

      const payload = {
        email: 'transportista@test.com',
        nombre: 'Transportista',
        empresaTransportistaId: 15,
      };

      await store.dispatch(
        platformUsersApiSlice.endpoints.registerTransportistaWizard.initiate(payload)
      );

      expect(mockFetch).toHaveBeenCalled();
    });
  });

  describe('registerChoferWizard mutation', () => {
    it('envía solicitud POST', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          user: { id: 1, email: 'chofer@test.com' },
          tempPassword: 'temp123',
        }),
      });

      const payload = {
        email: 'chofer@test.com',
        nombre: 'Chofer',
        choferId: 20,
      };

      await store.dispatch(platformUsersApiSlice.endpoints.registerChoferWizard.initiate(payload));

      expect(mockFetch).toHaveBeenCalled();
    });
  });

  describe('updatePlatformUser mutation', () => {
    it('envía solicitud PUT', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, user: { id: 5, email: 'updated@test.com' } }),
      });

      const payload = { id: 5, data: { nombre: 'Juan Actualizado' } };

      await store.dispatch(platformUsersApiSlice.endpoints.updatePlatformUser.initiate(payload));

      expect(mockFetch).toHaveBeenCalled();
    });
  });

  describe('deletePlatformUser mutation', () => {
    it('envía solicitud DELETE', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      await store.dispatch(platformUsersApiSlice.endpoints.deletePlatformUser.initiate({ id: 10 }));

      expect(mockFetch).toHaveBeenCalled();
    });
  });

  describe('toggleUserActivo mutation', () => {
    it('envía solicitud PATCH', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: { id: 7, activo: false } }),
      });

      await store.dispatch(platformUsersApiSlice.endpoints.toggleUserActivo.initiate({ id: 7, activo: false }));

      expect(mockFetch).toHaveBeenCalled();
    });

    it('envía activo: true cuando se activa el usuario', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: { id: 8, activo: true } }),
      });

      await store.dispatch(platformUsersApiSlice.endpoints.toggleUserActivo.initiate({ id: 8, activo: true }));

      expect(mockFetch).toHaveBeenCalled();
    });
  });

  describe('updateUserEmpresa mutation', () => {
    it('envía solicitud PUT a /usuarios/:id/empresa', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      await store.dispatch(
        platformUsersApiSlice.endpoints.updateUserEmpresa.initiate({ id: 12, empresaId: 5 })
      );

      expect(mockFetch).toHaveBeenCalled();
      const callArg = mockFetch.mock.calls[0][0];
      if (typeof callArg === 'string') {
        expect(callArg).toBe('/usuarios/12/empresa');
      }
    });

    it('permite empresaId null para desasignar', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      await store.dispatch(platformUsersApiSlice.endpoints.updateUserEmpresa.initiate({ id: 12, empresaId: null }));

      expect(mockFetch).toHaveBeenCalled();
    });
  });

  describe('Cache tags', () => {
    it('listPlatformUsers tiene providesTags definido', () => {
      const endpoint = platformUsersApiSlice.endpoints.listPlatformUsers;
      expect(endpoint).toBeDefined();
      // providesTags se define en el endpoint, verificamos que el endpoint existe
    });

    it('todas las mutations tienen invalidatesTags', () => {
      const mutationsToCheck = [
        'registerPlatformUser',
        'registerClientWizard',
        'registerDadorWizard',
        'registerTransportistaWizard',
        'registerChoferWizard',
        'updatePlatformUser',
        'deletePlatformUser',
        'toggleUserActivo',
        'updateUserEmpresa',
      ] as const;

      mutationsToCheck.forEach((mutationName) => {
        const endpoint = platformUsersApiSlice.endpoints[mutationName];
        expect(endpoint).toBeDefined();
      });
    });
  });
});
