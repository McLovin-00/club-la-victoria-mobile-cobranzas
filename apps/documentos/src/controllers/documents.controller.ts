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

/**
 * Controlador de Documentos - El Corazón del Sistema
 */
export class DocumentsController {
  
  /**
   * POST /api/docs/documents/upload - Subir documento
   */
  static async uploadDocument(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { templateId, entityType, entityId, dadorCargaId } = req.body as any;
      // Multer fields() coloca archivos en req.files por nombre de campo.
      // Normalizamos a un único array 'files' desde 'documents' y 'document'.
      const anyReq: any = req as any;
      const docsA: Express.Multer.File[] = Array.isArray(anyReq.files?.documents) ? anyReq.files.documents : [];
      const docsB: Express.Multer.File[] = Array.isArray(anyReq.files?.document) ? anyReq.files.document : (anyReq.file ? [anyReq.file] : []);
      const files: Express.Multer.File[] = [...docsA, ...docsB];
      const base64InputsRaw = (req.body as any).documentsBase64;

      // Normalizar base64: puede venir como string o array
      const base64Inputs: string[] = Array.isArray(base64InputsRaw)
        ? base64InputsRaw
        : (typeof base64InputsRaw === 'string' && base64InputsRaw ? [base64InputsRaw] : []);

      if ((!files || files.length === 0) && base64Inputs.length === 0) {
        throw createError('Se requiere al menos una imagen o PDF', 400, 'FILE_REQUIRED');
      }

      // Validaciones usando DocumentService
      const dadorIdNum = parseInt(dadorCargaId);
      const templateIdNum = parseInt(templateId);

      // Validación de permisos por empresa (más estricta para roles de campo):
      // - SUPERADMIN: sin restricción
      // - DADOR_DE_CARGA / TRANSPORTISTA / CLIENTE: solo su empresa
      if (req.user?.role === 'DADOR_DE_CARGA' || req.user?.role === 'TRANSPORTISTA' || req.user?.role === 'CLIENTE') {
        const userEmpresaId = (req.user as any)?.empresaId;
        if (!userEmpresaId || userEmpresaId !== dadorIdNum) {
          throw createError('Acceso denegado a empresa', 403, 'DOCUMENT_UPLOAD_FORBIDDEN');
        }
      }

      // Superadmin puede omitir validación de template habilitado para la empresa
      // Eliminada validación por empresa/template

      // Obtener template para información adicional
      const template = await db.getClient().documentTemplate.findUnique({
        where: { id: templateIdNum },
      });

      if (!template || (template.active === false)) {
        throw createError('Plantilla no encontrada o inactiva', 404, 'TEMPLATE_NOT_FOUND');
      }

      // Inferir escenario por existencia de historial previo
      const last = await db.getClient().document.findFirst({
        where: {
          templateId: templateIdNum,
          entityType,
          entityId: parseInt(entityId),
          dadorCargaId: dadorIdNum,
        },
        orderBy: { uploadedAt: 'desc' },
        select: { id: true, status: true },
      });
      const isInitialAttempt = !last;

      // Permitir subida inicial para ADMIN_INTERNO (Alta Completa manual) y SUPERADMIN
      const allowInitialUpload = req.user?.role === 'ADMIN_INTERNO' || req.user?.role === 'SUPERADMIN';

      if (isInitialAttempt && !allowInitialUpload) {
        // Para alta inicial exigimos planilla completa con todos los documentos obligatorios (carga masiva).
        // Este endpoint sube 1 documento; rechazamos para evitar crear equipos incompletos.
        throw createError(
          'Alta inicial rechazada: debe cargar todos los documentos obligatorios desde la planilla completa.',
          400,
          'INITIAL_UPLOAD_REQUIRES_BATCH'
        );
      } else {
        // Renovación o nueva versión:
        // - Si está VENCIDO, permitir (renovación)
        // - Si NO está VENCIDO, requerir confirmación explícita de nueva versión
        const confirmNewVersion = String((req.body as any).confirmNewVersion ?? '') === 'true' || (req.body as any).confirmNewVersion === true;
        if (last && last.status !== 'VENCIDO' && !confirmNewVersion) {
          throw createError('El documento previo no está vencido. Confirme si es una nueva versión.', 409, 'CONFIRM_NEW_VERSION_REQUIRED');
        }
      }

      // Antivirus opcional (ClamAV) por cada buffer
      const { getEnvironment } = await import('../config/environment');
      const env = getEnvironment();
      const inputs: MediaInput[] = [];
      // Archivos recibidos
      for (const f of files) {
        inputs.push({ buffer: f.buffer, mimeType: f.mimetype, fileName: f.originalname });
      }
      // Base64 recibidos
      for (const b64 of base64Inputs) {
        try {
          const decoded = MediaService.decodeDataUrl(b64);
          inputs.push(decoded);
        } catch {
          throw createError('documentsBase64 inválido', 400, 'INVALID_BASE64');
        }
      }

      if (env.CLAMAV_HOST && env.CLAMAV_PORT && inputs.length > 0) {
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
        } catch (_e) {
          AppLogger.warn('⚠️ Antivirus no disponible o error de escaneo; continuando por configuración');
        }
      }

