import { Bot, session, SessionFlavor } from 'grammy';
import { autoRetry } from '@grammyjs/auto-retry';
import { AppLogger } from '../config/logger';
import { getEnvironment } from '../config/environment';
import { telegramService } from '../services/telegram.service';
import { IdentifiedContext } from './middleware/identify';
import dmHandler from './handlers/dm.handler';
import groupHandler from './handlers/group.handler';
import commandsHandler from './handlers/commands.handler';

interface SessionData {
  userId?: number;
  telegramUserId: number;
  telegramUsername?: string;
  userName?: string;
  isNewUser: boolean;
  isAuthenticated: boolean;
}

type BotContext = IdentifiedContext & SessionFlavor<SessionData>;

let bot: Bot<BotContext> | null = null;

export async function initializeBot(): Promise<Bot<BotContext> | null> {
  const env = getEnvironment();

  if (!env.TELEGRAM_BOT_TOKEN) {
    AppLogger.warn('⚠️ TELEGRAM_BOT_TOKEN not configured, bot disabled');
    return null;
  }

  try {
    bot = new Bot<BotContext>(env.TELEGRAM_BOT_TOKEN);
    bot.api.config.use(autoRetry());

    bot.use(
      session({
        initial: (): SessionData => ({
          telegramUserId: 0,
          isNewUser: false,
          isAuthenticated: false,
        }),
      })
    );

    // Import middleware dynamically to avoid circular deps
    const { identifyMiddleware } = await import('./middleware/identify');
    bot.use(identifyMiddleware);

    // Handlers
    bot.use(commandsHandler);
    bot.use(groupHandler);
    bot.use(dmHandler);

    bot.catch((error: Error) => {
      AppLogger.error('Telegram bot error:', error);
    });

    await telegramService.initialize();
    AppLogger.info('🤖 Telegram bot initialized successfully');
    
    return bot;
  } catch (error) {
    AppLogger.error('Failed to initialize Telegram bot:', error);
    return null;
  }
}

export async function startBot(): Promise<void> {
  if (!bot) {
    AppLogger.warn('Bot not initialized, skipping start');
    return;
  }

  try {
    await bot.start({
      onStart: (botInfo: { username: string }) => {
        AppLogger.info(`🤖 Telegram bot started: @${botInfo.username}`);
      },
    });
  } catch (error) {
    AppLogger.error('Failed to start Telegram bot:', error);
    throw error;
  }
}

export async function stopBot(): Promise<void> {
  if (bot) {
    bot.stop();
    AppLogger.info('🤖 Telegram bot stopped');
  }
}

export function getBot(): Bot<BotContext> | null {
  return bot;
}

export default { initializeBot, startBot, stopBot, getBot };
