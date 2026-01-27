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
import { parseParamId, parseParamIdOptional } from '../utils/params';

// ============================================================================
// MULTER MIDDLEWARE PARA UPLOAD
// ============================================================================
// NOSONAR: Content length limit is intentional - 50MB is required for large PDF documents.
// Limit is validated and appropriate for document management use case.
export const uploadMiddleware = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // NOSONAR: Intentional 50MB limit for large documents
  fileFilter: (_req, file, cb) => {
    const allowed = ['application/pdf', 'image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Tipo de archivo no permitido: ${file.mimetype}`));
    }
  },
});


// ============================================================================
// HELPERS PARA REDUCIR COMPLEJIDAD COGNITIVA
// ============================================================================

/** Parsea una fecha en múltiples formatos */
function parseDateString(rawDate: string): Date | null {
  if (/^\d{4}-\d{2}-\d{2}/.test(rawDate)) {
    const parsed = new Date(rawDate);
    return isNaN(parsed.getTime()) ? null : parsed;
  }
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(rawDate)) {
    const [dd, mm, yyyy] = rawDate.split('/');
    const parsed = new Date(`${yyyy}-${mm}-${dd}`);
    return isNaN(parsed.getTime()) ? null : parsed;
  }
  if (/^\d{2}\/\d{2}\/\d{2}$/.test(rawDate)) {
    const [dd, mm, yy] = rawDate.split('/');
    const year = parseInt(yy, 10) < 50 ? `20${yy}` : `19${yy}`;
    const parsed = new Date(`${year}-${mm}-${dd}`);
    return isNaN(parsed.getTime()) ? null : parsed;
  }
  return null;
}

/** Extrae fecha de vencimiento del request */
function extractExpirationDate(req: AuthRequest, templateId: string | number): Date | null {
  try {
    // 1. Intentar leer expiresAt directo del body
    const directExpiresAt = req.body?.expiresAt;
    if (directExpiresAt && typeof directExpiresAt === 'string') {
      const parsed = parseDateString(directExpiresAt);
      if (parsed) return parsed;
    }
    
    // 2. Buscar en planilla.vencimientos
    const planilla = req.body?.planilla;
    const vencimientos = planilla?.vencimientos || {};
    const rawExpiry = vencimientos[templateId] || vencimientos[String(templateId)];
    if (rawExpiry && typeof rawExpiry === 'string') {
      return parseDateString(rawExpiry);
    }
  } catch {
    AppLogger.warn('⚠️ No se pudo parsear la fecha de vencimiento');
  }
  return null;
}

/** Convierte un archivo a PDF si es imagen */
async function convertFileToPdf(file: Express.Multer.File): Promise<{ buffer: Buffer; fileName: string }> {
  if (/^application\/pdf$/i.test(file.mimetype)) {
    return { buffer: file.buffer, fileName: file.originalname.replace(/\.[^.]+$/, '.pdf') };
  }
  
  // Convertir imagen a PDF
  const PDFDocument = (await import('pdfkit')).default;
  const doc = new PDFDocument({ autoFirstPage: false });
  const chunks: Buffer[] = [];
  doc.on('data', (chunk: Buffer) => chunks.push(chunk));
  
  const sharp = (await import('sharp')).default;
  const imgMeta = await sharp(file.buffer).metadata();
  const width = imgMeta.width || 595;
  const height = imgMeta.height || 842;
  doc.addPage({ size: [width, height], margin: 0 });
  doc.image(file.buffer, 0, 0, { width, height });
  doc.end();
  
  await new Promise<void>((resolve) => doc.on('end', resolve));
  return { buffer: Buffer.concat(chunks), fileName: file.originalname.replace(/\.[^.]+$/, '.pdf') };
}

/** Marca documento anterior como deprecado */
async function deprecatePreviousDocument(
  last: { id: number; status: string } | null, 
  newDocId: number, 
  confirmNewVersion: boolean
): Promise<void> {
  if (!last || last.status === 'VENCIDO' || !confirmNewVersion) return;
  
  try {
    await db.getClient().document.update({
      where: { id: last.id },
      data: {
        status: 'DEPRECADO',
        validationData: {
          replacedBy: newDocId,
          replacedAt: new Date().toISOString(),
        } as any,
      },
    });
  } catch {
    AppLogger.warn('⚠️ No se pudo marcar versión anterior como DEPRECADO (continuando).');
  }
}

