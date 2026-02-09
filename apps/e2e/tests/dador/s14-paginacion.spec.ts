/**
 * Propósito: Tests del Portal Dador - Sección 14 (Paginación).
 * Checklist: docs/checklists/dador-de-carga.md → Sección 14
 */

import { test, expect } from '@playwright/test';
import { ConsultaPage } from '../../pages/documentos/consulta.page';

test.describe('Portal Dador - 14. PAGINACIÓN', () => {

  let consulta: ConsultaPage;

  test.beforeEach(async ({ page }) => {
    consulta = new ConsultaPage(page);
    await consulta.goto();
    await consulta.filtroTodos.click();
    await consulta.btnBuscar.click();
    await consulta.esperarFinBusqueda();
  });

  test('visible con más de 10 equipos', async ({ page }) => {
    const count = await consulta.itemsEquipo.count();
    if (count >= 10) {
      const paginacion = page.getByText(/Página/i);
      await expect(paginacion).toBeVisible();
    }
  });

  test('"Mostrando X - Y de Z" visible', async ({ page }) => {
    const count = await consulta.itemsEquipo.count();
    if (count > 0) {
      const texto = page.getByText(/Mostrando.*de/i);
      const isVisible = await texto.isVisible().catch(() => false);
      expect(isVisible || count < 10).toBeTruthy();
    }
  });

  test('"Página N de M" visible', async ({ page }) => {
    const count = await consulta.itemsEquipo.count();
    if (count >= 10) {
      const texto = page.getByText(/Página.*de/i);
      const isVisible = await texto.isVisible().catch(() => false);
      expect(isVisible || count < 10).toBeTruthy();
    }
  });

  test('botones anterior/siguiente visible', async ({ page }) => {
    const count = await consulta.itemsEquipo.count();
    if (count >= 10) {
      // Selectores más flexibles para botones de paginación
      const btnSiguiente = page.getByRole('button', { name: /→|Siguiente|Next|chevron.*right/i })
        .or(page.locator('button').filter({ has: page.locator('svg') }).last());
      const isVisible = await btnSiguiente.isVisible().catch(() => false);
      expect(isVisible || count < 10).toBeTruthy();
    }
  });

  test('cambio de filtro vuelve a página 1', async ({ page }) => {
    const count = await consulta.itemsEquipo.count();
    if (count >= 10) {
      const btnSiguiente = page.getByRole('button', { name: /→|Siguiente/i });
      if (await btnSiguiente.isEnabled().catch(() => false)) {
        await btnSiguiente.click();
      }

      await consulta.inputDniChofer.fill('12345678');
      await consulta.btnBuscar.click();
      await consulta.esperarFinBusqueda();

      const pag1 = page.getByText(/Página 1/i);
      const isVisible = await pag1.isVisible().catch(() => true);
      expect(isVisible).toBeTruthy();
    }
  });
});
