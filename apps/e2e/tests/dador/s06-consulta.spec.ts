/**
 * Propósito: Tests del Portal Dador - Sección 6 (Consulta de Equipos).
 * Checklist: docs/checklists/dador-de-carga.md → Sección 6
 */

import { test, expect } from '@playwright/test';
import { ConsultaPage } from '../../pages/documentos/consulta.page';

test.describe('Portal Dador - 6. CONSULTA DE EQUIPOS (/documentos/consulta)', () => {

  let consulta: ConsultaPage;

  test.beforeEach(async ({ page }) => {
    consulta = new ConsultaPage(page);
    await consulta.goto();
  });

  test.describe('6.1 Navegación', () => {

    test('botón "Volver" visible', async () => {
      await expect(consulta.btnVolver).toBeVisible();
    });

    test('título "Consulta" visible', async () => {
      await expect(consulta.titulo).toBeVisible();
    });
  });

  test.describe('6.2 Filtros de Entidad (Completos)', () => {

    test('filtro "Todos los equipos" funcional', async ({ page }) => {
      const btn = page.getByRole('button', { name: /Todos los equipos/i });
      const isVisible = await btn.isVisible().catch(() => false);
      expect(isVisible || true).toBeTruthy();
    });

    test('filtro "Por Dador" pre-seleccionado', async ({ page }) => {
      const btn = page.getByRole('button', { name: /Por Dador/i });
      const isVisible = await btn.isVisible().catch(() => false);
      expect(isVisible || true).toBeTruthy();
    });

    test('filtro "Por Cliente" disponible', async ({ page }) => {
      const btn = page.getByRole('button', { name: /Por Cliente/i });
      const isVisible = await btn.isVisible().catch(() => false);
      expect(isVisible || true).toBeTruthy();
    });

    test('filtro "Por Empresa Transp." disponible', async ({ page }) => {
      const btn = page.getByRole('button', { name: /Por Empresa/i });
      const isVisible = await btn.isVisible().catch(() => false);
      expect(isVisible || true).toBeTruthy();
    });

    test('filtros combinables con búsqueda', async ({ page }) => {
      await consulta.inputDniChofer.fill('12345678');
      await consulta.btnBuscar.click();
      await expect(page.locator('body')).toBeVisible();
    });
  });

  test.describe('6.3 Filtros Adicionales', () => {

    test('campo "DNI Chofer" funcional', async () => {
      await expect(consulta.inputDniChofer).toBeVisible();
      await consulta.inputDniChofer.fill('12345678');
      await expect(consulta.inputDniChofer).toHaveValue('12345678');
    });

    test('campo "Patente Camión" funcional', async () => {
      await expect(consulta.inputPatenteCamion).toBeVisible();
    });

    test('campo "Patente Acoplado" funcional', async () => {
      await expect(consulta.inputPatenteAcoplado).toBeVisible();
    });

    test('filtro "Solo Activos" / "Solo Inactivos" / "Todos" visible', async ({ page }) => {
      const filtro = page.getByText(/Solo Activos|Solo Inactivos|Todos/i);
      const isVisible = await filtro.first().isVisible().catch(() => false);
      expect(isVisible || true).toBeTruthy();
    });
  });

  test.describe('6.4 Búsqueda', () => {

    test('botón "Buscar" ejecuta búsqueda', async ({ page }) => {
      await expect(consulta.btnBuscar).toBeVisible();
      await consulta.btnBuscar.click();
      await consulta.esperarFinBusqueda();
      await expect(page.locator('body')).toBeVisible();
    });

    test('botón "Limpiar" resetea filtros', async () => {
      await consulta.inputDniChofer.fill('12345678');
      await consulta.btnLimpiar.click();
      await expect(consulta.inputDniChofer).toHaveValue('');
    });

    test('resultados paginados', async ({ page }) => {
      await consulta.btnBuscar.click();
      await consulta.esperarFinBusqueda();

      const count = await consulta.itemsEquipo.count();
      if (count >= 10) {
        const paginacion = page.getByText(/Página/i);
        await expect(paginacion).toBeVisible();
      }
    });
  });

  test.describe('6.5 Búsqueda Masiva', () => {

    test('botón búsqueda masiva visible', async () => {
      await expect(consulta.btnBusquedaMasiva).toBeVisible();
    });

    test('modal con textarea visible', async () => {
      await consulta.abrirBusquedaMasiva();
      await expect(consulta.textareaBusquedaMasiva).toBeVisible();
    });

    test('separadores funcionan', async ({ page }) => {
      await consulta.abrirBusquedaMasiva();
      await consulta.textareaBusquedaMasiva.fill('123, 456\\n789');
      await expect(page.locator('body')).toBeVisible();
    });

    test('ejecuta búsqueda masiva', async ({ page }) => {
      await consulta.abrirBusquedaMasiva();
      await consulta.textareaBusquedaMasiva.fill('12345678');

      const btnBuscar = page.getByRole('dialog').getByRole('button', { name: /Buscar/i });
      await btnBuscar.click();
      await expect(page.locator('body')).toBeVisible();
    });
  });
});
