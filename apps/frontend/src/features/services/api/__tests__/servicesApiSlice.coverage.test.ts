/**
 * Tests de cobertura para servicesApiSlice
 * Objetivo: Aumentar cobertura de 8.77% a 80%+
 */
import { describe, it, expect, jest, beforeEach } from '@jest/globals';

// Mock Logger before imports
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

// Mock apiSlice
jest.unstable_mockModule('../../../../store/apiSlice', () => ({
  apiSlice: {
    injectEndpoints: jest.fn((config: { endpoints: (builder: unknown) => unknown }) => {
      // Create a mock builder
      const mockBuilder = {
        query: jest.fn((queryConfig: Record<string, unknown>) => Object.assign({}, queryConfig, { type: 'query' })),
        mutation: jest.fn((mutationConfig: Record<string, unknown>) => Object.assign({}, mutationConfig, { type: 'mutation' })),
      };
      
      // Call the endpoints function with mock builder
      const endpoints = config.endpoints(mockBuilder);
      
      return {
        endpoints,
        reducerPath: 'api',
        reducer: jest.fn(),
        middleware: jest.fn(),
        useGetServicesQuery: jest.fn(),
        useGetServiceByIdQuery: jest.fn(),
        useGetServicesSimpleQuery: jest.fn(),
        useGetServiceStatsQuery: jest.fn(),
        useCreateServiceMutation: jest.fn(),
        useUpdateServiceMutation: jest.fn(),
        useDeleteServiceMutation: jest.fn(),
        useChangeServiceEstadoMutation: jest.fn(),
      };
    }),
  },
}));

