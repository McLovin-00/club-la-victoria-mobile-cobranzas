/**
 * Handler de mensajes en supergrupos de resolvers: texto y adjuntos asociados al ticket,
 * notificación al creador por DM (incluye reenvío del multimedia con copyMessage).
 */

import { Composer } from 'grammy';
import { IdentifiedContext } from '../middleware/identify';
import { telegramService } from '../../services/telegram.service';
import messageService from '../../services/message.service';
import { AppLogger } from '../../config/logger';
import { getPlatformUserTelegramId } from '../../services/platform-user-link.service';
import { persistTelegramAttachment } from '../utils/telegram-attachments';
import { escapeTelegramHtml } from '../utils/telegram-html-escape';

const group = new Composer<IdentifiedContext>();

group.on('message:text', async (ctx, next) => {
  if (ctx.chat?.type !== 'supergroup') {
    await next();
    return;
  }

  if (!ctx.session?.isAuthenticated || !ctx.session.userId) {
    AppLogger.warn('Unauthenticated user tried to respond in resolver group');
    return;
  }

  const text = ctx.message.text.trim();
  if (text.startsWith('/')) return;

  try {
    const ticket = await resolveTicketFromGroupContext(ctx);
    if (!ticket) {
      AppLogger.warn('No ticket found for resolver group message');
      return;
    }

    if (ticket.status === 'CLOSED') {
      await ctx.reply('⚠️ Este ticket está cerrado. Si el usuario necesita continuar, debe reabrirlo desde la aplicación.');
      return;
    }

    const senderName = ctx.session.userName || ctx.from?.username || 'Resolver';
    
    await messageService.createResolver(
      ticket.id,
      senderName,
      text,
      ticket.createdBy,
      ctx.message?.message_id,
      undefined,
      ctx.session.userId,
      'telegram'
    );

    const userTelegramId = await getUserTelegramId(ticket.createdBy);
    if (userTelegramId) {
      await telegramService.sendDM(userTelegramId, formatResolverMessage(ticket.number, text, senderName));
    }

    AppLogger.info(`Resolver ${ctx.session.userId} responded to ticket #${ticket.number}`);
  } catch (error) {
    AppLogger.error('Error processing group message:', error);
  }
});

group.on(['message:photo', 'message:document', 'message:audio', 'message:video'], async (ctx, next) => {
  if (ctx.chat?.type !== 'supergroup') {
    await next();
    return;
  }

  if (!ctx.session?.isAuthenticated || !ctx.session.userId) return;

  try {
    const ticket = await resolveTicketFromGroupContext(ctx);
    if (!ticket || ticket.status === 'CLOSED') return;

    const attachment = await persistTelegramAttachment(ctx, ticket.id);
    if (!attachment) {
      return;
    }

    const senderName = ctx.session.userName || ctx.from?.username || 'Resolver';
    const caption = getMessageCaption(ctx);
    const messageContent =
      caption.length > 0
        ? caption
        : `📎 ${attachment.filename}\n\n<i>Archivo adjunto disponible para descarga desde el ticket.</i>`;

    await messageService.createResolver(
      ticket.id,
      senderName,
      messageContent,
      ticket.createdBy,
      ctx.message?.message_id,
      [attachment],
      ctx.session.userId,
      'telegram'
    );

    const userTelegramId = await getUserTelegramId(ticket.createdBy);
    if (userTelegramId) {
      await notifyCreatorResolverAttachmentDm(
        ctx,
        userTelegramId,
        ticket.number,
        senderName,
        caption,
        attachment.filename
      );
    }

    AppLogger.info(`Resolver ${ctx.session.userId} sent attachment to ticket #${ticket.number}`);
  } catch (error) {
    AppLogger.error('Error processing group attachment:', error);
  }
});

async function getUserTelegramId(userId: number): Promise<number | null> {
  return getPlatformUserTelegramId(userId);
}

function formatResolverMessage(ticketNumber: number, message: string, resolverName: string): string {
  return `
💬 <b>Respuesta en Ticket #${ticketNumber}</b>

👤 <b>${resolverName}</b> respondió:

${message}

---
<i>Para responder, usá la aplicación o respondé a este mensaje.</i>
  `.trim();
}

function getMessageCaption(ctx: IdentifiedContext): string {
  const message = ctx.message;
  if (!message) return '';
  if ('caption' in message && typeof message.caption === 'string') {
    return message.caption.trim().slice(0, 5000);
  }
  return '';
}

async function resolveTicketFromGroupContext(ctx: IdentifiedContext) {
  const topicId = ctx.message?.message_thread_id;
  if (topicId) {
    return telegramService.getTicketByTopicId(topicId);
  }

  const boundedCurrentText = (ctx.message?.text || '').slice(0, 256);
  const boundedReplyText = (
    ctx.message?.reply_to_message?.text ||
    ctx.message?.reply_to_message?.caption ||
    ''
  ).slice(0, 256);

  const numberFromReply = extractTicketNumber(boundedReplyText);
  if (numberFromReply) {
    return telegramService.getTicketByNumber(numberFromReply);
  }

  const numberFromCurrent = extractTicketNumber(boundedCurrentText);
  if (numberFromCurrent) {
    return telegramService.getTicketByNumber(numberFromCurrent);
  }

  return null;
}

function extractTicketNumber(text: string): number | null {
  const match = /#(\d{1,6})/.exec(text);
  const numberPart = match?.[1];
  if (!numberPart) return null;
  const ticketNumber = Number.parseInt(numberPart, 10);
  return Number.isFinite(ticketNumber) ? ticketNumber : null;
}

/**
 * Notifica al creador del ticket: mensaje de contexto y copia del multimedia
 * tal como lo envió el resolver (foto, video, audio, documento).
 */
async function notifyCreatorResolverAttachmentDm(
  ctx: IdentifiedContext,
  userTelegramId: number,
  ticketNumber: number,
  senderName: string,
  caption: string,
  attachmentFilename: string
): Promise<void> {
  const captionBlock =
    caption.length > 0 ? `\n\n${escapeTelegramHtml(caption)}` : '';
  await telegramService.sendDM(
    userTelegramId,
    `📎 <b>Nuevo archivo en Ticket #${ticketNumber}</b>\n` +
      `👤 <b>${escapeTelegramHtml(senderName)}</b>${captionBlock}\n\n` +
      '<i>A continuación se reenvía el archivo.</i>'
  );

  const chatId = ctx.chat?.id;
  const messageId = ctx.message?.message_id;
  if (chatId === undefined || messageId === undefined) {
    return;
  }

  try {
    await ctx.api.copyMessage(userTelegramId, chatId, messageId);
  } catch (error) {
    AppLogger.error('Error copiando adjunto del resolver al DM del usuario:', error);
    await telegramService.sendDM(
      userTelegramId,
      `⚠️ No se pudo reenviar el archivo por Telegram.\n` +
        `Archivo: <code>${escapeTelegramHtml(attachmentFilename.slice(0, 256))}</code>\n\n` +
        'Revisá la plataforma o el grupo del ticket.'
    );
  }
}

export default group;
