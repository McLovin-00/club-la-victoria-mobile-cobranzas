import React, { useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { selectCurrentUser } from '../features/auth/authSlice';
import { UserTableLazy } from '../features/users/components/UserTable.lazy';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { showToast } from '../components/ui/Toast.utils';
import { Logger } from '../lib/utils';
import { ShieldExclamationIcon, ArrowLeftIcon } from '@heroicons/react/24/outline';

/**
 * Página principal de gestión de usuarios
 *
 * Características:
 * - Control de acceso basado en roles (solo admin/superadmin)
 * - Gestión completa de usuarios (CRUD)
 * - Filtros y búsqueda avanzada
 * - Paginación
 * - Interfaz responsive
 * - Manejo de errores robusto
 */
export const UsuariosPage: React.FC = () => {
  const currentUser = useSelector(selectCurrentUser);
  const navigate = useNavigate();

  // Verificar permisos de acceso
  const hasAccess = React.useMemo(() => {
    if (!currentUser) {
      Logger.warn('Usuario no autenticado intentando acceder a gestión de usuarios');
      return false;
    }

    const allowedRoles = ['ADMIN', 'SUPERADMIN'];
    const hasPermission = allowedRoles.includes(currentUser.role);

    if (!hasPermission) {
      Logger.warn('Usuario sin permisos intentando acceder a gestión de usuarios', {
        userId: currentUser.id,
        userRole: currentUser.role,
        requiredRoles: allowedRoles,
      });
    }

    return hasPermission;
  }, [currentUser]);

  // Efecto para manejar redirección por falta de permisos
  useEffect(() => {
    if (!currentUser) {
      Logger.debug('Redirigiendo a login por falta de autenticación');
      showToast('Debes iniciar sesión para acceder a esta página', 'error');
      navigate('/login', { replace: true });
      return;
    }

    if (!hasAccess) {
      Logger.debug('Redirigiendo al dashboard por falta de permisos');
      showToast('No tienes permisos para acceder a la gestión de usuarios', 'error');
      navigate('/dashboard', { replace: true });
      return;
    }

    // Log de acceso exitoso
    Logger.debug('Acceso autorizado a gestión de usuarios', {
      userId: currentUser.id,
      userRole: currentUser.role,
      userEmail: currentUser.email,
    });
  }, [currentUser, hasAccess, navigate]);

  // Handlers
  const handleGoBack = () => {
    navigate('/dashboard');
  };

  // Componente de carga mientras se verifica acceso
  if (!currentUser) {
    return (
      <div className='min-h-screen flex items-center justify-center'>
        <Card className='p-8 max-w-md w-full text-center'>
          <div className='animate-pulse space-y-4'>
            <div className='h-8 bg-muted rounded w-3/4 mx-auto'></div>
            <div className='h-4 bg-muted rounded w-1/2 mx-auto'></div>
          </div>
        </Card>
      </div>
    );
  }

  // Componente de acceso denegado
  if (!hasAccess) {
    return (
      <div className='min-h-screen flex items-center justify-center p-4'>
        <Card className='p-8 max-w-md w-full text-center'>
          <div className='flex flex-col items-center space-y-4'>
            <div className='w-16 h-16 bg-red-100 rounded-full flex items-center justify-center'>
              <ShieldExclamationIcon className='w-8 h-8 text-red-600' />
            </div>

            <div className='space-y-2'>
              <h2 className='text-xl font-semibold text-foreground'>Acceso Restringido</h2>
              <p className='text-muted-foreground'>
                No tienes permisos para acceder a la gestión de usuarios.
              </p>
              <p className='text-sm text-muted-foreground'>
                Solo los administradores pueden gestionar usuarios del sistema.
              </p>
            </div>

            <div className='space-y-2 w-full'>
              <Button onClick={handleGoBack} className='w-full'>
                <ArrowLeftIcon className='w-4 h-4 mr-2' />
                Volver al Dashboard
              </Button>

              <div className='text-xs text-muted-foreground'>
                Tu rol actual: <span className='font-medium'>{currentUser.role}</span>
              </div>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  // Renderizado principal
  return (
    <div className='min-h-screen bg-background'>
      <div className='container mx-auto px-4 py-6 max-w-7xl'>
        {/* Breadcrumb */}
        <nav className='mb-6'>
          <div className='flex items-center space-x-2 text-sm text-muted-foreground'>
            <button
              onClick={handleGoBack}
              className='hover:text-foreground transition-colors flex items-center'
            >
              <ArrowLeftIcon className='w-4 h-4 mr-1' />
              Dashboard
            </button>
            <span>/</span>
            <span className='text-foreground font-medium'>Gestión de Usuarios</span>
          </div>
        </nav>

        {/* Información del usuario actual */}
        <div className='mb-6'>
          <Card className='p-4'>
            <div className='flex items-center justify-between'>
              <div className='flex items-center space-x-3'>
                <div className='w-10 h-10 bg-primary rounded-full flex items-center justify-center text-primary-foreground font-medium'>
                  {currentUser.email.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className='text-sm font-medium text-foreground'>
                    Sesión activa: {currentUser.email}
                  </div>
                  <div className='text-xs text-muted-foreground'>
                    Rol: {currentUser.role}
                    {currentUser.empresa?.nombre && (
                      <span> • Empresa: {currentUser.empresa.nombre}</span>
                    )}
                  </div>
                </div>
              </div>

              <div className='text-xs text-muted-foreground'>Página de administración</div>
            </div>
          </Card>
        </div>

        {/* Componente principal de la tabla con lazy loading */}
        <UserTableLazy enablePerformanceMonitoring={true} enablePreloading={true} />
      </div>
    </div>
  );
};

export default UsuariosPage;
