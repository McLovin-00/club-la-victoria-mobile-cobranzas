import { AppLogger } from '../config/logger';
import { randomBytes } from 'crypto';

// ============================================================================
// TIPOS
// ============================================================================
type BatchJob = {
  id: string;
  createdAt: number;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  progress: number;
  message?: string;
  items?: Array<{ documentId: number; fileName: string }>;
  stats?: { total: number; processed: number; skippedDuplicates: number; failed: number; skipDedupe: boolean };
  details?: Array<{
    fileName: string;
    checksumSha256?: string;
    outcome: 'uploaded' | 'duplicate' | 'failed';
    existingDocument?: { id: number; fileName: string; filePath: string; uploadedAt: any } | null;
    error?: string | null;
  }>;
};

type DocumentsBatchPayload = {
  tenantEmpresaId: number;
  dadorId: number;
  files: Express.Multer.File[];
  skipDedupe?: boolean;
};

type DuplicateInfo = { id: number; fileName: string; filePath: string; uploadedAt: any } | null;

interface BatchContext {
  minioService: any;
  MediaService: any;
  db: any;
  queueService: any;
  createHash: any;
}

// ============================================================================
// HELPERS DE PROCESAMIENTO
// ============================================================================
async function loadBatchContext(): Promise<BatchContext> {
  const { minioService } = await import('./minio.service');
  const { MediaService } = await import('./media.service');
  const { db } = await import('../config/database');
  const { queueService } = await import('./queue.service');
  const { createHash } = await import('crypto');
  return { minioService, MediaService, db, queueService, createHash };
}

async function checkDuplicate(
  ctx: BatchContext,
  tenantEmpresaId: number,
  dadorCargaId: number,
  checksum: string
): Promise<DuplicateInfo> {
  const dup = await ctx.db.getClient().document.findFirst({
    where: {
      tenantEmpresaId,
      dadorCargaId,
      validationData: { path: ['checksumSha256'], equals: checksum } as any,
    },
    select: { id: true, fileName: true, filePath: true, uploadedAt: true },
  });
  return dup || null;
}

async function normalizeFileToPdf(
  ctx: BatchContext,
  file: Express.Multer.File
): Promise<{ buffer: Buffer; name: string }> {
  let pdfBuffer: Buffer;
  let finalName = file.originalname || 'document.pdf';
  
  if (/^application\/pdf$/i.test(file.mimetype)) {
    pdfBuffer = file.buffer;
    if (!/\.pdf$/i.test(finalName)) finalName = `${finalName}.pdf`;
  } else if (/^image\//i.test(file.mimetype)) {
    pdfBuffer = await ctx.MediaService.composePdfFromImages([
      { buffer: file.buffer, mimeType: file.mimetype, fileName: file.originalname }
    ]);
    finalName = (finalName || 'document').replace(/\.[^.]+$/, '') + '.pdf';
  } else {
    pdfBuffer = file.buffer;
  }
  
  return { buffer: pdfBuffer, name: finalName };
}

async function uploadAndCreateDocument(
  ctx: BatchContext,
  payload: DocumentsBatchPayload,
  pdfBuffer: Buffer,
  finalName: string,
  checksum: string
): Promise<{ id: number; filePath: string }> {
  const upload = await ctx.minioService.uploadDocument(
    payload.tenantEmpresaId,
    'BATCH',
    payload.dadorId,
    'Auto',
    finalName,
    pdfBuffer,
    'application/pdf'
  );

  const tpl = await ctx.db.getClient().documentTemplate.findFirst({
    where: { entityType: 'DADOR' as any, active: true }
  });
  if (!tpl) {
    throw new Error('No existe plantilla activa para entidad DADOR');
  }

  const doc = await ctx.db.getClient().document.create({
    data: {
      templateId: tpl.id,
      entityType: 'DADOR' as any,
      entityId: payload.dadorId,
      dadorCargaId: payload.dadorId,
      tenantEmpresaId: payload.tenantEmpresaId,
      fileName: finalName,
      filePath: `${upload.bucketName}/${upload.objectPath}`,
      fileSize: pdfBuffer.length,
      mimeType: 'application/pdf',
      status: 'PENDIENTE' as any,
      validationData: { checksumSha256: checksum },
    },
  });

  await ctx.queueService.addDocumentValidation({
    documentId: doc.id,
    filePath: doc.filePath,
    templateName: 'AUTO',
    entityType: 'DADOR',
  });

  return { id: doc.id, filePath: doc.filePath };
}

export class JobsService {
  private static jobs = new Map<string, BatchJob>();
  private static recentUploads: Array<{ tenantEmpresaId: number; dadorId: number; fileName: string; uploadedAt: number }> = [];

  static createDocumentsBatch(payload: DocumentsBatchPayload): string {
    const id = `job_${Date.now()}_${randomBytes(4).toString('hex')}`;
    this.jobs.set(id, {
      id,
      createdAt: Date.now(),
      status: 'queued',
      progress: 0,
      items: [],
      stats: { total: payload.files.length, processed: 0, skippedDuplicates: 0, failed: 0, skipDedupe: !!payload.skipDedupe },
      details: [],
    });

    // Simulación básica: procesar async y actualizar progreso
    setTimeout(() => this.runDocumentsBatch(id, payload).catch(() => {}), 10);
    // Métrica simple en memoria
    try { (globalThis as any).__DOCS_METRICS = (globalThis as any).__DOCS_METRICS || {}; (globalThis as any).__DOCS_METRICS.batch_total = ((globalThis as any).__DOCS_METRICS.batch_total || 0) + 1; } catch { /* Métrica no crítica */ }
    return id;
  }

