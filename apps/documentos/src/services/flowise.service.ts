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

const exec = promisify(execFile);

// ============================================================================
// TIPOS E INTERFACES
// ============================================================================
interface FlowiseResponse {
  success: boolean;
  data?: {
    extractedText: string;
    confidence: number;
    metadata: any;
  };
  error?: string;
}

interface RasterConfig {
  dpi: number;
  maxPages: number;
  maxRetry: number;
  timeout: number;
  format: 'png' | 'jpeg';
  jpegQuality: number;
  scaleTo: number;
}

interface DocumentMeta {
  documentId?: number;
}

// ============================================================================
// CONFIGURACIÓN DE RASTERIZACIÓN
// ============================================================================
function getRasterConfig(): RasterConfig {
  const format = String(process.env.PDF_RASTERIZE_FORMAT || 'png').toLowerCase();
  return {
    dpi: parseInt(process.env.PDF_RASTERIZE_DPI || '200', 10) || 200,
    maxPages: Math.max(0, parseInt(process.env.PDF_RASTERIZE_MAX_PAGES || '0', 10)),
    maxRetry: Math.max(0, parseInt(process.env.PDF_RASTERIZE_MAX_RETRY || '1', 10)),
    timeout: Math.max(15000, parseInt(process.env.PDF_RASTERIZE_TIMEOUT_MS || '60000', 10)),
    format: (format === 'jpeg' || format === 'jpg') ? 'jpeg' : 'png',
    jpegQuality: Math.max(10, Math.min(95, parseInt(process.env.PDF_RASTERIZE_JPEG_QUALITY || '75', 10))),
    scaleTo: Math.max(0, parseInt(process.env.PDF_RASTERIZE_SCALE_TO || '0', 10)),
  };
}

// ============================================================================
// FUNCIONES DE RASTERIZACIÓN
// ============================================================================
function buildRasterArgs(
  bin: 'pdftoppm' | 'pdftocairo',
  pdfPath: string,
  outPrefix: string,
  config: RasterConfig,
  limitPages?: number
): string[] {
  const isJpeg = config.format === 'jpeg';
  const args: string[] = [];

  if (bin === 'pdftoppm') {
    args.push(isJpeg ? '-jpeg' : '-png', '-r', String(config.dpi));
    if (config.scaleTo > 0) args.push('-scale-to', String(config.scaleTo));
    if (isJpeg && config.jpegQuality) args.push('-jpegopt', `quality=${config.jpegQuality}`);
  } else {
    args.push(isJpeg ? '-jpeg' : '-png', '-r', String(config.dpi));
  }

  const pages = limitPages || config.maxPages;
  if (pages > 0) args.push('-f', '1', '-l', String(pages));

  args.push(pdfPath, outPrefix);
  return args;
}

async function tryRasterize(
  pdfPath: string,
  outPrefix: string,
  config: RasterConfig,
  meta?: DocumentMeta,
  limitPages?: number
): Promise<boolean> {
  try {
    await exec('pdftoppm', buildRasterArgs('pdftoppm', pdfPath, outPrefix, config, limitPages), { timeout: config.timeout });
    return true;
  } catch (err: any) {
    AppLogger.warn('⚠️ Falló pdftoppm; intentando pdftocairo', { message: err?.message, documentId: meta?.documentId });
    try {
      await exec('pdftocairo', buildRasterArgs('pdftocairo', pdfPath, outPrefix, config, limitPages), { timeout: config.timeout });
      return true;
    } catch (err2: any) {
      AppLogger.warn('⚠️ Falló pdftocairo', { message: err2?.message, documentId: meta?.documentId });
      return false;
    }
  }
}

