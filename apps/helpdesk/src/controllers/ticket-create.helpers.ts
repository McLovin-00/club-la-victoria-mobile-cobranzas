/**
 * Validación y armado del payload al crear ticket con multipart (chat web + adjuntos).
 */

import type { Express } from 'express';
import { validateAttachment } from '../schemas/message.schema';
import {
  createTicketMultipartFieldsSchema,
  type CreateTicketInput,
  type CreateTicketMultipartFields,
} from '../schemas/ticket.schema';

const MIN_MESSAGE_LEN = 10;

const FALLBACK_WITH_FILES = 'Consulta con archivos adjuntos desde la plataforma web.';

/** Detecta cuerpo multipart sin depender de APIs opcionales del request. */
export function isMultipartCreateRequest(req: { headers: { 'content-type'?: string } }): boolean {
  const ct = req.headers['content-type'];
  return typeof ct === 'string' && ct.toLowerCase().includes('multipart/form-data');
}

export function normalizeMulterFiles(files: unknown): Express.Multer.File[] {
  if (!Array.isArray(files)) return [];
  return files;
}

export function prevalidateTicketAttachments(
  files: Express.Multer.File[]
): { ok: true } | { ok: false; message: string } {
  for (const file of files) {
    const v = validateAttachment(file);
    if (!v.valid) {
      return { ok: false, message: v.error || 'Adjunto inválido' };
    }
  }
  return { ok: true };
}

/**
 * Mensaje inicial: mínimo 10 caracteres salvo que haya adjuntos (misma idea que mensajes en Telegram).
 */
export function buildInitialTicketMessage(
  trimmedMessage: string,
  fileCount: number
): { ok: true; message: string } | { ok: false; message: string } {
  if (trimmedMessage.length >= MIN_MESSAGE_LEN) {
    return { ok: true, message: trimmedMessage };
  }
  if (fileCount === 0) {
    return {
      ok: false,
      message: `El mensaje debe tener al menos ${MIN_MESSAGE_LEN} caracteres o incluí al menos un archivo.`,
    };
  }
  if (trimmedMessage.length === 0) {
    return { ok: true, message: FALLBACK_WITH_FILES };
  }
  return { ok: true, message: `${trimmedMessage}\n\n(Incluye archivos adjuntos.)` };
}

export function parseMultipartTicketBody(
  body: unknown
):
  | { ok: true; data: CreateTicketMultipartFields }
  | { ok: false; errors: Record<string, string[] | undefined> } {
  const r = createTicketMultipartFieldsSchema.safeParse(body);
  if (!r.success) {
    return { ok: false, errors: r.error.flatten().fieldErrors };
  }
  return { ok: true, data: r.data };
}

/** Arma el objeto que espera ticketService.create. */
export function toCreateTicketInput(
  fields: CreateTicketMultipartFields,
  resolvedMessage: string
): CreateTicketInput {
  return {
    category: fields.category,
    subcategory: fields.subcategory,
    subject: fields.subject,
    priority: fields.priority,
    message: resolvedMessage.slice(0, 5000),
  };
}
