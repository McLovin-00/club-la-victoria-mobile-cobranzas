import { Composer } from 'grammy';
import { IdentifiedContext } from '../middleware/identify';
import { telegramService } from '../../services/telegram.service';
import ticketService from '../../services/ticket.service';
import messageService from '../../services/message.service';
import { getPlatformUserEmpresaId } from '../../services/platform-user-link.service';
import { AppLogger } from '../../config/logger';
import type { TicketCategory, TicketPriority } from '../../schemas/ticket.schema';
import { persistTelegramAttachment } from '../utils/telegram-attachments';
import { ticketFormatter } from '../../utils/ticket-formatter';

const dm = new Composer<IdentifiedContext>();

const CATEGORIES: { key: TicketCategory; label: string; emoji: string }[] = [
  { key: 'TECHNICAL', label: 'Técnica', emoji: '🔧' },
  { key: 'OPERATIONAL', label: 'Operativa', emoji: '📋' },
];

const SUBCATEGORIES_TECHNICAL = [
  { key: 'ERROR', label: 'Error/Sistema' },
  { key: 'DOUBT', label: 'Duda técnica' },
  { key: 'SUGGESTION', label: 'Sugerencia' },
];

const SUBCATEGORIES_OPERATIONAL = [
  { key: 'BUSINESS_RULE', label: 'Regla de negocio' },
  { key: 'ERROR', label: 'Error operacional' },
  { key: 'DOUBT', label: 'Duda operativa' },
];

const PRIORITIES: { key: TicketPriority; label: string; emoji: string }[] = [
  { key: 'LOW', label: 'Baja', emoji: '⬇️' },
  { key: 'NORMAL', label: 'Normal', emoji: '➡️' },
  { key: 'HIGH', label: 'Alta', emoji: '⬆️' },
];

dm.on('message:text', async (ctx, next) => {
  if (ctx.chat?.type !== 'private') {
    await next();
    return;
  }

  const text = ctx.message.text.trim();
  const telegramUserId = ctx.from.id;

  if (!ctx.session?.isAuthenticated) {
    await ctx.reply(
      '⚠️ No estás registrado en el sistema.\n\n' +
      'Para crear tickets, tu usuario de Telegram debe estar vinculado ' +
      'a tu cuenta en la plataforma. Contactá al administrador.'
    );
    return;
  }

  const state = telegramService.getUserState(telegramUserId);

  // Cualquier comando (ej. /nuevo, /nueva) durante el wizard cancela y reinicia desde categoría
  if (state.step !== 'idle' && text.startsWith('/')) {
    telegramService.setUserState(telegramUserId, { step: 'awaiting_category', tempData: {} });
    const keyboard = CATEGORIES.map((cat) => [{ text: `${cat.emoji} ${cat.label}` }]);
    await ctx.reply(
      '🔄 Reiniciando. Seleccioná la categoría de tu consulta:',
      {
        parse_mode: 'HTML',
        reply_markup: { keyboard, one_time_keyboard: true, resize_keyboard: true },
      }
    );
    return;
  }

  switch (state.step) {
    case 'idle':
      await handleIdle(ctx);
      break;
    case 'awaiting_category':
      await handleCategorySelection(ctx, text, telegramUserId);
      break;
    case 'awaiting_subcategory':
      await handleSubcategory(ctx, text, telegramUserId);
      break;
    case 'awaiting_subject':
      await handleSubject(ctx, text, telegramUserId);
      break;
    case 'awaiting_priority':
      await handlePriority(ctx, text, telegramUserId);
      break;
    case 'awaiting_message':
      await handleMessage(ctx, text, telegramUserId);
      break;
    default:
      await handleIdle(ctx);
  }
});

dm.on(['message:photo', 'message:audio', 'message:video', 'message:document'], async (ctx, next) => {
  if (ctx.chat?.type !== 'private') {
    await next();
    return;
  }

  const telegramUserId = ctx.from.id;
  if (!ctx.session?.isAuthenticated) {
    await ctx.reply(
      '⚠️ No estás registrado en el sistema.\n\n' +
      'Para crear tickets, tu usuario de Telegram debe estar vinculado ' +
      'a tu cuenta en la plataforma. Contactá al administrador.'
    );
    return;
  }

  const state = telegramService.getUserState(telegramUserId);
  if (state.step !== 'awaiting_message') {
    await ctx.reply(
      '⚠️ Primero completá el flujo de creación. Cuando el bot pida detalles, ' +
      'ahí podés enviar texto o adjuntar foto, audio, video o documento.'
    );
    return;
  }

  await handleMessageWithAttachment(ctx, telegramUserId);
});

