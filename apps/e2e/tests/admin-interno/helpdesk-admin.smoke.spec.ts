/**
 * Propósito: smoke test del panel admin de Mesa de Ayuda con sesión autenticada.
 */

import { test, expect } from '@playwright/test';

test.describe('Helpdesk Admin - Smoke', () => {
  test('debe abrir el panel admin de helpdesk con sesión', async ({ page }) => {
    await page.goto('/admin/helpdesk', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/\/admin\/helpdesk(\/|$)/i);
  });
});
