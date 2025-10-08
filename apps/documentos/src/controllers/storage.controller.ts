import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware';
import { minioService } from '../services/minio.service';
import { AppLogger } from '../config/logger';
import { createError } from '../middlewares/error.middleware';

export class StorageController {
  /**
   * POST /api/docs/storage/init - Inicializar bucket para el tenant actual
   */
  static async initTenantBucket(req: AuthRequest, res: Response): Promise<void> {
    try {
      const tenantId = req.tenantId;
      if (!tenantId) {
        throw createError('Tenant no resuelto', 400, 'TENANT_REQUIRED');
      }

      await minioService.ensureBucketExists(tenantId);
      AppLogger.info('✅ Bucket inicializado para tenant', { tenantId });

      res.json({ success: true, message: 'Storage inicializado', tenantId });
    } catch (error) {
      AppLogger.error('💥 Error inicializando storage:', error);
      if (error instanceof Error && 'code' in error) {
        throw error;
      }
      throw createError('Error al inicializar storage', 500, 'STORAGE_INIT_ERROR');
    }
  }
}


