import { Worker, Job } from 'bullmq';
import IORedis from 'ioredis';
import { getEnvironment } from '../config/environment';
import { AppLogger } from '../config/logger';
import { db } from '../config/database';
import { minioService } from '../services/minio.service';
import { FlowiseService } from '../services/flowise.service';
import { RemitoService } from '../services/remito.service';
import { RemitoAnalysisJobData } from '../types';

const env = getEnvironment();

const connection = new IORedis({
  host: env.REDIS_HOST,
  port: env.REDIS_PORT,
  maxRetriesPerRequest: null,
});

const QUEUE_NAME = 'remitos-analysis';

let worker: Worker<RemitoAnalysisJobData> | null = null;

async function processJob(job: Job<RemitoAnalysisJobData>): Promise<void> {
  const { remitoId, imagenId, bucketName, objectKey } = job.data;
  
  AppLogger.info(`🔄 Procesando análisis de remito #${remitoId}`, { jobId: job.id });
  
  const prisma = db.getClient();
  
  try {
    // Actualizar estado a EN_ANALISIS
    await prisma.remito.update({
      where: { id: remitoId },
      data: { estado: 'EN_ANALISIS' },
    });
    
    await prisma.remitoHistory.create({
      data: {
        remitoId,
        action: 'ANALISIS_INICIADO',
        userId: 0,
        userRole: 'SYSTEM',
        payload: { jobId: job.id },
      },
    });
    
    // Obtener imagen de MinIO
    const imageBuffer = await minioService.getObject(bucketName, objectKey);
    const imageBase64 = imageBuffer.toString('base64');
    
    // Enviar a Flowise
    const result = await FlowiseService.analyzeRemito(imageBase64);
    
    if (result.success && result.data) {
      // Actualizar remito con datos extraídos
      await RemitoService.updateFromAnalysis(remitoId, result.data);
      
      // Marcar imagen como procesada
      await prisma.remitoImagen.update({
        where: { id: imagenId },
        data: { procesadoPorIA: true },
      });
      
      await prisma.remitoHistory.create({
        data: {
          remitoId,
          action: 'ANALISIS_COMPLETADO',
          userId: 0,
          userRole: 'SYSTEM',
          payload: { 
            confianza: result.data.confianza,
            camposDetectados: result.data.camposDetectados,
          },
        },
      });
      
      AppLogger.info(`✅ Análisis completado para remito #${remitoId}`, {
        confianza: result.data.confianza,
      });
      
    } else {
      // Error en análisis
      await prisma.remito.update({
        where: { id: remitoId },
        data: {
          estado: 'ERROR_ANALISIS',
          erroresAnalisis: [result.error || 'Error desconocido'],
        },
      });
      
      await prisma.remitoHistory.create({
        data: {
          remitoId,
          action: 'ANALISIS_FALLIDO',
          userId: 0,
          userRole: 'SYSTEM',
          payload: { error: result.error },
        },
      });
      
      AppLogger.error(`💥 Error en análisis de remito #${remitoId}: ${result.error}`);
    }
    
  } catch (error: any) {
    AppLogger.error(`💥 Error procesando remito #${remitoId}:`, error);
    
    await prisma.remito.update({
      where: { id: remitoId },
      data: {
        estado: 'ERROR_ANALISIS',
        erroresAnalisis: [error.message || 'Error interno'],
      },
    });
    
    throw error; // Re-throw para que BullMQ reintente
  }
}

export function startAnalysisWorker(): Worker<RemitoAnalysisJobData> {
  if (worker) return worker;
  
  worker = new Worker(QUEUE_NAME, processJob, {
    connection,
    concurrency: 2,
    limiter: {
      max: 10,
      duration: 60000, // 10 jobs por minuto máximo
    },
  });
  
  worker.on('completed', (job) => {
    AppLogger.info(`✅ Job ${job.id} completado`);
  });
  
  worker.on('failed', (job, err) => {
    AppLogger.error(`❌ Job ${job?.id} falló:`, err);
  });
  
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

