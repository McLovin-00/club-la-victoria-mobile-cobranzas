import { prisma } from '../config/database';
import { EntityType } from '../../node_modules/.prisma/documentos';
import { AppLogger } from '../config/logger';

// Tipos para consolidación de templates desde plantillas
type ConsolidatedTemplateFromPlantilla = {
  templateId: number;
  templateName: string;
  entityType: string;
  obligatorio: boolean;
  diasAnticipacion: number;
  visibleChofer: boolean;
  plantillaIds: number[];
  plantillaNames: string[];
  clienteIds: number[];
  clienteNames: string[];
};

// Helper: merge un requisito de plantilla en el mapa consolidado
function mergeTemplateFromPlantilla(
  map: Map<string, ConsolidatedTemplateFromPlantilla>,
  req: {
    templateId: number;
    entityType: string;
    obligatorio: boolean;
    diasAnticipacion: number;
    visibleChofer: boolean;
    plantillaRequisitoId: number;
    template?: { name: string } | null;
    plantillaRequisito?: { id: number; nombre: string; cliente?: { id: number; razonSocial: string } | null } | null;
  }
): void {
  const key = `${req.templateId}:${req.entityType}`;
  const existing = map.get(key);
  const plantillaName = req.plantillaRequisito?.nombre || `Plantilla ${req.plantillaRequisitoId}`;
  const clienteId = req.plantillaRequisito?.cliente?.id || 0;
  const clienteName = req.plantillaRequisito?.cliente?.razonSocial || 'Sin cliente';

  if (!existing) {
    map.set(key, {
      templateId: req.templateId,
      templateName: req.template?.name || `Template ${req.templateId}`,
      entityType: req.entityType,
      obligatorio: req.obligatorio,
      diasAnticipacion: req.diasAnticipacion,
      visibleChofer: req.visibleChofer,
      plantillaIds: [req.plantillaRequisitoId],
      plantillaNames: [plantillaName],
      clienteIds: [clienteId],
      clienteNames: [clienteName],
    });
    return;
  }

  // Agregar plantilla si no existe
  if (!existing.plantillaIds.includes(req.plantillaRequisitoId)) {
    existing.plantillaIds.push(req.plantillaRequisitoId);
    existing.plantillaNames.push(plantillaName);
  }
  // Agregar cliente si no existe
  if (!existing.clienteIds.includes(clienteId)) {
    existing.clienteIds.push(clienteId);
    existing.clienteNames.push(clienteName);
  }
  // Obligatorio gana
  if (req.obligatorio) existing.obligatorio = true;
  // Mayor anticipación gana
  if (req.diasAnticipacion > existing.diasAnticipacion) {
    existing.diasAnticipacion = req.diasAnticipacion;
  }
  // visibleChofer: si alguno lo tiene visible, queda visible
  if (req.visibleChofer) existing.visibleChofer = true;
}

async function reevaluarEquiposPorPlantilla(plantillaRequisitoId: number): Promise<void> {
  try {
    const asociaciones = await prisma.equipoPlantillaRequisito.findMany({
      where: { plantillaRequisitoId, asignadoHasta: null },
      select: { equipoId: true, plantillaRequisito: { select: { tenantEmpresaId: true } } },
    });
    if (asociaciones.length === 0) return;

    const { queueService } = await import('./queue.service');
    for (const a of asociaciones) {
      await queueService.addMissingCheckForEquipo(a.plantillaRequisito.tenantEmpresaId, a.equipoId, 5000);
    }
    AppLogger.info(`Re-evaluación encolada para ${asociaciones.length} equipos tras cambio en plantilla ${plantillaRequisitoId}`);
  } catch (err) {
    AppLogger.warn('No se pudo encolar re-evaluación de equipos', { error: (err as Error).message });
  }
}

export class PlantillasService {
  // =============================================
  // CRUD de PlantillaRequisito
  // =============================================

  /**
   * Lista las plantillas de requisitos de un cliente
   */
  static async listByCliente(tenantEmpresaId: number, clienteId: number, activo?: boolean) {
    return prisma.plantillaRequisito.findMany({
      where: {
        tenantEmpresaId,
        clienteId,
        ...(activo !== undefined ? { activo } : {}),
      },
      include: {
        cliente: { select: { id: true, razonSocial: true } },
        _count: { select: { templates: true, equipos: true } },
      },
      orderBy: { nombre: 'asc' },
    });
  }