/** Extrae archivos de un campo multer */
function getMulterFiles(reqAny: any, fieldName: string): Express.Multer.File[] {
  const filesObj = reqAny.files?.[fieldName];
  if (Array.isArray(filesObj)) return filesObj;
  if (fieldName === 'document' && reqAny.file) return [reqAny.file];
  return [];
}

/** Normaliza input base64 a array */
function normalizeBase64Input(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw;
  if (typeof raw === 'string' && raw) return [raw];
  return [];
}

/** Extrae archivos del request (multer files + base64) */
function extractFilesFromRequest(req: AuthRequest): { files: Express.Multer.File[]; base64Inputs: string[] } {
  const anyReq = req as any;
  const docsA = getMulterFiles(anyReq, 'documents');
  const docsB = getMulterFiles(anyReq, 'document');
  const files = [...docsA, ...docsB];
  const base64Inputs = normalizeBase64Input(req.body?.documentsBase64);
  return { files, base64Inputs };
}

/** Valida permisos de empresa para roles de campo */
function validateUploadPermissions(req: AuthRequest, dadorIdNum: number): void {
  const userRole = req.user?.role || '';
  
  // DADOR_DE_CARGA: debe usar su propio dadorCargaId
  if (userRole === 'DADOR_DE_CARGA') {
    const userDadorCargaId = (req.user as any)?.dadorCargaId;
    if (!userDadorCargaId || userDadorCargaId !== dadorIdNum) {
      throw createError('Acceso denegado a dador indicado', 403, 'DOCUMENT_UPLOAD_FORBIDDEN');
    }
    return;
  }
  
  // TRANSPORTISTA y CLIENTE: verificar que tengan acceso al dador indicado
  if (userRole === 'TRANSPORTISTA' || userRole === 'CLIENTE') {
    const userDadorCargaId = (req.user as any)?.dadorCargaId;
    if (!userDadorCargaId || userDadorCargaId !== dadorIdNum) {
      throw createError('Acceso denegado a dador indicado', 403, 'DOCUMENT_UPLOAD_FORBIDDEN');
    }
  }
}

/** Valida historial previo y permisos de subida inicial */
function validateUploadScenario(
  req: AuthRequest, 
  last: { id: number; status: string } | null
): void {
  const isInitialAttempt = !last;
  const allowInitialUpload = req.user?.role === 'ADMIN_INTERNO' || req.user?.role === 'SUPERADMIN';

  if (isInitialAttempt && !allowInitialUpload) {
    throw createError(
      'Alta inicial rechazada: debe cargar todos los documentos obligatorios desde la planilla completa.',
      400,
      'INITIAL_UPLOAD_REQUIRES_BATCH'
    );
  }
  
  if (last && last.status !== 'VENCIDO') {
    const confirmNewVersion = String(req.body?.confirmNewVersion ?? '') === 'true' || req.body?.confirmNewVersion === true;
    if (!confirmNewVersion) {
      throw createError('El documento previo no está vencido. Confirme si es una nueva versión.', 409, 'CONFIRM_NEW_VERSION_REQUIRED');
    }
  }
}

/** Convierte archivos y base64 a MediaInput[] */
function prepareMediaInputs(files: Express.Multer.File[], base64Inputs: string[]): MediaInput[] {
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

/** Escanea archivos con ClamAV si está configurado */
async function scanFilesForVirus(inputs: MediaInput[]): Promise<void> {
  const { getEnvironment } = await import('../config/environment');
  const env = getEnvironment();
  
  if (!env.CLAMAV_HOST || !env.CLAMAV_PORT || inputs.length === 0) return;
  
  try {
    const mod = await import('clamscan');
    const NodeClam: any = (mod as any).default || mod;
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
    if (e instanceof Error && 'code' in e) throw e;
    AppLogger.warn('⚠️ Antivirus no disponible o error de escaneo; continuando por configuración');
  }
}

/** 
 * Normaliza string para nombre de archivo
 * @security Input bounded to 256 chars to prevent DoS
 */
function normalizeFileName(s: string): string {
  // Bound input length to prevent DoS
  const bounded = s.slice(0, 256);
  return bounded
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+/, '').replace(/_+$/, '');
}

