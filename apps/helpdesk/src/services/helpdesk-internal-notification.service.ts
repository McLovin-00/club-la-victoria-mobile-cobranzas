import { prisma } from '../config/database';
import { AppLogger } from '../config/logger';
import type { Ticket } from '../types';
import { webSocketService } from './websocket.service';

export type HelpdeskInternalNotificationType =
  | 'HELPDESK_NEW_TICKET'
  | 'HELPDESK_NEW_RESPONSE'
  | 'HELPDESK_TICKET_CLOSED'
  | 'HELPDESK_TICKET_REOPENED';

type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent';

interface NotificationRecipient {
  id: number;
}

interface NotificationPayload {
  tenantEmpresaId: number;
  userId: number;
  type: HelpdeskInternalNotificationType;
  title: string;
  message: string;
  link?: string;
  priority?: NotificationPriority;
  metadata?: Record<string, unknown>;
}

async function createNotification(payload: NotificationPayload): Promise<void> {
  const rows = await prisma.$queryRawUnsafe<Array<{ id: number; created_at: Date }>>(
    `
      INSERT INTO "documentos"."internal_notifications"
        ("tenant_empresa_id", "user_id", "type", "title", "message", "link", "priority", "metadata", "created_at", "updated_at")
      VALUES
        ($1, $2, $3::"documentos"."InternalNotificationType", $4, $5, $6, $7::"documentos"."NotificationPriority", $8::jsonb, NOW(), NOW())
      RETURNING id, created_at
    `,
    payload.tenantEmpresaId,
    payload.userId,
    payload.type,
    payload.title,
    payload.message,
    payload.link ?? null,
    payload.priority ?? 'normal',
    JSON.stringify(payload.metadata ?? {})
  );

  const inserted = rows[0];
  if (inserted) {
    webSocketService.notifyUser(payload.userId, {
      type: 'NEW_NOTIFICATION',
      notification: {
        id: inserted.id,
        type: payload.type,
        title: payload.title,
        message: payload.message,
        link: payload.link,
        priority: payload.priority ?? 'normal',
        createdAt: inserted.created_at,
      },
    });
  }
}

async function getTenantStaffRecipients(empresaId: number | null | undefined): Promise<NotificationRecipient[]> {
  if (empresaId == null) {
    return prisma.$queryRawUnsafe<NotificationRecipient[]>(
      `
        SELECT id
        FROM "platform"."platform_users"
        WHERE activo = true
          AND role IN ('SUPERADMIN')
      `
    );
  }

  return prisma.$queryRawUnsafe<NotificationRecipient[]>(
    `
      SELECT id
      FROM "platform"."platform_users"
      WHERE activo = true
        AND empresa_id = $1
        AND role IN ('SUPERADMIN', 'ADMIN', 'ADMIN_INTERNO', 'RESOLVER')
    `,
    empresaId
  );
}

export async function notifyNewTicketToStaff(ticket: Ticket): Promise<void> {
  if (ticket.empresaId == null) {
    return;
  }

  const recipients = await getTenantStaffRecipients(ticket.empresaId);

  await Promise.all(
    recipients
      .filter(recipient => recipient.id !== ticket.createdBy)
      .map(recipient =>
        createNotification({
          tenantEmpresaId: ticket.empresaId as number,
          userId: recipient.id,
          type: 'HELPDESK_NEW_TICKET',
          title: `Nuevo ticket #${ticket.number}`,
          message: `${ticket.createdByName} creó ${ticket.subject}`,
          link: `/admin/helpdesk/${ticket.id}`,
          priority: ticket.priority === 'HIGH' ? 'high' : 'normal',
          metadata: {
            ticketId: ticket.id,
            ticketNumber: ticket.number,
            category: ticket.category,
            source: ticket.source,
          },
        })
      )
  );
}

export async function notifyTicketResponseToUser(
  ticket: Ticket,
  responderName: string
): Promise<void> {
  if (ticket.empresaId == null) {
    return;
  }

  await createNotification({
    tenantEmpresaId: ticket.empresaId,
    userId: ticket.createdBy,
    type: 'HELPDESK_NEW_RESPONSE',
    title: `Nueva respuesta en ticket #${ticket.number}`,
    message: `${responderName} respondió tu ticket ${ticket.subject}`,
    link: `/helpdesk/${ticket.id}`,
    priority: 'high',
    metadata: {
      ticketId: ticket.id,
      ticketNumber: ticket.number,
    },
  });
}

export async function notifyTicketReopenedToStaff(ticket: Ticket): Promise<void> {
  if (ticket.empresaId == null) {
    return;
  }

  const recipients = await getTenantStaffRecipients(ticket.empresaId);
  await Promise.all(
    recipients
      .filter(recipient => recipient.id !== ticket.createdBy)
      .map(recipient =>
        createNotification({
          tenantEmpresaId: ticket.empresaId as number,
          userId: recipient.id,
          type: 'HELPDESK_TICKET_REOPENED',
          title: `Ticket reabierto #${ticket.number}`,
          message: `${ticket.createdByName} reabrió ${ticket.subject}`,
          link: `/admin/helpdesk/${ticket.id}`,
          priority: 'high',
          metadata: {
            ticketId: ticket.id,
            ticketNumber: ticket.number,
          },
        })
      )
  );
}

export async function notifyTicketClosedToUser(
  ticket: Ticket,
  closedByLabel: string
): Promise<void> {
  if (ticket.empresaId == null) {
    return;
  }

  await createNotification({
    tenantEmpresaId: ticket.empresaId,
    userId: ticket.createdBy,
    type: 'HELPDESK_TICKET_CLOSED',
    title: `Ticket cerrado #${ticket.number}`,
    message: `${closedByLabel} cerró tu ticket ${ticket.subject}`,
    link: `/helpdesk/${ticket.id}`,
    priority: 'normal',
    metadata: {
      ticketId: ticket.id,
      ticketNumber: ticket.number,
    },
  });
}

export const helpdeskInternalNotificationService = {
  notifyNewTicketToStaff,
  notifyTicketResponseToUser,
  notifyTicketReopenedToStaff,
  notifyTicketClosedToUser,
};

export default helpdeskInternalNotificationService;
