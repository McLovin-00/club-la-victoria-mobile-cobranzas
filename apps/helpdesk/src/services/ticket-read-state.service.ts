import { prisma } from '../config/database';
import type { TicketViewerContext } from '../types';

export interface HelpdeskUnreadSummary {
  unreadTickets: number;
  unreadMessages: number;
}

type UnreadSummaryRow = {
  unread_tickets: bigint | number;
  unread_messages: bigint | number;
};

function toCount(value: bigint | number | null | undefined): number {
  if (value == null) {
    return 0;
  }

  return typeof value === 'bigint' ? Number(value) : value;
}

function buildVisibilitySql(viewer: TicketViewerContext): string {
  if (viewer.role === 'SUPERADMIN') {
    return 'TRUE';
  }

  if (viewer.role === 'ADMIN' || viewer.role === 'ADMIN_INTERNO') {
    if (viewer.empresaId == null) {
      return 'FALSE';
    }

    return `t.empresa_id = ${viewer.empresaId}`;
  }

  return `t."createdBy" = ${viewer.userId}`;
}

export async function markTicketAsRead(ticketId: string, userId: number, when: Date = new Date()): Promise<void> {
  await prisma.$executeRawUnsafe(
    `
      INSERT INTO "ticket_read_states" ("ticket_id", "user_id", "last_read_at", "created_at", "updated_at")
      VALUES ($1, $2, $3, NOW(), NOW())
      ON CONFLICT ("ticket_id", "user_id")
      DO UPDATE SET "last_read_at" = EXCLUDED."last_read_at", "updated_at" = NOW()
    `,
    ticketId,
    userId,
    when
  );
}

export async function getUnreadSummaryForViewer(
  viewer: TicketViewerContext
): Promise<HelpdeskUnreadSummary> {
  const visibilitySql = buildVisibilitySql(viewer);

  const rows = await prisma.$queryRawUnsafe<UnreadSummaryRow[]>(
    `
      WITH visible_tickets AS (
        SELECT t.id
        FROM "tickets" t
        WHERE ${visibilitySql}
      ),
      visible_messages AS (
        SELECT
          tm."ticket_id",
          tm."created_at"
        FROM "ticket_messages" tm
        INNER JOIN visible_tickets vt ON vt.id = tm."ticket_id"
        WHERE tm."sender_id" IS NULL OR tm."sender_id" <> $1
      ),
      unread_messages AS (
        SELECT vm."ticket_id"
        FROM visible_messages vm
        LEFT JOIN "ticket_read_states" trs
          ON trs."ticket_id" = vm."ticket_id"
         AND trs."user_id" = $2
        WHERE trs."last_read_at" IS NULL OR vm."created_at" > trs."last_read_at"
      )
      SELECT
        COUNT(DISTINCT um."ticket_id")::bigint AS unread_tickets,
        COUNT(*)::bigint AS unread_messages
      FROM unread_messages um
    `,
    String(viewer.userId),
    viewer.userId
  );

  const row = rows[0];

  return {
    unreadTickets: toCount(row?.unread_tickets),
    unreadMessages: toCount(row?.unread_messages),
  };
}

export const ticketReadStateService = {
  markAsRead: markTicketAsRead,
  getUnreadSummaryForViewer,
};

export default ticketReadStateService;
