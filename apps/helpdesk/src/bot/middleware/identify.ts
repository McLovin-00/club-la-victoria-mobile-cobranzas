import { Context, MiddlewareFn } from 'grammy';
import { telegramService } from '../../services/telegram.service';
import { AppLogger } from '../../config/logger';
import { findPlatformUserByTelegramId } from '../../services/platform-user-link.service';
import type { Ticket } from '../../types';

// Extended context with user identification
export interface IdentifiedContext extends Context {
  session?: {
    userId?: number;
    telegramUserId: number;
    telegramUsername?: string;
    userName?: string;
    isNewUser: boolean;
    isAuthenticated: boolean;
  };
  // Ticket context injected by requireTicketContext middleware
  ticketContext?: Ticket | null;
}

export const identifyMiddleware: MiddlewareFn<IdentifiedContext> = async (ctx, next) => {
  if (!ctx.from) {
    return next();
  }

  const telegramUserId = ctx.from.id;
  const telegramUsername = ctx.from.username;
  const telegramDisplayName = [ctx.from.first_name, ctx.from.last_name].filter(Boolean).join(' ');

  ctx.session = {
    telegramUserId,
    telegramUsername,
    userName: telegramDisplayName, // fallback inicial, se actualiza si se encuentra usuario
    isNewUser: false,
    isAuthenticated: false,
  };

  try {
    const linkedUser = await findUserByTelegramId(telegramUserId);
    
    if (linkedUser) {
      ctx.session.userId = linkedUser.id;
      ctx.session.userName = linkedUser.email; // usar email de la plataforma
      ctx.session.isAuthenticated = true;
      AppLogger.debug(`User identified by telegram_user_id: ${linkedUser.id}`);
      return next();
    }

    if (telegramUsername) {
      const userByUsername = await telegramService.findUserByTelegramUsername(telegramUsername);
      
      if (userByUsername) {
        await telegramService.linkTelegramUser(userByUsername.id, telegramUserId, telegramUsername);
        ctx.session.userId = userByUsername.id;
        ctx.session.userName = userByUsername.email; // usar email de la plataforma
        ctx.session.isAuthenticated = true;
        AppLogger.info(`User linked by username: ${userByUsername.id} -> @${telegramUsername}`);
        return next();
      }
    }

    ctx.session.isNewUser = true;
    ctx.session.isAuthenticated = false;
    AppLogger.debug(`Unknown Telegram user: ${telegramUserId} (@${telegramUsername})`);
    
    return next();
  } catch (error) {
    AppLogger.error('Error in identify middleware:', error);
    return next();
  }
};

async function findUserByTelegramId(telegramUserId: number): Promise<{ id: number; email: string } | null> {
  return findPlatformUserByTelegramId(telegramUserId);
}

export const requireAuth: MiddlewareFn<IdentifiedContext> = async (ctx, next) => {
  if (!ctx.session?.isAuthenticated) {
    await ctx.reply(
      '⚠️ No estás registrado en el sistema.\n\n' +
      'Para usar el bot de Mesa de Ayuda, tu usuario de Telegram debe estar vinculado ' +
      'a tu cuenta en la plataforma. Contactá al administrador.'
    );
    return;
  }
  return next();
};

export const requireResolver: MiddlewareFn<IdentifiedContext> = async (ctx, next) => {
  if (!ctx.session?.userId) {
    await ctx.reply('⚠️ No autorizado.');
    return;
  }

  const isResolver = await checkIsResolver(ctx.session.userId);
  
  if (!isResolver) {
    await ctx.reply('⚠️ Esta acción está reservada para resolvers.');
    return;
  }
  
  return next();
};

async function checkIsResolver(userId: number): Promise<boolean> {
  const { prisma } = await import('../../config/database');

  const result = await prisma.$queryRaw<Array<{ role: string | null }>>`
    SELECT role
    FROM "platform"."platform_users"
    WHERE id = ${userId}
    LIMIT 1
  `;

  if (result.length === 0) {
    return false;
  }

  const role = (result[0].role || '').toUpperCase();
  return role === 'ADMIN' || role === 'SUPERADMIN';
}

export default identifyMiddleware;