  /**
   * Lista todas las plantillas de requisitos del tenant (para selector en equipos)
   */
  static async listAll(tenantEmpresaId: number, activo?: boolean) {
    return prisma.plantillaRequisito.findMany({
      where: {
        tenantEmpresaId,
        ...(activo !== undefined ? { activo } : {}),
      },
      include: {
        cliente: { select: { id: true, razonSocial: true, activo: true } },
        _count: { select: { templates: true, equipos: true } },
      },
      orderBy: [{ cliente: { razonSocial: 'asc' } }, { nombre: 'asc' }],
    });
  }

  /**
   * Obtiene una plantilla por ID con sus templates
   */
  static async getById(tenantEmpresaId: number, id: number): Promise<unknown> {
    return prisma.plantillaRequisito.findFirst({
      where: { id, tenantEmpresaId },
      include: {
        cliente: { select: { id: true, razonSocial: true } },
        templates: {
          include: { template: true },
          orderBy: [{ entityType: 'asc' }, { template: { name: 'asc' } }],
        },
        equipos: {
          where: { asignadoHasta: null },
          include: {
            equipo: {
              select: {
                id: true,
                driverDniNorm: true,
                truckPlateNorm: true,
                trailerPlateNorm: true,
                estado: true,
              },
            },
          },
        },
      },
    });
  }

  /**
   * Crea una nueva plantilla de requisitos para un cliente
   */
  static async create(input: {
    tenantEmpresaId: number;
    clienteId: number;
    nombre: string;
    descripcion?: string;
    activo?: boolean;
  }) {
    return prisma.plantillaRequisito.create({
      data: {
        tenantEmpresaId: input.tenantEmpresaId,
        clienteId: input.clienteId,
        nombre: input.nombre,
        descripcion: input.descripcion,
        activo: input.activo ?? true,
      },
      include: {
        cliente: { select: { id: true, razonSocial: true } },
      },
    });
  }

  /**
   * Actualiza una plantilla de requisitos
   */
  static async update(
    tenantEmpresaId: number,
    id: number,
    data: { nombre?: string; descripcion?: string; activo?: boolean }
  ) {
    return prisma.plantillaRequisito.update({
      where: { id },
      data,
    });
  }

  /**
   * Elimina una plantilla de requisitos (cascade elimina templates y asociaciones)
   */
  static async remove(tenantEmpresaId: number, id: number) {
    // Verificar que pertenece al tenant
    const plantilla = await prisma.plantillaRequisito.findFirst({
      where: { id, tenantEmpresaId },
    });

    if (!plantilla) {
      throw new Error('Plantilla no encontrada');
    }

    // La eliminación en cascada está configurada en el schema
    return prisma.plantillaRequisito.delete({ where: { id } });
  }

  // =============================================
  // Gestión de Templates en Plantilla
  // =============================================

  /**
   * Lista los templates de una plantilla
   */
  static async listTemplates(tenantEmpresaId: number, plantillaRequisitoId: number): Promise<unknown[]> {
    return prisma.plantillaRequisitoTemplate.findMany({
      where: { tenantEmpresaId, plantillaRequisitoId },
      include: { template: true },
      orderBy: [{ entityType: 'asc' }, { template: { name: 'asc' } }],
    });
  }

  /**
   * Agrega un template a una plantilla
   */
  static async addTemplate(
    tenantEmpresaId: number,
    plantillaRequisitoId: number,
    input: {
      templateId: number;
      entityType: EntityType;
      obligatorio?: boolean;
      diasAnticipacion?: number;
      visibleChofer?: boolean;
    }
  ): Promise<unknown> {
    // Validar existencia de plantilla
    const plantilla = await prisma.plantillaRequisito.findFirst({
      where: { id: plantillaRequisitoId, tenantEmpresaId },
    });
    if (!plantilla) throw new Error('Plantilla no encontrada');

    // Validar coherencia templateId vs entityType
    const template = await prisma.documentTemplate.findFirst({
      where: { id: input.templateId, active: true },
    });
    if (!template) throw new Error('Template no encontrado o inactivo');
    if (template.entityType !== input.entityType) {
      throw new Error(
        `Template "${template.name}" es de tipo ${template.entityType}, no ${input.entityType}`
      );
    }

    // Validar duplicado
    const existe = await prisma.plantillaRequisitoTemplate.findFirst({
      where: { tenantEmpresaId, plantillaRequisitoId, templateId: input.templateId, entityType: input.entityType },
    });
    if (existe) throw new Error('Este template ya está agregado a la plantilla');

    const result = await prisma.plantillaRequisitoTemplate.create({
      data: {
        tenantEmpresaId,
        plantillaRequisitoId,
        templateId: input.templateId,
        entityType: input.entityType,
        obligatorio: input.obligatorio ?? true,
        diasAnticipacion: input.diasAnticipacion ?? 0,
        visibleChofer: input.visibleChofer ?? true,
      },
      include: { template: true },
    });
    reevaluarEquiposPorPlantilla(plantillaRequisitoId).catch(() => {/* fire-and-forget */});
    return result;
  }

