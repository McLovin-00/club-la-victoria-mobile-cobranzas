import { Response } from 'express';
import multer from 'multer';
import { AuthRequest } from '../middlewares/auth.middleware';
import { db } from '../config/database';
import { minioService } from '../services/minio.service';
import { DocumentService } from '../services/document.service';
import { queueService } from '../services/queue.service';
import { webSocketService } from '../services/websocket.service';
import { AppLogger } from '../config/logger';
import { createError } from '../middlewares/error.middleware';
import { MediaService, type MediaInput } from '../services/media.service';
import { AuditService } from '../services/audit.service';

// ============================================================================
// TIPOS Y CONSTANTES
// ============================================================================
interface UploadContext {
  templateId: number;
  entityType: string;
  entityId: number;
  dadorCargaId: number;
  tenantId: number;
  userId?: number;
  userRole?: string;
  userEmail?: string;
  confirmNewVersion: boolean;
}

const FIELD_ROLES = ['DADOR_DE_CARGA', 'TRANSPORTISTA', 'CLIENTE'];
const INITIAL_UPLOAD_ROLES = ['ADMIN_INTERNO', 'SUPERADMIN'];

// ============================================================================
// HELPERS DE PARSING
// ============================================================================
function parseInputFiles(req: AuthRequest): MediaInput[] {
  const anyReq = req as any;
  const docsA: Express.Multer.File[] = Array.isArray(anyReq.files?.documents) ? anyReq.files.documents : [];
  const docsB: Express.Multer.File[] = Array.isArray(anyReq.files?.document) ? anyReq.files.document : (anyReq.file ? [anyReq.file] : []);
  const files = [...docsA, ...docsB];
  
  const base64Raw = (req.body as any).documentsBase64;
  const base64Inputs: string[] = Array.isArray(base64Raw)
    ? base64Raw
    : (typeof base64Raw === 'string' && base64Raw ? [base64Raw] : []);

  const inputs: MediaInput[] = [];
  
  for (const f of files) {
    inputs.push({ buffer: f.buffer, mimeType: f.mimetype, fileName: f.originalname });
  }
  
  for (const b64 of base64Inputs) {
    try {
      inputs.push(MediaService.decodeDataUrl(b64));
    } catch {
      throw createError('documentsBase64 inválido', 400, 'INVALID_BASE64');
    }
  }

  return inputs;
}

function normalizeFileName(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/(?:^_+)|(?:_+$)/g, '');
}

function buildDocumentFileName(templateName: string, entityType: string, entityId: number): string {
  return `${normalizeFileName(templateName)}_${normalizeFileName(entityType)}_${entityId}.pdf`;
}

// ============================================================================
// HELPERS DE VALIDACIÓN
// ============================================================================
function validateUploadPermissions(ctx: UploadContext, userRole?: string, userEmpresaId?: number): void {
  if (userRole && FIELD_ROLES.includes(userRole)) {
    if (!userEmpresaId || userEmpresaId !== ctx.dadorCargaId) {
      throw createError('Acceso denegado a empresa', 403, 'DOCUMENT_UPLOAD_FORBIDDEN');
    }
  }
}

async function validateUploadScenario(
  ctx: UploadContext,
  userRole?: string
): Promise<{ id: number; status: string } | null> {
  const last = await db.getClient().document.findFirst({
    where: {
      templateId: ctx.templateId,
      entityType: ctx.entityType,
      entityId: ctx.entityId,
      dadorCargaId: ctx.dadorCargaId,
    },
    orderBy: { uploadedAt: 'desc' },
    select: { id: true, status: true },
  });

  const isInitialAttempt = !last;
  const allowInitialUpload = userRole && INITIAL_UPLOAD_ROLES.includes(userRole);

  if (isInitialAttempt && !allowInitialUpload) {
    throw createError(
      'Alta inicial rechazada: debe cargar todos los documentos obligatorios desde la planilla completa.',
      400,
      'INITIAL_UPLOAD_REQUIRES_BATCH'
    );
  }

  if (last && last.status !== 'VENCIDO' && !ctx.confirmNewVersion) {
    throw createError('El documento previo no está vencido. Confirme si es una nueva versión.', 409, 'CONFIRM_NEW_VERSION_REQUIRED');
  }

  return last;
}

