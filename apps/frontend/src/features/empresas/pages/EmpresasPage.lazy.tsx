import React, { Suspense } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { Card } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Spinner } from '../../../components/ui/spinner';
import { Logger } from '../../../lib/utils';
import { ExclamationTriangleIcon, ArrowPathIcon } from '@heroicons/react/24/outline';

// Tipos correctos para react-error-boundary
interface ErrorInfo {
  componentStack?: string | null;
  errorBoundary?: React.Component | null;
  errorInfo?: React.ErrorInfo | null;
}

// Lazy load del componente principal
const EmpresasPageComponent = React.lazy(() =>
  import('./EmpresasPage').then(module => ({
    default: module.EmpresasPage,
  }))
);

// Componente de loading personalizado
const EmpresasPageSkeleton: React.FC = () => (
  <div className='min-h-screen bg-background'>
    <div className='container mx-auto px-4 py-8'>
      {/* Skeleton del header */}
      <div className='mb-8'>
        <div className='flex justify-between items-center'>
          <div className='space-y-2'>
            <div className='h-8 w-64 bg-muted rounded animate-pulse'></div>
            <div className='h-4 w-96 bg-muted rounded animate-pulse'></div>
          </div>
          <div className='h-10 w-32 bg-muted rounded animate-pulse'></div>
        </div>
      </div>

      {/* Skeleton de la tabla */}
      <Card>
        <div className='p-6'>
          {/* Header de la tabla */}
          <div className='grid grid-cols-4 gap-4 pb-4 border-b border-border'>
            <div className='h-4 w-20 bg-muted rounded animate-pulse'></div>
            <div className='h-4 w-24 bg-muted rounded animate-pulse'></div>
            <div className='h-4 w-32 bg-muted rounded animate-pulse'></div>
            <div className='h-4 w-16 bg-muted rounded animate-pulse'></div>
          </div>

          {/* Filas de la tabla */}
          {[...Array(5)].map((_, i) => (
            <div key={`skeleton-row-${i}`} className='grid grid-cols-4 gap-4 py-4 border-b border-border last:border-b-0'>
              <div className='flex items-center space-x-3'>
                <div className='w-8 h-8 bg-muted rounded animate-pulse'></div>
                <div className='space-y-1'>
                  <div className='h-4 w-32 bg-muted rounded animate-pulse'></div>
                  <div className='h-3 w-16 bg-muted rounded animate-pulse'></div>
                </div>
              </div>
              <div className='h-4 w-40 bg-muted rounded animate-pulse'></div>
              <div className='h-3 w-24 bg-muted rounded animate-pulse'></div>
              <div className='flex space-x-2'>
                <div className='h-8 w-16 bg-muted rounded animate-pulse'></div>
                <div className='h-8 w-20 bg-muted rounded animate-pulse'></div>
              </div>
            </div>
          ))}

          {/* Loading spinner en el centro */}
          <div className='flex items-center justify-center py-8'>
            <div className='text-center'>
              <Spinner className='w-8 h-8 mx-auto mb-4' />
              <p className='text-muted-foreground'>Cargando gestión de empresas...</p>
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
    Logger.error('Error en EmpresasPage:', error);
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
              Ocurrió un error al cargar la gestión de empresas.
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
              onClick={() => (window.location.href = '/')}
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
export const usePreloadEmpresas = () => {
  React.useEffect(() => {
    // Preload más agresivo del componente
    const preloadTimer = setTimeout(() => {
      import('./EmpresasPage');
    }, 100); // Preload después de 100ms (antes era 2000ms)

    return () => clearTimeout(preloadTimer);
  }, []);
};

// Optimización: Prefetch de datos en el dashboard
export const usePrefetchEmpresasData = () => {
  React.useEffect(() => {
    // Importar y prefetch de datos cuando el usuario está en dashboard
    import('../../../store/apiSlice').then(() => {
      const prefetchTimer = setTimeout(() => {
        // Prefetch empresas data
        // apiSlice.util.prefetch('getEmpresas', undefined, { force: false });
      }, 500);

      return () => clearTimeout(prefetchTimer);
    });
  }, []);
};

// Componente principal con lazy loading
export const EmpresasPageLazy: React.FC = () => {
  return (
    <ErrorBoundary
      FallbackComponent={ErrorFallback}
      onError={(error: Error, errorInfo: ErrorInfo) => {
        Logger.error('ErrorBoundary capturó error en EmpresasPage:', {
          error: error.message,
          stack: error.stack,
          componentStack: errorInfo.componentStack || 'No disponible',
          errorBoundary: errorInfo.errorBoundary?.constructor.name || 'Desconocido',
          errorInfo,
        });
      }}
      onReset={() => {
        Logger.debug('Reiniciando EmpresasPage después de error');
      }}
    >
      <Suspense fallback={<EmpresasPageSkeleton />}>
        <EmpresasPageComponent />
      </Suspense>
    </ErrorBoundary>
  );
};

export default EmpresasPageLazy; 