  /**
   * Actualiza la configuración de un template en una plantilla
   */
  static async updateTemplate(
    tenantEmpresaId: number,
    templateConfigId: number,
    data: { obligatorio?: boolean; diasAnticipacion?: number; visibleChofer?: boolean }
  ): Promise<unknown> {
    return prisma.plantillaRequisitoTemplate.update({
      where: { id: templateConfigId },
      data,
    });
  }

  /**
   * Elimina un template de una plantilla
   */
  static async removeTemplate(tenantEmpresaId: number, templateConfigId: number): Promise<unknown> {
    const existing = await prisma.plantillaRequisitoTemplate.findUnique({
      where: { id: templateConfigId },
      select: { plantillaRequisitoId: true },
    });
    const result = await prisma.plantillaRequisitoTemplate.delete({
      where: { id: templateConfigId },
    });
    if (existing) {
      reevaluarEquiposPorPlantilla(existing.plantillaRequisitoId).catch(() => {/* fire-and-forget */});
    }
    return result;
  }

  // =============================================
  // Consolidación de Templates
  // =============================================

  /**
   * Obtiene los templates consolidados para múltiples plantillas.
   * Similar a getConsolidatedTemplates de ClientsService pero usando plantillas.
   */
  static async getConsolidatedTemplates(tenantEmpresaId: number, plantillaIds: number[]) {
    if (plantillaIds.length === 0) {
      return { templates: [], byEntityType: {} };
    }

    const requirements = await prisma.plantillaRequisitoTemplate.findMany({
      where: { tenantEmpresaId, plantillaRequisitoId: { in: plantillaIds } },
      include: {
        template: true,
        plantillaRequisito: {
          include: { cliente: { select: { id: true, razonSocial: true } } },
        },
      },
      orderBy: [{ entityType: 'asc' }, { templateId: 'asc' }],
    });

    // Consolidar usando helper
    const consolidated = new Map<string, ConsolidatedTemplateFromPlantilla>();
    for (const req of requirements) {
      mergeTemplateFromPlantilla(consolidated, req);
    }

    const templates = Array.from(consolidated.values());

    // Agrupar por entityType
    const byEntityType: Record<string, ConsolidatedTemplateFromPlantilla[]> = {
      DADOR: [],
      EMPRESA_TRANSPORTISTA: [],
      CHOFER: [],
      CAMION: [],
      ACOPLADO: [],
    };

    for (const t of templates) {
      if (byEntityType[t.entityType]) {
        byEntityType[t.entityType].push(t);
      }
    }

    return { templates, byEntityType };
  }

  // =============================================
  // Gestión de Equipos-Plantilla
  // =============================================

  /**
   * Lista las plantillas asociadas a un equipo
   */
  static async listByEquipo(tenantEmpresaId: number, equipoId: number, soloActivas = true) {
    return prisma.equipoPlantillaRequisito.findMany({
      where: {
        equipoId,
        ...(soloActivas ? { asignadoHasta: null } : {}),
        plantillaRequisito: { tenantEmpresaId },
      },
      include: {
        plantillaRequisito: {
          include: {
            cliente: { select: { id: true, razonSocial: true } },
            _count: { select: { templates: true } },
          },
        },
      },
      orderBy: { asignadoDesde: 'desc' },
    });
  }

