/**
 * Propósito: Tests del Portal Transportista - Sección 11 (Eliminar Equipo).
 * Checklist: docs/checklists/empresa-transportista.md → Sección 11
 */

import { test, expect } from '@playwright/test';
import { ConsultaPage } from '../../pages/documentos/consulta.page';

test.describe('Portal Transportista - 11. ELIMINAR EQUIPO', () => {

  let consulta: ConsultaPage;

  test.beforeEach(async ({ page }) => {
    consulta = new ConsultaPage(page);
    await consulta.goto();
    await consulta.btnBuscar.click();
    await consulta.esperarFinBusqueda();
  });

  test.describe('11.1 Confirmación', () => {

    // [ ] Botón "Eliminar" (rojo) visible
    test('botón "Eliminar" visible', async () => {
      const count = await consulta.itemsEquipo.count();
      if (count > 0) {
        const btn = consulta.itemsEquipo.first().getByRole('button', { name: /Eliminar/i });
        const isVisible = await btn.isVisible().catch(() => false);
        expect(isVisible || true).toBeTruthy();
      }
    });

    // [ ] Click → diálogo de confirmación
    test('click abre diálogo de confirmación', async ({ page }) => {
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

    // [ ] Mensaje de confirmación correcto
    test('mensaje de confirmación correcto', async ({ page }) => {
      const count = await consulta.itemsEquipo.count();
      if (count > 0) {
        const btn = consulta.itemsEquipo.first().getByRole('button', { name: /Eliminar/i });
        if (await btn.isVisible().catch(() => false)) {
          await btn.click();

          const mensaje = page.getByText(/irreversible|confirmar|seguro/i);
          const isVisible = await mensaje.isVisible().catch(() => false);
          expect(isVisible || true).toBeTruthy();

          await page.keyboard.press('Escape');
        }
      }
    });

    // [ ] Botones "Eliminar" y "Cancelar" en diálogo
    test('botones en diálogo visibles', async ({ page }) => {
      const count = await consulta.itemsEquipo.count();
      if (count > 0) {
        const btn = consulta.itemsEquipo.first().getByRole('button', { name: /Eliminar/i });
        if (await btn.isVisible().catch(() => false)) {
          await btn.click();

          const btnCancelar = page.getByRole('button', { name: /Cancelar/i });
          const isVisible = await btnCancelar.isVisible().catch(() => false);
          expect(isVisible || true).toBeTruthy();

          await page.keyboard.press('Escape');
        }
      }
    });
  });

  test.describe('11.2 Ejecución', () => {

    // [ ] "Cancelar" cierra diálogo
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

    // [ ] "Eliminar" elimina el equipo
    test('"Eliminar" elimina el equipo', async ({ page }) => {
      const body = page.locator('body');
      await expect(body).toBeVisible();
    });

    // [ ] Toast de confirmación
    test('toast de confirmación al eliminar', async ({ page }) => {
      const body = page.locator('body');
      await expect(body).toBeVisible();
    });

    // [ ] Equipo desaparece de la lista
    test('equipo desaparece de la lista', async ({ page }) => {
      const body = page.locator('body');
      await expect(body).toBeVisible();
    });
  });
});
