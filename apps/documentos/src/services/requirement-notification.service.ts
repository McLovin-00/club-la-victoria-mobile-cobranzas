import { prisma } from '../config/database';
import { AppLogger } from '../config/logger';
import { InternalNotificationService } from './internal-notification.service';
import { UserNotificationResolverService } from './user-notification-resolver.service';
import type { EntityType } from '.prisma/documentos';

// ============================================================================
// RequirementNotificationService
// Maneja notificaciones cuando se agregan nuevos requisitos documentales a clientes
// Notifica a todos los usuarios afectados (chofer → transportista → dador)
// ============================================================================

interface RequirementContext {
  tenantEmpresaId: number;
  clienteId: number;
  templateId: number;
  entityType: EntityType;
  clienteNombre: string;
  templateName: string;
}

export class RequirementNotificationService {
  /**
   * Notifica a usuarios cuando se agrega un nuevo requisito documental a un cliente
   */
  static async onNewRequirementAdded(
    tenantEmpresaId: number,
    clienteId: number,
    templateId: number,
    entityType: EntityType
  ): Promise<number> {
    try {
      const context = await this.buildContext(tenantEmpresaId, clienteId, templateId, entityType);
      if (!context) return 0;

      const entidadesAfectadas = await this.findAffectedEntities(clienteId, entityType);
      if (entidadesAfectadas.size === 0) return 0;

      return await this.notifyAffectedEntities(context, entidadesAfectadas);
    } catch (error) {
      AppLogger.error('💥 Error notificando nuevo requisito:', error);
      return 0;
    }
  }

  /**
   * Construye el contexto con información del cliente y template
   */
  private static async buildContext(
    tenantEmpresaId: number,
    clienteId: number,
    templateId: number,
    entityType: EntityType
  ): Promise<RequirementContext | null> {
    const [cliente, template] = await Promise.all([
      prisma.cliente.findUnique({
        where: { id: clienteId },
        select: { razonSocial: true },
      }),
      prisma.documentTemplate.findUnique({
        where: { id: templateId },
        select: { name: true },
      }),
    ]);

    if (!cliente || !template) {
      AppLogger.warn('Cliente o template no encontrado', { clienteId, templateId });
      return null;
    }

    return {
      tenantEmpresaId,
      clienteId,
      templateId,
      entityType,
      clienteNombre: cliente.razonSocial,
      templateName: template.name,
    };
  }

  /**
   * Encuentra entidades afectadas por el nuevo requisito
   */
  private static async findAffectedEntities(
    clienteId: number,
    entityType: EntityType
  ): Promise<Set<string>> {
    const equiposCliente = await prisma.equipoCliente.findMany({
      where: { clienteId },
      select: { equipoId: true },
    });

    if (equiposCliente.length === 0) {
      AppLogger.info('No hay equipos asociados al cliente', { clienteId });
      return new Set();
    }

    const equipoIds = equiposCliente.map(ec => ec.equipoId);
    const equipos = await prisma.equipo.findMany({
      where: { id: { in: equipoIds }, activo: true },
      select: {
        driverId: true,
        truckId: true,
        trailerId: true,
        empresaTransportistaId: true,
      },
    });

    const entidades = new Set<string>();
    for (const equipo of equipos) {
      const key = this.getEntityKeyFromEquipo(equipo, entityType);
      if (key) entidades.add(key);
    }

    return entidades;
  }

  /**
   * Obtiene la clave de entidad desde un equipo según el tipo
   */
  private static getEntityKeyFromEquipo(
    equipo: { driverId: number; truckId: number; trailerId: number | null; empresaTransportistaId: number | null },
    entityType: EntityType
  ): string | null {
    switch (entityType) {
      case 'CHOFER':
        return `CHOFER:${equipo.driverId}`;
      case 'CAMION':
        return `CAMION:${equipo.truckId}`;
      case 'ACOPLADO':
        return equipo.trailerId ? `ACOPLADO:${equipo.trailerId}` : null;
      case 'EMPRESA_TRANSPORTISTA':
        return equipo.empresaTransportistaId ? `EMPRESA_TRANSPORTISTA:${equipo.empresaTransportistaId}` : null;
      default:
        return null;
    }
  }

