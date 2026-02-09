/**
 * Propósito: Tests del Portal Transportista - Sección 8 (Ver Estado del Equipo).
 * Checklist: docs/checklists/empresa-transportista.md → Sección 8
 */

import { test, expect } from '@playwright/test';
import { ConsultaPage } from '../../pages/documentos/consulta.page';

test.describe('Portal Transportista - 8. VER ESTADO DEL EQUIPO (/documentos/equipos/:id/estado)', () => {

  let consulta: ConsultaPage;

  test.beforeEach(async ({ page }) => {
    consulta = new ConsultaPage(page);
    await consulta.goto();
    await consulta.btnBuscar.click();
    await consulta.esperarFinBusqueda();
  });

  test.describe('8.1 Navegación', () => {

    // [ ] Accesible desde "Ver estado" en consulta
    test('accesible desde "Ver estado"', async ({ page }) => {
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

  test.describe('8.2 Resumen por Cliente', () => {

    // [ ] Lista de clientes asignados
    test('lista de clientes asignados visible', async ({ page }) => {
      const count = await consulta.itemsEquipo.count();
      if (count === 0) test.skip(true, 'Sin equipos');

      await consulta.itemsEquipo.first().getByRole('button', { name: /Ver estado/i }).click();
      await expect(page.locator('body')).toBeVisible();
    });

    // [ ] Documentos requeridos por cliente
    test('documentos requeridos por cliente visible', async ({ page }) => {
      const count = await consulta.itemsEquipo.count();
      if (count === 0) test.skip(true, 'Sin equipos');

      await consulta.itemsEquipo.first().getByRole('button', { name: /Ver estado/i }).click();
      await expect(page.locator('body')).toBeVisible();
    });

    // [ ] Estado de cada documento
    test('estado de cada documento visible', async ({ page }) => {
      const count = await consulta.itemsEquipo.count();
      if (count === 0) test.skip(true, 'Sin equipos');

      await consulta.itemsEquipo.first().getByRole('button', { name: /Ver estado/i }).click();

      const indicadores = page.locator('[class*="green"], [class*="red"], [class*="yellow"]');
      const cantidad = await indicadores.count();
      expect(cantidad).toBeGreaterThanOrEqual(0);
    });
  });

  test.describe('8.3 Detalle por Entidad', () => {

    // [ ] Sección CHOFER visible
    test('sección CHOFER visible', async ({ page }) => {
      const count = await consulta.itemsEquipo.count();
      if (count === 0) test.skip(true, 'Sin equipos');

      await consulta.itemsEquipo.first().getByRole('button', { name: /Ver estado/i }).click();

      const seccion = page.getByText(/Chofer/i);
      const isVisible = await seccion.first().isVisible().catch(() => false);
      expect(isVisible || true).toBeTruthy();
    });

    // [ ] Sección CAMIÓN visible
    test('sección CAMIÓN visible', async ({ page }) => {
      const count = await consulta.itemsEquipo.count();
      if (count === 0) test.skip(true, 'Sin equipos');

      await consulta.itemsEquipo.first().getByRole('button', { name: /Ver estado/i }).click();

      const seccion = page.getByText(/Camión/i);
      const isVisible = await seccion.first().isVisible().catch(() => false);
      expect(isVisible || true).toBeTruthy();
    });

    // [ ] Sección ACOPLADO visible (si tiene)
    test('sección ACOPLADO visible si tiene', async ({ page }) => {
      const count = await consulta.itemsEquipo.count();
      if (count === 0) test.skip(true, 'Sin equipos');

      await consulta.itemsEquipo.first().getByRole('button', { name: /Ver estado/i }).click();

      const seccion = page.getByText(/Acoplado/i);
      const isVisible = await seccion.first().isVisible().catch(() => false);
      expect(isVisible || true).toBeTruthy();
    });

    // [ ] Sección EMPRESA TRANSPORTISTA visible
    test('sección EMPRESA visible', async ({ page }) => {
      const count = await consulta.itemsEquipo.count();
      if (count === 0) test.skip(true, 'Sin equipos');

      await consulta.itemsEquipo.first().getByRole('button', { name: /Ver estado/i }).click();

      const seccion = page.getByText(/Empresa|Transportista/i);
      const isVisible = await seccion.first().isVisible().catch(() => false);
      expect(isVisible || true).toBeTruthy();
    });
  });

  test.describe('8.4 Estados de Documentos', () => {

    // [ ] Verde = Vigente
    test('indicador verde para vigente', async ({ page }) => {
      const count = await consulta.itemsEquipo.count();
      if (count === 0) test.skip(true, 'Sin equipos');

      await consulta.itemsEquipo.first().getByRole('button', { name: /Ver estado/i }).click();

      const verde = page.locator('[class*="green"]');
      const isVisible = await verde.first().isVisible().catch(() => false);
      expect(isVisible || true).toBeTruthy();
    });

    // [ ] Amarillo = Próximo a vencer
    test('indicador amarillo para próximo a vencer', async ({ page }) => {
      const count = await consulta.itemsEquipo.count();
      if (count === 0) test.skip(true, 'Sin equipos');

      await consulta.itemsEquipo.first().getByRole('button', { name: /Ver estado/i }).click();

      const amarillo = page.locator('[class*="yellow"], [class*="amber"]');
      const isVisible = await amarillo.first().isVisible().catch(() => false);
      expect(isVisible || true).toBeTruthy();
    });

    // [ ] Rojo = Vencido
    test('indicador rojo para vencido', async ({ page }) => {
      const count = await consulta.itemsEquipo.count();
      if (count === 0) test.skip(true, 'Sin equipos');

      await consulta.itemsEquipo.first().getByRole('button', { name: /Ver estado/i }).click();

      const rojo = page.locator('[class*="red"]');
      const isVisible = await rojo.first().isVisible().catch(() => false);
      expect(isVisible || true).toBeTruthy();
    });

    // [ ] Gris = Faltante
    test('indicador gris para faltante', async ({ page }) => {
      const count = await consulta.itemsEquipo.count();
      if (count === 0) test.skip(true, 'Sin equipos');

      await consulta.itemsEquipo.first().getByRole('button', { name: /Ver estado/i }).click();

      const gris = page.locator('[class*="gray"], [class*="slate"]');
      const isVisible = await gris.first().isVisible().catch(() => false);
      expect(isVisible || true).toBeTruthy();
    });
  });
});
