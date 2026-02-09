/**
 * Propósito: smoke test del Portal Chofer con sesión autenticada (storageState).
 */

import { test, expect } from '@playwright/test';

test.describe('Portal Chofer - Auth (smoke)', () => {
  test('debe abrir el portal chofer con sesión', async ({ page }) => {
    await page.goto('/chofer', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/\/chofer(\/|$)/i);
  });
});


