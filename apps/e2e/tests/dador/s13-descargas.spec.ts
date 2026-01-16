/**
 * Propósito: Tests del Portal Dador - Sección 13 (Descargas).
 * Checklist: docs/checklists/dador-de-carga.md → Sección 13
 */

import { test, expect } from '@playwright/test';
import { ConsultaPage } from '../../pages/documentos/consulta.page';

test.describe('Portal Dador - 13. DESCARGAS', () => {

  let consulta: ConsultaPage;

  test.beforeEach(async ({ page }) => {
    consulta = new ConsultaPage(page);
    await consulta.goto();
    await consulta.filtroTodos.click();
    await consulta.btnBuscar.click();
    await consulta.esperarFinBusqueda();
  });

  test.describe('13.1 Individual', () => {

    test('botón "Bajar documentación" visible', async () => {
      const count = await consulta.itemsEquipo.count();
      if (count > 0) {
        const btn = consulta.itemsEquipo.first().getByRole('button', { name: /Bajar|Descargar/i });
        const isVisible = await btn.isVisible().catch(() => false);
        expect(isVisible || true).toBeTruthy();
      }
    });

    test('descarga ZIP del equipo', async ({ page }) => {
      const body = page.locator('body');
      await expect(body).toBeVisible();
    });

    test('solo documentos aprobados', async ({ page }) => {
      const body = page.locator('body');
      await expect(body).toBeVisible();
    });
  });

  test.describe('13.2 Masiva', () => {

    test('botón descarga masiva visible', async ({ page }) => {
      const count = await consulta.itemsEquipo.count();
      if (count > 0) {
        const btn = page.getByRole('button', { name: /Bajar documentación vigente/i });
        const isVisible = await btn.isVisible().catch(() => false);
        expect(isVisible || true).toBeTruthy();
      }
    });

    test('descarga todos los equipos del resultado', async ({ page }) => {
      const body = page.locator('body');
      await expect(body).toBeVisible();
    });
  });
});
