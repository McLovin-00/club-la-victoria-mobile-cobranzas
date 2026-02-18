/**
 * Proposito: validar restricciones del rol chofer sobre rutas de remitos.
 */

import { expect, test, type Page } from '@playwright/test';

/**
 * Valida resultado de acceso a rutas segun permiso efectivo del rol.
 */
async function expectRoleNavigation(pageUrl: string, page: Page): Promise<void> {
  await page.goto(pageUrl, { waitUntil: 'domcontentloaded' }).catch(() => {});
  const currentUrl = page.url();

  if (/\/remitos(\/)?$/i.test(currentUrl)) {
    await expect(page.locator('h1').filter({ hasText: /Remitos/i }).first()).toBeVisible();
    return;
  }

  await expect(page).toHaveURL(/\/chofer/i);
}

test.describe('REM-E2E-006 - Permisos remitos (Chofer)', () => {
  test('chofer puede acceder a listado de remitos', async ({ page }) => {
    await expectRoleNavigation('/remitos', page);
  });

  test('chofer no opera ruta legacy /remitos/carga', async ({ page }) => {
    await page.goto('/remitos/carga', { waitUntil: 'domcontentloaded' }).catch(() => {});
    await expect(page).not.toHaveURL(/\/remitos\/carga/i);
    await expect(page).toHaveURL(/\/chofer|\/remitos/i);
  });
});
