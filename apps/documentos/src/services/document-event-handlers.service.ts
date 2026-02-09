import { prisma } from '../config/database';
import { AppLogger } from '../config/logger';
import { EquipoEvaluationService } from './equipo-evaluation.service';
import { InternalNotificationService } from './internal-notification.service';
import { UserNotificationResolverService, type NotificationRecipient } from './user-notification-resolver.service';
import type { DocumentStatus, EntityType } from '.prisma/documentos';

// ============================================================================
// DocumentEventHandlers - Manejadores de eventos para cambios en documentos
// Se disparan cuando un documento es aprobado, rechazado o vence
// Re-evalúan los equipos afectados y envían notificaciones con propagación jerárquica:
// Chofer → Transportista → Dador de Carga
// ============================================================================

interface DocumentInfo {
  tenantEmpresaId: number;
  dadorCargaId: number;
  entityType: EntityType;
  entityId: number;
  templateName: string;
  entityIdentifier: string;
}

/**
 * Obtiene el identificador legible de una entidad por tipo e ID
 */
async function obtenerEntityIdentifier(entityType: EntityType, entityId: number): Promise<string> {
  switch (entityType) {
    case 'CHOFER': {
      const chofer = await prisma.chofer.findUnique({
        where: { id: entityId },
        select: { dniNorm: true, nombre: true, apellido: true },
      });
      return chofer ? `${chofer.nombre || ''} ${chofer.apellido || ''} (${chofer.dniNorm})`.trim() : `Chofer #${entityId}`;
    }
    case 'CAMION': {
      const camion = await prisma.camion.findUnique({ where: { id: entityId }, select: { patenteNorm: true } });
      return camion?.patenteNorm || `Camión #${entityId}`;
    }
    case 'ACOPLADO': {
      const acoplado = await prisma.acoplado.findUnique({ where: { id: entityId }, select: { patenteNorm: true } });
      return acoplado?.patenteNorm || `Acoplado #${entityId}`;
    }
    case 'EMPRESA_TRANSPORTISTA': {
      const empresa = await prisma.empresaTransportista.findUnique({
        where: { id: entityId },
        select: { razonSocial: true, cuit: true },
      });
      return empresa ? `${empresa.razonSocial} (${empresa.cuit})` : `Empresa #${entityId}`;
    }
    default:
      return `Entidad #${entityId}`;
  }
}

/**
 * Obtiene información del documento para notificaciones
 */
async function obtenerInfoDocumento(documentId: number): Promise<DocumentInfo | null> {
  const doc = await prisma.document.findUnique({
    where: { id: documentId },
    select: {
      tenantEmpresaId: true,
      dadorCargaId: true,
      entityType: true,
      entityId: true,
      template: { select: { name: true } },
    },
  });

  if (!doc) return null;

  const entityIdentifier = await obtenerEntityIdentifier(doc.entityType, doc.entityId);

  return {
    tenantEmpresaId: doc.tenantEmpresaId,
    dadorCargaId: doc.dadorCargaId,
    entityType: doc.entityType,
    entityId: doc.entityId,
    templateName: doc.template?.name || 'Documento',
    entityIdentifier,
  };
}

/**
 * Genera título contextualizado según el rol del receptor
 */
function getTituloContextualizado(
  baseTitulo: string,
  recipient: NotificationRecipient,
  entityType: EntityType
): string {
  if (recipient.reason === 'direct') {
    return baseTitulo;
  }

  const entityLabels: Record<string, string> = {
    DADOR: 'tu dador de carga',
    CHOFER: 'tu chofer',
    CAMION: 'un camión de tu flota',
    ACOPLADO: 'un acoplado de tu flota',
    EMPRESA_TRANSPORTISTA: 'tu empresa transportista',
  };
  const entityLabel = entityLabels[entityType] || 'una entidad';

  switch (recipient.reason) {
    case 'transportista_of_chofer':
      return `${baseTitulo} (de tu chofer)`;
    case 'dador_of_transportista':
      return `${baseTitulo} (de ${entityLabel})`;
    case 'dador_of_chofer':
      return `${baseTitulo} (de ${entityLabel})`;
    case 'admin_interno':
      return `[Admin] ${baseTitulo}`;
    default:
      return baseTitulo;
  }
}

