/**
 * Propósito: leer tokens/usuario desde `storageState` de Playwright (.auth/*.json)
 * para evitar logins extra y minimizar rate limit.
 */

import fs from 'fs';

type StorageState = {
  cookies?: Array<{ name: string; value: string }>;
  origins?: Array<{ origin: string; localStorage?: Array<{ name: string; value: string }> }>;
};

export type StorageAuth = {
  origin: string;
  token: string;
  user: {
    empresaId: number;
    dadorCargaId?: number | null;
    empresaTransportistaId?: number | null;
    choferId?: number | null;
    clienteId?: number | null;
  };
};

export function readStorageAuth(storageStatePath: string): StorageAuth {
  const raw = fs.readFileSync(storageStatePath, 'utf8');
  const parsed = JSON.parse(raw) as StorageState;

  const originEntry = parsed.origins?.[0];
  if (!originEntry?.origin) throw new Error(`storageState inválido: falta origin en ${storageStatePath}`);

  const token = originEntry.localStorage?.find((i) => i.name === 'token')?.value;
  const userRaw = originEntry.localStorage?.find((i) => i.name === 'user')?.value;

  if (!token) throw new Error(`storageState inválido: falta localStorage.token en ${storageStatePath}`);
  if (!userRaw) throw new Error(`storageState inválido: falta localStorage.user en ${storageStatePath}`);

  const user = JSON.parse(userRaw) as { empresaId: number; clienteId?: number | null };
  if (typeof user.empresaId !== 'number') throw new Error(`storageState inválido: user.empresaId no es number en ${storageStatePath}`);

  return { origin: originEntry.origin, token, user };
}