  /**
   * Asocia una plantilla a un equipo
   */
  static async assignToEquipo(equipoId: number, plantillaRequisitoId: number, tenantEmpresaId?: number) {
    // Validar existencia del equipo
    const equipo = await prisma.equipo.findUnique({ where: { id: equipoId }, select: { id: true, tenantEmpresaId: true } });
    if (!equipo) throw new Error('Equipo no encontrado');

    // Validar existencia de la plantilla en el mismo tenant
    const plantilla = await prisma.plantillaRequisito.findFirst({
      where: { id: plantillaRequisitoId, tenantEmpresaId: equipo.tenantEmpresaId, activo: true },
    });
    if (!plantilla) throw new Error('Plantilla no encontrada o inactiva para este tenant');

    // Validar que no esté ya asignada activamente
    const yaAsignada = await prisma.equipoPlantillaRequisito.findFirst({
      where: { equipoId, plantillaRequisitoId, asignadoHasta: null },
    });
    if (yaAsignada) throw new Error('Esta plantilla ya está asignada al equipo');

    const result = await prisma.equipoPlantillaRequisito.create({
      data: {
        equipoId,
        plantillaRequisitoId,
        asignadoDesde: new Date(),
      },
      include: {
        plantillaRequisito: {
          include: { cliente: { select: { id: true, razonSocial: true } } },
        },
      },
    });
    try {
      const { queueService } = await import('./queue.service');
      await queueService.addMissingCheckForEquipo(equipo.tenantEmpresaId, equipoId, 5000);
    } catch { /* non-critical */ }
    return result;
  }

  /**
   * Desasocia una plantilla de un equipo (marca asignadoHasta)
   */
  static async unassignFromEquipo(equipoId: number, plantillaRequisitoId: number) {
    // Buscar la asociación activa más reciente
    const asociacion = await prisma.equipoPlantillaRequisito.findFirst({
      where: {
        equipoId,
        plantillaRequisitoId,
        asignadoHasta: null,
      },
      orderBy: { asignadoDesde: 'desc' },
    });

    if (!asociacion) {
      throw new Error('Asociación no encontrada');
    }

    const result = await prisma.$executeRaw`
      UPDATE documentos.equipo_plantilla_requisito 
      SET asignado_hasta = NOW() 
      WHERE equipo_id = ${equipoId} 
        AND plantilla_requisito_id = ${plantillaRequisitoId} 
        AND asignado_desde = ${asociacion.asignadoDesde}
    `;
    try {
      const equipo = await prisma.equipo.findUnique({ where: { id: equipoId }, select: { tenantEmpresaId: true } });
      if (equipo) {
        const { queueService } = await import('./queue.service');
        await queueService.addMissingCheckForEquipo(equipo.tenantEmpresaId, equipoId, 5000);
      }
    } catch { /* non-critical */ }
    return result;
  }

  /**
   * Obtiene los templates consolidados de un equipo basándose en sus plantillas asignadas
   */
  static async getEquipoConsolidatedTemplates(tenantEmpresaId: number, equipoId: number) {
    // Obtener plantillas activas del equipo
    const asociaciones = await prisma.equipoPlantillaRequisito.findMany({
      where: {
        equipoId,
        asignadoHasta: null,
        plantillaRequisito: { tenantEmpresaId, activo: true },
      },
      select: { plantillaRequisitoId: true },
    });

    const plantillaIds = asociaciones.map((a) => a.plantillaRequisitoId);
    return this.getConsolidatedTemplates(tenantEmpresaId, plantillaIds);
  }

