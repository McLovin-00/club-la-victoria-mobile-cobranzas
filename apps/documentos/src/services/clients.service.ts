import { prisma } from '../config/database';

export class ClientsService {
  static async list(tenantEmpresaId: number, activo?: boolean) {
    return prisma.cliente.findMany({
      where: { tenantEmpresaId, ...(activo !== undefined ? { activo } : {}) },
      orderBy: { razonSocial: 'asc' },
    });
  }

  static async create(input: { tenantEmpresaId: number; razonSocial: string; cuit: string; activo?: boolean; notas?: string }) {
    return prisma.$transaction(async (tx) => {
      // 1. Crear el cliente
      const cliente = await tx.cliente.create({ data: input });

      // 2. Obtener todas las plantillas activas
      const templates = await tx.documentTemplate.findMany({
        where: { active: true },
        orderBy: [{ entityType: 'asc' }, { name: 'asc' }],
      });

      // 3. Crear requisitos automáticamente para cada plantilla
      const requirements = templates.map((template) => ({
        tenantEmpresaId: input.tenantEmpresaId,
        clienteId: cliente.id,
        templateId: template.id,
        entityType: template.entityType,
        obligatorio: true,
        diasAnticipacion: 0,
        visibleChofer: true,
      }));

      if (requirements.length > 0) {
        await tx.clienteDocumentRequirement.createMany({
          data: requirements,
          skipDuplicates: true,
        });
      }

      return cliente;
    });
  }

  static async update(tenantEmpresaId: number, id: number, data: { razonSocial?: string; cuit?: string; activo?: boolean; notas?: string }) {
    return prisma.cliente.update({ where: { id }, data: { ...data, tenantEmpresaId } });
  }

  static async remove(tenantEmpresaId: number, id: number) {
    return prisma.$transaction(async (tx) => {
      // Eliminar dependencias: requisitos del cliente
      await tx.clienteDocumentRequirement.deleteMany({ where: { tenantEmpresaId, clienteId: id } });
      // Eliminar asociaciones equipo-cliente
      await tx.equipoCliente.deleteMany({ where: { clienteId: id, equipo: { tenantEmpresaId } } });
      // Finalmente, borrar el cliente
      return tx.cliente.delete({ where: { id } });
    });
  }

  static async addRequirement(tenantEmpresaId: number, clienteId: number, input: {
    templateId: number;
    entityType: 'CHOFER' | 'CAMION' | 'ACOPLADO';
    obligatorio?: boolean;
    diasAnticipacion?: number;
    visibleChofer?: boolean;
  }) {
    return prisma.clienteDocumentRequirement.create({
      data: {
        tenantEmpresaId,
        clienteId,
        templateId: input.templateId,
        entityType: input.entityType as any,
        obligatorio: input.obligatorio ?? true,
        diasAnticipacion: input.diasAnticipacion ?? 0,
        visibleChofer: input.visibleChofer ?? true,
      },
    });
  }

  static async listRequirements(tenantEmpresaId: number, clienteId: number) {
    return prisma.clienteDocumentRequirement.findMany({
      where: { tenantEmpresaId, clienteId },
      include: { template: true },
      orderBy: [{ entityType: 'asc' }, { templateId: 'asc' }],
    });
  }

  static async removeRequirement(tenantEmpresaId: number, clienteId: number, requirementId: number) {
    return prisma.clienteDocumentRequirement.delete({
      where: { id: requirementId },
    });
  }

  /**
   * Obtiene los templates consolidados para múltiples clientes.
   * Aplica la lógica de unión: si un template es requerido por cualquier cliente, se incluye.
   * Si hay conflictos (obligatorio vs opcional), gana el obligatorio.
   * Si hay diferente diasAnticipacion, gana el mayor.
   */
  static async getConsolidatedTemplates(tenantEmpresaId: number, clienteIds: number[]) {
    if (clienteIds.length === 0) {
      return { templates: [], byEntityType: {} };
    }

    // Obtener todos los requisitos de los clientes seleccionados
    const requirements = await prisma.clienteDocumentRequirement.findMany({
      where: {
        tenantEmpresaId,
        clienteId: { in: clienteIds },
      },
      include: {
        template: true,
        cliente: { select: { id: true, razonSocial: true } },
      },
      orderBy: [{ entityType: 'asc' }, { templateId: 'asc' }],
    });

    // Consolidar: clave única = templateId:entityType
    const consolidated = new Map<string, {
      templateId: number;
      templateName: string;
      entityType: string;
      obligatorio: boolean;
      diasAnticipacion: number;
      clienteIds: number[];
      clienteNames: string[];
    }>();

    for (const req of requirements) {
      const key = `${req.templateId}:${req.entityType}`;
      const existing = consolidated.get(key);

      if (!existing) {
        consolidated.set(key, {
          templateId: req.templateId,
          templateName: req.template?.name || `Template ${req.templateId}`,
          entityType: req.entityType,
          obligatorio: req.obligatorio,
          diasAnticipacion: req.diasAnticipacion,
          clienteIds: [req.clienteId],
          clienteNames: [req.cliente?.razonSocial || `Cliente ${req.clienteId}`],
        });
      } else {
        // Agregar cliente a la lista
        if (!existing.clienteIds.includes(req.clienteId)) {
          existing.clienteIds.push(req.clienteId);
          existing.clienteNames.push(req.cliente?.razonSocial || `Cliente ${req.clienteId}`);
        }
        // El obligatorio gana
        if (req.obligatorio && !existing.obligatorio) {
          existing.obligatorio = true;
        }
        // Mayor anticipación gana
        if (req.diasAnticipacion > existing.diasAnticipacion) {
          existing.diasAnticipacion = req.diasAnticipacion;
        }
      }
    }

    const templates = Array.from(consolidated.values());

    // Agrupar por entityType
    const byEntityType: Record<string, typeof templates> = {
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

  /**
   * Calcula qué documentos faltan cuando se agrega un nuevo cliente a un equipo existente.
   * Útil para mostrar alertas informativas.
   */
  static async getMissingDocumentsForNewClient(
    tenantEmpresaId: number,
    equipoId: number,
    newClienteId: number,
    existingClienteIds: number[]
  ) {
    // Requisitos del nuevo cliente
    const newClientReqs = await prisma.clienteDocumentRequirement.findMany({
      where: { tenantEmpresaId, clienteId: newClienteId },
      include: { template: true },
    });

    // Requisitos de los clientes existentes (consolidados)
    const existingReqs = await prisma.clienteDocumentRequirement.findMany({
      where: { tenantEmpresaId, clienteId: { in: existingClienteIds } },
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
    const entityClauses: any[] = [];
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