async function sanitizeAndRasterize(
  pdfPath: string,
  outPrefix: string,
  config: RasterConfig,
  meta?: DocumentMeta
): Promise<boolean> {
  try {
    const original = await fs.readFile(pdfPath);
    const pdfDoc = await PDFDocument.load(original, { ignoreEncryption: true });
    const sanitized = await pdfDoc.save();
    await fs.writeFile(pdfPath, Buffer.from(sanitized));
    await exec('pdftocairo', buildRasterArgs('pdftocairo', pdfPath, outPrefix, config, 3), { timeout: config.timeout });
    AppLogger.info('🧼 PDF sanitizado y rasterizado exitosamente', { documentId: meta?.documentId });
    return true;
  } catch (err: any) {
    AppLogger.warn('⚠️ No se pudo sanitizar/rasterizar PDF', { message: err?.message, documentId: meta?.documentId });
    return false;
  }
}

async function rasterizePdf(
  pdfBuffer: Buffer,
  fileName: string,
  config: RasterConfig,
  meta?: DocumentMeta
): Promise<{ paths: string[]; tmpDir: string }> {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'docs-raster-'));
  const pdfPath = path.join(tmpDir, fileName);
  const outPrefix = path.join(tmpDir, 'page');

  await fs.writeFile(pdfPath, pdfBuffer);

  AppLogger.info('📄 Configuración de rasterización', {
    documentId: meta?.documentId,
    dpi: config.dpi,
    maxPages: config.maxPages,
  });

  let ok = await tryRasterize(pdfPath, outPrefix, config, meta);
  
  if (!ok && config.maxRetry > 0) {
    ok = await sanitizeAndRasterize(pdfPath, outPrefix, config, meta);
  }

  if (!ok) {
    AppLogger.warn('⚠️ Se alcanzó el máximo de reintentos de rasterización', { documentId: meta?.documentId });
    throw new Error('RasterizationFailed');
  }

  // Listar archivos generados
  const files = await fs.readdir(tmpDir);
  const ext = config.format === 'jpeg' ? 'jpg' : 'png';
  const pageImgs = files
    .filter((f) => new RegExp(`page-?\\d+\\.${ext}$`, 'i').test(f) || new RegExp(`^page\\d+\\.${ext}$`, 'i').test(f))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

  return { paths: pageImgs.map((name) => path.join(tmpDir, name)), tmpDir };
}

// ============================================================================
// FUNCIONES DE PROCESAMIENTO
// ============================================================================
async function prepareImageUpload(filePath: string): Promise<{ type: string; name: string; data: string; mime: string }> {
  const buf = await fs.readFile(filePath);
  const ext = path.extname(filePath).toLowerCase();
  const mime = (ext === '.jpg' || ext === '.jpeg') ? 'image/jpeg' : 'image/png';
  return {
    type: 'file',
    name: path.basename(filePath),
    data: `data:${mime};base64,${buf.toString('base64')}`,
    mime,
  };
}

async function sendChunkedRequests(
  endpoint: string,
  apiKey: string,
  request: any,
  pagePaths: string[],
  parseResponse: (data: any) => FlowiseResponse
): Promise<FlowiseResponse | null> {
  const chunkSize = Math.max(1, parseInt(process.env.PDF_RASTERIZE_CHUNK_SIZE || '1', 10));
  const chunks: string[][] = [];
  
  for (let i = 0; i < pagePaths.length; i += chunkSize) {
    chunks.push(pagePaths.slice(i, i + chunkSize));
  }

  AppLogger.info('📚 Enviando páginas en chunks a Flowise', { total: pagePaths.length, chunkSize, chunks: chunks.length });

  for (let idx = 0; idx < chunks.length; idx++) {
    const uploads = await Promise.all(chunks[idx].map(prepareImageUpload));
    const chunkReq = { ...request, uploads, chunkIndex: idx + 1, chunkCount: chunks.length };
    
    const resp = await axios.post(endpoint, chunkReq, {
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      timeout: 30000,
    });
    
    const parsed = parseResponse(resp.data);
    AppLogger.info('🧩 Flowise chunk result', { chunk: `${idx + 1}/${chunks.length}`, success: parsed.success });
    
    if (parsed.success) return parsed;
  }

  return null;
}

