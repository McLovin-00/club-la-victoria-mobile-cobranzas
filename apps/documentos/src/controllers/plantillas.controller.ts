import { Response } from 'express';
import { PlantillasService } from '../services/plantillas.service';
import { AuthRequest } from '../middlewares/auth.middleware';

export class PlantillasController {
  // =============================================
  // CRUD de PlantillaRequisito
  // =============================================

  /**
   * GET /plantillas
   * Lista todas las plantillas del tenant (para selector en equipos)
   */
  static async listAll(req: AuthRequest, res: Response) {
    const activo = typeof req.query.activo !== 'undefined' ? req.query.activo === 'true' : undefined;
    const data = await PlantillasService.listAll(req.tenantId!, activo);
    res.json({ success: true, data });
  }

  /**
   * GET /clients/:clienteId/plantillas
   * Lista las plantillas de un cliente específico
   */
  static async listByCliente(req: AuthRequest, res: Response) {
    const clienteId = Number(req.params.clienteId);
    const activo = typeof req.query.activo !== 'undefined' ? req.query.activo === 'true' : undefined;
    const data = await PlantillasService.listByCliente(req.tenantId!, clienteId, activo);
    res.json({ success: true, data });
  }

  /**
   * GET /plantillas/:id
   * Obtiene una plantilla con sus templates y equipos asociados
   */
  static async getById(req: AuthRequest, res: Response) {
    const id = Number(req.params.id);
    const data = await PlantillasService.getById(req.tenantId!, id);
    if (!data) {
      res.status(404).json({ success: false, error: 'Plantilla no encontrada' });
      return;
    }
    res.json({ success: true, data });
  }

  /**
   * POST /clients/:clienteId/plantillas
   * Crea una nueva plantilla para un cliente
   */
  static async create(req: AuthRequest, res: Response) {
    const clienteId = Number(req.params.clienteId);
    const data = await PlantillasService.create({
      tenantEmpresaId: req.tenantId!,
      clienteId,
      nombre: req.body.nombre,
      descripcion: req.body.descripcion,
      activo: req.body.activo,
    });
    res.status(201).json({ success: true, data });
  }

  /**
   * PUT /plantillas/:id
   * Actualiza una plantilla
   */
  static async update(req: AuthRequest, res: Response) {
    const id = Number(req.params.id);
    const data = await PlantillasService.update(req.tenantId!, id, {
      nombre: req.body.nombre,
      descripcion: req.body.descripcion,
      activo: req.body.activo,
    });
    res.json({ success: true, data });
  }

  /**
   * DELETE /plantillas/:id
   * Elimina una plantilla
   */
  static async remove(req: AuthRequest, res: Response) {
    const id = Number(req.params.id);
    await PlantillasService.remove(req.tenantId!, id);
    res.json({ success: true });
  }

  /**
   * POST /plantillas/:id/duplicate
   * Duplica una plantilla con un nuevo nombre
   */
  static async duplicate(req: AuthRequest, res: Response) {
    const id = Number(req.params.id);
    const { nuevoNombre } = req.body;
    if (!nuevoNombre) {
      res.status(400).json({ success: false, error: 'nuevoNombre es requerido' });
      return;
    }
    const data = await PlantillasService.duplicate(req.tenantId!, id, nuevoNombre);
    res.status(201).json({ success: true, data });
  }

  // =============================================
  // Gestión de Templates en Plantilla
  // =============================================

  /**
   * GET /plantillas/:id/templates
   * Lista los templates de una plantilla
   */
  static async listTemplates(req: AuthRequest, res: Response) {
    const plantillaId = Number(req.params.id);
    const data = await PlantillasService.listTemplates(req.tenantId!, plantillaId);
    res.json({ success: true, data });
  }

  /**
   * POST /plantillas/:id/templates
   * Agrega un template a una plantilla
   */
  static async addTemplate(req: AuthRequest, res: Response) {
    const plantillaId = Number(req.params.id);
    const data = await PlantillasService.addTemplate(req.tenantId!, plantillaId, {
      templateId: req.body.templateId,
      entityType: req.body.entityType,
      obligatorio: req.body.obligatorio,
      diasAnticipacion: req.body.diasAnticipacion,
      visibleChofer: req.body.visibleChofer,
    });
    res.status(201).json({ success: true, data });
  }

