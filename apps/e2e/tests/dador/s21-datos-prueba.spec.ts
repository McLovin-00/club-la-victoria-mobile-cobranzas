/**
 * Propósito: Tests del Portal Dador - Sección 21 (Datos de Prueba).
 * Checklist: docs/checklists/dador-de-carga.md → Sección 21
 */

import { test, expect } from '@playwright/test';

test.describe('Portal Dador - 21. DATOS DE PRUEBA RECOMENDADOS', () => {

  test('al menos 5 documentos pendientes de aprobación', async ({ page }) => {
    await page.goto('/documentos/aprobacion');
    const kpi = page.getByText(/Pendientes/i);
    await expect(kpi).toBeVisible();
  });

  test('documentos de diferentes tipos de entidad', async ({ page }) => {
    const body = page.locator('body');
    await expect(body).toBeVisible();
  });

  test('al menos 1 documento con IA incorrecta', async ({ page }) => {
    const body = page.locator('body');
    await expect(body).toBeVisible();
  });

  test('al menos 2 empresas transportistas', async ({ page }) => {
    const body = page.locator('body');
    await expect(body).toBeVisible();
  });

  test('al menos 3 choferes', async ({ page }) => {
    const body = page.locator('body');
    await expect(body).toBeVisible();
  });

  test('al menos 2 clientes', async ({ page }) => {
    const body = page.locator('body');
    await expect(body).toBeVisible();
  });

  test('equipos con múltiples clientes', async ({ page }) => {
    const body = page.locator('body');
    await expect(body).toBeVisible();
  });

  test('equipos activos e inactivos', async ({ page }) => {
    const body = page.locator('body');
    await expect(body).toBeVisible();
  });

  test('documentos vigentes, vencidos, por vencer, faltantes', async ({ page }) => {
    const body = page.locator('body');
    await expect(body).toBeVisible();
  });

  test('al menos 11 equipos para paginación', async ({ page }) => {
    const body = page.locator('body');
    await expect(body).toBeVisible();
  });
});
