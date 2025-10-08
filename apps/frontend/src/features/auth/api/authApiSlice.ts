import { apiSlice } from '../../../store/apiSlice';
import { Credentials, LoginResponse, RegisterPayload } from '../types'; // Definiremos estos tipos luego

export const authApiSlice = apiSlice.injectEndpoints({
  endpoints: builder => ({
    login: builder.mutation<LoginResponse, Credentials>({
      query: credentials => ({
        url: '/platform/auth/login',
        method: 'POST',
        body: credentials,
      }),
      transformErrorResponse: response => {
        console.error('Error en login:', response);
        return response;
      },
    }),
    register: builder.mutation<{ message: string }, RegisterPayload>({
      query: userInfo => ({
        url: '/platform/auth/register',
        method: 'POST',
        body: userInfo,
      }),
    }),
    logout: builder.mutation<{ message: string }, void>({
      query: () => ({
        url: '/platform/auth/logout',
        method: 'POST',
      }),
    }),
    refreshToken: builder.mutation<{ token: string }, void>({
      query: () => ({
        url: '/platform/auth/refresh-token',
        method: 'POST',
      }),
    }),
    updateUserEmpresa: builder.mutation<LoginResponse, { empresaId: number | null }>({
      query: payload => ({
        url: '/usuarios/update-empresa',
        method: 'POST',
        body: payload,
      }),
    }),
  }),
});

// Exportar los hooks generados por RTK Query para usarlos en componentes
export const {
  useLoginMutation,
  useRegisterMutation,
  useLogoutMutation,
  useRefreshTokenMutation,
  useUpdateUserEmpresaMutation,
} = authApiSlice;
