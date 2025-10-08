import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware';
import { prisma } from '../config/database';
import { AppLogger } from '../config/logger';
import { createError } from '../middlewares/error.middleware';

/**
 * Controlador de Configuración - Elegancia Empresarial
 */
export class ConfigController {
  
  /**
   * GET /api/docs/config/:dadorId - Obtener configuración de dador
   */
  static async getEmpresaConfig(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { dadorId: empresaId } = req.params as any;

      const _config = null; // empresaDocumentConfig deprecado

      // Si no existe configuración, devolver configuración por defecto
      const defaultConfig = {
        empresaId: parseInt(empresaId),
        enabled: false,
        templateIds: [],
        alertEmail: null,
        alertPhone: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const responseConfig = defaultConfig;

      // Obtener plantillas disponibles para contexto
      const availableTemplates = await prisma.documentTemplate.findMany({
        where: { active: true },
        select: {
          id: true,
          name: true,
          entityType: true,
        },
        orderBy: [
          { entityType: 'asc' },
          { name: 'asc' },
        ],
      });

      AppLogger.debug(`📄 Configuración consultada para dador ${empresaId}`, {
        enabled: responseConfig.enabled,
        templatesCount: responseConfig.templateIds.length,
        userId: req.user?.userId,
      });

      res.json({
        success: true,
        data: {
          config: responseConfig,
          availableTemplates,
        },
      });
    } catch (error) {
      AppLogger.error('💥 Error al obtener configuración de empresa:', error);
      throw createError('Error al obtener configuración', 500, 'GET_CONFIG_ERROR');
    }
  }

  /**
   * POST /api/docs/config/:dadorId - Actualizar configuración de dador
   */
  static async updateEmpresaConfig(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { dadorId: empresaId } = req.params as any;
      const { enabled, templateIds, alertEmail, alertPhone } = req.body;

      // Validar que los templateIds existen y están activos
      if (templateIds && templateIds.length > 0) {
        const validTemplates = await prisma.documentTemplate.findMany({
          where: {
            id: { in: templateIds },
            active: true,
          },
          select: { id: true },
        });

        const validTemplateIds = validTemplates.map(t => t.id);
        const invalidIds = templateIds.filter((id: number) => !validTemplateIds.includes(id));

        if (invalidIds.length > 0) {
          throw createError(
            `Plantillas inválidas o inactivas: ${invalidIds.join(', ')}`,
            400,
            'INVALID_TEMPLATE_IDS'
          );
        }
      }

      // Upsert de la configuración
      const config = {
        empresaId: parseInt(empresaId),
        enabled: !!enabled,
        templateIds: templateIds || [],
        alertEmail: alertEmail || null,
        alertPhone: alertPhone || null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      AppLogger.info(`✅ Configuración actualizada para dador ${empresaId}`, {
        enabled: config.enabled,
        templateIds: config.templateIds,
        hasAlertEmail: !!config.alertEmail,
        hasAlertPhone: !!config.alertPhone,
        userId: req.user?.userId,
      });

      res.json({
        success: true,
        data: config,
        message: 'Configuración actualizada exitosamente',
      });
    } catch (error) {
      AppLogger.error('💥 Error al actualizar configuración de empresa:', error);
      if (error instanceof Error && 'code' in error) {
        throw error;
      }
      throw createError('Error al actualizar configuración', 500, 'UPDATE_CONFIG_ERROR');
    }
  }

  /**
   * GET /api/docs/config/:dadorId/status - Estado del servicio para dador
   */
  static async getEmpresaStatus(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { dadorId: empresaId } = req.params as any;

      const config = { enabled: false, templateIds: [] as number[] };

      const isEnabled = config?.enabled || false;
      const hasTemplates = (config?.templateIds?.length || 0) > 0;

      // Obtener estadísticas básicas si está habilitado
      let stats = null;
      if (isEnabled) {
        const documentsCount = await prisma.document.count({
          where: { dadorCargaId: parseInt(empresaId) },
        });

        const pendingCount = await prisma.document.count({
          where: { dadorCargaId: parseInt(empresaId), status: 'PENDIENTE' },
        });

        stats = {
          totalDocuments: documentsCount,
          pendingDocuments: pendingCount,
        };
      }

      AppLogger.debug(`📊 Estado consultado para dador ${empresaId}`, {
        enabled: isEnabled,
        hasTemplates,
        userId: req.user?.userId,
      });

      res.json({
        success: true,
        data: {
          empresaId: parseInt(empresaId),
          enabled: isEnabled,
          hasTemplates,
          stats,
        },
      });
    } catch (error) {
      AppLogger.error('💥 Error al obtener estado de empresa:', error);
      throw createError('Error al obtener estado', 500, 'GET_STATUS_ERROR');
    }
  }
}