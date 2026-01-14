import { db } from '../config/database';
import { AppLogger } from '../config/logger';
import type { DocumentStatus, Prisma } from '.prisma/documentos';

// ============================================================================
// HELPERS DE NORMALIZACIÓN
// ============================================================================
const normalizeDigits = (s: string): string => String(s).replace(/\D+/g, '');
const normalizePlate = (s: string): string => String(s).toUpperCase().replace(/[^A-Z0-9]/g, '');
const normalizeText = (s: string): string => String(s)
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toUpperCase()
  .replace(/[^A-Z0-9]+/g, '_')
  .replace(/^_+/, '').replace(/_+$/, '');
const isInt32 = (n: number): boolean => Number.isInteger(n) && n >= -2147483648 && n <= 2147483647;

// ============================================================================
// TIPOS AUXILIARES
// ============================================================================
interface ReviewData {
  reviewedBy: number;
  confirmedEntityType?: string;
  confirmedEntityId?: number | string;
  confirmedExpiration?: Date;
  confirmedTemplateId?: number;
  reviewNotes?: string;
}

interface EntityContext {
  tenantId: number;
  dadorCargaId: number;
  entityType: string;
}

// ============================================================================
// FUNCIONES DE CREACIÓN/BÚSQUEDA DE ENTIDADES
// ============================================================================
async function ensureEmpresaTransportista(tx: any, ctx: EntityContext, cuitRaw: string): Promise<number | null> {
  const cuit = normalizeDigits(cuitRaw);
  if (!cuit) return null;
  
  let emp = await tx.empresaTransportista.findFirst({
    where: { tenantEmpresaId: ctx.tenantId, dadorCargaId: ctx.dadorCargaId, cuit }
  });
  
  if (!emp) {
    try {
      emp = await tx.empresaTransportista.create({
        data: { tenantEmpresaId: ctx.tenantId, dadorCargaId: ctx.dadorCargaId, cuit, razonSocial: `Empresa ${cuit}`, activo: true }
      });
    } catch { /* entidad ya existe */ }
  }
  return emp?.id ?? null;
}

async function ensureChofer(tx: any, ctx: EntityContext, dniRaw: string): Promise<number | null> {
  const dni = normalizeDigits(dniRaw);
  if (!dni) return null;
  
  // Si es número corto, podría ser ID interno
  if (dni.length <= 9) {
    const n = Number(dni);
    if (isInt32(n)) {
      const exists = await tx.chofer.findFirst({ where: { tenantEmpresaId: ctx.tenantId, id: n } });
      if (exists) return n;
    }
  }
  
  let ch = await tx.chofer.findFirst({ where: { tenantEmpresaId: ctx.tenantId, dniNorm: dni } });
  if (!ch) {
    try {
      ch = await tx.chofer.create({
        data: { tenantEmpresaId: ctx.tenantId, dadorCargaId: ctx.dadorCargaId, dni, dniNorm: dni, activo: true, phones: [] }
      });
    } catch { /* entidad ya existe */ }
  }
  return ch?.id ?? null;
}

async function ensureCamion(tx: any, ctx: EntityContext, plateRaw: string): Promise<number | null> {
  const patNorm = normalizePlate(plateRaw);
  if (!patNorm) return null;
  
  let cm = await tx.camion.findFirst({ where: { tenantEmpresaId: ctx.tenantId, patenteNorm: patNorm } });
  if (!cm) {
    try {
      cm = await tx.camion.create({
        data: { tenantEmpresaId: ctx.tenantId, dadorCargaId: ctx.dadorCargaId, patente: plateRaw, patenteNorm: patNorm, activo: true }
      });
    } catch { /* entidad ya existe */ }
  }
  return cm?.id ?? null;
}

async function ensureAcoplado(tx: any, ctx: EntityContext, plateRaw: string): Promise<number | null> {
  const patNorm = normalizePlate(plateRaw);
  if (!patNorm) return null;
  
  let ac = await tx.acoplado.findFirst({ where: { tenantEmpresaId: ctx.tenantId, patenteNorm: patNorm } });
  if (!ac) {
    try {
      ac = await tx.acoplado.create({
        data: { tenantEmpresaId: ctx.tenantId, dadorCargaId: ctx.dadorCargaId, patente: plateRaw, patenteNorm: patNorm, activo: true }
      });
    } catch { /* entidad ya existe */ }
  }
  return ac?.id ?? null;
}

