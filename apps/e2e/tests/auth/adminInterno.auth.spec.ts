/**
 * Propósito: smoke test del Portal Admin Interno con sesión autenticada (storageState).
 */

import { test, expect } from '@playwright/test';

test.describe('Portal Admin Interno - Auth (smoke)', () => {
  test('debe abrir el portal admin interno con sesión', async ({ page }) => {
    await page.goto('/portal/admin-interno', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/\/portal\/admin-interno(\/|$)/i);
  });
});


