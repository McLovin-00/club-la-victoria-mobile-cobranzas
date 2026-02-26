import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { useSelector } from 'react-redux';
import { Button } from '../../../components/ui/button';
import { Card } from '../../../components/ui/card';
import { Spinner } from '../../../components/ui/spinner';
import { showToast } from '../../../components/ui/Toast.utils';
import { selectCurrentUser } from '../../auth/authSlice';
import { useEmailValidation } from '../api/usersApiSlice';
import { UserFormProps, UserFormState } from '../types';
import { UserIcon, BuildingOfficeIcon } from '../../../components/icons';
import {
  XMarkIcon,
  EyeIcon,
  EyeSlashIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  EnvelopeIcon,
  LockClosedIcon,
} from '@heroicons/react/24/outline';

export const UserForm: React.FC<UserFormProps> = ({
  mode,
  user,
  empresas,
  onSubmit,
  onClose,
  isLoading = false,
}) => {
  const currentUser = useSelector(selectCurrentUser);
  const { checkEmail, emailExists, isCheckingEmail } = useEmailValidation();

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [lastCheckedEmail, setLastCheckedEmail] = useState('');
  const emailCheckTimeoutRef = useRef<number | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isValid },
  } = useForm<UserFormState>({
    mode: 'onChange',
    defaultValues: {
      email: user?.email ?? '',
      password: '',
      confirmPassword: '',
      role: user?.role === 'SUPERADMIN' ? 'ADMIN' : user?.role || 'OPERATOR',
          empresaId:
      user?.empresa_id ||
      user?.empresaId ||
      (currentUser?.role === 'ADMIN' ? currentUser.empresaId : null),
    },
  });

  const watchedEmail = watch('email');
  const watchedPassword = watch('password');
  const watchedRole = watch('role');

  // Función estable para verificar email
  const debouncedCheckEmail = useCallback(
    (email: string) => {
      checkEmail(email);
      setLastCheckedEmail(email);
    },
    [checkEmail]
  );

  // Verificación de email con debounce
  useEffect(() => {
    if (mode === 'create' && watchedEmail && watchedEmail !== lastCheckedEmail) {
      // Validar formato de email primero
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(watchedEmail)) {
        return;
      }

      // Limpiar timeout anterior
      if (emailCheckTimeoutRef.current) {
        clearTimeout(emailCheckTimeoutRef.current);
      }

      // Crear nuevo timeout
      emailCheckTimeoutRef.current = window.setTimeout(() => {
        debouncedCheckEmail(watchedEmail);
      }, 500);

      // Cleanup function
      return () => {
        if (emailCheckTimeoutRef.current) {
          clearTimeout(emailCheckTimeoutRef.current);
        }
      };
    }
  }, [watchedEmail, mode, lastCheckedEmail, debouncedCheckEmail]);

  // Auto-seleccionar empresa para admin
  useEffect(() => {
    if (currentUser?.role === 'ADMIN' && currentUser.empresaId) {
      setValue('empresaId', currentUser.empresaId);
    }
  }, [currentUser?.role, currentUser?.empresaId, setValue]);



  const handleFormSubmit = (data: UserFormState) => {
    // Validaciones finales
    if (mode === 'create' && emailExists) {
      showToast('El email ya está registrado', 'error');
      return;
    }

    if (mode === 'create' && (!data.password || data.password.length < 6)) {
      showToast('La contraseña debe tener al menos 6 caracteres', 'error');
      return;
    }

    if (mode === 'create' && data.password !== data.confirmPassword) {
      showToast('Las contraseñas no coinciden', 'error');
      return;
    }

    // Preparar datos para envío
    const submitData = {
      email: data.email.toLowerCase().trim(),
      role: data.role,
      empresaId: data.empresaId,
      ...(mode === 'create' && { password: data.password }),
    };

    onSubmit(submitData);
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return 'Administrador';
      case 'OPERATOR':
        return 'Usuario';
      case 'SUPERADMIN':
        return 'Superadministrador';
      default:
        return role;
    }
  };

  const canEditRole = () => {
    return currentUser?.role === 'SUPERADMIN';
  };

  const canSelectEmpresa = () => {
    return currentUser?.role === 'SUPERADMIN';
  };

  return (
    <Card className='w-full max-w-2xl mx-auto'>
      <div className='p-6'>
        {/* Header */}
        <div className='flex items-center justify-between mb-6'>
          <h2 className='text-xl font-semibold text-foreground'>
            {mode === 'create' ? 'Crear Nuevo Usuario' : 'Editar Usuario'}
          </h2>
          <button
            onClick={onClose}
            className='p-2 hover:bg-accent rounded-lg transition-colors'
            disabled={isLoading}
          >
            <XMarkIcon className='h-5 w-5 text-muted-foreground' />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(handleFormSubmit)} className='space-y-6'>
          {/* Email */}
          <div className='space-y-2'>
            <label className='text-sm font-medium text-foreground flex items-center gap-2'>
              <EnvelopeIcon className='h-4 w-4' />
              Email
            </label>
            <div className='relative'>
              <input
                type='email'
                {...register('email', {
                  required: 'El email es obligatorio',
                  pattern: {
                    value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                    message: 'Formato de email inválido',
                  },
                })}
                className={`w-full px-3 py-2 border rounded-md shadow-sm bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary ${
                  errors.email ? 'border-red-500' : 'border-border'
                }`}
                placeholder='usuario@ejemplo.com'
                disabled={isLoading || mode === 'edit'}
              />

              {/* Indicador de verificación de email */}
              {mode === 'create' && watchedEmail && (
                <div className='absolute right-3 top-1/2 transform -translate-y-1/2'>
                  {isCheckingEmail ? (
                    <Spinner className='w-4 h-4' />
                  ) : emailExists ? (
                    <ExclamationTriangleIcon className='h-5 w-5 text-red-500' />
                  ) : watchedEmail === lastCheckedEmail ? (
                    <CheckCircleIcon className='h-5 w-5 text-green-500' />
                  ) : null}
                </div>
              )}
            </div>

            {errors.email && <p className='text-sm text-red-500'>{errors.email.message}</p>}

            {mode === 'create' && emailExists && (
              <p className='text-sm text-red-500'>Este email ya está registrado</p>
            )}
          </div>

          {/* Password (solo para crear) */}
          {mode === 'create' && (
            <>
              <div className='space-y-2'>
                <label className='text-sm font-medium text-foreground flex items-center gap-2'>
                  <LockClosedIcon className='h-4 w-4' />
                  Contraseña
                </label>
                <div className='relative'>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    {...register('password', {
                      required: 'La contraseña es obligatoria',
                      minLength: {
                        value: 6,
                        message: 'La contraseña debe tener al menos 6 caracteres',
                      },
                      pattern: {
                        value: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
                        message: 'Debe contener al menos: una minúscula, una mayúscula y un número',
                      },
                    })}
                    className={`w-full px-3 py-2 pr-10 border rounded-md shadow-sm bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary ${
                      errors.password ? 'border-red-500' : 'border-border'
                    }`}
                    placeholder='Mínimo 6 caracteres'
                  />
                  <button
                    type='button'
                    onClick={() => setShowPassword(!showPassword)}
                    className='absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground'
                  >
                    {showPassword ? (
                      <EyeSlashIcon className='h-5 w-5' />
                    ) : (
                      <EyeIcon className='h-5 w-5' />
                    )}
                  </button>
                </div>
                {errors.password && (
                  <p className='text-sm text-red-500'>{errors.password.message}</p>
                )}
              </div>

              <div className='space-y-2'>
                <label className='text-sm font-medium text-foreground flex items-center gap-2'>
                  <LockClosedIcon className='h-4 w-4' />
                  Confirmar Contraseña
                </label>
                <div className='relative'>
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    {...register('confirmPassword', {
                      required: 'Confirma tu contraseña',
                      validate: value =>
                        value === watchedPassword || 'Las contraseñas no coinciden',
                    })}
                    className={`w-full px-3 py-2 pr-10 border rounded-md shadow-sm bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary ${
                      errors.confirmPassword ? 'border-red-500' : 'border-border'
                    }`}
                    placeholder='Confirma tu contraseña'
                  />
                  <button
                    type='button'
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className='absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground'
                  >
                    {showConfirmPassword ? (
                      <EyeSlashIcon className='h-5 w-5' />
                    ) : (
                      <EyeIcon className='h-5 w-5' />
                    )}
                  </button>
                </div>
                {errors.confirmPassword && (
                  <p className='text-sm text-red-500'>{errors.confirmPassword.message}</p>
                )}
              </div>
            </>
          )}

          {/* Role */}
          <div className='space-y-2'>
            <label className='text-sm font-medium text-foreground flex items-center gap-2'>
              <UserIcon className='h-4 w-4' />
              Rol
            </label>
            {canEditRole() ? (
              <select
                {...register('role', { required: 'El rol es obligatorio' })}
                className={`w-full px-3 py-2 border rounded-md shadow-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary ${
                  errors.role ? 'border-red-500' : 'border-border'
                }`}
                disabled={isLoading}
              >
                <option value='OPERATOR'>Usuario</option>
                <option value='ADMIN'>Administrador</option>
              </select>
            ) : (
              <input
                type='text'
                value={getRoleLabel(watchedRole)}
                className='w-full px-3 py-2 border rounded-md shadow-sm bg-muted text-muted-foreground'
                disabled
              />
            )}
            {errors.role && <p className='text-sm text-red-500'>{errors.role.message}</p>}
          </div>

          {/* Empresa */}
          <div className='space-y-2'>
            <label className='text-sm font-medium text-foreground flex items-center gap-2'>
              <BuildingOfficeIcon className='h-4 w-4' />
              Empresa
            </label>
            {canSelectEmpresa() ? (
              <select
                {...register('empresaId', {
                  required:
                    watchedRole === 'ADMIN'
                      ? 'Los administradores deben tener una empresa asignada'
                      : false,
                })}
                className={`w-full px-3 py-2 border rounded-md shadow-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary ${
                  errors.empresaId ? 'border-red-500' : 'border-border'
                }`}
                disabled={isLoading}
              >
                <option value=''>Seleccionar empresa...</option>
                {empresas.map(empresa => (
                  <option key={empresa.id} value={empresa.id}>
                    {empresa.nombre}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type='text'
                value={
                  empresas.find(e => e.id === currentUser?.empresaId)?.nombre || 'Sin empresa'
                }
                className='w-full px-3 py-2 border rounded-md shadow-sm bg-muted text-muted-foreground'
                disabled
              />
            )}
            {errors.empresaId && <p className='text-sm text-red-500'>{errors.empresaId.message}</p>}
          </div>



          {/* Actions */}
          <div className='flex gap-3 pt-4'>
            <Button
              type='button'
              variant='outline'
              onClick={onClose}
              disabled={isLoading}
              className='flex-1'
            >
              Cancelar
            </Button>
            <Button
              type='submit'
              disabled={
                isLoading ||
                !isValid ||
                (mode === 'create' && emailExists) ||
                (mode === 'create' && isCheckingEmail)
              }
              className='flex-1'
            >
              {isLoading ? (
                <>
                  <Spinner className='w-4 h-4 mr-2' />
                  {mode === 'create' ? 'Creando...' : 'Guardando...'}
                </>
              ) : mode === 'create' ? (
                'Crear Usuario'
              ) : (
                'Guardar Cambios'
              )}
            </Button>
          </div>
        </form>
      </div>
    </Card>
  );
};
