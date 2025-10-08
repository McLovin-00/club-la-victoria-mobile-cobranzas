import { apiSlice } from '../../../store/apiSlice';
import { Empresa } from '../types';

export const empresasApiSlice = apiSlice.injectEndpoints({
  endpoints: builder => ({
    getEmpresas: builder.query<Empresa[], void>({
      query: () => '/empresas',
      transformResponse: (response: { success: boolean; data: Empresa[] }) => {
        return response.data || [];
      },
      providesTags: result => {
        if (!Array.isArray(result)) {
          return ['Empresa'];
        }
        return [
          'Empresa',
              ...result.map(({ id }) => ({ type: 'Empresa' as const, id })),
        ];
      },
    }),
    getEmpresaById: builder.query<Empresa, number>({
      query: id => `/empresas/${id}`,
      providesTags: (_result, _error, id) => [{ type: 'Empresa', id }],
    }),
    createEmpresa: builder.mutation<Empresa, Partial<Empresa>>({
      query: empresa => ({
        url: '/empresas',
        method: 'POST',
        body: empresa,
      }),
      invalidatesTags: [{ type: 'Empresa', id: 'LIST' }],
    }),
    updateEmpresa: builder.mutation<Empresa, { id: number; empresa: Partial<Empresa> }>({
      query: ({ id, empresa }) => ({
        url: `/empresas/${id}`,
        method: 'PUT',
        body: empresa,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'Empresa', id },
        { type: 'Empresa', id: 'LIST' },
      ],
    }),
    deleteEmpresa: builder.mutation<void, number>({
      query: id => ({
        url: `/empresas/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_result, _error, id) => [
        { type: 'Empresa', id },
        { type: 'Empresa', id: 'LIST' },
      ],
    }),
  }),
});

export const {
  useGetEmpresasQuery,
  useGetEmpresaByIdQuery,
  useCreateEmpresaMutation,
  useUpdateEmpresaMutation,
  useDeleteEmpresaMutation,
} = empresasApiSlice;
