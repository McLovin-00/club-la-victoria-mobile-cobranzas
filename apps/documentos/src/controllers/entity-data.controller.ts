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
   * Obtener datos extraídos de una entidad (desde document_classifications)
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

      // Buscar en document_classifications de los documentos de esta entidad
      const documents = await prisma.document.findMany({
        where: {
          tenantEmpresaId,
          entityType,
          entityId,
        },
        include: {
          classification: true,
          template: { select: { name: true } },
        },
        orderBy: { uploadedAt: 'desc' },
      });

      // Consolidar datos extraídos de todas las clasificaciones
      const extractedData: Record<string, any> = {};
      const disparidades: any[] = [];
      let lastValidation: Date | null = null;

      for (const doc of documents) {
        const classification = doc.classification as any;
        if (!classification) continue;

        // Agregar disparidades
        if (classification.disparidades && Array.isArray(classification.disparidades)) {
          for (const d of classification.disparidades) {
            disparidades.push({
              ...d,
              documentId: doc.id,
              templateName: doc.template?.name,
            });
          }
        }

        // Agregar datos de aiResponse
        if (classification.aiResponse && typeof classification.aiResponse === 'object') {
          const aiResp = classification.aiResponse as any;
          if (aiResp.datosExtraidos) {
            Object.assign(extractedData, aiResp.datosExtraidos);
          }
          if (aiResp.datosNuevos) {
            Object.assign(extractedData, aiResp.datosNuevos);
          }
        }

        // Última validación
        if (classification.validationStatus === 'validated' && classification.updatedAt) {
          const updatedAt = new Date(classification.updatedAt);
          if (!lastValidation || updatedAt > lastValidation) {
            lastValidation = updatedAt;
          }
        }
      }

      if (Object.keys(extractedData).length === 0 && disparidades.length === 0) {
        res.status(404).json({
          success: false,
          message: 'No hay datos extraídos para esta entidad',
          code: 'NOT_FOUND',
        });
        return;
      }

      res.json({
        success: true,
        data: {
          entityType,
          entityId,
          extractedData,
          disparidades,
          lastValidation,
          documentsCount: documents.length,
        },
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
   * Borrar datos extraídos de una entidad
   * DELETE /api/docs/entities/:entityType/:entityId/extracted-data
   */
  static async deleteExtractedData(req: AuthRequest, res: Response): Promise<void> {
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

      // Limpiar datos de IA de las clasificaciones de documentos de esta entidad
      const documents = await prisma.document.findMany({
        where: { tenantEmpresaId, entityType, entityId },
        select: { id: true },
      });

      const docIds = documents.map(d => d.id);

      if (docIds.length > 0) {
        await prisma.documentClassification.updateMany({
          where: { documentId: { in: docIds } },
          data: {
            disparidades: null,
            validationStatus: null,
          },
        });
      }

      AppLogger.info(`🗑️ Datos IA borrados para ${entityType} ${entityId}`, { 
        tenantEmpresaId, 
        documentsAffected: docIds.length 
      });

      res.json({
        success: true,
        message: 'Datos extraídos eliminados correctamente',
        documentsAffected: docIds.length,
      });
    } catch (error) {
      AppLogger.error('EntityDataController.deleteExtractedData error:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        code: 'INTERNAL_ERROR',
      });
    }
  }

  /**
   * Actualizar datos extraídos manualmente
   * PUT /api/docs/entities/:entityType/:entityId/extracted-data
   */
  static async updateExtractedData(req: AuthRequest, res: Response): Promise<void> {
    try {
      const tenantEmpresaId = req.tenantId as number;
      const entityType = req.params.entityType as EntityType;
      const entityId = parseInt(req.params.entityId, 10);
      const { data: newData } = req.body;

      if (!entityType || isNaN(entityId) || !newData) {
        res.status(400).json({
          success: false,
          message: 'Parámetros inválidos',
          code: 'INVALID_PARAMS',
        });
        return;
      }

      // Actualizar el último documento clasificado de esta entidad
      const lastDoc = await prisma.document.findFirst({
        where: { tenantEmpresaId, entityType, entityId },
        orderBy: { uploadedAt: 'desc' },
        include: { classification: true },
      });

      if (!lastDoc || !lastDoc.classification) {
        res.status(404).json({
          success: false,
          message: 'No hay documentos clasificados para esta entidad',
          code: 'NOT_FOUND',
        });
        return;
      }

      // Actualizar la clasificación con los nuevos datos
      const existingAiResponse = (lastDoc.classification as any).aiResponse || {};
      const updatedAiResponse = {
        ...existingAiResponse,
        datosExtraidos: {
          ...(existingAiResponse.datosExtraidos || {}),
          ...newData,
        },
        manuallyEdited: true,
        editedAt: new Date().toISOString(),
        editedBy: req.user?.id || req.user?.userId,
      };

      await prisma.documentClassification.update({
        where: { id: lastDoc.classification.id },
        data: {
          aiResponse: updatedAiResponse as any,
        },
      });

      AppLogger.info(`✏️ Datos IA actualizados manualmente para ${entityType} ${entityId}`, { 
        tenantEmpresaId,
        userId: req.user?.id || req.user?.userId,
      });

      res.json({
        success: true,
        message: 'Datos actualizados correctamente',
      });
    } catch (error) {
      AppLogger.error('EntityDataController.updateExtractedData error:', error);
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

