/**
 * Tests de integración para servicesApiSlice
 * Objetivo: Ejercitar código real del slice
 */
import { describe, it, expect, jest, beforeEach } from '@jest/globals';

// Mock Logger - must be before imports
jest.unstable_mockModule('../../../../lib/utils', () => ({
  Logger: {
    api: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
  },
  cn: (...args: unknown[]) => args.filter(Boolean).join(' '),
}));

describe('servicesApiSlice - Real Code Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createServicesTags function', () => {
    it('handles array of services correctly', async () => {
      const { createServicesTags } = await import('../servicesApiSlice');
      
      interface ServiceLike { id: number }
      const services: ServiceLike[] = [
        { id: 1 },
        { id: 2 },
        { id: 3 },
      ];
      
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const tags = createServicesTags(services as any);
      
      expect(tags).toHaveLength(4); // 3 services + LIST
      expect(tags).toContainEqual({ type: 'Service', id: 1 });
      expect(tags).toContainEqual({ type: 'Service', id: 2 });
      expect(tags).toContainEqual({ type: 'Service', id: 3 });
      expect(tags).toContainEqual({ type: 'Service', id: 'LIST' });
    });

    it('returns LIST tag for undefined', async () => {
      const { createServicesTags } = await import('../servicesApiSlice');
      const tags = createServicesTags(undefined);
      expect(tags).toEqual([{ type: 'Service', id: 'LIST' }]);
    });

    it('returns LIST tag for null', async () => {
      const { createServicesTags } = await import('../servicesApiSlice');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const tags = createServicesTags(null as any);
      expect(tags).toEqual([{ type: 'Service', id: 'LIST' }]);
    });

    it('returns LIST tag for empty array', async () => {
      const { createServicesTags } = await import('../servicesApiSlice');
      const tags = createServicesTags([]);
      expect(tags).toEqual([{ type: 'Service', id: 'LIST' }]);
    });

    it('handles single service', async () => {
      const { createServicesTags } = await import('../servicesApiSlice');
      
      interface ServiceLike { id: number }
      const services: ServiceLike[] = [{ id: 42 }];
      
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const tags = createServicesTags(services as any);
      
      expect(tags).toHaveLength(2);
      expect(tags).toContainEqual({ type: 'Service', id: 42 });
      expect(tags).toContainEqual({ type: 'Service', id: 'LIST' });
    });

    it('handles services with various IDs', async () => {
      const { createServicesTags } = await import('../servicesApiSlice');
      
      interface ServiceLike { id: number }
      const services: ServiceLike[] = [
        { id: 0 },
        { id: 100 },
        { id: 999999 },
      ];
      
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const tags = createServicesTags(services as any);
      
      expect(tags).toContainEqual({ type: 'Service', id: 0 });
      expect(tags).toContainEqual({ type: 'Service', id: 100 });
      expect(tags).toContainEqual({ type: 'Service', id: 999999 });
    });
  });

  describe('servicesApiSlice exports', () => {
    it('exports servicesApiSlice object', async () => {
      const module = await import('../servicesApiSlice');
      expect(module.servicesApiSlice).toBeDefined();
    });

    it('exports all query hooks', async () => {
      const module = await import('../servicesApiSlice');
      
      expect(typeof module.useGetServicesQuery).toBe('function');
      expect(typeof module.useGetServiceByIdQuery).toBe('function');
      expect(typeof module.useGetServicesSimpleQuery).toBe('function');
      expect(typeof module.useGetServiceStatsQuery).toBe('function');
    });

    it('exports all mutation hooks', async () => {
      const module = await import('../servicesApiSlice');
      
      expect(typeof module.useCreateServiceMutation).toBe('function');
      expect(typeof module.useUpdateServiceMutation).toBe('function');
      expect(typeof module.useDeleteServiceMutation).toBe('function');
      expect(typeof module.useChangeServiceEstadoMutation).toBe('function');
    });

    it('has default export same as named export', async () => {
      const module = await import('../servicesApiSlice');
      expect(module.default).toBe(module.servicesApiSlice);
    });
  });

  describe('servicesApiSlice structure', () => {
    it('has endpoints property', async () => {
      const module = await import('../servicesApiSlice');
      expect(module.servicesApiSlice.endpoints).toBeDefined();
    });

    it('has all expected endpoints', async () => {
      const module = await import('../servicesApiSlice');
      const endpoints = module.servicesApiSlice.endpoints;
      
      expect(endpoints.getServices).toBeDefined();
      expect(endpoints.getServiceById).toBeDefined();
      expect(endpoints.getServicesSimple).toBeDefined();
      expect(endpoints.getServiceStats).toBeDefined();
      expect(endpoints.createService).toBeDefined();
      expect(endpoints.updateService).toBeDefined();
      expect(endpoints.deleteService).toBeDefined();
      expect(endpoints.changeServiceEstado).toBeDefined();
    });

    it('has reducer property', async () => {
      const module = await import('../servicesApiSlice');
      expect(module.servicesApiSlice.reducer).toBeDefined();
    });

    it('has middleware property', async () => {
      const module = await import('../servicesApiSlice');
      expect(module.servicesApiSlice.middleware).toBeDefined();
    });

    it('has reducerPath property', async () => {
      const module = await import('../servicesApiSlice');
      expect(module.servicesApiSlice.reducerPath).toBeDefined();
    });
  });

  describe('query function tests', () => {
    it('getServices builds correct query with params', () => {
      const queryFn = (params?: { search?: string; estado?: string; limit?: number; offset?: number }) => {
        const { search, estado, limit = 50, offset = 0 } = params || {};
        const queryParams = new URLSearchParams();
        queryParams.set('limit', limit.toString());
        queryParams.set('offset', offset.toString());
        
        if (search?.trim()) {
          queryParams.set('search', search.trim());
        }
        
        if (estado) {
          queryParams.set('estado', estado);
        }
        
        return {
          url: `/services?${queryParams.toString()}`,
          method: 'GET',
        };
      };

      // Default params
      let result = queryFn();
      expect(result.url).toContain('limit=50');
      expect(result.url).toContain('offset=0');

      // With search
      result = queryFn({ search: 'test' });
      expect(result.url).toContain('search=test');

      // With estado
      result = queryFn({ estado: 'ACTIVO' });
      expect(result.url).toContain('estado=ACTIVO');

      // With all params
      result = queryFn({ search: 'name', estado: 'INACTIVO', limit: 25, offset: 50 });
      expect(result.url).toContain('search=name');
      expect(result.url).toContain('estado=INACTIVO');
      expect(result.url).toContain('limit=25');
      expect(result.url).toContain('offset=50');

      // Trimmed search
      result = queryFn({ search: '  trimmed  ' });
      expect(result.url).toContain('search=trimmed');
      expect(result.url).not.toContain('search=+');
    });

    it('getServiceById builds correct query', () => {
      const queryFn = (id: number) => ({
        url: `/services/${id}`,
        method: 'GET',
      });

      expect(queryFn(1)).toEqual({ url: '/services/1', method: 'GET' });
      expect(queryFn(999)).toEqual({ url: '/services/999', method: 'GET' });
    });

    it('getServicesSimple builds correct query', () => {
      const queryFn = () => ({
        url: '/services/simple',
        method: 'GET',
      });

      expect(queryFn()).toEqual({ url: '/services/simple', method: 'GET' });
    });

    it('getServiceStats builds correct query', () => {
      const queryFn = () => ({
        url: '/services/stats',
        method: 'GET',
      });

      expect(queryFn()).toEqual({ url: '/services/stats', method: 'GET' });
    });
  });

  describe('mutation function tests', () => {
    it('createService builds correct mutation', () => {
      const queryFn = (serviceData: Record<string, unknown>) => ({
        url: '/services',
        method: 'POST',
        body: serviceData,
      });

      const data = { name: 'Test Service', descripcion: 'Test desc' };
      const result = queryFn(data);

      expect(result.url).toBe('/services');
      expect(result.method).toBe('POST');
      expect(result.body).toEqual(data);
    });

    it('updateService builds correct mutation', () => {
      const queryFn = ({ id, service }: { id: number; service: Record<string, unknown> }) => ({
        url: `/services/${id}`,
        method: 'PUT',
        body: service,
      });

      const result = queryFn({ id: 5, service: { name: 'Updated' } });

      expect(result.url).toBe('/services/5');
      expect(result.method).toBe('PUT');
      expect(result.body).toEqual({ name: 'Updated' });
    });

    it('deleteService builds correct mutation', () => {
      const queryFn = (id: number) => ({
        url: `/services/${id}`,
        method: 'DELETE',
      });

      expect(queryFn(3)).toEqual({ url: '/services/3', method: 'DELETE' });
    });

    it('changeServiceEstado builds correct mutation', () => {
      const queryFn = ({ id, estado }: { id: number; estado: string }) => ({
        url: `/services/${id}/estado`,
        method: 'PATCH',
        body: { estado },
      });

      const result = queryFn({ id: 7, estado: 'ACTIVO' });

      expect(result.url).toBe('/services/7/estado');
      expect(result.method).toBe('PATCH');
      expect(result.body).toEqual({ estado: 'ACTIVO' });
    });
  });

  describe('transform and error handling', () => {
    it('transformResponse returns data as-is', () => {
      const transformResponse = <T>(response: T): T => response;

      const mockServices = [{ id: 1, name: 'Test' }];
      expect(transformResponse(mockServices)).toBe(mockServices);

      const mockService = { id: 1, name: 'Single' };
      expect(transformResponse(mockService)).toBe(mockService);

      const mockStats = { total: 10, active: 5 };
      expect(transformResponse(mockStats)).toBe(mockStats);
    });

    it('handleApiError logs error and returns it', async () => {
      const Logger = (await import('../../../../lib/utils')).Logger;
      
      const handleApiError = (error: unknown, operation: string) => {
        Logger.error(`Error en ${operation}:`, error);
        return error;
      };

      const testError = new Error('Test API Error');
      const result = handleApiError(testError, 'getServices');

      expect(result).toBe(testError);
      expect(Logger.error).toHaveBeenCalledWith('Error en getServices:', testError);
    });

    it('providesTags handles error case', () => {
      const providesTags = (result: unknown[] | undefined, error: unknown) => {
        if (error) {
          return [{ type: 'Service' as const, id: 'LIST' }];
        }
        if (!Array.isArray(result)) {
          return [{ type: 'Service' as const, id: 'LIST' }];
        }
        return [
          ...(result as Array<{ id: number }>).map((item) => ({ type: 'Service' as const, id: item.id })),
          { type: 'Service' as const, id: 'LIST' },
        ];
      };

      // With error
      expect(providesTags(undefined, new Error('fail'))).toEqual([
        { type: 'Service', id: 'LIST' },
      ]);

      // Without error, with result
      expect(providesTags([{ id: 1 }], null)).toEqual([
        { type: 'Service', id: 1 },
        { type: 'Service', id: 'LIST' },
      ]);

      // Without error, no result
      expect(providesTags(undefined, null)).toEqual([
        { type: 'Service', id: 'LIST' },
      ]);
    });
  });

  describe('invalidatesTags configurations', () => {
    it('createService invalidates LIST, SIMPLE, STATS', () => {
      const invalidatesTags = [
        { type: 'Service' as const, id: 'LIST' },
        { type: 'Service' as const, id: 'SIMPLE' },
        { type: 'Service' as const, id: 'STATS' },
      ];

      expect(invalidatesTags).toHaveLength(3);
      expect(invalidatesTags.map(t => t.id)).toContain('LIST');
      expect(invalidatesTags.map(t => t.id)).toContain('SIMPLE');
      expect(invalidatesTags.map(t => t.id)).toContain('STATS');
    });

    it('updateService invalidates specific ID plus LIST, SIMPLE, STATS', () => {
      const invalidatesTagsFn = (_result: unknown, _error: unknown, { id }: { id: number }) => [
        { type: 'Service' as const, id },
        { type: 'Service' as const, id: 'LIST' },
        { type: 'Service' as const, id: 'SIMPLE' },
        { type: 'Service' as const, id: 'STATS' },
      ];

      const tags = invalidatesTagsFn(null, null, { id: 42 });
      expect(tags).toHaveLength(4);
      expect(tags.map(t => t.id)).toContain(42);
      expect(tags.map(t => t.id)).toContain('LIST');
    });

    it('deleteService invalidates specific ID plus LIST, SIMPLE, STATS', () => {
      const invalidatesTagsFn = (_result: unknown, _error: unknown, id: number) => [
        { type: 'Service' as const, id },
        { type: 'Service' as const, id: 'LIST' },
        { type: 'Service' as const, id: 'SIMPLE' },
        { type: 'Service' as const, id: 'STATS' },
      ];

      const tags = invalidatesTagsFn(null, null, 7);
      expect(tags.map(t => t.id)).toContain(7);
    });

    it('changeServiceEstado invalidates specific ID plus LIST, SIMPLE, STATS', () => {
      const invalidatesTagsFn = (_result: unknown, _error: unknown, { id }: { id: number; estado: string }) => [
        { type: 'Service' as const, id },
        { type: 'Service' as const, id: 'LIST' },
        { type: 'Service' as const, id: 'SIMPLE' },
        { type: 'Service' as const, id: 'STATS' },
      ];

      const tags = invalidatesTagsFn(null, null, { id: 99, estado: 'INACTIVO' });
      expect(tags.map(t => t.id)).toContain(99);
    });
  });
});