  /**
   * PUT /plantillas/:plantillaId/templates/:templateConfigId
   * Actualiza la configuración de un template en una plantilla
   */
  static async updateTemplate(req: AuthRequest, res: Response) {
    const templateConfigId = Number(req.params.templateConfigId);
    const data = await PlantillasService.updateTemplate(req.tenantId!, templateConfigId, {
      obligatorio: req.body.obligatorio,
      diasAnticipacion: req.body.diasAnticipacion,
      visibleChofer: req.body.visibleChofer,
    });
    res.json({ success: true, data });
  }

  /**
   * DELETE /plantillas/:plantillaId/templates/:templateConfigId
   * Elimina un template de una plantilla
   */
  static async removeTemplate(req: AuthRequest, res: Response) {
    const templateConfigId = Number(req.params.templateConfigId);
    await PlantillasService.removeTemplate(req.tenantId!, templateConfigId);
    res.json({ success: true });
  }

  // =============================================
  // Consolidación de Templates
  // =============================================

  /**
   * GET /plantillas/templates/consolidated?plantillaIds=1,2,3
   * Obtiene templates consolidados de múltiples plantillas
   */
  static async getConsolidatedTemplates(req: AuthRequest, res: Response) {
    // El parámetro ya viene transformado por Zod a un array de números
    const plantillaIds = req.query.plantillaIds as unknown as number[];
    if (!plantillaIds || plantillaIds.length === 0) {
      res.json({ success: true, data: { templates: [], byEntityType: {} } });
      return;
    }
    const data = await PlantillasService.getConsolidatedTemplates(req.tenantId!, plantillaIds);
    res.json({ success: true, data });
  }

  // =============================================
  // Gestión de Equipos-Plantilla
  // =============================================

  /**
   * GET /equipos/:equipoId/plantillas
   * Lista las plantillas asociadas a un equipo
   */
  static async listByEquipo(req: AuthRequest, res: Response) {
    const equipoId = Number(req.params.equipoId);
    const soloActivas = req.query.soloActivas !== 'false';
    const data = await PlantillasService.listByEquipo(req.tenantId!, equipoId, soloActivas);
    res.json({ success: true, data });
  }

  /**
   * POST /equipos/:equipoId/plantillas
   * Asocia una plantilla a un equipo
   */
  static async assignToEquipo(req: AuthRequest, res: Response) {
    const equipoId = Number(req.params.equipoId);
    const { plantillaRequisitoId } = req.body;
    if (!plantillaRequisitoId) {
      res.status(400).json({ success: false, error: 'plantillaRequisitoId es requerido' });
      return;
    }
    const data = await PlantillasService.assignToEquipo(equipoId, plantillaRequisitoId);
    res.status(201).json({ success: true, data });
  }

  /**
   * DELETE /equipos/:equipoId/plantillas/:plantillaId
   * Desasocia una plantilla de un equipo
   */
  static async unassignFromEquipo(req: AuthRequest, res: Response) {
    const equipoId = Number(req.params.equipoId);
    const plantillaId = Number(req.params.plantillaId);
    await PlantillasService.unassignFromEquipo(equipoId, plantillaId);
    res.json({ success: true });
  }

  /**
   * GET /equipos/:equipoId/plantillas/consolidated
   * Obtiene los templates consolidados de un equipo basándose en sus plantillas
   */
  static async getEquipoConsolidatedTemplates(req: AuthRequest, res: Response) {
    const equipoId = Number(req.params.equipoId);
    const data = await PlantillasService.getEquipoConsolidatedTemplates(req.tenantId!, equipoId);
    res.json({ success: true, data });
  }

  /**
   * GET /equipos/:equipoId/plantillas/:plantillaId/check
   * Calcula documentos faltantes si se agrega esta plantilla al equipo
   */
  static async checkMissingDocuments(req: AuthRequest, res: Response) {
    const equipoId = Number(req.params.equipoId);
    const plantillaId = Number(req.params.plantillaId);
    const data = await PlantillasService.getMissingDocumentsForNewPlantilla(
      req.tenantId!,
      equipoId,
      plantillaId
    );
    res.json({ success: true, data });
  }
}
