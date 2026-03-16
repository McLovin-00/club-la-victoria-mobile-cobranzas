/**
 * Download Token - Tokens HMAC firmados para descarga directa de documentos
 * 
 * Permite generar URLs de descarga que no requieren JWT en el header,
 * habilitando links directos en nuevas pestañas del navegador.
 * 
 * El token se firma con HMAC-SHA256 usando la clave pública JWT como secreto
 * (disponible en el servicio, a diferencia de la clave privada).
 */

import * as crypto from 'crypto';
import { getJwtPublicKey } from './jwt.utils';
import { AppLogger } from '../config/logger';

interface DownloadTokenPayload {
  documentId: number;
  tenantEmpresaId: number;
  userId: number;
  role: string;
  empresaId: number | null;
  exp: number;
}

const TOKEN_EXPIRY_SECONDS = 3600; // 1 hora

function getHmacSecret(): string {
  return getJwtPublicKey();
}

function sign(payload: DownloadTokenPayload): string {
  const json = JSON.stringify(payload);
  const data = Buffer.from(json).toString('base64url');
  const hmac = crypto.createHmac('sha256', getHmacSecret()).update(data).digest('base64url');
  return `${data}.${hmac}`;
}

function verify(token: string): DownloadTokenPayload | null {
  const parts = token.split('.');
  if (parts.length !== 2) return null;

  const [data, providedHmac] = parts;
  const expectedHmac = crypto.createHmac('sha256', getHmacSecret()).update(data).digest('base64url');

  if (!crypto.timingSafeEqual(Buffer.from(providedHmac), Buffer.from(expectedHmac))) {
    return null;
  }

  try {
    const payload: DownloadTokenPayload = JSON.parse(Buffer.from(data, 'base64url').toString());
    if (Date.now() > payload.exp * 1000) {
      AppLogger.debug('Download token expirado', { documentId: payload.documentId });
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

export function createDownloadToken(
  documentId: number,
  tenantEmpresaId: number,
  userId: number,
  role: string,
  empresaId: number | null,
): string {
  const payload: DownloadTokenPayload = {
    documentId,
    tenantEmpresaId,
    userId,
    role,
    empresaId,
    exp: Math.floor(Date.now() / 1000) + TOKEN_EXPIRY_SECONDS,
  };
  return sign(payload);
}

export function verifyDownloadToken(token: string): DownloadTokenPayload | null {
  return verify(token);
}