  /**
   * Calcula documentos faltantes cuando se agrega una nueva plantilla a un equipo
   */
  static async getMissingDocumentsForNewPlantilla(
    tenantEmpresaId: number,
    equipoId: number,
    newPlantillaId: number
  ): Promise<{ missingTemplates: unknown[]; plantillaName: string; clienteName?: string }> {
    // Requisitos de la nueva plantilla
    const newPlantillaReqs = await prisma.plantillaRequisitoTemplate.findMany({
      where: { tenantEmpresaId, plantillaRequisitoId: newPlantillaId },
      include: {
        template: true,
        plantillaRequisito: {
          include: { cliente: { select: { razonSocial: true } } },
        },
      },
    });

    // Requisitos de las plantillas existentes del equipo
    const existingAssocs = await prisma.equipoPlantillaRequisito.findMany({
      where: { equipoId, asignadoHasta: null },
      select: { plantillaRequisitoId: true },
    });
    const existingPlantillaIds = existingAssocs.map((a) => a.plantillaRequisitoId);

    const existingReqs = await prisma.plantillaRequisitoTemplate.findMany({
      where: { tenantEmpresaId, plantillaRequisitoId: { in: existingPlantillaIds } },
    });
    const existingKeys = new Set(existingReqs.map((r) => `${r.templateId}:${r.entityType}`));

    // Obtener el equipo para saber qué entidades tiene
    const equipo = await prisma.equipo.findUnique({
      where: { id: equipoId },
      select: {
        driverId: true,
        truckId: true,
        trailerId: true,
        empresaTransportistaId: true,
        tenantEmpresaId: true,
        dadorCargaId: true,
      },
    });

    if (!equipo) {
      return { missingTemplates: [], plantillaName: '' };
    }

    // Documentos que YA tiene el equipo
    const entityClauses: Array<{ entityType: EntityType; entityId: number }> = [];
    if (equipo.empresaTransportistaId) {
      entityClauses.push({ entityType: 'EMPRESA_TRANSPORTISTA', entityId: equipo.empresaTransportistaId });
    }
    if (equipo.driverId) {
      entityClauses.push({ entityType: 'CHOFER', entityId: equipo.driverId });
    }
    if (equipo.truckId) {
      entityClauses.push({ entityType: 'CAMION', entityId: equipo.truckId });
    }
    if (equipo.trailerId) {
      entityClauses.push({ entityType: 'ACOPLADO', entityId: equipo.trailerId });
    }

    const existingDocs = await prisma.document.findMany({
      where: {
        tenantEmpresaId: equipo.tenantEmpresaId,
        dadorCargaId: equipo.dadorCargaId,
        status: { in: ['APROBADO', 'PENDIENTE', 'VALIDANDO', 'CLASIFICANDO', 'PENDIENTE_APROBACION'] },
        OR: entityClauses.length > 0 ? entityClauses : undefined,
      },
      select: { templateId: true, entityType: true },
    });

    const loadedDocKeys = new Set(existingDocs.map((d) => `${d.templateId}:${d.entityType}`));

    // Templates de la nueva plantilla que NO están cargados
    const missingTemplates = newPlantillaReqs
      .filter((req) => !loadedDocKeys.has(`${req.templateId}:${req.entityType}`))
      .map((req) => ({
        templateId: req.templateId,
        templateName: req.template?.name || `Template ${req.templateId}`,
        entityType: req.entityType,
        obligatorio: req.obligatorio,
        isNewRequirement: !existingKeys.has(`${req.templateId}:${req.entityType}`),
      }));

    const plantillaName =
      newPlantillaReqs[0]?.plantillaRequisito?.nombre ||
      `Plantilla ${newPlantillaId}`;
    const clienteName =
      newPlantillaReqs[0]?.plantillaRequisito?.cliente?.razonSocial || '';

    return {
      missingTemplates,
      plantillaName,
      clienteName,
    };
  }

  /**
   * Copia una plantilla existente (útil para crear variantes)
   */
  static async duplicate(tenantEmpresaId: number, plantillaId: number, nuevoNombre: string) {
    const original = await prisma.plantillaRequisito.findFirst({
      where: { id: plantillaId, tenantEmpresaId },
      include: { templates: true },
    });

    if (!original) {
      throw new Error('Plantilla no encontrada');
    }

    return prisma.$transaction(async (tx) => {
      // Crear nueva plantilla
      const nueva = await tx.plantillaRequisito.create({
        data: {
          tenantEmpresaId: original.tenantEmpresaId,
          clienteId: original.clienteId,
          nombre: nuevoNombre,
          descripcion: original.descripcion ? `Copia de: ${original.descripcion}` : `Copia de ${original.nombre}`,
          activo: true,
        },
      });

      // Copiar templates
      if (original.templates.length > 0) {
        await tx.plantillaRequisitoTemplate.createMany({
          data: original.templates.map((t) => ({
            tenantEmpresaId: t.tenantEmpresaId,
            plantillaRequisitoId: nueva.id,
            templateId: t.templateId,
            entityType: t.entityType,
            obligatorio: t.obligatorio,
            diasAnticipacion: t.diasAnticipacion,
            visibleChofer: t.visibleChofer,
          })),
        });
      }

      return nueva;
    });
  }
}
