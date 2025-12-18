import { Response } from 'express';
import { AuthRequest } from '../types';
import { ConfigService } from '../services/config.service';
import { FlowiseService } from '../services/flowise.service';
import { AppLogger } from '../config/logger';

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
      
      res.json({
        success: true,
        data: safeConfig,
      });
      
    } catch (error: any) {
      AppLogger.error('Error obteniendo config:', error);
      res.status(500).json({
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
      const _currentConfig = await ConfigService.getFlowiseConfig();
      const finalApiKey = apiKey?.startsWith('***') ? undefined : apiKey;
      
      await ConfigService.updateFlowiseConfig({
        enabled,
        baseUrl,
        apiKey: finalApiKey,
        flowId,
        timeout,
        systemPrompt,
      }, req.user!.userId);
      
      res.json({
        success: true,
        message: 'Configuración actualizada',
      });
      
    } catch (error: any) {
      AppLogger.error('Error actualizando config:', error);
      res.status(500).json({
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
      
      res.json({
        success: result.success,
        message: result.message,
      });
      
    } catch (error: any) {
      AppLogger.error('Error probando Flowise:', error);
      res.status(500).json({
        success: false,
        error: 'TEST_ERROR',
        message: error.message,
      });
    }
  }
}