      // Reglas de combinación: si hay más de un input, todos deben ser imágenes; si es un único input puede ser PDF o imagen
      const hasPdf = inputs.some((i) => /^application\/pdf$/i.test(i.mimeType));
      if (inputs.length > 1 && hasPdf) {
        throw createError('No mezclar PDF con imágenes en el mismo documento', 400, 'MIXED_INPUT_UNSUPPORTED');
      }

      // Preparar buffer final PDF y nombre
      let finalBuffer: Buffer;
      let finalFileName: string;
      const finalMime = 'application/pdf';

      if (inputs.length === 1 && /^application\/pdf$/i.test(inputs[0].mimeType)) {
        // Caso PDF único: almacenar tal cual (ya es PDF)
        finalBuffer = inputs[0].buffer;
        // Renombrar según convención: TIPO_ENTIDAD_ID.pdf
        const buildFileName = (tpl: string, entType: string, entId: number) => {
          const norm = (s: string) => s
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toUpperCase()
            .replace(/[^A-Z0-9]+/g, '_')
            .replace(/^_+|_+$/g, '');
          return `${norm(tpl)}_${norm(entType)}_${entId}.pdf`;
        };
        finalFileName = buildFileName(template.name, entityType, parseInt(entityId));
      } else {
        // Caso 1..N imágenes: componer PDF
        const images = inputs.filter((i) => MediaService.isImage(i.mimeType));
        if (images.length === 0) {
          throw createError('Solo se admiten imágenes o un único PDF', 415, 'UNSUPPORTED_MEDIA_TYPE');
        }
        finalBuffer = await MediaService.composePdfFromImages(images);
        const buildFileName = (tpl: string, entType: string, entId: number) => {
          const norm = (s: string) => s
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toUpperCase()
            .replace(/[^A-Z0-9]+/g, '_')
            .replace(/^_+|_+$/g, '');
          return `${norm(tpl)}_${norm(entType)}_${entId}.pdf`;
        };
        finalFileName = buildFileName(template.name, entityType, parseInt(entityId));
      }

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

      // Extraer fecha de vencimiento: primero del campo directo expiresAt, luego de planilla.vencimientos
      let expiresAtDate: Date | null = null;
      try {
        // 1. Intentar leer expiresAt directo del body (enviado desde EditarEquipoPage)
        const directExpiresAt = (req.body as any).expiresAt;
        if (directExpiresAt && typeof directExpiresAt === 'string') {
          const parsed = new Date(directExpiresAt);
          if (!isNaN(parsed.getTime())) {
            expiresAtDate = parsed;
          }
        }
        
        // 2. Si no hay fecha directa, buscar en planilla.vencimientos (para alta de equipo)
        if (!expiresAtDate) {
          const planilla = (req.body as any).planilla;
          const vencimientos = planilla?.vencimientos || {};
          const rawExpiry = vencimientos[templateId] || vencimientos[String(templateIdNum)];
          if (rawExpiry && typeof rawExpiry === 'string') {
            // Soportar formatos: yyyy-mm-dd (ISO), dd/mm/yyyy (locale), o ISO completo
            let parsed: Date | null = null;
            if (/^\d{4}-\d{2}-\d{2}/.test(rawExpiry)) {
              // Formato ISO: yyyy-mm-dd o yyyy-mm-ddTHH:mm:ss
              parsed = new Date(rawExpiry);
            } else if (/^\d{2}\/\d{2}\/\d{4}$/.test(rawExpiry)) {
              // Formato dd/mm/yyyy → convertir a yyyy-mm-dd
              const [dd, mm, yyyy] = rawExpiry.split('/');
              parsed = new Date(`${yyyy}-${mm}-${dd}`);
            } else if (/^\d{2}\/\d{2}\/\d{2}$/.test(rawExpiry)) {
              // Formato dd/mm/yy → convertir a yyyy-mm-dd (asumir siglo 21)
              const [dd, mm, yy] = rawExpiry.split('/');
              const year = parseInt(yy, 10) < 50 ? `20${yy}` : `19${yy}`;
              parsed = new Date(`${year}-${mm}-${dd}`);
            }
            if (parsed && !isNaN(parsed.getTime())) {
              expiresAtDate = parsed;
            }
          }
        }
      } catch {
        // Si falla el parseo, dejar expiresAt como null
        AppLogger.warn('⚠️ No se pudo parsear la fecha de vencimiento');
      }

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

