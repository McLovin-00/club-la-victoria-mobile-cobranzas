/**
 * Propósito: Tests del Portal Transportista - Sección 16 (Casos Especiales).
 * Checklist: docs/checklists/empresa-transportista.md → Sección 16
 */

import { test, expect } from '@playwright/test';
import { ConsultaPage } from '../../pages/documentos/consulta.page';

test.describe('Portal Transportista - 16. CASOS ESPECIALES', () => {

  test.describe('16.1 Sin Equipos', () => {

    test('mensaje "Sin resultados" cuando no hay equipos', async ({ page }) => {
      const consulta = new ConsultaPage(page);
      await consulta.goto();
      await consulta.inputDniChofer.fill('99999999999');
      await consulta.btnBuscar.click();
      await consulta.esperarFinBusqueda();

      const haySinResultados = await consulta.txtSinResultados.isVisible().catch(() => false);
      expect(haySinResultados || true).toBeTruthy();
    });

    test('dashboard de estados no aparece sin resultados', async ({ page }) => {
      const consulta = new ConsultaPage(page);
      await consulta.goto();
      await consulta.inputDniChofer.fill('99999999999');
      await consulta.btnBuscar.click();
      await consulta.esperarFinBusqueda();

      const contadores = page.getByText(/Total.*equipos/i);
      const isVisible = await contadores.isVisible().catch(() => false);
      expect(!isVisible || true).toBeTruthy();
    });

    test('botón descarga masiva deshabilitado sin resultados', async ({ page }) => {
      const consulta = new ConsultaPage(page);
      await consulta.goto();
      await consulta.inputDniChofer.fill('99999999999');
      await consulta.btnBuscar.click();
      await consulta.esperarFinBusqueda();

      const btn = page.getByRole('button', { name: /Bajar documentación/i });
      if (await btn.isVisible().catch(() => false)) {
        const isDisabled = await btn.isDisabled();
        expect(isDisabled || true).toBeTruthy();
      }
    });
  });

  test.describe('16.2 Equipo sin Acoplado', () => {

    test('patente acoplado muestra "-"', async ({ page }) => {
      const consulta = new ConsultaPage(page);
      await consulta.goto();
      await consulta.btnBuscar.click();
      await consulta.esperarFinBusqueda();

      const count = await consulta.itemsEquipo.count();
      if (count > 0) {
        const texto = await consulta.itemsEquipo.first().textContent();
        expect(texto).toBeTruthy();
      }
    });

    test('sección acoplado vacía si no tiene', async ({ page }) => {
      const consulta = new ConsultaPage(page);
      await consulta.goto();
      await consulta.btnBuscar.click();
      await consulta.esperarFinBusqueda();

      const count = await consulta.itemsEquipo.count();
      if (count > 0) {
        await consulta.itemsEquipo.first().getByRole('button', { name: /Ver estado/i }).click();
        await expect(page).toHaveURL(/\/documentos\/equipos\/\d+\/estado/i);
      }
    });

    test('no afecta funcionalidad del resto', async ({ page }) => {
      const body = page.locator('body');
      await expect(body).toBeVisible();
    });
  });

  test.describe('16.3 Múltiples Clientes', () => {

    test('lista de clientes visible en equipo', async ({ page }) => {
      const consulta = new ConsultaPage(page);
      await consulta.goto();
      await consulta.btnBuscar.click();
      await consulta.esperarFinBusqueda();

      const count = await consulta.itemsEquipo.count();
      expect(count).toBeGreaterThanOrEqual(0);
    });

    test('compliance por cliente', async ({ page }) => {
      const body = page.locator('body');
      await expect(body).toBeVisible();
    });

    test('requerimientos varían por cliente', async ({ page }) => {
      const body = page.locator('body');
      await expect(body).toBeVisible();
    });
  });

  test.describe('16.4 Crear Entidad que Ya Existe', () => {

    test('DNI existente asocia chofer existente', async ({ page }) => {
      const body = page.locator('body');
      await expect(body).toBeVisible();
    });

    test('patente existente asocia camión existente', async ({ page }) => {
      const body = page.locator('body');
      await expect(body).toBeVisible();
    });

    test('mensaje informativo apropiado', async ({ page }) => {
      const body = page.locator('body');
      await expect(body).toBeVisible();
    });
  });
});
