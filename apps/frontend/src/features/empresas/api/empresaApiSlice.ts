import { apiSlice } from '../../../store/apiSlice';
import { Empresa } from '../types';

export const empresaApiSlice = apiSlice.injectEndpoints({
  endpoints: builder => ({
    getEmpresas: builder.query<Empresa[], void>({
      query: () => '/empresas',
      transformResponse: (response: { success: boolean; data: Empresa[] }) => {
        return response.data || [];
      },
      providesTags: (result) => {
        if (!Array.isArray(result)) {
          return ['Empresa'];
        }
        return [
          'Empresa',
          ...result.map(({ id }) => ({ type: 'Empresa' as const, id })),
        ];
      },
    }),
    getEmpresasSimple: builder.query<{ id: number; nombre: string }[], void>({
      query: () => '/empresas/simple',
      transformResponse: (response: { success: boolean; data: { id: number; nombre: string }[] }) => {
        return response.data || [];
      },
      providesTags: (result) => {
        if (!Array.isArray(result)) {
          return ['Empresa'];
        }
        return [
          'Empresa',
          ...result.map(({ id }) => ({ type: 'Empresa' as const, id })),
        ];
      },
    }),
    getEmpresa: builder.query<Empresa, number>({
      query: id => `/empresas/${id}`,
      providesTags: (_result, _error, id) => [{ type: 'Empresa', id }],
    }),
    createEmpresa: builder.mutation<Empresa, Partial<Empresa>>({
      query: body => ({
        url: '/empresas',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Empresa'],
    }),
    updateEmpresa: builder.mutation<Empresa, Partial<Empresa>>({
      query: ({ id, ...body }) => ({
        url: `/empresas/${id}`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: (_result, _error, arg) => [{ type: 'Empresa', id: arg.id }],
    }),
    deleteEmpresa: builder.mutation<void, number>({
      query: id => ({
        url: `/empresas/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Empresa'],
    }),
  }),
});

export const {
  useGetEmpresasQuery,
  useGetEmpresasSimpleQuery,
  useGetEmpresaQuery,
  useCreateEmpresaMutation,
  useUpdateEmpresaMutation,
  useDeleteEmpresaMutation,
} = empresaApiSlice;