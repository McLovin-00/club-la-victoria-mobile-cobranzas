type BatchJob = {
  id: string;
  createdAt: number;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  progress: number; // 0..1
  message?: string;
  items?: Array<{ documentId: number; fileName: string }>; // para enriquecer en status
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

import { AppLogger } from '../config/logger';

export class JobsService {
  private static jobs = new Map<string, BatchJob>();
  private static recentUploads: Array<{ tenantEmpresaId: number; dadorId: number; fileName: string; uploadedAt: number }> = [];

  static createDocumentsBatch(payload: DocumentsBatchPayload): string {
    const id = `job_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
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
    try { (globalThis as any).__DOCS_METRICS = (globalThis as any).__DOCS_METRICS || {}; (globalThis as any).__DOCS_METRICS.batch_total = ((globalThis as any).__DOCS_METRICS.batch_total || 0) + 1; } catch {}
    return id;
  }

  private static async runDocumentsBatch(id: string, payload: DocumentsBatchPayload) {
    const job = this.jobs.get(id);
    if (!job) return;
    job.status = 'processing';
    job.progress = 0.05;
    this.jobs.set(id, job);

    const total = payload.files.length;
    let processed = 0;

    try {
      const { minioService } = await import('./minio.service');
      const { MediaService } = await import('./media.service');
      const { db } = await import('../config/database');
      const { queueService } = await import('./queue.service');
      const { createHash } = await import('crypto');

      try {
        AppLogger.info('🚀 Iniciando batch de documentos', { jobId: id, total, skipDedupe: !!payload.skipDedupe });
      } catch {}

      // Desactivar agrupamiento: procesar cada archivo de forma independiente
      for (const file of payload.files) {
        try {
          // 0) Hash de contenido para deduplicación (SHA-256)
          const checksum = createHash('sha256').update(file.buffer).digest('hex');

          // 0.1) Buscar duplicado por tenant + dador + checksum
          if (!payload.skipDedupe) {
            const dup = await db.getClient().document.findFirst({
              where: {
                tenantEmpresaId: payload.tenantEmpresaId,
                dadorCargaId: payload.dadorId,
                validationData: { path: ['checksumSha256'], equals: checksum } as any,
              },
              select: { id: true, fileName: true, filePath: true, uploadedAt: true },
            });
            if (dup) {
              try {
                AppLogger.info('📄 Documento marcado como duplicado por checksum', {
                  tenantEmpresaId: payload.tenantEmpresaId,
                  dadorCargaId: payload.dadorId,
                  originalFile: file.originalname,
                  checksumSha256: checksum,
                  existingDocument: { id: dup.id, fileName: dup.fileName, filePath: dup.filePath, uploadedAt: dup.uploadedAt },
                });
              } catch {}
              // Marcar como duplicado en memoria y continuar con el batch
              this.recentUploads.push({ tenantEmpresaId: payload.tenantEmpresaId, dadorId: payload.dadorId, fileName: `${file.originalname} (duplicado)`, uploadedAt: Date.now() });
              // Stats
              const current = this.jobs.get(id);
              if (current) {
                if (current.stats) current.stats.skippedDuplicates += 1;
                current.details = current.details || [];
                current.details.push({ fileName: file.originalname, checksumSha256: checksum, outcome: 'duplicate', existingDocument: { id: dup.id, fileName: dup.fileName, filePath: dup.filePath, uploadedAt: dup.uploadedAt } });
                this.jobs.set(id, current);
              }
              processed += 1; job.progress = Math.min(0.05 + (processed / total) * 0.9, 0.95); this.jobs.set(id, { ...job });
              continue;
            }
          }

          // 1) Normalizar a PDF si es imagen; si ya es PDF, mantener
          let pdfBuffer: Buffer;
          let finalName = file.originalname || 'document.pdf';
          if (/^application\/pdf$/i.test(file.mimetype)) {
            pdfBuffer = file.buffer;
            if (!/\.pdf$/i.test(finalName)) finalName = `${finalName}.pdf`;
          } else if (/^image\//i.test(file.mimetype)) {
            const composed = await MediaService.composePdfFromImages([{ buffer: file.buffer, mimeType: file.mimetype, fileName: file.originalname }]);
            pdfBuffer = composed;
            finalName = (finalName || 'document').replace(/\.[^.]+$/, '') + '.pdf';
          } else {
            // Tipos no soportados: subir como original
            pdfBuffer = file.buffer;
          }

          // 2) Subir a MinIO (siempre PDF si se pudo componer)
          const upload = await minioService.uploadDocument(
            payload.tenantEmpresaId,
            'BATCH',
            payload.dadorId,
            'Auto',
            finalName,
            pdfBuffer,
            'application/pdf'
          );

          // 2) Asegurar template válido (FK). Buscar uno activo para DADOR; si no existe, crear "AUTO".
          let tpl = await db.getClient().documentTemplate.findFirst({ where: { entityType: 'DADOR' as any, active: true } });
          if (!tpl) {
            tpl = await db.getClient().documentTemplate.create({ data: { name: 'AUTO', entityType: 'DADOR' as any, active: true } });
          }

          // 3) Crear registro pendiente en documents
          const doc = await db.getClient().document.create({
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

          // 4) Encolar job de validación (worker usará Flowise)
          await queueService.addDocumentValidation({
            documentId: doc.id,
            filePath: doc.filePath,
            templateName: 'AUTO',
            entityType: 'DADOR',
          });

          // Éxito: actualizar contadores
          const current = this.jobs.get(id);
          if (current) {
            current.items = current.items || [];
            current.items.push({ documentId: doc.id, fileName: finalName });
            if (current.stats) current.stats.processed += 1;
            current.details = current.details || [];
            current.details.push({ fileName: finalName, checksumSha256: checksum, outcome: 'uploaded', existingDocument: null });
            this.jobs.set(id, current);
          }
          this.recentUploads.push({ tenantEmpresaId: payload.tenantEmpresaId, dadorId: payload.dadorId, fileName: finalName, uploadedAt: Date.now() });
        } catch (fileError: any) {
          try {
            AppLogger.error('💥 Error procesando archivo en batch', { jobId: id, file: file.originalname, message: (fileError?.message || '').toString(), code: (fileError?.code || fileError?.name || '').toString() });
          } catch {}
          const current = this.jobs.get(id);
          if (current) {
            if (current.stats) current.stats.failed += 1;
            current.details = current.details || [];
            current.details.push({ fileName: file.originalname, outcome: 'failed', error: (fileError?.message || '').toString() });
            this.jobs.set(id, current);
          }
        } finally {
          processed += 1;
          job.progress = Math.min(0.05 + (processed / total) * 0.9, 0.95);
          this.jobs.set(id, { ...job });
        }
      }
      
      job.progress = 1;
      job.status = 'completed';
      this.jobs.set(id, job);
      try { (globalThis as any).__DOCS_METRICS.batch_completed = ((globalThis as any).__DOCS_METRICS.batch_completed || 0) + 1; } catch {}
    } catch (e: any) {
      job.status = 'failed';
      job.message = e?.message || 'Error en procesamiento de documentos';
      this.jobs.set(id, job);
      try { (globalThis as any).__DOCS_METRICS.batch_failed = ((globalThis as any).__DOCS_METRICS.batch_failed || 0) + 1; } catch { /* noop */ }
    }
  }

  static getJob(id: string): BatchJob | undefined {
    const job = this.jobs.get(id);
    return job ? { ...job } : undefined;
  }
}