async function handleIdle(ctx: IdentifiedContext) {
  const telegramUserId = ctx.from!.id;
  telegramService.setUserState(telegramUserId, { step: 'awaiting_category', tempData: {} });

  const keyboard = CATEGORIES.map((cat) => [{ text: `${cat.emoji} ${cat.label}` }]);
  
  await ctx.reply(
    '🎫 <b>Nuevo Ticket de Mesa de Ayuda</b>\n\n' +
    'Seleccioná la categoría de tu consulta:',
    {
      parse_mode: 'HTML',
      reply_markup: { keyboard, one_time_keyboard: true, resize_keyboard: true },
    }
  );
}

async function handleCategorySelection(ctx: IdentifiedContext, text: string, telegramUserId: number) {
  const category = CATEGORIES.find(
    (c) => text.includes(c.label) || text === `${c.emoji} ${c.label}`
  );

  if (!category) {
    const keyboard = CATEGORIES.map((cat) => [{ text: `${cat.emoji} ${cat.label}` }]);
    await ctx.reply('❌ Categoría no válida. Seleccioná una opción del menú.', {
      reply_markup: { keyboard, one_time_keyboard: true, resize_keyboard: true },
    });
    return;
  }

  const state = telegramService.getUserState(telegramUserId);
  state.tempData = { ...state.tempData, category: category.key };
  state.step = 'awaiting_subcategory';
  telegramService.setUserState(telegramUserId, state);

  const subcats = category.key === 'TECHNICAL' ? SUBCATEGORIES_TECHNICAL : SUBCATEGORIES_OPERATIONAL;
  const keyboard = subcats.map((s) => [{ text: s.label }]);

  await ctx.reply(
    `✅ Categoría: <b>${category.emoji} ${category.label}</b>\n\n` +
    'Seleccioná la subcategoría:',
    { parse_mode: 'HTML', reply_markup: { keyboard, one_time_keyboard: true, resize_keyboard: true } }
  );
}

async function handleSubcategory(ctx: IdentifiedContext, text: string, telegramUserId: number) {
  const state = telegramService.getUserState(telegramUserId);
  const category = state.tempData?.category as TicketCategory | undefined;

  if (!category) {
    await ctx.reply('❌ Error de estado. Escribí "nuevo" para comenzar de nuevo.');
    telegramService.clearUserState(telegramUserId);
    return;
  }

  const subcats = category === 'TECHNICAL' ? SUBCATEGORIES_TECHNICAL : SUBCATEGORIES_OPERATIONAL;
  const selected = subcats.find(s => text.includes(s.label));

  if (!selected) {
    const keyboard = subcats.map((s) => [{ text: s.label }]);
    await ctx.reply(
      '❌ Subcategoría no válida. Seleccioná una opción del menú.',
      { reply_markup: { keyboard, one_time_keyboard: true, resize_keyboard: true } }
    );
    return;
  }

  state.tempData = { ...state.tempData, subcategory: selected.key };
  state.step = 'awaiting_subject';
  telegramService.setUserState(telegramUserId, state);

  await ctx.reply(
    `✅ Subcategoría: <b>${selected.label}</b>\n\n` +
    '📝 Escribí el asunto de tu consulta (máx. 100 caracteres):',
    { parse_mode: 'HTML' }
  );
}

async function handleSubject(ctx: IdentifiedContext, text: string, telegramUserId: number) {
  if (text.length < 5) {
    await ctx.reply('❌ El asunto es muy corto. Mínimo 5 caracteres.');
    return;
  }
  if (text.length > 100) {
    await ctx.reply('❌ El asunto es muy largo. Máximo 100 caracteres.');
    return;
  }

  const state = telegramService.getUserState(telegramUserId);
  state.tempData = { ...state.tempData, subject: text };
  state.step = 'awaiting_priority';
  telegramService.setUserState(telegramUserId, state);

  const keyboard = PRIORITIES.map((p) => [{ text: `${p.emoji} ${p.label}` }]);

  await ctx.reply(
    `✅ Asunto: <b>${text}</b>\n\nSeleccioná la prioridad:`,
    { parse_mode: 'HTML', reply_markup: { keyboard, one_time_keyboard: true, resize_keyboard: true } }
  );
}

