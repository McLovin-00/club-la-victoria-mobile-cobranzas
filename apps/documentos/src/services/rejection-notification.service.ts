import { AppLogger } from '../config/logger';
import { DocumentStakeholdersService } from './document-stakeholders.service';
import { InternalNotificationService } from './internal-notification.service';
import { db } from '../config/database';

/**
 * Servicio para enviar notificaciones internas de rechazo de documentos
 */
export class RejectionNotificationService {
  
  /**
   * Notificar rechazo de documento a todos los stakeholders
   */
  static async notifyDocumentRejection(documentId: number, rejectionReason: string): Promise<void> {
    try {
      AppLogger.info(`📢 Enviando notificaciones de rechazo para documento ${documentId}`);

      // 1. Obtener documento con detalles
      const document = await db.getClient().document.findUnique({
        where: { id: documentId },
        include: {
          template: { select: { name: true } },
        },
      });

      if (!document) {
        AppLogger.warn(`Documento ${documentId} no encontrado`);
        return;
      }

      // 2. Obtener nombre de la entidad
      const entityName = await this.getEntityName(document.entityType, document.entityId);

      // 3. Obtener todos los stakeholders
      const stakeholders = await DocumentStakeholdersService.getDocumentStakeholders(documentId);

      if (stakeholders.length === 0) {
        AppLogger.warn(`No se encontraron stakeholders para documento ${documentId}`);
        return;
      }

      // 4. Enviar notificaciones internas a todos los stakeholders
      await this.sendInternalNotifications(document, rejectionReason, stakeholders, entityName);

      AppLogger.info(`✅ Notificaciones de rechazo enviadas para documento ${documentId}`);
    } catch (error) {
      AppLogger.error('💥 Error enviando notificaciones de rechazo:', error);
    }
  }

  /**
   * Construir título y mensaje de notificación
   */
  private static buildNotificationContent(data: {
    documentType: string;
    entityType: string;
    entityName: string;
    rejectionReason: string;
  }): { title: string; message: string } {
    return {
      title: `Documento Rechazado: ${data.documentType}`,
      message: `El documento "${data.documentType}" de ${this.translateEntityType(data.entityType)} "${data.entityName}" ha sido rechazado. Motivo: ${data.rejectionReason}`,
    };
  }

  /**
   * Enviar notificaciones internas a todos los stakeholders
   */
  private static async sendInternalNotifications(
    document: any,
    rejectionReason: string,
    stakeholders: any[],
    entityName: string
  ): Promise<void> {
    try {
      if (stakeholders.length === 0) {
        AppLogger.warn(`No hay stakeholders para notificar sobre documento ${document.id}`);
        return;
      }

      const { title, message } = this.buildNotificationContent({
        documentType: document.template.name,
        entityType: document.entityType,
        entityName,
        rejectionReason,
      });

      const link = `/documentos/document/${document.id}`;

      // Crear notificaciones para todos los stakeholders
      const notificationsData = stakeholders.map((stakeholder) => ({
        tenantEmpresaId: stakeholder.tenantEmpresaId,
        userId: stakeholder.userId,
        type: 'DOCUMENT_REJECTED' as const,
        title,
        message,
        link,
        priority: 'high' as const,
        documentId: document.id,
        metadata: {
          documentType: document.template.name,
          entityType: document.entityType,
          entityName,
          rejectionReason,
          stakeholderRole: stakeholder.role,
        },
      }));

      await InternalNotificationService.createMany(notificationsData);

      AppLogger.info(`📬 ${notificationsData.length} notificaciones internas creadas para documento ${document.id}`);
    } catch (error) {
      AppLogger.error('Error enviando notificaciones internas:', error);
    }
  }

  /**
   * Obtener nombre de la entidad
   */
  private static async getEntityName(entityType: string, entityId: number): Promise<string> {
    try {
      switch (entityType) {
        case 'CHOFER': {
          const chofer = await db.getClient().chofer.findUnique({
            where: { id: entityId },
            select: { nombre: true, apellido: true, dni: true },
          });
          return chofer ? `${chofer.nombre} ${chofer.apellido} (DNI: ${chofer.dni})` : `Chofer #${entityId}`;
        }
        case 'CAMION': {
          const camion = await db.getClient().camion.findUnique({
            where: { id: entityId },
            select: { patente: true },
          });
          return camion ? `Camión ${camion.patente}` : `Camión #${entityId}`;
        }
        case 'ACOPLADO': {
          const acoplado = await db.getClient().acoplado.findUnique({
            where: { id: entityId },
            select: { patente: true },
          });
          return acoplado ? `Acoplado ${acoplado.patente}` : `Acoplado #${entityId}`;
        }
        case 'EMPRESA_TRANSPORTISTA': {
          const empresa = await db.getClient().empresaTransportista.findUnique({
            where: { id: entityId },
            select: { razonSocial: true },
          });
          return empresa ? empresa.razonSocial : `Empresa #${entityId}`;
        }
        case 'DADOR': {
          const dador = await db.getClient().dadorCarga.findUnique({
            where: { id: entityId },
            select: { razonSocial: true },
          });
          return dador ? dador.razonSocial : `Dador #${entityId}`;
        }
        default:
          return `Entidad #${entityId}`;
      }
    } catch (error) {
      AppLogger.error('Error obteniendo nombre de entidad:', error);
      return `Entidad #${entityId}`;
    }
  }

  /**
   * Traducir tipo de entidad
   */
  private static translateEntityType(entityType: string): string {
    const translations: Record<string, string> = {
      CHOFER: 'Chofer',
      CAMION: 'Camión',
      ACOPLADO: 'Acoplado',
      EMPRESA_TRANSPORTISTA: 'Empresa Transportista',
      DADOR: 'Dador de Carga',
    };
    return translations[entityType] || entityType;
  }
}