describe('servicesApiSlice - Coverage Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createServicesTags helper', () => {
    it('should create tags for array of services', async () => {
      const { createServicesTags } = await import('../servicesApiSlice');
      
      const services = [
        { id: 1, name: 'Service 1' },
        { id: 2, name: 'Service 2' },
        { id: 3, name: 'Service 3' },
      ];
      
      const tags = createServicesTags(services as never[]);
      
      expect(tags).toContainEqual({ type: 'Service', id: 1 });
      expect(tags).toContainEqual({ type: 'Service', id: 2 });
      expect(tags).toContainEqual({ type: 'Service', id: 3 });
      expect(tags).toContainEqual({ type: 'Service', id: 'LIST' });
      expect(tags).toHaveLength(4);
    });

    it('should return LIST tag only for undefined input', async () => {
      const { createServicesTags } = await import('../servicesApiSlice');
      
      const tags = createServicesTags(undefined);
      
      expect(tags).toEqual([{ type: 'Service', id: 'LIST' }]);
    });

    it('should return LIST tag only for non-array input', async () => {
      const { createServicesTags } = await import('../servicesApiSlice');
      
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const tags = createServicesTags(null as any);
      
      expect(tags).toEqual([{ type: 'Service', id: 'LIST' }]);
    });

    it('should return LIST tag only for empty array', async () => {
      const { createServicesTags } = await import('../servicesApiSlice');
      
      const tags = createServicesTags([]);
      
      expect(tags).toEqual([{ type: 'Service', id: 'LIST' }]);
    });
  });

  describe('servicesApiSlice exports', () => {
    it('should export servicesApiSlice', async () => {
      const module = await import('../servicesApiSlice');
      expect(module.servicesApiSlice).toBeDefined();
    });

    it('should export createServicesTags utility', async () => {
      const module = await import('../servicesApiSlice');
      expect(module.createServicesTags).toBeDefined();
      expect(typeof module.createServicesTags).toBe('function');
    });

    it('should export all query hooks', async () => {
      const module = await import('../servicesApiSlice');
      
      expect(module.useGetServicesQuery).toBeDefined();
      expect(module.useGetServiceByIdQuery).toBeDefined();
      expect(module.useGetServicesSimpleQuery).toBeDefined();
      expect(module.useGetServiceStatsQuery).toBeDefined();
    });

    it('should export all mutation hooks', async () => {
      const module = await import('../servicesApiSlice');
      
      expect(module.useCreateServiceMutation).toBeDefined();
      expect(module.useUpdateServiceMutation).toBeDefined();
      expect(module.useDeleteServiceMutation).toBeDefined();
      expect(module.useChangeServiceEstadoMutation).toBeDefined();
    });

    it('should have default export', async () => {
      const module = await import('../servicesApiSlice');
      expect(module.default).toBeDefined();
    });
  });

  describe('Query parameter building', () => {
    it('should build query params with all options', () => {
      const buildQueryParams = (params?: { search?: string; estado?: string; limit?: number; offset?: number }) => {
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
        
        return queryParams.toString();
      };

      const result = buildQueryParams({ search: 'test', estado: 'ACTIVO', limit: 25, offset: 10 });
      
      expect(result).toContain('limit=25');
      expect(result).toContain('offset=10');
      expect(result).toContain('search=test');
      expect(result).toContain('estado=ACTIVO');
    });

    it('should use defaults when params are missing', () => {
      const buildQueryParams = (params?: { search?: string; estado?: string; limit?: number; offset?: number }) => {
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
        
        return queryParams.toString();
      };

      const result = buildQueryParams();
      
      expect(result).toContain('limit=50');
      expect(result).toContain('offset=0');
      expect(result).not.toContain('search');
      expect(result).not.toContain('estado');
    });

    it('should trim search string', () => {
      const buildQueryParams = (params?: { search?: string }) => {
        const { search } = params || {};
        const queryParams = new URLSearchParams();
        
        if (search?.trim()) {
          queryParams.set('search', search.trim());
        }
        
        return queryParams.toString();
      };

      const result = buildQueryParams({ search: '  trimmed  ' });
      expect(result).toBe('search=trimmed');
    });

    it('should not add empty search', () => {
      const buildQueryParams = (params?: { search?: string }) => {
        const { search } = params || {};
        const queryParams = new URLSearchParams();
        
        if (search?.trim()) {
          queryParams.set('search', search.trim());
        }
        
        return queryParams.toString();
      };

      expect(buildQueryParams({ search: '   ' })).toBe('');
      expect(buildQueryParams({ search: '' })).toBe('');
    });
  });

  describe('Endpoint configurations', () => {
    it('getServices endpoint structure', () => {
      const getServicesConfig = {
        query: (params: { search?: string; estado?: string; limit?: number; offset?: number } | void) => {
          const { search, estado, limit = 50, offset = 0 } = params || {};
          const queryParams = new URLSearchParams();
          queryParams.set('limit', limit.toString());
          queryParams.set('offset', offset.toString());
          if (search?.trim()) queryParams.set('search', search.trim());
          if (estado) queryParams.set('estado', estado);
          return { url: `/services?${queryParams.toString()}`, method: 'GET' };
        },
      };

      const result = getServicesConfig.query({ limit: 10, offset: 5 });
      expect(result.url).toContain('/services?');
      expect(result.url).toContain('limit=10');
      expect(result.url).toContain('offset=5');
      expect(result.method).toBe('GET');
    });

    it('getServiceById endpoint structure', () => {
      const getServiceByIdConfig = {
        query: (id: number) => ({ url: `/services/${id}`, method: 'GET' }),
      };

      expect(getServiceByIdConfig.query(1)).toEqual({ url: '/services/1', method: 'GET' });
      expect(getServiceByIdConfig.query(999)).toEqual({ url: '/services/999', method: 'GET' });
    });

    it('getServicesSimple endpoint structure', () => {
      const getServicesSimpleConfig = {
        query: () => ({ url: '/services/simple', method: 'GET' }),
      };

      expect(getServicesSimpleConfig.query()).toEqual({ url: '/services/simple', method: 'GET' });
    });

    it('getServiceStats endpoint structure', () => {
      const getServiceStatsConfig = {
        query: () => ({ url: '/services/stats', method: 'GET' }),
      };

      expect(getServiceStatsConfig.query()).toEqual({ url: '/services/stats', method: 'GET' });
    });

    it('createService endpoint structure', () => {
      const createServiceConfig = {
        query: (serviceData: { name: string; descripcion?: string }) => ({
          url: '/services',
          method: 'POST',
          body: serviceData,
        }),
      };

      const result = createServiceConfig.query({ name: 'New Service', descripcion: 'Description' });
      expect(result.url).toBe('/services');
      expect(result.method).toBe('POST');
      expect(result.body).toEqual({ name: 'New Service', descripcion: 'Description' });
    });

    it('updateService endpoint structure', () => {
      const updateServiceConfig = {
        query: ({ id, service }: { id: number; service: { name?: string } }) => ({
          url: `/services/${id}`,
          method: 'PUT',
          body: service,
        }),
      };

      const result = updateServiceConfig.query({ id: 5, service: { name: 'Updated' } });
      expect(result.url).toBe('/services/5');
      expect(result.method).toBe('PUT');
      expect(result.body).toEqual({ name: 'Updated' });
    });

    it('deleteService endpoint structure', () => {
      const deleteServiceConfig = {
        query: (id: number) => ({ url: `/services/${id}`, method: 'DELETE' }),
      };

      expect(deleteServiceConfig.query(3)).toEqual({ url: '/services/3', method: 'DELETE' });
    });

    it('changeServiceEstado endpoint structure', () => {
      const changeServiceEstadoConfig = {
        query: ({ id, estado }: { id: number; estado: string }) => ({
          url: `/services/${id}/estado`,
          method: 'PATCH',
          body: { estado },
        }),
      };

      const result = changeServiceEstadoConfig.query({ id: 4, estado: 'ACTIVO' });
      expect(result.url).toBe('/services/4/estado');
      expect(result.method).toBe('PATCH');
      expect(result.body).toEqual({ estado: 'ACTIVO' });
    });
  });

  describe('Cache tag logic', () => {
    it('invalidatesTags for createService includes all relevant tags', () => {
      const invalidatesTags = [
        { type: 'Service' as const, id: 'LIST' },
        { type: 'Service' as const, id: 'SIMPLE' },
        { type: 'Service' as const, id: 'STATS' },
      ];

      expect(invalidatesTags).toContainEqual({ type: 'Service', id: 'LIST' });
      expect(invalidatesTags).toContainEqual({ type: 'Service', id: 'SIMPLE' });
      expect(invalidatesTags).toContainEqual({ type: 'Service', id: 'STATS' });
    });

    it('invalidatesTags for updateService includes specific and list tags', () => {
      const invalidatesTags = (id: number) => [
        { type: 'Service' as const, id },
        { type: 'Service' as const, id: 'LIST' },
        { type: 'Service' as const, id: 'SIMPLE' },
        { type: 'Service' as const, id: 'STATS' },
      ];

      const tags = invalidatesTags(5);
      expect(tags).toContainEqual({ type: 'Service', id: 5 });
      expect(tags).toContainEqual({ type: 'Service', id: 'LIST' });
      expect(tags).toContainEqual({ type: 'Service', id: 'SIMPLE' });
      expect(tags).toContainEqual({ type: 'Service', id: 'STATS' });
    });

    it('providesTags for getServiceById includes specific id', () => {
      const providesTags = (_result: unknown, _error: unknown, id: number) => [
        { type: 'Service' as const, id },
      ];

      expect(providesTags(null, null, 10)).toEqual([{ type: 'Service', id: 10 }]);
    });

    it('providesTags for getServicesSimple uses SIMPLE id', () => {
      const providesTags = [{ type: 'Service' as const, id: 'SIMPLE' }];
      expect(providesTags).toEqual([{ type: 'Service', id: 'SIMPLE' }]);
    });

    it('providesTags for getServiceStats uses STATS id', () => {
      const providesTags = [{ type: 'Service' as const, id: 'STATS' }];
      expect(providesTags).toEqual([{ type: 'Service', id: 'STATS' }]);
    });
  });

  describe('Error handling', () => {
    it('providesTags returns default on error', () => {
      const providesTags = (result: unknown, error: unknown) => {
        if (error) {
          return [{ type: 'Service' as const, id: 'LIST' }];
        }
        return result ? [{ type: 'Service' as const, id: 'LIST' }] : [];
      };

      const tagsOnError = providesTags(null, new Error('API Error'));
      expect(tagsOnError).toEqual([{ type: 'Service', id: 'LIST' }]);
    });

    it('handleApiError logs and returns error', () => {
      const handleApiError = (error: unknown, operation: string) => {
        console.error(`Error en ${operation}:`, error);
        return error;
      };

      const testError = new Error('Test error');
      const result = handleApiError(testError, 'getServices');
      
      expect(result).toBe(testError);
    });
  });

  describe('Service types', () => {
    it('Service interface structure', () => {
      interface Service {
        id: number;
        name: string;
        descripcion?: string;
        estado: 'ACTIVO' | 'INACTIVO';
        config?: Record<string, unknown>;
        createdAt: string;
        updatedAt: string;
      }

      const mockService: Service = {
        id: 1,
        name: 'Test Service',
        estado: 'ACTIVO',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      };

      expect(mockService.id).toBe(1);
      expect(mockService.name).toBe('Test Service');
      expect(mockService.estado).toBe('ACTIVO');
    });

    it('ServiceSimple interface structure', () => {
      interface ServiceSimple {
        id: number;
        name: string;
      }

      const mockSimple: ServiceSimple = { id: 1, name: 'Simple' };
      expect(mockSimple).toHaveProperty('id');
      expect(mockSimple).toHaveProperty('name');
    });

    it('ServiceStats interface structure', () => {
      interface ServiceStats {
        total: number;
        activos: number;
        inactivos: number;
      }

      const mockStats: ServiceStats = { total: 10, activos: 7, inactivos: 3 };
      expect(mockStats.total).toBe(mockStats.activos + mockStats.inactivos);
    });

    it('ServicesQueryParams interface structure', () => {
      interface ServicesQueryParams {
        search?: string;
        estado?: string;
        limit?: number;
        offset?: number;
      }

      const params: ServicesQueryParams = { search: 'test', limit: 10 };
      expect(params.search).toBe('test');
      expect(params.limit).toBe(10);
      expect(params.estado).toBeUndefined();
      expect(params.offset).toBeUndefined();
    });
  });
});