/** Construye nombre de archivo según convención */
function buildDocumentFileName(templateName: string, entityType: string, entityId: number): string {
  return `${normalizeFileName(templateName)}_${normalizeFileName(entityType)}_${entityId}.pdf`;
}

/** Prepara el buffer final PDF desde los inputs */
async function prepareFinalPdf(inputs: MediaInput[], templateName: string, entityType: string, entityId: number): Promise<{ buffer: Buffer; fileName: string }> {
  const hasPdf = inputs.some((i) => /^application\/pdf$/i.test(i.mimeType));
  
  if (inputs.length > 1 && hasPdf) {
    throw createError('No mezclar PDF con imágenes en el mismo documento', 400, 'MIXED_INPUT_UNSUPPORTED');
  }

  const fileName = buildDocumentFileName(templateName, entityType, entityId);

  if (inputs.length === 1 && /^application\/pdf$/i.test(inputs[0].mimeType)) {
    return { buffer: inputs[0].buffer, fileName };
  }

  const images = inputs.filter((i) => MediaService.isImage(i.mimeType));
  if (images.length === 0) {
    throw createError('Solo se admiten imágenes o un único PDF', 415, 'UNSUPPORTED_MEDIA_TYPE');
  }
  
  return { buffer: await MediaService.composePdfFromImages(images), fileName };
}

/**
 * Controlador de Documentos - El Corazón del Sistema
 */
export class DocumentsController {
  
