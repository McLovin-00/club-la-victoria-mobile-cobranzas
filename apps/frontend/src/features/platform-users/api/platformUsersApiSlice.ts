import { apiSlice } from '../../../store/apiSlice';

export interface PlatformUser {
  id: number;
  email: string;
  role: 'SUPERADMIN' | 'ADMIN' | 'OPERATOR';
  nombre?: string;
  apellido?: string;
  empresaId?: number | null;
  empresa?: { id: number; nombre: string } | null;
  createdAt: string;
  updatedAt: string;
}

export interface RegisterUserPayload {
  email: string;
  password: string;
  role?: 'SUPERADMIN' | 'ADMIN' | 'OPERATOR';
  empresaId?: number;
  nombre?: string;
  apellido?: string;
}

export const platformUsersApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    listPlatformUsers: builder.query<{ success: boolean; data: PlatformUser[]; total: number; page: number; limit: number; totalPages: number }, { page?: number; limit?: number; search?: string; role?: string; empresaId?: number } | void>({
      query: (params) => {
        const p = params || {};
        const qs = new URLSearchParams();
        if (p.page) qs.append('page', String(p.page));
        if (p.limit) qs.append('limit', String(p.limit));
        if (p.search) qs.append('search', p.search);
        if (p.role) qs.append('role', p.role);
        if (p.empresaId) qs.append('empresaId', String(p.empresaId));
        return `/platform/auth/usuarios?${qs.toString()}`;
      },
      providesTags: ['User'],
    }),

    registerPlatformUser: builder.mutation<{ success: boolean; user: PlatformUser }, RegisterUserPayload>({
      query: (payload) => ({
        url: `/platform/auth/register`,
        method: 'POST',
        body: payload,
      }),
      invalidatesTags: ['User'],
    }),

    updatePlatformUser: builder.mutation<{ success: boolean; user: PlatformUser }, { id: number; data: Partial<PlatformUser> }>({
      query: ({ id, data }) => ({
        url: `/platform/auth/users/${id}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: ['User'],
    }),

    deletePlatformUser: builder.mutation<{ success: boolean }, { id: number }>({
      query: ({ id }) => ({
        url: `/platform/auth/users/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['User'],
    }),

    updateUserEmpresa: builder.mutation<{ success: boolean }, { id: number; empresaId: number | null }>({
      query: ({ id, empresaId }) => ({
        url: `/usuarios/${id}/empresa`,
        method: 'PUT',
        body: { empresaId },
      }),
      invalidatesTags: ['User'],
    }),
  }),
});

export const {
  useListPlatformUsersQuery,
  useRegisterPlatformUserMutation,
  useUpdatePlatformUserMutation,
  useDeletePlatformUserMutation,
  useUpdateUserEmpresaMutation,
} = platformUsersApiSlice;


