import { apiSlice } from '../../../store/apiSlice';
import {
  User,
  CreateUserPayload,
  UpdateUserPayload,
  UsersResponse,
  UserResponse,
  UsersQueryParams,
  CheckEmailResponse,
} from '../types';
import { Logger } from '../../../lib/utils';

// Helper para manejar errores de API
const handleApiError = (error: unknown, operation: string) => {
  Logger.error(`Error en ${operation}:`, error);
  return error;
};

// Helper para procesar datos antes de enviar
const processUserData = (userData: CreateUserPayload | UpdateUserPayload) => {
  const processed = { ...userData };

  // Convertir empresaId a número si es string
  if (processed.empresaId && typeof processed.empresaId === 'string') {
    processed.empresaId = parseInt(processed.empresaId, 10);
  }

  // Asegurar que empresaId sea null si es 0 o undefined
  if (!processed.empresaId) {
    processed.empresaId = null;
  }

  Logger.api('Datos procesados para envío:', processed);
  return processed;
};

// Helper para crear tags de cache
const createUsersTags = (users?: User[]) => {
  if (!Array.isArray(users)) {
    return [{ type: 'User' as const, id: 'LIST' }];
  }

  return [
    { type: 'User' as const, id: 'LIST' },
    ...users.map(user => ({ type: 'User' as const, id: user.id })),
  ];
};

export const usersApiSlice = apiSlice.injectEndpoints({
  endpoints: builder => ({
    // Obtener lista de usuarios con filtros y paginación
    getUsuarios: builder.query<UsersResponse, UsersQueryParams | void>({
      query: params => {
        const { page = 1, limit = 10, search = '', role, empresaId } = params || {};

        const queryParams = new URLSearchParams();
        queryParams.set('page', page.toString());
        queryParams.set('limit', limit.toString());

        if (search.trim()) {
          queryParams.set('search', search.trim());
        }

        if (role) {
          queryParams.set('role', role);
        }

        if (empresaId) {
          queryParams.set('empresaId', empresaId.toString());
        }

        return {
          url: `/usuarios?${queryParams.toString()}`,
          method: 'GET',
        };
      },
      transformResponse: (response: UsersResponse) => {
        Logger.api('Respuesta de getUsuarios:', response);

        // Validar estructura de respuesta
        if (!response || !response.success || !Array.isArray(response.data)) {
          Logger.warn('Respuesta de usuarios inválida:', response);
          throw new Error('Error al obtener usuarios: respuesta inválida');
        }

        return response;
      },
      transformErrorResponse: error => handleApiError(error, 'getUsuarios'),
      providesTags: (result, error) => {
        if (error) {
          Logger.warn('Error en getUsuarios, usando tags por defecto:', error);
          return [{ type: 'User' as const, id: 'LIST' }];
        }

        return createUsersTags(result?.data);
      },
    }),

    // Obtener usuario por ID
    getUsuarioById: builder.query<UserResponse, string | number>({
      query: id => ({
        url: `/usuarios/${id}`,
        method: 'GET',
      }),
      transformResponse: (response: UserResponse) => {
        Logger.api(`Respuesta de getUsuarioById(${response.data?.id}):`, response);

        if (!response || !response.success || !response.data) {
          Logger.warn('Usuario obtenido es inválido:', response);
          throw new Error('Error al obtener usuario: respuesta inválida');
        }

        return response;
      },
      transformErrorResponse: error => handleApiError(error, 'getUsuarioById'),
              providesTags: (_result, error, id) => {
          if (error) {
            Logger.warn(`Error obteniendo usuario ${id}:`, error);
            return [];
          }
          return [{ type: 'User' as const, id }];
        },
    }),

    // Crear nuevo usuario
    createUser: builder.mutation<UserResponse, CreateUserPayload>({
      query: userData => {
        const processedData = processUserData(userData);

        return {
          url: '/usuarios',
          method: 'POST',
          body: processedData,
        };
      },
      transformResponse: (response: UserResponse) => {
        Logger.api('Usuario creado exitosamente:', response);

        // Validar estructura básica de respuesta
        if (!response || !response.success || !response.data) {
          Logger.warn('Respuesta de creación de usuario inválida:', response);
          throw new Error('Error al crear usuario: respuesta inválida');
        }

        // Validar que el usuario tenga ID (indica creación exitosa)
        if (!response.data.id) {
          Logger.warn('Usuario creado sin ID válido:', response);
          throw new Error('Error al crear usuario: ID no válido');
        }

        return response;
      },
      transformErrorResponse: error => handleApiError(error, 'createUser'),
      invalidatesTags: [{ type: 'User' as const, id: 'LIST' }],
    }),

    // Actualizar usuario existente
    updateUser: builder.mutation<UserResponse, { id: number; data: UpdateUserPayload }>({
      query: ({ id, data }) => {
        const processedData = processUserData(data);

        return {
          url: `/usuarios/${id}`,
          method: 'PATCH',
          body: processedData,
        };
      },
      transformResponse: (response: UserResponse) => {
        Logger.api('Usuario actualizado exitosamente:', response);

        if (!response || !response.success || !response.data) {
          Logger.warn('Respuesta de actualización de usuario inválida:', response);
          throw new Error('Error al actualizar usuario: respuesta inválida');
        }

        return response;
      },
      transformErrorResponse: error => handleApiError(error, 'updateUser'),
              invalidatesTags: (_result, error, { id }) => {
          if (error) return [];
          return [
            { type: 'User' as const, id },
            { type: 'User' as const, id: 'LIST' },
          ];
        },
    }),

    // Eliminar usuario
    deleteUser: builder.mutation<{ success: boolean; message: string }, number>({
      query: id => ({
        url: `/usuarios/${id}`,
        method: 'DELETE',
      }),
      transformResponse: (response: { success: boolean; message: string }) => {
        Logger.api('Usuario eliminado exitosamente:', response);

        if (!response || !response.success) {
          Logger.warn('Respuesta de eliminación de usuario inválida:', response);
          throw new Error('Error al eliminar usuario: respuesta inválida');
        }

        return response;
      },
      transformErrorResponse: error => handleApiError(error, 'deleteUser'),
      invalidatesTags: (_result, error, id) => {
        if (error) return [];
        return [
          { type: 'User' as const, id },
          { type: 'User' as const, id: 'LIST' },
        ];
      },
    }),

    // Verificar si un email ya existe
    checkEmail: builder.query<CheckEmailResponse, string>({
      query: email => ({
        url: `/usuarios/check-email?email=${encodeURIComponent(email)}`,
        method: 'GET',
      }),
      transformResponse: (response: CheckEmailResponse) => {
        Logger.api('Respuesta de verificación de email:', response);
        return response;
      },
      transformErrorResponse: error => handleApiError(error, 'checkEmail'),
      // No necesita cache ya que es para verificación en tiempo real
      keepUnusedDataFor: 0,
    }),
  }),
});

// Exportar hooks generados por RTK Query
export const {
  useGetUsuariosQuery,
  useGetUsuarioByIdQuery,
  useCreateUserMutation,
  useUpdateUserMutation,
  useDeleteUserMutation,
  useLazyCheckEmailQuery,
} = usersApiSlice;

// Hook personalizado para verificación de email con debounce
export const useEmailValidation = () => {
  const [triggerCheckEmail, { data: emailCheck, isLoading: isCheckingEmail }] =
    useLazyCheckEmailQuery();

  return {
    checkEmail: triggerCheckEmail,
    emailExists: emailCheck?.exists || false,
    isCheckingEmail,
  };
};
