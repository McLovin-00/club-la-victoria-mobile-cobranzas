import { queueService } from './queue.service';
import { prisma } from '../config/database';
import { getPlatformUserTelegramId } from './platform-user-link.service';
import telegramService from './telegram.service';
import { escapeTelegramHtml } from '../bot/utils/telegram-html-escape';
import type { MediaSyncJobPayload } from '../workers/media-sync.worker';

type AttachmentPayload = {
  type: 'IMAGE' | 'AUDIO' | 'VIDEO' | 'DOCUMENT';
  filename: string;
  mimeType: string;
  minioKey: string;
};

type TicketRoutingSnapshot = {
  id: string;
  number: number;
  category: 'TECHNICAL' | 'OPERATIONAL';
  createdBy: number;
  telegramTopicId: number | null;
  telegramGroupId: string | null;
};

async function getTicketRoutingSnapshot(ticketId: string): Promise<TicketRoutingSnapshot | null> {
  return prisma.ticket.findUnique({
    where: { id: ticketId },
    select: {
      id: true,
      number: true,
      category: true,
      createdBy: true,
      telegramTopicId: true,
      telegramGroupId: true,
    },
  }) as Promise<TicketRoutingSnapshot | null>;
}

async function enqueueJob(payload: MediaSyncJobPayload): Promise<void> {
  await queueService.addJob('media-sync', { type: 'sync-telegram-attachment', payload });
}

export async function queueAttachmentsToResolvers(
  ticketId: string,
  senderName: string,
  attachments: AttachmentPayload[]
): Promise<void> {
  if (attachments.length === 0) {
    return;
  }

  const ticket = await getTicketRoutingSnapshot(ticketId);
  if (!ticket) {
    return;
  }

  let destination: MediaSyncJobPayload['destination'] | null = null;
  if (ticket.telegramGroupId && ticket.telegramTopicId) {
    destination = {
      type: 'topic',
      groupId: ticket.telegramGroupId,
      topicId: ticket.telegramTopicId,
    };
  } else {
    const resolverConfig = await telegramService.getResolverConfig(ticket.category);
    if (resolverConfig) {
      destination = {
        type: 'group',
        groupId: resolverConfig.telegramGroupId,
      };
    }
  }

  if (!destination) {
    return;
  }

  await Promise.all(
    attachments.map(attachment =>
      enqueueJob({
        attachment,
        caption: `📎 <b>Adjunto desde la plataforma</b>\nTicket #${ticket.number}\n${escapeTelegramHtml(senderName)} envió ${escapeTelegramHtml(attachment.filename)}`,
        destination,
      })
    )
  );
}

export async function queueAttachmentsToUser(
  ticketId: string,
  senderName: string,
  attachments: AttachmentPayload[]
): Promise<void> {
  if (attachments.length === 0) {
    return;
  }

  const ticket = await getTicketRoutingSnapshot(ticketId);
  if (!ticket) {
    return;
  }

  const telegramUserId = await getPlatformUserTelegramId(ticket.createdBy);
  if (!telegramUserId) {
    return;
  }

  await Promise.all(
    attachments.map(attachment =>
      enqueueJob({
        attachment,
        caption: `📎 <b>Adjunto de soporte</b>\nTicket #${ticket.number}\n${escapeTelegramHtml(senderName)} envió ${escapeTelegramHtml(attachment.filename)}`,
        destination: {
          type: 'dm',
          telegramUserId,
        },
      })
    )
  );
}

export const helpdeskMediaSyncService = {
  queueAttachmentsToResolvers,
  queueAttachmentsToUser,
};

export default helpdeskMediaSyncService;
