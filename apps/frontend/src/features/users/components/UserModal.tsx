import React from 'react';
import { UserModalProps, CreateUserPayload, UpdateUserPayload, UserResponse } from '../types';
import { UserForm } from './UserForm';
import { useGetEmpresasQuery } from '../../empresas/api/empresasApiSlice';
import { useCreateUserMutation, useUpdateUserMutation } from '../api/usersApiSlice';
import { showToast } from '../../../components/ui/Toast.utils';
import { Logger } from '../../../lib/utils';

// Tipo para errores de RTK Query
interface RTKQueryError {
  status?: number;
  data?: {
    success?: boolean;
    message?: string;
    error?: string;
    errors?: Array<{
      field?: string;
      message?: string;
      code?: string;
    }>;
  };
}

// Type guard para verificar si es un error de RTK Query
function isRTKQueryError(error: unknown): error is RTKQueryError {
  return typeof error === 'object' && error !== null && 'status' in error;
}

export const UserModal: React.FC<UserModalProps> = ({ isOpen, mode, user, onClose }) => {
  const { data: empresasResponse, isLoading: loadingEmpresas } = useGetEmpresasQuery();
  const [createUser, { isLoading: isCreating }] = useCreateUserMutation();
  const [updateUser, { isLoading: isUpdating }] = useUpdateUserMutation();

  const empresas = empresasResponse || [];
  const isLoading = isCreating || isUpdating;

  const handleSubmit = async (data: CreateUserPayload | UpdateUserPayload) => {
    try {
      let response: UserResponse;

      if (mode === 'create') {
        Logger.debug('Creando nuevo usuario:', data);
        response = await createUser(data as CreateUserPayload).unwrap();
        showToast('Usuario creado exitosamente', 'success');
        Logger.debug('Usuario creado exitosamente:', {
          id: response.data.id,
          email: response.data.email,
          role: response.data.role,
        });
      } else if (mode === 'edit' && user) {
        Logger.debug('Actualizando usuario:', { id: user.id, data });
        response = await updateUser({
          id: user.id,
          data: data as UpdateUserPayload,
        }).unwrap();
        showToast('Usuario actualizado exitosamente', 'success');
        Logger.debug('Usuario actualizado exitosamente:', {
          id: response.data.id,
          email: response.data.email,
          role: response.data.role,
        });
      } else {
        Logger.error('Estado de modal inválido');
        showToast('Error: Estado de modal inválido', 'error');
        return;
      }

      onClose();
    } catch (error: unknown) {
      Logger.error('Error al guardar usuario:', error);

      // Manejar errores específicos con type guards
      if (isRTKQueryError(error)) {
        const { status, data } = error;

        // Manejar errores por código de estado
        switch (status) {
          case 400:
            if (data?.errors && Array.isArray(data.errors) && data.errors.length > 0) {
              const validationErrors = data.errors
                .map(err => err.message)
                .filter(Boolean)
                .join(', ');
              showToast(`Errores de validación: ${validationErrors}`, 'error');
            } else if (data?.message) {
              showToast(data.message, 'error');
            } else {
              showToast('Datos inválidos. Verifica la información ingresada.', 'error');
            }
            break;

          case 401:
            showToast('Sesión expirada. Por favor, inicia sesión nuevamente.', 'error');
            break;

          case 403:
            showToast('No tienes permisos para realizar esta acción', 'error');
            break;

          case 409:
            showToast('El email ya está registrado', 'error');
            break;

          case 422:
            showToast('Los datos proporcionados no son válidos', 'error');
            break;

          case 500:
            showToast('Error interno del servidor. Inténtalo más tarde.', 'error');
            break;

          default:
            if (data?.message) {
              showToast(data.message, 'error');
            } else if (data?.error) {
              showToast(data.error, 'error');
            } else {
              showToast('Error al guardar usuario. Inténtalo de nuevo.', 'error');
            }
        }
      } else if (error instanceof Error) {
        // Error de red o JavaScript
        Logger.error('Error de red o aplicación:', error.message);
        showToast('Error de conexión. Verifica tu conexión a internet.', 'error');
      } else {
        // Error desconocido
        Logger.error('Error desconocido:', error);
        showToast('Error inesperado. Inténtalo de nuevo.', 'error');
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className='fixed inset-0 z-50 overflow-y-auto'>
      {/* Backdrop */}
      <div className='fixed inset-0 bg-black bg-opacity-50 transition-opacity' onClick={onClose} />

      {/* Modal */}
      <div className='flex min-h-full items-center justify-center p-4'>
        <div className='relative w-full max-w-2xl'>
          <UserForm
            mode={mode}
            user={user}
            empresas={empresas}
            onSubmit={handleSubmit}
            onClose={onClose}
            isLoading={isLoading || loadingEmpresas}
          />
        </div>
      </div>
    </div>
  );
};