// ============================================================================
// RESOLUCIÓN DE ENTITY ID
// ============================================================================
async function resolveEntityId(
  tx: any,
  ctx: EntityContext,
  proposedVal: unknown
): Promise<number | null> {
  if (typeof proposedVal === 'number') {
    return isInt32(proposedVal) ? Math.trunc(proposedVal) : null;
  }
  
  if (typeof proposedVal !== 'string') return null;
  
  switch (ctx.entityType) {
    case 'EMPRESA_TRANSPORTISTA':
      return ensureEmpresaTransportista(tx, ctx, proposedVal);
    case 'CHOFER':
      return ensureChofer(tx, ctx, proposedVal);
    case 'CAMION':
      return ensureCamion(tx, ctx, proposedVal);
    case 'ACOPLADO':
      return ensureAcoplado(tx, ctx, proposedVal);
    default:
      return null;
  }
}

// ============================================================================
// RENOMBRADO DE ARCHIVO EN MINIO
// ============================================================================
async function renameDocumentInMinio(
  tx: any,
  documentId: number,
  entityType: string,
  templateName: string,
  rawConfirmed: any,
  rawDetected: string | undefined
): Promise<void> {
  const docBefore = await tx.document.findUnique({
    where: { id: documentId },
    select: { filePath: true, entityId: true }
  });
  
  if (!docBefore?.filePath) return;
  
  const [bucketName, ...pathParts] = (docBefore.filePath as string).split('/');
  const oldPath = pathParts.join('/');
  
  // Determinar ID para el nombre del archivo
  let idForName: string | undefined;
  const isPlateEntity = entityType === 'CAMION' || entityType === 'ACOPLADO';
  
  if (rawConfirmed !== undefined && rawConfirmed !== null && String(rawConfirmed).trim() !== '') {
    idForName = isPlateEntity ? normalizePlate(String(rawConfirmed)) : normalizeDigits(String(rawConfirmed));
  } else if (rawDetected) {
    idForName = isPlateEntity ? normalizePlate(String(rawDetected)) : normalizeDigits(String(rawDetected));
  }
  
  if (!idForName || idForName.length === 0) {
    idForName = String(docBefore.entityId);
  }
  
  const fileName = `${normalizeText(templateName || 'DOC')}_${normalizeText(entityType)}_${idForName}.pdf`;
  const baseDir = oldPath.split('/').slice(0, -1).join('/');
  const newPath = `${baseDir}/${fileName}`;
  
  // Mover en MinIO y actualizar DB
  const { minioService } = await import('./minio.service');
  await minioService.moveObject(bucketName, oldPath, newPath);
  await tx.document.update({
    where: { id: documentId },
    data: { fileName, filePath: `${bucketName}/${newPath}` }
  });
}

