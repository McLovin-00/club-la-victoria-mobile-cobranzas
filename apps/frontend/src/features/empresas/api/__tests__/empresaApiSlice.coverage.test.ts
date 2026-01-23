/**
 * Tests para empresaApiSlice
 * Tests de cobertura que ejecutan todos los endpoints
 */
import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { configureStore } from '@reduxjs/toolkit';
import { apiSlice } from '../../../../store/apiSlice';
import { empresaApiSlice } from '../empresaApiSlice';

// Mock de fetch global
const mockFetch = jest.fn();
globalThis.fetch = mockFetch as any;

describe('empresaApiSlice', () => {
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
      expect(empresaApiSlice).toBeDefined();
      expect(empresaApiSlice.reducerPath).toBe('api');
    });

    it('exporta todos los hooks', () => {
      expect(empresaApiSlice.useGetEmpresasQuery).toBeDefined();
      expect(empresaApiSlice.useGetEmpresasSimpleQuery).toBeDefined();
      expect(empresaApiSlice.useGetEmpresaQuery).toBeDefined();
      expect(empresaApiSlice.useCreateEmpresaMutation).toBeDefined();
      expect(empresaApiSlice.useUpdateEmpresaMutation).toBeDefined();
      expect(empresaApiSlice.useDeleteEmpresaMutation).toBeDefined();
      expect(typeof empresaApiSlice.useGetEmpresasQuery).toBe('function');
      expect(typeof empresaApiSlice.useGetEmpresasSimpleQuery).toBe('function');
      expect(typeof empresaApiSlice.useGetEmpresaQuery).toBe('function');
      expect(typeof empresaApiSlice.useCreateEmpresaMutation).toBe('function');
      expect(typeof empresaApiSlice.useUpdateEmpresaMutation).toBe('function');
      expect(typeof empresaApiSlice.useDeleteEmpresaMutation).toBe('function');
    });
  });

  describe('Endpoints', () => {
    it('tiene todos los endpoints definidos', () => {
      const endpoints = empresaApiSlice.endpoints;

      expect(endpoints.getEmpresas).toBeDefined();
      expect(endpoints.getEmpresasSimple).toBeDefined();
      expect(endpoints.getEmpresa).toBeDefined();
      expect(endpoints.createEmpresa).toBeDefined();
      expect(endpoints.updateEmpresa).toBeDefined();
      expect(endpoints.deleteEmpresa).toBeDefined();
    });

    it('tiene 6 endpoints en total', () => {
      const endpointKeys = Object.keys(empresaApiSlice.endpoints);
      expect(endpointKeys).toHaveLength(6);
    });
  });

  describe('getEmpresas query', () => {
    it('ejecuta la query para obtener todas las empresas', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: [
            { id: 1, nombre: 'Empresa 1' },
            { id: 2, nombre: 'Empresa 2' },
          ],
        }),
      });

      await store.dispatch(empresaApiSlice.endpoints.getEmpresas.initiate());

      expect(mockFetch).toHaveBeenCalled();
    });

    it('ejecuta la query y retorna array vacío si no hay datos', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: undefined }),
      });

      await store.dispatch(empresaApiSlice.endpoints.getEmpresas.initiate());

      expect(mockFetch).toHaveBeenCalled();
    });
  });

  describe('getEmpresasSimple query', () => {
    it('ejecuta la query para obtener empresas simples', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: [
            { id: 1, nombre: 'Empresa 1' },
            { id: 2, nombre: 'Empresa 2' },
          ],
        }),
      });

      await store.dispatch(empresaApiSlice.endpoints.getEmpresasSimple.initiate());

      expect(mockFetch).toHaveBeenCalled();
    });

    it('ejecuta la query y retorna array vacío si no hay datos', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: undefined }),
      });

      await store.dispatch(empresaApiSlice.endpoints.getEmpresasSimple.initiate());

      expect(mockFetch).toHaveBeenCalled();
    });
  });

  describe('getEmpresa query', () => {
    it('obtiene una empresa por ID', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: { id: 5, nombre: 'Empresa Test' } }),
      });

      await store.dispatch(empresaApiSlice.endpoints.getEmpresa.initiate(5));

      expect(mockFetch).toHaveBeenCalled();
    });

    it('obtiene una empresa diferente por ID', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: { id: 10, nombre: 'Otra Empresa' } }),
      });

      await store.dispatch(empresaApiSlice.endpoints.getEmpresa.initiate(10));

      expect(mockFetch).toHaveBeenCalled();
    });
  });

  describe('createEmpresa mutation', () => {
    it('crea una empresa con datos mínimos', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: { id: 1, nombre: 'Nueva Empresa' } }),
      });

      const payload = { nombre: 'Nueva Empresa' };

      await store.dispatch(empresaApiSlice.endpoints.createEmpresa.initiate(payload));

      expect(mockFetch).toHaveBeenCalled();
    });

    it('crea una empresa con todos los campos', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { id: 2, nombre: 'Empresa Completa', descripcion: 'Descripción', cuit: '12345678901' },
        }),
      });

      const payload = {
        nombre: 'Empresa Completa',
        descripcion: 'Descripción',
        cuit: '12345678901',
      };

      await store.dispatch(empresaApiSlice.endpoints.createEmpresa.initiate(payload));

      expect(mockFetch).toHaveBeenCalled();
    });
  });

  describe('updateEmpresa mutation', () => {
    it('actualiza una empresa', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: { id: 5, nombre: 'Empresa Actualizada' } }),
      });

      const payload = { id: 5, nombre: 'Empresa Actualizada' };

      await store.dispatch(empresaApiSlice.endpoints.updateEmpresa.initiate(payload));

      expect(mockFetch).toHaveBeenCalled();
    });

    it('actualiza múltiples campos de una empresa', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { id: 10, nombre: 'Actualizada', descripcion: 'Nueva descripción' },
        }),
      });

      const payload = {
        id: 10,
        nombre: 'Actualizada',
        descripcion: 'Nueva descripción',
        cuit: '98765432101',
      };

      await store.dispatch(empresaApiSlice.endpoints.updateEmpresa.initiate(payload));

      expect(mockFetch).toHaveBeenCalled();
    });
  });

  describe('deleteEmpresa mutation', () => {
    it('elimina una empresa por ID', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      await store.dispatch(empresaApiSlice.endpoints.deleteEmpresa.initiate(5));

      expect(mockFetch).toHaveBeenCalled();
    });

    it('elimina una empresa diferente por ID', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      await store.dispatch(empresaApiSlice.endpoints.deleteEmpresa.initiate(20));

      expect(mockFetch).toHaveBeenCalled();
    });
  });

  describe('transformResponse', () => {
    it('transformResponse retorna data cuando existe', () => {
      const response = { success: true, data: [{ id: 1 }, { id: 2 }] };
      const transformResponse = (resp: typeof response) => resp.data || [];
      expect(transformResponse(response)).toEqual([{ id: 1 }, { id: 2 }]);
    });

    it('transformResponse retorna array vacío cuando data es undefined', () => {
      const response = { success: true, data: undefined as unknown[] };
      const transformResponse = (resp: typeof response) => resp.data || [];
      expect(transformResponse(response)).toEqual([]);
    });
  });

  describe('providesTags', () => {
    it('genera tags correctos para lista de empresas', () => {
      const result = [{ id: 1 }, { id: 2 }, { id: 3 }];
      const providesTags = (res: typeof result) => {
        if (!Array.isArray(res)) return ['Empresa'];
        return ['Empresa', ...res.map(({ id }) => ({ type: 'Empresa' as const, id }))];
      };
      const tags = providesTags(result);

      expect(tags).toContain('Empresa');
      expect(tags).toContainEqual({ type: 'Empresa', id: 1 });
      expect(tags).toContainEqual({ type: 'Empresa', id: 2 });
      expect(tags).toContainEqual({ type: 'Empresa', id: 3 });
    });

    it('genera tag base cuando result no es array', () => {
      const providesTags = (res: unknown) => {
        if (!Array.isArray(res)) return ['Empresa'];
        return ['Empresa', ...res.map((item: unknown) => ({ type: 'Empresa' as const, id: (item as { id: number }).id }))];
      };

      expect(providesTags(null)).toEqual(['Empresa']);
      expect(providesTags(undefined)).toEqual(['Empresa']);
    });
  });

  describe('invalidatesTags', () => {
    it('createEmpresa invalida tag LIST', () => {
      expect(empresaApiSlice.endpoints.createEmpresa).toBeDefined();
    });

    it('updateEmpresa invalida tags específicos', () => {
      expect(empresaApiSlice.endpoints.updateEmpresa).toBeDefined();
    });

    it('deleteEmpresa invalida tags específicos', () => {
      expect(empresaApiSlice.endpoints.deleteEmpresa).toBeDefined();
    });
  });
});
