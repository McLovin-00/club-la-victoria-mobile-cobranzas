import { apiSlice } from '../../../store/apiSlice';
import {
  Service,
  ServiceSimple,
  CreateServicePayload,
  UpdateServicePayload,
  ServicesQueryParams,
  ServiceStats,
  ServiceEstado,
} from '../types';
import { Logger } from '../../../lib/utils';

// Helper para crear tags de cache
const createServicesTags = (services?: Service[]) => {
  if (!Array.isArray(services)) return [{ type: 'Service' as const, id: 'LIST' }];
  return [
    ...services.map(({ id }) => ({ type: 'Service' as const, id })),
    { type: 'Service' as const, id: 'LIST' },
  ];
};

// Helper para manejar errores de API
const handleApiError = (error: unknown, operation: string) => {
  Logger.error(`Error en ${operation}:`, error);
  return error;
};

export const servicesApiSlice = apiSlice.injectEndpoints({
  endpoints: builder => ({
    // Obtener lista de servicios con filtros
    getServices: builder.query<Service[], ServicesQueryParams | void>({
      query: params => {
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
      },
      transformResponse: (response: Service[]) => {
        Logger.api('Respuesta de getServices:', response);
        return response;
      },
      transformErrorResponse: error => handleApiError(error, 'getServices'),
      providesTags: (result, error) => {
        if (error) {
          Logger.warn('Error en getServices, usando tags por defecto:', error);
          return [{ type: 'Service' as const, id: 'LIST' }];
        }
        return createServicesTags(result);
      },
    }),

    // Obtener servicio por ID
    getServiceById: builder.query<Service, number>({
      query: id => ({
        url: `/services/${id}`,
        method: 'GET',
      }),
      transformResponse: (response: Service) => {
        Logger.api('Respuesta de getServiceById:', response);
        return response;
      },
      transformErrorResponse: error => handleApiError(error, 'getServiceById'),
      providesTags: (_result, _error, id) => [{ type: 'Service', id }],
    }),

    // Obtener servicios simples para dropdowns
    getServicesSimple: builder.query<ServiceSimple[], void>({
      query: () => ({
        url: '/services/simple',
        method: 'GET',
      }),
      transformResponse: (response: ServiceSimple[]) => {
        Logger.api('Respuesta de getServicesSimple:', response);
        return response;
      },
      transformErrorResponse: error => handleApiError(error, 'getServicesSimple'),
      providesTags: [{ type: 'Service', id: 'SIMPLE' }],
    }),

    // Obtener estadísticas de servicios
    getServiceStats: builder.query<ServiceStats, void>({
      query: () => ({
        url: '/services/stats',
        method: 'GET',
      }),
      transformResponse: (response: ServiceStats) => {
        Logger.api('Respuesta de getServiceStats:', response);
        return response;
      },
      transformErrorResponse: error => handleApiError(error, 'getServiceStats'),
      providesTags: [{ type: 'Service', id: 'STATS' }],
    }),

    // Crear nuevo servicio
    createService: builder.mutation<Service, CreateServicePayload>({
      query: serviceData => ({
        url: '/services',
        method: 'POST',
        body: serviceData,
      }),
      transformResponse: (response: Service) => {
        Logger.api('Respuesta de createService:', response);
        return response;
      },
      transformErrorResponse: error => handleApiError(error, 'createService'),
      invalidatesTags: [
        { type: 'Service', id: 'LIST' },
        { type: 'Service', id: 'SIMPLE' },
        { type: 'Service', id: 'STATS' },
      ],
    }),

    // Actualizar servicio
    updateService: builder.mutation<Service, { id: number; service: UpdateServicePayload }>({
      query: ({ id, service }) => ({
        url: `/services/${id}`,
        method: 'PUT',
        body: service,
      }),
      transformResponse: (response: Service) => {
        Logger.api('Respuesta de updateService:', response);
        return response;
      },
      transformErrorResponse: error => handleApiError(error, 'updateService'),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'Service', id },
        { type: 'Service', id: 'LIST' },
        { type: 'Service', id: 'SIMPLE' },
        { type: 'Service', id: 'STATS' },
      ],
    }),

    // Eliminar servicio
    deleteService: builder.mutation<void, number>({
      query: id => ({
        url: `/services/${id}`,
        method: 'DELETE',
      }),
      transformErrorResponse: error => handleApiError(error, 'deleteService'),
      invalidatesTags: (_result, _error, id) => [
        { type: 'Service', id },
        { type: 'Service', id: 'LIST' },
        { type: 'Service', id: 'SIMPLE' },
        { type: 'Service', id: 'STATS' },
      ],
    }),

    // Cambiar estado de servicio
    changeServiceEstado: builder.mutation<Service, { id: number; estado: ServiceEstado }>({
      query: ({ id, estado }) => ({
        url: `/services/${id}/estado`,
        method: 'PATCH',
        body: { estado },
      }),
      transformResponse: (response: Service) => {
        Logger.api('Respuesta de changeServiceEstado:', response);
        return response;
      },
      transformErrorResponse: error => handleApiError(error, 'changeServiceEstado'),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'Service', id },
        { type: 'Service', id: 'LIST' },
        { type: 'Service', id: 'SIMPLE' },
        { type: 'Service', id: 'STATS' },
      ],
    }),
  }),
});

// Exportar hooks generados
export const {
  useGetServicesQuery,
  useGetServiceByIdQuery,
  useGetServicesSimpleQuery,
  useGetServiceStatsQuery,
  useCreateServiceMutation,
  useUpdateServiceMutation,
  useDeleteServiceMutation,
  useChangeServiceEstadoMutation,
} = servicesApiSlice;

// Exportar utilidades
export { createServicesTags };
export default servicesApiSlice; 