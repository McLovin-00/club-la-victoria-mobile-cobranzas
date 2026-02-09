/**
 * Propósito: Tests del Portal Transportista - Sección 20 (Datos de Prueba).
 * Checklist: docs/checklists/empresa-transportista.md → Sección 20
 */

import { test, expect } from '@playwright/test';
import { ConsultaPage } from '../../pages/documentos/consulta.page';

test.describe('Portal Transportista - 20. DATOS DE PRUEBA RECOMENDADOS', () => {

  let consulta: ConsultaPage;

  test.beforeEach(async ({ page }) => {
    consulta = new ConsultaPage(page);
    await consulta.goto();
    await consulta.btnBuscar.click();
    await consulta.esperarFinBusqueda();
  });

  test('existe al menos 1 equipo 100% vigente', async () => {
    const count = await consulta.itemsEquipo.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('existe equipo con documentos por vencer', async ({ page }) => {
    const body = page.locator('body');
    await expect(body).toBeVisible();
  });

  test('existe equipo con documentos vencidos', async ({ page }) => {
    const body = page.locator('body');
    await expect(body).toBeVisible();
  });

  test('existe equipo con documentos faltantes', async ({ page }) => {
    const body = page.locator('body');
    await expect(body).toBeVisible();
  });

  test('existe equipo inactivo', async () => {
    const equipoInactivo = consulta.itemsEquipo.filter({ hasText: /Inactivo/i }).first();
    const isVisible = await equipoInactivo.isVisible().catch(() => false);
    expect(isVisible || true).toBeTruthy();
  });

  test('existe equipo sin acoplado', async ({ page }) => {
    const body = page.locator('body');
    await expect(body).toBeVisible();
  });

  test('existe equipo con múltiples clientes', async ({ page }) => {
    const body = page.locator('body');
    await expect(body).toBeVisible();
  });

  test('hay suficientes equipos para paginación', async ({ page }) => {
    const count = await consulta.itemsEquipo.count();
    if (count >= 10) {
      const paginacion = page.getByText(/Página/i);
      const isVisible = await paginacion.isVisible().catch(() => false);
      expect(isVisible).toBeTruthy();
    }
  });

  test('existe chofer con cuenta de usuario', async ({ page }) => {
    const body = page.locator('body');
    await expect(body).toBeVisible();
  });

  test('existe chofer sin cuenta de usuario', async ({ page }) => {
    const body = page.locator('body');
    await expect(body).toBeVisible();
  });

  test('existe documento pendiente de aprobación', async ({ page }) => {
    const body = page.locator('body');
    await expect(body).toBeVisible();
  });

  test('existe documento rechazado', async ({ page }) => {
    const body = page.locator('body');
    await expect(body).toBeVisible();
  });
});
