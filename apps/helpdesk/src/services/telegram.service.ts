import { Bot } from 'grammy';
import type { TicketCategory as PrismaTicketCategory } from '@helpdesk/prisma-client';
import { AppLogger } from '../config/logger';
import { getEnvironment } from '../config/environment';
import { prisma } from '../config/database';
import {
  findPlatformUserByTelegramUsername,
  linkPlatformUserToTelegram,
} from './platform-user-link.service';
import type { Ticket, TicketCategory } from '../types';

// Telegram user state for conversation flow
interface UserState {
  step: 'idle' | 'awaiting_category' | 'awaiting_subcategory' | 'awaiting_subject' | 'awaiting_priority' | 'awaiting_message';
  tempData?: {
    category?: TicketCategory;
    subcategory?: string;
    subject?: string;
    priority?: 'LOW' | 'NORMAL' | 'HIGH';
  };
  ticketId?: string;
}

// In-memory store para el flujo conversacional. PENDIENTE: migrarlo a Redis en producción.
const userStates = new Map<number, UserState>();

class TelegramService {
  private bot: Bot | null = null;

  async initialize(): Promise<void> {
    const env = getEnvironment();
    
    if (!env.TELEGRAM_BOT_TOKEN) {
      AppLogger.warn('⚠️ TELEGRAM_BOT_TOKEN not configured, bot disabled');
      return;
    }

    this.bot = new Bot(env.TELEGRAM_BOT_TOKEN);
    
    AppLogger.info('🤖 Telegram Bot initialized');
  }

  getBot(): Bot {
    if (!this.bot) {
      throw new Error('Bot not initialized');
    }
    return this.bot;
  }

  // Get or create user state
  getUserState(telegramUserId: number): UserState {
    if (!userStates.has(telegramUserId)) {
      userStates.set(telegramUserId, { step: 'idle' });
    }
    return userStates.get(telegramUserId)!;
  }

  setUserState(telegramUserId: number, state: UserState): void {
    userStates.set(telegramUserId, state);
  }

  clearUserState(telegramUserId: number): void {
    userStates.delete(telegramUserId);
  }

  // Find user by telegram username
  async findUserByTelegramUsername(username: string): Promise<{ id: number; email: string } | null> {
    return findPlatformUserByTelegramUsername(username);
  }

  // Update user's telegramUserId after first contact
  async linkTelegramUser(userId: number, telegramUserId: number, telegramUsername?: string): Promise<void> {
    await linkPlatformUserToTelegram(userId, telegramUserId, telegramUsername);
    AppLogger.info(`User ${userId} linked to Telegram ${telegramUserId}`);
  }

  // Get resolver config for category
  async getResolverConfig(category: TicketCategory): Promise<{ telegramGroupId: string; telegramGroupName?: string } | null> {
    const config = await prisma.resolverConfig.findFirst({
      where: {
        category: category as PrismaTicketCategory,
        isActive: true,
      },
    });
    return config ? { telegramGroupId: config.telegramGroupId, telegramGroupName: config.telegramGroupName ?? undefined } : null;
  }

  // Create topic in Telegram group
  async createTopic(category: TicketCategory, ticketNumber: number, subject: string): Promise<{ topicId: number; groupId: string } | null> {
    const config = await this.getResolverConfig(category);
    if (!config) {
      AppLogger.error(`No resolver config found for category ${category}`);
      return null;
    }

    const categoryName = category === 'TECHNICAL' ? 'Técnica' : 'Operativa';
    const topicTitle = `#${ticketNumber.toString().padStart(3, '0')} [${categoryName}] ${subject.substring(0, 80)}`;

    try {
      const result = await this.bot!.api.createForumTopic(config.telegramGroupId, topicTitle);
      return {
        topicId: result.message_thread_id,
        groupId: config.telegramGroupId,
      };
    } catch (error) {
      AppLogger.error('Error creating Telegram topic:', error);
      return null;
    }
  }

  // Send message to topic
  async sendToTopic(groupId: string, topicId: number, text: string): Promise<void> {
    if (!this.bot) return;

    try {
      await this.bot.api.sendMessage(groupId, text, {
        message_thread_id: topicId,
        parse_mode: 'HTML',
      });
    } catch (error) {
      AppLogger.error('Error sending to topic:', error);
    }
  }

  // Send message directly to group when topic creation is unavailable
  async sendToGroup(groupId: string, text: string): Promise<void> {
    if (!this.bot) return;

    try {
      await this.bot.api.sendMessage(groupId, text, { parse_mode: 'HTML' });
    } catch (error) {
      AppLogger.error('Error sending to group:', error);
    }
  }

  // Send DM to user
  async sendDM(telegramUserId: number, text: string): Promise<void> {
    if (!this.bot) return;

    try {
      await this.bot.api.sendMessage(telegramUserId, text, { parse_mode: 'HTML' });
    } catch (error) {
      AppLogger.error(`Error sending DM to ${telegramUserId}:`, error);
    }
  }

  // Format ticket info for Telegram
  formatTicketInfo(ticket: Ticket): string {
    const statusEmoji = {
      OPEN: '🟢',
      IN_PROGRESS: '🟡',
      RESOLVED: '🔵',
      CLOSED: '⚫',
    };

    const priorityEmoji = {
      LOW: '⬇️',
      NORMAL: '➡️',
      HIGH: '⬆️',
    };

    const categoryEmoji = {
      TECHNICAL: '🔧',
      OPERATIONAL: '📋',
    };

    return `
${statusEmoji[ticket.status]} <b>Ticket #${ticket.number}</b>
${categoryEmoji[ticket.category]} Categoría: ${ticket.category === 'TECHNICAL' ? 'Técnica' : 'Operativa'}
📝 Asunto: ${ticket.subject}
${priorityEmoji[ticket.confirmedPriority || ticket.priority]} Prioridad: ${(ticket.confirmedPriority || ticket.priority).toLowerCase()}
👤 Creado por: ${ticket.createdByName}
📅 Fecha: ${ticket.createdAt.toLocaleDateString('es-AR')}
${ticket.assignedTo ? `✅ Asignado a: ${ticket.assignedTo}` : ''}
    `.trim();
  }

  // Get ticket by Telegram topic ID
  async getTicketByTopicId(topicId: number): Promise<Ticket | null> {
    const ticket = await prisma.ticket.findFirst({
      where: { telegramTopicId: topicId },
    });
    return ticket as Ticket | null;
  }

  // Get ticket by human ticket number (#123)
  async getTicketByNumber(ticketNumber: number): Promise<Ticket | null> {
    const ticket = await prisma.ticket.findFirst({
      where: { number: ticketNumber },
    });
    return ticket as Ticket | null;
  }

  // Start the bot
  async start(): Promise<void> {
    if (!this.bot) {
      AppLogger.warn('Bot not initialized, skipping start');
      return;
    }

    await this.bot.start({
      onStart: () => {
        AppLogger.info('🤖 Telegram Bot started polling');
      },
    });
  }

  // Stop the bot
  async stop(): Promise<void> {
    if (this.bot) {
      this.bot.stop();
      AppLogger.info('🤖 Telegram Bot stopped');
    }
  }
}

export const telegramService = new TelegramService();
export default telegramService;
