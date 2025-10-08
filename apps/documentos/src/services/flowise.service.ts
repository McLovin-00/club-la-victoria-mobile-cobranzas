import axios from 'axios';
import { promises as fs } from 'fs';
import os from 'os';
import path from 'path';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { getCurrentFlowiseConfig } from '../controllers/flowise-config.controller';
import { AppLogger } from '../config/logger';
import { PDFDocument } from 'pdf-lib';
import { getEnvironment } from '../config/environment';

/**
 * Flowise Service - Integración con IA para Extracción de Texto
 */

// Note: interface kept for documentation; not used directly to avoid lint unused-var

interface FlowiseResponse {
  success: boolean;
  data?: {
    extractedText: string;
    confidence: number;
    metadata: any;
  };
  error?: string;
}

export class FlowiseService {
  private static instance: FlowiseService;
  private endpoint!: string;
  private apiKey!: string;
  private enabled!: boolean;

  private constructor() {
    this.updateConfig();
  }

  private async updateConfig() {
    const config = await getCurrentFlowiseConfig();
    
    // Construir endpoint completo usando flowId de configuración
    this.endpoint = config.baseUrl && config.flowId
      ? (config.baseUrl.endsWith('/') 
          ? `${config.baseUrl}api/v1/prediction/${config.flowId}`
          : `${config.baseUrl}/api/v1/prediction/${config.flowId}`)
      : '';
    
    this.apiKey = config.apiKey || '';
    this.enabled = config.enabled && !!config.baseUrl && !!config.flowId;

    if (this.enabled) {
      AppLogger.info('🤖 Flowise Service configurado dinámicamente', {
        baseUrl: config.baseUrl,
        flowId: config.flowId,
        hasApiKey: Boolean(this.apiKey),
      });
    } else {
      AppLogger.warn('⚠️ Flowise Service deshabilitado - Falta configuración');
    }
  }

  /**
   * Clasificar documento (entidad, identidad, vencimiento, tipo)
   */
  public async classifyDocument(
    fileUrl: string,
    templateHint?: string,
    meta?: { documentId?: number }
  ): Promise<{
    success: boolean;
    entityType?: 'DADOR' | 'EMPRESA_TRANSPORTISTA' | 'CHOFER' | 'CAMION' | 'ACOPLADO';
    entityId?: number;
    expirationDate?: string;
    documentType?: string;
    confidence: number;
    raw?: any;
    error?: string;
  }> {
    const result = await this.extractDocumentText(fileUrl, templateHint || 'AUTO', meta);
    if (!result.success || !result.data) return { success: false, confidence: 0, error: result.error };
    const aiMeta = (result.data.metadata && (result.data.metadata as any).aiParsed) || {};
    const idStr = String(aiMeta.idEntidad || '').trim();
    const numericId = /^\d+$/.test(idStr) ? Number(idStr) : undefined;
    return {
      success: true,
      entityType: (aiMeta.entidad as any) || undefined,
      entityId: numericId,
      expirationDate: aiMeta.vencimientoDate,
      documentType: aiMeta.comprobante,
      confidence: result.data.confidence || 0,
      raw: result.data,
    };
  }

  public static getInstance(): FlowiseService {
    if (!FlowiseService.instance) {
      FlowiseService.instance = new FlowiseService();
    }
    return FlowiseService.instance;
  }