export class DocumentEventHandlers {
  /**
   * Handler cuando un documento es APROBADO
   */
  static async onDocumentApproved(documentId: number): Promise<void> {
    AppLogger.info('📗 Documento aprobado - procesando eventos', { documentId });

    try {
      const info = await obtenerInfoDocumento(documentId);
      if (!info) {
        AppLogger.warn('⚠️ Documento no encontrado para evento', { documentId });
        return;
      }

      // Resolver usuarios a notificar con propagación jerárquica
      const recipients = await UserNotificationResolverService.resolveFromEntity(
        info.tenantEmpresaId,
        info.entityType,
        info.entityId
      );

      AppLogger.info(`📬 Notificando aprobación a ${recipients.length} usuarios`);

      // Crear notificaciones para cada receptor
      for (const recipient of recipients) {
        const titulo = getTituloContextualizado('Documento aprobado', recipient, info.entityType);
        
        await InternalNotificationService.create({
          tenantEmpresaId: info.tenantEmpresaId,
          userId: recipient.userId,
          type: 'DOCUMENT_APPROVED',
          title: titulo,
          message: `${info.templateName} de ${info.entityIdentifier} fue aprobado`,
          link: `/documentos/documentos/${documentId}`,
          priority: 'normal',
          documentId,
          metadata: { 
            entityType: info.entityType, 
            entityId: info.entityId,
            recipientRole: recipient.role,
            reason: recipient.reason,
          },
        });
      }

      // Re-evaluar equipos afectados
      const equiposAfectados = await EquipoEvaluationService.buscarEquiposPorEntidad(
        info.tenantEmpresaId,
        info.dadorCargaId,
        info.entityType,
        info.entityId
      );

      if (equiposAfectados.length > 0) {
        const resultados = await EquipoEvaluationService.evaluarEquipos(
          equiposAfectados.map(e => e.id)
        );

        const actualizados = resultados.filter(r => r.cambio);
        AppLogger.info('✅ Equipos re-evaluados por documento aprobado', {
          documentId,
          equiposEvaluados: equiposAfectados.length,
          equiposActualizados: actualizados.length,
        });

        // Notificar sobre equipos que pasaron a COMPLETO
        for (const resultado of actualizados) {
          if (resultado.estadoNuevo === 'COMPLETO') {
            const equipoRecipients = await UserNotificationResolverService.resolveFromEquipo(resultado.equipoId);
            
            for (const recipient of equipoRecipients) {
              await InternalNotificationService.create({
                tenantEmpresaId: info.tenantEmpresaId,
                userId: recipient.userId,
                type: 'EQUIPO_COMPLETE',
                title: '✅ Equipo con documentación completa',
                message: `El equipo #${resultado.equipoId} ahora tiene toda la documentación aprobada y vigente`,
                link: `/documentos/equipos/${resultado.equipoId}`,
                priority: 'normal',
                equipoId: resultado.equipoId,
                metadata: { equipoId: resultado.equipoId, reason: recipient.reason },
              });
            }
          }
        }
      }
    } catch (error) {
      AppLogger.error('💥 Error procesando evento de documento aprobado', error);
    }
  }

  /**
   * Handler cuando un documento es RECHAZADO
   */
  static async onDocumentRejected(documentId: number, reason?: string): Promise<void> {
    AppLogger.info('📕 Documento rechazado - procesando eventos', { documentId, reason });

    try {
      const info = await obtenerInfoDocumento(documentId);
      if (!info) return;

      await this.notifyDocumentRejection(documentId, info, reason);
      await this.evaluateAndNotifyEquiposIncompletos(documentId, info);
    } catch (error) {
      AppLogger.error('💥 Error procesando evento de documento rechazado', error);
    }
  }

  /**
   * Notifica a usuarios sobre el rechazo de un documento
   */
  private static async notifyDocumentRejection(
    documentId: number,
    info: DocumentInfo,
    reason?: string
  ): Promise<void> {
    const recipients = await UserNotificationResolverService.resolveFromEntity(
      info.tenantEmpresaId,
      info.entityType,
      info.entityId
    );

    AppLogger.info(`📬 Notificando rechazo a ${recipients.length} usuarios`);

    const baseMessage = `${info.templateName} de ${info.entityIdentifier} fue rechazado`;
    const mensaje = reason ? `${baseMessage}: ${reason}` : baseMessage;

    for (const recipient of recipients) {
      const titulo = getTituloContextualizado('⚠️ Documento rechazado', recipient, info.entityType);
      
      await InternalNotificationService.create({
        tenantEmpresaId: info.tenantEmpresaId,
        userId: recipient.userId,
        type: 'DOCUMENT_REJECTED',
        title: titulo,
        message: mensaje,
        link: `/documentos/documentos/${documentId}`,
        priority: 'high',
        documentId,
        metadata: { 
          entityType: info.entityType, 
          entityId: info.entityId,
          reason,
          recipientRole: recipient.role,
        },
      });
    }
  }

