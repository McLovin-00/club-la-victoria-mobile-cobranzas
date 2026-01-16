/**
 * Propósito: Tests del Portal Admin Interno - Sección 13 (Eliminar equipo).
 *
 * IMPORTANTE: destructivo. Por defecto queda SKIP.
 */

import { test } from '@playwright/test';
import { isBaseUrlReachable } from '../helpers/reachability';

test.beforeAll(async ({ request }) => {
  const ok = await isBaseUrlReachable(request);
  test.skip(!ok, 'Ambiente de testing inaccesible (VPN/URL).');
});

test.describe('Portal Admin Interno - 13. ELIMINAR EQUIPO', () => {
  test.skip('Eliminar equipo (destructivo)', async () => {});
});


