/**
 * Attachment Factory for Unit Tests
 * Provides factory functions to create test attachment data
 */

import { MessageAttachment, AttachmentType } from '@helpdesk/prisma-client';

type AttachmentWithoutRelations = Omit<MessageAttachment, 'message'>;

let attachmentCounter = 0;

function generateAttachmentId(): string {
  attachmentCounter += 1;
  return `clxAtt${String(attachmentCounter).padStart(20, 'x')}`;
}

export interface AttachmentBuildOptions {
  id?: string;
  messageId?: string;
  type?: AttachmentType;
  filename?: string;
  mimeType?: string;
  size?: number;
  minioKey?: string;
  minioUrl?: string | null;
  createdAt?: Date;
}

export interface AttachmentBuildResult extends AttachmentWithoutRelations {
  /** Mock file buffer for testing uploads */
  mockBuffer?: Buffer;
}

/**
 * Build a single attachment with default values
 */
export function buildAttachment(options: AttachmentBuildOptions = {}): AttachmentBuildResult {
  const now = new Date();
  
  const attachment: AttachmentBuildResult = {
    id: options.id ?? generateAttachmentId(),
    messageId: options.messageId ?? 'clxMsg0000000000000000000',
    type: options.type ?? 'DOCUMENT',
    filename: options.filename ?? 'test-document.pdf',
    mimeType: options.mimeType ?? 'application/pdf',
    size: options.size ?? 1024,
    minioKey: options.minioKey ?? `attachments/${Date.now()}/test-document.pdf`,
    minioUrl: options.minioUrl ?? null,
    createdAt: options.createdAt ?? now,
    mockBuffer: Buffer.alloc(options.size ?? 1024, 'a'),
  };
  
  return attachment;
}

/**
 * Build multiple attachments with default values
 */
export function buildAttachmentList(count: number, options: AttachmentBuildOptions = {}): AttachmentBuildResult[] {
  return Array.from({ length: count }, (_, index) => 
    buildAttachment({
      ...options,
      filename: options.filename ? `${index + 1}-${options.filename}` : `attachment-${index + 1}.pdf`,
    })
  );
}

/**
 * Build an image attachment
 */
export function buildImageAttachment(options: AttachmentBuildOptions = {}): AttachmentBuildResult {
  const filename = options.filename ?? 'test-image.jpg';
  
  return buildAttachment({
    ...options,
    type: 'IMAGE',
    filename,
    mimeType: options.mimeType ?? 'image/jpeg',
    size: options.size ?? 500 * 1024, // 500KB
    minioKey: options.minioKey ?? `images/${Date.now()}/${filename}`,
  });
}

/**
 * Build an audio attachment
 */
export function buildAudioAttachment(options: AttachmentBuildOptions = {}): AttachmentBuildResult {
  const filename = options.filename ?? 'test-audio.mp3';
  
  return buildAttachment({
    ...options,
    type: 'AUDIO',
    filename,
    mimeType: options.mimeType ?? 'audio/mpeg',
    size: options.size ?? 2 * 1024 * 1024, // 2MB
    minioKey: options.minioKey ?? `audio/${Date.now()}/${filename}`,
  });
}

/**
 * Build a video attachment
 */
export function buildVideoAttachment(options: AttachmentBuildOptions = {}): AttachmentBuildResult {
  const filename = options.filename ?? 'test-video.mp4';
  
  return buildAttachment({
    ...options,
    type: 'VIDEO',
    filename,
    mimeType: options.mimeType ?? 'video/mp4',
    size: options.size ?? 5 * 1024 * 1024, // 5MB
    minioKey: options.minioKey ?? `videos/${Date.now()}/${filename}`,
  });
}

/**
 * Build a document attachment
 */
export function buildDocumentAttachment(options: AttachmentBuildOptions = {}): AttachmentBuildResult {
  const filename = options.filename ?? 'test-document.pdf';
  
  return buildAttachment({
    ...options,
    type: 'DOCUMENT',
    filename,
    mimeType: options.mimeType ?? 'application/pdf',
    size: options.size ?? 1024 * 1024, // 1MB
    minioKey: options.minioKey ?? `documents/${Date.now()}/${filename}`,
  });
}

/**
 * Build an oversized attachment (exceeds limits)
 */
export function buildOversizedAttachment(type: AttachmentType = 'DOCUMENT'): AttachmentBuildResult {
  const sizeMap: Record<AttachmentType, number> = {
    IMAGE: 15 * 1024 * 1024,    // 15MB (limit is 10MB)
    AUDIO: 30 * 1024 * 1024,    // 30MB (limit is 25MB)
    VIDEO: 60 * 1024 * 1024,    // 60MB (limit is 50MB)
    DOCUMENT: 30 * 1024 * 1024, // 30MB (limit is 25MB)
  };
  
  switch (type) {
    case 'IMAGE':
      return buildImageAttachment({ size: sizeMap.IMAGE });
    case 'AUDIO':
      return buildAudioAttachment({ size: sizeMap.AUDIO });
    case 'VIDEO':
      return buildVideoAttachment({ size: sizeMap.VIDEO });
    case 'DOCUMENT':
    default:
      return buildDocumentAttachment({ size: sizeMap.DOCUMENT });
  }
}

/**
 * Build attachments for a specific message
 */
export function buildAttachmentsForMessage(
  messageId: string, 
  count: number = 1,
  type: AttachmentType = 'DOCUMENT'
): AttachmentBuildResult[] {
  return Array.from({ length: count }, () => {
    switch (type) {
      case 'IMAGE':
        return buildImageAttachment({ messageId });
      case 'AUDIO':
        return buildAudioAttachment({ messageId });
      case 'VIDEO':
        return buildVideoAttachment({ messageId });
      case 'DOCUMENT':
      default:
        return buildDocumentAttachment({ messageId });
    }
  });
}

/**
 * Common MIME types for testing
 */
export const MIME_TYPES = {
  images: {
    jpeg: 'image/jpeg',
    jpg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    webp: 'image/webp',
  },
  audio: {
    mp3: 'audio/mpeg',
    wav: 'audio/wav',
    ogg: 'audio/ogg',
    m4a: 'audio/mp4',
  },
  video: {
    mp4: 'video/mp4',
    webm: 'video/webm',
    mov: 'video/quicktime',
    avi: 'video/x-msvideo',
  },
  documents: {
    pdf: 'application/pdf',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    xls: 'application/vnd.ms-excel',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    txt: 'text/plain',
    zip: 'application/zip',
  },
} as const;

/**
 * Reset the attachment counter (useful for test isolation)
 */
export function resetAttachmentCounter(): void {
  attachmentCounter = 0;
}
