import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware';
import { AppLogger } from '../config/logger';
import { createError } from '../middlewares/error.middleware';
import { SystemConfigService } from '../services/system-config.service';

/**
 * Flowise Configuration Controller - Gestión Elegante
 */

interface FlowiseConfig {
  enabled: boolean;
  baseUrl: string;
  apiKey?: string;
  flowId: string;
  timeout: number;
}

// Configuración ahora se maneja en base de datos

export class FlowiseConfigController {
  
  /**
   * GET /api/docs/flowise - Obtener configuración
   */
  static async getConfig(req: AuthRequest, res: Response): Promise<void> {
    try {
      // Solo SUPERADMIN puede ver configuración
      if (req.user?.role !== 'SUPERADMIN') {
        throw createError('Acceso denegado', 403, 'ACCESS_DENIED');
      }

      const config = await SystemConfigService.getFlowiseConfig();

      // No exponer API key completa en respuesta
      const safeConfig = {
        ...config,
        apiKey: config.apiKey ? '***' + config.apiKey.slice(-4) : '',
      };

      res.json(safeConfig);
    } catch (error) {
      AppLogger.error('💥 Error al obtener configuración Flowise:', error);
      throw createError('Error al obtener configuración', 500, 'GET_CONFIG_ERROR');
    }
  }

  /**
   * PUT /api/docs/flowise - Actualizar configuración
   */
  static async updateConfig(req: AuthRequest, res: Response): Promise<void> {
    try {
      // Solo SUPERADMIN puede modificar configuración
      if (req.user?.role !== 'SUPERADMIN') {
        throw createError('Acceso denegado', 403, 'ACCESS_DENIED');
      }

      const { enabled, baseUrl, apiKey, flowId, timeout } = req.body as any;

      // Validaciones básicas
      if (enabled && !baseUrl) {
        throw createError('URL base requerida cuando Flowise está habilitado', 400, 'VALIDATION_ERROR');
      }

      if (enabled && !flowId) {
        throw createError('Flow ID requerido cuando Flowise está habilitado', 400, 'VALIDATION_ERROR');
      }

      if (timeout && (timeout < 5000 || timeout > 120000)) {
        throw createError('Timeout debe estar entre 5 y 120 segundos', 400, 'VALIDATION_ERROR');
      }

      // Obtener configuración actual para manejar API key
      const currentConfig = await SystemConfigService.getFlowiseConfig();
      
      // Preparar datos para actualizar
      const updateData: Partial<FlowiseConfig> = {};
      
      if (enabled !== undefined) updateData.enabled = Boolean(enabled);
      if (baseUrl !== undefined) updateData.baseUrl = baseUrl?.trim() || '';
      if (flowId !== undefined) updateData.flowId = flowId?.trim() || '';
      if (timeout !== undefined) updateData.timeout = parseInt(timeout) || 30000;
      
      // Manejar API key especialmente
      if (apiKey !== undefined) {
        // Si es el placeholder, mantener la clave actual
        updateData.apiKey = apiKey === '***' + (currentConfig.apiKey?.slice(-4) || '') 
          ? currentConfig.apiKey 
          : (apiKey?.trim() || '');
      }

      // Actualizar en base de datos
      await SystemConfigService.updateFlowiseConfig(updateData);

      AppLogger.info('🔧 Configuración Flowise actualizada en BD', {
        enabled: updateData.enabled,
        baseUrl: updateData.baseUrl,
        hasApiKey: Boolean(updateData.apiKey),
        flowId: updateData.flowId,
        timeout: updateData.timeout,
        updatedBy: req.user?.userId,
      });

      res.json({
        success: true,
        message: 'Configuración actualizada exitosamente',
      });
    } catch (error) {
      AppLogger.error('💥 Error al actualizar configuración Flowise:', error);
      if (error instanceof Error && 'code' in error) {
        throw error;
      }
      throw createError('Error al actualizar configuración', 500, 'UPDATE_CONFIG_ERROR');
    }
  }

  /**
   * POST /api/docs/config/flowise/test - Probar conexión
   */
  static async testConnection(req: AuthRequest, res: Response): Promise<void> {
    try {
      // Solo SUPERADMIN puede probar conexión
      if (req.user?.role !== 'SUPERADMIN') {
        throw createError('Acceso denegado', 403, 'ACCESS_DENIED');
      }

      const { baseUrl, apiKey, flowId, timeout } = req.body;

      if (!baseUrl) {
        throw createError('URL base requerida para test', 400, 'VALIDATION_ERROR');
      }

      if (!flowId) {
        throw createError('Flow ID requerido para test', 400, 'VALIDATION_ERROR');
      }

      const startTime = Date.now();

      // Probar conexión real
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout || 30000);

      try {
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          'User-Agent': 'MKT-DocumentService/1.0',
        };

        if (apiKey && apiKey !== '***' + (await SystemConfigService.getFlowiseConfig()).apiKey?.slice(-4)) {
          headers['Authorization'] = `Bearer ${apiKey}`;
        }

        // Test con endpoint de predicción real
        const testUrl = baseUrl.endsWith('/') 
          ? `${baseUrl}api/v1/prediction/${flowId}` 
          : `${baseUrl}/api/v1/prediction/${flowId}`;
        
        const response = await fetch(testUrl, {
          method: 'GET',
          headers,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);
        const responseTime = Date.now() - startTime;

        if (response.ok || response.status === 404 || response.status === 405) {
          // 404/405 es aceptable - significa que el servidor responde pero no acepta GET en ese endpoint
          AppLogger.info('✅ Test de conexión Flowise exitoso', {
            baseUrl,
            flowId,
            responseTime,
            status: response.status,
            testedBy: req.user?.userId,
          });

          res.json({
            success: true,
            responseTime,
            status: response.status,
            message: response.status === 200 ? 'Conexión exitosa' : 'Servidor responde (endpoint encontrado, conexión OK)',
          });
        } else {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
      } catch (fetchError) {
        clearTimeout(timeoutId);
        
        if (fetchError instanceof Error) {
          if (fetchError.name === 'AbortError') {
            throw new Error(`Timeout después de ${timeout || 30000}ms`);
          }
          throw new Error(`Error de conexión: ${fetchError.message}`);
        }
        throw new Error('Error desconocido de conexión');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      
      AppLogger.error('💥 Error en test de conexión Flowise:', {
        error: errorMessage,
        baseUrl: req.body?.baseUrl,
        testedBy: req.user?.userId,
      });

      res.status(400).json({
        success: false,
        error: errorMessage,
      });
    }
  }

  /**
   * GET /api/docs/config/flowise/status - Estado actual
   */
  static async getStatus(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (req.user?.role !== 'SUPERADMIN') {
        throw createError('Acceso denegado', 403, 'ACCESS_DENIED');
      }

      const cfg = await SystemConfigService.getFlowiseConfig();
      res.json({
        enabled: !!cfg.enabled,
        configured: Boolean(cfg.baseUrl),
        lastUpdated: new Date().toISOString(),
      });
    } catch (error) {
      AppLogger.error('💥 Error al obtener estado Flowise:', error);
      throw createError('Error al obtener estado', 500, 'GET_STATUS_ERROR');
    }
  }
}

// Exportar configuración actual para uso en servicios
export const getCurrentFlowiseConfig = async (): Promise<FlowiseConfig> => {
  return await SystemConfigService.getFlowiseConfig();
};
