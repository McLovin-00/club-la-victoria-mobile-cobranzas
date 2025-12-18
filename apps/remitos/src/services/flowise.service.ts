import axios from 'axios';
import { AppLogger } from '../config/logger';
import { ConfigService } from './config.service';
import { FlowiseRemitoResponse } from '../types';

export class FlowiseService {
  
  /**
   * Analizar imagen de remito con Flowise
   */
  static async analyzeRemito(imageBase64: string): Promise<{
    success: boolean;
    data?: FlowiseRemitoResponse;
    error?: string;
  }> {
    try {
      const config = await ConfigService.getFlowiseConfig();
      
      if (!config.enabled) {
        return { success: false, error: 'Flowise no está habilitado' };
      }
      
      if (!config.baseUrl || !config.flowId) {
        return { success: false, error: 'Flowise no está configurado correctamente' };
      }
      
      const endpoint = `${config.baseUrl}/prediction/${config.flowId}`;
      
      AppLogger.info('🤖 Enviando remito a Flowise para análisis...');
      
      const response = await axios.post(
        endpoint,
        {
          question: config.systemPrompt,
          uploads: [{
            data: `data:image/jpeg;base64,${imageBase64}`,
            type: 'file',
            name: 'remito.jpg',
            mime: 'image/jpeg',
          }],
        },
        {
          headers: {
            'Content-Type': 'application/json',
            ...(config.apiKey ? { 'Authorization': `Bearer ${config.apiKey}` } : {}),
          },
          timeout: config.timeout,
        }
      );
      
      if (response.status === 200 && response.data) {
        const parsed = FlowiseService.parseResponse(response.data);
        AppLogger.info('✅ Análisis completado', { confianza: parsed.confianza });
        return { success: true, data: parsed };
      }
      
      return { success: false, error: 'Respuesta inválida de Flowise' };
      
    } catch (error: any) {
      AppLogger.error('💥 Error en análisis Flowise:', error);
      return { 
        success: false, 
        error: error.message || 'Error de conexión con Flowise' 
      };
    }
  }
  
  /**
   * Parsear respuesta de Flowise
   */
  private static parseResponse(data: any): FlowiseRemitoResponse {
    // Intentar extraer JSON de la respuesta
    let parsed: any = {};
    
    try {
      if (typeof data === 'string') {
        // Buscar JSON en el string
        const jsonMatch = data.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          parsed = JSON.parse(jsonMatch[0]);
        }
      } else if (typeof data === 'object') {
        // Si ya es objeto, buscar el texto o json dentro
        const text = data.text || data.output || data.response || '';
        if (typeof text === 'string') {
          const jsonMatch = text.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            parsed = JSON.parse(jsonMatch[0]);
          }
        } else if (typeof text === 'object') {
          parsed = text;
        }
      }
    } catch {
      AppLogger.warn('⚠️ No se pudo parsear respuesta JSON de Flowise');
    }
    
    return {
      numeroRemito: parsed.numeroRemito || null,
      fechaOperacion: parsed.fechaOperacion || null,
      emisor: {
        nombre: parsed.emisor?.nombre || null,
        detalle: parsed.emisor?.detalle || null,
      },
      cliente: parsed.cliente || null,
      producto: parsed.producto || null,
      transportista: parsed.transportista || null,
      chofer: {
        nombre: parsed.chofer?.nombre || null,
        dni: parsed.chofer?.dni || null,
      },
      patentes: {
        chasis: parsed.patentes?.chasis || null,
        acoplado: parsed.patentes?.acoplado || null,
      },
      pesosOrigen: {
        bruto: parsed.pesosOrigen?.bruto || null,
        tara: parsed.pesosOrigen?.tara || null,
        neto: parsed.pesosOrigen?.neto || null,
      },
      pesosDestino: parsed.pesosDestino || null,
      confianza: parsed.confianza || 0,
      camposDetectados: parsed.camposDetectados || [],
      errores: parsed.errores || [],
    };
  }
  
  /**
   * Probar conexión con Flowise
   */
  static async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      const config = await ConfigService.getFlowiseConfig();
      
      if (!config.baseUrl) {
        return { success: false, message: 'URL de Flowise no configurada' };
      }
      
      const response = await axios.get(`${config.baseUrl}/chatflows`, {
        headers: config.apiKey ? { 'Authorization': `Bearer ${config.apiKey}` } : {},
        timeout: 10000,
      });
      
      if (response.status === 200) {
        // Verificar si el flowId existe
        if (config.flowId) {
          const flows = response.data || [];
          const exists = flows.some((f: any) => f.id === config.flowId);
          if (!exists) {
            return { success: true, message: 'Conexión OK, pero el Flow ID no existe' };
          }
        }
        return { success: true, message: 'Conexión exitosa' };
      }
      
      return { success: false, message: `HTTP ${response.status}` };
      
    } catch (error: any) {
      return { success: false, message: error.message || 'Error de conexión' };
    }
  }
}