  private static async runDocumentsBatch(id: string, payload: DocumentsBatchPayload) {
    const job = this.jobs.get(id);
    if (!job) return;
    
    job.status = 'processing';
    job.progress = 0.05;
    this.jobs.set(id, job);

    try {
      const ctx = await loadBatchContext();
      AppLogger.info('🚀 Iniciando batch de documentos', { jobId: id, total: payload.files.length, skipDedupe: !!payload.skipDedupe });

      for (let i = 0; i < payload.files.length; i++) {
        await this.processFileInBatch(id, payload, payload.files[i], ctx, i, payload.files.length);
      }
      
      job.progress = 1;
      job.status = 'completed';
      this.jobs.set(id, job);
      this.incrementMetric('batch_completed');
    } catch (e: any) {
      job.status = 'failed';
      job.message = e?.message || 'Error en procesamiento de documentos';
      this.jobs.set(id, job);
      this.incrementMetric('batch_failed');
    }
  }

  private static async processFileInBatch(
    jobId: string,
    payload: DocumentsBatchPayload,
    file: Express.Multer.File,
    ctx: BatchContext,
    index: number,
    total: number
  ): Promise<void> {
    const job = this.jobs.get(jobId);
    if (!job) return;

    try {
      const checksum = ctx.createHash('sha256').update(file.buffer).digest('hex');
      
      // Verificar duplicado
      if (!payload.skipDedupe) {
        const dup = await checkDuplicate(ctx, payload.tenantEmpresaId, payload.dadorId, checksum);
        if (dup) {
          this.recordDuplicate(jobId, payload, file.originalname, checksum, dup);
          return;
        }
      }

      // Normalizar y subir
      const { buffer: pdfBuffer, name: finalName } = await normalizeFileToPdf(ctx, file);
      const doc = await uploadAndCreateDocument(ctx, payload, pdfBuffer, finalName, checksum);
      
      this.recordSuccess(jobId, payload, finalName, checksum, doc.id);
    } catch (fileError: any) {
      this.recordFailure(jobId, file.originalname, fileError);
    } finally {
      this.updateProgress(jobId, index + 1, total);
    }
  }

  private static recordDuplicate(
    jobId: string,
    payload: DocumentsBatchPayload,
    fileName: string,
    checksum: string,
    dup: DuplicateInfo
  ): void {
    AppLogger.info('📄 Documento duplicado', { fileName, checksum });
    this.recentUploads.push({ tenantEmpresaId: payload.tenantEmpresaId, dadorId: payload.dadorId, fileName: `${fileName} (duplicado)`, uploadedAt: Date.now() });
    
    const current = this.jobs.get(jobId);
    if (current) {
      if (current.stats) current.stats.skippedDuplicates += 1;
      current.details = current.details || [];
      current.details.push({ fileName, checksumSha256: checksum, outcome: 'duplicate', existingDocument: dup });
      this.jobs.set(jobId, current);
    }
  }

  private static recordSuccess(
    jobId: string,
    payload: DocumentsBatchPayload,
    fileName: string,
    checksum: string,
    documentId: number
  ): void {
    const current = this.jobs.get(jobId);
    if (current) {
      current.items = current.items || [];
      current.items.push({ documentId, fileName });
      if (current.stats) current.stats.processed += 1;
      current.details = current.details || [];
      current.details.push({ fileName, checksumSha256: checksum, outcome: 'uploaded', existingDocument: null });
      this.jobs.set(jobId, current);
    }
    this.recentUploads.push({ tenantEmpresaId: payload.tenantEmpresaId, dadorId: payload.dadorId, fileName, uploadedAt: Date.now() });
  }

  private static recordFailure(jobId: string, fileName: string, error: any): void {
    AppLogger.error('💥 Error procesando archivo', { jobId, file: fileName, message: error?.message });
    const current = this.jobs.get(jobId);
    if (current) {
      if (current.stats) current.stats.failed += 1;
      current.details = current.details || [];
      current.details.push({ fileName, outcome: 'failed', error: error?.message || '' });
      this.jobs.set(jobId, current);
    }
  }

  private static updateProgress(jobId: string, processed: number, total: number): void {
    const job = this.jobs.get(jobId);
    if (job) {
      job.progress = Math.min(0.05 + (processed / total) * 0.9, 0.95);
      this.jobs.set(jobId, { ...job });
    }
  }

  private static incrementMetric(key: string): void {
    try {
      (globalThis as any).__DOCS_METRICS = (globalThis as any).__DOCS_METRICS || {};
      (globalThis as any).__DOCS_METRICS[key] = ((globalThis as any).__DOCS_METRICS[key] || 0) + 1;
    } catch { /* noop */ }
  }

  static getJob(id: string): BatchJob | undefined {
    const job = this.jobs.get(id);
    return job ? { ...job } : undefined;
  }
}


