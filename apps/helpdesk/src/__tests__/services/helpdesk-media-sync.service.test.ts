jest.mock('../../services/queue.service', () => ({
  queueService: {
    addJob: jest.fn().mockResolvedValue({ id: 'job-1' }),
  },
}));

jest.mock('../../config/database', () => ({
  prisma: {
    ticket: {
      findUnique: jest.fn(),
    },
  },
}));

const mockGetPlatformUserTelegramId = jest.fn().mockResolvedValue(777);

jest.mock('../../services/platform-user-link.service', () => ({
  getPlatformUserTelegramId: (...args: any[]) => mockGetPlatformUserTelegramId(...args),
}));

const mockGetResolverConfig = jest.fn().mockResolvedValue({ telegramGroupId: '-100123' });

jest.mock('../../services/telegram.service', () => ({
  __esModule: true,
  default: {
    getResolverConfig: (...args: any[]) => mockGetResolverConfig(...args),
  },
}));

jest.mock('../../bot/utils/telegram-html-escape', () => ({
  escapeTelegramHtml: jest.fn().mockImplementation((s: string) => s),
}));

import { prisma } from '../../config/database';
import { queueService } from '../../services/queue.service';
import {
  queueAttachmentsToResolvers,
  queueAttachmentsToUser,
} from '../../services/helpdesk-media-sync.service';

describe('helpdesk-media-sync.service', () => {
  const attachment = {
    type: 'DOCUMENT' as const,
    filename: 'evidencia.pdf',
    mimeType: 'application/pdf',
    minioKey: 'tickets/ticket-1/evidencia.pdf',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetPlatformUserTelegramId.mockResolvedValue(777);
    mockGetResolverConfig.mockResolvedValue({ telegramGroupId: '-100123' });
  });

  describe('queueAttachmentsToResolvers', () => {
    it('queues attachments to resolver topic when topic exists', async () => {
      (prisma.ticket.findUnique as jest.Mock).mockResolvedValue({
        id: 'ticket-1',
        number: 10,
        category: 'TECHNICAL',
        createdBy: 44,
        telegramTopicId: 88,
        telegramGroupId: '-100500',
      });

      await queueAttachmentsToResolvers('ticket-1', 'Juan', [attachment]);

      expect(queueService.addJob).toHaveBeenCalledWith(
        'media-sync',
        expect.objectContaining({
          type: 'sync-telegram-attachment',
          payload: expect.objectContaining({
            destination: { type: 'topic', groupId: '-100500', topicId: 88 },
          }),
        })
      );
    });

    it('queues attachments to resolver group when no topic but has config', async () => {
      (prisma.ticket.findUnique as jest.Mock).mockResolvedValue({
        id: 'ticket-1',
        number: 10,
        category: 'TECHNICAL',
        createdBy: 44,
        telegramTopicId: null,
        telegramGroupId: null,
      });

      await queueAttachmentsToResolvers('ticket-1', 'Juan', [attachment]);

      expect(queueService.addJob).toHaveBeenCalledWith(
        'media-sync',
        expect.objectContaining({
          payload: expect.objectContaining({
            destination: { type: 'group', groupId: '-100123' },
          }),
        })
      );
    });

    it('does nothing when attachments array is empty', async () => {
      await queueAttachmentsToResolvers('ticket-1', 'Juan', []);
      expect(queueService.addJob).not.toHaveBeenCalled();
    });

    it('does nothing when ticket is not found', async () => {
      (prisma.ticket.findUnique as jest.Mock).mockResolvedValue(null);

      await queueAttachmentsToResolvers('ticket-1', 'Juan', [attachment]);
      expect(queueService.addJob).not.toHaveBeenCalled();
    });

    it('does nothing when no resolver config and no topic', async () => {
      (prisma.ticket.findUnique as jest.Mock).mockResolvedValue({
        id: 'ticket-1',
        number: 10,
        category: 'TECHNICAL',
        createdBy: 44,
        telegramTopicId: null,
        telegramGroupId: null,
      });
      mockGetResolverConfig.mockResolvedValue(null);

      await queueAttachmentsToResolvers('ticket-1', 'Juan', [attachment]);
      expect(queueService.addJob).not.toHaveBeenCalled();
    });

    it('queues multiple attachments', async () => {
      (prisma.ticket.findUnique as jest.Mock).mockResolvedValue({
        id: 'ticket-1',
        number: 10,
        category: 'TECHNICAL',
        createdBy: 44,
        telegramTopicId: 88,
        telegramGroupId: '-100500',
      });

      const attachments = [
        { type: 'IMAGE' as const, filename: 'img.png', mimeType: 'image/png', minioKey: 'k1' },
        { type: 'DOCUMENT' as const, filename: 'doc.pdf', mimeType: 'application/pdf', minioKey: 'k2' },
      ];

      await queueAttachmentsToResolvers('ticket-1', 'Juan', attachments);

      expect(queueService.addJob).toHaveBeenCalledTimes(2);
    });
  });

  describe('queueAttachmentsToUser', () => {
    it('queues attachments to ticket creator dm', async () => {
      (prisma.ticket.findUnique as jest.Mock).mockResolvedValue({
        id: 'ticket-2',
        number: 11,
        category: 'OPERATIONAL',
        createdBy: 44,
        telegramTopicId: null,
        telegramGroupId: null,
      });

      await queueAttachmentsToUser('ticket-2', 'Soporte', [attachment]);

      expect(queueService.addJob).toHaveBeenCalledWith(
        'media-sync',
        expect.objectContaining({
          type: 'sync-telegram-attachment',
          payload: expect.objectContaining({
            destination: { type: 'dm', telegramUserId: 777 },
          }),
        })
      );
    });

    it('does nothing when attachments array is empty', async () => {
      await queueAttachmentsToUser('ticket-2', 'Soporte', []);
      expect(queueService.addJob).not.toHaveBeenCalled();
    });

    it('does nothing when ticket is not found', async () => {
      (prisma.ticket.findUnique as jest.Mock).mockResolvedValue(null);

      await queueAttachmentsToUser('ticket-2', 'Soporte', [attachment]);
      expect(queueService.addJob).not.toHaveBeenCalled();
    });

    it('does nothing when user has no telegram id', async () => {
      (prisma.ticket.findUnique as jest.Mock).mockResolvedValue({
        id: 'ticket-2',
        number: 11,
        category: 'OPERATIONAL',
        createdBy: 44,
        telegramTopicId: null,
        telegramGroupId: null,
      });
      mockGetPlatformUserTelegramId.mockResolvedValue(null);

      await queueAttachmentsToUser('ticket-2', 'Soporte', [attachment]);
      expect(queueService.addJob).not.toHaveBeenCalled();
    });

    it('queues multiple attachments to user', async () => {
      (prisma.ticket.findUnique as jest.Mock).mockResolvedValue({
        id: 'ticket-2',
        number: 11,
        category: 'OPERATIONAL',
        createdBy: 44,
        telegramTopicId: null,
        telegramGroupId: null,
      });

      const attachments = [
        { type: 'IMAGE' as const, filename: 'img.png', mimeType: 'image/png', minioKey: 'k1' },
        { type: 'VIDEO' as const, filename: 'vid.mp4', mimeType: 'video/mp4', minioKey: 'k2' },
      ];

      await queueAttachmentsToUser('ticket-2', 'Soporte', attachments);
      expect(queueService.addJob).toHaveBeenCalledTimes(2);
    });
  });
});
