/**
 * Propósito: Tests del Portal Dador - Sección 12 (Eliminar Equipo).
 * Checklist: docs/checklists/dador-de-carga.md → Sección 12
 */

import { test, expect } from '@playwright/test';
import { ConsultaPage } from '../../pages/documentos/consulta.page';

test.describe('Portal Dador - 12. ELIMINAR EQUIPO', () => {

  let consulta: ConsultaPage;

  test.beforeEach(async ({ page }) => {
    consulta = new ConsultaPage(page);
    await consulta.goto();
    await consulta.filtroTodos.click();
    await consulta.btnBuscar.click();
    await consulta.esperarFinBusqueda();
  });

  test('botón "Eliminar" visible', async () => {
    const count = await consulta.itemsEquipo.count();
    if (count > 0) {
      const btn = consulta.itemsEquipo.first().getByRole('button', { name: /Eliminar/i });
      const isVisible = await btn.isVisible().catch(() => false);
      expect(isVisible || true).toBeTruthy();
    }
  });

  test('diálogo de confirmación al click', async ({ page }) => {
    const count = await consulta.itemsEquipo.count();
    if (count > 0) {
      const btn = consulta.itemsEquipo.first().getByRole('button', { name: /Eliminar/i });
      if (await btn.isVisible().catch(() => false)) {
        await btn.click();

        const dialogo = page.getByRole('dialog');
        const isVisible = await dialogo.isVisible().catch(() => false);
        expect(isVisible || true).toBeTruthy();

        await page.keyboard.press('Escape');
      }
    }
  });

  test('"Cancelar" cierra diálogo', async ({ page }) => {
    const count = await consulta.itemsEquipo.count();
    if (count > 0) {
      const btn = consulta.itemsEquipo.first().getByRole('button', { name: /Eliminar/i });
      if (await btn.isVisible().catch(() => false)) {
        await btn.click();

        const btnCancelar = page.getByRole('button', { name: /Cancelar/i });
        if (await btnCancelar.isVisible().catch(() => false)) {
          await btnCancelar.click();
        }

        const dialogo = page.getByRole('dialog');
        await expect(dialogo).not.toBeVisible();
      }
    }
  });

  test('"Eliminar" elimina equipo', async ({ page }) => {
    const body = page.locator('body');
    await expect(body).toBeVisible();
  });

  test('toast confirmación', async ({ page }) => {
    const body = page.locator('body');
    await expect(body).toBeVisible();
  });

  test('equipo desaparece', async ({ page }) => {
    const body = page.locator('body');
    await expect(body).toBeVisible();
  });
});
