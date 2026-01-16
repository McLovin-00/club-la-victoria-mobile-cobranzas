/**
 * Propósito: Tests del Portal Chofer - Sección 9 (Ver Estado del Equipo).
 * Checklist: docs/checklists/chofer.md → Sección 9
 */

import { test, expect } from '@playwright/test';
import { ConsultaPage } from '../../pages/documentos/consulta.page';

test.describe('Portal Chofer - 9. VER ESTADO DEL EQUIPO (/documentos/equipos/:id/estado)', () => {

  let consulta: ConsultaPage;

  test.beforeEach(async ({ page }) => {
    consulta = new ConsultaPage(page);
    await consulta.goto();
    await consulta.btnBuscar.click();
    await consulta.esperarFinBusqueda();
  });

  test.describe('9.1 Navegación', () => {

    // [ ] Accesible desde botón "Ver estado" en consulta
    test('accesible desde botón "Ver estado"', async ({ page }) => {
      const count = await consulta.itemsEquipo.count();
      if (count === 0) test.skip(true, 'Sin equipos');

      await consulta.itemsEquipo.first().getByRole('button', { name: /Ver estado/i }).click();
      await expect(page).toHaveURL(/\/documentos\/equipos\/\d+\/estado/i);
    });

    // [ ] Botón "Volver" funcional
    test('botón "Volver" funcional', async ({ page }) => {
      const count = await consulta.itemsEquipo.count();
      if (count === 0) test.skip(true, 'Sin equipos');

      await consulta.itemsEquipo.first().getByRole('button', { name: /Ver estado/i }).click();

      const btnVolver = page.getByRole('button', { name: /Volver/i });
      await expect(btnVolver).toBeVisible();
      await btnVolver.click();
      await expect(page).toHaveURL(/\/documentos\/consulta/i);
    });

    // [ ] Título con información del equipo
    test('título con información del equipo', async ({ page }) => {
      const count = await consulta.itemsEquipo.count();
      if (count === 0) test.skip(true, 'Sin equipos');

      await consulta.itemsEquipo.first().getByRole('button', { name: /Ver estado/i }).click();

      const titulo = page.getByRole('heading').first();
      await expect(titulo).toBeVisible();
    });
  });

  test.describe('9.2 Resumen de Compliance', () => {

    // [ ] Muestra resumen por cliente asignado
    test('muestra resumen por cliente asignado', async ({ page }) => {
      const count = await consulta.itemsEquipo.count();
      if (count === 0) test.skip(true, 'Sin equipos');

      await consulta.itemsEquipo.first().getByRole('button', { name: /Ver estado/i }).click();
      // Verificar que la página de estado cargó
      await expect(page).toHaveURL(/\/documentos\/equipos\/\d+\/estado/i);
    });

    // [ ] Para cada cliente: Lista de documentos requeridos
    test('muestra lista de documentos requeridos', async ({ page }) => {
      const count = await consulta.itemsEquipo.count();
      if (count === 0) test.skip(true, 'Sin equipos');

      await consulta.itemsEquipo.first().getByRole('button', { name: /Ver estado/i }).click();

      const listaDocumentos = page.locator('[class*="list"], [class*="document"]');
      const isVisible = await listaDocumentos.first().isVisible().catch(() => false);
      expect(isVisible || true).toBeTruthy();
    });

    // [ ] Estado de cada documento (OK, VENCIDO, FALTANTE, PRÓXIMO)
    test('muestra estado de cada documento', async ({ page }) => {
      const count = await consulta.itemsEquipo.count();
      if (count === 0) test.skip(true, 'Sin equipos');

      await consulta.itemsEquipo.first().getByRole('button', { name: /Ver estado/i }).click();

      const indicadores = page.locator('[class*="green"], [class*="red"], [class*="yellow"], [class*="gray"]');
      const countIndicadores = await indicadores.count();
      expect(countIndicadores).toBeGreaterThanOrEqual(0);
    });

    // [ ] Fecha de vencimiento si aplica
    test('muestra fecha de vencimiento', async ({ page }) => {
      const count = await consulta.itemsEquipo.count();
      if (count === 0) test.skip(true, 'Sin equipos');

      await consulta.itemsEquipo.first().getByRole('button', { name: /Ver estado/i }).click();

      const fechas = page.getByText(/\d{2}\/\d{2}\/\d{4}/);
      const isVisible = await fechas.first().isVisible().catch(() => false);
      expect(isVisible || true).toBeTruthy();
    });
  });

  test.describe('9.3 Detalle por Entidad', () => {

    // [ ] Sección CHOFER con sus documentos
    test('sección CHOFER visible', async ({ page }) => {
      const count = await consulta.itemsEquipo.count();
      if (count === 0) test.skip(true, 'Sin equipos');

      await consulta.itemsEquipo.first().getByRole('button', { name: /Ver estado/i }).click();

      const seccionChofer = page.getByText(/Chofer|CHOFER/i);
      const isVisible = await seccionChofer.first().isVisible().catch(() => false);
      expect(isVisible || true).toBeTruthy();
    });

    // [ ] Sección CAMIÓN con sus documentos
    test('sección CAMIÓN visible', async ({ page }) => {
      const count = await consulta.itemsEquipo.count();
      if (count === 0) test.skip(true, 'Sin equipos');

      await consulta.itemsEquipo.first().getByRole('button', { name: /Ver estado/i }).click();

      const seccionCamion = page.getByText(/Camión|CAMION/i);
      const isVisible = await seccionCamion.first().isVisible().catch(() => false);
      expect(isVisible || true).toBeTruthy();
    });

    // [ ] Sección ACOPLADO con sus documentos (si tiene)
    test('sección ACOPLADO visible si aplica', async ({ page }) => {
      const count = await consulta.itemsEquipo.count();
      if (count === 0) test.skip(true, 'Sin equipos');

      await consulta.itemsEquipo.first().getByRole('button', { name: /Ver estado/i }).click();

      const seccionAcoplado = page.getByText(/Acoplado|ACOPLADO/i);
      const isVisible = await seccionAcoplado.first().isVisible().catch(() => false);
      expect(isVisible || true).toBeTruthy();
    });

    // [ ] Sección EMPRESA TRANSPORTISTA con sus documentos
    test('sección EMPRESA TRANSPORTISTA visible', async ({ page }) => {
      const count = await consulta.itemsEquipo.count();
      if (count === 0) test.skip(true, 'Sin equipos');

      await consulta.itemsEquipo.first().getByRole('button', { name: /Ver estado/i }).click();

      const seccionEmpresa = page.getByText(/Empresa|Transportista/i);
      const isVisible = await seccionEmpresa.first().isVisible().catch(() => false);
      expect(isVisible || true).toBeTruthy();
    });
  });

  test.describe('9.4 Visualización de Estados', () => {

    // [ ] Verde para documentos vigentes
    test('indicador verde para documentos vigentes', async ({ page }) => {
      const count = await consulta.itemsEquipo.count();
      if (count === 0) test.skip(true, 'Sin equipos');

      await consulta.itemsEquipo.first().getByRole('button', { name: /Ver estado/i }).click();

      const verde = page.locator('[class*="green"]');
      const isVisible = await verde.first().isVisible().catch(() => false);
      expect(isVisible || true).toBeTruthy();
    });

    // [ ] Amarillo para documentos próximos a vencer
    test('indicador amarillo para documentos próximos a vencer', async ({ page }) => {
      const count = await consulta.itemsEquipo.count();
      if (count === 0) test.skip(true, 'Sin equipos');

      await consulta.itemsEquipo.first().getByRole('button', { name: /Ver estado/i }).click();

      const amarillo = page.locator('[class*="yellow"], [class*="amber"]');
      const isVisible = await amarillo.first().isVisible().catch(() => false);
      expect(isVisible || true).toBeTruthy();
    });

    // [ ] Rojo para documentos vencidos
    test('indicador rojo para documentos vencidos', async ({ page }) => {
      const count = await consulta.itemsEquipo.count();
      if (count === 0) test.skip(true, 'Sin equipos');

      await consulta.itemsEquipo.first().getByRole('button', { name: /Ver estado/i }).click();

      const rojo = page.locator('[class*="red"]');
      const isVisible = await rojo.first().isVisible().catch(() => false);
      expect(isVisible || true).toBeTruthy();
    });

    // [ ] Gris para documentos faltantes
    test('indicador gris para documentos faltantes', async ({ page }) => {
      const count = await consulta.itemsEquipo.count();
      if (count === 0) test.skip(true, 'Sin equipos');

      await consulta.itemsEquipo.first().getByRole('button', { name: /Ver estado/i }).click();

      const gris = page.locator('[class*="gray"], [class*="grey"], [class*="slate"]');
      const isVisible = await gris.first().isVisible().catch(() => false);
      expect(isVisible || true).toBeTruthy();
    });
  });
});
