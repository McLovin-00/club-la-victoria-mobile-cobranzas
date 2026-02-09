/**
 * Propósito: smoke test del Portal Dador de Carga con sesión autenticada (storageState).
 */

import { test, expect } from '@playwright/test';

test.describe('Portal Dador de Carga - Auth (smoke)', () => {
  test('debe abrir el portal dador con sesión', async ({ page }) => {
    await page.goto('/dador', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/\/dador(\/|$)/i);
  });
});


