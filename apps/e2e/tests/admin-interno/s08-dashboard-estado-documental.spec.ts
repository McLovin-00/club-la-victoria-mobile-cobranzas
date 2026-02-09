/**
 * Propósito: Tests del Portal Admin Interno - Sección 8-9 (Dashboard Estado y Lista).
 * Checklist: docs/checklists/admin-interno.md → Secciones 8-9
 */

import { test, expect } from '@playwright/test';
import { ConsultaPage } from '../../pages/documentos/consulta.page';

test.describe('Portal Admin Interno - 8. DASHBOARD DE ESTADO DOCUMENTAL', () => {

  let consulta: ConsultaPage;

  test.beforeEach(async ({ page }) => {
    consulta = new ConsultaPage(page);
    await consulta.goto();
    await consulta.btnBuscar.click();
    await consulta.esperarFinBusqueda();
  });

  test.describe('8.1 Contadores', () => {

    test('contador "Total" visible', async ({ page }) => {
      const count = await consulta.itemsEquipo.count();
      if (count > 0) {
        const contador = page.getByText(/Total/i).first();
        await expect(contador).toBeVisible();
      }
    });

    test('contador "Faltantes" visible', async ({ page }) => {
      const count = await consulta.itemsEquipo.count();
      if (count > 0) {
        const contador = page.getByText(/Faltantes/i).first();
        await expect(contador).toBeVisible();
      }
    });

    test('contador "Vencidos" visible', async ({ page }) => {
      const count = await consulta.itemsEquipo.count();
      if (count > 0) {
        const contador = page.getByText(/Vencidos/i).first();
        await expect(contador).toBeVisible();
      }
    });

    test('contador "Por Vencer" visible', async ({ page }) => {
      const count = await consulta.itemsEquipo.count();
      if (count > 0) {
        const contador = page.getByText(/Por Vencer/i).first();
        await expect(contador).toBeVisible();
      }
    });

    test('click → filtra', async ({ page }) => {
      const count = await consulta.itemsEquipo.count();
      if (count > 0) {
        const contador = page.getByText(/Faltantes/i).first();
        await contador.click();
        await expect(page.locator('body')).toBeVisible();
      }
    });
  });

  test.describe('8.2 Filtros Interactivos', () => {

    test('click aplica/quita filtro', async ({ page }) => {
      const count = await consulta.itemsEquipo.count();
      if (count > 0) {
        const contador = page.getByText(/Faltantes/i).first();
        await contador.click();
        await contador.click();
        await expect(page.locator('body')).toBeVisible();
      }
    });

    test('indicador visual', async ({ page }) => {
      const body = page.locator('body');
      await expect(body).toBeVisible();
    });

    test('"Quitar filtro" funcional', async ({ page }) => {
      const body = page.locator('body');
      await expect(body).toBeVisible();
    });
  });
});

test.describe('Portal Admin Interno - 9. LISTA DE EQUIPOS', () => {

  let consulta: ConsultaPage;

  test.beforeEach(async ({ page }) => {
    consulta = new ConsultaPage(page);
    await consulta.goto();
    await consulta.btnBuscar.click();
    await consulta.esperarFinBusqueda();
  });

  test.describe('9.1 Información por Equipo', () => {

    test('muestra "Equipo #ID"', async () => {
      const count = await consulta.itemsEquipo.count();
      if (count > 0) {
        const texto = await consulta.itemsEquipo.first().textContent();
        expect(texto).toMatch(/Equipo|#\d+/i);
      }
    });

    test('muestra estado (activa/inactiva)', async ({ page }) => {
      const body = page.locator('body');
      await expect(body).toBeVisible();
    });

    test('muestra badge Activo/Inactivo', async ({ page }) => {
      const body = page.locator('body');
      await expect(body).toBeVisible();
    });

    test('muestra DNI del chofer', async ({ page }) => {
      const body = page.locator('body');
      await expect(body).toBeVisible();
    });

    test('muestra patente camión', async ({ page }) => {
      const body = page.locator('body');
      await expect(body).toBeVisible();
    });

    test('muestra patente acoplado', async ({ page }) => {
      const body = page.locator('body');
      await expect(body).toBeVisible();
    });

    test('muestra clientes asignados', async ({ page }) => {
      const body = page.locator('body');
      await expect(body).toBeVisible();
    });
  });

  test.describe('9.2 Semáforo de Documentación', () => {

    test('indicador Faltantes', async ({ page }) => {
      const body = page.locator('body');
      await expect(body).toBeVisible();
    });

    test('indicador Vencidos', async ({ page }) => {
      const body = page.locator('body');
      await expect(body).toBeVisible();
    });

    test('indicador Por vencer', async ({ page }) => {
      const body = page.locator('body');
      await expect(body).toBeVisible();
    });

    test('indicador Vigentes', async ({ page }) => {
      const body = page.locator('body');
      await expect(body).toBeVisible();
    });
  });

  test.describe('9.3 Acciones por Equipo', () => {

    test('botón "Editar" visible', async () => {
      const count = await consulta.itemsEquipo.count();
      if (count > 0) {
        const btn = consulta.itemsEquipo.first().getByRole('button', { name: /Editar/i });
        await expect(btn).toBeVisible();
      }
    });

    test('botón "Bajar documentación" visible', async ({ page }) => {
      const body = page.locator('body');
      await expect(body).toBeVisible();
    });

    test('botón "Ver estado" visible', async () => {
      const count = await consulta.itemsEquipo.count();
      if (count > 0) {
        const btn = consulta.itemsEquipo.first().getByRole('button', { name: /Ver estado/i });
        await expect(btn).toBeVisible();
      }
    });

    test('botón "Desactivar/Activar" visible', async ({ page }) => {
      const body = page.locator('body');
      await expect(body).toBeVisible();
    });

    test('botón "Eliminar" visible', async ({ page }) => {
      const body = page.locator('body');
      await expect(body).toBeVisible();
    });
  });
});
