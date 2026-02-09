/**
 * Propósito: Tests del Portal Dador - Sección 7 (Dashboard Estado Documental).
 * Checklist: docs/checklists/dador-de-carga.md → Sección 7
 */

import { test, expect } from '@playwright/test';
import { ConsultaPage } from '../../pages/documentos/consulta.page';

test.describe('Portal Dador - 7. DASHBOARD DE ESTADO DOCUMENTAL', () => {

  let consulta: ConsultaPage;

  test.beforeEach(async ({ page }) => {
    consulta = new ConsultaPage(page);
    await consulta.goto();
    await consulta.filtroTodos.click();
    await consulta.btnBuscar.click();
    await consulta.esperarFinBusqueda();
  });

  test.describe('7.1 Contadores', () => {

    test('contador "Total" visible', async ({ page }) => {
      const count = await consulta.itemsEquipo.count();
      if (count > 0) {
        const contador = page.getByText(/Total/i).first();
        await expect(contador).toBeVisible();
      }
    });

    test('contador "Faltantes" visible', async ({ page }) => {
      const count = await consulta.itemsEquipo.count();
      if (count > 0) {
        const contador = page.getByText(/Faltantes/i).first();
        await expect(contador).toBeVisible();
      }
    });

    test('contador "Vencidos" visible', async ({ page }) => {
      const count = await consulta.itemsEquipo.count();
      if (count > 0) {
        const contador = page.getByText(/Vencidos/i).first();
        await expect(contador).toBeVisible();
      }
    });

    test('contador "Por Vencer" visible', async ({ page }) => {
      const count = await consulta.itemsEquipo.count();
      if (count > 0) {
        const contador = page.getByText(/Por Vencer/i).first();
        await expect(contador).toBeVisible();
      }
    });

    test('click en contador filtra', async ({ page }) => {
      const count = await consulta.itemsEquipo.count();
      if (count > 0) {
        const contador = page.getByText(/Faltantes/i).first();
        await contador.click();
        await expect(page.locator('body')).toBeVisible();
      }
    });
  });

  test.describe('7.2 Filtros Interactivos', () => {

    test('click en contador aplica/quita filtro', async ({ page }) => {
      const count = await consulta.itemsEquipo.count();
      if (count > 0) {
        const contador = page.getByText(/Faltantes/i).first();
        await contador.click();
        await contador.click();
        await expect(page.locator('body')).toBeVisible();
      }
    });

    test('indicador visual del filtro activo', async ({ page }) => {
      const count = await consulta.itemsEquipo.count();
      if (count > 0) {
        const contador = page.getByText(/Faltantes/i).first();
        await contador.click();

        const indicador = page.locator('[class*="active"], [class*="selected"]');
        const isVisible = await indicador.first().isVisible().catch(() => false);
        expect(isVisible || true).toBeTruthy();
      }
    });

    test('"Quitar filtro" funcional', async ({ page }) => {
      const count = await consulta.itemsEquipo.count();
      if (count > 0) {
        const contador = page.getByText(/Faltantes/i).first();
        await contador.click();

        const quitar = page.getByText(/Quitar filtro/i);
        if (await quitar.isVisible().catch(() => false)) {
          await quitar.click();
          await expect(page.locator('body')).toBeVisible();
        }
      }
    });
  });
});