      // Si se confirmó nueva versión y había un documento previo NO vencido,
      // marcar el anterior como DEPRECADO y dejar traza de reemplazo.
      try {
        const confirmNewVersion = String((req.body as any).confirmNewVersion ?? '') === 'true' || (req.body as any).confirmNewVersion === true;
        if (last && last.status !== 'VENCIDO' && confirmNewVersion) {
          await db.getClient().document.update({
            where: { id: (last as any).id as number },
            data: {
              status: 'DEPRECADO',
              validationData: {
                ...(last as any).validationData,
                replacedBy: document.id,
                replacedAt: new Date().toISOString(),
              } as any,
            },
          });
        }
      } catch (_e) {
        AppLogger.warn('⚠️ No se pudo marcar versión anterior como DEPRECADO (continuando).');
      }

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
      const empresaId = parseInt((req.params as any).dadorId || (req.params as any).empresaId);
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
      const { id } = req.params;

      const document = await db.getClient().document.findUnique({
        where: { id: parseInt(id) },
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
      const { id } = req.params;

      const document = await db.getClient().document.findUnique({
        where: { id: parseInt(id) },
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
      const { id } = req.params;
      const document = await db.getClient().document.findUnique({
        where: { id: parseInt(id) },
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
      const url = await ThumbnailService.getSignedUrl(parseInt(id));
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
      const id = parseInt((req.params as any).id);
      const { expiresAt } = (req.body || {}) as any;
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
      const id = parseInt((req.params as any).id);
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
      const { id } = req.params;

      const document = await db.getClient().document.findUnique({
        where: { id: parseInt(id) },
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
        if (req.user?.empresaId !== (document as any).dadorCargaId) {
          throw createError('Acceso denegado para eliminar documento', 403, 'DELETE_ACCESS_DENIED');
        }
      }

      // Extraer bucket y path del filePath
      const [bucketName, ...pathParts] = document.filePath.split('/');
      const objectPath = pathParts.join('/');

      // Cancelar jobs de validación pendientes para este documento
      await queueService.cancelDocumentValidationJobs(parseInt(id));

      // Eliminar de MinIO
      await minioService.deleteDocument(bucketName, objectPath);

      // Eliminar registro de base de datos
      await db.getClient().document.delete({
        where: { id: parseInt(id) },
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
      const documentId = parseInt(req.params.id);
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
      
      // Obtener archivo
      const anyReq: any = req as any;
      const docsA: Express.Multer.File[] = Array.isArray(anyReq.files?.documents) ? anyReq.files.documents : [];
      const docsB: Express.Multer.File[] = Array.isArray(anyReq.files?.document) ? anyReq.files.document : (anyReq.file ? [anyReq.file] : []);
      const files: Express.Multer.File[] = [...docsA, ...docsB];
      
      if (files.length === 0) {
        throw createError('Se requiere un archivo', 400, 'FILE_REQUIRED');
      }
      
      const file = files[0];
      
      // Preparar buffer final (convertir a PDF si es imagen)
      let finalBuffer: Buffer;
      let finalFileName: string;
      const finalMime = 'application/pdf';
      
      if (/^application\/pdf$/i.test(file.mimetype)) {
        finalBuffer = file.buffer;
        finalFileName = file.originalname.replace(/\.[^.]+$/, '.pdf');
      } else {
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
        finalBuffer = Buffer.concat(chunks);
        finalFileName = file.originalname.replace(/\.[^.]+$/, '.pdf');
      }
      
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
 * Configuración de Multer para upload de archivos
 */
export const uploadMiddleware = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB máximo
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