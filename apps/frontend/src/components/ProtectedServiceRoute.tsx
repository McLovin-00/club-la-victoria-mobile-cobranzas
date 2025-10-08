import React from 'react';
import { Navigate } from 'react-router-dom';
import { useServiceConfig } from '../hooks/useServiceConfig';
import { Spinner } from './ui/spinner';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { ExclamationTriangleIcon, InformationCircleIcon } from '@heroicons/react/24/outline';
import { Logger } from '../lib/utils';
import { withServiceProtectionFactory } from './ProtectedServiceRoute.utils';

interface ProtectedServiceRouteProps {
  service: 'documentos';
  children: React.ReactNode;
  fallbackPath?: string;
  showMessage?: boolean;
}

/**
 * Componente para proteger rutas de servicios que pueden estar deshabilitados
 * Redirige al usuario si el servicio no está disponible
 */
export const ProtectedServiceRoute: React.FC<ProtectedServiceRouteProps> = ({ 
  service, 
  children, 
  fallbackPath = '/',
  showMessage = false
}) => {
  const { 
    config, 
    isLoading, 
    error, 
    summary 
  } = useServiceConfig();

  // Log para debugging
  React.useEffect(() => {
    Logger.debug('ProtectedServiceRoute:', {
      service,
      enabled: config[service]?.enabled || false,
      isLoading,
      hasError: !!error,
      configExists: !!config[service]
    });
  }, [service, config, isLoading, error]);

  // Mostrar spinner mientras carga la configuración
  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center min-h-[200px]">
        <div className="text-center space-y-4">
          <Spinner className="h-8 w-8 mx-auto" />
          <p className="text-sm text-muted-foreground">
            Verificando disponibilidad del servicio...
          </p>
        </div>
      </div>
    );
  }

  // Mostrar error si no se pudo cargar la configuración
  if (error) {
    Logger.error('Error loading service configuration:', error);
    
    if (showMessage) {
      return (
        <Alert variant="destructive">
          <ExclamationTriangleIcon className="h-4 w-4" />
          <AlertTitle>Error de Configuración</AlertTitle>
          <AlertDescription>
            No se pudo verificar la disponibilidad del servicio. 
            Por favor, recargue la página o contacte al administrador.
          </AlertDescription>
        </Alert>
      );
    }
    
    // Si no se debe mostrar mensaje, redirigir silenciosamente
    return <Navigate to={fallbackPath} replace />;
  }

  const isServiceEnabled = config[service]?.enabled ?? true;
  const serviceName = config[service]?.name || service;

  // Si el servicio está deshabilitado
  if (!isServiceEnabled) {
    Logger.warn(`Access denied to disabled service: ${service}`);
    
    if (showMessage) {
      return (
        <div className="container mx-auto px-4 py-8">
          <Alert>
            <InformationCircleIcon className="h-4 w-4" />
            <AlertTitle>Servicio No Disponible</AlertTitle>
            <AlertDescription className="space-y-2">
              <p>
                El servicio <strong>{serviceName}</strong> no está disponible en este momento.
              </p>
              <p className="text-sm text-muted-foreground">
                Los servicios disponibles son: {summary.enabledServices.join(', ') || 'Solo servicios principales'}
              </p>
            </AlertDescription>
          </Alert>
        </div>
      );
    }
    
    // Redirigir silenciosamente al fallback
    return <Navigate to={fallbackPath} replace />;
  }

  // Si el servicio está habilitado, renderizar el contenido
  return <>{children}</>;
};

/**
 * HOC (Higher Order Component) para proteger componentes de páginas
 */
const withServiceProtection = withServiceProtectionFactory(ProtectedServiceRoute);

/**
 * Hook para verificar si el usuario puede acceder a un servicio
 */
// No re-export of hooks/HOCs here to satisfy react-refresh

export default ProtectedServiceRoute; 