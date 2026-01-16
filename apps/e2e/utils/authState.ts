/**
 * Propósito: helpers para manejar storageState de autenticación por rol.
 */

import fs from 'fs';
import path from 'path';
import type { Role } from './env';

/** Carpeta donde guardamos sesiones (fuera de test-results para que no se borre). */
const AUTH_DIR = '.auth';

export function getAuthStatePath(role: Role): string {
  return path.join(AUTH_DIR, `${role}.json`);
}

/**
 * Decide si debemos reusar un storageState existente para evitar re-logins.
 * - Por defecto: reusa si existe.
 * - Si FORCE_RELOGIN=1: fuerza regeneración.
 */
export function shouldReuseAuthState(role: Role): boolean {
  if (process.env.FORCE_RELOGIN?.trim() === '1') return false;
  return fs.existsSync(getAuthStatePath(role));
}

export function ensureAuthDirExists() {
  fs.mkdirSync(AUTH_DIR, { recursive: true });
}


