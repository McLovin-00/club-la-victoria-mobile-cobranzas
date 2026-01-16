/**
 * Propósito: cargar y validar variables de entorno para los tests E2E.
 * Nota: nunca loguear secretos (passwords/tokens).
 */

import { config as loadDotenv } from 'dotenv';

// Cargamos .env si existe (solo local). En CI generalmente se inyecta por variables.
loadDotenv();

export type Role =
  | 'cliente'
  | 'chofer'
  | 'transportista'
  | 'dadorDeCarga'
  | 'adminInterno';

export type RoleCredentials = {
  role: Role;
  email: string;
};

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value || value.trim().length === 0) {
    throw new Error(`Falta variable de entorno requerida: ${name}`);
  }
  return value.trim();
}

/**
 * Devuelve configuración base (sin secretos).
 */
export function getBaseConfig() {
  // URL definida en .env (staging: 10.3.0.243:8550 | testing: 10.3.0.246:8560)
  const baseUrl = requireEnv('TEST_BASE_URL');
  const loginPath = process.env.TEST_LOGIN_PATH?.trim() || '/login';

  return { baseUrl, loginPath };
}

/**
 * Devuelve URLs de microservicios usadas por los tests (sin secretos).
 *
 * Nota: en el entorno 10.3.0.246 el stack expone:
 * - Frontend: :8560
 * - Backend API: :4810
 * - Documentos API: :4812
 */
export function getServiceUrls() {
  const { baseUrl } = getBaseConfig();
  const base = new URL(baseUrl);

  const platformApiUrl =
    (process.env.PLATFORM_API_URL?.trim() || '').trim() ||
    `${base.protocol}//${base.hostname}:4810`;

  const documentosApiUrl =
    (process.env.DOCUMENTOS_API_URL?.trim() || '').trim() ||
    `${base.protocol}//${base.hostname}:4812`;

  return { platformApiUrl, documentosApiUrl };
}

/**
 * Devuelve la password para un rol específico.
 * Cada portal tiene su propia variable de entorno:
 * - CLIENTE_PASSWORD
 * - CHOFER_PASSWORD
 * - TRANSPORTISTA_PASSWORD
 * - DADOR_PASSWORD
 * - ADMIN_INTERNO_PASSWORD
 *
 * IMPORTANTE: no loguear el retorno de esta función.
 */
export function getPasswordForRole(role: Role): string {
  const passwordEnvMap: Record<Role, string> = {
    cliente: 'CLIENTE_PASSWORD',
    chofer: 'CHOFER_PASSWORD',
    transportista: 'TRANSPORTISTA_PASSWORD',
    dadorDeCarga: 'DADOR_PASSWORD',
    adminInterno: 'ADMIN_INTERNO_PASSWORD',
  };

  return requireEnv(passwordEnvMap[role]);
}

export type FullRoleCredentials = {
  role: Role;
  email: string;
  password: string;
};

export function getRoleCredentials(): FullRoleCredentials[] {
  return [
    { role: 'cliente', email: requireEnv('CLIENTE_EMAIL'), password: getPasswordForRole('cliente') },
    { role: 'chofer', email: requireEnv('CHOFER_EMAIL'), password: getPasswordForRole('chofer') },
    { role: 'transportista', email: requireEnv('TRANSPORTISTA_EMAIL'), password: getPasswordForRole('transportista') },
    { role: 'dadorDeCarga', email: requireEnv('DADOR_EMAIL'), password: getPasswordForRole('dadorDeCarga') },
    { role: 'adminInterno', email: requireEnv('ADMIN_INTERNO_EMAIL'), password: getPasswordForRole('adminInterno') },
  ];
}


