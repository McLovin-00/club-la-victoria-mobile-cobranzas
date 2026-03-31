/**
 * Utilidades para procesar archivos de Telegram y persistirlos en MinIO.
 */

import { uploadFile } from '../../config/minio';
import { getEnvironment } from '../../config/environment';
import { AppLogger } from '../../config/logger';
import type { AttachmentType } from '../../schemas/message.schema';
import { MAX_FILE_SIZES } from '../../schemas/message.schema';
import type { IdentifiedContext } from '../middleware/identify';

export interface PersistedTelegramAttachment {
  type: AttachmentType;
  filename: string;
  mimeType: string;
  size: number;
  minioKey: string;
}

interface TelegramAttachmentSource {
  type: AttachmentType;
  fileId: string;
  filename: string;
  mimeType: string;
  declaredSize: number;
}

export function extractTelegramAttachment(ctx: IdentifiedContext): TelegramAttachmentSource | null {
  const message = ctx.message;
  if (!message) return null;

  if (message.photo && message.photo.length > 0) {
    const largestPhoto = message.photo[message.photo.length - 1];
    if (!largestPhoto) return null;
    return {
      type: 'IMAGE',
      fileId: largestPhoto.file_id,
      filename: `photo_${largestPhoto.file_unique_id}.jpg`,
      mimeType: 'image/jpeg',
      declaredSize: largestPhoto.file_size ?? 0,
    };
  }

  if (message.audio) {
    return {
      type: 'AUDIO',
      fileId: message.audio.file_id,
      filename: sanitizeFilename(message.audio.file_name || `audio_${message.audio.file_unique_id}.mp3`),
      mimeType: message.audio.mime_type || 'audio/mpeg',
      declaredSize: message.audio.file_size ?? 0,
    };
  }

  if (message.video) {
    return {
      type: 'VIDEO',
      fileId: message.video.file_id,
      filename: sanitizeFilename(message.video.file_name || `video_${message.video.file_unique_id}.mp4`),
      mimeType: message.video.mime_type || 'video/mp4',
      declaredSize: message.video.file_size ?? 0,
    };
  }

  if (message.document) {
    const mimeType = message.document.mime_type || 'application/octet-stream';
    let resolvedType: AttachmentType = 'DOCUMENT';
    if (mimeType.startsWith('audio/')) {
      resolvedType = 'AUDIO';
    } else if (mimeType.startsWith('video/')) {
      resolvedType = 'VIDEO';
    } else if (mimeType.startsWith('image/')) {
      resolvedType = 'IMAGE';
    }

    return {
      type: resolvedType,
      fileId: message.document.file_id,
      filename: sanitizeFilename(message.document.file_name || `document_${message.document.file_unique_id}`),
      mimeType,
      declaredSize: message.document.file_size ?? 0,
    };
  }

  return null;
}

export async function persistTelegramAttachment(
  ctx: IdentifiedContext,
  ticketId: string
): Promise<PersistedTelegramAttachment | null> {
  const attachment = extractTelegramAttachment(ctx);
  if (!attachment) return null;

  const maxSize = MAX_FILE_SIZES[attachment.type];
  if (attachment.declaredSize > maxSize) {
    AppLogger.warn(`Archivo de Telegram excede límite para ${attachment.type}: ${attachment.declaredSize} > ${maxSize}`);
    await ctx.reply(`❌ El archivo excede el límite permitido para ${attachment.type.toLowerCase()}.`);
    return null;
  }

  const fileData = await ctx.api.getFile(attachment.fileId);
  if (!fileData.file_path) {
    AppLogger.warn(`No se obtuvo file_path para archivo de Telegram ${attachment.fileId}`);
    return null;
  }

  const env = getEnvironment();
  const downloadUrl = `https://api.telegram.org/file/bot${env.TELEGRAM_BOT_TOKEN}/${fileData.file_path}`;
  const response = await fetch(downloadUrl, { signal: AbortSignal.timeout(20000) });
  if (!response.ok) {
    AppLogger.error(`Error descargando archivo de Telegram: ${response.status} ${response.statusText}`);
    return null;
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.length > maxSize) {
    AppLogger.warn(`Archivo descargado excede límite para ${attachment.type}: ${buffer.length} > ${maxSize}`);
    await ctx.reply(`❌ El archivo excede el límite permitido para ${attachment.type.toLowerCase()}.`);
    return null;
  }

  const objectName = buildObjectKey(ticketId, attachment.filename);
  await uploadFile(objectName, buffer, {
    'Content-Type': attachment.mimeType,
    'X-Source': 'telegram',
  });

  return {
    type: attachment.type,
    filename: attachment.filename,
    mimeType: attachment.mimeType,
    size: buffer.length,
    minioKey: objectName,
  };
}

function buildObjectKey(ticketId: string, filename: string): string {
  const safeTicketId = ticketId.slice(0, 64).replace(/[^a-zA-Z0-9_-]/g, '_');
  const safeFilename = sanitizeFilename(filename);
  const uniquePart = `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  return `tickets/${safeTicketId}/${uniquePart}_${safeFilename}`;
}

function sanitizeFilename(filename: string): string {
  const bounded = filename.slice(0, 120);
  return bounded.replace(/[^a-zA-Z0-9._-]/g, '_');
}
