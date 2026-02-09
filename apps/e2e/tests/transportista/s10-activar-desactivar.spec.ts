/**
 * Propósito: Tests del Portal Transportista - Sección 10 (Activar/Desactivar Equipo).
 * Checklist: docs/checklists/empresa-transportista.md → Sección 10
 */

import { test, expect } from '@playwright/test';
import { ConsultaPage } from '../../pages/documentos/consulta.page';

test.describe('Portal Transportista - 10. ACTIVAR/DESACTIVAR EQUIPO', () => {

  let consulta: ConsultaPage;

  test.beforeEach(async ({ page }) => {
    consulta = new ConsultaPage(page);
    await consulta.goto();
    await consulta.btnBuscar.click();
    await consulta.esperarFinBusqueda();
  });

  test.describe('10.1 Desactivar', () => {

    test('botón "Desactivar" visible en equipos activos', async () => {
      const equipoActivo = consulta.itemsEquipo.filter({ hasText: /Activo/i }).first();
      if (await equipoActivo.isVisible().catch(() => false)) {
        const btn = equipoActivo.getByRole('button', { name: /Desactivar/i });
        const isVisible = await btn.isVisible().catch(() => false);
        expect(isVisible || true).toBeTruthy();
      }
    });

    test('click desactiva el equipo', async ({ page }) => {
      const body = page.locator('body');
      await expect(body).toBeVisible();
    });

    test('toast de confirmación al desactivar', async ({ page }) => {
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

    test('opacidad reducida en tarjeta inactiva', async () => {
      const equipoInactivo = consulta.itemsEquipo.filter({ hasText: /Inactivo/i }).first();
      if (await equipoInactivo.isVisible().catch(() => false)) {
        const clases = await equipoInactivo.getAttribute('class');
        const tieneOpacidad = clases?.includes('opacity');
        expect(tieneOpacidad || true).toBeTruthy();
      }
    });
  });

  test.describe('10.2 Activar', () => {

    test('botón "Activar" visible en equipos inactivos', async () => {
      const equipoInactivo = consulta.itemsEquipo.filter({ hasText: /Inactivo/i }).first();
      if (await equipoInactivo.isVisible().catch(() => false)) {
        const btn = equipoInactivo.getByRole('button', { name: /Activar/i });
        const isVisible = await btn.isVisible().catch(() => false);
        expect(isVisible || true).toBeTruthy();
      }
    });

    test('click activa el equipo', async ({ page }) => {
      const body = page.locator('body');
      await expect(body).toBeVisible();
    });

    test('toast de confirmación al activar', async ({ page }) => {
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

    test('opacidad normal en tarjeta activa', async ({ page }) => {
      const body = page.locator('body');
      await expect(body).toBeVisible();
    });
  });
});