async function getInternalFileUrl(fileUrl: string): Promise<string> {
  const env = getEnvironment();
  
  if (!env.MINIO_PUBLIC_BASE_URL || !env.MINIO_INTERNAL_BASE_URL) {
    return fileUrl;
  }

  try {
    const publicBase = new URL(env.MINIO_PUBLIC_BASE_URL);
    const u = new URL(fileUrl);
    
    if (u.hostname !== publicBase.hostname) return fileUrl;

    // Generar nueva URL presignada interna
    const pathNoSlash = u.pathname.replace(/^\/+/, '');
    const [bucketName, ...rest] = pathNoSlash.split('/');
    const objectPath = rest.join('/');
    
    if (bucketName && objectPath) {
      const { minioService } = await import('./minio.service');
      return await minioService.getSignedUrlInternal(bucketName, objectPath, 3600);
    }
  } catch (err) {
    AppLogger.warn('⚠️ Error generando URL interna, usando original', { error: (err as Error).message });
  }

  return fileUrl;
}

function extractFileName(fileUrl: string): string {
  try {
    const u = new URL(fileUrl);
    return path.basename(u.pathname) || 'document';
  } catch {
    return 'document';
  }
}

// ============================================================================
// NORMALIZACIÓN DE COMPROBANTES
// ============================================================================
// Helper para simplificar regex F.931 (dividida para reducir complejidad)
const F931_PATTERNS = [
  /f\.?\s*931.*(presentacion|acuse|constancia\s*de\s*pago)/i,
  /formulario\s*931.*(presentacion|acuse|declaracion)/i,
  /presentacion\b.*f\.?\s*931/i,
];
function matchesF931(text: string): boolean {
  return F931_PATTERNS.some(p => p.test(text));
}

const COMPROBANTE_MATCHERS: Array<{ re: RegExp | ((t: string) => boolean); value: string }> = [
  // EMPRESA_TRANSPORTISTA
  { re: /\bconstancia\b.*\barca\b.*\bempresa\b/i, value: 'Constancia de ARCA Empresa' },
  { re: /\barca\b.*\bempresa\b/i, value: 'Constancia de ARCA Empresa' },
  { re: /\bconstancia\b.*\biibb\b.*\bempresa\b/i, value: 'Constancia IIBB de Empresa' },
  { re: /\bingresos\s*brutos\b.*\bempresa\b/i, value: 'Constancia IIBB de Empresa' },
  { re: matchesF931, value: 'Presentación mensual de la declaración jurada F.931, acuse y constancia de pago' },
  // CHOFER
  { re: /^dni$|\bdni\b/i, value: 'DNI' },
  { re: /^licencia(\s*de\s*conducir)?$|\blicencia\b/i, value: 'Licencia' },
  { re: /\balta\s*temprana\b/i, value: 'Alta Temprana' },
  { re: /\bart\b/i, value: 'ART' },
  { re: /seguro\s*de\s*vida.*obligatorio|vida.*obligatorio/i, value: 'Seguro de Vida Obligatorio' },
  // CAMION
  { re: /titulo\b.*\btractor\b|\btitulo\s*tractor\b/i, value: 'Titulo Tractor' },
  { re: /cedula\b.*\btractor\b|\bcedula\s*tractor\b/i, value: 'Cedula Tractor' },
  { re: /seguro\b.*\btractor\b/i, value: 'Seguro Tractor' },
  { re: /(rto|vtv)\b.*\btractor\b/i, value: 'RTO Tractor' },
  // ACOPLADO
  { re: /titulo\b.*(semirremolque|acoplado)\b|\btitulo\s*(semirremolque|acoplado)\b/i, value: 'Titulo Semirremolque' },
  { re: /cedula\b.*(semirremolque|acoplado)\b|\bcedula\s*(semirremolque|acoplado)\b/i, value: 'Cedula Semirremolque' },
  { re: /seguro\b.*(acoplado|semirremolque)\b/i, value: 'Seguro Acoplado' },
  { re: /(rto|vtv)\b.*(semirremolque|acoplado)\b/i, value: 'RTO Semirremolque' },
];

