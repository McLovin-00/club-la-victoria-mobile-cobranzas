import { prisma } from '../config/database';
import {
  Prisma,
  MessageSenderType as PrismaMessageSenderType,
  AttachmentType as PrismaAttachmentType,
} from '@helpdesk/prisma-client';
import { AppLogger } from '../config/logger';
import { webSocketService } from './websocket.service';
import type { TicketMessage, PaginatedResult, PaginationParams } from '../types';
import type { CreateMessageInput } from '../schemas/message.schema';
import telegramService from './telegram.service';
import { getPlatformUserTelegramId } from './platform-user-link.service';
import { escapeTelegramHtml } from '../bot/utils/telegram-html-escape';
import ticketReadStateService from './ticket-read-state.service';
import helpdeskInternalNotificationService from './helpdesk-internal-notification.service';
import helpdeskMediaSyncService from './helpdesk-media-sync.service';

export interface CreateMessageWithAttachments extends CreateMessageInput {
  ticketId: string;
  senderType: 'USER' | 'RESOLVER' | 'SYSTEM';
  senderId?: string;
  senderName: string;
  telegramMessageId?: number;
  userId?: number; // ID del usuario dueño del ticket (para WebSocket)
  attachments?: Array<{
    type: 'IMAGE' | 'AUDIO' | 'VIDEO' | 'DOCUMENT';
    filename: string;
    mimeType: string;
    size: number;
    minioKey: string;
    minioUrl?: string;
  }>;
}

type MessageAttachmentPayload = NonNullable<CreateMessageWithAttachments['attachments']>[number];

type TicketRoutingSnapshot = {
  id: string;
  number: number;
  category: 'TECHNICAL' | 'OPERATIONAL';
  subject: string;
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
      subject: true,
      createdBy: true,
      telegramTopicId: true,
      telegramGroupId: true,
    },
  }) as Promise<TicketRoutingSnapshot | null>;
}

function formatAttachmentSuffix(attachments?: MessageAttachmentPayload[]): string {
  if (!attachments || attachments.length === 0) {
    return '';
  }

  return `\n\n📎 Adjuntos desde la plataforma: ${attachments.length}`;
}

function formatPlatformUserMessageForResolvers(
  ticketNumber: number,
  userName: string,
  content: string,
  attachments?: MessageAttachmentPayload[]
): string {
  return (
    `💬 <b>Nuevo mensaje en Ticket #${ticketNumber}</b>\n\n` +
    `👤 <b>${escapeTelegramHtml(userName)}</b> escribio:\n\n` +
    `${escapeTelegramHtml(content)}` +
    formatAttachmentSuffix(attachments)
  );
}

function formatPlatformResolverMessageForUser(
  ticketNumber: number,
  resolverName: string,
  content: string,
  attachments?: MessageAttachmentPayload[]
): string {
  return (
    `💬 <b>Respuesta en Ticket #${ticketNumber}</b>\n\n` +
    `👤 <b>${escapeTelegramHtml(resolverName)}</b> respondio:\n\n` +
    `${escapeTelegramHtml(content)}` +
    formatAttachmentSuffix(attachments) +
    '\n\n<i>Tambien podes continuar la conversacion desde la plataforma.</i>'
  );
}

async function bridgePlatformUserMessageToTelegram(
  ticketId: string,
  userName: string,
  content: string,
  attachments?: MessageAttachmentPayload[]
): Promise<void> {
  const ticket = await getTicketRoutingSnapshot(ticketId);
  if (!ticket) {
    return;
  }

  const formattedMessage = formatPlatformUserMessageForResolvers(
    ticket.number,
    userName,
    content,
    attachments
  );

  if (ticket.telegramGroupId && ticket.telegramTopicId) {
    await telegramService.sendToTopic(ticket.telegramGroupId, ticket.telegramTopicId, formattedMessage);
    return;
  }

  const resolverConfig = await telegramService.getResolverConfig(ticket.category);
  if (resolverConfig) {
    await telegramService.sendToGroup(resolverConfig.telegramGroupId, formattedMessage);
  }
}

async function bridgePlatformResolverMessageToTelegramUser(
  ticketId: string,
  resolverName: string,
  content: string,
  attachments?: MessageAttachmentPayload[]
): Promise<void> {
  const ticket = await getTicketRoutingSnapshot(ticketId);
  if (!ticket) {
    return;
  }

  const userTelegramId = await getPlatformUserTelegramId(ticket.createdBy);
  if (!userTelegramId) {
    return;
  }

  await telegramService.sendDM(
    userTelegramId,
    formatPlatformResolverMessageForUser(ticket.number, resolverName, content, attachments)
  );
}

/**
 * Crear un nuevo mensaje en un ticket
 */
export const createMessage = async (data: CreateMessageWithAttachments): Promise<TicketMessage> => {
  const message = await prisma.ticketMessage.create({
    data: {
      ticketId: data.ticketId,
      senderType: data.senderType as PrismaMessageSenderType,
      senderId: data.senderId,
      senderName: data.senderName,
      content: data.content,
      telegramMessageId: data.telegramMessageId,
    },
    include: {
      attachments: true,
    },
  });

  // Crear adjuntos si existen
  if (data.attachments && data.attachments.length > 0) {
    await prisma.messageAttachment.createMany({
      data: data.attachments.map((att) => ({
        messageId: message.id,
        type: att.type as PrismaAttachmentType,
        filename: att.filename,
        mimeType: att.mimeType,
        size: att.size,
        minioKey: att.minioKey,
        minioUrl: att.minioUrl,
      })),
    });
  }

  // Obtener mensaje completo con adjuntos
  const fullMessage = await prisma.ticketMessage.findUnique({
    where: { id: message.id },
    include: { attachments: true },
  });

  // Emitir evento WebSocket si tenemos el userId del dueño del ticket
  if (fullMessage && data.userId) {
    webSocketService.emitTicketMessage(data.ticketId, fullMessage as unknown as TicketMessage, data.userId);
  }

  AppLogger.info(`Mensaje creado en ticket ${data.ticketId}`);

  return message as unknown as TicketMessage;
};