  /**
   * Re-evalúa equipos y notifica sobre los que quedaron incompletos
   */
  private static async evaluateAndNotifyEquiposIncompletos(
    documentId: number,
    info: DocumentInfo
  ): Promise<void> {
    const equiposAfectados = await EquipoEvaluationService.buscarEquiposPorEntidad(
      info.tenantEmpresaId,
      info.dadorCargaId,
      info.entityType,
      info.entityId
    );

    if (equiposAfectados.length === 0) return;

    const resultados = await EquipoEvaluationService.evaluarEquipos(
      equiposAfectados.map(e => e.id)
    );

    AppLogger.info('⚠️ Equipos re-evaluados por documento rechazado', {
      documentId,
      equiposAfectados: equiposAfectados.length,
    });

    const equiposIncompletos = resultados.filter(
      r => r.estadoNuevo === 'DOCUMENTACION_INCOMPLETA' && r.cambio
    );

    for (const resultado of equiposIncompletos) {
      await this.notifyEquipoIncompleto(resultado.equipoId, info.tenantEmpresaId, documentId);
    }
  }

  /**
   * Notifica a usuarios sobre un equipo que quedó incompleto
   */
  private static async notifyEquipoIncompleto(
    equipoId: number,
    tenantEmpresaId: number,
    documentId: number
  ): Promise<void> {
    const equipoRecipients = await UserNotificationResolverService.resolveFromEquipo(equipoId);
    
    for (const recipient of equipoRecipients) {
      await InternalNotificationService.create({
        tenantEmpresaId,
        userId: recipient.userId,
        type: 'EQUIPO_INCOMPLETE',
        title: '⚠️ Equipo con documentación incompleta',
        message: `El equipo #${equipoId} requiere atención: documentación rechazada o faltante`,
        link: `/documentos/equipos/${equipoId}`,
        priority: 'high',
        equipoId,
        metadata: { equipoId, documentId, reason: recipient.reason },
      });
    }
  }

  /**
   * Handler cuando un documento VENCE
   */
  static async onDocumentExpired(documentId: number): Promise<void> {
    AppLogger.info('📙 Documento vencido - procesando eventos', { documentId });

    try {
      const info = await obtenerInfoDocumento(documentId);
      if (!info) return;

      // Resolver usuarios a notificar
      const recipients = await UserNotificationResolverService.resolveFromEntity(
        info.tenantEmpresaId,
        info.entityType,
        info.entityId
      );

      AppLogger.info(`📬 Notificando vencimiento a ${recipients.length} usuarios`);

      // Crear notificaciones
      for (const recipient of recipients) {
        const titulo = getTituloContextualizado('🔴 Documento vencido', recipient, info.entityType);
        
        await InternalNotificationService.create({
          tenantEmpresaId: info.tenantEmpresaId,
          userId: recipient.userId,
          type: 'DOCUMENT_EXPIRED',
          title: titulo,
          message: `${info.templateName} de ${info.entityIdentifier} ha vencido`,
          link: `/documentos/documentos/${documentId}`,
          priority: 'urgent',
          documentId,
          metadata: { 
            entityType: info.entityType, 
            entityId: info.entityId,
            recipientRole: recipient.role,
          },
        });
      }

      // Re-evaluar equipos afectados
      const equiposAfectados = await EquipoEvaluationService.buscarEquiposPorEntidad(
        info.tenantEmpresaId,
        info.dadorCargaId,
        info.entityType,
        info.entityId
      );

      if (equiposAfectados.length > 0) {
        const resultados = await EquipoEvaluationService.evaluarEquipos(equiposAfectados.map(e => e.id));

        AppLogger.info('⏰ Equipos re-evaluados por documento vencido', {
          documentId,
          equiposAfectados: equiposAfectados.length,
        });

        // Notificar sobre equipos BLOQUEADOS por documentación vencida
        for (const resultado of resultados) {
          if (resultado.estadoNuevo === 'DOCUMENTACION_VENCIDA' && resultado.cambio) {
            const equipoRecipients = await UserNotificationResolverService.resolveFromEquipo(resultado.equipoId);
            
            for (const recipient of equipoRecipients) {
              await InternalNotificationService.create({
                tenantEmpresaId: info.tenantEmpresaId,
                userId: recipient.userId,
                type: 'EQUIPO_BLOQUEADO',
                title: '🚫 Equipo bloqueado por documentación vencida',
                message: `El equipo #${resultado.equipoId} tiene documentación vencida y no puede operar`,
                link: `/documentos/equipos/${resultado.equipoId}`,
                priority: 'urgent',
                equipoId: resultado.equipoId,
                metadata: { equipoId: resultado.equipoId, documentId, reason: recipient.reason },
              });
            }
          }
        }
      }
    } catch (error) {
      AppLogger.error('💥 Error procesando evento de documento vencido', error);
    }
  }

