import { Worker, Job } from 'bullmq';
import { Redis } from 'ioredis';
import { db } from '../config/database';
import { minioService } from '../services/minio.service';
import { flowiseService } from '../services/flowise.service';
import { webSocketService } from '../services/websocket.service';
import { queueService } from '../services/queue.service';
import { AppLogger } from '../config/logger';
import { getEnvironment } from '../config/environment';
import type { DocumentStatus } from '../../../node_modules/.prisma/documentos';

// ============================================================================
// TIPOS
// ============================================================================
interface DocumentValidationJobData {
  documentId: number;
  filePath: string;
  templateName: string;
  entityType: string;
}

interface ValidationResult {
  isValid: boolean;
  extractedData?: any;
  confidence?: number;
  errors?: string[];
}

interface ClassificationData {
  entityType: string | null;
  entityId: string | null;
  documentType: string | null;
  expirationDate: Date | null;
  confidence: number;
  raw: any;
}

// ============================================================================
// HELPERS DE NORMALIZACIÓN
// ============================================================================
const normalizeDni = (dni: string): string => (dni || '').replace(/\D+/g, '');
const normalizeCuit = (cuit: string): string => (cuit || '').replace(/\D+/g, '');
const normalizePlate = (p: string): string => (p || '').toUpperCase().replace(/[^A-Z0-9]/g, '');

const VALID_ENTITY_TYPES = ['DADOR', 'EMPRESA_TRANSPORTISTA', 'CHOFER', 'CAMION', 'ACOPLADO'];

function sanitizeEntityType(val: any): string | null {
  const s = String(val ?? '').trim().toUpperCase();
  return VALID_ENTITY_TYPES.includes(s) ? s : null;
}

function normalizeUnknown(val: any): string | null {
  if (val === undefined || val === null) return null;
  const s = String(val).trim();
  if (!s) return null;
  const u = s.toUpperCase();
  return (u === 'DESCONOCIDO' || u === 'UNKNOWN' || u === 'N/A' || u === '-') ? null : s;
}

function parseExpirationDate(iso: string | undefined): Date | null {
  if (!iso) return null;
  const d = new Date(iso);
  return isNaN(d.getTime()) ? null : d;
}

function cleanError(error: any): { message: string; stack: string; code?: string; name: string } {
  return {
    message: error?.message || 'Error desconocido',
    stack: error?.stack || 'Sin stack trace',
    code: error?.code,
    name: error?.name || 'Error',
  };
}

// ============================================================================
// RESOLUCIÓN DE ENTIDADES
// ============================================================================
async function resolveEntity(
  tenantId: number,
  dadorId: number,
  entityType: string,
  entityIdRaw: string
): Promise<{ type: string; id: number; dadorId: number } | null> {
  
  if (entityType === 'DADOR' || entityType === 'EMPRESA_TRANSPORTISTA') {
    const cuit = normalizeCuit(entityIdRaw);
    if (!cuit || !dadorId) return null;
    
    let empresa = await db.getClient().empresaTransportista.findFirst({
      where: { tenantEmpresaId: tenantId, dadorCargaId: dadorId, cuit }
    });
    
    if (!empresa) {
      try {
        const { EmpresaTransportistaService } = await import('../services/empresa-transportista.service');
        empresa = await EmpresaTransportistaService.create({
          tenantEmpresaId: tenantId, dadorCargaId: dadorId, cuit, razonSocial: `Empresa ${cuit}`, activo: true
        });
      } catch { return null; }
    }
    
    return empresa ? { type: 'EMPRESA_TRANSPORTISTA', id: (empresa as any).id, dadorId } : null;
  }
  
  if (entityType === 'CHOFER') {
    const dni = normalizeDni(entityIdRaw);
    let chofer = await db.getClient().chofer.findFirst({ where: { tenantEmpresaId: tenantId, dniNorm: dni } });
    
    if (!chofer) {
      try {
        const { MaestrosService } = await import('../services/maestros.service');
        chofer = await MaestrosService.createChofer({ tenantEmpresaId: tenantId, dadorCargaId: dadorId, dni, activo: true, phones: [] });
      } catch { return null; }
    }
    
    return chofer ? { type: 'CHOFER', id: (chofer as any).id, dadorId: (chofer as any).dadorCargaId } : null;
  }
  
  if (entityType === 'CAMION') {
    const pat = normalizePlate(entityIdRaw);
    let camion = await db.getClient().camion.findFirst({ where: { tenantEmpresaId: tenantId, patenteNorm: pat } });
    
    if (!camion) {
      try {
        const { MaestrosService } = await import('../services/maestros.service');
        camion = await MaestrosService.createCamion({ tenantEmpresaId: tenantId, dadorCargaId: dadorId, patente: entityIdRaw, activo: true });
      } catch { return null; }
    }
    
    return camion ? { type: 'CAMION', id: (camion as any).id, dadorId: (camion as any).dadorCargaId } : null;
  }
  
  if (entityType === 'ACOPLADO') {
    const pat = normalizePlate(entityIdRaw);
    let acoplado = await db.getClient().acoplado.findFirst({ where: { tenantEmpresaId: tenantId, patenteNorm: pat } });
    
    if (!acoplado) {
      try {
        const { MaestrosService } = await import('../services/maestros.service');
        acoplado = await MaestrosService.createAcoplado({ tenantEmpresaId: tenantId, dadorCargaId: dadorId, patente: entityIdRaw, activo: true });
      } catch { return null; }
    }
    
    return acoplado ? { type: 'ACOPLADO', id: (acoplado as any).id, dadorId: (acoplado as any).dadorCargaId } : null;
  }
  
  return null;
}

