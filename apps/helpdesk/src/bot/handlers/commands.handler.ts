import { Composer } from 'grammy';
import { IdentifiedContext, requireAuth, requireResolver } from '../middleware/identify';
import { telegramService } from '../../services/telegram.service';
import ticketService from '../../services/ticket.service';
import { AppLogger } from '../../config/logger';
import { getPlatformUserTelegramId } from '../../services/platform-user-link.service';
import type { TicketPriority } from '../../schemas/ticket.schema';
import { ticketFormatter } from '../../utils/ticket-formatter';

const commands = new Composer<IdentifiedContext>();

commands.command('start', async (ctx) => {
  const userName = ctx.from?.first_name || 'Usuario';
  const isAuthenticated = ctx.session?.isAuthenticated;

  if (isAuthenticated) {
    await ctx.reply(
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
  } else {
    await ctx.reply(
      `👋 ¡Hola ${userName}!\n\n` +
      'Soy el bot de <b>Mesa de Ayuda</b> de Microsyst.\n\n' +
      '⚠️ <b>Tu usuario de Telegram no está vinculado</b> a tu cuenta en la plataforma.\n\n' +
      'Para usar el bot, contactá al administrador para que vincule tu usuario.',
      { parse_mode: 'HTML' }
    );
  }
});

// Comando para obtener el ID del grupo (útil al configurar grupos de resolvers en producción)
commands.command('groupid', async (ctx) => {
  if (ctx.chat?.type !== 'supergroup' && ctx.chat?.type !== 'group') {
    await ctx.reply(
      '⚠️ Este comando solo funciona dentro de un <b>grupo</b>.\n\n' +
      'Agregá el bot al grupo de resolvers y escribí /groupid ahí para obtener el ID del grupo.',
      { parse_mode: 'HTML' }
    );
    return;
  }
  if (!ctx.chat) return;
  const chatId = ctx.chat.id;
  const title = 'title' in ctx.chat ? String(ctx.chat.title ?? '') : '';
  await ctx.reply(
    `🆔 <b>ID de este grupo</b>: <code>${chatId}</code>\n\n` +
    (title.length > 0 ? `Nombre: ${title}\n\n` : '') +
    'Usá este ID en la configuración de Mesa de Ayuda (variable de entorno o panel de admin) para que los tickets se creen en este grupo.',
    { parse_mode: 'HTML' }
  );
});

commands.command('ayuda', async (ctx) => {
  await ctx.reply(
    '📚 <b>Ayuda del Bot de Mesa de Ayuda</b>\n\n' +
    '<b>Comandos para usuarios:</b>\n' +
    '/start - Mensaje de bienvenida\n' +
    '/nuevo - Crear un nuevo ticket\n' +
    '/mis_tickets - Ver tus tickets abiertos\n' +
    '/info - Información del bot\n\n' +
    '<b>Adjuntos permitidos al crear ticket:</b>\n' +
    '• Foto\n' +
    '• Audio\n' +
    '• Video\n' +
    '• Documento\n\n' +
    '<b>Comandos para resolvers (en tópico o respondiendo al mensaje del ticket en General):</b>\n' +
    '/resolver - Marcarte como resolver asignado\n' +
    '/prioridad [ALTA|NORMAL|BAJA] - Cambiar prioridad\n' +
    '/asignar @usuario - Asignar ticket\n' +
    '/cerrar - Cerrar ticket\n' +
    '/info - Ver info del ticket',
    { parse_mode: 'HTML' }
  );
});

commands.command('nuevo', requireAuth, async (ctx) => {
  const telegramUserId = ctx.from!.id;
  telegramService.setUserState(telegramUserId, { step: 'awaiting_category', tempData: {} });

  await ctx.reply(
    '🎫 <b>Nuevo Ticket de Mesa de Ayuda</b>\n\n' +
    'Seleccioná la categoría de tu consulta:',
    {
      parse_mode: 'HTML',
      reply_markup: {
        keyboard: [[{ text: '🔧 Técnica' }], [{ text: '📋 Operativa' }]],
        one_time_keyboard: true,
        resize_keyboard: true,
      },
    }
  );
});

commands.command('mis_tickets', requireAuth, async (ctx) => {
  const userId = ctx.session?.userId;
  if (!userId) {
    await ctx.reply('❌ Error de autenticación.');
    return;
  }

  try {
    const result = await ticketService.getByUser(userId);
    
    if (result.data.length === 0) {
      await ctx.reply('📭 <b>No tenés tickets abiertos</b>\n\nPara crear uno nuevo, usá /nuevo', { parse_mode: 'HTML' });
      return;
    }

    let message = `📋 <b>Tus Tickets</b> (${result.total})\n\n`;

    for (const ticket of result.data.slice(0, 10)) {
      const statusEmoji = { OPEN: '🟢', IN_PROGRESS: '🟡', RESOLVED: '🔵', CLOSED: '⚫' }[ticket.status] || '❓';
      const priorityEmoji = { LOW: '⬇️', NORMAL: '➡️', HIGH: '⬆️' }[ticket.confirmedPriority || ticket.priority] || '➡️';
      const subjectPreview = ticket.subject.length > 40 ? ticket.subject.substring(0, 40) + '...' : ticket.subject;

      message += `${statusEmoji} <b>#${ticket.number.toString().padStart(3, '0')}</b> - ${subjectPreview}\n`;
      message += `   ${priorityEmoji} ${ticket.confirmedPriority || ticket.priority} | ${ticket.createdAt.toLocaleDateString('es-AR')}\n\n`;
    }

    if (result.data.length > 10) {
      message += `\n<i>Mostrando los primeros 10 de ${result.total} tickets.</i>`;
    }

    await ctx.reply(message, { parse_mode: 'HTML' });
  } catch (error) {
    AppLogger.error('Error fetching user tickets:', error);
    await ctx.reply('❌ Error al obtener tus tickets. Intentá más tarde.');
  }
});

commands.command('info', async (ctx) => {
  if (ctx.chat?.type === 'private') {
    await ctx.reply(
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

  try {
    const ticket = await resolveTicketFromCommandContext(ctx);
    if (!ticket) {
      await ctx.reply(
        '❌ No hay ticket asociado.\n\n' +
        'Usalo dentro del tópico, respondiendo al mensaje del ticket en General, o indicando el número:\n' +
        '<code>/info #008</code>',
        { parse_mode: 'HTML' }
      );
      return;
    }

    await ctx.reply(telegramService.formatTicketInfo(ticket), { parse_mode: 'HTML' });
  } catch (error) {
    AppLogger.error('Error fetching ticket info:', error);
    await ctx.reply('❌ Error al obtener información del ticket.');
  }
});

commands.command('resolver', requireResolver, async (ctx) => {
  const userName = ctx.session?.userName || ctx.from?.username || 'Resolver';

  try {
    const ticket = await resolveTicketFromCommandContext(ctx);
    if (!ticket) {
      await ctx.reply(
        '❌ No hay ticket asociado.\n\n' +
        'Usalo dentro del tópico, respondiendo al mensaje del ticket en General, o indicando el número:\n' +
        '<code>/resolver #008</code>',
        { parse_mode: 'HTML' }
      );
      return;
    }

    await ticketService.assign(ticket.id, userName);
    await ctx.reply(`✅ <b>${userName}</b> se ha asignado como resolver de este ticket.`, { parse_mode: 'HTML' });

    const userTelegramId = await getUserTelegramId(ticket.createdBy);
    if (userTelegramId) {
      await telegramService.sendDM(userTelegramId, `👤 <b>Tu ticket #${ticket.number} fue asignado</b>\n\n${userName} está trabajando en tu consulta.`);
    }
  } catch (error) {
    AppLogger.error('Error assigning resolver:', error);
    await ctx.reply('❌ Error al asignar resolver.');
  }
});

commands.command('prioridad', requireResolver, async (ctx) => {
  const argsRaw = ctx.match?.trim().toUpperCase() || '';
  const priorityToken = /\b(ALTA|NORMAL|BAJA|HIGH|LOW)\b/.exec(argsRaw)?.[1];
  if (!priorityToken) {
    await ctx.reply('⚠️ Uso: /prioridad [ALTA|NORMAL|BAJA] [#NUMERO opcional]');
    return;
  }

  const priorityMap: Record<string, TicketPriority> = {
    'ALTA': 'HIGH', 'HIGH': 'HIGH',
    'NORMAL': 'NORMAL',
    'BAJA': 'LOW', 'LOW': 'LOW',
  };

  const priority = priorityMap[priorityToken];

  try {
    const ticket = await resolveTicketFromCommandContext(ctx);
    if (!ticket) {
      await ctx.reply(
        '❌ No hay ticket asociado.\n\n' +
        'Usalo dentro del tópico, respondiendo al mensaje del ticket en General, o indicando el número:\n' +
        '<code>/prioridad ALTA #008</code>',
        { parse_mode: 'HTML' }
      );
      return;
    }

    await ticketService.updateConfirmedPriority(ticket.id, priority);
    const priorityEmoji = { HIGH: '🔴', NORMAL: '🟡', LOW: '🟢' }[priority];
    await ctx.reply(`✅ Prioridad actualizada a ${priorityEmoji} <b>${priorityToken}</b>`, { parse_mode: 'HTML' });
  } catch (error) {
    AppLogger.error('Error updating priority:', error);
    await ctx.reply('❌ Error al actualizar prioridad.');
  }
});

commands.command('asignar', requireResolver, async (ctx) => {
  const username = /@(\w{3,32})/.exec(ctx.match?.toString().trim() || '')?.[1];
  if (!username) {
    await ctx.reply('⚠️ Uso: /asignar @usuario [#NUMERO opcional]');
    return;
  }

  try {
    const ticket = await resolveTicketFromCommandContext(ctx);
    if (!ticket) {
      await ctx.reply(
        '❌ No hay ticket asociado.\n\n' +
        'Usalo dentro del tópico, respondiendo al mensaje del ticket en General, o indicando el número:\n' +
        '<code>/asignar @usuario #008</code>',
        { parse_mode: 'HTML' }
      );
      return;
    }

    const user = await telegramService.findUserByTelegramUsername(username);
    if (!user) {
      await ctx.reply(`❌ No se encontró el usuario @${username} en el sistema.`);
      return;
    }

    await ticketService.assign(ticket.id, user.email);
    await ctx.reply(`✅ Ticket asignado a <b>${user.email}</b> (@${username})`, { parse_mode: 'HTML' });

    const resolverTelegramId = await getUserTelegramId(user.id);
    if (resolverTelegramId) {
      await telegramService.sendDM(resolverTelegramId, `🎫 <b>Se te asignó el ticket #${ticket.number}</b>\n\n${ticket.subject}\n\nRevisá el tópico en el grupo de resolvers.`);
    }
  } catch (error) {
    AppLogger.error('Error assigning ticket:', error);
    await ctx.reply('❌ Error al asignar ticket.');
  }
});

commands.command('cerrar', requireResolver, async (ctx) => {
  try {
    const ticket = await resolveTicketFromCommandContext(ctx);
    if (!ticket) {
      await ctx.reply(
        '❌ No hay ticket asociado.\n\n' +
        'Usalo dentro del tópico, respondiendo al mensaje del ticket en General, o indicando el número:\n' +
        '<code>/cerrar #008</code>',
        { parse_mode: 'HTML' }
      );
      return;
    }

    await ticketService.updateStatus(ticket.id, 'CLOSED');
    await ctx.reply(
      '✅ <b>Ticket cerrado</b>\n\nEl usuario puede reabrirlo dentro de las próximas 72 horas.',
      { parse_mode: 'HTML' }
    );

    const userTelegramId = await getUserTelegramId(ticket.createdBy);
    if (userTelegramId) {
      await telegramService.sendDM(userTelegramId, `✅ <b>Tu ticket #${ticket.number} fue resuelto</b>\n\nSi necesitás continuar, podés reabrirlo desde la aplicación dentro de las próximas 72 horas.`);
    }
  } catch (error) {
    AppLogger.error('Error closing ticket:', error);
    await ctx.reply('❌ Error al cerrar ticket.');
  }
});

async function getUserTelegramId(userId: number): Promise<number | null> {
  return getPlatformUserTelegramId(userId);
}

async function resolveTicketFromCommandContext(ctx: IdentifiedContext) {
  const topicId = ctx.message?.message_thread_id;
  if (topicId) {
    return telegramService.getTicketByTopicId(topicId);
  }

  const boundedReplyText = (
    ctx.message?.reply_to_message?.text ||
    ctx.message?.reply_to_message?.caption ||
    ''
  ).slice(0, 256);
  const number = extractTicketNumber(boundedReplyText);
  if (number) {
    return telegramService.getTicketByNumber(number);
  }

  const boundedCurrentText = (ctx.message?.text || '').slice(0, 256);
  const numberFromCurrent = extractTicketNumber(boundedCurrentText);
  if (numberFromCurrent) {
    return telegramService.getTicketByNumber(numberFromCurrent);
  }

  const rawMatchText = Array.isArray(ctx.match) ? ctx.match.join(' ') : (ctx.match || '');
  const boundedMatchText = rawMatchText.slice(0, 256);
  const numberFromMatch = extractTicketNumber(boundedMatchText);
  if (numberFromMatch) {
    return telegramService.getTicketByNumber(numberFromMatch);
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

export default commands;