/**
 * Obtener mensajes de un ticket con paginación
 */
export const getMessagesByTicket = async (
  ticketId: string,
  pagination: PaginationParams = {}
): Promise<PaginatedResult<TicketMessage>> => {
  const page = pagination.page ?? 1;
  const limit = pagination.limit ?? 50;
  const skip = (page - 1) * limit;

  const [total, messages] = await Promise.all([
    prisma.ticketMessage.count({ where: { ticketId } }),
    prisma.ticketMessage.findMany({
      where: { ticketId },
      orderBy: { createdAt: 'asc' },
      skip,
      take: limit,
      include: {
        attachments: true,
      },
    }),
  ]);

  return {
    data: messages as unknown as TicketMessage[],
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
};

/**
 * Crear mensaje de usuario (desde plataforma)
 */
export const createUserMessage = async (
  ticketId: string,
  userId: number,
  userName: string,
  content: string,
  ticketOwnerId: number,
  attachments?: Array<{
    type: 'IMAGE' | 'AUDIO' | 'VIDEO' | 'DOCUMENT';
    filename: string;
    mimeType: string;
    size: number;
    minioKey: string;
    minioUrl?: string;
  }>,
  source: 'platform' | 'telegram' = 'platform'
): Promise<TicketMessage> => {
  const message = await createMessage({
    ticketId,
    content,
    senderType: 'USER',
    senderId: String(userId),
    senderName: userName,
    userId: ticketOwnerId,
    attachments,
  });

  try {
    await ticketReadStateService.markAsRead(ticketId, userId);
  } catch (error) {
    AppLogger.error('Error updating read state for user message:', error);
  }

  if (source === 'platform') {
    try {
      await bridgePlatformUserMessageToTelegram(ticketId, userName, content, attachments);
    } catch (error) {
      AppLogger.error('Error bridging platform user message to Telegram:', error);
    }

    try {
      if (attachments && attachments.length > 0) {
        await helpdeskMediaSyncService.queueAttachmentsToResolvers(ticketId, userName, attachments);
      }
    } catch (error) {
      AppLogger.error('Error queueing platform attachments to resolver side:', error);
    }
  }

  return message;
};

/**
 * Crear mensaje de resolvedor (Telegram o plataforma web).
 */
export const createResolverMessage = async (
  ticketId: string,
  resolverName: string,
  content: string,
  ticketOwnerId: number,
  telegramMessageId?: number,
  attachments?: Array<{
    type: 'IMAGE' | 'AUDIO' | 'VIDEO' | 'DOCUMENT';
    filename: string;
    mimeType: string;
    size: number;
    minioKey: string;
    minioUrl?: string;
  }>,
  platformResolverUserId?: number,
  source?: 'platform' | 'telegram'
): Promise<TicketMessage> => {
  const message = await createMessage({
    ticketId,
    content,
    senderType: 'RESOLVER',
    senderId: platformResolverUserId != null ? String(platformResolverUserId) : undefined,
    senderName: resolverName,
    telegramMessageId,
    userId: ticketOwnerId,
    attachments,
  });

  if (platformResolverUserId != null) {
    try {
      await ticketReadStateService.markAsRead(ticketId, platformResolverUserId);
    } catch (error) {
      AppLogger.error('Error updating read state for resolver message:', error);
    }
  }

  const resolvedSource = source ?? (platformResolverUserId != null ? 'platform' : 'telegram');
  if (resolvedSource === 'platform') {
    try {
      await bridgePlatformResolverMessageToTelegramUser(ticketId, resolverName, content, attachments);
    } catch (error) {
      AppLogger.error('Error bridging platform resolver message to Telegram user:', error);
    }

    try {
      if (attachments && attachments.length > 0) {
        await helpdeskMediaSyncService.queueAttachmentsToUser(ticketId, resolverName, attachments);
      }
    } catch (error) {
      AppLogger.error('Error queueing platform attachments to ticket creator:', error);
    }
  }

  try {
    const ticket = await getTicketRoutingSnapshot(ticketId);
    if (ticket) {
      await helpdeskInternalNotificationService.notifyTicketResponseToUser(ticket as any, resolverName);
    }
  } catch (error) {
    AppLogger.error('Error creating internal notification for resolver message:', error);
  }

  return message;
};

/**
 * Crear mensaje de sistema
 */
export const createSystemMessage = async (
  ticketId: string,
  content: string,
  ticketOwnerId?: number
): Promise<TicketMessage> => {
  return createMessage({
    ticketId,
    content,
    senderType: 'SYSTEM',
    senderName: 'Sistema',
    userId: ticketOwnerId,
  });
};

export const messageService = {
  create: createMessage,
  getByTicket: getMessagesByTicket,
  createUser: createUserMessage,
  createResolver: createResolverMessage,
  createSystem: createSystemMessage,
};

export default messageService;
