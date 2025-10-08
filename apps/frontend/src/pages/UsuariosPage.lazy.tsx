import React, { Suspense } from 'react';
import { ErrorBoundary } from 'react-error-boundary';

// Tipos correctos para react-error-boundary v6.0.0
interface ErrorInfo {
  componentStack?: string | null;
  errorBoundary?: React.Component | null;
  errorInfo?: React.ErrorInfo | null;
}
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Spinner } from '../components/ui/spinner';
import { Logger } from '../lib/utils';
import { ExclamationTriangleIcon, ArrowPathIcon } from '@heroicons/react/24/outline';

// Lazy load del componente principal
const UsuariosPageComponent = React.lazy(() =>
  import('./UsuariosPage')
);

// Componente de loading personalizado
const UsuariosPageSkeleton: React.FC = () => (
  <div className='min-h-screen bg-background'>
    <div className='container mx-auto px-4 py-6 max-w-7xl'>
      {/* Skeleton del breadcrumb */}
      <nav className='mb-6'>
        <div className='flex items-center space-x-2 text-sm'>
          <div className='h-4 w-16 bg-muted rounded animate-pulse'></div>
          <span>/</span>
          <div className='h-4 w-32 bg-muted rounded animate-pulse'></div>
        </div>
      </nav>

      {/* Skeleton del header */}
      <div className='flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center mb-6'>
        <div className='space-y-2'>
          <div className='h-8 w-64 bg-muted rounded animate-pulse'></div>
          <div className='h-4 w-80 bg-muted rounded animate-pulse'></div>
        </div>
        <div className='h-10 w-32 bg-muted rounded animate-pulse'></div>
      </div>

      {/* Skeleton de la información del usuario */}
      <div className='mb-6'>
        <Card className='p-4'>
          <div className='flex items-center justify-between'>
            <div className='flex items-center space-x-3'>
              <div className='w-10 h-10 bg-muted rounded-full animate-pulse'></div>
              <div className='space-y-2'>
                <div className='h-4 w-48 bg-muted rounded animate-pulse'></div>
                <div className='h-3 w-32 bg-muted rounded animate-pulse'></div>
              </div>
            </div>
            <div className='h-3 w-24 bg-muted rounded animate-pulse'></div>
          </div>
        </Card>
      </div>

      {/* Skeleton de filtros */}
      <Card className='p-4 mb-6'>
        <div className='flex flex-col lg:flex-row gap-4'>
          <div className='flex-1'>
            <div className='h-10 w-full bg-muted rounded animate-pulse'></div>
          </div>
          <div className='h-10 w-24 bg-muted rounded animate-pulse'></div>
        </div>
      </Card>

      {/* Skeleton de la tabla */}
      <Card>
        <div className='p-6'>
          <div className='flex items-center justify-center space-y-4'>
            <div className='text-center'>
              <Spinner className='w-8 h-8 mx-auto mb-4' />
              <p className='text-muted-foreground'>Cargando gestión de usuarios...</p>
              <p className='text-sm text-muted-foreground mt-2'>Preparando componentes y datos</p>
            </div>
          </div>
        </div>
      </Card>
    </div>
  </div>
);

// Error fallback component
interface ErrorFallbackProps {
  error: Error;
  resetErrorBoundary: () => void;
}

const ErrorFallback: React.FC<ErrorFallbackProps> = ({ error, resetErrorBoundary }) => {
  React.useEffect(() => {
    Logger.error('Error en UsuariosPage:', error);
  }, [error]);

  return (
    <div className='min-h-screen bg-background flex items-center justify-center p-4'>
      <Card className='p-8 max-w-md w-full text-center'>
        <div className='flex flex-col items-center space-y-4'>
          <div className='w-16 h-16 bg-red-100 rounded-full flex items-center justify-center'>
            <ExclamationTriangleIcon className='w-8 h-8 text-red-600' />
          </div>

          <div className='space-y-2'>
            <h2 className='text-xl font-semibold text-foreground'>Error al Cargar</h2>
            <p className='text-muted-foreground'>
              Ocurrió un error al cargar la gestión de usuarios.
            </p>
            <p className='text-sm text-muted-foreground'>{error.message || 'Error desconocido'}</p>
          </div>

          <div className='space-y-2 w-full'>
            <Button onClick={resetErrorBoundary} className='w-full'>
              <ArrowPathIcon className='w-4 h-4 mr-2' />
              Reintentar
            </Button>

            <Button
              variant='outline'
              onClick={() => (window.location.href = '/dashboard')}
              className='w-full'
            >
              Volver al Dashboard
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};

// Hook personalizado para preloading
export const usePreloadUsuarios = () => {
  React.useEffect(() => {
    // Preload más agresivo del componente
    const preloadTimer = setTimeout(() => {
      import('./UsuariosPage').then(() => {
        // Preload también UserTable.lazy cuando se carga UsuariosPage
        import('../features/users/components/UserTable.lazy');
      });
    }, 100); // Preload después de 100ms (optimizado)

    return () => clearTimeout(preloadTimer);
  }, []);
};

// Optimización: Prefetch de datos en el dashboard
export const usePrefetchUsuariosData = () => {
  React.useEffect(() => {
    // Importar y prefetch de datos cuando el usuario está en dashboard
    import('../features/users/api/usersApiSlice').then(({ usersApiSlice }) => {
      const prefetchTimer = setTimeout(() => {
        // Prefetch usuarios data
        usersApiSlice.util.prefetch('getUsuarios', undefined, { force: false });
      }, 500);

      return () => clearTimeout(prefetchTimer);
    });
  }, []);
};

// Componente principal con lazy loading
export const UsuariosPageLazy: React.FC = () => {
  return (
    <ErrorBoundary
      FallbackComponent={ErrorFallback}
      onError={(error: Error, errorInfo: ErrorInfo) => {
        Logger.error('ErrorBoundary capturó error en UsuariosPage:', {
          error: error.message,
          stack: error.stack,
          componentStack: errorInfo.componentStack || 'No disponible',
          errorBoundary: errorInfo.errorBoundary?.constructor.name || 'Desconocido',
          errorInfo,
        });
      }}
      onReset={() => {
        Logger.debug('Reiniciando UsuariosPage después de error');
        // Opcional: limpiar caché o estado si es necesario
      }}
    >
      <Suspense fallback={<UsuariosPageSkeleton />}>
        <UsuariosPageComponent />
      </Suspense>
    </ErrorBoundary>
  );
};

export default UsuariosPageLazy;
