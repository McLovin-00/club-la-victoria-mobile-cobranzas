/**
 * Propósito: Tests del Portal Admin Interno - Sección 21 (Seguridad).
 */

import { test, expect } from '@playwright/test';
import { isBaseUrlReachable } from '../helpers/reachability';
import { PlatformUsersPage } from '../../pages/platform-users/platformUsers.page';

test.beforeAll(async ({ request }) => {
  const ok = await isBaseUrlReachable(request);
  test.skip(!ok, 'Ambiente de testing inaccesible (VPN/URL).');
});

test.describe('Portal Admin Interno - 21. SEGURIDAD', () => {
  test('21.3 Restricciones: en /platform-users no ofrece ADMIN/SUPERADMIN/ADMIN_INTERNO', async ({ page }) => {
    const users = new PlatformUsersPage(page);
    await users.goto();
    await users.abrirModalNuevoUsuario();

    const options = users.selectRol.locator('option');
    const texts: string[] = [];
    for (let i = 0; i < (await options.count()); i++) texts.push((await options.nth(i).innerText()).trim());

    expect(texts).not.toContain('ADMIN_INTERNO');
    expect(texts).not.toContain('ADMIN');
    expect(texts).not.toContain('SUPERADMIN');
  });
});


