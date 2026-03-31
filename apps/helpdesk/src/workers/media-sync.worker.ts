import { Job } from 'bullmq';
import { InputFile } from 'grammy';
import { downloadFile } from '../config/minio';
import { AppLogger } from '../config/logger';
import telegramService from '../services/telegram.service';

export interface MediaSyncJobPayload {
  attachment: {
    type: 'IMAGE' | 'AUDIO' | 'VIDEO' | 'DOCUMENT';
    filename: string;
    mimeType: string;
    minioKey: string;
  };
  caption?: string;
  destination:
    | { type: 'topic'; groupId: string; topicId: number }
    | { type: 'group'; groupId: string }
    | { type: 'dm'; telegramUserId: number };
}

function buildTelegramOptions(job: MediaSyncJobPayload) {
  const baseOptions: Record<string, unknown> = {};
  if (job.caption) {
    baseOptions.caption = job.caption.slice(0, 1000);
    baseOptions.parse_mode = 'HTML';
  }

  if (job.destination.type === 'topic') {
    baseOptions.message_thread_id = job.destination.topicId;
  }

  return baseOptions;
}

function resolveChatId(destination: MediaSyncJobPayload['destination']): string | number {
  if (destination.type === 'dm') {
    return destination.telegramUserId;
  }

  return destination.groupId;
}

export async function processMediaSyncJob(job: Job<MediaSyncJobPayload>): Promise<void> {
  const bot = telegramService.getBot();
  const buffer = await downloadFile(job.data.attachment.minioKey);
  const inputFile = new InputFile(buffer, job.data.attachment.filename);
  const chatId = resolveChatId(job.data.destination);
  const options = buildTelegramOptions(job.data);

  switch (job.data.attachment.type) {
    case 'IMAGE':
      await bot.api.sendPhoto(chatId, inputFile, options);
      break;
    case 'VIDEO':
      await bot.api.sendVideo(chatId, inputFile, options);
      break;
    case 'AUDIO':
      await bot.api.sendAudio(chatId, inputFile, options);
      break;
    case 'DOCUMENT':
    default:
      await bot.api.sendDocument(chatId, inputFile, options);
      break;
  }

  AppLogger.info('Media sync job completed', {
    jobId: job.id,
    destination: job.data.destination.type,
    attachment: job.data.attachment.filename,
  });
}
