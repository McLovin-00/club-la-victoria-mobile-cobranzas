/**
 * Este archivo valida que los handlers de Telegram no bloqueen otros middlewares cuando el chat no coincide.
 */

jest.mock('../../../services/telegram.service', () => ({
  telegramService: {
    getTicketByTopicId: jest.fn(),
    sendDM: jest.fn(),
    getUserState: jest.fn(),
    setUserState: jest.fn(),
    clearUserState: jest.fn(),
  },
}));

jest.mock('../../../services/message.service', () => ({
  __esModule: true,
  default: {
    create: jest.fn(),
  },
}));

jest.mock('../../../services/ticket.service', () => ({
  __esModule: true,
  default: {
    create: jest.fn(),
    updateTelegramTopic: jest.fn(),
  },
}));

jest.mock('../../../config/logger', () => ({
  AppLogger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

import groupHandler from '../../../bot/handlers/group.handler';
import dmHandler from '../../../bot/handlers/dm.handler';

describe('Telegram middleware routing', () => {
  it('group handler cede el paso cuando recibe un chat privado', async () => {
    const next = jest.fn().mockResolvedValue(undefined);
    const middleware = groupHandler.middleware();

    await middleware(
      {
        chat: { type: 'private' },
        message: { text: '🔧 Técnica' },
        update: { message: { text: '🔧 Técnica' } },
        session: { isAuthenticated: true, userId: 2 },
      } as never,
      next
    );

    expect(next).toHaveBeenCalled();
  });

  it('dm handler cede el paso cuando recibe un supergrupo', async () => {
    const next = jest.fn().mockResolvedValue(undefined);
    const middleware = dmHandler.middleware();

    await middleware(
      {
        chat: { type: 'supergroup' },
        message: { text: 'mensaje de grupo' },
        update: { message: { text: 'mensaje de grupo' } },
        session: { isAuthenticated: true, userId: 2 },
      } as never,
      next
    );

    expect(next).toHaveBeenCalled();
  });
});