// ============================================================================
// DEPRECACIÓN Y RETENCIÓN
// ============================================================================
async function deprecateDuplicates(updatedDoc: any): Promise<void> {
  if (!updatedDoc.expiresAt) return;
  
  const stale = await db.getClient().document.findMany({
    where: {
      id: { not: updatedDoc.id },
      tenantEmpresaId: updatedDoc.tenantEmpresaId,
      entityType: updatedDoc.entityType as any,
      entityId: updatedDoc.entityId,
      templateId: updatedDoc.templateId,
      status: 'APROBADO' as any,
      expiresAt: updatedDoc.expiresAt,
    },
    select: { id: true, validationData: true },
  });
  
  for (const s of stale) {
    await db.getClient().document.update({
      where: { id: s.id },
      data: {
        status: 'DEPRECADO' as any,
        validationData: { ...(s as any).validationData, replacedBy: updatedDoc.id, replacedAt: new Date().toISOString() },
      },
    });
  }
  
  if (stale.length > 0) {
    AppLogger.info(`♻️ Deprecados ${stale.length} documentos previos`, { documentId: updatedDoc.id });
  }
}

async function applyRetentionPolicy(updatedDoc: any): Promise<void> {
  const env = getEnvironment();
  const maxKeep = Math.max(0, Number(env.DOCS_MAX_DEPRECATED_VERSIONS || 2) || 2);
  
  const deprecated = await db.getClient().document.findMany({
    where: {
      tenantEmpresaId: updatedDoc.tenantEmpresaId,
      entityType: updatedDoc.entityType as any,
      entityId: updatedDoc.entityId,
      templateId: updatedDoc.templateId,
      status: 'DEPRECADO' as any,
      expiresAt: updatedDoc.expiresAt,
    },
    orderBy: { uploadedAt: 'desc' },
    select: { id: true, filePath: true },
  });
  
  if (deprecated.length <= maxKeep) return;
  
  const toDelete = deprecated.slice(maxKeep);
  for (const d of toDelete) {
    try {
      if (d.filePath) {
        const [bucketName, ...pathParts] = (d.filePath as string).split('/');
        await minioService.deleteDocument(bucketName, pathParts.join('/'));
      }
    } catch { AppLogger.warn('No se pudo eliminar objeto de MinIO', { id: d.id }); }
    
    try {
      await db.getClient().document.delete({ where: { id: d.id } });
    } catch { AppLogger.warn('No se pudo eliminar registro', { id: d.id }); }
  }
  
  AppLogger.info(`🧹 Retención: eliminadas ${toDelete.length} versiones deprecadas`);
}

// ============================================================================
// NOTIFICACIONES WEBSOCKET
// ============================================================================
function notifyStatusChange(doc: any, newStatus: string, errors?: string[]): void {
  webSocketService.notifyDocumentStatusChange({
    documentId: doc.id,
    empresaId: doc.dadorCargaId ?? doc.empresaId,
    entityType: doc.entityType,
    entityId: doc.entityId,
    oldStatus: doc.status,
    newStatus,
    templateName: doc.template?.name,
    fileName: doc.fileName,
    validationNotes: errors?.join(', '),
  });
  webSocketService.notifyDashboardUpdate(doc.dadorCargaId ?? doc.empresaId);
}

// ============================================================================
// WORKER PRINCIPAL
// ============================================================================
class DocumentValidationWorker {
  private worker: Worker;
  private redis: Redis;

