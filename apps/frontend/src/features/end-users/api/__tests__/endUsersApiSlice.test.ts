/**
 * Tests para endUsersApiSlice
 * Tests de cobertura que ejecutan todos los endpoints
 */
import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { configureStore } from '@reduxjs/toolkit';
import { apiSlice } from '../../../../store/apiSlice';
import { endUsersApiSlice } from '../endUsersApiSlice';

// Mock de fetch global
const mockFetch = jest.fn();
global.fetch = mockFetch as any;

describe('endUsersApiSlice', () => {
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
    it('importa endUsersApiSlice sin errores', async () => {
      const module = await import('../endUsersApiSlice');
      expect(module.endUsersApiSlice).toBeDefined();
    });

    it('exporta el slice correctamente', () => {
      expect(endUsersApiSlice).toBeDefined();
      expect(endUsersApiSlice.reducerPath).toBe('api');
    });

    it('exporta todos los hooks', () => {
      expect(endUsersApiSlice.useListEndUsersQuery).toBeDefined();
      expect(endUsersApiSlice.useCreateEndUserMutation).toBeDefined();
      expect(endUsersApiSlice.useUpdateEndUserMutation).toBeDefined();
      expect(endUsersApiSlice.useDeleteEndUserMutation).toBeDefined();
      expect(typeof endUsersApiSlice.useListEndUsersQuery).toBe('function');
      expect(typeof endUsersApiSlice.useCreateEndUserMutation).toBe('function');
      expect(typeof endUsersApiSlice.useUpdateEndUserMutation).toBe('function');
      expect(typeof endUsersApiSlice.useDeleteEndUserMutation).toBe('function');
    });
  });

  describe('Endpoints', () => {
    it('tiene todos los endpoints definidos', () => {
      const endpoints = endUsersApiSlice.endpoints;

      expect(endpoints.listEndUsers).toBeDefined();
      expect(endpoints.createEndUser).toBeDefined();
      expect(endpoints.updateEndUser).toBeDefined();
      expect(endpoints.deleteEndUser).toBeDefined();
    });
  });

  describe('listEndUsers query', () => {
    it('ejecuta la query sin parámetros', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: [] }),
      });

      await store.dispatch(endUsersApiSlice.endpoints.listEndUsers.initiate());

      expect(mockFetch).toHaveBeenCalled();
    });

    it('ejecuta la query con parámetro search', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: [] }),
      });

      await store.dispatch(endUsersApiSlice.endpoints.listEndUsers.initiate({ search: 'juan' }));

      expect(mockFetch).toHaveBeenCalled();
    });

    it('ejecuta la query con parámetro empresaId', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: [] }),
      });

      await store.dispatch(endUsersApiSlice.endpoints.listEndUsers.initiate({ empresaId: 5 }));

      expect(mockFetch).toHaveBeenCalled();
    });

    it('ejecuta la query con parámetro identifierType', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: [] }),
      });

      await store.dispatch(endUsersApiSlice.endpoints.listEndUsers.initiate({ identifierType: 'email' }));

      expect(mockFetch).toHaveBeenCalled();
    });

    it('ejecuta la query con isActive true', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: [] }),
      });

      await store.dispatch(endUsersApiSlice.endpoints.listEndUsers.initiate({ isActive: true }));

      expect(mockFetch).toHaveBeenCalled();
    });

    it('ejecuta la query con isActive false', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: [] }),
      });

      await store.dispatch(endUsersApiSlice.endpoints.listEndUsers.initiate({ isActive: false }));

      expect(mockFetch).toHaveBeenCalled();
    });

    it('ejecuta la query con paginación', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: [] }),
      });

      await store.dispatch(endUsersApiSlice.endpoints.listEndUsers.initiate({ page: 2, limit: 20 }));

      expect(mockFetch).toHaveBeenCalled();
    });

    it('ejecuta la query con todos los parámetros', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: [] }),
      });

      await store.dispatch(
        endUsersApiSlice.endpoints.listEndUsers.initiate({
          search: 'test',
          empresaId: 3,
          identifierType: 'whatsapp',
          isActive: true,
          page: 1,
          limit: 10,
        })
      );

      expect(mockFetch).toHaveBeenCalled();
    });
  });

  describe('createEndUser mutation', () => {
    it('crea un end user con datos mínimos', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: { id: 1, email: 'test@test.com' } }),
      });

      const payload = {
        email: 'test@test.com',
        identifierType: 'email' as const,
        identifier_value: 'test@test.com',
      };

      await store.dispatch(endUsersApiSlice.endpoints.createEndUser.initiate(payload));

      expect(mockFetch).toHaveBeenCalled();
    });

    it('crea un end user con todos los campos', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            id: 2,
            email: 'juan@test.com',
            nombre: 'Juan',
            apellido: 'Pérez',
            empresaId: 5,
          },
        }),
      });

      const payload = {
        email: 'juan@test.com',
        identifierType: 'email' as const,
        identifier_value: 'juan@test.com',
        nombre: 'Juan',
        apellido: 'Pérez',
        empresaId: 5,
        contacto: '123456789',
      };

      await store.dispatch(endUsersApiSlice.endpoints.createEndUser.initiate(payload));

      expect(mockFetch).toHaveBeenCalled();
    });

    it('crea un end user con identifierType whatsapp', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { id: 3, identifierType: 'whatsapp', identifier_value: '123456789' },
        }),
      });

      const payload = {
        identifierType: 'whatsapp' as const,
        identifier_value: '123456789',
      };

      await store.dispatch(endUsersApiSlice.endpoints.createEndUser.initiate(payload));

      expect(mockFetch).toHaveBeenCalled();
    });
  });

  describe('updateEndUser mutation', () => {
    it('actualiza un end user', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { id: 5, email: 'updated@test.com', nombre: 'Juan Actualizado' },
        }),
      });

      const payload = {
        id: 5,
        data: { nombre: 'Juan Actualizado', apellido: 'Pérez Actualizado' },
      };

      await store.dispatch(endUsersApiSlice.endpoints.updateEndUser.initiate(payload));

      expect(mockFetch).toHaveBeenCalled();
    });

    it('actualiza el estado isActive de un end user', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: { id: 6, is_active: false } }),
      });

      const payload = { id: 6, data: { is_active: false } };

      await store.dispatch(endUsersApiSlice.endpoints.updateEndUser.initiate(payload));

      expect(mockFetch).toHaveBeenCalled();
    });
  });

  describe('deleteEndUser mutation', () => {
    it('elimina un end user por ID', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      await store.dispatch(endUsersApiSlice.endpoints.deleteEndUser.initiate({ id: 10 }));

      expect(mockFetch).toHaveBeenCalled();
    });
  });

  describe('Cache tags', () => {
    it('todos los endpoints existen', () => {
      const endpoints = endUsersApiSlice.endpoints;
      expect(Object.keys(endpoints)).toHaveLength(4);
    });

    it('todos los endpoints están definidos', () => {
      expect(endUsersApiSlice.endpoints.listEndUsers).toBeDefined();
      expect(endUsersApiSlice.endpoints.createEndUser).toBeDefined();
      expect(endUsersApiSlice.endpoints.updateEndUser).toBeDefined();
      expect(endUsersApiSlice.endpoints.deleteEndUser).toBeDefined();
    });
  });
});