  /**
   * POST /api/docs/documents/upload - Subir documento
   */
  static async uploadDocument(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { templateId, entityType, entityId, dadorCargaId } = req.body;
      const dadorIdNum = parseInt(dadorCargaId);
      const templateIdNum = parseInt(templateId);

      // 1. Extraer archivos del request
      const { files, base64Inputs } = extractFilesFromRequest(req);
      if (files.length === 0 && base64Inputs.length === 0) {
        throw createError('Se requiere al menos una imagen o PDF', 400, 'FILE_REQUIRED');
      }

      // 2. Validar permisos
      validateUploadPermissions(req, dadorIdNum);

      // 3. Validar template
      const template = await db.getClient().documentTemplate.findUnique({
        where: { id: templateIdNum },
      });
      if (!template || template.active === false) {
        throw createError('Plantilla no encontrada o inactiva', 404, 'TEMPLATE_NOT_FOUND');
      }

      // 4. Validar historial y escenario de subida
      const last = await db.getClient().document.findFirst({
        where: { templateId: templateIdNum, entityType, entityId: parseInt(entityId), dadorCargaId: dadorIdNum },
        orderBy: { uploadedAt: 'desc' },
        select: { id: true, status: true },
      });
      validateUploadScenario(req, last);

      // 5. Preparar inputs de media
      const inputs = prepareMediaInputs(files, base64Inputs);

      // 6. Escanear virus
      await scanFilesForVirus(inputs);

      // 7. Preparar PDF final
      const { buffer: finalBuffer, fileName: finalFileName } = await prepareFinalPdf(
        inputs, template.name, entityType, parseInt(entityId)
      );
      const finalMime = 'application/pdf';

      // Subir PDF a MinIO
      const uploadResult = await minioService.uploadDocument(
        req.tenantId!,
        entityType,
        parseInt(entityId),
        template.name,
        finalFileName,
        finalBuffer,
        finalMime
      );

      // 8. Extraer fecha de vencimiento
      const expiresAtDate = extractExpirationDate(req, templateIdNum);

      // Crear registro en base de datos con campos de archivo embebidos
      const document = await db.getClient().document.create({
        data: {
          templateId: templateIdNum,
          entityType,
          entityId: parseInt(entityId),
          dadorCargaId: dadorIdNum,
          tenantEmpresaId: req.tenantId!,
          status: 'PENDIENTE',
          fileName: finalFileName,
          mimeType: finalMime,
          fileSize: finalBuffer.length,
          filePath: `${uploadResult.bucketName}/${uploadResult.objectPath}`,
          ...(expiresAtDate && { expiresAt: expiresAtDate }),
        },
        select: {
          id: true,
          templateId: true,
          entityType: true,
          entityId: true,
          dadorCargaId: true,
          status: true,
          uploadedAt: true,
          fileName: true,
          fileSize: true,
          mimeType: true,
          filePath: true,
          template: {
            select: {
              name: true,
              entityType: true,
            },
          },
        },
      });

      // 10. Marcar documento anterior como deprecado si corresponde
      const confirmNewVersion = String(req.body?.confirmNewVersion ?? '') === 'true' || req.body?.confirmNewVersion === true;
      await deprecatePreviousDocument(last, document.id, confirmNewVersion);

      // Notificar nuevo documento via WebSocket
      webSocketService.notifyNewDocument({
        documentId: document.id,
        empresaId: document.dadorCargaId,
        entityType: document.entityType,
        templateName: document.template.name,
        fileName: document.fileName,
        uploadedBy: req.user?.email || 'Usuario',
      });

      // Iniciar procesamiento asíncrono
      await DocumentService.processDocument(document.id);

      AppLogger.info('📄 Documento subido exitosamente', {
        documentId: document.id,
        templateName: template.name,
        entityType,
        entityId,
        dadorCargaId,
        fileName: finalFileName,
        fileSize: finalBuffer.length,
        userId: req.user?.userId,
      });

      // Audit
      try {
        await AuditService.log({
          tenantEmpresaId: req.tenantId,
          userId: req.user?.userId,
          userRole: req.user?.role,
          method: req.method,
          path: req.originalUrl || req.path,
          statusCode: 201,
          action: 'DOCUMENT_UPLOAD',
          entityType: 'DOCUMENT',
          entityId: document.id,
          details: { templateId: (document as any).templateId, entityType: document.entityType, entityId: document.entityId, fileName: document.fileName, fileSize: document.fileSize },
        });
      } catch {}
      // Refrescar vista materializada (best-effort)
      try { (await import('../services/performance.service')).performanceService.refreshMaterializedView(); } catch {}

      res.status(201).json(document);
    } catch (error) {
      AppLogger.error('💥 Error al subir documento:', error);
      if (error instanceof Error && 'code' in error) {
        throw error;
      }
      throw createError('Error al subir documento', 500, 'UPLOAD_DOCUMENT_ERROR');
    }
  }

  /**
   * GET /api/docs/documents/status - Obtener estado de documentos (Lista con semáforos)
   */
  static async getDocumentsByEmpresa(req: AuthRequest, res: Response): Promise<void> {
    try {
      const empresaId = parseParamIdOptional(req.params, 'dadorId') ?? parseParamId(req.params, 'empresaId');
      const { status, page = '1', limit = '50' } = req.query as any;
      const pageNum = parseInt(String(page), 10) || 1;
      const limitNum = Math.min(parseInt(String(limit), 10) || 50, 100);
      const skip = (pageNum - 1) * limitNum;

      // Seguridad: si no es superadmin, forzar empresa del usuario
      if (req.user?.role !== 'SUPERADMIN' && req.user?.empresaId !== empresaId) {
        throw createError('Acceso denegado a empresa', 403, 'FORBIDDEN');
      }

      const where: any = { tenantEmpresaId: req.tenantId!, dadorCargaId: empresaId };
      if (status) where.status = status;

      const documents = await db.getClient().document.findMany({
        where,
        include: {
          template: true,
        },
        orderBy: [
          { uploadedAt: 'desc' },
          { id: 'desc' },
        ],
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

      // Construir filtros
      const where: any = {};
      
      if (empresaId) where.dadorCargaId = parseInt(empresaId);
      where.tenantEmpresaId = req.tenantId!;
      if (entityType) where.entityType = entityType;
      if (entityId) where.entityId = parseInt(entityId);
      if (status) where.status = status;

      // Si no es superadmin, filtrar por empresa del usuario
      if (req.user?.role !== 'SUPERADMIN' && req.user?.empresaId) {
        where.dadorCargaId = req.user.empresaId;
      }

      // Obtener documentos con paginación
      const [documents, total] = await Promise.all([
        db.getClient().document.findMany({
          where,
          select: {
            id: true,
            templateId: true,
            entityType: true,
            entityId: true,
            dadorCargaId: true,
            fileName: true,
            fileSize: true,
            mimeType: true,
            status: true,
            expiresAt: true,
            uploadedAt: true,
            validatedAt: true,
            template: {
              select: {
                name: true,
                entityType: true,
              },
            },
          },
          orderBy: [
            { uploadedAt: 'desc' },
          ],
          take: parseInt(limit),
          skip: offset,
        }),
        db.getClient().document.count({ where }),
      ]);

      // Calcular estadísticas rápidas
      const stats = {
        pendiente: await db.getClient().document.count({ 
          where: { ...where, status: 'PENDIENTE' } 
        }),
        validando: await db.getClient().document.count({ 
          where: { ...where, status: 'VALIDANDO' } 
        }),
        aprobado: await db.getClient().document.count({ 
          where: { ...where, status: 'APROBADO' } 
        }),
        rechazado: await db.getClient().document.count({ 
          where: { ...where, status: 'RECHAZADO' } 
        }),
        vencido: await db.getClient().document.count({ 
          where: { ...where, status: 'VENCIDO' } 
        }),
      };

      AppLogger.debug(`📊 Consulta de estado de documentos: ${documents.length} encontrados`, {
        filters: where,
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        userId: req.user?.userId,
      });

      res.json({
        success: true,
        data: documents,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit)),
        },
        stats,
      });
    } catch (error) {
      AppLogger.error('💥 Error al obtener estado de documentos:', error);
      throw createError('Error al obtener documentos', 500, 'GET_DOCUMENT_STATUS_ERROR');
    }
  }

  /**
   * GET /api/docs/documents/:id/preview - Obtener URL de preview
   */
  static async getDocumentPreview(req: AuthRequest, res: Response): Promise<void> {
    try {
      const id = parseParamId(req.params, 'id');

      const document = await db.getClient().document.findUnique({
        where: { id },
        select: {
          id: true,
          filePath: true,
          fileName: true,
          mimeType: true,
          dadorCargaId: true,
          tenantEmpresaId: true,
          entityType: true,
          entityId: true,
          template: {
            select: {
              name: true,
            },
          },
        },
      });

      if (!document) {
        throw createError('Documento no encontrado', 404, 'DOCUMENT_NOT_FOUND');
      }

      // Verificar permisos de acceso
      // Nota: para usuarios no SUPERADMIN, el token trae empresaId del tenant.
      // El documento pertenece a un tenant (tenantEmpresaId) y a un dador específico (dadorCargaId).
      // El acceso de ADMIN/OPERATOR debe validarse por tenant, no por dador.
      if (req.user?.role !== 'SUPERADMIN') {
        const userTenantId = (req.user as any).empresaId;
        if (userTenantId !== document.tenantEmpresaId) {
          throw createError('Acceso denegado al documento', 403, 'DOCUMENT_ACCESS_DENIED');
        }
      }

      // Extraer bucket y path del filePath
      const [_bucketName, ..._pathParts] = document.filePath.split('/');
      const _objectPath = _pathParts.join('/');

      // Asegurar que el bucket exista para este tenant (auto-init en entornos vacíos)
      if (document.tenantEmpresaId) {
        try {
          await minioService.ensureBucketExists(document.tenantEmpresaId);
        } catch (_e) {
          // Ignorar para no ocultar errores originales; getSignedUrl reportará con claridad
        }
      }

      // Para evitar problemas de proxy/firmas en visores embebidos, usar el stream del backend
      // como URL de preview (inline). Esto funciona igual desde dentro/afuera.
      // Usar X-Forwarded-Proto si está disponible (proxy/MikroTik), sino req.protocol
      const protocol = req.get('X-Forwarded-Proto') || req.protocol;
      const backendPreviewUrl = `${protocol}://${req.get('host')}/api/docs/documents/${document.id}/download?inline=1`;

      AppLogger.debug('🔗 URL de preview generada', {
        documentId: document.id,
        fileName: document.fileName,
        userId: req.user?.userId,
      });

      res.json({
        success: true,
        data: {
          id: document.id,
          fileName: document.fileName,
          mimeType: document.mimeType,
          templateName: document.template.name,
          previewUrl: backendPreviewUrl,
          expiresIn: 3600, // segundos
        },
      });
    } catch (error) {
      AppLogger.error('💥 Error al generar preview de documento:', error);
      if (error instanceof Error && 'code' in error) {
        throw error;
      }
      throw createError('Error al generar preview', 500, 'DOCUMENT_PREVIEW_ERROR');
    }
  }

  /**
   * GET /api/docs/documents/:id/download - Descargar documento
   */
  static async downloadDocument(req: AuthRequest, res: Response): Promise<void> {
    try {
      const id = parseParamId(req.params, 'id');

      const document = await db.getClient().document.findUnique({
        where: { id },
        select: {
          id: true,
          filePath: true,
          fileName: true,
          mimeType: true,
          dadorCargaId: true,
          tenantEmpresaId: true,
          entityType: true,
          entityId: true,
          template: {
            select: {
              name: true,
            },
          },
        },
      });

      if (!document) {
        throw createError('Documento no encontrado', 404, 'DOCUMENT_NOT_FOUND');
      }

      // Verificar permisos de acceso (mismo criterio que preview)
      if (req.user?.role !== 'SUPERADMIN') {
        const userTenantId = (req.user as any).empresaId;
        if (userTenantId !== document.tenantEmpresaId) {
          throw createError('Acceso denegado al documento', 403, 'DOCUMENT_ACCESS_DENIED');
        }
      }

      // Extraer bucket y path del filePath
      const [bucketName, ...pathParts] = document.filePath.split('/');
      const objectPath = pathParts.join('/');

      // Asegurar bucket para el tenant antes de intentar obtener el objeto
      if (document.tenantEmpresaId) {
        try {
          await minioService.ensureBucketExists(document.tenantEmpresaId);
        } catch (_) {}
      }

      // Obtener el archivo de MinIO como stream
      const fileStream = await minioService.getObject(bucketName, objectPath);

      // Configurar headers según el parámetro inline
      const isInline = req.query.inline === '1';
      res.setHeader('Content-Type', document.mimeType);
      
      if (isInline) {
        // Para vista previa: inline con headers que permiten embedding
        res.setHeader('Content-Disposition', `inline; filename="${document.fileName}"`);
        res.setHeader('X-Frame-Options', 'SAMEORIGIN');
        res.setHeader('Content-Security-Policy', 'frame-ancestors \'self\' https://bca.microsyst.com.ar https://doc.microsyst.com.ar');
      } else {
        // Para descarga: attachment
        res.setHeader('Content-Disposition', `attachment; filename="${document.fileName}"`);
      }
      
      res.setHeader('Cache-Control', 'no-cache');

      AppLogger.debug('📥 Descarga iniciada', {
        documentId: document.id,
        fileName: document.fileName,
        userId: req.user?.userId,
      });

      // Enviar el stream directamente como respuesta
      fileStream.pipe(res);

      fileStream.on('end', () => {
        AppLogger.info('✅ Descarga completada', {
          documentId: document.id,
          fileName: document.fileName,
          userId: req.user?.userId,
        });
      });

      fileStream.on('error', (error) => {
        AppLogger.error('💥 Error durante descarga:', error);
        if (!res.headersSent) {
          res.status(500).json({ error: 'Error al descargar archivo' });
        }
      });

    } catch (error) {
      AppLogger.error('💥 Error al iniciar descarga de documento:', error);
      if (error instanceof Error && 'code' in error) {
        throw error;
      }
      throw createError('Error al descargar documento', 500, 'DOCUMENT_DOWNLOAD_ERROR');
    }
  }

  /**
   * GET /api/docs/documents/:id/thumbnail - Obtener thumbnail (URL firmada)
   */
  static async getDocumentThumbnail(req: AuthRequest, res: Response): Promise<void> {
    try {
      const id = parseParamId(req.params, 'id');
      const document = await db.getClient().document.findUnique({
        where: { id },
        select: { id: true, tenantEmpresaId: true, dadorCargaId: true, mimeType: true },
      });
      if (!document) throw createError('Documento no encontrado', 404, 'DOCUMENT_NOT_FOUND');
      if (req.user?.role !== 'SUPERADMIN') {
        const userTenantId = (req.user as any).empresaId;
        if (userTenantId !== document.tenantEmpresaId) {
          throw createError('Acceso denegado al documento', 403, 'DOCUMENT_ACCESS_DENIED');
        }
      }
      const { ThumbnailService } = await import('../services/thumbnail.service');
      const url = await ThumbnailService.getSignedUrl(id);
      res.json({ success: true, data: { url, mimeType: 'image/jpeg', expiresIn: 3600 } });
    } catch (error) {
      AppLogger.error('💥 Error al generar thumbnail de documento:', error);
      if (error instanceof Error && 'code' in error) {
        throw error;
      }
      throw createError('Error al generar thumbnail', 500, 'DOCUMENT_THUMBNAIL_ERROR');
    }
  }

  /**
   * POST /api/docs/documents/:id/renew - Renovar documento (nueva versión)
   */
  static async renewDocument(req: AuthRequest, res: Response): Promise<void> {
    try {
      const id = parseParamId(req.params, 'id');
      const { expiresAt } = req.body || {};
      const next = await DocumentService.renew(id, {
        expiresAt: expiresAt ? new Date(expiresAt) : undefined,
        requestedBy: (req.user as any)?.userId,
      });
      res.status(201).json({ success: true, data: next });
      try { (await import('../services/performance.service')).performanceService.refreshMaterializedView(); } catch {}
    } catch (error) {
      AppLogger.error('💥 Error renovando documento:', error);
      throw createError('Error al renovar documento', 500, 'DOCUMENT_RENEW_ERROR');
    }
  }

  /**
   * GET /api/docs/documents/:id/history - Historial de versiones
   */
  static async getDocumentHistory(req: AuthRequest, res: Response): Promise<void> {
    try {
      const id = parseParamId(req.params, 'id');
      const rows = await DocumentService.getHistory(id);
      res.json({ success: true, data: rows });
    } catch (error) {
      AppLogger.error('💥 Error obteniendo historial de documento:', error);
      throw createError('Error al obtener historial', 500, 'DOCUMENT_HISTORY_ERROR');
    }
  }

  /**
   * DELETE /api/docs/documents/:id - Eliminar documento
   */
  static async deleteDocument(req: AuthRequest, res: Response): Promise<void> {
    try {
      const id = parseParamId(req.params, 'id');

      const document = await db.getClient().document.findUnique({
        where: { id },
        select: {
          id: true,
          filePath: true,
          fileName: true,
          dadorCargaId: true,
          entityType: true,
          entityId: true,
          template: {
            select: {
              name: true,
            },
          },
        },
      });

      if (!document) {
        throw createError('Documento no encontrado', 404, 'DOCUMENT_NOT_FOUND');
      }

      // Verificar permisos de eliminación
      if (req.user?.role !== 'SUPERADMIN') {
        if (req.user?.empresaId !== document.dadorCargaId) {
          throw createError('Acceso denegado para eliminar documento', 403, 'DELETE_ACCESS_DENIED');
        }
      }

      // Extraer bucket y path del filePath
      const [bucketName, ...pathParts] = document.filePath.split('/');
      const objectPath = pathParts.join('/');

      // Cancelar jobs de validación pendientes para este documento
      await queueService.cancelDocumentValidationJobs(id);

      // Eliminar de MinIO
      await minioService.deleteDocument(bucketName, objectPath);

      // Eliminar registro de base de datos
      await db.getClient().document.delete({
        where: { id },
      });

      AppLogger.info('🗑️ Documento eliminado completamente', {
        documentId: document.id,
        fileName: document.fileName,
        templateName: document.template.name,
        userId: req.user?.userId,
      });

      // Audit
      void AuditService.log({
        tenantEmpresaId: (req as any).tenantId,
        userId: req.user?.userId,
        userRole: req.user?.role,
        method: req.method,
        path: req.originalUrl || req.path,
        statusCode: 200,
        action: 'DOCUMENT_DELETE',
        entityType: 'DOCUMENT',
        entityId: document.id,
        details: { fileName: document.fileName, templateName: document.template.name },
      });
      try { (await import('../services/performance.service')).performanceService.refreshMaterializedView(); } catch {}

      res.json({
        success: true,
        message: 'Documento eliminado exitosamente',
      });
    } catch (error) {
      AppLogger.error('💥 Error al eliminar documento:', error);
      if (error instanceof Error && 'code' in error) {
        throw error;
      }
      throw createError('Error al eliminar documento', 500, 'DELETE_DOCUMENT_ERROR');
    }
  }

  /**
   * POST /api/docs/documents/:id/resubmit - Resubir documento rechazado
   * Permite a transportistas resubir un documento que fue rechazado
   */
  static async resubmitDocument(req: AuthRequest, res: Response): Promise<void> {
    try {
      const documentId = parseParamId(req.params, 'id');
      const tenantId = req.tenantId!;
      
      // Obtener documento actual
      const document = await db.getClient().document.findFirst({
        where: { 
          id: documentId, 
          tenantEmpresaId: tenantId,
          status: 'RECHAZADO' as any,
        },
        include: { template: true },
      });
      
      if (!document) {
        throw createError('Documento no encontrado o no está rechazado', 404, 'DOCUMENT_NOT_FOUND');
      }
      
      // Obtener archivo usando helpers
      const anyReq = req as any;
      const files = [...getMulterFiles(anyReq, 'documents'), ...getMulterFiles(anyReq, 'document')];
      
      if (files.length === 0) {
        throw createError('Se requiere un archivo', 400, 'FILE_REQUIRED');
      }
      
      const file = files[0];
      
      // Preparar buffer final (convertir a PDF si es imagen)
      const { buffer: finalBuffer, fileName: finalFileName } = await convertFileToPdf(file);
      const finalMime = 'application/pdf';
      
      // Eliminar archivo anterior de MinIO
      try {
        const [oldBucket, ...oldPathParts] = document.filePath.split('/');
        await minioService.deleteDocument(oldBucket, oldPathParts.join('/'));
      } catch {
        AppLogger.warn('⚠️ No se pudo eliminar archivo anterior');
      }
      
      // Subir nuevo archivo
      const uploadResult = await minioService.uploadDocument(
        tenantId,
        document.entityType,
        document.entityId,
        document.template.name,
        finalFileName,
        finalBuffer,
        finalMime
      );
      
      // Actualizar documento
      const updated = await db.getClient().document.update({
        where: { id: documentId },
        data: {
          status: 'PENDIENTE_APROBACION' as any,
          fileName: finalFileName,
          fileSize: finalBuffer.length,
          filePath: `${uploadResult.bucketName}/${uploadResult.objectPath}`,
          uploadedAt: new Date(),
          validatedAt: null,
        },
      });
      
      // Limpiar clasificación anterior si existe
      await db.getClient().documentClassification.deleteMany({
        where: { documentId },
      });
      
      // Encolar para clasificación
      try {
        await queueService.addDocumentValidation({
          documentId: updated.id,
          filePath: updated.filePath,
          templateName: document.template.name,
          entityType: document.entityType,
        });
      } catch { /* Ignorar errores de cola */ }
      
      AppLogger.info('📄 Documento resubido', {
        documentId: updated.id,
        templateName: document.template.name,
        userId: req.user?.userId,
      });
      
      // Audit
      void AuditService.log({
        tenantEmpresaId: tenantId,
        userId: req.user?.userId,
        userRole: req.user?.role,
        method: req.method,
        path: req.originalUrl || req.path,
        statusCode: 200,
        action: 'DOCUMENT_RESUBMIT',
        entityType: 'DOCUMENT',
        entityId: updated.id,
        details: { templateName: document.template.name },
      });
      
      res.json({
        success: true,
        message: 'Documento resubido correctamente. Pendiente de aprobación.',
        data: updated,
      });
    } catch (error) {
      AppLogger.error('💥 Error al resubir documento:', error);
      if (error instanceof Error && 'code' in error) {
        throw error;
      }
      throw createError('Error al resubir documento', 500, 'RESUBMIT_ERROR');
    }
  }
}

/**
 * Configuración de Multer para reupload de archivos
 * NOSONAR: Content length limits are intentional and appropriate for document uploads
 * @note Esta configuración está preparada para la futura ruta de reupload
 */
const _reuploadMiddleware = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // NOSONAR: Intentional 10MB limit
    files: 25, // Permitir múltiples imágenes por documento
  },
  fileFilter: (req, file, cb) => {
    // Tipos de archivo permitidos
    const allowedMimes = [
      'application/pdf',
      'image/jpeg',
      'image/jpg', 
      'image/png',
      'image/webp',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];

    // Sanitizar nombre de archivo
    const original = file.originalname || '';
    const safeName = original.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 128);
    (file as any).originalname = safeName || 'upload.bin';

    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      const err: any = new Error('Tipo de archivo no permitido. Solo PDF, JPG, PNG, WEBP, DOC, DOCX.');
      err.code = 'INVALID_FILE_TYPE';
      cb(err);
    }
  },
});