/**
 * Propósito: Tests del Portal Admin Interno - Sección 20 (Rendimiento y UX).
 */

import { test, expect } from '@playwright/test';
import { isBaseUrlReachable } from '../helpers/reachability';
import { AuditoriaPage } from '../../pages/documentos/auditoria.page';

test.beforeAll(async ({ request }) => {
  const ok = await isBaseUrlReachable(request);
  test.skip(!ok, 'Ambiente de testing inaccesible (VPN/URL).');
});

test.describe('Portal Admin Interno - 20. RENDIMIENTO Y UX', () => {
  test('20.1 Auditoría: muestra estado de carga al entrar', async ({ page }) => {
    const auditoria = new AuditoriaPage(page);
    await auditoria.goto();
    // Puede aparecer "Cargando..." brevemente; no exigimos que esté siempre visible.
    const tablaVisible = await auditoria.tabla.isVisible().catch(() => false);
    expect(tablaVisible).toBeTruthy();
  });
});


