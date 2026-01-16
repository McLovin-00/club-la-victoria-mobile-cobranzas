import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware';
import { prisma } from '../config/database';
import { AppLogger } from '../config/logger';
import type { EntityType } from '../../node_modules/.prisma/documentos';
import { parseParamId, parseParamString } from '../utils/params';

// ============================================================================
// HELPERS
// ============================================================================
function validateParams(entityType: string, entityId: number): boolean {
  return !!entityType && !isNaN(entityId);
}

function sendError(res: Response, status: number, message: string, code: string): void {
  res.status(status).json({ success: false, message, code });
}

interface ExtractedDataResult {
  extractedData: Record<string, any>;
  extractedDataByDocument: Array<{ documentId: number; templateName: string | null; uploadedAt: Date; data: Record<string, any> }>;
  disparidades: any[];
  lastValidation: Date | null;
}

/** Extrae disparidades de una clasificación */
function extractDisparidades(classification: any, docId: number, templateName: string | null): any[] {
  if (!Array.isArray(classification?.disparidades)) return [];
  return classification.disparidades.map((d: any) => ({ ...d, documentId: docId, templateName }));
}

/** Extrae datos de la respuesta AI */
function extractAiData(classification: any): Record<string, any> {
  const aiResp = classification?.aiResponse;
  if (!aiResp || typeof aiResp !== 'object') return {};
  return { ...aiResp.datosExtraidos, ...aiResp.datosNuevos };
}

/** Actualiza la fecha de última validación si corresponde */
function updateLastValidation(classification: any, current: Date | null): Date | null {
  if (classification?.validationStatus !== 'validated' || !classification.updatedAt) return current;
  const updatedAt = new Date(classification.updatedAt);
  return (!current || updatedAt > current) ? updatedAt : current;
}

function processClassifications(documents: any[]): ExtractedDataResult {
  const extractedData: Record<string, any> = {};
  const extractedDataByDocument: ExtractedDataResult['extractedDataByDocument'] = [];
  const disparidades: any[] = [];
  let lastValidation: Date | null = null;

  for (const doc of documents) {
    const classification = doc.classification;
    if (!classification) continue;

    // Disparidades
    disparidades.push(...extractDisparidades(classification, doc.id, doc.template?.name));

    // Datos extraídos
    const docData = extractAiData(classification);
    Object.assign(extractedData, docData);
    if (Object.keys(docData).length > 0) {
      extractedDataByDocument.push({
        documentId: doc.id,
        templateName: doc.template?.name || null,
        uploadedAt: doc.uploadedAt,
        data: docData,
      });
    }

    // Última validación
    lastValidation = updateLastValidation(classification, lastValidation);
  }

  return { extractedData, extractedDataByDocument, disparidades, lastValidation };
}

// ============================================================================
// CONTROLLER
// ============================================================================
export class EntityDataController {
  /**
   * GET /api/docs/entities/:entityType/:entityId/extracted-data
   */
  static async getExtractedData(req: AuthRequest, res: Response): Promise<void> {
    try {
      const tenantEmpresaId = req.tenantId as number;
      const entityType = parseParamString(req.params, 'entityType') as EntityType;
      const entityId = parseParamId(req.params, 'entityId');

      if (!validateParams(entityType, entityId)) {
        return sendError(res, 400, 'Parámetros inválidos', 'INVALID_PARAMS');
      }

      const documents = await prisma.document.findMany({
        where: { tenantEmpresaId, entityType, entityId },
        include: { classification: true, template: { select: { name: true } } },
        orderBy: { uploadedAt: 'desc' },
      });

      const { extractedData, extractedDataByDocument, disparidades, lastValidation } = processClassifications(documents);

      if (Object.keys(extractedData).length === 0 && disparidades.length === 0) {
        return sendError(res, 404, 'No hay datos extraídos para esta entidad', 'NOT_FOUND');
      }

      res.json({
        success: true,
        data: { entityType, entityId, extractedData, extractedDataByDocument, disparidades, lastValidation, documentsCount: documents.length },
      });
    } catch (error) {
      AppLogger.error('EntityDataController.getExtractedData error:', error);
      sendError(res, 500, 'Error interno del servidor', 'INTERNAL_ERROR');
    }
  }

