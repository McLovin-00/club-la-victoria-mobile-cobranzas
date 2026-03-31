import React from 'react';
import { Card } from './ui/card';
import logger from '../utils/logger';
import { getRuntimeFlag } from '../lib/runtimeEnv';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

/**
 * ErrorBoundary global – captura fallos en renderizado para evitar pantalla en blanco.
 * Siguiendo KISS: muestra un mensaje elegante + log a consola.
 */
export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log estructurado; en producción podríamos enviar a Sentry o similar
    logger.error('🌐 ErrorBoundary atrapó un error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className='min-h-screen flex items-center justify-center p-4 bg-background'>
          <Card className='p-8 max-w-lg w-full text-center'>
            <h2 className='text-2xl font-semibold mb-4 text-foreground'>
              Ha ocurrido un error inesperado
            </h2>
            <p className='text-muted-foreground mb-4'>
              Por favor, recarga la página o contacta al administrador del sistema.
            </p>
            {getRuntimeFlag('DEV') && this.state.error && (
              <pre className='text-xs text-left whitespace-pre-wrap overflow-auto max-h-64 text-red-500'>
                {this.state.error.message}
              </pre>
            )}
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}
