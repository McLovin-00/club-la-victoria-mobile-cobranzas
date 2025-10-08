import { apiSlice } from '../../../store/apiSlice';

export interface EndUser {
  id: number;
  email: string;
  empresaId?: number | null;
  empresa?: { id: number; nombre: string; descripcion?: string | null } | null;
  identifierType: 'email' | 'whatsapp' | 'telegram' | 'facebook';
  identifier_value: string;
  is_active: boolean;
  nombre?: string | null;
  apellido?: string | null;
  contacto?: string | null;
  createdAt: string;
}

export const endUsersApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    listEndUsers: builder.query<{ success: boolean; data: EndUser[]; pagination?: any }, { search?: string; empresaId?: number; identifierType?: string; isActive?: boolean; page?: number; limit?: number } | void>({
      query: (params) => {
        const p = params || {};
        const qs = new URLSearchParams();
        if (p.search) qs.append('search', p.search);
        if (p.empresaId) qs.append('empresaId', String(p.empresaId));
        if (p.identifierType) qs.append('identifierType', p.identifierType);
        if (p.isActive !== undefined) qs.append('isActive', String(p.isActive));
        if (p.page) qs.append('page', String(p.page));
        if (p.limit) qs.append('limit', String(p.limit));
        return `/end-users?${qs.toString()}`;
      },
      providesTags: ['User'],
    }),

    createEndUser: builder.mutation<{ success: boolean; data: EndUser }, any>({
      query: (payload) => ({
        url: `/end-users`,
        method: 'POST',
        body: payload,
      }),
      invalidatesTags: ['User'],
    }),

    updateEndUser: builder.mutation<{ success: boolean; data: EndUser }, { id: number; data: any }>({
      query: ({ id, data }) => ({
        url: `/end-users/${id}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: ['User'],
    }),

    deleteEndUser: builder.mutation<{ success: boolean }, { id: number }>({
      query: ({ id }) => ({
        url: `/end-users/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['User'],
    }),
  }),
});

export const { useListEndUsersQuery, useCreateEndUserMutation, useUpdateEndUserMutation, useDeleteEndUserMutation } = endUsersApiSlice;