  /**
   * Extraer texto de documento usando Flowise
   */
  public async extractDocumentText(
    fileUrl: string,
    templateName: string,
    meta?: { documentId?: number }
  ): Promise<FlowiseResponse> {
    // Actualizar config antes de cada uso
    await this.updateConfig();
    
    if (!this.enabled) {
      return {
        success: false,
        error: 'Servicio Flowise no configurado',
      };
    }

    try {
      // Preparar uploads embebidos (base64). Si es PDF, rasterizar TODAS las páginas con Poppler y adjuntar cada frame.
      let uploadsPayload: any[] | undefined = undefined;
      const tmpDirsToCleanup: string[] = [];
      const cleanupTmp = async () => {
        for (const d of tmpDirsToCleanup) {
          try { await fs.rm(d, { recursive: true, force: true }); } catch {}
        }
      };
      try {
        // Convertir URL pública a interna para acceso directo
        let internalUrl = this.convertToInternalUrl(fileUrl);

        // Si la URL es una presignada de MinIO con host público y tenemos base interna, rehacerla a interna
        try {
          const env = getEnvironment();
          if (env.MINIO_PUBLIC_BASE_URL && env.MINIO_INTERNAL_BASE_URL) {
            const publicBase = new URL(env.MINIO_PUBLIC_BASE_URL);
            const u = new URL(fileUrl);
            if (u.hostname === publicBase.hostname) {
              // Si es una URL presignada pública, NO reescribir host (rompe la firma).
              // Generar una nueva URL presignada interna usando el SDK.
              try {
                const pathNoSlash = u.pathname.replace(/^\/+/, '');
                const [bucketName, ...rest] = pathNoSlash.split('/');
                const objectPath = rest.join('/');
                if (bucketName && objectPath) {
                  const { minioService } = await import('./minio.service');
                  internalUrl = await minioService.getSignedUrlInternal(bucketName, objectPath, 3600);
                }
              } catch (_genErr) {
                // Si falló la generación, último intento: descargar con la URL original pública
                internalUrl = fileUrl;
              }
            }
          }
        } catch {}

        const fileResp = await axios.get(internalUrl, { responseType: 'arraybuffer', timeout: 20000 });
        const mime = String(fileResp.headers['content-type'] || 'application/octet-stream');
        const fileName = (() => { try { const u = new URL(fileUrl); return (u.pathname.split('/').pop() || 'document'); } catch { return 'document'; } })();

        if (/^application\/pdf/i.test(mime)) {
          // Rasterizar páginas a PNG usando Poppler con reintentos y límites de páginas
          const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'docs-raster-'));
          tmpDirsToCleanup.push(tmpDir);
          const pdfPath = path.join(tmpDir, `${fileName}`);
          await fs.writeFile(pdfPath, Buffer.from(fileResp.data as ArrayBuffer));

          const outPrefix = path.join(tmpDir, 'page');
          const dpi = parseInt(process.env.PDF_RASTERIZE_DPI || '200', 10) || 200;
          const exec = promisify(execFile);
          const maxPages = Math.max(0, parseInt(process.env.PDF_RASTERIZE_MAX_PAGES || '0', 10));
          const maxRetry = Math.max(0, parseInt(process.env.PDF_RASTERIZE_MAX_RETRY || '1', 10));
          const rasterTimeout = Math.max(15000, parseInt(process.env.PDF_RASTERIZE_TIMEOUT_MS || '60000', 10));
          const outFormat = String(process.env.PDF_RASTERIZE_FORMAT || 'png').toLowerCase();
          const isJpeg = outFormat === 'jpeg' || outFormat === 'jpg';
          const _imageMime = isJpeg ? 'image/jpeg' : 'image/png';
          const jpegQuality = Math.max(10, Math.min(95, parseInt(process.env.PDF_RASTERIZE_JPEG_QUALITY || '75', 10)));
          const scaleTo = Math.max(0, parseInt(process.env.PDF_RASTERIZE_SCALE_TO || '0', 10));
          
          AppLogger.info('📄 Configuración de rasterización', {
            documentId: meta?.documentId,
            dpi,
            maxPages,
            maxRetry,
            env_max_pages: process.env.PDF_RASTERIZE_MAX_PAGES
          });
          const buildArgs = (bin: 'pdftoppm' | 'pdftocairo', limitPages?: number): string[] => {
            const base: string[] = [];
            if (bin === 'pdftoppm') {
              base.push(isJpeg ? '-jpeg' : '-png', '-r', String(dpi));
              if (scaleTo > 0) {
                base.push('-scale-to', String(scaleTo));
              }
              if (isJpeg && jpegQuality) {
                base.push('-jpegopt', `quality=${jpegQuality}`);
              }
            } else {
              // pdftocairo
              base.push(isJpeg ? '-jpeg' : '-png', '-r', String(dpi));
              // Nota: evitamos pasar -scale-to en pdftocairo por compatibilidad
            }
            if (limitPages && limitPages > 0) {
              base.push('-f', '1', '-l', String(limitPages));
            } else if (maxPages > 0) {
              base.push('-f', '1', '-l', String(maxPages));
            }
            base.push(pdfPath, outPrefix);
            return base;
          };

          const tryRasterize = async (): Promise<boolean> => {
            try {
              await exec('pdftoppm', buildArgs('pdftoppm'), { timeout: rasterTimeout });
              return true;
            } catch (err: any) {
              AppLogger.warn('⚠️ Falló pdftoppm; intentando pdftocairo', { message: err?.message, stderr: err?.stderr, documentId: meta?.documentId });
              try {
                await exec('pdftocairo', buildArgs('pdftocairo'), { timeout: rasterTimeout });
                return true;
              } catch (err2: any) {
                AppLogger.warn('⚠️ Falló pdftocairo inicial', { message: err2?.message, stderr: err2?.stderr, documentId: meta?.documentId });
                return false;
              }
            }
          };

          let ok = await tryRasterize();
          let attempts = 1;
          if (!ok && attempts <= maxRetry) {
            // Fallback 1: Sanitizar PDF re-serializándolo y limitar a 3 páginas
            try {
              const original = await fs.readFile(pdfPath);
              const pdfDoc = await PDFDocument.load(original, { ignoreEncryption: true });
              const sanitized = await pdfDoc.save();
              await fs.writeFile(pdfPath, Buffer.from(sanitized));
              await exec('pdftocairo', buildArgs('pdftocairo', 3), { timeout: rasterTimeout });
              ok = true;
              AppLogger.info('🧼 PDF sanitizado y rasterizado exitosamente', { documentId: meta?.documentId, attempts });
            } catch (sanErr: any) {
              attempts += 1;
              AppLogger.warn('⚠️ No se pudo sanitizar/rasterizar PDF', { message: sanErr?.message, documentId: meta?.documentId, attempts });
            }
          }
          if (!ok) {
            AppLogger.warn('⚠️ Se alcanzó el máximo de reintentos de rasterización', { documentId: meta?.documentId, maxRetry });
          }
          if (!ok) {
            throw new Error('RasterizationFailed');
          }
          // Listar archivos generados en orden (NO cargar en memoria aún)
          const files = await fs.readdir(tmpDir);
          const ext = isJpeg ? 'jpg' : 'png';
          const pageImgs = files
            .filter((f) => new RegExp(`page-?\\d+\\.${ext}$`, 'i').test(f) || new RegExp(`^page\\d+\\.${ext}$`, 'i').test(f))
            .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
          const pagePaths = pageImgs.map((name) => path.join(tmpDir, name));
          // Guardamos rutas para procesamiento por chunks más abajo
          (uploadsPayload as any) = pagePaths as any;
        } else {
          // No PDF: adjuntar archivo tal cual (imagen)
          const base64 = Buffer.from(fileResp.data as ArrayBuffer).toString('base64');
          const dataUrl = `data:${mime};base64,${base64}`;
          uploadsPayload = [{ type: 'file', name: fileName, data: dataUrl, mime }];
        }
      } catch (e) {
        // Si no podemos inyectar uploads (URL inválida/tiempo), continuamos solo con fileUrl
        AppLogger.warn('⚠️ No se pudo preparar uploads/frames para Flowise; se enviará solo fileUrl', { message: (e as any)?.message, documentId: meta?.documentId });
      }
      const request: any = {
        question: `Extraer y validar información del documento tipo "${templateName}"`,
        fileUrl,
        templateName,
      };
      if (uploadsPayload && Array.isArray(uploadsPayload) && uploadsPayload.length > 0) {
        // Procesar SIEMPRE por chunks leyendo archivos on-demand para minimizar memoria
        const pagePaths: string[] = uploadsPayload as any;
        const chunkSize = Math.max(1, parseInt(process.env.PDF_RASTERIZE_CHUNK_SIZE || '1', 10));
        const chunks: string[][] = [];
        for (let i = 0; i < pagePaths.length; i += chunkSize) {
          chunks.push(pagePaths.slice(i, i + chunkSize));
        }
        AppLogger.info('📚 Enviando páginas en chunks a Flowise', { total: pagePaths.length, chunkSize, chunks: chunks.length });
        let merged: any = undefined;
        try {
          for (let idx = 0; idx < chunks.length; idx++) {
            const paths = chunks[idx];
            // Leer y convertir cada imagen secuencialmente para minimizar picos de memoria
            const uploads: any[] = [];
            for (const full of paths) {
              const buf = await fs.readFile(full);
              const b64 = buf.toString('base64');
              const ext = path.extname(full).toLowerCase();
              const mimeType = (ext === '.jpg' || ext === '.jpeg') ? 'image/jpeg' : 'image/png';
              uploads.push({ type: 'file', name: path.basename(full), data: `data:${mimeType};base64,${b64}`, mime: mimeType });
            }
            const chunkReq = { ...request, uploads, chunkIndex: idx + 1, chunkCount: chunks.length };
            const resp = await axios.post(this.endpoint, chunkReq, {
              headers: { 'Authorization': `Bearer ${this.apiKey}`, 'Content-Type': 'application/json' },
              timeout: 30000,
            });
            const parsed = this.parseFlowiseResponse(resp.data);
            AppLogger.info('🧩 Flowise chunk result', { chunk: `${idx + 1}/${chunks.length}`, success: parsed.success });
            if (!merged && parsed.success) merged = parsed;
          }
        } finally {
          await cleanupTmp();
        }
        if (merged) return merged;
        // Si nada aportó datos, continuamos sin uploads (solo fileUrl)
      }