// ============================================================================
// HELPERS DE PROCESAMIENTO
// ============================================================================
async function scanForViruses(inputs: MediaInput[]): Promise<void> {
  const { getEnvironment } = await import('../config/environment');
  const env = getEnvironment();

  if (!env.CLAMAV_HOST || !env.CLAMAV_PORT || inputs.length === 0) return;

  try {
    const mod = await import('clamscan');
    const NodeClam: any = (mod as any).default || (mod as any);
    const clamscan = await new NodeClam().init({
      clamdscan: { host: env.CLAMAV_HOST, port: env.CLAMAV_PORT, timeout: 60000 },
    });
    
    for (const item of inputs) {
      const { isInfected } = await clamscan.scanBuffer(item.buffer);
      if (isInfected) {
        throw createError('Archivo infectado', 400, 'FILE_INFECTED');
      }
    }
  } catch (e) {
    if ((e as any).code === 'FILE_INFECTED') throw e;
    AppLogger.warn('⚠️ Antivirus no disponible o error de escaneo; continuando');
  }
}

async function prepareDocumentBuffer(
  inputs: MediaInput[],
  templateName: string,
  entityType: string,
  entityId: number
): Promise<{ buffer: Buffer; fileName: string; mimeType: string }> {
  const hasPdf = inputs.some((i) => /^application\/pdf$/i.test(i.mimeType));

  if (inputs.length > 1 && hasPdf) {
    throw createError('No mezclar PDF con imágenes en el mismo documento', 400, 'MIXED_INPUT_UNSUPPORTED');
  }

  let finalBuffer: Buffer;
  const fileName = buildDocumentFileName(templateName, entityType, entityId);

  if (inputs.length === 1 && /^application\/pdf$/i.test(inputs[0].mimeType)) {
    finalBuffer = inputs[0].buffer;
  } else {
    const images = inputs.filter((i) => MediaService.isImage(i.mimeType));
    if (images.length === 0) {
      throw createError('Solo se admiten imágenes o un único PDF', 415, 'UNSUPPORTED_MEDIA_TYPE');
    }
    finalBuffer = await MediaService.composePdfFromImages(images);
  }

  return { buffer: finalBuffer, fileName, mimeType: 'application/pdf' };
}

function parseExpirationDate(body: any, templateId: number): Date | null {
  // 1. Intentar leer expiresAt directo
  const directExpiresAt = body.expiresAt;
  if (directExpiresAt && typeof directExpiresAt === 'string') {
    const parsed = new Date(directExpiresAt);
    if (!isNaN(parsed.getTime())) return parsed;
  }

  // 2. Buscar en planilla.vencimientos
  const vencimientos = body.planilla?.vencimientos || {};
  const rawExpiry = vencimientos[templateId] || vencimientos[String(templateId)];
  
  if (!rawExpiry || typeof rawExpiry !== 'string') return null;

  // ISO: yyyy-mm-dd
  if (/^\d{4}-\d{2}-\d{2}/.test(rawExpiry)) {
    const d = new Date(rawExpiry);
    return isNaN(d.getTime()) ? null : d;
  }

  // dd/mm/yyyy
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(rawExpiry)) {
    const [dd, mm, yyyy] = rawExpiry.split('/');
    const d = new Date(`${yyyy}-${mm}-${dd}`);
    return isNaN(d.getTime()) ? null : d;
  }

  // dd/mm/yy
  if (/^\d{2}\/\d{2}\/\d{2}$/.test(rawExpiry)) {
    const [dd, mm, yy] = rawExpiry.split('/');
    const year = parseInt(yy, 10) < 50 ? `20${yy}` : `19${yy}`;
    const d = new Date(`${year}-${mm}-${dd}`);
    return isNaN(d.getTime()) ? null : d;
  }

  return null;
}

