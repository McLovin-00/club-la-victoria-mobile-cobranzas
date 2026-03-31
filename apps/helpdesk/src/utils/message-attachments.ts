/**
 * Sanitiza nombres de archivo y sube adjuntos a MinIO para mensajes de tickets.
 */

import type { Express } from 'express';
import { validateAttachment } from '../schemas/message.schema';
import { uploadFile } from '../config/minio';

export type PersistedMessageAttachment = {
  type: 'IMAGE' | 'AUDIO' | 'VIDEO' | 'DOCUMENT';
  filename: string;
  mimeType: string;
  size: number;
  minioKey: string;
};

/** Limita y normaliza el nombre de archivo para almacenamiento seguro. */
export function sanitizeFilename(filename: string): string {
  const bounded = filename.slice(0, 120);
  return bounded.replace(/[^a-zA-Z0-9._-]/g, '_');
}

/** Genera clave de objeto en MinIO por ticket y nombre original. */
export function buildAttachmentObjectName(ticketId: string, originalName: string): string {
  const safeTicketId = ticketId.slice(0, 64).replace(/[^a-zA-Z0-9_-]/g, '_');
  const safeName = sanitizeFilename(originalName);
  const uniquePart = `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  return `tickets/${safeTicketId}/${uniquePart}_${safeName}`;
}

export type PersistAttachmentsResult =
  | { ok: true; attachments: PersistedMessageAttachment[] }
  | { ok: false; message: string };

/**
 * Valida y persiste archivos subidos (multer); devuelve error si algún archivo no cumple reglas.
 */
export async function persistUploadedMessageFiles(
  files: Express.Multer.File[],
  ticketIdParam: string
): Promise<PersistAttachmentsResult> {
  const attachments: PersistedMessageAttachment[] = [];

  for (const file of files) {
    const validation = validateAttachment(file);
    if (!validation.valid || !validation.type) {
      return { ok: false, message: validation.error || 'Adjunto inválido' };
    }

    const objectName = buildAttachmentObjectName(ticketIdParam, file.originalname);
    await uploadFile(objectName, file.buffer, {
      'Content-Type': file.mimetype,
      'X-Original-Filename': sanitizeFilename(file.originalname),
    });

    attachments.push({
      type: validation.type,
      filename: sanitizeFilename(file.originalname),
      mimeType: file.mimetype,
      size: file.size,
      minioKey: objectName,
    });
  }

  return { ok: true, attachments };
}
