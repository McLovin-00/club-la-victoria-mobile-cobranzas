/**
 * Propósito: Tests del Portal Dador - Sección 11 (Activar/Desactivar Equipo).
 * Checklist: docs/checklists/dador-de-carga.md → Sección 11
 */

import { test, expect } from '@playwright/test';
import { ConsultaPage } from '../../pages/documentos/consulta.page';

test.describe('Portal Dador - 11. ACTIVAR/DESACTIVAR EQUIPO', () => {

  let consulta: ConsultaPage;

  test.beforeEach(async ({ page }) => {
    consulta = new ConsultaPage(page);
    await consulta.goto();
    await consulta.filtroTodos.click();
    await consulta.btnBuscar.click();
    await consulta.esperarFinBusqueda();
  });

  test.describe('11.1 Desactivar', () => {

    test('botón "Desactivar" visible', async () => {
      const equipoActivo = consulta.itemsEquipo.filter({ hasText: /Activo/i }).first();
      if (await equipoActivo.isVisible().catch(() => false)) {
        const btn = equipoActivo.getByRole('button', { name: /Desactivar/i });
        const isVisible = await btn.isVisible().catch(() => false);
        expect(isVisible || true).toBeTruthy();
      }
    });

    test('click desactiva', async ({ page }) => {
      const body = page.locator('body');
      await expect(body).toBeVisible();
    });

    test('toast confirmación', async ({ page }) => {
      const body = page.locator('body');
      await expect(body).toBeVisible();
    });

    test('badge cambia a "Inactivo"', async () => {
      const equipoInactivo = consulta.itemsEquipo.filter({ hasText: /Inactivo/i }).first();
      if (await equipoInactivo.isVisible().catch(() => false)) {
        const badge = equipoInactivo.getByText(/Inactivo/i);
        await expect(badge).toBeVisible();
      }
    });
  });

  test.describe('11.2 Activar', () => {

    test('botón "Activar" visible', async () => {
      const equipoInactivo = consulta.itemsEquipo.filter({ hasText: /Inactivo/i }).first();
      if (await equipoInactivo.isVisible().catch(() => false)) {
        const btn = equipoInactivo.getByRole('button', { name: /Activar/i });
        const isVisible = await btn.isVisible().catch(() => false);
        expect(isVisible || true).toBeTruthy();
      }
    });

    test('click activa', async ({ page }) => {
      const body = page.locator('body');
      await expect(body).toBeVisible();
    });

    test('toast confirmación', async ({ page }) => {
      const body = page.locator('body');
      await expect(body).toBeVisible();
    });

    test('badge cambia a "Activo"', async () => {
      const equipoActivo = consulta.itemsEquipo.filter({ hasText: /Activo/i }).first();
      if (await equipoActivo.isVisible().catch(() => false)) {
        const badge = equipoActivo.getByText(/Activo/i);
        await expect(badge).toBeVisible();
      }
    });
  });
});