async function handlePriority(ctx: IdentifiedContext, text: string, telegramUserId: number) {
  const priority = PRIORITIES.find(p => text.includes(p.label) || text === `${p.emoji} ${p.label}`);

  if (!priority) {
    const keyboard = PRIORITIES.map((p) => [{ text: `${p.emoji} ${p.label}` }]);
    await ctx.reply('❌ Prioridad no válida. Seleccioná una opción del menú.', {
      reply_markup: { keyboard, one_time_keyboard: true, resize_keyboard: true },
    });
    return;
  }

  const state = telegramService.getUserState(telegramUserId);
  state.tempData = { ...state.tempData, priority: priority.key };
  state.step = 'awaiting_message';
  telegramService.setUserState(telegramUserId, state);

  await ctx.reply(
    `✅ Prioridad: <b>${priority.emoji} ${priority.label}</b>\n\n` +
    '📄 Ahora escribí tu consulta con todos los detalles.\n' +
    'También podés adjuntar <b>foto, audio, video o documento</b>:',
    { parse_mode: 'HTML' }
  );
}

async function handleMessage(ctx: IdentifiedContext, text: string, telegramUserId: number) {
  if (text.length < 10) {
    await ctx.reply('❌ El mensaje es muy corto. Mínimo 10 caracteres.');
    return;
  }

  const state = telegramService.getUserState(telegramUserId);
  const { category, subcategory, subject, priority } = state.tempData || {};

  if (!category || !subcategory || !subject || !priority) {
    await ctx.reply('❌ Error de estado. Escribí "nuevo" para comenzar de nuevo.');
    telegramService.clearUserState(telegramUserId);
    return;
  }

  const userId = ctx.session?.userId;
  if (!userId) {
    await ctx.reply('❌ Error de autenticación. Contactá al administrador.');
    telegramService.clearUserState(telegramUserId);
    return;
  }

  const userName = ctx.session?.userName || 'Usuario';

  try {
    const empresaId = await getPlatformUserEmpresaId(userId);
    const ticket = await ticketService.create(
      {
        category,
        subcategory: subcategory as 'ERROR' | 'DOUBT' | 'SUGGESTION' | 'BUSINESS_RULE',
        subject,
        priority,
        message: text,
      },
      userId,
      userName,
      'telegram',
      empresaId
    );

    const topic = await telegramService.createTopic(category, ticket.number, subject);
    const topicMessage = formatNewTicketMessage(ticket.number, subcategory, subject, priority, text, userName);

    if (topic) {
      await ticketService.updateTelegramTopic(ticket.id, topic.topicId, topic.groupId);
      await telegramService.sendToTopic(topic.groupId, topic.topicId, topicMessage);
    } else {
      // Fallback: publicar en el grupo aunque no se pueda crear tópico (permisos/configuración)
      const resolverConfig = await telegramService.getResolverConfig(category);
      if (resolverConfig) {
        await telegramService.sendToGroup(
          resolverConfig.telegramGroupId,
          `⚠️ <b>Ticket #${ticket.number.toString().padStart(3, '0')} creado sin tópico</b>\n\n` +
          'El bot no pudo crear el tópico automáticamente. Revisá permisos del bot para gestionar temas.\n\n' +
          topicMessage
        );
      }
    }

    telegramService.clearUserState(telegramUserId);

    await ctx.reply(
      '✅ <b>Ticket creado exitosamente</b>\n\n' +
      `🎫 Número: <b>#${ticket.number.toString().padStart(3, '0')}</b>\n` +
      `📋 Categoría: ${category === 'TECHNICAL' ? '🔧 Técnica' : '📋 Operativa'}\n` +
      `📝 Asunto: ${subject}\n` +
      `📊 Prioridad: ${priority}\n\n` +
      'Un resolver se comunicará con vos a la brevedad.\n\n' +
      'Para consultar el estado de tus tickets, usá /mis_tickets',
      { parse_mode: 'HTML' }
    );

    AppLogger.info(`Ticket #${ticket.number} created by user ${userId} via Telegram`);
  } catch (error) {
    AppLogger.error('Error creating ticket from Telegram:', error);
    await ctx.reply('❌ Hubo un error al crear el ticket. Intentá nuevamente más tarde.');
    telegramService.clearUserState(telegramUserId);
  }
}