  /**
   * DELETE /api/docs/entities/:entityType/:entityId/extracted-data
   */
  static async deleteExtractedData(req: AuthRequest, res: Response): Promise<void> {
    try {
      const tenantEmpresaId = req.tenantId as number;
      const entityType = parseParamString(req.params, 'entityType') as EntityType;
      const entityId = parseParamId(req.params, 'entityId');

      if (!validateParams(entityType, entityId)) {
        return sendError(res, 400, 'Parámetros inválidos', 'INVALID_PARAMS');
      }

      const documents = await prisma.document.findMany({
        where: { tenantEmpresaId, entityType, entityId },
        select: { id: true },
      });

      const docIds = documents.map(d => d.id);

      if (docIds.length > 0) {
        await prisma.documentClassification.updateMany({
          where: { documentId: { in: docIds } },
          data: { disparidades: undefined, validationStatus: undefined },
        });
      }

      AppLogger.info(`🗑️ Datos IA borrados para ${entityType} ${entityId}`, { tenantEmpresaId, documentsAffected: docIds.length });
      res.json({ success: true, message: 'Datos extraídos eliminados correctamente', documentsAffected: docIds.length });
    } catch (error) {
      AppLogger.error('EntityDataController.deleteExtractedData error:', error);
      sendError(res, 500, 'Error interno del servidor', 'INTERNAL_ERROR');
    }
  }

  /**
   * PUT /api/docs/entities/:entityType/:entityId/extracted-data
   */
  static async updateExtractedData(req: AuthRequest, res: Response): Promise<void> {
    try {
      const tenantEmpresaId = req.tenantId as number;
      const entityType = parseParamString(req.params, 'entityType') as EntityType;
      const entityId = parseParamId(req.params, 'entityId');
      const { data: newData } = req.body;

      if (!validateParams(entityType, entityId) || !newData) {
        return sendError(res, 400, 'Parámetros inválidos', 'INVALID_PARAMS');
      }

      const lastDoc = await prisma.document.findFirst({
        where: { tenantEmpresaId, entityType, entityId },
        orderBy: { uploadedAt: 'desc' },
        include: { classification: true },
      });

      if (!lastDoc || !lastDoc.classification) {
        return sendError(res, 404, 'No hay documentos clasificados para esta entidad', 'NOT_FOUND');
      }

      const existingAiResponse: any = (lastDoc.classification as any).aiResponse || {}; // NOSONAR - cast needed for JSON type
      const updatedAiResponse = {
        ...existingAiResponse,
        datosExtraidos: { ...(existingAiResponse.datosExtraidos || {}), ...newData },
        manuallyEdited: true,
        editedAt: new Date().toISOString(),
        editedBy: req.user?.userId,
      };

      await prisma.documentClassification.update({
        where: { id: lastDoc.classification.id },
        data: { aiResponse: updatedAiResponse },
      });

      AppLogger.info(`✏️ Datos IA actualizados para ${entityType} ${entityId}`, { tenantEmpresaId, userId: req.user?.userId });
      res.json({ success: true, message: 'Datos actualizados correctamente' });
    } catch (error) {
      AppLogger.error('EntityDataController.updateExtractedData error:', error);
      sendError(res, 500, 'Error interno del servidor', 'INTERNAL_ERROR');
    }
  }

  /**
   * GET /api/docs/entities/:entityType/:entityId/extraction-history
   */
  static async getExtractionHistory(req: AuthRequest, res: Response): Promise<void> {
    try {
      const tenantEmpresaId = req.tenantId as number;
      const entityType = parseParamString(req.params, 'entityType') as EntityType;
      const entityId = parseParamId(req.params, 'entityId');
      const page = parseInt(req.query.page as string, 10) || 1;
      const limit = Math.min(parseInt(req.query.limit as string, 10) || 20, 100);

      if (!validateParams(entityType, entityId)) {
        return sendError(res, 400, 'Parámetros inválidos', 'INVALID_PARAMS');
      }

      const skip = (page - 1) * limit;
      const where = { tenantEmpresaId, entityType, entityId };

      const [logs, total] = await Promise.all([
        prisma.entityExtractionLog.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take: limit }),
        prisma.entityExtractionLog.count({ where }),
      ]);

      res.json({ success: true, data: logs, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
    } catch (error) {
      AppLogger.error('EntityDataController.getExtractionHistory error:', error);
      sendError(res, 500, 'Error interno del servidor', 'INTERNAL_ERROR');
    }
  }

  /**
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
      if (entityType) where.entityType = entityType;

      const [data, total] = await Promise.all([
        prisma.entityExtractedData.findMany({
          where,
          orderBy: { ultimaExtraccionAt: 'desc' },
          skip,
          take: limit,
          select: {
            id: true, entityType: true, entityId: true, ultimaExtraccionAt: true, ultimoDocumentoTipo: true, confianzaPromedio: true,
            cuil: true, numeroLicencia: true, clasesLicencia: true, anioFabricacion: true, numeroMotor: true, numeroChasis: true,
            titular: true, condicionIva: true, cantidadEmpleados: true, artNombre: true,
          },
        }),
        prisma.entityExtractedData.count({ where }),
      ]);

      res.json({ success: true, data, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
    } catch (error) {
      AppLogger.error('EntityDataController.listExtractedData error:', error);
      sendError(res, 500, 'Error interno del servidor', 'INTERNAL_ERROR');
    }
  }
}
