/**
 * Propósito: smoke test del Portal Cliente con sesión autenticada (storageState).
 */

import { test, expect } from '@playwright/test';

test.describe('Portal Cliente - Auth (smoke)', () => {
  test('debe abrir el portal cliente con sesión', async ({ page }) => {
    await page.goto('/cliente', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/\/cliente(\/|$)/i);
  });
});