function formatNewTicketMessage(
  number: number,
  subcategory: string,
  subject: string,
  priority: TicketPriority,
  message: string,
  userName: string
): string {
  let priorityEmoji = '🟢';

  if (priority === 'HIGH') {
    priorityEmoji = '🔴';
  } else if (priority === 'NORMAL') {
    priorityEmoji = '🟡';
  }

  return `
🆕 <b>NUEVO TICKET #${number.toString().padStart(3, '0')}</b>

📝 <b>Asunto:</b> ${subject}
📂 <b>Subcategoría:</b> ${subcategory}
${priorityEmoji} <b>Prioridad:</b> ${priority}
👤 <b>Usuario:</b> ${userName}

📄 <b>Mensaje:</b>
${message}

---
<i>/asignar @usuario | /prioridad ALTA|NORMAL|BAJA | /info</i>
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

async function handleMessageWithAttachment(ctx: IdentifiedContext, telegramUserId: number): Promise<void> {
  const state = telegramService.getUserState(telegramUserId);
  const { category, subcategory, subject, priority } = state.tempData || {};
  if (!category || !subcategory || !subject || !priority) {
    await ctx.reply('❌ Error de estado. Escribí /nuevo para comenzar de nuevo.');
    telegramService.clearUserState(telegramUserId);
    return;
  }

  const userId = ctx.session?.userId;
  if (!userId) {
    await ctx.reply('❌ Error de autenticación. Contactá al administrador.');
    telegramService.clearUserState(telegramUserId);
    return;
  }

  const userName = ctx.session?.userName || 'Usuario';
  const caption = getMessageCaption(ctx);
  const initialMessage = caption.length >= 10 ? caption : 'Ticket creado con archivo adjunto desde Telegram.';

  try {
    const empresaId = await getPlatformUserEmpresaId(userId);
    const ticket = await ticketService.create(
      {
        category,
        subcategory: subcategory as 'ERROR' | 'DOUBT' | 'SUGGESTION' | 'BUSINESS_RULE',
        subject,
        priority,
        message: initialMessage,
      },
      userId,
      userName,
      'telegram',
      empresaId
    );

    const attachment = await persistTelegramAttachment(ctx, ticket.id);
    if (attachment) {
      const attachmentMessage = caption.length > 0 ? caption : 'Adjunto enviado desde Telegram.';
    await messageService.createUser(ticket.id, userId, userName, attachmentMessage, userId, [attachment], 'telegram');
    }

    const topic = await telegramService.createTopic(category, ticket.number, subject);
    const topicMessage = formatNewTicketMessage(ticket.number, subcategory, subject, priority, initialMessage, userName);
    if (topic) {
      await ticketService.updateTelegramTopic(ticket.id, topic.topicId, topic.groupId);
      await telegramService.sendToTopic(topic.groupId, topic.topicId, topicMessage);
      await copyIncomingAttachmentToTelegramTarget(ctx, topic.groupId, topic.topicId);
    } else {
      const resolverConfig = await telegramService.getResolverConfig(category);
      if (resolverConfig) {
        await telegramService.sendToGroup(
          resolverConfig.telegramGroupId,
          `⚠️ <b>Ticket #${ticket.number.toString().padStart(3, '0')} creado sin tópico</b>\n\n` +
            'El bot no pudo crear el tópico automáticamente. Revisá permisos del bot para gestionar temas.\n\n' +
            topicMessage
        );
        await copyIncomingAttachmentToTelegramTarget(ctx, resolverConfig.telegramGroupId);
      }
    }

    telegramService.clearUserState(telegramUserId);
    await ctx.reply(
      '✅ <b>Ticket creado exitosamente</b>\n\n' +
        `🎫 Número: <b>#${ticket.number.toString().padStart(3, '0')}</b>\n` +
        `📋 Categoría: ${category === 'TECHNICAL' ? '🔧 Técnica' : '📋 Operativa'}\n` +
        `📝 Asunto: ${subject}\n` +
        `📊 Prioridad: ${priority}\n\n` +
        '📎 Adjunto recibido y asociado al ticket.\n\n' +
        'Un resolver se comunicará con vos a la brevedad.\n\n' +
        'Para consultar el estado de tus tickets, usá /mis_tickets',
      { parse_mode: 'HTML' }
    );

    AppLogger.info(`Ticket #${ticket.number} created with Telegram attachment by user ${userId}`);
  } catch (error) {
    AppLogger.error('Error creating ticket with attachment from Telegram:', error);
    await ctx.reply('❌ Hubo un error al crear el ticket con adjunto. Intentá nuevamente más tarde.');
    telegramService.clearUserState(telegramUserId);
  }
}

async function copyIncomingAttachmentToTelegramTarget(
  ctx: IdentifiedContext,
  targetGroupId: string,
  topicId?: number
): Promise<void> {
  if (!ctx.chat || !ctx.message) return;

  try {
    await ctx.api.copyMessage(targetGroupId, ctx.chat.id, ctx.message.message_id, {
      message_thread_id: topicId,
    });
  } catch (error) {
    AppLogger.error('Error copying incoming attachment to resolver target:', error);
  }
}

export default dm;
