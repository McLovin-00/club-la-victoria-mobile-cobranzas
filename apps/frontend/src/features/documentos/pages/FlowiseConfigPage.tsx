import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '../../../components/ui/button';
import { Card } from '../../../components/ui/card';
import { showToast } from '../../../components/ui/Toast.utils';
import logger from '../../../utils/logger';
import { useRoleBasedNavigation } from '../../../hooks/useRoleBasedNavigation';
import { getRuntimeEnv } from '../../../lib/runtimeEnv';
import {
  ArrowLeftIcon,
  CogIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  SignalIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline';

interface FlowiseConfig {
  enabled: boolean;
  baseUrl: string;
  apiKey: string;
  flowId: string;
  timeout: number;
}

interface ConnectionStatus {
  isConnected: boolean;
  responseTime: number | null;
  lastCheck: Date | null;
  error: string | null;
}

export const FlowiseConfigPage: React.FC = () => {
  const { goBack } = useRoleBasedNavigation();
  const [config, setConfig] = useState<FlowiseConfig>({
    enabled: false,
    baseUrl: '',
    apiKey: '',
    flowId: '',
    timeout: 30000,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({
    isConnected: false,
    responseTime: null,
    lastCheck: null,
    error: null,
  });
  const [_hasChanges, setHasChanges] = useState(false);
  const isLoadingConfigRef = useRef(false);
  const hasLoadedOnceRef = useRef(false);
  const isSavingRef = useRef(false);
  const isTestingRef = useRef(false);

  const testConnection = useCallback(async (testConfig?: FlowiseConfig, showFeedback = true) => {
    if (isTestingRef.current) return; // evita doble click o llamadas concurrentes
    const configToTest = testConfig || config;
    
    if (!configToTest.baseUrl) {
      if (showFeedback) showToast('URL base requerida para test de conexión', 'error');
      return;
    }

    if (!configToTest.flowId) {
      if (showFeedback) showToast('Flow ID requerido para test de conexión', 'error');
      return;
    }

    setIsTesting(true);
    isTestingRef.current = true;
    const maxRetries = 1; // Solo un intento por pedido del usuario
    let lastError: any = null;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        if (showFeedback && attempt > 1) {
          showToast(`🔄 Reintento ${attempt-1}/2...`, 'default', 1500);
        }
        
        const startTime = Date.now();
        const token = localStorage.getItem('token');
        if (!token) {
          throw new Error('No hay token de autenticación');
        }
        
        const response = await fetch(
          `${getRuntimeEnv('VITE_DOCUMENTOS_API_URL') || ''}/api/docs/flowise/test`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify(configToTest),
          }
        );

        const responseTime = Date.now() - startTime;
        const result = await response.json();

        if (response.ok && result.success) {
          setConnectionStatus({
            isConnected: true,
            responseTime,
            lastCheck: new Date(),
            error: null,
          });
          if (showFeedback) {
            showToast('✨ Conexión exitosa con Flowise', 'success');
          }
          setIsTesting(false);
          isTestingRef.current = false;
          return; // Éxito
        } else {
          throw new Error(result.message || `Error ${response.status}`);
        }
      } catch (error) {
        lastError = error;
        
        // Si no es el último intento, esperar antes de reintentar
        if (attempt < maxRetries) {
          const waitTime = 2000; // 2 segundos fijos entre reintentos
          if (showFeedback) {
            const errorMsg = error instanceof Error ? error.message : 'Error desconocido';
            showToast(`⚠️ Falló: ${errorMsg}. Reintentando en 2s...`, 'warning', waitTime);
          }
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }
      }
    }
    
    // Todos los intentos fallaron
    const errorMessage = lastError instanceof Error ? lastError.message : 'Error desconocido';
    setConnectionStatus({
      isConnected: false,
      responseTime: null,
      lastCheck: new Date(),
      error: errorMessage,
    });
    if (showFeedback) {
      showToast(`❌ Test falló después de 3 intentos: ${errorMessage}`, 'error');
    }
    
    setIsTesting(false);
    isTestingRef.current = false;
  }, [config]);

  const loadConfig = useCallback(async () => {
    if (hasLoadedOnceRef.current) return; // evitar remounts en StrictMode
    if (isLoadingConfigRef.current) return; // evitar llamadas simultáneas
    hasLoadedOnceRef.current = true;
    isLoadingConfigRef.current = true;
    setIsLoading(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No hay token de autenticación');
      }

      let attempt = 0;
      while (attempt < 2) { // 1 intento + 1 reintento espaciado
        attempt++;
        const response = await fetch(
          `${getRuntimeEnv('VITE_DOCUMENTOS_API_URL') || ''}/api/docs/flowise`,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          }
        );

        if (response.status === 429 && attempt < 2) {
          // Espera fija de 2s antes de reintentar
          await new Promise(resolve => setTimeout(resolve, 2000));
          continue;
        }

        if (response.ok) {
          const data = await response.json();
          // Convertir timeout de milisegundos a segundos para mostrar en el frontend
          setConfig({
            ...data,
            timeout: Math.round(data.timeout / 1000)
          });
        } else {
          const errorData = await response.json().catch(() => ({ message: 'Error desconocido' }));
          logger.error('Error loading config:', response.status, errorData);
          throw new Error(`Error ${response.status}: ${errorData.message || response.statusText}`);
        }
        break;
      }
    } catch (error) {
      logger.error('Error loading config:', error);
    } finally {
      setIsLoading(false);
      isLoadingConfigRef.current = false;
    }
  }, []);

  useEffect(() => {
    const id = setTimeout(() => {
      loadConfig();
    }, 600); // pequeño delay para evitar colisiones con otras llamadas en el mount
    return () => clearTimeout(id);
  }, [loadConfig]);

  const saveConfig = useCallback(async () => {
    // Debug visual para confirmar que el handler se ejecuta
    logger.debug('FlowiseConfigPage: saveConfig clicked');
    if (isSavingRef.current) return; // evita doble click
    setIsLoading(true);
    isSavingRef.current = true;
    try {
      showToast('Guardando configuración…', 'default', 1200);
      const token = localStorage.getItem('token');
      logger.debug('Token found:', !!token);
      if (!token) {
        throw new Error('No hay token de autenticación');
      }
      
      const payload = {
        ...config,
        timeout: config.timeout * 1000 // Convertir segundos a milisegundos para backend
      };
      logger.debug('Sending payload:', payload);
      
      const url = `${getRuntimeEnv('VITE_DOCUMENTOS_API_URL') || ''}/api/docs/flowise`;
      logger.debug('PUT URL:', url);
      
      const response = await fetch(url,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
          },
          body: JSON.stringify(payload),
        }
      );
      
      logger.debug('Response received:', response.status, response.statusText);

      if (response.ok) {
        showToast('🚀 Configuración guardada exitosamente', 'success');
        setHasChanges(false);
        // No ejecutar test automáticamente; solo cuando el usuario lo solicite
      } else {
        throw new Error('Error al guardar configuración');
      }
    } catch (error) {
      logger.error('SaveConfig error:', error);
      const errorMsg = error instanceof Error ? error.message : 'Error desconocido';
      showToast(`Error al guardar: ${errorMsg}`, 'error');
    } finally {
      setIsLoading(false);
      isSavingRef.current = false;
    }
  }, [config]);

  const handleConfigChange = (field: keyof FlowiseConfig, value: any) => {
    setConfig(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const getStatusIcon = () => {
    if (isTesting) {
      return <div className="animate-spin rounded-full h-5 w-5 border-2 border-blue-600 border-t-transparent" />;
    }
    
    if (connectionStatus.isConnected) {
      return <CheckCircleIcon className="h-5 w-5 text-green-600" />;
    }
    
    if (connectionStatus.error) {
      return <ExclamationTriangleIcon className="h-5 w-5 text-red-600" />;
    }
    
    return <SignalIcon className="h-5 w-5 text-muted-foreground" />;
  };

  const getStatusText = () => {
    if (isTesting) return 'Probando conexión...';
    if (connectionStatus.isConnected) return 'Conectado';
    if (connectionStatus.error) return 'Error de conexión';
    return 'Sin probar';
  };

  const getStatusColor = () => {
    if (isTesting) return 'text-blue-600';
    if (connectionStatus.isConnected) return 'text-green-600';
    if (connectionStatus.error) return 'text-red-600';
    return 'text-muted-foreground';
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header minimalista */}
        <div className="mb-12">
          <div className="flex items-center justify-between mb-8">
            <Button
              variant="ghost"
              size="sm"
              onClick={goBack}
              className="text-muted-foreground hover:text-foreground"
            >
              <ArrowLeftIcon className="h-4 w-4 mr-2" />
              Volver
            </Button>
          </div>
          
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-purple-500 to-blue-600 rounded-2xl mb-6 shadow-lg">
              <SparklesIcon className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-4xl font-light text-foreground mb-3">
              Configuración Flowise
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Conecta tu instancia de Flowise para validación automática de documentos con inteligencia artificial
            </p>
          </div>
        </div>

        {/* Estado de conexión */}
        <Card className="mb-8 border-0 shadow-lg bg-card">
          <div className="p-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                {getStatusIcon()}
                <div>
                  <h3 className={`text-lg font-medium ${getStatusColor()}`}>
                    {getStatusText()}
                  </h3>
                  {connectionStatus.lastCheck && (
                    <p className="text-sm text-muted-foreground">
                      Última verificación: {connectionStatus.lastCheck.toLocaleTimeString()}
                    </p>
                  )}
                </div>
              </div>
              
              {connectionStatus.responseTime && (
                <div className="text-right">
                  <p className="text-sm font-medium text-foreground">
                    {connectionStatus.responseTime}ms
                  </p>
                  <p className="text-xs text-muted-foreground">Tiempo de respuesta</p>
                </div>
              )}
            </div>
            
            {connectionStatus.error && (
              <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/30 border border-red-100 dark:border-red-800 rounded-xl">
                <p className="text-sm text-red-700 dark:text-red-300">{connectionStatus.error}</p>
              </div>
            )}
          </div>
        </Card>

        {/* Configuración principal */}
        <Card className="border-0 shadow-lg bg-card">
          <div className="p-8">
            <form id="flowise-config-form" onSubmit={(e) => { e.preventDefault(); void saveConfig(); }} className="space-y-8">
              {/* Toggle principal */}
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-medium text-foreground">Habilitar Flowise</h3>
                  <p className="text-muted-foreground mt-1">
                    Activar validación automática con IA
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleConfigChange('enabled', !config.enabled)}
                  className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${
                    config.enabled ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'
                  }`}
                >
                  <span
                    className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                      config.enabled ? 'translate-x-7' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {config.enabled && (
                <>
                  {/* URL Base */}
                  <div className="space-y-3">
                    <label className="block text-sm font-medium text-foreground">
                      URL Base de Flowise
                    </label>
                    <input
                      type="url"
                      value={config.baseUrl}
                      onChange={(e) => handleConfigChange('baseUrl', e.target.value)}
                      placeholder="https://flowise.empresa.com"
                      className="w-full px-4 py-3 border border-border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-lg bg-background text-foreground"
                    />
                    <p className="text-sm text-muted-foreground">
                      URL completa de tu instancia Flowise
                    </p>
                  </div>

                  {/* API Key */}
                  <div className="space-y-3">
                    <label className="block text-sm font-medium text-foreground">
                      API Key (Opcional)
                    </label>
                    <input
                      type="password"
                      value={config.apiKey}
                      onChange={(e) => handleConfigChange('apiKey', e.target.value)}
                      placeholder="Clave API si es requerida"
                      autoComplete="off"
                      className="w-full px-4 py-3 border border-border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-background text-foreground"
                    />
                  </div>

                  {/* Flow ID */}
                  <div className="space-y-3">
                    <label className="block text-sm font-medium text-foreground">
                      Flow ID <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={config.flowId}
                      onChange={(e) => handleConfigChange('flowId', e.target.value)}
                      placeholder="doc-validator-flow-123"
                      className="w-full px-4 py-3 border border-border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-background text-foreground"
                    />
                    <p className="text-sm text-muted-foreground">
                      ID del flujo específico para validación de documentos
                    </p>
                  </div>

                  {/* Timeout */}
                  <div className="space-y-3">
                    <label className="block text-sm font-medium text-foreground">
                      Timeout (segundos)
                    </label>
                    <input
                      type="number"
                      value={config.timeout}
                      onChange={(e) => handleConfigChange('timeout', parseInt(e.target.value) || 30000)}
                      min="5000"
                      max="120000"
                      step="1000"
                      className="w-full px-4 py-3 border border-border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-background text-foreground"
                    />
                    <p className="text-sm text-muted-foreground">
                      Tiempo máximo de espera para validaciones
                    </p>
                  </div>
                </>
              )}
            </form>
          </div>
        </Card>

        {/* Acciones */}
        <div className="flex justify-between items-center mt-8">
          <Button
            type="button"
            variant="outline"
            onClick={() => testConnection()}
            disabled={!config.baseUrl || !config.flowId || isTesting}
            className="px-6 py-3"
          >
            <SignalIcon className="h-4 w-4 mr-2" />
            Probar Conexión
          </Button>

          <Button
            type="submit"
            form="flowise-config-form"
            disabled={isLoading}
            className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white"
          >
            {isLoading ? (
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
            ) : (
              <CogIcon className="h-4 w-4 mr-2" />
            )}
            Guardar Configuración
          </Button>
        </div>
      </div>
    </div>
  );
};
