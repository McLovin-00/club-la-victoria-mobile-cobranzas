import { Response } from 'express';
import { AuthRequest } from '../types';
import { ConfigService } from '../services/config.service';
import { FlowiseService } from '../services/flowise.service';
import { AppLogger } from '../config/logger';

// Workaround Express 5 charset bug
function sendJson(res: Response, status: number, data: object): void {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.status(status).send(JSON.stringify(data));
}

export class ConfigController {
  
  /**
   * GET /config/flowise - Obtener configuración de Flowise
   */
  static async getFlowiseConfig(req: AuthRequest, res: Response): Promise<void> {
    try {
      const config = await ConfigService.getFlowiseConfig();
      
      // Ocultar API key parcialmente
      const safeConfig = {
        ...config,
        apiKey: config.apiKey ? `***${config.apiKey.slice(-4)}` : '',
      };
      
      sendJson(res, 200, {
        success: true,
        data: safeConfig,
      });
      
    } catch (error: any) {
      AppLogger.error('Error obteniendo config:', error);
      sendJson(res, 500, {
        success: false,
        error: 'CONFIG_ERROR',
        message: error.message,
      });
    }
  }
  
  /**
   * PUT /config/flowise - Actualizar configuración
   */
  static async updateFlowiseConfig(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { enabled, baseUrl, apiKey, flowId, timeout, systemPrompt } = req.body;
      
      // Si el apiKey viene con máscara, mantener el anterior
      const finalApiKey = apiKey?.startsWith('***') ? undefined : apiKey;
      
      await ConfigService.updateFlowiseConfig({
        enabled,
        baseUrl,
        apiKey: finalApiKey,
        flowId,
        timeout,
        systemPrompt,
      }, req.user!.userId);
      
      sendJson(res, 200, {
        success: true,
        message: 'Configuración actualizada',
      });
      
    } catch (error: any) {
      AppLogger.error('Error actualizando config:', error);
      sendJson(res, 500, {
        success: false,
        error: 'UPDATE_CONFIG_ERROR',
        message: error.message,
      });
    }
  }
  
  /**
   * POST /config/flowise/test - Probar conexión con Flowise
   */
  static async testFlowise(req: AuthRequest, res: Response): Promise<void> {
    try {
      const result = await FlowiseService.testConnection();
      
      sendJson(res, 200, {
        success: result.success,
        message: result.message,
      });
      
    } catch (error: any) {
      AppLogger.error('Error probando Flowise:', error);
      sendJson(res, 500, {
        success: false,
        error: 'TEST_ERROR',
        message: error.message,
      });
    }
  }
}