async function deprecatePreviousDocument(lastDoc: any, newDocId: number): Promise<void> {
  if (!lastDoc || lastDoc.status === 'VENCIDO') return;

  try {
    await db.getClient().document.update({
      where: { id: lastDoc.id },
      data: {
        status: 'DEPRECADO',
        validationData: {
          ...lastDoc.validationData,
          replacedBy: newDocId,
          replacedAt: new Date().toISOString(),
        } as any,
      },
    });
  } catch {
    AppLogger.warn('⚠️ No se pudo marcar versión anterior como DEPRECADO');
  }
}

// ============================================================================
// CONTROLADOR PRINCIPAL
// ============================================================================
export class DocumentsController {
  
  /**
   * POST /api/docs/documents/upload - Subir documento
   */
  static async uploadDocument(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { templateId, entityType, entityId, dadorCargaId } = req.body as any;
      
      const ctx: UploadContext = {
        templateId: parseInt(templateId),
        entityType,
        entityId: parseInt(entityId),
        dadorCargaId: parseInt(dadorCargaId),
        tenantId: req.tenantId!,
        userId: req.user?.userId,
        userRole: req.user?.role,
        userEmail: req.user?.email,
        confirmNewVersion: String((req.body as any).confirmNewVersion ?? '') === 'true' || (req.body as any).confirmNewVersion === true,
      };

      // 1. Parsear archivos de entrada
      const inputs = parseInputFiles(req);
      if (inputs.length === 0) {
        throw createError('Se requiere al menos una imagen o PDF', 400, 'FILE_REQUIRED');
      }

      // 2. Validar permisos
      validateUploadPermissions(ctx, req.user?.role, (req.user as any)?.empresaId);

      // 3. Validar template
      const template = await db.getClient().documentTemplate.findUnique({
        where: { id: ctx.templateId },
      });
      if (!template || template.active === false) {
        throw createError('Plantilla no encontrada o inactiva', 404, 'TEMPLATE_NOT_FOUND');
      }

      // 4. Validar escenario de subida
      const lastDoc = await validateUploadScenario(ctx, req.user?.role);

      // 5. Escanear virus
      await scanForViruses(inputs);

      // 6. Preparar buffer PDF
      const { buffer, fileName, mimeType } = await prepareDocumentBuffer(
        inputs, template.name, entityType, ctx.entityId
      );

      // 7. Subir a MinIO
      const uploadResult = await minioService.uploadDocument(
        ctx.tenantId, entityType, ctx.entityId, template.name, fileName, buffer, mimeType
      );

      // 8. Parsear fecha de vencimiento
      const expiresAtDate = parseExpirationDate(req.body, ctx.templateId);

      // 9. Crear registro en BD
      const document = await db.getClient().document.create({
        data: {
          templateId: ctx.templateId,
          entityType: ctx.entityType,
          entityId: ctx.entityId,
          dadorCargaId: ctx.dadorCargaId,
          tenantEmpresaId: ctx.tenantId,
          status: 'PENDIENTE',
          fileName,
          mimeType,
          fileSize: buffer.length,
          filePath: `${uploadResult.bucketName}/${uploadResult.objectPath}`,
          ...(expiresAtDate && { expiresAt: expiresAtDate }),
        },
        select: {
          id: true, templateId: true, entityType: true, entityId: true, dadorCargaId: true,
          status: true, uploadedAt: true, fileName: true, fileSize: true, mimeType: true, filePath: true,
          template: { select: { name: true, entityType: true } },
        },
      });

      // 10. Deprecar documento anterior si aplica
      if (lastDoc && ctx.confirmNewVersion) {
        await deprecatePreviousDocument(lastDoc, document.id);
      }

      // 11. Notificar via WebSocket
      webSocketService.notifyNewDocument({
        documentId: document.id,
        empresaId: document.dadorCargaId,
        entityType: document.entityType,
        templateName: document.template.name,
        fileName: document.fileName,
        uploadedBy: ctx.userEmail || 'Usuario',
      });

      // 12. Iniciar procesamiento asíncrono
      await DocumentService.processDocument(document.id);

      AppLogger.info('📄 Documento subido exitosamente', {
        documentId: document.id, templateName: template.name, entityType, entityId,
        fileName, fileSize: buffer.length, userId: ctx.userId,
      });

      // 13. Auditoría
      try {
        await AuditService.log({
          tenantEmpresaId: ctx.tenantId, userId: ctx.userId, userRole: ctx.userRole,
          method: req.method, path: req.originalUrl || req.path, statusCode: 201,
          action: 'DOCUMENT_UPLOAD', entityType: 'DOCUMENT', entityId: document.id,
          details: { templateId: ctx.templateId, entityType, entityId: ctx.entityId, fileName, fileSize: buffer.length },
        });
      } catch {}

      // 14. Refrescar vista materializada
      try { 
        (await import('../services/performance.service')).performanceService.refreshMaterializedView(); 
      } catch {}

      res.status(201).json(document);
    } catch (error) {
      AppLogger.error('💥 Error al subir documento:', error);
      if (error instanceof Error && 'code' in error) throw error;
      throw createError('Error al subir documento', 500, 'UPLOAD_DOCUMENT_ERROR');
    }
  }

  /**
   * GET /api/docs/documents/status - Obtener estado de documentos
   */
  static async getDocumentsByEmpresa(req: AuthRequest, res: Response): Promise<void> {
    try {
      const empresaId = parseInt((req.params as any).dadorId || (req.params as any).empresaId);
      const { status, page = '1', limit = '50' } = req.query as any;
      const pageNum = parseInt(String(page), 10) || 1;
      const limitNum = Math.min(parseInt(String(limit), 10) || 50, 100);
      const skip = (pageNum - 1) * limitNum;

      if (req.user?.role !== 'SUPERADMIN' && req.user?.empresaId !== empresaId) {
        throw createError('Acceso denegado a empresa', 403, 'FORBIDDEN');
      }

      const where: any = { tenantEmpresaId: req.tenantId!, dadorCargaId: empresaId };
      if (status) where.status = status;

      const documents = await db.getClient().document.findMany({
        where,
        include: { template: true },
        orderBy: [{ uploadedAt: 'desc' }, { id: 'desc' }],
        take: limitNum,
        skip,
      });

      res.json(documents);
    } catch (error) {
      AppLogger.error('💥 Error obteniendo documentos por empresa:', error);
      throw createError('Error interno', 500, 'GET_DOCUMENTS_DADOR_ERROR');
    }
  }

  static async getDocumentStatus(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { empresaId, entityType, entityId, status, page, limit } = req.query as any;
      const offset = (parseInt(page) - 1) * parseInt(limit);

      const documents = await db.getClient().document.findMany({
        where: {
          tenantEmpresaId: req.tenantId!,
          ...(empresaId && { dadorCargaId: parseInt(empresaId) }),
          ...(entityType && { entityType }),
          ...(entityId && { entityId: parseInt(entityId) }),
          ...(status && { status }),
        },
        include: { template: true },
        orderBy: { uploadedAt: 'desc' },
        take: parseInt(limit),
        skip: offset,
      });

      res.json(documents);
    } catch (error) {
      AppLogger.error('💥 Error obteniendo estado de documentos:', error);
      throw createError('Error interno', 500, 'GET_DOCUMENT_STATUS_ERROR');
    }
  }

  /**
   * GET /api/docs/documents/:id - Obtener detalle de documento
   */
  static async getDocumentById(req: AuthRequest, res: Response): Promise<void> {
    try {
      const documentId = parseInt(req.params.id);
      
      const document = await db.getClient().document.findUnique({
        where: { id: documentId },
        include: { template: true },
      });

      if (!document) {
        throw createError('Documento no encontrado', 404, 'DOCUMENT_NOT_FOUND');
      }

      // Verificar permisos
      if (req.user?.role !== 'SUPERADMIN' && (document as any).tenantEmpresaId !== req.tenantId) {
        throw createError('Acceso denegado', 403, 'FORBIDDEN');
      }

      // Generar URL firmada
      const [bucketName, ...pathParts] = (document.filePath || '').split('/');
      const objectPath = pathParts.join('/');
      let signedUrl: string | null = null;
      
      if (bucketName && objectPath) {
        try {
          signedUrl = await minioService.getSignedUrl(bucketName, objectPath, 3600);
        } catch {
          AppLogger.warn('⚠️ No se pudo generar URL firmada para documento');
        }
      }

      res.json({ ...document, signedUrl });
    } catch (error) {
      AppLogger.error('💥 Error obteniendo documento:', error);
      if (error instanceof Error && 'code' in error) throw error;
      throw createError('Error interno', 500, 'GET_DOCUMENT_ERROR');
    }
  }

  /**
   * DELETE /api/docs/documents/:id - Eliminar documento
   */
  static async deleteDocument(req: AuthRequest, res: Response): Promise<void> {
    try {
      const documentId = parseInt(req.params.id);
      
      const document = await db.getClient().document.findUnique({
        where: { id: documentId },
      });

      if (!document) {
        throw createError('Documento no encontrado', 404, 'DOCUMENT_NOT_FOUND');
      }

      // Solo SUPERADMIN o ADMIN_INTERNO puede eliminar
      if (req.user?.role !== 'SUPERADMIN' && req.user?.role !== 'ADMIN_INTERNO') {
        throw createError('Solo administradores pueden eliminar documentos', 403, 'DELETE_FORBIDDEN');
      }

      // Eliminar de MinIO
      if (document.filePath) {
        const [bucketName, ...pathParts] = document.filePath.split('/');
        const objectPath = pathParts.join('/');
        try {
          await minioService.deleteDocument(bucketName, objectPath);
        } catch {
          AppLogger.warn('⚠️ No se pudo eliminar archivo de MinIO');
        }
      }

      // Eliminar registro
      await db.getClient().document.delete({ where: { id: documentId } });

      AppLogger.info('🗑️ Documento eliminado', { documentId, userId: req.user?.userId });
      
      // Auditoría
      try {
        await AuditService.log({
          tenantEmpresaId: req.tenantId, userId: req.user?.userId, userRole: req.user?.role,
          method: req.method, path: req.originalUrl || req.path, statusCode: 200,
          action: 'DOCUMENT_DELETE', entityType: 'DOCUMENT', entityId: documentId,
          details: { fileName: document.fileName },
        });
      } catch {}

      res.json({ success: true, message: 'Documento eliminado' });
    } catch (error) {
      AppLogger.error('💥 Error eliminando documento:', error);
      if (error instanceof Error && 'code' in error) throw error;
      throw createError('Error interno', 500, 'DELETE_DOCUMENT_ERROR');
    }
  }

  /**
   * GET /api/docs/documents/:id/download - Descargar documento
   */
  static async downloadDocument(req: AuthRequest, res: Response): Promise<void> {
    try {
      const documentId = parseInt(req.params.id);
      
      const document = await db.getClient().document.findUnique({
        where: { id: documentId },
      });

      if (!document) {
        throw createError('Documento no encontrado', 404, 'DOCUMENT_NOT_FOUND');
      }

      // Verificar permisos
      if (req.user?.role !== 'SUPERADMIN' && (document as any).tenantEmpresaId !== req.tenantId) {
        throw createError('Acceso denegado', 403, 'FORBIDDEN');
      }

      const [bucketName, ...pathParts] = (document.filePath || '').split('/');
      const objectPath = pathParts.join('/');

      if (!bucketName || !objectPath) {
        throw createError('Archivo no disponible', 404, 'FILE_NOT_FOUND');
      }

      const stream = await minioService.getDocumentStream(bucketName, objectPath);
      
      res.setHeader('Content-Type', document.mimeType || 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${document.fileName}"`);
      
      stream.pipe(res);
    } catch (error) {
      AppLogger.error('💥 Error descargando documento:', error);
      if (error instanceof Error && 'code' in error) throw error;
      throw createError('Error interno', 500, 'DOWNLOAD_DOCUMENT_ERROR');
    }
  }
}

// Configuración de Multer
export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  fileFilter: (_req, file, cb) => {
    const allowedMimes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Tipo de archivo no permitido'));
    }
  },
});
