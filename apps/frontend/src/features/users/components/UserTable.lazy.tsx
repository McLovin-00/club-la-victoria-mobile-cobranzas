import React, { Suspense, memo, useEffect } from 'react';
import { Logger } from '../../../lib/utils';
import { Card } from '../../../components/ui/card';
import { Spinner } from '../../../components/ui/spinner';

// Lazy load del componente UserTable
const UserTableComponent = React.lazy(() => {
  const startTime = performance.now();
  Logger.debug('Iniciando carga lazy de UserTable');

  return import('./UserTable')
    .then(module => {
      const endTime = performance.now();
      const loadTime = endTime - startTime;

      Logger.performance('UserTable lazy loading completado', {
        loadTime: `${loadTime.toFixed(2)}ms`,
        timestamp: new Date().toISOString(),
        component: 'UserTable',
      });

      return { default: module.UserTable };
    })
    .catch(error => {
      Logger.error('Error al cargar UserTable de forma lazy:', error);
      throw error;
    });
});

// Skeleton optimizado para UserTable
const UserTableSkeleton: React.FC = memo(() => {
  // Mensaje estático para carga más rápida
  const loadingMessage = 'Cargando tabla de usuarios...';

  return (
    <div className='space-y-6'>
      {/* Header de acciones */}
      <Card className='p-6'>
        <div className='flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center'>
          <div className='space-y-2'>
            <div className='h-6 w-48 bg-muted rounded animate-pulse'></div>
            <div className='h-4 w-64 bg-muted rounded animate-pulse'></div>
          </div>
          <div className='flex gap-3'>
            <div className='h-10 w-24 bg-muted rounded animate-pulse'></div>
            <div className='h-10 w-32 bg-muted rounded animate-pulse'></div>
          </div>
        </div>
      </Card>

      {/* Filtros skeleton */}
      <Card className='p-4'>
        <div className='flex flex-col lg:flex-row gap-4'>
          <div className='flex-1'>
            <div className='h-10 w-full bg-muted rounded animate-pulse'></div>
          </div>
          <div className='h-10 w-24 bg-muted rounded animate-pulse'></div>
        </div>
      </Card>

      {/* Tabla skeleton */}
      <Card>
        <div className='p-6'>
          <div className='flex flex-col items-center justify-center space-y-4'>
            <Spinner className='w-8 h-8' />
            <div className='text-center space-y-2'>
              <p className='text-muted-foreground font-medium'>{loadingMessage}</p>
              <div className='flex items-center justify-center space-x-1'>
                <div className='w-2 h-2 bg-primary rounded-full animate-bounce'></div>
                <div
                  className='w-2 h-2 bg-primary rounded-full animate-bounce'
                  style={{ animationDelay: '0.1s' }}
                ></div>
                <div
                  className='w-2 h-2 bg-primary rounded-full animate-bounce'
                  style={{ animationDelay: '0.2s' }}
                ></div>
              </div>
            </div>
          </div>
        </div>

        {/* Skeleton de filas de tabla */}
        <div className='border-t border-border'>
          <div className='overflow-x-auto'>
            <div className='min-w-full'>
              {/* Header de tabla skeleton */}
              <div className='bg-muted/50 px-6 py-3 border-b border-border'>
                <div className='flex space-x-6'>
                  <div className='h-4 w-20 bg-muted rounded animate-pulse'></div>
                  <div className='h-4 w-16 bg-muted rounded animate-pulse'></div>
                  <div className='h-4 w-24 bg-muted rounded animate-pulse'></div>
                  <div className='h-4 w-20 bg-muted rounded animate-pulse'></div>
                  <div className='h-4 w-32 bg-muted rounded animate-pulse'></div>
                  <div className='h-4 w-20 bg-muted rounded animate-pulse'></div>
                </div>
              </div>

              {/* Filas skeleton */}
              {Array.from({ length: 5 }).map((_, index) => (
                <div key={index} className='px-6 py-4 border-b border-border'>
                  <div className='flex items-center space-x-6'>
                    <div className='flex items-center space-x-3'>
                      <div className='w-8 h-8 bg-muted rounded-full animate-pulse'></div>
                      <div className='space-y-1'>
                        <div className='h-4 w-32 bg-muted rounded animate-pulse'></div>
                        <div className='h-3 w-16 bg-muted rounded animate-pulse'></div>
                      </div>
                    </div>
                    <div className='h-6 w-20 bg-muted rounded-full animate-pulse'></div>
                    <div className='h-4 w-24 bg-muted rounded animate-pulse'></div>
                    <div className='h-6 w-16 bg-muted rounded-full animate-pulse'></div>
                    <div className='h-4 w-28 bg-muted rounded animate-pulse'></div>
                    <div className='flex space-x-2'>
                      <div className='h-8 w-8 bg-muted rounded animate-pulse'></div>
                      <div className='h-8 w-8 bg-muted rounded animate-pulse'></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Paginación skeleton */}
          <div className='bg-muted/25 px-6 py-3 border-t border-border'>
            <div className='flex items-center justify-between'>
              <div className='h-4 w-32 bg-muted rounded animate-pulse'></div>
              <div className='flex items-center space-x-2'>
                <div className='h-8 w-8 bg-muted rounded animate-pulse'></div>
                <div className='h-4 w-24 bg-muted rounded animate-pulse'></div>
                <div className='h-8 w-8 bg-muted rounded animate-pulse'></div>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
});

UserTableSkeleton.displayName = 'UserTableSkeleton';

// Hook personalizado para performance monitoring
export const useUserTablePerformance = (enabled: boolean = true) => {
  useEffect(() => {
    if (!enabled) return;

    const performanceObserver = new PerformanceObserver(list => {
      const entries = list.getEntries();
      entries.forEach(entry => {
        if (entry.name.includes('UserTable')) {
          Logger.performance('UserTable performance metric', {
            name: entry.name,
            duration: `${entry.duration.toFixed(2)}ms`,
            startTime: entry.startTime,
            entryType: entry.entryType,
          });
        }
      });
    });

    performanceObserver.observe({ entryTypes: ['measure', 'navigation'] });

    return () => {
      performanceObserver.disconnect();
    };
  }, [enabled]);
};

// Hook para preloading inteligente
export const usePreloadUserTable = (enabled: boolean = true) => {
  useEffect(() => {
    if (!enabled) return;

    // Preload después de que el usuario haya estado en la página por un tiempo
    const preloadTimer = setTimeout(() => {
      Logger.debug('Iniciando preload de UserTable');
      import('./UserTable')
        .then(() => {
          Logger.debug('UserTable precargado exitosamente');
        })
        .catch(error => {
          Logger.warn('Error al precargar UserTable:', error);
        });
    }, 3000);

    // Preload en hover sobre elementos relacionados
    const handleMouseEnter = () => {
      Logger.debug('Hover detectado - precargando UserTable');
      import('./UserTable');
    };

    // Buscar elementos que podrían indicar interés en la tabla
    const navElements = document.querySelectorAll('[href*="usuarios"]');
    navElements.forEach(el => {
      el.addEventListener('mouseenter', handleMouseEnter, { once: true });
    });

    return () => {
      clearTimeout(preloadTimer);
      navElements.forEach(el => {
        el.removeEventListener('mouseenter', handleMouseEnter);
      });
    };
  }, [enabled]);
};

// Componente wrapper con todas las optimizaciones
interface UserTableLazyProps {
  enablePerformanceMonitoring?: boolean;
  enablePreloading?: boolean;
}

export const UserTableLazy: React.FC<UserTableLazyProps> = ({
  enablePerformanceMonitoring = true,
  enablePreloading = true,
}) => {
  // Hooks siempre se llaman en el mismo orden (reglas de React)
  useUserTablePerformance(enablePerformanceMonitoring);
  usePreloadUserTable(enablePreloading);

  return (
    <Suspense fallback={<UserTableSkeleton />}>
      <UserTableComponent />
    </Suspense>
  );
};

export default UserTableLazy;
