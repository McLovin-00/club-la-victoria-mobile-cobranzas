import { Response } from 'express';
import { AuthRequest } from '../types';
import { RemitoService } from '../services/remito.service';
import { minioService } from '../services/minio.service';
import { createError } from '../middlewares/error.middleware';
import { AppLogger } from '../config/logger';

export class RemitosController {
  
  /**
   * POST /remitos - Crear nuevo remito
   */
  static async create(req: AuthRequest, res: Response): Promise<void> {
    try {
      const file = (req as any).file;
      
      if (!file) {
        throw createError('Imagen del remito requerida', 400, 'FILE_REQUIRED');
      }
      
      // Validar tipo de archivo
      if (!file.mimetype.startsWith('image/')) {
        throw createError('Solo se permiten imágenes (JPG, PNG)', 400, 'INVALID_FILE_TYPE');
      }
      
      // Obtener tenant y dador
      const tenantEmpresaId = req.user?.tenantId || 1;
      const dadorCargaId = req.body.dadorCargaId || req.user?.dadorId || 1;
      
      const result = await RemitoService.create(
        {
          tenantEmpresaId,
          dadorCargaId: parseInt(dadorCargaId),
          cargadoPorUserId: req.user!.id,
          cargadoPorRol: req.user!.role,
        },
        {
          buffer: file.buffer,
          originalname: file.originalname,
          mimetype: file.mimetype,
          size: file.size,
        }
      );
      
      res.status(201).json({
        success: true,
        message: 'Remito creado y encolado para análisis',
        data: {
          id: result.remito.id,
          estado: result.remito.estado,
          imagenId: result.imagen.id,
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
   * GET /remitos - Listar remitos
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
        userId: req.user?.id,
        userRole: req.user?.role,
        page: page ? parseInt(page as string) : 1,
        limit: limit ? parseInt(limit as string) : 20,
      });
      
      res.json({
        success: true,
        data: result.items,
        pagination: result.pagination,
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
      
      const remito = await RemitoService.getById(id, req.user?.id, req.user?.role);
      
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
      
      const remito = await RemitoService.approve(id, req.user!.id);
      
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
      
      const remito = await RemitoService.reject(id, req.user!.id, motivo.trim());
      
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
      
      const remito = await RemitoService.getById(remitoId, req.user?.id, req.user?.role);
      
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
}

