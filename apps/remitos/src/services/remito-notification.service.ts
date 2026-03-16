import { db } from '../config/database';
import { AppLogger } from '../config/logger';

type RemitoNotificationType = 'REMITO_RECHAZADO' | 'REMITO_APROBADO';

interface RemitoNotificationData {
  remitoId: number;
  tenantEmpresaId: number;
  dadorCargaId: number;
  cargadoPorUserId: number;
  cargadoPorRol: string;
  actionUserId: number;
  numeroRemito: string | null;
  choferId?: number | null;
  empresaTransportistaId?: number | null;
  motivo?: string;
}

interface NotificationRecipient {
  user_id: number;
  tenant_empresa_id: number;
}

/**
 * Inserta notificaciones internas para eventos de remitos
 * usando raw SQL contra documentos.internal_notifications
 * (misma instancia PostgreSQL, schema diferente).
 */
export class RemitoNotificationService {

  static async notifyRejection(data: RemitoNotificationData): Promise<void> {
    try {
      const recipients = await this.resolveRecipients(data);
      if (recipients.length === 0) return;

      const label = data.numeroRemito
        ? `Remito #${data.numeroRemito.slice(0, 50)}`
        : `Remito ID ${data.remitoId}`;
      const title = `Remito Rechazado: ${label}`.slice(0, 200);
      const message = data.motivo
        ? `El ${label} ha sido rechazado. Motivo: ${data.motivo.slice(0, 500)}`
        : `El ${label} ha sido rechazado.`;

      await this.insertNotifications(recipients, {
        type: 'REMITO_RECHAZADO',
        title,
        message,
        link: `/remitos/${data.remitoId}`,
        priority: 'high',
        remitoId: data.remitoId,
        metadata: { numeroRemito: data.numeroRemito, motivo: data.motivo },
      });

      AppLogger.info(`📬 ${recipients.length} notificaciones de rechazo creadas para remito ${data.remitoId}`);
    } catch (error) {
      AppLogger.error('Error enviando notificaciones de rechazo de remito:', error);
    }
  }

  static async notifyApproval(data: RemitoNotificationData): Promise<void> {
    try {
      const recipients = await this.resolveRecipients(data);
      if (recipients.length === 0) return;

      const label = data.numeroRemito
        ? `Remito #${data.numeroRemito.slice(0, 50)}`
        : `Remito ID ${data.remitoId}`;
      const title = `Remito Aprobado: ${label}`.slice(0, 200);
      const message = `El ${label} ha sido aprobado exitosamente.`;

      await this.insertNotifications(recipients, {
        type: 'REMITO_APROBADO',
        title,
        message,
        link: `/remitos/${data.remitoId}`,
        priority: 'normal',
        remitoId: data.remitoId,
        metadata: { numeroRemito: data.numeroRemito },
      });

      AppLogger.info(`📬 ${recipients.length} notificaciones de aprobación creadas para remito ${data.remitoId}`);
    } catch (error) {
      AppLogger.error('Error enviando notificaciones de aprobación de remito:', error);
    }
  }

  /**
   * Cadena completa de notificación:
   * - SUPERADMIN / ADMIN_INTERNO del tenant (siempre)
   * - Dador de carga vinculado al remito
   * - Transportista (si existe empresaTransportistaId)
   * - Chofer (si existe choferId)
   * Se excluye al usuario que ejecutó la acción.
   */
  private static async resolveRecipients(data: RemitoNotificationData): Promise<NotificationRecipient[]> {
    const prisma = db.getClient();
    const recipientMap = new Map<number, NotificationRecipient>();
    const tenantId = data.tenantEmpresaId;

    const addRows = (rows: NotificationRecipient[]) => {
      for (const row of rows) {
        const uid = Number(row.user_id);
        if (!recipientMap.has(uid)) {
          recipientMap.set(uid, { user_id: uid, tenant_empresa_id: Number(row.tenant_empresa_id) });
        }
      }
    };

    const admins = await prisma.$queryRawUnsafe<NotificationRecipient[]>(
      `SELECT id AS user_id, empresa_id AS tenant_empresa_id
       FROM platform.platform_users
       WHERE empresa_id = $1
         AND role IN ('SUPERADMIN', 'ADMIN_INTERNO')
         AND activo = true AND deleted_at IS NULL`,
      tenantId,
    );
    addRows(admins);

    const dadores = await prisma.$queryRawUnsafe<NotificationRecipient[]>(
      `SELECT id AS user_id, empresa_id AS tenant_empresa_id
       FROM platform.platform_users
       WHERE dador_carga_id = $1
         AND role = 'DADOR_DE_CARGA'
         AND activo = true AND deleted_at IS NULL`,
      data.dadorCargaId,
    );
    addRows(dadores);

    if (data.empresaTransportistaId) {
      const transportistas = await prisma.$queryRawUnsafe<NotificationRecipient[]>(
        `SELECT id AS user_id, empresa_id AS tenant_empresa_id
         FROM platform.platform_users
         WHERE empresa_transportista_id = $1
           AND role = 'TRANSPORTISTA'
           AND activo = true AND deleted_at IS NULL`,
        data.empresaTransportistaId,
      );
      addRows(transportistas);
    }

    if (data.choferId) {
      const choferes = await prisma.$queryRawUnsafe<NotificationRecipient[]>(
        `SELECT id AS user_id, empresa_id AS tenant_empresa_id
         FROM platform.platform_users
         WHERE chofer_id = $1
           AND role = 'CHOFER'
           AND activo = true AND deleted_at IS NULL`,
        data.choferId,
      );
      addRows(choferes);
    }

    recipientMap.delete(data.actionUserId);

    return Array.from(recipientMap.values());
  }

  private static async insertNotifications(
    recipients: NotificationRecipient[],
    payload: {
      type: RemitoNotificationType;
      title: string;
      message: string;
      link: string;
      priority: string;
      remitoId: number;
      metadata: Record<string, unknown>;
    },
  ): Promise<void> {
    const prisma = db.getClient();
    const metaJson = JSON.stringify(payload.metadata);

    for (const recipient of recipients) {
      await prisma.$executeRawUnsafe(
        `INSERT INTO documentos.internal_notifications
          (tenant_empresa_id, user_id, type, title, message, link, priority, metadata, remito_id, created_at, updated_at)
         VALUES ($1, $2, $3::documentos."InternalNotificationType", $4, $5, $6, $7::documentos."NotificationPriority", $8::jsonb, $9, NOW(), NOW())`,
        recipient.tenant_empresa_id,
        recipient.user_id,
        payload.type,
        payload.title,
        payload.message,
        payload.link,
        payload.priority,
        metaJson,
        payload.remitoId,
      );
    }
  }
}