  /**
   * Notifica a las entidades afectadas que no tienen el documento
   */
  private static async notifyAffectedEntities(
    context: RequirementContext,
    entidadesAfectadas: Set<string>
  ): Promise<number> {
    AppLogger.info(`📋 Nuevo requisito: ${context.templateName} para ${context.entityType}`, {
      clienteId: context.clienteId,
      entidadesAfectadas: entidadesAfectadas.size,
    });

    let notificacionesEnviadas = 0;

    for (const entidadKey of entidadesAfectadas) {
      const [entType, entId] = entidadKey.split(':');
      const entityId = parseInt(entId, 10);

      const tieneDocumento = await this.entityHasApprovedDocument(
        context.tenantEmpresaId,
        entType as EntityType,
        entityId,
        context.templateId
      );

      if (tieneDocumento) continue;

      notificacionesEnviadas += await this.notifyEntityRecipients(
        context,
        entType as EntityType,
        entityId
      );
    }

    AppLogger.info(`📬 Notificaciones de documento faltante: ${notificacionesEnviadas}`);
    return notificacionesEnviadas;
  }

  /**
   * Verifica si una entidad tiene el documento aprobado
   */
  private static async entityHasApprovedDocument(
    tenantEmpresaId: number,
    entityType: EntityType,
    entityId: number,
    templateId: number
  ): Promise<boolean> {
    const doc = await prisma.document.findFirst({
      where: {
        tenantEmpresaId,
        entityType,
        entityId,
        templateId,
        status: 'APROBADO',
        archived: false,
      },
    });
    return doc !== null;
  }

  /**
   * Notifica a los receptores de una entidad
   */
  private static async notifyEntityRecipients(
    context: RequirementContext,
    entityType: EntityType,
    entityId: number
  ): Promise<number> {
    const recipients = await UserNotificationResolverService.resolveFromEntity(
      context.tenantEmpresaId,
      entityType,
      entityId
    );

    for (const recipient of recipients) {
      await InternalNotificationService.create({
        tenantEmpresaId: context.tenantEmpresaId,
        userId: recipient.userId,
        type: 'DOCUMENT_MISSING',
        title: '📋 Nuevo documento requerido',
        message: `${context.clienteNombre} ahora requiere "${context.templateName}" para ${this.getEntityTypeLabel(entityType)}`,
        link: '/documentos/equipos',
        priority: 'high',
        metadata: {
          clienteId: context.clienteId,
          clienteNombre: context.clienteNombre,
          templateId: context.templateId,
          templateName: context.templateName,
          entityType,
          entityId,
          recipientRole: recipient.role,
        },
      });
    }

    return recipients.length;
  }

  /**
   * Notifica a Admin Internos sobre el nuevo requisito
   */
  static async notifyAdminsNewRequirement(
    tenantEmpresaId: number,
    clienteId: number,
    templateId: number,
    entityType: EntityType
  ): Promise<void> {
    try {
      const [cliente, template] = await Promise.all([
        prisma.cliente.findUnique({
          where: { id: clienteId },
          select: { razonSocial: true },
        }),
        prisma.documentTemplate.findUnique({
          where: { id: templateId },
          select: { name: true },
        }),
      ]);

      if (!cliente || !template) return;

      const admins = await UserNotificationResolverService.getAdminInternosForTenant(tenantEmpresaId);

      for (const admin of admins) {
        await InternalNotificationService.create({
          tenantEmpresaId,
          userId: admin.userId,
          type: 'NUEVO_REQUISITO_CLIENTE',
          title: '📋 Nuevo requisito documental configurado',
          message: `${cliente.razonSocial} ahora requiere "${template.name}" para ${this.getEntityTypeLabel(entityType)}`,
          link: `/admin/clientes/${clienteId}/requisitos`,
          priority: 'normal',
          metadata: {
            clienteId,
            clienteNombre: cliente.razonSocial,
            templateId,
            templateName: template.name,
            entityType,
          },
        });
      }
    } catch (error) {
      AppLogger.error('💥 Error notificando a admins:', error);
    }
  }

  /**
   * Label amigable para tipos de entidad
   */
  private static getEntityTypeLabel(entityType: EntityType): string {
    const labels: Record<string, string> = {
      DADOR: 'dadores de carga',
      CHOFER: 'choferes',
      CAMION: 'camiones',
      ACOPLADO: 'acoplados',
      EMPRESA_TRANSPORTISTA: 'empresas transportistas',
    };
    return labels[entityType] || entityType.toLowerCase();
  }
}
