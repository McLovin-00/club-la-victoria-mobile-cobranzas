import React, { useState, useEffect } from 'react';
import { UserCircleIcon, KeyIcon, BuildingOfficeIcon } from '@heroicons/react/24/outline';
import { useSelector, useDispatch } from 'react-redux';
import { selectCurrentUser, selectIsSuperAdmin, setCredentials, setCurrentUser } from '../features/auth/authSlice';
import { ChangePasswordForm } from '../components/ChangePasswordForm';
import { useGetEmpresasQuery } from '../features/empresas/api/empresasApiSlice';
import { Empresa } from '../features/empresas/types';
import { useUpdateProfileMutation, useUpdateUserEmpresaMutation } from '../features/auth/api/authApiSlice';
import { showToast } from '../components/ui/Toast.utils';
import { Logger } from '../lib/utils';

export const PerfilPage = () => {
  // Obtener el usuario actual del estado de Redux
  const currentUser = useSelector(selectCurrentUser);
  const isSuperAdmin = useSelector(selectIsSuperAdmin);
  const dispatch = useDispatch();

  // Estado para el formulario de información personal
  const [selectedEmpresaId, setSelectedEmpresaId] = useState<number | null>(
    currentUser?.empresaId || null
  );
  const [telegramUsername, setTelegramUsername] = useState(currentUser?.telegramUsername ?? '');

  // Obtener la lista de empresas solo si es superadmin
  const { data: empresas, isLoading: isEmpresasLoading } = useGetEmpresasQuery(undefined, {
    skip: !isSuperAdmin,
  });
  const [updateUserEmpresa, { isLoading: isUpdatingEmpresa }] = useUpdateUserEmpresaMutation();
  const [updateProfile, { isLoading: isUpdatingProfile }] = useUpdateProfileMutation();

  // Actualizar selectedEmpresaId cuando cambia el usuario
  useEffect(() => {
    Logger.debug('PerfilPage - Usuario actual:', {
      hasUser: !!currentUser,
      empresaId: currentUser?.empresaId,
      email: currentUser?.email,
    });

    if (currentUser?.empresaId) {
      setSelectedEmpresaId(currentUser.empresaId);
    } else {
      setSelectedEmpresaId(null);
    }
    setTelegramUsername(currentUser?.telegramUsername ?? '');
  }, [currentUser]);

  const handleTelegramUsernameSave = async () => {
    try {
      const result = await updateProfile({
        telegramUsername: telegramUsername.trim() || null,
      }).unwrap();

      dispatch(setCurrentUser(result.data));
      showToast('Username de Telegram actualizado correctamente.', 'success');
    } catch (error) {
      console.error('Error al actualizar username de Telegram:', error);
      showToast('Error al actualizar username de Telegram.', 'error');
      setTelegramUsername(currentUser?.telegramUsername ?? '');
    }
  };

  // Handler para cambiar la empresa seleccionada (solo para superadmin)
  const handleEmpresaChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const empresaId = e.target.value ? Number(e.target.value) : null;
    setSelectedEmpresaId(empresaId);

    try {
      // Llamar al backend para actualizar la empresa y generar nuevo JWT usando RTK Query
      const result = await updateUserEmpresa({ empresaId: empresaId }).unwrap();

      Logger.debug('PerfilPage - Respuesta de updateUserEmpresa:', {
        hasToken: !!result.token,
        userData: result.data,
        empresaIdInResponse: result.data?.empresaId,
      });

      // Actualizar el token y usuario en Redux
      dispatch(
        setCredentials({
          token: result.token,
          data: result.data,
          success: result.success,
          timestamp: result.timestamp,
        })
      );

      showToast('Empresa seleccionada actualizada correctamente.', 'success');
    } catch (error) {
      console.error('Error al actualizar empresa:', error);
      showToast('Error al actualizar empresa. Inténtalo de nuevo.', 'error');

      // Revertir la selección en caso de error
      setSelectedEmpresaId(currentUser?.empresaId || null);
    }
  };

  // Función para determinar el rol en formato legible
  const getRolName = (role?: string) => {
    switch (role) {
      case 'admin':
        return 'Administrador';
      case 'superadmin':
        return 'Superadministrador';
      case 'user':
        return 'Usuario';
      default:
        return 'Usuario';
    }
  };

  return (
    <div>
      <h1 className='text-2xl font-bold text-foreground mb-6'>Mi Perfil</h1>

      <div className='space-y-6'>
        {/* Información del perfil */}
        <div className='bg-card text-card-foreground p-6 rounded-lg shadow-sm border border-border'>
          <div className='text-lg font-medium text-foreground mb-4'>
            <div className='flex items-center'>
              <UserCircleIcon className='h-5 w-5 mr-2 text-muted-foreground' />
              <span>Información Personal</span>
            </div>
          </div>

            <div className='space-y-4'>
              <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
              <div>
                <div className='text-sm font-medium text-foreground mb-1'>Email</div>
                <input
                  type='email'
                  disabled
                  value={currentUser?.email ?? ''}
                  className='bg-muted w-full px-3 py-2 border border-border rounded-md shadow-sm text-sm text-muted-foreground'
                />
                <p className='mt-1 text-xs text-muted-foreground'>
                  El email no puede ser modificado
                </p>
              </div>

              <div>
                <div className='text-sm font-medium text-foreground mb-1'>Rol</div>
                <input
                  type='text'
                  disabled
                  value={getRolName(currentUser?.role)}
                  className='bg-muted w-full px-3 py-2 border border-border rounded-md shadow-sm text-sm text-muted-foreground'
                  />
                </div>
              </div>

              <div className='mt-4'>
                <div className='text-sm font-medium text-foreground mb-1'>Username de Telegram</div>
                <div className='flex flex-col gap-2 sm:flex-row'>
                  <input
                    type='text'
                    value={telegramUsername}
                    onChange={(e) => setTelegramUsername(e.target.value)}
                    className='w-full px-3 py-2 border border-border rounded-md shadow-sm text-sm bg-background text-foreground'
                    placeholder='sin @, ej: soporte_bca'
                    disabled={isUpdatingProfile}
                  />
                  <button
                    type='button'
                    onClick={handleTelegramUsernameSave}
                    disabled={isUpdatingProfile}
                    className='px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50'
                  >
                    {isUpdatingProfile ? 'Guardando...' : 'Guardar'}
                  </button>
                </div>
                {currentUser?.telegramUsername && (
                  <a
                    href={`https://t.me/${import.meta.env.VITE_TELEGRAM_BOT_USERNAME || 'microsyst_bot'}`}
                    target='_blank'
                    rel='noopener noreferrer'
                    className='mt-2 inline-flex items-center gap-2 px-4 py-2 rounded-md bg-blue-500 text-white text-sm font-medium hover:bg-blue-600 transition-colors'
                  >
                    <svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='currentColor' className='h-4 w-4'>
                      <path d='M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.568 8.16l-1.61 7.59c-.12.54-.44.67-.89.42l-2.46-1.81-1.19 1.14c-.13.13-.24.24-.49.24l.18-2.5 4.56-4.12c.2-.18-.04-.27-.31-.1l-5.64 3.55-2.43-.76c-.53-.17-.54-.53.11-.78l9.51-3.67c.44-.16.82.1.68.78z' />
                    </svg>
                    Hablar con Mesa de Ayuda
                  </a>
                )}
                <p className='mt-1 text-xs text-muted-foreground'>
                  Se guarda normalizado, en minúsculas y sin arroba.
                </p>
              </div>

              {/* Selector de empresa (solo para superadmin) */}
            {isSuperAdmin && (
              <div className='mt-4'>
                <div className='text-sm font-medium text-foreground mb-1'>
                  <div className='flex items-center'>
                    <BuildingOfficeIcon className='h-4 w-4 mr-1 text-muted-foreground' />
                    <span>Seleccionar Empresa</span>
                  </div>
                </div>
                <div className='relative'>
                  <select
                    value={selectedEmpresaId ?? ''}
                    onChange={handleEmpresaChange}
                    className='w-full px-3 py-2 border border-border rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary bg-background text-foreground sm:text-sm'
                    disabled={isEmpresasLoading || isUpdatingEmpresa}
                  >
                    <option value=''>-- Sin empresa seleccionada --</option>
                    {empresas?.map((empresa: Empresa) => (
                      <option key={empresa.id} value={empresa.id}>
                        {empresa.nombre}
                      </option>
                    ))}
                  </select>
                  {isEmpresasLoading && (
                    <div className='absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none'>
                      <svg
                        className='animate-spin h-4 w-4 text-muted-foreground'
                        xmlns='http://www.w3.org/2000/svg'
                        fill='none'
                        viewBox='0 0 24 24'
                      >
                        <circle
                          className='opacity-25'
                          cx='12'
                          cy='12'
                          r='10'
                          stroke='currentColor'
                          strokeWidth='4'
                        ></circle>
                        <path
                          className='opacity-75'
                          fill='currentColor'
                          d='M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z'
                        ></path>
                      </svg>
                    </div>
                  )}
                </div>
                <p className='mt-1 text-xs text-muted-foreground'>
                  Como Superadmin, puede seleccionar una empresa para administrar
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Cambio de contraseña */}
        <div className='bg-card text-card-foreground p-6 rounded-lg shadow-sm border border-border'>
          <div className='text-lg font-medium text-foreground mb-4'>
            <div className='flex items-center'>
              <KeyIcon className='h-5 w-5 mr-2 text-muted-foreground' />
              <span>Cambiar Contraseña</span>
            </div>
          </div>

          <ChangePasswordForm />
        </div>
      </div>
    </div>
  );
};
