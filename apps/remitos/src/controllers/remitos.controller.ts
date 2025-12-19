import { Response } from 'express';
import { AuthRequest } from '../types';
import { RemitoService } from '../services/remito.service';
import { minioService } from '../services/minio.service';
import { MediaService } from '../services/media.service';
import { createError } from '../middlewares/error.middleware';
import { AppLogger } from '../config/logger';

export class RemitosController {
  
  /**
   * POST /remitos - Crear nuevo remito
   * Acepta:
   * - Múltiples imágenes (se componen en PDF para almacenar)
   * - Un único PDF (se almacena tal cual)
   * - Base64 en body.documentsBase64[]
   */
  static async create(req: AuthRequest, res: Response): Promise<void> {
    try {
      // Normalizar archivos desde multer (puede ser array o single)
      const anyReq = req as any;
      const filesFromMulter: Express.Multer.File[] = 
        Array.isArray(anyReq.files?.imagenes) ? anyReq.files.imagenes :
        Array.isArray(anyReq.files) ? anyReq.files :
        anyReq.file ? [anyReq.file] : [];
      
      // También aceptar base64 desde body
      const base64Raw = (req.body as any).documentsBase64;
      const base64Inputs: string[] = Array.isArray(base64Raw) 
        ? base64Raw 
        : (typeof base64Raw === 'string' && base64Raw ? [base64Raw] : []);
      
      // Construir lista de inputs
      const inputs: Array<{ buffer: Buffer; mimeType: string; fileName: string }> = [];
      
      for (const f of filesFromMulter) {
        inputs.push({ buffer: f.buffer, mimeType: f.mimetype, fileName: f.originalname });
      }
      
      for (const b64 of base64Inputs) {
        try {
          const decoded = MediaService.decodeDataUrl(b64);
          inputs.push({ ...decoded, fileName: decoded.fileName || 'capture.jpg' });
        } catch {
          throw createError('Base64 inválido', 400, 'INVALID_BASE64');
        }
      }
      
      if (inputs.length === 0) {
        throw createError('Se requiere al menos una imagen o PDF', 400, 'FILE_REQUIRED');
      }
      
      // Validar tipos de archivo
      const hasPdf = inputs.some(i => MediaService.isPdf(i.mimeType));
      const hasImages = inputs.some(i => MediaService.isImage(i.mimeType));
      
      // No mezclar PDF con imágenes
      if (hasPdf && hasImages) {
        throw createError('No se puede mezclar PDF con imágenes', 400, 'MIXED_INPUT_ERROR');
      }
      
      // Si hay un PDF único, validar que solo sea uno
      if (hasPdf && inputs.length > 1) {
        throw createError('Solo se permite un PDF por remito', 400, 'MULTIPLE_PDF_ERROR');
      }
      
      // Obtener tenant y dador
      const tenantEmpresaId = req.user?.tenantId || 1;
      const dadorCargaId = req.body.dadorCargaId || req.user?.dadorId || 1;
      
      // Obtener choferId: si el usuario es chofer, usar su propio ID; si no, usar el enviado
      let choferId: number | undefined;
      if (req.user?.role === 'CHOFER' && req.user?.choferId) {
        choferId = req.user.choferId;
      } else if (req.body.choferId) {
        choferId = parseInt(req.body.choferId as string);
      }
      
      // Preparar buffer final (PDF para almacenamiento)
      let finalPdfBuffer: Buffer;
      const originalInputs = inputs; // Guardar para análisis
      
      if (hasPdf) {
        // PDF único: almacenar tal cual
        finalPdfBuffer = inputs[0].buffer;
      } else {
        // Múltiples imágenes: componer en PDF
        const mediaInputs = inputs.map(i => ({
          buffer: i.buffer,
          mimeType: i.mimeType,
          fileName: i.fileName,
        }));
        finalPdfBuffer = await MediaService.composePdfFromImages(mediaInputs);
      }
      
      // Crear remito con el PDF y los inputs originales para análisis
      const result = await RemitoService.create(
        {
          tenantEmpresaId,
          dadorCargaId: parseInt(dadorCargaId as string),
          cargadoPorUserId: req.user!.userId,
          cargadoPorRol: req.user!.role,
          choferId, // Nuevo campo
        },
        {
          pdfBuffer: finalPdfBuffer,
          originalInputs,
          fileName: `remito_${Date.now()}.pdf`,
        }
      );
      
      res.status(201).json({
        success: true,
        message: 'Remito creado y encolado para análisis',
        data: {
          id: result.remito.id,
          estado: result.remito.estado,
          imagenesCount: result.imagenes.length,
        },
      });
      
    } catch (error: any) {
      AppLogger.error('Error creando remito:', error);
      const status = error.statusCode || 500;
      res.status(status).json({
        success: false,
        error: error.code || 'CREATE_ERROR',
        message: error.message,
      });
    }
  }
  
