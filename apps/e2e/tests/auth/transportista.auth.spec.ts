/**
 * Propósito: smoke test del Portal Empresa Transportista con sesión autenticada (storageState).
 */

import { test, expect } from '@playwright/test';

test.describe('Portal Empresa Transportista - Auth (smoke)', () => {
  test('debe abrir el portal transportista con sesión', async ({ page }) => {
    await page.goto('/transportista', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/\/transportista(\/|$)/i);
  });
});


