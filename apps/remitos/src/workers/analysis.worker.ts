import { Worker, Job } from 'bullmq';
import IORedis from 'ioredis';
import { getEnvironment } from '../config/environment';
import { AppLogger } from '../config/logger';
import { db } from '../config/database';
import { minioService } from '../services/minio.service';
import { MediaService } from '../services/media.service';
import { FlowiseService } from '../services/flowise.service';
import { RemitoService } from '../services/remito.service';
import { PdfService } from '../services/pdf.service';
import { RemitoAnalysisJobData } from '../types';
import type { RemitoEstado, RemitoAction } from '../../node_modules/.prisma/remitos';

const env = getEnvironment();

const connection = new IORedis({
  host: env.REDIS_HOST,
  port: env.REDIS_PORT,
  maxRetriesPerRequest: null,
});

const QUEUE_NAME = 'remitos-analysis';

let worker: Worker<RemitoAnalysisJobData> | null = null;

// ============================================================================
// HELPERS
// ============================================================================

async function updateRemitoStatus(remitoId: number, estado: RemitoEstado): Promise<void> {
  await db.getClient().remito.update({ where: { id: remitoId }, data: { estado } });
}

async function logHistory(remitoId: number, action: RemitoAction, payload: any): Promise<void> {
  await db.getClient().remitoHistory.create({
    data: { remitoId, action, userId: 0, userRole: 'SYSTEM', payload },
  });
}

async function getAdditionalImages(remitoId: number): Promise<Buffer[]> {
  const prisma = db.getClient();
  const additionalImages = await prisma.remitoImagen.findMany({
    where: { remitoId, tipo: 'ADICIONAL' },
    orderBy: { orden: 'asc' },
  });

  const imageBuffers: Buffer[] = [];
  for (const img of additionalImages) {
    const buf = await minioService.getObject(img.bucketName, img.objectKey);
    const normalized = await MediaService.resizeForAnalysis(buf);
    imageBuffers.push(normalized);
  }
  return imageBuffers;
}

async function rasterizePdf(pdfBuffer: Buffer): Promise<Buffer[]> {
  const pdfImages = await PdfService.pdfToImages(pdfBuffer);
  if (pdfImages.length === 0) {
    throw new Error('No se pudieron extraer imágenes del PDF');
  }

  const normalizedImages: Buffer[] = [];
  for (const img of pdfImages) {
    const normalized = await MediaService.resizeForAnalysis(img);
    normalizedImages.push(normalized);
  }
  return normalizedImages;
}

async function composeOrSingle(buffers: Buffer[]): Promise<Buffer> {
  if (buffers.length > 1) {
    return MediaService.composeImageGrid(buffers);
  }
  return buffers[0];
}

async function prepareImageForAnalysis(remitoId: number, fileBuffer: Buffer, isPdf: boolean): Promise<Buffer> {
  if (!isPdf) {
    return MediaService.resizeForAnalysis(fileBuffer);
  }

  // Intentar usar imágenes originales primero
  const additionalImages = await getAdditionalImages(remitoId);
  if (additionalImages.length > 0) {
    AppLogger.info(`📸 Usando ${additionalImages.length} imágenes originales para análisis`);
    return composeOrSingle(additionalImages);
  }

  // Rasterizar PDF
  AppLogger.info('📄 Rasterizando PDF a imágenes para análisis...');
  try {
    const normalizedImages = await rasterizePdf(fileBuffer);
    AppLogger.info(`📸 PDF rasterizado: ${normalizedImages.length} página(s)`);
    return composeOrSingle(normalizedImages);
  } catch (pdfError: any) {
    AppLogger.error('💥 Error rasterizando PDF:', { message: pdfError.message });
    throw new Error(`No se pudo procesar el PDF: ${pdfError.message}`);
  }
}

