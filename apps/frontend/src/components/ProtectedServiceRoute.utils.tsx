import React from 'react';
import { useServiceConfig } from '../hooks/useServiceConfig';

export const useCanAccessService = (service: 'documentos') => {
  const { config, isLoading, error } = useServiceConfig();
  return {
    canAccess: !isLoading && !error && (config[service]?.enabled ?? true),
    isLoading,
    error,
    serviceName: config[service]?.name || service,
  };
};

export const withServiceProtectionFactory = (
  ProtectedServiceRoute: (props: { service: 'documentos'; fallbackPath?: string; children: any }) => JSX.Element,
) => (
  service: 'documentos',
  fallbackPath?: string,
) => function withServiceProtection<P extends object>(Component: React.ComponentType<P>) {
  const ProtectedComponent: React.FC<P> = (props) => (
    <ProtectedServiceRoute service={service} fallbackPath={fallbackPath}>
      <Component {...props} />
    </ProtectedServiceRoute>
  );
  ProtectedComponent.displayName = `withServiceProtection(${Component.displayName || Component.name})`;
  return ProtectedComponent;
};