  constructor() {
    const env = getEnvironment();
    const url = env.REDIS_URL || 'redis://localhost:6379';
    this.redis = new Redis(url, { maxRetriesPerRequest: null });

    this.worker = new Worker(
      'document-validation',
      this.processValidation.bind(this),
      {
        connection: this.redis,
        concurrency: 2,
        removeOnComplete: { count: 10 },
        removeOnFail: { count: 50 },
      }
    );

    this.setupEventHandlers();
    AppLogger.info('🔄 Document Validation Worker iniciado');
  }

  private async processValidation(job: Job<DocumentValidationJobData>): Promise<ValidationResult> {
    const { documentId, filePath, templateName } = job.data;
    AppLogger.info(`🔍 Procesando validación documento ${documentId}`, { templateName });

    try {
      // Verificar documento existe
      const exists = await this.documentExists(documentId);
      if (!exists) return { isValid: false, errors: ['Documento eliminado'] };

      // Actualizar estado
      await db.getClient().document.update({ where: { id: documentId }, data: { status: 'CLASIFICANDO' as DocumentStatus } });

      // Clasificar con Flowise
      const classification = await this.classifyDocument(documentId, filePath, templateName);
      
      // Persistir clasificación
      await this.saveClassification(documentId, classification);
      
      // Asociar plantilla si corresponde
      await this.associateTemplate(documentId, classification);
      
      // Marcar pendiente de aprobación
      if (await this.documentExists(documentId)) {
        await db.getClient().document.update({ where: { id: documentId }, data: { status: 'PENDIENTE_APROBACION' as DocumentStatus } });
        await this.enqueueAIValidation(documentId);
      }

      return { isValid: true, confidence: classification.confidence, extractedData: classification.raw };
    } catch (error) {
      AppLogger.error(`💥 Error procesando documento ${documentId}:`, cleanError(error));
      return { isValid: false, errors: [(error as Error).message] };
    }
  }

  private async documentExists(documentId: number): Promise<boolean> {
    const doc = await db.getClient().document.findUnique({ where: { id: documentId }, select: { id: true } });
    return !!doc;
  }

  private async classifyDocument(documentId: number, filePath: string, templateName: string): Promise<ClassificationData> {
    const [bucketName, ...pathParts] = filePath.split('/');
    const signedUrl = await minioService.getSignedUrl(bucketName, pathParts.join('/'), 3600);
    
    const clf = await flowiseService.classifyDocument(signedUrl, templateName, { documentId });
    
    const detectedId = clf.entityId ?? (clf.raw?.metadata?.aiParsed?.idEntidad);
    const detectedIdStr = detectedId !== undefined && detectedId !== null ? String(detectedId).trim() || null : null;

    AppLogger.info(`🤖 Resultado Flowise`, {
      documentId,
      entityType: clf.entityType,
      entityId: detectedIdStr,
      confidence: clf.confidence,
    });

    return {
      entityType: sanitizeEntityType(clf.entityType),
      entityId: normalizeUnknown(detectedIdStr),
      documentType: normalizeUnknown(clf.documentType),
      expirationDate: parseExpirationDate(clf.expirationDate),
      confidence: clf.confidence || 0,
      raw: clf.raw || null,
    };
  }

  private async saveClassification(documentId: number, data: ClassificationData): Promise<void> {
    if (!await this.documentExists(documentId)) return;

    await db.getClient().documentClassification.upsert({
      where: { documentId },
      create: {
        documentId,
        detectedEntityType: data.entityType as any,
        detectedEntityId: data.entityId,
        detectedExpiration: data.expirationDate,
        detectedDocumentType: data.documentType,
        confidence: data.confidence,
        aiResponse: data.raw,
      },
      update: {
        detectedEntityType: data.entityType as any,
        detectedEntityId: data.entityId,
        detectedExpiration: data.expirationDate,
        detectedDocumentType: data.documentType,
        confidence: data.confidence,
        aiResponse: data.raw,
      },
    });
  }

  private async associateTemplate(documentId: number, data: ClassificationData): Promise<void> {
    if (!data.documentType || !data.entityType) return;

    try {
      const tpl = await db.getClient().documentTemplate.findFirst({
        where: { name: data.documentType, entityType: data.entityType as any } as any,
      });

      if (!tpl) {
        AppLogger.warn(`⚠️ Plantilla no encontrada: ${data.documentType} (${data.entityType})`);
        return;
      }

      if (await this.documentExists(documentId)) {
        await db.getClient().document.update({ where: { id: documentId }, data: { templateId: (tpl as any).id } });
      }
    } catch { /* noop */ }
  }

