import { prisma } from '../config/database';

type ConsolidatedTemplate = {
  templateId: number;
  templateName: string;
  entityType: string;
  obligatorio: boolean;
  diasAnticipacion: number;
  clienteIds: number[];
  clienteNames: string[];
};

// Helper: merge un requisito en el mapa consolidado
function mergeRequirement(
  map: Map<string, ConsolidatedTemplate>,
  req: {
    templateId: number;
    entityType: string;
    obligatorio: boolean;
    diasAnticipacion: number;
    clienteId: number;
    templateName: string;
    clienteName: string;
  }
): void {
  const key = `${req.templateId}:${req.entityType}`;
  const existing = map.get(key);

  if (!existing) {
    map.set(key, {
      templateId: req.templateId,
      templateName: req.templateName,
      entityType: req.entityType,
      obligatorio: req.obligatorio,
      diasAnticipacion: req.diasAnticipacion,
      clienteIds: [req.clienteId],
      clienteNames: [req.clienteName],
    });
    return;
  }

  // Agregar cliente si no existe
  if (!existing.clienteIds.includes(req.clienteId)) {
    existing.clienteIds.push(req.clienteId);
    existing.clienteNames.push(req.clienteName);
  }
  // Obligatorio gana
  if (req.obligatorio) existing.obligatorio = true;
  // Mayor anticipación gana
  if (req.diasAnticipacion > existing.diasAnticipacion) {
    existing.diasAnticipacion = req.diasAnticipacion;
  }
}

/**
 * Obtiene o crea la plantilla activa por defecto de un cliente.
 * Si el cliente tiene varias plantillas activas, usa la primera.
 */
async function getOrCreateDefaultPlantilla(
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
  tenantEmpresaId: number,
  clienteId: number
): Promise<{ id: number }> {
  const existing = await tx.plantillaRequisito.findFirst({
    where: { tenantEmpresaId, clienteId, activo: true },
    select: { id: true },
    orderBy: { createdAt: 'asc' },
  });

  if (existing) return existing;

  return tx.plantillaRequisito.create({
    data: {
      tenantEmpresaId,
      clienteId,
      nombre: 'Requisitos Generales',
      descripcion: 'Plantilla de requisitos por defecto.',
      activo: true,
    },
    select: { id: true },
  });
}

export class ClientsService {
  static async list(tenantEmpresaId: number, activo?: boolean) {
    return prisma.cliente.findMany({
      where: { tenantEmpresaId, ...(activo !== undefined ? { activo } : {}) },
      orderBy: { razonSocial: 'asc' },
    });
  }

  static async create(input: { tenantEmpresaId: number; razonSocial: string; cuit: string; activo?: boolean; notas?: string }) {
    return prisma.$transaction(async (tx) => {
      const cliente = await tx.cliente.create({ data: input });

      // Crear una PlantillaRequisito vacía por defecto
      await tx.plantillaRequisito.create({
        data: {
          tenantEmpresaId: input.tenantEmpresaId,
          clienteId: cliente.id,
          nombre: 'Requisitos Generales',
          descripcion: 'Plantilla de requisitos por defecto. Configure los documentos requeridos.',
          activo: true,
        },
      });

      return cliente;
    });
  }

  static async update(tenantEmpresaId: number, id: number, data: { razonSocial?: string; cuit?: string; activo?: boolean; notas?: string }) {
    return prisma.cliente.update({ where: { id }, data: { ...data, tenantEmpresaId } });
  }

  static async remove(tenantEmpresaId: number, id: number) {
    return prisma.$transaction(async (tx) => {
      // Obtener IDs de plantillas antes de borrarlas
      const plantillas = await tx.plantillaRequisito.findMany({
        where: { tenantEmpresaId, clienteId: id },
        select: { id: true },
      });
      const plantillaIds = plantillas.map(p => p.id);

      // Eliminar asociaciones equipo-plantilla
      if (plantillaIds.length > 0) {
        await tx.equipoPlantillaRequisito.deleteMany({
          where: { plantillaRequisitoId: { in: plantillaIds } },
        });
      }
      // Eliminar plantillas del cliente (cascade elimina PlantillaRequisitoTemplate)
      await tx.plantillaRequisito.deleteMany({ where: { tenantEmpresaId, clienteId: id } });
      // Limpiar tabla legada si aún tiene datos
      await tx.clienteDocumentRequirement.deleteMany({ where: { tenantEmpresaId, clienteId: id } });
      // Eliminar asociaciones equipo-cliente
      await tx.equipoCliente.deleteMany({ where: { clienteId: id, equipo: { tenantEmpresaId } } });
      // Borrar el cliente
      return tx.cliente.delete({ where: { id } });
    });
  }

  /**
   * Agrega un requisito a la plantilla activa del cliente.
   * Mantiene compatibilidad con la API existente.
   */
  static async addRequirement(tenantEmpresaId: number, clienteId: number, input: {
    templateId: number;
    entityType: 'CHOFER' | 'CAMION' | 'ACOPLADO' | 'EMPRESA_TRANSPORTISTA';
    obligatorio?: boolean;
    diasAnticipacion?: number;
    visibleChofer?: boolean;
  }) {
    return prisma.$transaction(async (tx) => {
      const plantilla = await getOrCreateDefaultPlantilla(tx, tenantEmpresaId, clienteId);

      return tx.plantillaRequisitoTemplate.create({
        data: {
          tenantEmpresaId,
          plantillaRequisitoId: plantilla.id,
          templateId: input.templateId,
          entityType: input.entityType as any, // NOSONAR - EntityType enum match
          obligatorio: input.obligatorio ?? true,
          diasAnticipacion: input.diasAnticipacion ?? 0,
          visibleChofer: input.visibleChofer ?? true,
        },
        include: { template: true },
      });
    });
  }

