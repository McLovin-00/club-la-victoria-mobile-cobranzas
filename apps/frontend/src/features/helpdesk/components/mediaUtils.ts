import type { MessageAttachment } from '../types';

export function isImage(mimeType: string): boolean {
  return mimeType.startsWith('image/');
}

export function isVideo(mimeType: string): boolean {
  return mimeType.startsWith('video/');
}

export function isAudio(mimeType: string): boolean {
  return mimeType.startsWith('audio/');
}

export function getAttachmentUrl(attachment: MessageAttachment): string {
  return `/api/helpdesk/attachments/${attachment.id}/download`;
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
