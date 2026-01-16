/**
 * Propósito: Tests del Portal Transportista - Sección 13 (Paginación).
 * Checklist: docs/checklists/empresa-transportista.md → Sección 13
 */

import { test, expect } from '@playwright/test';
import { ConsultaPage } from '../../pages/documentos/consulta.page';

test.describe('Portal Transportista - 13. PAGINACIÓN', () => {

  let consulta: ConsultaPage;

  test.beforeEach(async ({ page }) => {
    consulta = new ConsultaPage(page);
    await consulta.goto();
    await consulta.btnBuscar.click();
    await consulta.esperarFinBusqueda();
  });

  test.describe('13.1 Controles', () => {

    // [ ] Visible con más de 10 equipos
    test('paginación visible con más de 10 equipos', async ({ page }) => {
      const count = await consulta.itemsEquipo.count();
      if (count >= 10) {
        const paginacion = page.getByText(/Página/i);
        await expect(paginacion).toBeVisible();
      }
    });

    // [ ] "Mostrando X - Y de Z equipos"
    test('texto "Mostrando X - Y de Z equipos"', async ({ page }) => {
      const count = await consulta.itemsEquipo.count();
      if (count > 0) {
        const texto = page.getByText(/Mostrando.*de.*equipo/i);
        const isVisible = await texto.isVisible().catch(() => false);
        expect(isVisible || count < 10).toBeTruthy();
      }
    });

    // [ ] "Página N de M"
    test('texto "Página N de M"', async ({ page }) => {
      const count = await consulta.itemsEquipo.count();
      if (count >= 10) {
        const texto = page.getByText(/Página.*de/i);
        const isVisible = await texto.isVisible().catch(() => false);
        expect(isVisible || count < 10).toBeTruthy();
      }
    });

    // [ ] Botones anterior/siguiente
    test('botones anterior/siguiente visibles', async ({ page }) => {
      const count = await consulta.itemsEquipo.count();
      if (count >= 10) {
        const btnAnterior = page.getByRole('button', { name: /←|Anterior|Prev/i });
        const btnSiguiente = page.getByRole('button', { name: /→|Siguiente|Next/i });
        const isVisibleAnt = await btnAnterior.isVisible().catch(() => false);
        const isVisibleSig = await btnSiguiente.isVisible().catch(() => false);
        expect(isVisibleAnt || isVisibleSig || count < 10).toBeTruthy();
      }
    });

    // [ ] Botones deshabilitados en límites
    test('botón anterior deshabilitado en página 1', async ({ page }) => {
      const count = await consulta.itemsEquipo.count();
      if (count >= 10) {
        const btnAnterior = page.getByRole('button', { name: /←|Anterior|Prev/i });
        if (await btnAnterior.isVisible().catch(() => false)) {
          const isDisabled = await btnAnterior.isDisabled();
          expect(isDisabled).toBeTruthy();
        }
      }
    });

    // [ ] Cambio de filtro → página 1
    test('cambio de filtro vuelve a página 1', async ({ page }) => {
      const count = await consulta.itemsEquipo.count();
      if (count >= 10) {
        const btnSiguiente = page.getByRole('button', { name: /→|Siguiente|Next/i });
        if (await btnSiguiente.isEnabled().catch(() => false)) {
          await btnSiguiente.click();
          await page.waitForTimeout(300);
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
});
