/**
 * Proposito: validar permisos del rol dador en modulo de remitos.
 */

import { expect, test } from '@playwright/test';

test.describe('REM-E2E-006 - Permisos remitos (Dador)', () => {
  test('dador puede acceder al listado de remitos', async ({ page }) => {
    await page.goto('/remitos', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/\/remitos/i);
    await expect(page.locator('h1').filter({ hasText: /Remitos/i }).first()).toBeVisible();

    await page.goto('/remitos/carga', { waitUntil: 'domcontentloaded' }).catch(() => {});
    await expect(page).not.toHaveURL(/\/remitos\/carga/i);
    await expect(page).toHaveURL(/\/dador|\/remitos/i);
  });

  test('dador no debe ver accion de aprobar remitos si fue removida del rol', async ({ page }) => {
    await page.goto('/remitos', { waitUntil: 'domcontentloaded' });

    const approveButton = page.getByRole('button', { name: /Aprobar/i }).first();
    const isVisible = await approveButton.isVisible().catch(() => false);
    expect(isVisible).toBeFalsy();
  });
});
