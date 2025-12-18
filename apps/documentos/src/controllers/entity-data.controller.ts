import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware';
import { prisma } from '../config/database';
import { AppLogger } from '../config/logger';
import type { EntityType } from '../../node_modules/.prisma/documentos';

/**
 * Controller para datos extraídos de entidades
 * Solo visible para SUPERADMIN y ADMIN_INTERNO
 */
export class EntityDataController {
  /**
   * Obtener datos extraídos de una entidad
   * GET /api/docs/entities/:entityType/:entityId/extracted-data
   */
  static async getExtractedData(req: AuthRequest, res: Response): Promise<void> {
    try {
      const tenantEmpresaId = req.tenantId as number;
      const entityType = req.params.entityType as EntityType;
      const entityId = parseInt(req.params.entityId, 10);

      if (!entityType || isNaN(entityId)) {
        res.status(400).json({
          success: false,
          message: 'Parámetros inválidos',
          code: 'INVALID_PARAMS',
        });
        return;
      }

      const data = await prisma.entityExtractedData.findUnique({
        where: {
          tenantEmpresaId_entityType_entityId: {
            tenantEmpresaId,
            entityType,
            entityId,
          },
        },
      });

      if (!data) {
        res.status(404).json({
          success: false,
          message: 'No hay datos extraídos para esta entidad',
          code: 'NOT_FOUND',
        });
        return;
      }

      res.json({
        success: true,
        data,
      });
    } catch (error) {
      AppLogger.error('EntityDataController.getExtractedData error:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        code: 'INTERNAL_ERROR',
      });
    }
  }

  /**
   * Obtener historial de extracciones de una entidad
   * GET /api/docs/entities/:entityType/:entityId/extraction-history
   */
  static async getExtractionHistory(req: AuthRequest, res: Response): Promise<void> {
    try {
      const tenantEmpresaId = req.tenantId as number;
      const entityType = req.params.entityType as EntityType;
      const entityId = parseInt(req.params.entityId, 10);
      const page = parseInt(req.query.page as string, 10) || 1;
      const limit = Math.min(parseInt(req.query.limit as string, 10) || 20, 100);

      if (!entityType || isNaN(entityId)) {
        res.status(400).json({
          success: false,
          message: 'Parámetros inválidos',
          code: 'INVALID_PARAMS',
        });
        return;
      }

      const skip = (page - 1) * limit;

      const [logs, total] = await Promise.all([
        prisma.entityExtractionLog.findMany({
          where: {
            tenantEmpresaId,
            entityType,
            entityId,
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
        }),
        prisma.entityExtractionLog.count({
          where: {
            tenantEmpresaId,
            entityType,
            entityId,
          },
        }),
      ]);

      res.json({
        success: true,
        data: logs,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      AppLogger.error('EntityDataController.getExtractionHistory error:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        code: 'INTERNAL_ERROR',
      });
    }
  }

  /**
   * Listar todas las entidades con datos extraídos
   * GET /api/docs/entities/extracted-data
   */
  static async listExtractedData(req: AuthRequest, res: Response): Promise<void> {
    try {
      const tenantEmpresaId = req.tenantId as number;
      const entityType = req.query.entityType as EntityType | undefined;
      const page = parseInt(req.query.page as string, 10) || 1;
      const limit = Math.min(parseInt(req.query.limit as string, 10) || 20, 100);

      const skip = (page - 1) * limit;

      const where: { tenantEmpresaId: number; entityType?: EntityType } = { tenantEmpresaId };
      if (entityType) {
        where.entityType = entityType;
      }

      const [data, total] = await Promise.all([
        prisma.entityExtractedData.findMany({
          where,
          orderBy: { ultimaExtraccionAt: 'desc' },
          skip,
          take: limit,
          select: {
            id: true,
            entityType: true,
            entityId: true,
            ultimaExtraccionAt: true,
            ultimoDocumentoTipo: true,
            confianzaPromedio: true,
            // Campos consolidados según tipo
            cuil: true,
            numeroLicencia: true,
            clasesLicencia: true,
            anioFabricacion: true,
            numeroMotor: true,
            numeroChasis: true,
            titular: true,
            condicionIva: true,
            cantidadEmpleados: true,
            artNombre: true,
          },
        }),
        prisma.entityExtractedData.count({ where }),
      ]);

      res.json({
        success: true,
        data,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      AppLogger.error('EntityDataController.listExtractedData error:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        code: 'INTERNAL_ERROR',
      });
    }
  }
}