  /**
   * Lista los requisitos del cliente desde PlantillaRequisitoTemplate.
   * Devuelve formato compatible con el frontend.
   */
  static async listRequirements(tenantEmpresaId: number, clienteId: number) {
    return prisma.plantillaRequisitoTemplate.findMany({
      where: {
        tenantEmpresaId,
        plantillaRequisito: { clienteId, activo: true },
      },
      include: { template: true },
      orderBy: [{ entityType: 'asc' }, { templateId: 'asc' }],
    });
  }

  /**
   * Elimina un requisito de PlantillaRequisitoTemplate por ID.
   */
  static async removeRequirement(_tenantEmpresaId: number, _clienteId: number, requirementId: number) {
    return prisma.plantillaRequisitoTemplate.delete({
      where: { id: requirementId },
    });
  }

  /**
   * Obtiene los templates consolidados para múltiples clientes.
   * Lee desde PlantillaRequisitoTemplate (fuente de verdad).
   * Aplica la lógica de unión: obligatorio gana, mayor anticipación gana.
   */
  static async getConsolidatedTemplates(tenantEmpresaId: number, clienteIds: number[]) {
    if (clienteIds.length === 0) {
      return { templates: [], byEntityType: {} };
    }

    const requirements = await prisma.plantillaRequisitoTemplate.findMany({
      where: {
        tenantEmpresaId,
        plantillaRequisito: { clienteId: { in: clienteIds }, activo: true },
      },
      include: {
        template: true,
        plantillaRequisito: {
          include: { cliente: { select: { id: true, razonSocial: true } } },
        },
      },
      orderBy: [{ entityType: 'asc' }, { templateId: 'asc' }],
    });

    // Consolidar usando helper
    const consolidated = new Map<string, ConsolidatedTemplate>();
    for (const req of requirements) {
      mergeRequirement(consolidated, {
        templateId: req.templateId,
        entityType: req.entityType,
        obligatorio: req.obligatorio,
        diasAnticipacion: req.diasAnticipacion,
        clienteId: req.plantillaRequisito.clienteId,
        templateName: req.template?.name || `Template ${req.templateId}`,
        clienteName: req.plantillaRequisito.cliente?.razonSocial || `Cliente ${req.plantillaRequisito.clienteId}`,
      });
    }

    const templates = Array.from(consolidated.values());

    // Agrupar por entityType
    const byEntityType: Record<string, ConsolidatedTemplate[]> = {
      EMPRESA_TRANSPORTISTA: [],
      CHOFER: [],
      CAMION: [],
      ACOPLADO: [],
    };

    for (const t of templates) {
      byEntityType[t.entityType]?.push(t);
    }

    return { templates, byEntityType };
  }

  /**
   * Calcula qué documentos faltan cuando se agrega un nuevo cliente a un equipo existente.
   * Lee desde PlantillaRequisitoTemplate (fuente de verdad).
   */
  static async getMissingDocumentsForNewClient(
    tenantEmpresaId: number,
    equipoId: number,
    newClienteId: number,
    existingClienteIds: number[]
  ) {
    // Requisitos del nuevo cliente (desde plantillas activas)
    const newClientReqs = await prisma.plantillaRequisitoTemplate.findMany({
      where: {
        tenantEmpresaId,
        plantillaRequisito: { clienteId: newClienteId, activo: true },
      },
      include: { template: true },
    });

    // Requisitos de los clientes existentes (para detectar nuevos)
    const existingReqs = await prisma.plantillaRequisitoTemplate.findMany({
      where: {
        tenantEmpresaId,
        plantillaRequisito: { clienteId: { in: existingClienteIds }, activo: true },
      },
      select: { templateId: true, entityType: true },
    });

    const existingKeys = new Set(existingReqs.map(r => `${r.templateId}:${r.entityType}`));

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
      return { missingTemplates: [], newClientName: '' };
    }

    // Obtener nombre del cliente
    const cliente = await prisma.cliente.findUnique({
      where: { id: newClienteId },
      select: { razonSocial: true },
    });

    // Documentos que YA tiene el equipo
    const entityClauses: Array<{ entityType: any; entityId: number }> = [];
    if (equipo.empresaTransportistaId) {
      entityClauses.push({ entityType: 'EMPRESA_TRANSPORTISTA' as any, entityId: equipo.empresaTransportistaId });
    }
    if (equipo.driverId) {
      entityClauses.push({ entityType: 'CHOFER' as any, entityId: equipo.driverId });
    }
    if (equipo.truckId) {
      entityClauses.push({ entityType: 'CAMION' as any, entityId: equipo.truckId });
    }
    if (equipo.trailerId) {
      entityClauses.push({ entityType: 'ACOPLADO' as any, entityId: equipo.trailerId });
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

    const loadedDocKeys = new Set(existingDocs.map(d => `${d.templateId}:${d.entityType}`));

    // Templates del nuevo cliente que NO están cargados
    const missingTemplates = newClientReqs
      .filter(req => !loadedDocKeys.has(`${req.templateId}:${req.entityType}`))
      .map(req => ({
        templateId: req.templateId,
        templateName: req.template?.name || `Template ${req.templateId}`,
        entityType: req.entityType,
        obligatorio: req.obligatorio,
        isNewRequirement: !existingKeys.has(`${req.templateId}:${req.entityType}`),
      }));

    return {
      missingTemplates,
      newClientName: cliente?.razonSocial || `Cliente ${newClienteId}`,
    };
  }
}
