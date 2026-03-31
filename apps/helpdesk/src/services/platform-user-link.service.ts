/**
 * Este archivo centraliza las consultas de vinculación entre usuarios de Telegram y usuarios de plataforma.
 */

import { prisma } from '../config/database';

interface PlatformUserLookup {
  id: number;
  nombre: string | null;
  apellido: string | null;
  email: string;
}

interface PlatformUserIdLookup {
  id: number;
}

interface PlatformTelegramIdLookup {
  telegram_user_id: bigint | number | string | null;
}

/**
 * Normaliza el username de Telegram para almacenarlo y consultarlo de forma consistente.
 */
export function normalizeTelegramUsername(username: string): string {
  const boundedUsername = username.trim().slice(0, 64);
  let normalizedUsername = boundedUsername;

  while (normalizedUsername.startsWith('@')) {
    normalizedUsername = normalizedUsername.slice(1);
  }

  return normalizedUsername.toLowerCase();
}

/**
 * Convierte el identificador de Telegram a un valor seguro para persistencia.
 */
function toTelegramIdValue(telegramUserId: number): bigint {
  const boundedTelegramUserId = Math.trunc(telegramUserId);

  if (!Number.isSafeInteger(boundedTelegramUserId) || boundedTelegramUserId <= 0) {
    throw new Error(`Identificador de Telegram inválido: ${telegramUserId}`);
  }

  return BigInt(boundedTelegramUserId);
}

/**
 * Convierte el identificador persistido a number cuando sigue siendo seguro en JavaScript.
 */
function fromTelegramIdValue(telegramUserId: bigint | number | string | null): number | null {
  if (telegramUserId === null) {
    return null;
  }

  let numericTelegramUserId: number;

  if (typeof telegramUserId === 'bigint') {
    numericTelegramUserId = Number(telegramUserId);
  } else if (typeof telegramUserId === 'string') {
    numericTelegramUserId = Number(telegramUserId);
  } else {
    numericTelegramUserId = telegramUserId;
  }

  if (!Number.isSafeInteger(numericTelegramUserId) || numericTelegramUserId <= 0) {
    throw new Error(`Identificador de Telegram persistido inválido: ${String(telegramUserId)}`);
  }

  return numericTelegramUserId;
}

/**
 * Busca un usuario de plataforma por username de Telegram previamente normalizado.
 */
export async function findPlatformUserByTelegramUsername(
  username: string
): Promise<{ id: number; email: string } | null> {
  const normalizedUsername = normalizeTelegramUsername(username);

  if (!normalizedUsername) {
    return null;
  }

  const result = await prisma.$queryRaw<PlatformUserLookup[]>`
    SELECT id, nombre, apellido, email
    FROM "platform"."platform_users"
    WHERE telegram_username = ${normalizedUsername}
    LIMIT 1
  `;

  if (result.length === 0) {
    return null;
  }

  return {
    id: result[0].id,
    email: result[0].email,
  };
}

/**
 * Busca un usuario de plataforma por el identificador numérico de Telegram.
 */
export async function findPlatformUserByTelegramId(
  telegramUserId: number
): Promise<{ id: number; email: string } | null> {
  const result = await prisma.$queryRaw<Array<{ id: number; email: string }>>`
    SELECT id, email
    FROM "platform"."platform_users"
    WHERE telegram_user_id = ${toTelegramIdValue(telegramUserId)}
    LIMIT 1
  `;

  return result.length > 0 ? result[0] : null;
}

/**
 * Obtiene el empresa_id del usuario de plataforma (tenant) para asociar tickets.
 */
export async function getPlatformUserEmpresaId(userId: number): Promise<number | null> {
  const result = await prisma.$queryRaw<Array<{ empresa_id: number | null }>>`
    SELECT empresa_id
    FROM "platform"."platform_users"
    WHERE id = ${userId}
    LIMIT 1
  `;

  if (result.length === 0) {
    return null;
  }

  return result[0].empresa_id;
}

/**
 * Devuelve el identificador de Telegram vinculado al usuario de plataforma.
 */
export async function getPlatformUserTelegramId(userId: number): Promise<number | null> {
  const result = await prisma.$queryRaw<PlatformTelegramIdLookup[]>`
    SELECT telegram_user_id
    FROM "platform"."platform_users"
    WHERE id = ${userId}
    LIMIT 1
  `;

  if (result.length === 0) {
    return null;
  }

  return fromTelegramIdValue(result[0].telegram_user_id);
}

/**
 * Vincula el usuario de plataforma con su cuenta de Telegram y guarda el username normalizado.
 */
export async function linkPlatformUserToTelegram(
  userId: number,
  telegramUserId: number,
  telegramUsername?: string
): Promise<void> {
  const normalizedUsername = telegramUsername ? normalizeTelegramUsername(telegramUsername) : null;

  await prisma.$executeRaw`
    UPDATE "platform"."platform_users"
    SET telegram_user_id = ${toTelegramIdValue(telegramUserId)},
        telegram_username = COALESCE(${normalizedUsername}, telegram_username),
        telegram_linked_at = NOW()
    WHERE id = ${userId}
  `;
}