  /**
   * GET /remitos - Listar remitos (optimizado: incluye stats)
   */
  static async list(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { estado, fechaDesde, fechaHasta, numeroRemito, page, limit } = req.query;
      
      const result = await RemitoService.list({
        tenantEmpresaId: req.user?.tenantId,
        dadorCargaId: req.user?.dadorId,
        estado: estado as string,
        numeroRemito: numeroRemito as string,
        fechaDesde: fechaDesde ? new Date(fechaDesde as string) : undefined,
        fechaHasta: fechaHasta ? new Date(fechaHasta as string) : undefined,
        userId: req.user?.userId,
        userRole: req.user?.role,
        page: page ? parseInt(page as string) : 1,
        limit: limit ? parseInt(limit as string) : 20,
      });
      
      res.json({
        success: true,
        data: result.items,
        pagination: result.pagination,
        stats: result.stats, // Incluido en la misma respuesta
      });
      
    } catch (error: any) {
      AppLogger.error('Error listando remitos:', error);
      res.status(500).json({
        success: false,
        error: 'LIST_ERROR',
        message: error.message,
      });
    }
  }
  
  /**
   * GET /remitos/:id - Obtener remito por ID
   */
  static async getById(req: AuthRequest, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id);
      
      const remito = await RemitoService.getById(id, req.user?.userId, req.user?.role);
      
      if (!remito) {
        throw createError('Remito no encontrado', 404, 'NOT_FOUND');
      }
      
      // Generar URLs firmadas para las imágenes
      const imagenesConUrls = await Promise.all(
        remito.imagenes.map(async (img) => ({
          ...img,
          url: await minioService.getSignedUrl(img.bucketName, img.objectKey),
        }))
      );
      
      res.json({
        success: true,
        data: {
          ...remito,
          imagenes: imagenesConUrls,
        },
      });
      
    } catch (error: any) {
      AppLogger.error('Error obteniendo remito:', error);
      const status = error.statusCode || 500;
      res.status(status).json({
        success: false,
        error: error.code || 'GET_ERROR',
        message: error.message,
      });
    }
  }
  
  /**
   * POST /remitos/:id/approve - Aprobar remito
   */
  static async approve(req: AuthRequest, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id);
      
      const remito = await RemitoService.approve(id, req.user!.userId);
      
      res.json({
        success: true,
        message: 'Remito aprobado',
        data: remito,
      });
      
    } catch (error: any) {
      AppLogger.error('Error aprobando remito:', error);
      res.status(500).json({
        success: false,
        error: 'APPROVE_ERROR',
        message: error.message,
      });
    }
  }
  
  /**
   * POST /remitos/:id/reject - Rechazar remito
   */
  static async reject(req: AuthRequest, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id);
      const { motivo } = req.body;
      
      if (!motivo || motivo.trim().length < 5) {
        throw createError('Motivo de rechazo requerido (mín 5 caracteres)', 400, 'VALIDATION_ERROR');
      }
      
      const remito = await RemitoService.reject(id, req.user!.userId, motivo.trim());
      
      res.json({
        success: true,
        message: 'Remito rechazado',
        data: remito,
      });
      
    } catch (error: any) {
      AppLogger.error('Error rechazando remito:', error);
      const status = error.statusCode || 500;
      res.status(status).json({
        success: false,
        error: error.code || 'REJECT_ERROR',
        message: error.message,
      });
    }
  }
  
  /**
   * GET /remitos/stats - Estadísticas
   */
  static async stats(req: AuthRequest, res: Response): Promise<void> {
    try {
      const tenantId = req.user?.tenantId || 1;
      const dadorId = req.user?.dadorId;
      
      const stats = await RemitoService.getStats(tenantId, dadorId);
      
      res.json({
        success: true,
        data: stats,
      });
      
    } catch (error: any) {
      AppLogger.error('Error obteniendo stats:', error);
      res.status(500).json({
        success: false,
        error: 'STATS_ERROR',
        message: error.message,
      });
    }
  }
  
  /**
   * GET /remitos/:id/image/:imagenId - Obtener URL de imagen
   */
  static async getImage(req: AuthRequest, res: Response): Promise<void> {
    try {
      const remitoId = parseInt(req.params.id);
      
      const remito = await RemitoService.getById(remitoId, req.user?.userId, req.user?.role);
      
      if (!remito) {
        throw createError('Remito no encontrado', 404, 'NOT_FOUND');
      }
      
      const imagenId = parseInt(req.params.imagenId);
      const imagen = remito.imagenes.find(i => i.id === imagenId);
      
      if (!imagen) {
        throw createError('Imagen no encontrada', 404, 'IMAGE_NOT_FOUND');
      }
      
      const url = await minioService.getSignedUrl(imagen.bucketName, imagen.objectKey, 3600);
      
      res.json({
        success: true,
        data: { url },
      });
      
    } catch (error: any) {
      AppLogger.error('Error obteniendo imagen:', error);
      const status = error.statusCode || 500;
      res.status(status).json({
        success: false,
        error: error.code || 'IMAGE_ERROR',
        message: error.message,
      });
    }
  }
  
  /**
   * POST /remitos/:id/reprocess - Reprocesar remito con IA
   */
  static async reprocess(req: AuthRequest, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id);
      
      const result = await RemitoService.reprocess(id, req.user!.userId);
      
      res.json({
        success: true,
        message: 'Remito encolado para reprocesamiento',
        data: result,
      });
      
    } catch (error: any) {
      AppLogger.error('Error reprocesando remito:', error);
      const status = error.statusCode || 500;
      res.status(status).json({
        success: false,
        error: error.code || 'REPROCESS_ERROR',
        message: error.message,
      });
    }
  }
}
