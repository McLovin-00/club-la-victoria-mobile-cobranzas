import axios from 'axios';
import { AppLogger } from '../config/logger';
import { ConfigService } from './config.service';
import { FlowiseRemitoResponse } from '../types';

// ============================================================================
// HELPERS
// ============================================================================

/** Extrae el primer objeto JSON de un string usando búsqueda lineal (sin regex vulnerable) */
function extractJsonFromString(text: string): any | null {
  // Bounded extraction: limit input to prevent DoS
  const boundedText = text.slice(0, 50000);
  const startIdx = boundedText.indexOf('{');
  if (startIdx === -1) return null;
  const endIdx = boundedText.lastIndexOf('}');
  if (endIdx === -1 || endIdx < startIdx) return null;
  
  try {
    return JSON.parse(boundedText.slice(startIdx, endIdx + 1));
  } catch {
    return null;
  }
}

/** Extrae JSON de la respuesta de Flowise en cualquier formato */
function extractParsedData(data: any): any {
  if (typeof data === 'string') {
    return extractJsonFromString(data) || {};
  }
  if (typeof data !== 'object') return {};

  // Buscar texto en propiedades comunes
  const text = data.text || data.output || data.response || '';
  if (typeof text === 'string') {
    return extractJsonFromString(text) || {};
  }
  if (typeof text === 'object') {
    return text;
  }
  return {};
}

/** Extrae un valor con fallback a null */
const v = <T>(val: T | undefined | null): T | null => val ?? null;

/** Construye objeto emisor */
function buildEmisor(parsed: any): { nombre: string | null; detalle: string | null } {
  return { nombre: v(parsed.emisor?.nombre), detalle: v(parsed.emisor?.detalle) };
}

/** Construye objeto chofer */
function buildChofer(parsed: any): { nombre: string | null; dni: string | null } {
  return { nombre: v(parsed.chofer?.nombre), dni: v(parsed.chofer?.dni) };
}

/** Construye objeto patentes */
function buildPatentes(parsed: any): { chasis: string | null; acoplado: string | null } {
  return { chasis: v(parsed.patentes?.chasis), acoplado: v(parsed.patentes?.acoplado) };
}

/** Construye objeto pesosOrigen */
function buildPesosOrigen(parsed: any): { bruto: number | null; tara: number | null; neto: number | null } {
  return { bruto: v(parsed.pesosOrigen?.bruto), tara: v(parsed.pesosOrigen?.tara), neto: v(parsed.pesosOrigen?.neto) };
}

/** Construye la respuesta estructurada a partir de datos parseados */
function buildFlowiseResponse(parsed: any): FlowiseRemitoResponse {
  return {
    numeroRemito: v(parsed.numeroRemito),
    fechaOperacion: v(parsed.fechaOperacion),
    emisor: buildEmisor(parsed),
    cliente: v(parsed.cliente),
    producto: v(parsed.producto),
    transportista: v(parsed.transportista),
    chofer: buildChofer(parsed),
    patentes: buildPatentes(parsed),
    pesosOrigen: buildPesosOrigen(parsed),
    pesosDestino: v(parsed.pesosDestino),
    confianza: parsed.confianza ?? 0,
    camposDetectados: parsed.camposDetectados ?? [],
    errores: parsed.errores ?? [],
  };
}

// ============================================================================
// SERVICE
// ============================================================================

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
      
      // Endpoint correcto incluye /api/v1/
      const baseUrl = config.baseUrl.endsWith('/') ? config.baseUrl.slice(0, -1) : config.baseUrl;
      const endpoint = `${baseUrl}/api/v1/prediction/${config.flowId}`;
      
      AppLogger.info('🤖 Enviando remito a Flowise para análisis...');
      
      const response = await axios.post(
        endpoint,
        {
          question: 'Analiza esta imagen de remito y extrae los datos en formato JSON.',
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
      // Evitar referencias circulares al loggear errores de axios
      const errorMessage = error.message || 'Error de conexión con Flowise';
      const errorDetails = error.response?.data?.message || error.response?.status || '';
      AppLogger.error('💥 Error en análisis Flowise:', { message: errorMessage, details: errorDetails });
      return { 
        success: false, 
        error: errorMessage 
      };
    }
  }
  
  /**
   * Parsear respuesta de Flowise
   */
  private static parseResponse(data: any): FlowiseRemitoResponse {
    const parsed = extractParsedData(data);
    if (Object.keys(parsed).length === 0) {
      AppLogger.warn('⚠️ No se pudo parsear respuesta JSON de Flowise');
    }
    return buildFlowiseResponse(parsed);
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
      
      const baseUrl = config.baseUrl.endsWith('/') ? config.baseUrl.slice(0, -1) : config.baseUrl;
      const response = await axios.get(`${baseUrl}/api/v1/chatflows`, {
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

