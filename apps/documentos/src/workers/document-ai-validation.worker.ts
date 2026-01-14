import { Worker, Job } from 'bullmq';
import { Redis } from 'ioredis';
import { getEnvironment } from '../config/environment';
import { AppLogger } from '../config/logger';
import { db } from '../config/database';
import { minioService } from '../services/minio.service';
import { documentValidationService } from '../services/document-validation.service';
import { PdfRasterizeService } from '../services/pdf-rasterize.service';

/**
 * Worker para validación de documentos con IA (Control de Documentos)
 */

interface DocumentAIValidationJobData {
  documentId: number;
  solicitadoPor?: number;
  esRechequeo?: boolean;
}

interface ValidationWorkerResult {
  success: boolean;
  documentId: number;
  esValido?: boolean;
  tieneDisparidades?: boolean;
  error?: string;
}

// ============================================================================
// HELPERS
// ============================================================================

/** Obtiene archivo desde MinIO dado un filePath */
async function getFileFromMinio(filePath: string): Promise<{ buffer: Buffer } | { error: string }> {
  try {
    const [bucketName, ...pathParts] = filePath.split('/');
    const objectPath = pathParts.join('/');
    const stream = await minioService.getObject(bucketName, objectPath);
    // Convertir stream a buffer
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    const buffer = Buffer.concat(chunks);
    return { buffer };
  } catch {
    return { error: 'MINIO_ERROR' };
  }
}

/** Convierte PDF a imagen base64 o devuelve buffer original si no es PDF */
async function getImageBase64(
  fileBuffer: Buffer, 
  mimeType: string, 
  fileName: string
): Promise<{ base64: string; mimeType: string } | { error: string }> {
  const isPdf = mimeType === 'application/pdf' || fileName.toLowerCase().endsWith('.pdf');
  
  if (!isPdf) {
    return { base64: fileBuffer.toString('base64'), mimeType };
  }

  try {
    const imageBuffers = await PdfRasterizeService.pdfToImages(fileBuffer);
    if (imageBuffers.length === 0) {
      return { error: 'PDF_RASTERIZE_ERROR' };
    }
    return { base64: imageBuffers[0].toString('base64'), mimeType: 'image/jpeg' };
  } catch {
    return { error: 'PDF_RASTERIZE_ERROR' };
  }
}

// ============================================================================
// WORKER
// ============================================================================

class DocumentAIValidationWorker {
  private worker: Worker;
  private redis: Redis;

  constructor() {
    const env = getEnvironment();
    const url = env.REDIS_URL || 'redis://localhost:6379';
    this.redis = new Redis(url, { maxRetriesPerRequest: null });

    // Concurrencia configurable vía env (default: 3 validaciones en paralelo)
    const concurrency = parseInt(process.env.FLOWISE_VALIDATION_CONCURRENCY || '3', 10);
    
    this.worker = new Worker(
      'document-ai-validation',
      this.processValidation.bind(this),
      {
        connection: this.redis,
        concurrency,
        removeOnComplete: { count: 50 },
        removeOnFail: { count: 100 },
      }
    );
    
    AppLogger.info(`🤖 Worker IA configurado con concurrencia: ${concurrency}`);

    this.setupEventHandlers();
    AppLogger.info('🤖 Document AI Validation Worker iniciado');
  }

  /**
   * Procesar validación de documento
   */
  private async processValidation(job: Job<DocumentAIValidationJobData>): Promise<ValidationWorkerResult> {
    const { documentId, solicitadoPor, esRechequeo } = job.data;

    AppLogger.info(`🔍 Procesando validación IA documento ${documentId}`, {
      esRechequeo: esRechequeo || false,
      jobId: job.id,
    });

    try {
      // Verificar si la validación está habilitada
      if (!documentValidationService.isEnabled()) {
        AppLogger.debug('⏭️ Validación IA deshabilitada, saltando');
        return { success: true, documentId, error: 'VALIDATION_DISABLED' };
      }

      // Obtener documento con datos relacionados
      const document = await db.getClient().document.findUnique({
        where: { id: documentId },
        include: {
          template: { select: { name: true } },
        },
      });

      if (!document) {
        AppLogger.warn(`⚠️ Documento ${documentId} no encontrado`);
        return { success: false, documentId, error: 'DOCUMENT_NOT_FOUND' };
      }

      // Obtener archivo del documento desde MinIO
      const fileResult = await getFileFromMinio(document.filePath);
      if ('error' in fileResult) {
        AppLogger.error(`💥 Error obteniendo archivo de MinIO`, { documentId, filePath: document.filePath });
        return { success: false, documentId, error: fileResult.error };
      }

      // Convertir a imagen base64 (rasteriza si es PDF)
      const imageResult = await getImageBase64(fileResult.buffer, document.mimeType, document.fileName);
      if ('error' in imageResult) {
        AppLogger.error(`💥 Error procesando archivo`, { documentId });
        return { success: false, documentId, error: imageResult.error };
      }
      
      const { base64: imageBase64, mimeType } = imageResult;

      // Obtener datos de la entidad
      const datosEntidad = await documentValidationService.getEntityData(
        document.entityType,
        document.entityId
      );

      // Ejecutar validación
      const result = await documentValidationService.validateDocument({
        documentId,
        imageBase64,
        mimeType, // Puede ser 'image/jpeg' si fue rasterizado desde PDF
        fileName: document.fileName,
        tipoDocumento: document.template.name,
        tipoEntidad: document.entityType,
        datosEntidad,
        vencimientoPrecargado: document.expiresAt?.toISOString().split('T')[0] || null,
        solicitadoPor,
        esRechequeo,
      });

      if (!result.success) {
        AppLogger.warn(`⚠️ Validación IA falló para documento ${documentId}`, {
          error: result.error,
        });
        return { success: false, documentId, error: result.error };
      }

      AppLogger.info(`✅ Validación IA completada documento ${documentId}`, {
        esValido: result.data?.esDocumentoCorrecto,
        confianza: result.data?.confianza,
        disparidades: result.data?.disparidades?.length || 0,
      });

      return {
        success: true,
        documentId,
        esValido: result.data?.esDocumentoCorrecto,
        tieneDisparidades: (result.data?.disparidades?.length || 0) > 0,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      AppLogger.error(`💥 Error en validación IA documento ${documentId}`, {
        error: message,
      });
      return { success: false, documentId, error: message };
    }
  }

  /**
   * Configurar manejadores de eventos
   */
  private setupEventHandlers(): void {
    this.worker.on('completed', (job, result) => {
      AppLogger.debug(`✅ Job ${job.id} completado`, {
        documentId: job.data.documentId,
        result,
      });
    });

    this.worker.on('failed', (job, error) => {
      AppLogger.error(`❌ Job ${job?.id} falló`, {
        documentId: job?.data?.documentId,
        error: error.message,
      });
    });

    this.worker.on('error', (error) => {
      AppLogger.error('💥 Error en worker de validación IA:', { error: error.message });
    });
  }

  /**
   * Cerrar worker
   */
  async close(): Promise<void> {
    await this.worker.close();
    await this.redis.quit();
    AppLogger.info('🤖 Document AI Validation Worker cerrado');
  }
}

// Singleton
let workerInstance: DocumentAIValidationWorker | null = null;

export function startDocumentAIValidationWorker(): DocumentAIValidationWorker {
  if (!workerInstance) {
    workerInstance = new DocumentAIValidationWorker();
  }
  return workerInstance;
}

export async function stopDocumentAIValidationWorker(): Promise<void> {
  if (workerInstance) {
    await workerInstance.close();
    workerInstance = null;
  }
}