function normalizeComprobanteName(original: string): string {
  const raw = (original || '').trim();
  if (!raw) return 'Desconocido';

  const noAccents = raw.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

  for (const { re, value } of COMPROBANTE_MATCHERS) {
    const matches = typeof re === 'function' ? re(noAccents) : re.test(noAccents);
    if (matches) return value;
  }

  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

// ============================================================================
// CLASE PRINCIPAL
// ============================================================================
export class FlowiseService {
  private static instance: FlowiseService;
  private endpoint!: string;
  private apiKey!: string;
  private enabled!: boolean;

  private circuitFailures = 0;
  private circuitOpenUntil = 0;
  private static readonly CIRCUIT_THRESHOLD = 5;
  private static readonly CIRCUIT_RESET_MS = 60_000;

  private isCircuitOpen(): boolean {
    if (this.circuitOpenUntil > Date.now()) return true;
    if (this.circuitOpenUntil > 0 && Date.now() >= this.circuitOpenUntil) {
      this.circuitFailures = 0;
      this.circuitOpenUntil = 0;
    }
    return false;
  }

  private recordSuccess(): void {
    this.circuitFailures = 0;
    this.circuitOpenUntil = 0;
  }

  private recordFailure(): void {
    this.circuitFailures++;
    if (this.circuitFailures >= FlowiseService.CIRCUIT_THRESHOLD) {
      this.circuitOpenUntil = Date.now() + FlowiseService.CIRCUIT_RESET_MS;
      AppLogger.warn(`Circuit breaker ABIERTO para Flowise (${this.circuitFailures} fallos consecutivos). Se reintentará en ${FlowiseService.CIRCUIT_RESET_MS / 1000}s`);
    }
  }

  private constructor() {
    this.updateConfig();
  }

  private async updateConfig() {
    const config = await getCurrentFlowiseConfig();
    
    // Construir endpoint evitando ternarios anidados
    let endpoint = '';
    if (config.baseUrl && config.flowId) {
      const base = config.baseUrl.endsWith('/') ? config.baseUrl.slice(0, -1) : config.baseUrl;
      endpoint = `${base}/api/v1/prediction/${config.flowId}`;
    }
    this.endpoint = endpoint;
    
    this.apiKey = config.apiKey || '';
    this.enabled = config.enabled && !!config.baseUrl && !!config.flowId;

    if (this.enabled) {
      AppLogger.info('🤖 Flowise Service configurado', { baseUrl: config.baseUrl, flowId: config.flowId });
    } else {
      AppLogger.warn('⚠️ Flowise Service deshabilitado - Falta configuración');
    }
  }

  public static getInstance(): FlowiseService {
    if (!FlowiseService.instance) {
      FlowiseService.instance = new FlowiseService();
    }
    return FlowiseService.instance;
  }

  /**
   * Clasificar documento (entidad, identidad, vencimiento, tipo)
   */
  public async classifyDocument(
    fileUrl: string,
    templateHint?: string,
    meta?: DocumentMeta
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
    if (!result.success || !result.data) {
      return { success: false, confidence: 0, error: result.error };
    }
    
    const aiMeta = result.data.metadata?.aiParsed || {};
    const idStr = String(aiMeta.idEntidad || '').trim();
    const numericId = /^\d+$/.test(idStr) ? Number(idStr) : undefined;
    
    return {
      success: true,
      entityType: aiMeta.entidad || undefined,
      entityId: numericId,
      expirationDate: aiMeta.vencimientoDate,
      documentType: aiMeta.comprobante,
      confidence: result.data.confidence || 0,
      raw: result.data,
    };
  }

  /**
   * Extraer texto de documento usando Flowise
   */
  public async extractDocumentText(
    fileUrl: string,
    templateName: string,
    meta?: DocumentMeta
  ): Promise<FlowiseResponse> {
    await this.updateConfig();
    
    if (!this.enabled) {
      return { success: false, error: 'Servicio Flowise no configurado' };
    }

    if (this.isCircuitOpen()) {
      return { success: false, error: 'Circuit breaker abierto: Flowise temporalmente no disponible' };
    }

    const tmpDirs: string[] = [];
    const cleanup = async () => {
      for (const d of tmpDirs) {
        try { await fs.rm(d, { recursive: true, force: true }); } catch { /* Limpieza de temp no crítica */ }
      }
    };

    try {
      const result = await this.processDocument(fileUrl, templateName, meta, tmpDirs);
      if (result.success) this.recordSuccess();
      else this.recordFailure();
      return result;
    } catch (error) {
      this.recordFailure();
      AppLogger.error('Error consultando Flowise:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido',
      };
    } finally {
      await cleanup();
    }
  }

  private async processDocument(
    fileUrl: string,
    templateName: string,
    meta: DocumentMeta | undefined,
    tmpDirs: string[]
  ): Promise<FlowiseResponse> {
    // 1. Obtener URL interna
    const internalUrl = await getInternalFileUrl(fileUrl);
    
    // 2. Descargar archivo
    const fileResp = await axios.get(internalUrl, { responseType: 'arraybuffer', timeout: 20000 });
    const mime = String(fileResp.headers['content-type'] || 'application/octet-stream');
    const fileName = extractFileName(fileUrl);
    const buffer = Buffer.from(fileResp.data as ArrayBuffer);

    // 3. Preparar request base
    const request = {
      question: `Extraer y validar información del documento tipo "${templateName}"`,
      fileUrl,
      templateName,
    };

    // 4. Procesar según tipo de archivo
    if (/^application\/pdf/i.test(mime)) {
      return this.processPdfDocument(buffer, fileName, request, meta, tmpDirs);
    }
    
    return this.processImageDocument(buffer, fileName, mime, request);
  }

  private async processPdfDocument(
    buffer: Buffer,
    fileName: string,
    request: any,
    meta: DocumentMeta | undefined,
    tmpDirs: string[]
  ): Promise<FlowiseResponse> {
    const config = getRasterConfig();
    
    try {
      const { paths, tmpDir } = await rasterizePdf(buffer, fileName, config, meta);
      tmpDirs.push(tmpDir);

      if (paths.length > 0) {
        const chunkedResult = await sendChunkedRequests(
          this.endpoint,
          this.apiKey,
          request,
          paths,
          (data) => this.parseFlowiseResponse(data)
        );
        if (chunkedResult) return chunkedResult;
      }
    } catch (err) {
      AppLogger.warn('⚠️ Error procesando PDF, intentando sin rasterización', { error: (err as Error).message });
    }

    // Fallback: enviar solo fileUrl
    return this.sendDirectRequest(request);
  }

  private async processImageDocument(
    buffer: Buffer,
    fileName: string,
    mime: string,
    request: any
  ): Promise<FlowiseResponse> {
    const base64 = buffer.toString('base64');
    const uploads = [{ type: 'file', name: fileName, data: `data:${mime};base64,${base64}`, mime }];
    
    const response = await axios.post(this.endpoint, { ...request, uploads }, {
      headers: { 'Authorization': `Bearer ${this.apiKey}`, 'Content-Type': 'application/json' },
      timeout: 30000,
    });

    return this.parseFlowiseResponse(response.data);
  }

  private async sendDirectRequest(request: any): Promise<FlowiseResponse> {
    AppLogger.info('🤖 Enviando documento a Flowise para análisis', {
      templateName: request.templateName,
      fileUrl: request.fileUrl?.substring(0, 50) + '...',
    });

    const response = await axios.post(this.endpoint, request, {
      headers: { 'Authorization': `Bearer ${this.apiKey}`, 'Content-Type': 'application/json' },
      timeout: 30000,
    });

    if (response.status !== 200 || !response.data) {
      throw new Error(`Respuesta inválida de Flowise: ${response.status}`);
    }

    const result = this.parseFlowiseResponse(response.data);
    AppLogger.info('✅ Respuesta recibida de Flowise', { success: result.success, confidence: result.data?.confidence });
    return result;
  }

  private parseFlowiseResponse(data: any): FlowiseResponse {
    try {
      // Extraer texto de la respuesta buscando en diferentes ubicaciones
      let rawText: string | undefined;
      if (typeof data === 'string') {
        rawText = data;
      } else if (typeof data?.result === 'string') {
        rawText = data.result;
      } else if (typeof data?.text === 'string') {
        rawText = data.text;
      }

      if (rawText) {
        const parsed = this.extractAiTaggedFields(rawText);
        return {
          success: true,
          data: { extractedText: rawText, confidence: parsed.confidence, metadata: { aiParsed: parsed } },
        };
      }

      if (data.success && data.extractedData) {
        return {
          success: true,
          data: {
            extractedText: data.extractedData.text || '',
            confidence: data.extractedData.confidence || 0.8,
            metadata: { processedAt: new Date().toISOString(), model: data.model || 'flowise', ...data.extractedData.metadata },
          },
        };
      }

      return { success: false, error: data.error || 'Formato de respuesta inválido' };
    } catch (error) {
      AppLogger.error('💥 Error parseando respuesta de Flowise:', error);
      return { success: false, error: 'Error parseando respuesta de Flowise' };
    }
  }

  private extractAiTaggedFields(text: string): {
    entidad: string;
    idEntidad: string;
    comprobante: string;
    vencimiento: string;
    vencimientoDate?: string;
    confidence: number;
  } {
    const getVal = (label: string): string => {
      const m = text.match(new RegExp(`${label}\\s*:\\s*(.*)`, 'i'));
      return (m?.[1] || '').trim();
    };

    const entidad = (getVal('Entidad') || 'Desconocido').toUpperCase();
    const idEntidad = getVal('Id_Entidad') || 'Desconocido';
    const comprobante = normalizeComprobanteName(getVal('Comprobante') || 'Desconocido');
    const vencimiento = getVal('Vencimiento') || 'Desconocido';

    let vencimientoDate: string | undefined;
    const dmY = vencimiento.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (dmY) {
      const date = new Date(Date.UTC(parseInt(dmY[3], 10), parseInt(dmY[2], 10) - 1, parseInt(dmY[1], 10)));
      if (!isNaN(date.getTime())) vencimientoDate = date.toISOString();
    }

    const confidence = [entidad, idEntidad, comprobante, vencimiento]
      .filter(v => v && v.toLowerCase() !== 'desconocido').length / 4;

    return { entidad, idEntidad, comprobante, vencimiento, vencimientoDate, confidence };
  }

  /**
   * Validar documento específico según template
   */
  public async validateDocument(
    fileUrl: string,
    templateName: string,
    entityType: string
  ): Promise<{ isValid: boolean; confidence: number; extractedData?: any; errors?: string[] }> {
    const result = await this.extractDocumentText(fileUrl, templateName);

    if (!result.success || !result.data) {
      return { isValid: false, confidence: 0, errors: [result.error || 'Error de validación'] };
    }

    const { extractedText, confidence, metadata } = result.data;
    const rules = this.getValidationRules(entityType);
    const isValid = rules.every(rule => !rule.required || rule.pattern.test(extractedText));

    return {
      isValid,
      confidence,
      extractedData: { text: extractedText, metadata, processedAt: new Date().toISOString() },
      errors: isValid ? undefined : ['Documento no cumple con los criterios de validación'],
    };
  }

  private getValidationRules(entityType: string): Array<{ name: string; pattern: RegExp; required: boolean }> {
    const baseRules = [{ name: 'Texto legible', pattern: /\w+/g, required: true }];

    switch (entityType) {
      case 'CHOFER':
        return [...baseRules, { name: 'Número de licencia', pattern: /\b\d{6,10}\b/g, required: true }];
      case 'CAMION':
        return [...baseRules, { name: 'Patente', pattern: /[A-Z]{3}\s?\d{3}|[A-Z]{2}\s?\d{3}\s?[A-Z]{2}/g, required: true }];
      default:
        return baseRules;
    }
  }

  public async healthCheck(): Promise<boolean> {
    if (!this.enabled) return false;

    try {
      const response = await axios.get(`${this.endpoint}/health`, {
        headers: { 'Authorization': `Bearer ${this.apiKey}` },
        timeout: 5000,
      });
      return response.status === 200;
    } catch {
      return false;
    }
  }
}

// Exportar instancia singleton
export const flowiseService = FlowiseService.getInstance();
