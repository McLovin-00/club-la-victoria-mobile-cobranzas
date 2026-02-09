/**
 * Propósito: helpers para evitar falsos negativos cuando el ambiente de testing no responde
 * (por ejemplo VPN caída o URL inaccesible).
 */

import type { APIRequestContext } from '@playwright/test';
import { getBaseConfig } from '../../utils/env';

/**
 * Verifica si el `BASE_URL` responde (request GET) en un timeout corto.
 * No loguea detalles para evitar ruido y/o filtrar información.
 */
export async function isBaseUrlReachable(request: APIRequestContext, timeoutMs = 5_000): Promise<boolean> {
  const { baseUrl } = getBaseConfig();
  try {
    const resp = await request.get(baseUrl, { timeout: timeoutMs });
    // Consideramos "reachable" si responde con cualquier status HTTP (incluye 401/403/etc).
    return resp.status() >= 100;
  } catch {
    return false;
  }
}