  /**
   * Handler para documentos próximos a vencer (llamado desde cron)
   */
  static async onDocumentExpiringSoon(documentId: number, daysUntilExpiry: number): Promise<void> {
    AppLogger.info('📒 Documento próximo a vencer', { documentId, daysUntilExpiry });

    try {
      const info = await obtenerInfoDocumento(documentId);
      if (!info) return;

      // Resolver usuarios a notificar
      const recipients = await UserNotificationResolverService.resolveFromEntity(
        info.tenantEmpresaId,
        info.entityType,
        info.entityId
      );

      // Determinar tipo y prioridad según días restantes
      const isUrgent = daysUntilExpiry <= 3;
      const type = isUrgent ? 'DOCUMENT_EXPIRING_URGENT' : 'DOCUMENT_EXPIRING';
      const priority = this.getPriorityByDays(daysUntilExpiry, isUrgent);
      const emoji = isUrgent ? '🔴' : '🟠';

      for (const recipient of recipients) {
        const titulo = getTituloContextualizado(
          `${emoji} Documento próximo a vencer`, 
          recipient, 
          info.entityType
        );
        
        await InternalNotificationService.create({
          tenantEmpresaId: info.tenantEmpresaId,
          userId: recipient.userId,
          type,
          title: titulo,
          message: `${info.templateName} de ${info.entityIdentifier} vence en ${daysUntilExpiry} día${daysUntilExpiry > 1 ? 's' : ''}`,
          link: `/documentos/documentos/${documentId}`,
          priority,
          documentId,
          metadata: { 
            entityType: info.entityType, 
            entityId: info.entityId, 
            daysUntilExpiry,
            recipientRole: recipient.role,
          },
        });
      }

      // Re-evaluar equipos para actualizar estado a POR_VENCER si corresponde
      const equiposAfectados = await EquipoEvaluationService.buscarEquiposPorEntidad(
        info.tenantEmpresaId,
        info.dadorCargaId,
        info.entityType,
        info.entityId
      );

      if (equiposAfectados.length > 0) {
        await EquipoEvaluationService.evaluarEquipos(equiposAfectados.map(e => e.id));
      }
    } catch (error) {
      AppLogger.error('💥 Error procesando evento de documento por vencer', error);
    }
  }

  /**
   * Procesa cambio de estado de documento y dispara el handler apropiado
   */
  static async onDocumentStatusChange(
    documentId: number,
    oldStatus: DocumentStatus,
    newStatus: DocumentStatus,
    reason?: string
  ): Promise<void> {
    AppLogger.info('🔄 Cambio de estado de documento', { documentId, oldStatus, newStatus });

    switch (newStatus) {
      case 'APROBADO':
        await this.onDocumentApproved(documentId);
        break;
      case 'RECHAZADO':
        await this.onDocumentRejected(documentId, reason);
        break;
      case 'VENCIDO':
        await this.onDocumentExpired(documentId);
        break;
      default:
        break;
    }
  }

  /**
   * Determina la prioridad según días hasta vencimiento
   */
  private static getPriorityByDays(daysUntilExpiry: number, isUrgent: boolean): 'urgent' | 'high' | 'normal' {
    if (isUrgent) return 'urgent';
    if (daysUntilExpiry <= 7) return 'high';
    return 'normal';
  }
}
