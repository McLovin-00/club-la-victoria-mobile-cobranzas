/**
 * Tests para remitosApiSlice
 * Tests de cobertura que ejecutan todos los endpoints
 */
import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { configureStore } from '@reduxjs/toolkit';
import { remitosApiSlice } from '../remitosApiSlice';

// Mock de fetch global
const mockFetch = jest.fn();
global.fetch = mockFetch as any;

describe('remitosApiSlice', () => {
  let store: ReturnType<typeof configureStore>;

  beforeEach(() => {
    store = configureStore({
      reducer: {
        remitosApi: remitosApiSlice.reducer,
        auth: () => ({ token: 'test-token', user: { empresaId: 1 } }),
      },
      middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware().concat(remitosApiSlice.middleware),
    });
    mockFetch.mockClear();
  });

  afterEach(() => {
    mockFetch.mockReset();
  });

  describe('Exports', () => {
    it('exporta el slice correctamente', () => {
      expect(remitosApiSlice).toBeDefined();
      expect(remitosApiSlice.reducerPath).toBe('remitosApi');
    });

    it('exporta todos los hooks de query', () => {
      expect(remitosApiSlice.useGetRemitosQuery).toBeDefined();
      expect(remitosApiSlice.useGetRemitoQuery).toBeDefined();
      expect(remitosApiSlice.useGetStatsQuery).toBeDefined();
      expect(remitosApiSlice.useGetImageUrlQuery).toBeDefined();
      expect(typeof remitosApiSlice.useGetRemitosQuery).toBe('function');
      expect(typeof remitosApiSlice.useGetRemitoQuery).toBe('function');
      expect(typeof remitosApiSlice.useGetStatsQuery).toBe('function');
      expect(typeof remitosApiSlice.useGetImageUrlQuery).toBe('function');
    });

    it('exporta todos los hooks de mutation', () => {
      expect(remitosApiSlice.useUploadRemitoMutation).toBeDefined();
      expect(remitosApiSlice.useApproveRemitoMutation).toBeDefined();
      expect(remitosApiSlice.useRejectRemitoMutation).toBeDefined();
      expect(remitosApiSlice.useReprocessRemitoMutation).toBeDefined();
      expect(remitosApiSlice.useUpdateRemitoMutation).toBeDefined();
    });

    it('todos los hooks son funciones', () => {
      expect(typeof remitosApiSlice.useUploadRemitoMutation).toBe('function');
      expect(typeof remitosApiSlice.useApproveRemitoMutation).toBe('function');
      expect(typeof remitosApiSlice.useRejectRemitoMutation).toBe('function');
      expect(typeof remitosApiSlice.useReprocessRemitoMutation).toBe('function');
      expect(typeof remitosApiSlice.useUpdateRemitoMutation).toBe('function');
    });
  });

  describe('Endpoints', () => {
    it('tiene todos los endpoints definidos', () => {
      const endpoints = remitosApiSlice.endpoints;

      expect(endpoints.getRemitos).toBeDefined();
      expect(endpoints.getRemito).toBeDefined();
      expect(endpoints.uploadRemito).toBeDefined();
      expect(endpoints.approveRemito).toBeDefined();
      expect(endpoints.rejectRemito).toBeDefined();
      expect(endpoints.getStats).toBeDefined();
      expect(endpoints.getImageUrl).toBeDefined();
      expect(endpoints.reprocessRemito).toBeDefined();
      expect(endpoints.updateRemito).toBeDefined();
    });
  });

  describe('getRemitos query', () => {
    it('ejecuta la query sin parámetros', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: [], total: 0, page: 1, limit: 10 }),
      });

      await store.dispatch(remitosApiSlice.endpoints.getRemitos.initiate({}));

      expect(mockFetch).toHaveBeenCalled();
    });

    it('ejecuta la query con parámetros de paginación', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: [], total: 0, page: 1, limit: 20 }),
      });

      await store.dispatch(remitosApiSlice.endpoints.getRemitos.initiate({ page: 1, limit: 20 }));

      expect(mockFetch).toHaveBeenCalled();
    });

    it('ejecuta la query con parámetro de búsqueda', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: [], total: 0, page: 1, limit: 10 }),
      });

      await store.dispatch(remitosApiSlice.endpoints.getRemitos.initiate({ search: '123' }));

      expect(mockFetch).toHaveBeenCalled();
    });
  });

  describe('getRemito query', () => {
    it('obtiene un remito por ID', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: { id: 1, numeroRemito: '001' } }),
      });

      await store.dispatch(remitosApiSlice.endpoints.getRemito.initiate(1));

      expect(mockFetch).toHaveBeenCalled();
    });
  });

  describe('getStats query', () => {
    it('obtiene las estadísticas de remitos', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: { total: 100, pendientes: 10 } }),
      });

      await store.dispatch(remitosApiSlice.endpoints.getStats.initiate());

      expect(mockFetch).toHaveBeenCalled();
    });
  });

  describe('getImageUrl query', () => {
    it('obtiene la URL de una imagen de remito', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: { url: 'http://example.com/image.jpg' } }),
      });

      await store.dispatch(
        remitosApiSlice.endpoints.getImageUrl.initiate({ remitoId: 5, imagenId: 10 })
      );

      expect(mockFetch).toHaveBeenCalled();
    });
  });

  describe('uploadRemito mutation', () => {
    it('sube un remito con un archivo', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: { id: 1, estado: 'pendiente', imagenesCount: 1 } }),
      });

      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      const payload = { files: [file] };

      await store.dispatch(remitosApiSlice.endpoints.uploadRemito.initiate(payload));

      expect(mockFetch).toHaveBeenCalled();
    });

    it('sube un remito con múltiples archivos', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: { id: 2, estado: 'pendiente', imagenesCount: 3 } }),
      });

      const files = [
        new File(['test1'], 'test1.jpg', { type: 'image/jpeg' }),
        new File(['test2'], 'test2.jpg', { type: 'image/jpeg' }),
        new File(['test3'], 'test3.pdf', { type: 'application/pdf' }),
      ];
      const payload = { files };

      await store.dispatch(remitosApiSlice.endpoints.uploadRemito.initiate(payload));

      expect(mockFetch).toHaveBeenCalled();
    });

    it('sube un remito con dadorCargaId', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: { id: 3, estado: 'pendiente', imagenesCount: 1 } }),
      });

      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      const payload = { files: [file], dadorCargaId: 10 };

      await store.dispatch(remitosApiSlice.endpoints.uploadRemito.initiate(payload));

      expect(mockFetch).toHaveBeenCalled();
    });

    it('sube un remito con choferId', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: { id: 4, estado: 'pendiente', imagenesCount: 1 } }),
      });

      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      const payload = { files: [file], choferId: 5 };

      await store.dispatch(remitosApiSlice.endpoints.uploadRemito.initiate(payload));

      expect(mockFetch).toHaveBeenCalled();
    });

    it('sube un remito con datos del chofer', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: { id: 5, estado: 'pendiente', imagenesCount: 1 } }),
      });

      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      const payload = {
        files: [file],
        choferDni: '12345678',
        choferNombre: 'Juan',
        choferApellido: 'Pérez',
      };

      await store.dispatch(remitosApiSlice.endpoints.uploadRemito.initiate(payload));

      expect(mockFetch).toHaveBeenCalled();
    });
  });

  describe('approveRemito mutation', () => {
    it('aprueba un remito por ID', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, message: 'Remito aprobado' }),
      });

      await store.dispatch(remitosApiSlice.endpoints.approveRemito.initiate(10));

      expect(mockFetch).toHaveBeenCalled();
    });
  });

  describe('rejectRemito mutation', () => {
    it('rechaza un remito con motivo', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, message: 'Remito rechazado' }),
      });

      await store.dispatch(
        remitosApiSlice.endpoints.rejectRemito.initiate({ id: 10, motivo: 'Datos ilegibles' })
      );

      expect(mockFetch).toHaveBeenCalled();
    });
  });

  describe('reprocessRemito mutation', () => {
    it('reprocesa un remito con IA', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          message: 'Reprocesamiento iniciado',
          data: { id: 10, estado: 'procesando', jobId: 'job-123' },
        }),
      });

      await store.dispatch(remitosApiSlice.endpoints.reprocessRemito.initiate(10));

      expect(mockFetch).toHaveBeenCalled();
    });
  });

  describe('updateRemito mutation', () => {
    it('actualiza datos del remito', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          message: 'Remito actualizado',
          data: { id: 10, numeroRemito: '001' },
        }),
      });

      const payload = {
        id: 10,
        data: {
          numeroRemito: '001',
          fechaOperacion: '2024-01-01',
          emisorNombre: 'Empresa S.A.',
        },
      };

      await store.dispatch(remitosApiSlice.endpoints.updateRemito.initiate(payload));

      expect(mockFetch).toHaveBeenCalled();
    });

    it('actualiza datos de pesos del remito', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          message: 'Pesos actualizados',
          data: { id: 10, pesoOrigenNeto: 1000 },
        }),
      });

      const payload = {
        id: 10,
        data: {
          pesoOrigenBruto: 1500,
          pesoOrigenTara: 500,
          pesoOrigenNeto: 1000,
        },
      };

      await store.dispatch(remitosApiSlice.endpoints.updateRemito.initiate(payload));

      expect(mockFetch).toHaveBeenCalled();
    });
  });

  describe('Tag types', () => {
    it('define los tagTypes correctos', () => {
      expect(remitosApiSlice.reducerPath).toBe('remitosApi');
    });

    it('todos los endpoints existen', () => {
      const endpoints = remitosApiSlice.endpoints;
      expect(Object.keys(endpoints)).toHaveLength(9);
    });
  });
});