      AppLogger.info('🤖 Enviando documento a Flowise para análisis', {
        templateName,
        fileUrl: fileUrl.substring(0, 50) + '...',
      });

      const response = await axios.post(this.endpoint, request, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        timeout: 30000, // 30 segundos timeout
      });

      if (response.status === 200 && response.data) {
        const rawStr = (() => { try { return JSON.stringify(response.data); } catch { return String(response.data); } })();
        AppLogger.info(`📦 Flowise raw response preview: ${rawStr.slice(0, 1500)}`);

        const result = this.parseFlowiseResponse(response.data);
        const parsedInfo = {
          success: result.success,
          hasData: Boolean(result.data),
          confidence: result.data?.confidence,
          metaKeys: result.data ? Object.keys(result.data?.metadata || {}) : [],
        };
        AppLogger.info(`🧩 Flowise parsed result: ${JSON.stringify(parsedInfo)}`);
        
        AppLogger.info('✅ Respuesta recibida de Flowise', {
          success: result.success,
          confidence: result.data?.confidence,
        });

        return result;
      } else {
        throw new Error(`Respuesta inválida de Flowise: ${response.status}`);
      }
    } catch (error) {
      AppLogger.error('💥 Error consultando Flowise:', error);
      
      if ((axios as any).isAxiosError?.(error)) {
        return {
          success: false,
          error: `Error de conexión: ${(error as any).message}`,
        };
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido',
      };
    }
  }

  /**
   * Parsear respuesta de Flowise
   */
  private parseFlowiseResponse(data: any): FlowiseResponse {
    try {
      // Si Flowise responde en el nuevo formato de texto plano con etiquetas:
      // Entidad: DADOR|CHOFER|CAMION|ACOPLADO|Desconocido
      // Id_Entidad: CUIT|DNI|PATENTE|Desconocido
      // Comprobante: <texto>|Desconocido
      // Vencimiento: DD/MM/AAAA|Desconocido
      const rawText = typeof data === 'string'
        ? data
        : (typeof data?.result === 'string'
            ? data.result
            : (typeof data?.text === 'string' ? data.text : undefined));

      if (rawText) {
        const parsed = this.extractAiTaggedFields(rawText);
        return {
          success: true,
          data: {
            extractedText: rawText,
            confidence: parsed.confidence,
            metadata: {
              aiParsed: parsed,
            },
          },
        };
      }

      // Adaptar según el formato JSON de tu endpoint Flowise (fallback existente)
      if (data.success && data.extractedData) {
        return {
          success: true,
          data: {
            extractedText: data.extractedData.text || '',
            confidence: data.extractedData.confidence || 0.8,
            metadata: {
              processedAt: new Date().toISOString(),
              model: data.model || 'flowise',
              ...data.extractedData.metadata,
            },
          },
        };
      }

      return {
        success: false,
        error: data.error || 'Formato de respuesta inválido',
      };
    } catch (error) {
      AppLogger.error('💥 Error parseando respuesta de Flowise:', error);
      return {
        success: false,
        error: 'Error parseando respuesta de Flowise',
      };
    }
  }

  /**
   * Extrae los campos etiquetados del texto de la IA y normaliza valores
   */
  private extractAiTaggedFields(text: string): {
    entidad: string;
    idEntidad: string;
    comprobante: string;
    vencimiento: string; // DD/MM/AAAA o "Desconocido"
    vencimientoDate?: string; // ISO si se pudo parsear
    confidence: number;
  } {
    const getVal = (label: string) => {
      const re = new RegExp(`${label}\\s*:\\s*(.*)`, 'i');
      const m = text.match(re);
      return (m?.[1] || '').trim();
    };
    const entidadRaw = getVal('Entidad');
    const idRaw = getVal('Id_Entidad');
    const compRaw = getVal('Comprobante');
    const vencRaw = getVal('Vencimiento');

    const entidad = (entidadRaw || 'Desconocido').toUpperCase();
    const idEntidad = idRaw || 'Desconocido';
    const comprobante = this.normalizeComprobanteName(compRaw || 'Desconocido');
    const vencimiento = vencRaw || 'Desconocido';

    let vencimientoDate: string | undefined;
    const dmY = vencimiento.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (dmY) {
      const d = parseInt(dmY[1], 10);
      const m = parseInt(dmY[2], 10) - 1;
      const y = parseInt(dmY[3], 10);
      const date = new Date(Date.UTC(y, m, d));
      if (!isNaN(date.getTime())) vencimientoDate = date.toISOString();
    }

    // Heurística simple de confianza
    const confidence = [entidad, idEntidad, comprobante, vencimiento].filter(v => v && v.toLowerCase() !== 'desconocido').length / 4;

    return { entidad, idEntidad, comprobante, vencimiento, vencimientoDate, confidence };
  }

  /**
   * Normaliza el nombre del comprobante a los valores canónicos definidos en el prompt
   */
  private normalizeComprobanteName(original: string): string {
    const raw = (original || '').trim();
    if (!raw) return 'Desconocido';

    const noAccents = raw
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();

    const matchers: Array<{ re: RegExp; value: string }> = [
      // EMPRESA_TRANSPORTISTA
      { re: /\bconstancia\b.*\barca\b.*\bempresa\b|\barca\b.*\bempresa\b/i, value: 'Constancia de ARCA Empresa' },
      { re: /\bconstancia\b.*\biibb\b.*\bempresa\b|\bingresos\s*brutos\b.*\bempresa\b|\bconstancia\b.*\bingresos\s*brutos\b/i, value: 'Constancia IIBB de Empresa' },
      { re: /(f\.?\s*931|formulario\s*931).*(presentacion|acuse|constancia\s*de\s*pago|declaracion\s*jurada)|\bpresentacion\b.*f\.?\s*931/i, value: 'Presentación mensual de la declaración jurada F.931, acuse y constancia de pago' },

      // CHOFER
      { re: /^dni$|\bdni\b/i, value: 'DNI' },
      { re: /^licencia(\s*de\s*conducir)?$|\blicencia\b/i, value: 'Licencia' },
      { re: /\balta\s*temprana\b/i, value: 'Alta Temprana' },
      { re: /\bart\b/i, value: 'ART' },
      { re: /seguro\s*de\s*vida.*obligatorio|vida.*obligatorio/i, value: 'Seguro de Vida Obligatorio' },

      // CAMION (Tractor)
      { re: /titulo\b.*\btractor\b|\btitulo\s*tractor\b/i, value: 'Titulo Tractor' },
      { re: /cedula\b.*\btractor\b|\bcedula\s*tractor\b/i, value: 'Cedula Tractor' },
      { re: /seguro\b.*\btractor\b/i, value: 'Seguro Tractor' },
      { re: /(rto|vtv)\b.*\btractor\b/i, value: 'RTO Tractor' },

      // ACOPLADO (Semirremolque)
      { re: /titulo\b.*(semirremolque|acoplado)\b|\btitulo\s*(semirremolque|acoplado)\b/i, value: 'Titulo Semirremolque' },
      { re: /cedula\b.*(semirremolque|acoplado)\b|\bcedula\s*(semirremolque|acoplado)\b/i, value: 'Cedula Semirremolque' },
      { re: /seguro\b.*(acoplado|semirremolque)\b/i, value: 'Seguro Acoplado' },
      { re: /(rto|vtv)\b.*(semirremolque|acoplado)\b/i, value: 'RTO Semirremolque' },
    ];

    for (const { re, value } of matchers) {
      if (re.test(noAccents)) return value;
    }

    // Si no coincide, devuelve el texto original con primera letra mayúscula
    const pretty = raw.charAt(0).toUpperCase() + raw.slice(1);
    return pretty;
  }

  /**
   * Validar documento específico según template
   */
  public async validateDocument(
    fileUrl: string,
    templateName: string,
    entityType: string
  ): Promise<{
    isValid: boolean;
    confidence: number;
    extractedData?: any;
    errors?: string[];
  }> {
    const flowiseResult = await this.extractDocumentText(fileUrl, templateName);

    if (!flowiseResult.success || !flowiseResult.data) {
      return {
        isValid: false,
        confidence: 0,
        errors: [flowiseResult.error || 'Error de validación'],
      };
    }

    const { extractedText, confidence, metadata } = flowiseResult.data;

    // Validaciones específicas según el tipo de template
    const validationRules = this.getValidationRules(templateName, entityType);
    const isValid = this.applyValidationRules(extractedText, validationRules);

    return {
      isValid,
      confidence,
      extractedData: {
        text: extractedText,
        metadata,
        validationRules: validationRules.map(rule => rule.name),
        processedAt: new Date().toISOString(),
      },
      errors: isValid ? undefined : ['Documento no cumple con los criterios de validación'],
    };
  }

  /**
   * Obtener reglas de validación según template
   */
  private getValidationRules(templateName: string, entityType: string): Array<{
    name: string;
    pattern: RegExp;
    required: boolean;
  }> {
    const baseRules = [
      {
        name: 'Texto legible',
        pattern: /\w+/g,
        required: true,
      },
    ];

    // Reglas específicas por tipo de entidad
    switch (entityType) {
      case 'CHOFER':
        return [
          ...baseRules,
          {
            name: 'Número de licencia',
            pattern: /\b\d{6,10}\b/g,
            required: true,
          },
        ];
      case 'CAMION':
        return [
          ...baseRules,
          {
            name: 'Patente',
            pattern: /[A-Z]{3}\s?\d{3}|[A-Z]{2}\s?\d{3}\s?[A-Z]{2}/g,
            required: true,
          },
        ];
      default:
        return baseRules;
    }
  }

  /**
   * Aplicar reglas de validación
   */
  private applyValidationRules(
    text: string,
    rules: Array<{ name: string; pattern: RegExp; required: boolean }>
  ): boolean {
    for (const rule of rules) {
      if (rule.required && !rule.pattern.test(text)) {
        AppLogger.warn(`❌ Regla de validación fallida: ${rule.name}`);
        return false;
      }
    }
    return true;
  }

  /**
   * Health check del servicio
   */
  public async healthCheck(): Promise<boolean> {
    if (!this.enabled) {
      return false;
    }

    try {
      // Hacer una consulta simple para verificar conectividad
      const response = await axios.get(`${this.endpoint}/health`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
        timeout: 5000,
      });

      return response.status === 200;
    } catch (error) {
      AppLogger.error('💔 Flowise health check falló:', error);
      return false;
    }
  }

  /**
   * Convierte URL pública a URL interna para acceso directo desde el microservicio
   */
  private convertToInternalUrl(publicUrl: string): string {
    try {
      const env = getEnvironment();
      
      // Si hay URL interna configurada y la URL pública coincide con la base pública
      if (env.MINIO_INTERNAL_BASE_URL && env.MINIO_PUBLIC_BASE_URL) {
        const publicBase = new URL(env.MINIO_PUBLIC_BASE_URL);
        const url = new URL(publicUrl);
        
        // Si la URL pertenece al dominio público de MinIO, convertir a interna
        if (url.hostname === publicBase.hostname) {
          const internalBase = new URL(env.MINIO_INTERNAL_BASE_URL);
          return publicUrl.replace(
            `${publicBase.protocol}//${publicBase.host}`,
            `${internalBase.protocol}//${internalBase.host}`
          );
        }
      }
      
      return publicUrl;
    } catch (error) {
      AppLogger.warn('⚠️ Error convirtiendo URL a interna, usando original:', { publicUrl, error: (error as Error).message });
      return publicUrl;
    }
  }
}

// Exportar instancia singleton
export const flowiseService = FlowiseService.getInstance();