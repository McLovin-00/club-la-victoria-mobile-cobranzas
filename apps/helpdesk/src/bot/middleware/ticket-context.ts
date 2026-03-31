/**
 * Ticket Context Middleware
 * Resolves ticket from command context and returns it with reply helper
 */

import { Middleware } from 'grammy';
import { IdentifiedContext } from './identify';
import { telegramService } from '../../services/telegram.service';
import type { Ticket } from '../../types';

/**
 * Options for ticket context resolution
 */
export interface TicketContextOptions {
  /** Reply with error message if ticket not found */
  replyOnError?: boolean;
  /** Custom error message */
  errorMessage?: string;
  /** Include usage instructions in error message */
  showUsage?: boolean;
}

/**
 * Middleware that resolves ticket from command context (topic, reply, or text match)
 * and injects it into context for use in command handlers.
 */
export function requireTicketContext(
  options: TicketContextOptions = {}
): Middleware<IdentifiedContext> {
  const { replyOnError = true, errorMessage, showUsage = true } = options;

  return async (ctx, next) => {
    const ticket = await resolveTicketFromContext(ctx);

    if (!ticket) {
      if (replyOnError) {
        const baseMessage = errorMessage || 'No se pudo encontrar el ticket.';
        const usageHint = showUsage
          ? '\n\n<b>Uso:</b> Responde a un mensaje de ticket o incluye #NUMERO en tu mensaje.'
          : '';
        await ctx.reply(`❌ ${baseMessage}${usageHint}`, { parse_mode: 'HTML' });
      }
      return;
    }

    // Inject ticket into context for command handlers
    ctx.ticketContext = ticket;
    return next();
  };
}

/**
 * Resolves ticket from various context sources in priority order:
 * 1. Topic ID (forum/supergroup with topics)
 * 2. Reply to message (check for ticket number in replied message)
 * 3. Current message text (check for ticket number in command)
 * 4. Command match/args (check for ticket number in command args)
 */
export async function resolveTicketFromContext(
  ctx: IdentifiedContext
): Promise<Ticket | null> {
  // Priority 1: Topic ID (forum/supergroup with topics)
  const topicId = ctx.message?.message_thread_id;
  if (topicId) {
    const ticket = await telegramService.getTicketByTopicId(topicId);
    if (ticket) return ticket;
  }

  // Priority 2: Reply to message (check for ticket number in replied message)
  const replyText = (
    ctx.message?.reply_to_message?.text ||
    ctx.message?.reply_to_message?.caption ||
    ''
  ).slice(0, 256);
  const numberFromReply = extractTicketNumber(replyText);
  if (numberFromReply) {
    return telegramService.getTicketByNumber(numberFromReply);
  }

  // Priority 3: Current message text (check for ticket number in command)
  const currentText = (ctx.message?.text || '').slice(0, 256);
  const numberFromCurrent = extractTicketNumber(currentText);
  if (numberFromCurrent) {
    return telegramService.getTicketByNumber(numberFromCurrent);
  }

  // Priority 4: Command match/args (check for ticket number in command args)
  const rawMatch = Array.isArray(ctx.match) ? ctx.match.join(' ') : (ctx.match || '');
  const matchText = rawMatch.slice(0, 256);
  const numberFromMatch = extractTicketNumber(matchText);
  if (numberFromMatch) {
    return telegramService.getTicketByNumber(numberFromMatch);
  }

  return null;
}

/**
 * Extract ticket number from text (e.g., "#008" -> 8)
 */
function extractTicketNumber(text: string): number | null {
  const match = /#(\d{1,6})/.exec(text);
  const numberPart = match?.[1];
  if (!numberPart) return null;
  const ticketNumber = Number.parseInt(numberPart, 10);
  return Number.isFinite(ticketNumber) ? ticketNumber : null;
}
