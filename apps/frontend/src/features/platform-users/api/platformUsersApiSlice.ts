import { apiSlice } from '../../../store/apiSlice';

// Todos los roles del sistema
type UserRole = 'SUPERADMIN' | 'ADMIN' | 'ADMIN_INTERNO' | 'OPERATOR' | 'OPERADOR_INTERNO' | 'DADOR_DE_CARGA' | 'TRANSPORTISTA' | 'CHOFER' | 'CLIENTE';

export interface PlatformUser {
  id: number;
  email: string;
  role: UserRole;
  nombre?: string;
  apellido?: string;
  empresaId?: number | null;
  empresa?: { id: number; nombre: string } | null;
  // Asociaciones por rol
  dadorCargaId?: number | null;
  empresaTransportistaId?: number | null;
  choferId?: number | null;
  clienteId?: number | null;
  creadoPorId?: number | null;
  mustChangePassword?: boolean | null;
  createdAt: string;
  updatedAt: string;
}

export interface RegisterUserPayload {
  email: string;
  password: string;
  role?: UserRole;
  empresaId?: number;
  nombre?: string;
  apellido?: string;
  // Asociaciones por rol
  dadorCargaId?: number;
  empresaTransportistaId?: number;
  choferId?: number;
  clienteId?: number;
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

    registerClientWizard: builder.mutation<
      { success: boolean; user: PlatformUser; tempPassword: string; message?: string },
      { email: string; nombre?: string; apellido?: string; empresaId?: number; clienteId: number }
    >({
      query: (payload) => ({
        url: `/platform/auth/wizard/register-client`,
        method: 'POST',
        body: payload,
      }),
      invalidatesTags: ['User'],
    }),

    registerDadorWizard: builder.mutation<
      { success: boolean; user: PlatformUser; tempPassword: string; message?: string },
      { email: string; nombre?: string; apellido?: string; empresaId?: number; dadorCargaId: number }
    >({
      query: (payload) => ({
        url: `/platform/auth/wizard/register-dador`,
        method: 'POST',
        body: payload,
      }),
      invalidatesTags: ['User'],
    }),

    registerTransportistaWizard: builder.mutation<
      { success: boolean; user: PlatformUser; tempPassword: string; message?: string },
      { email: string; nombre?: string; apellido?: string; empresaId?: number; empresaTransportistaId: number }
    >({
      query: (payload) => ({
        url: `/platform/auth/wizard/register-transportista`,
        method: 'POST',
        body: payload,
      }),
      invalidatesTags: ['User'],
    }),

    registerChoferWizard: builder.mutation<
      { success: boolean; user: PlatformUser; tempPassword: string; message?: string },
      { email: string; nombre?: string; apellido?: string; empresaId?: number; choferId: number }
    >({
      query: (payload) => ({
        url: `/platform/auth/wizard/register-chofer`,
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
  useRegisterClientWizardMutation,
  useRegisterDadorWizardMutation,
  useRegisterTransportistaWizardMutation,
  useRegisterChoferWizardMutation,
  useUpdatePlatformUserMutation,
  useDeletePlatformUserMutation,
  useUpdateUserEmpresaMutation,
} = platformUsersApiSlice;


