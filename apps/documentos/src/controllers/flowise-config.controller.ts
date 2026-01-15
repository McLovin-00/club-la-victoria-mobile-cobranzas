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

// ============================================================================
// HELPERS
// ============================================================================

/** Verifica que el usuario sea SUPERADMIN */
function requireSuperadmin(req: AuthRequest): void {
  if (req.user?.role !== 'SUPERADMIN') {
    throw createError('Acceso denegado', 403, 'ACCESS_DENIED');
  }
}

/** Valida configuración de Flowise */
function validateFlowiseInput(data: any, requireAll = false): void {
  if (data.enabled && !data.baseUrl) {
    throw createError('URL base requerida cuando Flowise está habilitado', 400, 'VALIDATION_ERROR');
  }
  if (data.enabled && !data.flowId) {
    throw createError('Flow ID requerido cuando Flowise está habilitado', 400, 'VALIDATION_ERROR');
  }
  if (data.timeout && (data.timeout < 5000 || data.timeout > 120000)) {
    throw createError('Timeout debe estar entre 5 y 120 segundos', 400, 'VALIDATION_ERROR');
  }
  if (requireAll) {
    if (!data.baseUrl) throw createError('URL base requerida para test', 400, 'VALIDATION_ERROR');
    if (!data.flowId) throw createError('Flow ID requerido para test', 400, 'VALIDATION_ERROR');
  }
}

/** Ejecuta fetch con timeout y manejo de errores */
async function fetchWithTimeout(
  url: string,
  headers: Record<string, string>,
  timeout: number
): Promise<{ ok: boolean; status: number; responseTime: number }> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  const startTime = Date.now();

  try {
    const response = await fetch(url, { method: 'GET', headers, signal: controller.signal });
    clearTimeout(timeoutId);
    const responseTime = Date.now() - startTime;
    
    // 404/405 es aceptable - el servidor responde
    const ok = response.ok || response.status === 404 || response.status === 405;
    return { ok, status: response.status, responseTime };
  } catch (fetchError) {
    clearTimeout(timeoutId);
    if (fetchError instanceof Error && fetchError.name === 'AbortError') {
      throw new Error(`Timeout después de ${timeout}ms`);
    }
    throw new Error(`Error de conexión: ${fetchError instanceof Error ? fetchError.message : 'desconocido'}`);
  }
}

/** Construye datos de actualización para Flowise */
function buildFlowiseUpdateData(input: any, currentApiKey?: string): Partial<FlowiseConfig> {
  const data: Partial<FlowiseConfig> = {};
  if (input.enabled !== undefined) data.enabled = Boolean(input.enabled);
  if (input.baseUrl !== undefined) data.baseUrl = input.baseUrl?.trim() || '';
  if (input.flowId !== undefined) data.flowId = input.flowId?.trim() || '';
  if (input.timeout !== undefined) data.timeout = parseInt(input.timeout) || 30000;
  if (input.apiKey !== undefined) {
    // Si es el placeholder, mantener la clave actual
    const isPlaceholder = input.apiKey === '***' + (currentApiKey?.slice(-4) || '');
    data.apiKey = isPlaceholder ? currentApiKey : (input.apiKey?.trim() || '');
  }
  return data;
}

// ============================================================================
// CONTROLLER
// ============================================================================

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
      requireSuperadmin(req);
      validateFlowiseInput(req.body);

      const currentConfig = await SystemConfigService.getFlowiseConfig();
      const updateData = buildFlowiseUpdateData(req.body, currentConfig.apiKey);

      await SystemConfigService.updateFlowiseConfig(updateData);

      AppLogger.info('🔧 Configuración Flowise actualizada en BD', {
        enabled: updateData.enabled, baseUrl: updateData.baseUrl,
        hasApiKey: Boolean(updateData.apiKey), flowId: updateData.flowId,
        timeout: updateData.timeout, updatedBy: req.user?.userId,
      });

      res.json({ success: true, message: 'Configuración actualizada exitosamente' });
    } catch (error) {
      AppLogger.error('💥 Error al actualizar configuración Flowise:', error);
      if (error instanceof Error && 'code' in error) throw error;
      throw createError('Error al actualizar configuración', 500, 'UPDATE_CONFIG_ERROR');
    }
  }

  /**
   * POST /api/docs/config/flowise/test - Probar conexión
   */
  static async testConnection(req: AuthRequest, res: Response): Promise<void> {
    try {
      requireSuperadmin(req);
      validateFlowiseInput(req.body, true);

      const { baseUrl, apiKey, flowId, timeout = 30000 } = req.body;

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'User-Agent': 'MKT-DocumentService/1.0',
      };

      // Solo agregar auth si no es el placeholder
      const currentConfig = await SystemConfigService.getFlowiseConfig();
      if (apiKey && apiKey !== '***' + currentConfig.apiKey?.slice(-4)) {
        headers['Authorization'] = `Bearer ${apiKey}`;
      }

      const testUrl = baseUrl.endsWith('/') 
        ? `${baseUrl}api/v1/prediction/${flowId}` 
        : `${baseUrl}/api/v1/prediction/${flowId}`;

      const result = await fetchWithTimeout(testUrl, headers, timeout);

      if (!result.ok) {
        throw new Error(`HTTP ${result.status}`);
      }

      AppLogger.info('✅ Test de conexión Flowise exitoso', { baseUrl, flowId, responseTime: result.responseTime, status: result.status, testedBy: req.user?.userId });
      
      res.json({
        success: true,
        responseTime: result.responseTime,
        status: result.status,
        message: result.status === 200 ? 'Conexión exitosa' : 'Servidor responde (conexión OK)',
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      AppLogger.error('💥 Error en test de conexión Flowise:', { error: errorMessage, baseUrl: req.body?.baseUrl, testedBy: req.user?.userId });
      res.status(400).json({ success: false, error: errorMessage });
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
