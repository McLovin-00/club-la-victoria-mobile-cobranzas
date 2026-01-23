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

export class RequirementNotificationService {
  /**
   * Notifica a usuarios cuando se agrega un nuevo requisito documental a un cliente
   * Identifica equipos asociados al cliente y notifica a los involucrados sobre documentos faltantes
   */
  static async onNewRequirementAdded(
    tenantEmpresaId: number,
    clienteId: number,
    templateId: number,
    entityType: EntityType
  ): Promise<number> {
    try {
      // Obtener información del cliente y template
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
        AppLogger.warn('Cliente o template no encontrado para notificación de nuevo requisito', {
          clienteId,
          templateId,
        });
        return 0;
      }

      // Buscar equipos asociados a este cliente
      const equiposCliente = await prisma.equipoCliente.findMany({
        where: { clienteId },
        select: { equipoId: true },
      });

      if (equiposCliente.length === 0) {
        AppLogger.info('No hay equipos asociados al cliente para notificar', { clienteId });
        return 0;
      }

      const equipoIds = equiposCliente.map(ec => ec.equipoId);

      // Obtener los equipos con sus entidades
      const equipos = await prisma.equipo.findMany({
        where: { id: { in: equipoIds }, activo: true },
        select: {
          id: true,
          tenantEmpresaId: true,
          dadorCargaId: true,
          driverId: true,
          truckId: true,
          trailerId: true,
          empresaTransportistaId: true,
        },
      });

      // Recopilar entidades afectadas según el entityType del requisito
      const entidadesAfectadas = new Set<string>();
      
      for (const equipo of equipos) {
        switch (entityType) {
          case 'CHOFER':
            entidadesAfectadas.add(`CHOFER:${equipo.driverId}`);
            break;
          case 'CAMION':
            entidadesAfectadas.add(`CAMION:${equipo.truckId}`);
            break;
          case 'ACOPLADO':
            if (equipo.trailerId) {
              entidadesAfectadas.add(`ACOPLADO:${equipo.trailerId}`);
            }
            break;
          case 'EMPRESA_TRANSPORTISTA':
            if (equipo.empresaTransportistaId) {
              entidadesAfectadas.add(`EMPRESA_TRANSPORTISTA:${equipo.empresaTransportistaId}`);
            }
            break;
        }
      }

      AppLogger.info(`📋 Nuevo requisito agregado: ${template.name} para ${entityType}`, {
        clienteId,
        templateId,
        entidadesAfectadas: entidadesAfectadas.size,
      });

      // Para cada entidad afectada, verificar si tiene el documento y notificar
      let notificacionesEnviadas = 0;

      for (const entidadKey of entidadesAfectadas) {
        const [entType, entId] = entidadKey.split(':');
        const entityId = parseInt(entId, 10);

        // Verificar si ya existe el documento aprobado
        const docExistente = await prisma.document.findFirst({
          where: {
            tenantEmpresaId,
            entityType: entType as EntityType,
            entityId,
            templateId,
            status: 'APROBADO',
            archived: false,
          },
        });

        if (docExistente) {
          // Ya tiene el documento, no notificar
          continue;
        }

        // Resolver usuarios a notificar
        const recipients = await UserNotificationResolverService.resolveFromEntity(
          tenantEmpresaId,
          entType as EntityType,
          entityId
        );

        // Crear notificaciones
        for (const recipient of recipients) {
          await InternalNotificationService.create({
            tenantEmpresaId,
            userId: recipient.userId,
            type: 'DOCUMENT_MISSING',
            title: `📋 Nuevo documento requerido`,
            message: `${cliente.razonSocial} ahora requiere "${template.name}" para ${this.getEntityTypeLabel(entType as EntityType)}`,
            link: `/documentos/equipos`,
            priority: 'high',
            metadata: {
              clienteId,
              clienteNombre: cliente.razonSocial,
              templateId,
              templateName: template.name,
              entityType: entType,
              entityId,
              recipientRole: recipient.role,
            },
          });
          notificacionesEnviadas++;
        }
      }

      AppLogger.info(`📬 Notificaciones de documento faltante enviadas: ${notificacionesEnviadas}`);
      return notificacionesEnviadas;
    } catch (error) {
      AppLogger.error('💥 Error notificando nuevo requisito:', error);
      return 0;
    }
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
          title: `📋 Nuevo requisito documental configurado`,
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
      AppLogger.error('💥 Error notificando a admins sobre nuevo requisito:', error);
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