  private async enqueueAIValidation(documentId: number): Promise<void> {
    try {
      const { documentValidationService } = await import('../services/document-validation.service');
      if (documentValidationService.isEnabled()) {
        await queueService.addDocumentAIValidation({ documentId, esRechequeo: false });
        AppLogger.info(`🤖 Documento ${documentId} encolado para validación IA`);
      }
    } catch (err) {
      AppLogger.warn(`⚠️ Error encolando validación IA:`, { error: (err as Error).message });
    }
  }

  async markDocumentAsApproved(documentId: number, extractedData: any): Promise<void> {
    try {
      const documentBefore = await db.getClient().document.findUnique({
        where: { id: documentId },
        include: { template: true },
      });
      if (!documentBefore) return;

      const ai = extractedData?.metadata?.aiParsed || {};
      const tenantId = (documentBefore as any).tenantEmpresaId;
      const dadorId = (documentBefore as any).dadorCargaId;

      // Resolver entidad
      let entityUpdate: any = {};
      if (ai?.entidad && ai?.idEntidad && ai.entidad.toUpperCase() !== 'DESCONOCIDO' && ai.idEntidad !== 'Desconocido') {
        const resolved = await resolveEntity(tenantId, dadorId, ai.entidad.toUpperCase(), String(ai.idEntidad));
        if (resolved) {
          entityUpdate = { entityType: resolved.type, entityId: resolved.id, dadorCargaId: resolved.dadorId };
        }
      }

      // Validar fecha de vencimiento
      let safeExpiresAt: Date | undefined;
      if (ai?.vencimientoDate) {
        const d = new Date(ai.vencimientoDate);
        const max = new Date(new Date().getFullYear() + 15, 0, 1);
        if (!isNaN(d.getTime()) && d > new Date('1970-01-01') && d < max) {
          safeExpiresAt = d;
        }
      }

      const updatedDoc = await db.getClient().document.update({
        where: { id: documentId },
        data: {
          status: 'APROBADO' as DocumentStatus,
          validationData: { ...extractedData, ai },
          validatedAt: new Date(),
          expiresAt: safeExpiresAt,
          ...entityUpdate,
        },
        include: { template: true },
      });

      // Deprecar duplicados y aplicar retención
      try {
        await deprecateDuplicates(updatedDoc);
        await applyRetentionPolicy(updatedDoc);
      } catch { AppLogger.warn('No se pudo aplicar deprecación'); }

      notifyStatusChange(documentBefore, 'APROBADO');
      AppLogger.info(`✅ Documento ${documentId} aprobado automáticamente`);
    } catch (error) {
      AppLogger.error('Error marcando documento como aprobado:', cleanError(error));
    }
  }

  async markDocumentAsRejected(documentId: number, errors?: string[]): Promise<void> {
    try {
      const documentBefore = await db.getClient().document.findUnique({
        where: { id: documentId },
        include: { template: true },
      });
      if (!documentBefore) return;

      await db.getClient().document.update({
        where: { id: documentId },
        data: {
          status: 'RECHAZADO' as DocumentStatus,
          validationData: { errors: errors || ['Error de validación'], rejectedAt: new Date().toISOString() },
          validatedAt: new Date(),
        },
      });

      notifyStatusChange(documentBefore, 'RECHAZADO', errors);
      AppLogger.warn(`❌ Documento ${documentId} rechazado`, { errors });
    } catch (error) {
      AppLogger.error('Error marcando documento como rechazado:', cleanError(error));
    }
  }

  private setupEventHandlers(): void {
    this.worker.on('completed', (job) => AppLogger.info(`🎉 Job ${job.id} completado`));
    this.worker.on('failed', (job, err) => AppLogger.error(`💥 Job ${job?.id} falló:`, cleanError(err)));
    this.worker.on('error', (err) => AppLogger.error('💥 Error en worker:', cleanError(err)));
    this.worker.on('ready', () => AppLogger.info('🚀 Document Validation Worker listo'));
  }

  public async close(): Promise<void> {
    await this.worker.close();
    await this.redis.quit();
    AppLogger.info('🔄 Document Validation Worker cerrado');
  }
}

// Exportar instancia singleton
let workerInstance: DocumentValidationWorker | null = null;

export const getDocumentValidationWorker = (): DocumentValidationWorker => {
  if (!workerInstance) {
    workerInstance = new DocumentValidationWorker();
  }
  return workerInstance;
};

export const closeDocumentValidationWorker = async (): Promise<void> => {
  if (workerInstance) {
    await workerInstance.close();
    workerInstance = null;
  }
};
