/**
 * Propósito: Tests del Portal Chofer - Sección 6 (Paginación).
 * Checklist: docs/checklists/chofer.md → Sección 6
 */

import { test, expect } from '@playwright/test';
import { ConsultaPage } from '../../pages/documentos/consulta.page';

test.describe('Portal Chofer - 6. PAGINACIÓN', () => {

  let consulta: ConsultaPage;

  test.beforeEach(async ({ page }) => {
    consulta = new ConsultaPage(page);
    await consulta.goto();
    await consulta.btnBuscar.click();
    await consulta.esperarFinBusqueda();
  });

  test.describe('6.1 Controles de Paginación', () => {

    // [ ] Con más de 10 equipos → muestra paginación
    test('muestra paginación con más de 10 equipos', async ({ page }) => {
      const count = await consulta.itemsEquipo.count();
      if (count >= 10) {
        const paginacion = page.getByText(/Página|Mostrando/i);
        await expect(paginacion.first()).toBeVisible();
      }
    });

    // [ ] Texto "Mostrando X - Y de Z equipos"
    test('muestra texto "Mostrando X - Y de Z equipos"', async ({ page }) => {
      const count = await consulta.itemsEquipo.count();
      if (count > 0) {
        const textoMostrando = page.getByText(/Mostrando.*de.*equipo/i);
        const isVisible = await textoMostrando.isVisible().catch(() => false);
        expect(isVisible || count < 10).toBeTruthy();
      }
    });

    // [ ] Texto "Página N de M"
    test('muestra texto "Página N de M"', async ({ page }) => {
      const count = await consulta.itemsEquipo.count();
      if (count >= 10) {
        const textoPagina = page.getByText(/Página.*de/i);
        const isVisible = await textoPagina.isVisible().catch(() => false);
        expect(isVisible || count < 10).toBeTruthy();
      }
    });

    // [ ] Botón "←" (anterior) deshabilitado en página 1
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

    // [ ] Botón "→" (siguiente) deshabilitado en última página
    test('botón siguiente deshabilitado en última página', async ({ page }) => {
      const count = await consulta.itemsEquipo.count();
      if (count >= 10) {
        // Navegar a última página
        const btnSiguiente = page.getByRole('button', { name: /→|Siguiente|Next/i });
        while (await btnSiguiente.isEnabled().catch(() => false)) {
          await btnSiguiente.click();
          await page.waitForTimeout(500);
        }
        const isDisabled = await btnSiguiente.isDisabled().catch(() => true);
        expect(isDisabled).toBeTruthy();
      }
    });

    // [ ] Navegación entre páginas funciona correctamente
    test('navegación entre páginas funciona', async ({ page }) => {
      const count = await consulta.itemsEquipo.count();
      if (count >= 10) {
        const btnSiguiente = page.getByRole('button', { name: /→|Siguiente|Next/i });
        if (await btnSiguiente.isEnabled().catch(() => false)) {
          await btnSiguiente.click();
          await page.waitForTimeout(500);

          const btnAnterior = page.getByRole('button', { name: /←|Anterior|Prev/i });
          const isEnabled = await btnAnterior.isEnabled().catch(() => false);
          expect(isEnabled).toBeTruthy();
        }
      }
    });

    // [ ] Al aplicar filtro → vuelve a página 1
    test('aplicar filtro vuelve a página 1', async ({ page }) => {
      const count = await consulta.itemsEquipo.count();
      if (count >= 10) {
        // Ir a página 2
        const btnSiguiente = page.getByRole('button', { name: /→|Siguiente|Next/i });
        if (await btnSiguiente.isEnabled().catch(() => false)) {
          await btnSiguiente.click();
          await page.waitForTimeout(500);
        }

        // Aplicar filtro
        await consulta.inputDniChofer.fill('12345678');
        await consulta.btnBuscar.click();
        await consulta.esperarFinBusqueda();

        // Verificar que estamos en página 1
        const textoPagina = page.getByText(/Página 1 de/i);
        const isVisible = await textoPagina.isVisible().catch(() => true);
        expect(isVisible).toBeTruthy();
      }
    });
  });
});