async function handleSuccessfulAnalysis(remitoId: number, imagenId: number, data: any): Promise<void> {
  await RemitoService.updateFromAnalysis(remitoId, data);

  await db.getClient().remitoImagen.update({
    where: { id: imagenId },
    data: { procesadoPorIA: true },
  });

  await logHistory(remitoId, 'ANALISIS_COMPLETADO', {
    confianza: data.confianza,
    camposDetectados: data.camposDetectados,
  });

  AppLogger.info(`✅ Análisis completado para remito #${remitoId}`, {
    confianza: data.confianza,
    campos: data.camposDetectados.length,
  });
}

async function handleFailedAnalysis(remitoId: number, error: string): Promise<void> {
  await db.getClient().remito.update({
    where: { id: remitoId },
    data: { estado: 'ERROR_ANALISIS', erroresAnalisis: [error] },
  });

  await logHistory(remitoId, 'ANALISIS_FALLIDO', { error });
  AppLogger.error(`💥 Error en análisis de remito #${remitoId}: ${error}`);
}

// ============================================================================
// MAIN PROCESSOR
// ============================================================================

async function processJob(job: Job<RemitoAnalysisJobData>): Promise<void> {
  const { remitoId, imagenId, bucketName, objectKey, originalInputsCount } = job.data;

  AppLogger.info(`🔄 Procesando análisis de remito #${remitoId}`, { jobId: job.id, originalInputsCount });

  try {
    await updateRemitoStatus(remitoId, 'EN_ANALISIS');
    await logHistory(remitoId, 'ANALISIS_INICIADO', { jobId: job.id });

    // Obtener archivo de MinIO
    const fileBuffer = await minioService.getObject(bucketName, objectKey);
    const isPdf = objectKey.toLowerCase().endsWith('.pdf');

    // Preparar imagen para análisis
    const imageForAnalysis = await prepareImageForAnalysis(remitoId, fileBuffer, isPdf);
    const imageBase64 = imageForAnalysis.toString('base64');

    // Enviar a Flowise
    const result = await FlowiseService.analyzeRemito(imageBase64);

    if (result.success && result.data) {
      await handleSuccessfulAnalysis(remitoId, imagenId, result.data);
    } else {
      await handleFailedAnalysis(remitoId, result.error || 'Error desconocido');
    }
  } catch (error: any) {
    const errorMessage = error.message || 'Error interno';
    AppLogger.error(`💥 Error procesando remito #${remitoId}:`, { message: errorMessage });

    await db.getClient().remito.update({
      where: { id: remitoId },
      data: { estado: 'ERROR_ANALISIS', erroresAnalisis: [errorMessage] },
    });

    throw new Error(errorMessage);
  }
}

// ============================================================================
// WORKER LIFECYCLE
// ============================================================================

export function startAnalysisWorker(): Worker<RemitoAnalysisJobData> {
  if (worker) return worker;

  worker = new Worker(QUEUE_NAME, processJob, {
    connection,
    concurrency: 2,
    limiter: { max: 10, duration: 60000 },
    settings: {
      backoffStrategy: (attemptsMade: number) => Math.min(attemptsMade * 5000, 30000),
    },
  });

  worker.on('completed', (job) => AppLogger.info(`✅ Job ${job.id} completado`));
  worker.on('failed', (job, err) => AppLogger.error(`❌ Job ${job?.id} falló:`, err));

  AppLogger.info('🔄 Worker de análisis de remitos iniciado');
  return worker;
}

export async function stopAnalysisWorker(): Promise<void> {
  if (worker) {
    await worker.close();
    worker = null;
    AppLogger.info('🛑 Worker de análisis detenido');
  }
  await connection.quit();
}

/**
 * Export interno para tests unitarios (NO usar en runtime de la app).
 * Permite testear ramas del processor sin levantar BullMQ real.
 */
export const __test__ = {
  // Processor
  processJob,
  // Helpers clave
  prepareImageForAnalysis,
  rasterizePdf,
  composeOrSingle,
  getAdditionalImages,
  handleSuccessfulAnalysis,
  handleFailedAnalysis,
  updateRemitoStatus,
  logHistory,
};