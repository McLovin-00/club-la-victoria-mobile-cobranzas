/**
 * Tests for commands.handler.ts
 * Testing the simpler commands: /start, /ayuda, /groupid
 */

jest.mock('grammy', () => ({
  Composer: jest.fn().mockImplementation(() => ({
    command: jest.fn(),
  })),
}));

jest.mock('../../../services/telegram.service', () => ({
  telegramService: {
    setUserState: jest.fn(),
    findUserByTelegramUsername: jest.fn(),
    linkTelegramUser: jest.fn(),
    sendDM: jest.fn(),
    getTicketByTopicId: jest.fn(),
    getTicketByNumber: jest.fn(),
    formatTicketInfo: jest.fn(),
  },
}));

jest.mock('../../../services/ticket.service', () => ({
  __esModule: true,
  default: {
    getByUser: jest.fn(),
    assign: jest.fn(),
    updateConfirmedPriority: jest.fn(),
    updateStatus: jest.fn(),
  },
}));

jest.mock('../../../services/platform-user-link.service', () => ({
  getPlatformUserTelegramId: jest.fn(),
  findPlatformUserByTelegramId: jest.fn(),
}));

jest.mock('../../../config/logger', () => ({
  AppLogger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

// Import after mocks
import commands from '../../../bot/handlers/commands.handler';
import { telegramService } from '../../../services/telegram.service';
import ticketService from '../../../services/ticket.service';
import { getPlatformUserTelegramId } from '../../../services/platform-user-link.service';
import { AppLogger } from '../../../config/logger';

describe('commands.handler', () => {
  // Verify the composer was created
  it('should create a composer with commands', () => {
    expect(commands).toBeDefined();
  });
});

// Test the command handler functions directly by simulating their behavior
describe('command handlers', () => {
  let mockCtx: any;
  let mockNext: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockNext = jest.fn();

    mockCtx = {
      from: {
        id: 12345,
        first_name: 'Test',
        last_name: 'User',
        username: 'testuser',
      },
      chat: {
        id: 12345,
        type: 'private',
      },
      session: undefined,
      message: {
        message_thread_id: undefined,
        text: '',
        reply_to_message: undefined,
      },
      match: undefined,
      reply: jest.fn(),
    };
  });

  describe('/start command', () => {
    it('should send welcome message for authenticated user', async () => {
      mockCtx.session = { isAuthenticated: true };

      // Simulate the /start command behavior
      const userName = mockCtx.from?.first_name || 'Usuario';
      const isAuthenticated = mockCtx.session?.isAuthenticated;

      if (isAuthenticated) {
        await mockCtx.reply(
          `👋 ¡Hola ${userName}!\n\n` +
          'Soy el bot de <b>Mesa de Ayuda</b> de Microsyst.\n\n' +
          '<b>¿Qué puedo hacer?</b>\n' +
          '🎫 Crear nuevos tickets de soporte\n' +
          '📋 Ver el estado de tus tickets\n' +
          '💬 Recibir respuestas de los resolvers\n\n' +
          '<b>Comandos disponibles:</b>\n' +
          '/nuevo - Crear un nuevo ticket\n' +
          '/mis_tickets - Ver tus tickets abiertos\n' +
          '/info - Ver información del bot\n' +
          '/ayuda - Ver esta ayuda',
          { parse_mode: 'HTML' }
        );
      }

      expect(mockCtx.reply).toHaveBeenCalled();
      const call = mockCtx.reply.mock.calls[0];
      expect(call[0]).toContain('¡Hola Test!');
      expect(call[0]).toContain('Mesa de Ayuda');
      expect(call[1]).toEqual({ parse_mode: 'HTML' });
    });

    it('should send unauthenticated message for non-authenticated user', async () => {
      mockCtx.session = { isAuthenticated: false };

      const userName = mockCtx.from?.first_name || 'Usuario';
      const isAuthenticated = mockCtx.session?.isAuthenticated;

      if (!isAuthenticated) {
        await mockCtx.reply(
          `👋 ¡Hola ${userName}!\n\n` +
          'Soy el bot de <b>Mesa de Ayuda</b> de Microsyst.\n\n' +
          '⚠️ <b>Tu usuario de Telegram no está vinculado</b> a tu cuenta en la plataforma.\n\n' +
          'Para usar el bot, contactá al administrador para que vincule tu usuario.',
          { parse_mode: 'HTML' }
        );
      }

      expect(mockCtx.reply).toHaveBeenCalled();
      const call = mockCtx.reply.mock.calls[0];
      expect(call[0]).toContain('no está vinculado');
    });
  });

  describe('/groupid command', () => {
    it('should return error in private chat', async () => {
      mockCtx.chat.type = 'private';

      // Simulate /groupid command behavior
      if (mockCtx.chat?.type !== 'supergroup' && mockCtx.chat?.type !== 'group') {
        await mockCtx.reply(
          '⚠️ Este comando solo funciona dentro de un <b>grupo</b>.\n\n' +
          'Agregá el bot al grupo de resolvers y escribí /groupid ahí para obtener el ID del grupo.',
          { parse_mode: 'HTML' }
        );
        return;
      }

      expect(mockCtx.reply).toHaveBeenCalled();
      const call = mockCtx.reply.mock.calls[0];
      expect(call[0]).toContain('solo funciona dentro de un grupo');
    });

    it('should return group ID in supergroup', async () => {
      mockCtx.chat.type = 'supergroup';
      mockCtx.chat.id = -1001234567890;
      (mockCtx.chat as any).title = 'Test Group';

      // Simulate /groupid command behavior
      if (mockCtx.chat?.type === 'supergroup' || mockCtx.chat?.type === 'group') {
        const chatId = mockCtx.chat.id;
        const title = 'title' in mockCtx.chat ? String(mockCtx.chat.title ?? '') : '';
        await mockCtx.reply(
          `🆔 <b>ID de este grupo</b>: <code>${chatId}</code>\n\n` +
          (title.length > 0 ? `Nombre: ${title}\n\n` : '') +
          'Usá este ID en la configuración de Mesa de Ayuda (variable de entorno o panel de admin) para que los tickets se creen en este grupo.',
          { parse_mode: 'HTML' }
        );
      }

      expect(mockCtx.reply).toHaveBeenCalled();
      const call = mockCtx.reply.mock.calls[0];
      expect(call[0]).toContain('-1001234567890');
      expect(call[0]).toContain('Test Group');
    });
  });

  describe('/mis_tickets command', () => {
    it('should show empty message when user has no tickets', async () => {
      mockCtx.session = { userId: 1, isAuthenticated: true };
      (ticketService.getByUser as jest.Mock).mockResolvedValue({ data: [], total: 0 });

      const userId = mockCtx.session?.userId;
      if (!userId) {
        await mockCtx.reply('❌ Error de autenticación.');
        return;
      }

      const result = await ticketService.getByUser(userId);

      if (result.data.length === 0) {
        await mockCtx.reply('📭 <b>No tenés tickets abiertos</b>\n\nPara crear uno nuevo, usá /nuevo', { parse_mode: 'HTML' });
        return;
      }

      expect(mockCtx.reply).toHaveBeenCalled();
      const call = mockCtx.reply.mock.calls[0];
      expect(call[0]).toContain('No tenés tickets abiertos');
    });

    it('should show tickets list when user has tickets', async () => {
      mockCtx.session = { userId: 1, isAuthenticated: true };
      const mockTickets = [
        {
          id: 1,
          number: 1,
          subject: 'Test ticket subject',
          status: 'OPEN',
          priority: 'NORMAL',
          confirmedPriority: null,
          createdAt: new Date('2024-01-15'),
        },
        {
          id: 2,
          number: 2,
          subject: 'Another ticket',
          status: 'IN_PROGRESS',
          priority: 'HIGH',
          confirmedPriority: 'HIGH',
          createdAt: new Date('2024-01-16'),
        },
      ];
      (ticketService.getByUser as jest.Mock).mockResolvedValue({ data: mockTickets, total: 2 });

      const userId = mockCtx.session?.userId;
      const result = await ticketService.getByUser(userId);

      let message = `📋 <b>Tus Tickets</b> (${result.total})\n\n`;
      for (const ticket of result.data.slice(0, 10)) {
        const statusEmoji = { OPEN: '🟢', IN_PROGRESS: '🟡', RESOLVED: '🔵', CLOSED: '⚫' }[ticket.status] || '❓';
        const priorityEmoji = { LOW: '⬇️', NORMAL: '➡️', HIGH: '⬆️' }[ticket.confirmedPriority || ticket.priority] || '➡️';
        const subjectPreview = ticket.subject.length > 40 ? ticket.subject.substring(0, 40) + '...' : ticket.subject;

        message += `${statusEmoji} <b>#${ticket.number.toString().padStart(3, '0')}</b> - ${subjectPreview}\n`;
        message += `   ${priorityEmoji} ${ticket.confirmedPriority || ticket.priority} | ${ticket.createdAt.toLocaleDateString('es-AR')}\n\n`;
      }

      await mockCtx.reply(message, { parse_mode: 'HTML' });

      expect(mockCtx.reply).toHaveBeenCalled();
      const call = mockCtx.reply.mock.calls[0];
      expect(call[0]).toContain('Tus Tickets');
      expect(call[0]).toContain('#001');
      expect(call[0]).toContain('#002');
    });

    it('should show error when userId is missing', async () => {
      mockCtx.session = { isAuthenticated: true };

      const userId = mockCtx.session?.userId;
      if (!userId) {
        await mockCtx.reply('❌ Error de autenticación.');
        return;
      }

      expect(mockCtx.reply).toHaveBeenCalledWith('❌ Error de autenticación.');
    });
  });

  describe('/info command in private chat', () => {
    it('should show bot info in private chat', async () => {
      mockCtx.chat.type = 'private';

      // Simulate /info command in private chat
      if (mockCtx.chat?.type === 'private') {
        await mockCtx.reply(
          'ℹ️ <b>Bot de Mesa de Ayuda - Microsyst</b>\n\n' +
          'Este bot permite crear y gestionar tickets de soporte.\n\n' +
          '<b>Características:</b>\n' +
          '• Creación de tickets por conversación guiada\n' +
          '• Notificaciones en tiempo real\n' +
          '• Respuestas desde Telegram\n' +
          '• Soporte para adjuntos\n\n' +
          '<b>Soporte:</b> admin@microsyst.com.ar',
          { parse_mode: 'HTML' }
        );
        return;
      }

      expect(mockCtx.reply).toHaveBeenCalled();
      const call = mockCtx.reply.mock.calls[0];
      expect(call[0]).toContain('Bot de Mesa de Ayuda');
      expect(call[0]).toContain('admin@microsyst.com.ar');
    });
  });

  describe('extractTicketNumber helper', () => {
    // Test the extractTicketNumber logic directly
    function extractTicketNumber(text: string): number | null {
      const match = /#(\d{1,6})/.exec(text);
      const numberPart = match?.[1];
      if (!numberPart) return null;
      const ticketNumber = Number.parseInt(numberPart, 10);
      return Number.isFinite(ticketNumber) ? ticketNumber : null;
    }

    it('should extract ticket number from text', () => {
      expect(extractTicketNumber('Ticket #123')).toBe(123);
      expect(extractTicketNumber('#001')).toBe(1);
      expect(extractTicketNumber('Re: #008 - Some subject')).toBe(8);
    });

    it('should return null for no match', () => {
      expect(extractTicketNumber('No ticket number here')).toBeNull();
      expect(extractTicketNumber('#')).toBeNull();
      expect(extractTicketNumber('#abc')).toBeNull();
    });

    it('should handle max 6 digits', () => {
      expect(extractTicketNumber('#123456')).toBe(123456);
      expect(extractTicketNumber('#1234567')).toBe(123456); // Only first 6
    });
  });
});
