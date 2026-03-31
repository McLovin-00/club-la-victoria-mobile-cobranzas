import { z } from 'zod';

// Message sender type enum
export const messageSenderTypeSchema = z.enum(['USER', 'RESOLVER', 'SYSTEM']);
export type MessageSenderType = z.infer<typeof messageSenderTypeSchema>;

// Attachment type enum
export const attachmentTypeSchema = z.enum(['IMAGE', 'AUDIO', 'VIDEO', 'DOCUMENT']);
export type AttachmentType = z.infer<typeof attachmentTypeSchema>;

// Create message schema
export const createMessageSchema = z.object({
  content: z.string().trim().min(1, 'El mensaje no puede estar vacío').max(5000, 'El mensaje no puede exceder 5000 caracteres'),
});

export type CreateMessageInput = z.infer<typeof createMessageSchema>;

// List messages query schema
export const listMessagesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export type ListMessagesQuery = z.infer<typeof listMessagesQuerySchema>;

// MIME type validation constants
export const ALLOWED_MIME_TYPES: Record<AttachmentType, string[]> = {
  IMAGE: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  AUDIO: ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp4', 'audio/x-m4a', 'audio/webm'],
  VIDEO: ['video/mp4', 'video/webm', 'video/quicktime'],
  DOCUMENT: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'text/csv',
  ],
};

// Max file sizes per type (in bytes)
export const MAX_FILE_SIZES: Record<AttachmentType, number> = {
  IMAGE: 10 * 1024 * 1024, // 10MB
  AUDIO: 25 * 1024 * 1024, // 25MB
  VIDEO: 50 * 1024 * 1024, // 50MB
  DOCUMENT: 25 * 1024 * 1024, // 25MB
};

// Helper to determine attachment type from MIME
export const getAttachmentType = (mimeType: string): AttachmentType | null => {
  for (const [type, mimes] of Object.entries(ALLOWED_MIME_TYPES)) {
    if (mimes.includes(mimeType)) {
      return type as AttachmentType;
    }
  }
  return null;
};

// Helper to validate file
export const validateAttachment = (file: Express.Multer.File): { valid: boolean; error?: string; type?: AttachmentType } => {
  const type = getAttachmentType(file.mimetype);
  
  if (!type) {
    return { 
      valid: false, 
      error: `Tipo de archivo no permitido: ${file.mimetype}. Permitidos: imágenes, audio, video, documentos PDF/Office.` 
    };
  }
  
  const maxSize = MAX_FILE_SIZES[type];
  if (file.size > maxSize) {
    const maxMB = Math.round(maxSize / (1024 * 1024));
    return { 
      valid: false, 
      error: `El archivo excede el tamaño máximo de ${maxMB}MB para archivos de tipo ${type.toLowerCase()}.` 
    };
  }
  
  return { valid: true, type };
};