// ============================================================================
// DEPRECACIÓN Y RETENCIÓN DE VERSIONES
// ============================================================================
async function handleDeprecationAndRetention(
  tx: any,
  updatedDoc: any
): Promise<void> {
  const { getEnvironment } = await import('../config/environment');
  const { minioService } = await import('./minio.service');
  const env = getEnvironment();
  
  const { templateId, expiresAt, tenantEmpresaId, entityType, entityId, id: docId } = updatedDoc;
  if (!templateId || !expiresAt) return;
  
  // Marcar documentos anteriores como DEPRECADO
  const stale = await tx.document.findMany({
    where: {
      tenantEmpresaId,
      id: { not: docId },
      entityType: entityType as any,
      entityId,
      templateId,
      status: 'APROBADO' as any,
      expiresAt,
    },
    select: { id: true, validationData: true },
  });
  
  for (const s of stale) {
    await tx.document.update({
      where: { id: s.id },
      data: {
        status: 'DEPRECADO' as any,
        validationData: { ...(s as any).validationData, replacedBy: docId, replacedAt: new Date().toISOString() },
      },
    });
  }
  
  // Aplicar política de retención
  const maxKeep = Math.max(0, Number(env.DOCS_MAX_DEPRECATED_VERSIONS || 2) || 2);
  const deprecated = await tx.document.findMany({
    where: {
      tenantEmpresaId,
      entityType: entityType as any,
      entityId,
      templateId,
      status: 'DEPRECADO' as any,
      expiresAt,
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
    } catch { /* ignorar errores de eliminación */ }
    try {
      await tx.document.delete({ where: { id: d.id } });
    } catch { /* ignorar errores de eliminación */ }
  }
}

// ============================================================================
// OBTENER IDENTIFICADOR NATURAL DE ENTIDAD
// ============================================================================
async function getEntityNaturalId(entityType: string, entityId: number): Promise<string | null> {
  try {
    switch (entityType) {
      case 'EMPRESA_TRANSPORTISTA': {
        const emp = await db.getClient().empresaTransportista.findUnique({ where: { id: entityId }, select: { cuit: true } });
        return emp?.cuit || null;
      }
      case 'CHOFER': {
        const ch = await db.getClient().chofer.findUnique({ where: { id: entityId }, select: { dni: true } });
        return ch?.dni || null;
      }
      case 'CAMION': {
        const cm = await db.getClient().camion.findUnique({ where: { id: entityId }, select: { patente: true } });
        return cm?.patente || null;
      }
      case 'ACOPLADO': {
        const ac = await db.getClient().acoplado.findUnique({ where: { id: entityId }, select: { patente: true } });
        return ac?.patente || null;
      }
      default:
        return null;
    }
  } catch {
    return null;
  }
}

// ============================================================================
// CALCULAR ESTADO DE VALIDACIÓN IA
// ============================================================================
function calculateIAValidation(classification: any): any {
  if (!classification) return null;
  
  const disparidades = classification.disparidades as any[] | null;
  const hasDisparidades = Array.isArray(disparidades) && disparidades.length > 0;
  const fueValidado = hasDisparidades || classification.validationStatus === 'validated';
  
  let disparitiesSeverity: string | null = null;
  if (hasDisparidades) {
    if (disparidades.some((d: any) => d.severidad === 'critica')) {
      disparitiesSeverity = 'critica';
    } else if (disparidades.some((d: any) => d.severidad === 'advertencia')) {
      disparitiesSeverity = 'advertencia';
    } else {
      disparitiesSeverity = 'info';
    }
  }
  
  return {
    validationStatus: fueValidado ? 'validated' : (classification.validationStatus || null),
    hasDisparities: hasDisparidades,
    disparitiesCount: hasDisparidades ? disparidades.length : 0,
    disparitiesSeverity,
  };
}

// ============================================================================
// CLASE PRINCIPAL
// ============================================================================
export class ApprovalService {
  
  static async getPendingDocuments(
    tenantEmpresaId: number,
    filters: { entityType?: string; minConfidence?: number; maxConfidence?: number; page?: number; limit?: number } = {}
  ): Promise<{ data: any[]; pagination: { page: number; limit: number; total: number; pages: number } }> {
    const { entityType, minConfidence, maxConfidence, page = 1, limit = 20 } = filters;
    const skip = (page - 1) * limit;

    const where: Prisma.DocumentWhereInput = {
      tenantEmpresaId,
      status: 'PENDIENTE_APROBACION' as DocumentStatus,
      classification: {
        ...(entityType && { detectedEntityType: entityType as any }),
        ...(minConfidence !== undefined && { confidence: { gte: minConfidence } }),
        ...(maxConfidence !== undefined && { confidence: { lte: maxConfidence } }),
        reviewedAt: null,
      },
    };

    const [documents, total] = await Promise.all([
      db.getClient().document.findMany({
        where,
        include: { template: { select: { id: true, name: true, entityType: true } }, classification: true },
        skip,
        take: limit,
        orderBy: [{ uploadedAt: 'desc' }, { id: 'desc' }],
      }),
      db.getClient().document.count({ where }),
    ]);

    // Enriquecer documentos
    const enrichedDocs = await Promise.all(
      documents.map(async (doc) => {
        const entityNaturalId = await getEntityNaturalId(doc.entityType as string, doc.entityId as number);
        const iaValidation = calculateIAValidation(doc.classification);
        return { ...doc, entityNaturalId, iaValidation };
      })
    );

    return { data: enrichedDocs, pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
  }

  static async getPendingDocument(documentId: number, tenantEmpresaId: number): Promise<any | null> {
    const document = await db.getClient().document.findFirst({
      where: { id: documentId, tenantEmpresaId, status: 'PENDIENTE_APROBACION' as DocumentStatus },
      include: { template: true, classification: true },
    });
    
    if (!document) return null;
    
    const entityNaturalId = await getEntityNaturalId(document.entityType as string, document.entityId as number);
    return { ...document, entityNaturalId };
  }

  static async approveDocument(
    documentId: number,
    tenantEmpresaId: number,
    reviewData: ReviewData
  ): Promise<any> {
    return db.getClient().$transaction(async (tx) => {
      // 1. Obtener documento
      const document = await tx.document.findFirst({
        where: { id: documentId, tenantEmpresaId, status: 'PENDIENTE_APROBACION' as DocumentStatus },
        include: { classification: true, template: true },
      });
      
      if (!document?.classification) {
        throw new Error('Documento no encontrado o no está pendiente de aprobación');
      }

      // 2. Determinar tipo y ID de entidad
      const classification = document.classification as any;
      const finalEntityType = reviewData.confirmedEntityType || classification.detectedEntityType || document.entityType;
      
      const proposedVal = reviewData.confirmedEntityId ?? classification.detectedEntityId;
      const ctx: EntityContext = {
        tenantId: document.tenantEmpresaId as number,
        dadorCargaId: (document as any).dadorCargaId as number,
        entityType: finalEntityType,
      };
      
      const finalEntityId = await resolveEntityId(tx, ctx, proposedVal);
      
      // 3. Validaciones
      const finalExpiration = reviewData.confirmedExpiration || classification.detectedExpiration;
      const tplIdCandidate = reviewData.confirmedTemplateId ?? document.templateId;
      
      if (!finalEntityType) throw new Error('Debe seleccionar la entidad');
      if (!finalEntityId) throw new Error('Debe confirmarse la identidad de la entidad antes de aprobar');
      if (!tplIdCandidate) throw new Error('Debe seleccionar el tipo de documento');
      if (!finalExpiration) throw new Error('Debe especificar la fecha de vencimiento');

      // 4. Actualizar clasificación
      await tx.documentClassification.update({
        where: { documentId },
        data: { reviewedAt: new Date(), reviewedBy: reviewData.reviewedBy, reviewNotes: reviewData.reviewNotes },
      });

      // 5. Mapear plantilla automáticamente si es necesario
      let newTemplateId = tplIdCandidate;
      if (!newTemplateId && classification.detectedDocumentType) {
        const tpl = await tx.documentTemplate.findFirst({
          where: { name: classification.detectedDocumentType, entityType: finalEntityType } as any
        });
        if (tpl) newTemplateId = (tpl as any).id;
      }

      // 6. Actualizar documento
      const updated = await tx.document.update({
        where: { id: documentId },
        data: {
          status: 'APROBADO' as DocumentStatus,
          validatedAt: new Date(),
          entityType: finalEntityType as any,
          entityId: finalEntityId,
          expiresAt: finalExpiration,
          ...(newTemplateId ? { templateId: newTemplateId } : {}),
        },
        include: { template: true },
      });

      // 7. Renombrar archivo en MinIO
      try {
        await renameDocumentInMinio(
          tx,
          updated.id,
          updated.entityType as string,
          updated.template?.name || 'DOC',
          reviewData.confirmedEntityId,
          classification.detectedEntityId
        );
      } catch { /* ignorar errores de renombrado */ }

      // 8. Deprecar versiones anteriores y aplicar retención
      try {
        await handleDeprecationAndRetention(tx, updated);
      } catch { /* ignorar errores de deprecación */ }

      return updated;
    });
  }

  static async rejectDocument(
    documentId: number,
    tenantEmpresaId: number,
    reviewData: { reviewedBy: number; reason: string; reviewNotes?: string }
  ): Promise<any> {
    if (!reviewData.reason || reviewData.reason.trim().length < 3) {
      throw new Error('Debe especificar un motivo de rechazo');
    }
    
    const updatedDocument = await db.getClient().$transaction(async (tx) => {
      const document = await tx.document.findFirst({
        where: { id: documentId, tenantEmpresaId, status: 'PENDIENTE_APROBACION' as DocumentStatus },
        include: { classification: true },
      });
      
      if (!document) throw new Error('Documento no encontrado o no está pendiente de aprobación');

      if (document.classification) {
        const notes = `RECHAZADO: ${reviewData.reason}${reviewData.reviewNotes ? ` | ${reviewData.reviewNotes}` : ''}`;
        await tx.documentClassification.update({
          where: { documentId },
          data: { reviewedAt: new Date(), reviewedBy: reviewData.reviewedBy, reviewNotes: notes },
        });
      }

      return tx.document.update({
        where: { id: documentId },
        data: {
          status: 'RECHAZADO' as DocumentStatus,
          validatedAt: new Date(),
          rejectedAt: new Date(),
          rejectedBy: reviewData.reviewedBy,
          rejectionReason: reviewData.reason.trim(),
          rejectionCount: { increment: 1 },
          reviewedAt: new Date(),
          reviewedBy: reviewData.reviewedBy,
          reviewNotes: reviewData.reviewNotes,
        },
      });
    });

    // Enviar notificaciones de rechazo (best-effort, no bloquea la transacción)
    setImmediate(async () => {
      try {
        const { RejectionNotificationService } = await import('./rejection-notification.service');
        await RejectionNotificationService.notifyDocumentRejection(
          documentId,
          reviewData.reason
        );
      } catch (error) {
        AppLogger.error('Error enviando notificaciones de rechazo:', error);
      }
    });

    return updatedDocument;
  }

  static async getApprovalStats(tenantEmpresaId: number) {
    const stats = await db.getClient().document.groupBy({
      by: ['status'],
      where: { tenantEmpresaId },
      _count: { status: true }
    });
    
    const result = { pendienteAprobacion: 0, aprobados: 0, rechazados: 0, total: 0 };
    
    for (const s of stats) {
      const count = (s as any)._count.status;
      result.total += count;
      
      if (s.status === 'PENDIENTE_APROBACION') result.pendienteAprobacion = count;
      else if (s.status === 'APROBADO') result.aprobados = count;
      else if (s.status === 'RECHAZADO') result.rechazados = count;
    }
    
    return result;
  }
}
