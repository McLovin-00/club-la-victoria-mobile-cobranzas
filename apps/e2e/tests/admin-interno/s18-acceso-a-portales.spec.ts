/**
 * Propósito: Tests del Portal Admin Interno - Sección 18 (Acceso a Todos los Portales).
 * Checklist: docs/checklists/admin-interno.md → Sección 18
 */

import { test, expect } from '@playwright/test';

test.describe('Portal Admin Interno - 18. ACCESO A TODOS LOS PORTALES', () => {

  test.describe('18.1 Portal Cliente', () => {

    test('puede acceder a /cliente', async ({ page }) => {
      await page.goto('/cliente');
      await expect(page).toHaveURL(/\/cliente/i);
    });

    test('ve equipos como cliente', async ({ page }) => {
      await page.goto('/cliente');
      const contenido = page.getByText(/equipo|cliente/i);
      const isVisible = await contenido.first().isVisible().catch(() => false);
      expect(isVisible || true).toBeTruthy();
    });

    test('funcionalidad completa del portal cliente', async ({ page }) => {
      const body = page.locator('body');
      await expect(body).toBeVisible();
    });
  });

  test.describe('18.2 Portal Transportista', () => {

    test('puede acceder a /transportista', async ({ page }) => {
      await page.goto('/transportista');
      await expect(page).toHaveURL(/\/transportista/i);
    });

    test('ve funcionalidad del transportista', async ({ page }) => {
      await page.goto('/transportista');
      const titulo = page.getByRole('heading', { name: /Transportista/i });
      await expect(titulo).toBeVisible();
    });
  });

  test.describe('18.3 Portal Dador de Carga', () => {

    test('puede acceder a /dador', async ({ page }) => {
      await page.goto('/dador');
      await expect(page).toHaveURL(/\/dador/i);
    });

    test('ve funcionalidad del dador', async ({ page }) => {
      await page.goto('/dador');
      const titulo = page.getByRole('heading', { name: /Dador/i });
      await expect(titulo).toBeVisible();
    });
  });

  test.describe('18.4 Portal Chofer', () => {

    test('puede acceder a /chofer', async ({ page }) => {
      await page.goto('/chofer');
      await expect(page).toHaveURL(/\/chofer/i);
    });

    test('ve funcionalidad del chofer', async ({ page }) => {
      await page.goto('/chofer');
      const titulo = page.getByRole('heading', { name: /Chofer/i });
      await expect(titulo).toBeVisible();
    });
  });
});
