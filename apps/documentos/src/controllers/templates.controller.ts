import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware';
import { AuditService } from '../services/audit.service';
import { db } from '../config/database';
import { AppLogger } from '../config/logger';
import { createError } from '../middlewares/error.middleware';

/**
 * Controlador de Templates - Simplicidad Absoluta
 */
export class TemplatesController {
  
  /**
   * GET /api/docs/templates/:id - Obtener una plantilla por id
   */
  static async getTemplateById(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params as any;

      const template = await db.getClient().documentTemplate.findUnique({
        where: { id: parseInt(id) },
        select: {
          id: true,
          name: true,
          entityType: true,
          active: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      if (!template) {
        throw createError('Plantilla no encontrada', 404, 'TEMPLATE_NOT_FOUND');
      }

      // Adaptar propiedades al contrato del frontend si fuese necesario
      const result = {
        id: template.id,
        nombre: template.name,
        descripcion: undefined,
        entityType: template.entityType,
        isActive: template.active,
        createdAt: template.createdAt,
        updatedAt: template.updatedAt,
      };

      AppLogger.debug('📄 Template consultado por id', { templateId: template.id, userId: req.user?.userId });

      res.json({ success: true, data: result });
    } catch (error) {
      AppLogger.error('💥 Error al obtener template por id:', error);
      if (error instanceof Error && 'code' in error) {
        throw error;
      }
      throw createError('Error al obtener plantilla', 500, 'GET_TEMPLATE_ERROR');
    }
  }

  /**
   * GET /api/docs/templates - Listar plantillas
   */
  static async getTemplates(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { entityType, active } = req.query as any;

      const rawTemplates = await db.getClient().documentTemplate.findMany({
        where: {
          ...(entityType && { entityType }),
          ...(active !== undefined && { active }),
        },
        orderBy: [
          { entityType: 'asc' },
          { name: 'asc' },
        ],
        select: {
          id: true,
          name: true,
          entityType: true,
          active: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      // Adaptar propiedades al contrato del frontend
      const templates = rawTemplates.map((t) => ({
        id: t.id,
        nombre: t.name,
        descripcion: undefined,
        entityType: t.entityType,
        isActive: t.active,
        createdAt: t.createdAt,
        updatedAt: t.updatedAt,
      }));

      AppLogger.debug(`📄 Templates consultados: ${templates.length}`, {
        entityType,
        active,
        userId: req.user?.userId,
      });

      res.json(templates);
    } catch (error) {
      AppLogger.error('💥 Error al obtener templates:', error);
      throw createError('Error al obtener plantillas', 500, 'GET_TEMPLATES_ERROR');
    }
  }

  /**
   * POST /api/docs/templates - Crear plantilla (Solo Superadmin)
   */
  static async createTemplate(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { name, entityType } = req.body;

      // Verificar si ya existe una plantilla con ese nombre y tipo
      const existingTemplate = await db.getClient().documentTemplate.findFirst({
        where: {
          name: name.trim(),
          entityType,
        },
      });

      if (existingTemplate) {
        throw createError(
          'Ya existe una plantilla con ese nombre para esta entidad',
          409,
          'TEMPLATE_ALREADY_EXISTS'
        );
      }

      const template = await db.getClient().documentTemplate.create({
        data: {
          name: name.trim(),
          entityType,
          active: true,
        },
        select: {
          id: true,
          name: true,
          entityType: true,
          active: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      AppLogger.info(`✅ Template creado: ${template.name}`, {
        templateId: template.id,
        entityType: template.entityType,
        userId: req.user?.userId,
      });

      res.status(201).json({
        success: true,
        data: template,
        message: 'Plantilla creada exitosamente',
      });
      // Audit
      void AuditService.log({
        tenantEmpresaId: req.tenantId,
        userId: req.user?.userId,
        userRole: req.user?.role,
        method: req.method,
        path: req.originalUrl || req.path,
        statusCode: 201,
        action: 'TEMPLATE_CREATE',
        entityType: 'TEMPLATE',
        entityId: template.id,
        details: { name: template.name, entityType: template.entityType },
      });
    } catch (error) {
      AppLogger.error('💥 Error al crear template:', error);
      if (error instanceof Error && 'code' in error) {
        throw error;
      }
      throw createError('Error al crear plantilla', 500, 'CREATE_TEMPLATE_ERROR');
    }
  }

  /**
   * PUT /api/docs/templates/:id - Actualizar plantilla (Solo Superadmin)
   */
  static async updateTemplate(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { name, active, isActive } = req.body;
      // Normalizar isActive a active para compatibilidad con frontend
      const activeValue = active !== undefined ? active : isActive;

      // Verificar que la plantilla existe
      const existingTemplate = await db.getClient().documentTemplate.findUnique({
        where: { id: parseInt(id) },
      });

      if (!existingTemplate) {
        throw createError('Plantilla no encontrada', 404, 'TEMPLATE_NOT_FOUND');
      }

      // Verificar conflicto de nombre si se está cambiando
      if (name && name.trim() !== existingTemplate.name) {
        const conflictTemplate = await db.getClient().documentTemplate.findFirst({
          where: {
            name: name.trim(),
            entityType: existingTemplate.entityType,
            id: { not: parseInt(id) },
          },
        });

        if (conflictTemplate) {
          throw createError(
            'Ya existe otra plantilla con ese nombre para esta entidad',
            409,
            'TEMPLATE_NAME_CONFLICT'
          );
        }
      }

      const updatedTemplate = await db.getClient().documentTemplate.update({
        where: { id: parseInt(id) },
        data: {
          ...(name && { name: name.trim() }),
          ...(activeValue !== undefined && { active: activeValue }),
        },
        select: {
          id: true,
          name: true,
          entityType: true,
          active: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      AppLogger.info(`🔄 Template actualizado: ${updatedTemplate.name}`, {
        templateId: updatedTemplate.id,
        changes: { name, active: activeValue },
        userId: req.user?.userId,
      });

      res.json({
        success: true,
        data: updatedTemplate,
        message: 'Plantilla actualizada exitosamente',
      });
      // Audit
      void AuditService.log({
        tenantEmpresaId: req.tenantId,
        userId: req.user?.userId,
        userRole: req.user?.role,
        method: req.method,
        path: req.originalUrl || req.path,
        statusCode: 200,
        action: 'TEMPLATE_UPDATE',
        entityType: 'TEMPLATE',
        entityId: updatedTemplate.id,
        details: { name, active: activeValue },
      });
    } catch (error) {
      AppLogger.error('💥 Error al actualizar template:', error);
      if (error instanceof Error && 'code' in error) {
        throw error;
      }
      throw createError('Error al actualizar plantilla', 500, 'UPDATE_TEMPLATE_ERROR');
    }
  }

  /**
   * DELETE /api/docs/templates/:id - Eliminar plantilla (Solo Superadmin)
   */
  static async deleteTemplate(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      // Verificar que la plantilla existe
      const existingTemplate = await db.getClient().documentTemplate.findUnique({
        where: { id: parseInt(id) },
        include: {
          documents: { take: 1 }, // Solo verificar si hay documentos
          clientRequirements: { take: 1 }, // Solo verificar si hay requerimientos por cliente
        },
      });

      if (!existingTemplate) {
        throw createError('Plantilla no encontrada', 404, 'TEMPLATE_NOT_FOUND');
      }

      // Verificar si la plantilla está en uso
      if (existingTemplate.documents.length > 0 || existingTemplate.clientRequirements.length > 0) {
        throw createError(
          'No se puede eliminar una plantilla que está en uso',
          409,
          'TEMPLATE_IN_USE'
        );
      }

      await db.getClient().documentTemplate.delete({
        where: { id: parseInt(id) },
      });

      AppLogger.info(`🗑️ Template eliminado: ${existingTemplate.name}`, {
        templateId: existingTemplate.id,
        entityType: existingTemplate.entityType,
        userId: req.user?.userId,
      });

      res.json({
        success: true,
        message: 'Plantilla eliminada exitosamente',
      });
      // Audit
      void AuditService.log({
        tenantEmpresaId: req.tenantId,
        userId: req.user?.userId,
        userRole: req.user?.role,
        method: req.method,
        path: req.originalUrl || req.path,
        statusCode: 200,
        action: 'TEMPLATE_DELETE',
        entityType: 'TEMPLATE',
        entityId: existingTemplate.id,
        details: { name: existingTemplate.name, entityType: existingTemplate.entityType },
      });
    } catch (error) {
      AppLogger.error('💥 Error al eliminar template:', error);
      if (error instanceof Error && 'code' in error) {
        throw error;
      }
      throw createError('Error al eliminar plantilla', 500, 'DELETE_TEMPLATE_ERROR');
    }
  }
}