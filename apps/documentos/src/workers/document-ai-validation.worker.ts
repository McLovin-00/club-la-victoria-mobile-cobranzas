import { Worker, Job } from 'bullmq';
import { Redis } from 'ioredis';
import { getEnvironment } from '../config/environment';
import { AppLogger } from '../config/logger';
import { db } from '../config/database';
import { minioService } from '../services/minio.service';
import { documentValidationService } from '../services/document-validation.service';

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

class DocumentAIValidationWorker {
  private worker: Worker;
  private redis: Redis;

  constructor() {
    const env = getEnvironment();
    const url = env.REDIS_URL || 'redis://localhost:6379';
    this.redis = new Redis(url, { maxRetriesPerRequest: null });

    this.worker = new Worker(
      'document-ai-validation',
      this.processValidation.bind(this),
      {
        connection: this.redis,
        concurrency: 1, // Una validación a la vez para no sobrecargar Flowise
        removeOnComplete: { count: 50 },
        removeOnFail: { count: 100 },
      }
    );

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

      // Obtener imagen del documento desde MinIO
      const [bucketName, ...pathParts] = document.filePath.split('/');
      const objectPath = pathParts.join('/');
      
      let fileBuffer: Buffer;
      try {
        fileBuffer = await minioService.getObject(bucketName, objectPath);
      } catch (minioError) {
        AppLogger.error(`💥 Error obteniendo archivo de MinIO`, {
          documentId,
          filePath: document.filePath,
          error: minioError instanceof Error ? minioError.message : 'Unknown',
        });
        return { success: false, documentId, error: 'MINIO_ERROR' };
      }

      // Convertir a base64
      const imageBase64 = fileBuffer.toString('base64');

      // Obtener datos de la entidad
      const datosEntidad = await documentValidationService.getEntityData(
        document.entityType,
        document.entityId
      );

      // Ejecutar validación
      const result = await documentValidationService.validateDocument({
        documentId,
        imageBase64,
        mimeType: document.mimeType,
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

