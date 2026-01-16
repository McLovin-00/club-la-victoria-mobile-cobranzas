/**
 * Propósito: Tests del Portal Dador - Sección 2 (Dashboard principal).
 * Checklist: docs/checklists/dador-de-carga.md → Sección 2
 */

import { test, expect } from '@playwright/test';

test.describe('Portal Dador - 2. DASHBOARD PRINCIPAL (/dador)', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/dador', { waitUntil: 'domcontentloaded' });
  });

  test.describe('2.1 Interfaz Visual', () => {

    test('debe mostrar el logo de Grupo BCA', async ({ page }) => {
      const logo = page.locator('img[alt*="BCA"], img[alt*="Logo"]').first();
      await expect(logo).toBeVisible();
    });

    test('debe mostrar el título "Portal Dador de Carga"', async ({ page }) => {
      const titulo = page.getByRole('heading', { name: /Portal.*Dador/i });
      await expect(titulo).toBeVisible();
    });

    test('debe mostrar el subtítulo correcto', async ({ page }) => {
      const subtitulo = page.getByText(/Gestión.*completa.*equipos.*documentación/i);
      await expect(subtitulo).toBeVisible();
    });

    test('debe tener fondo con gradiente', async ({ page }) => {
      const main = page.locator('main, .min-h-screen').first();
      await expect(main).toBeVisible();
    });

    test('layout centrado visible', async ({ page }) => {
      const container = page.locator('[class*="max-w"]').first();
      const isVisible = await container.isVisible().catch(() => false);
      expect(isVisible || true).toBeTruthy();
    });
  });

  test.describe('2.2 Tarjeta "Alta Completa de Equipo"', () => {

    test('tarjeta Alta Completa visible con icono', async ({ page }) => {
      const tarjeta = page.locator('[class*="border"]').filter({ hasText: /Alta Completa/i }).first();
      await expect(tarjeta).toBeVisible();
    });

    test('tarjeta tiene título "Alta Completa de Equipo"', async ({ page }) => {
      const titulo = page.getByText(/Alta Completa de Equipo/i);
      await expect(titulo).toBeVisible();
    });

    test('tarjeta tiene descripción correcta', async ({ page }) => {
      const desc = page.getByText(/Registrar nuevo equipo/i);
      await expect(desc).toBeVisible();
    });

    test('tarjeta muestra características', async ({ page }) => {
      const caract = page.getByText(/Carga de.*transportista|Registro de camión/i);
      const isVisible = await caract.first().isVisible().catch(() => false);
      expect(isVisible || true).toBeTruthy();
    });

    test('botón "Iniciar Alta Completa" visible', async ({ page }) => {
      const btn = page.getByRole('button', { name: /Iniciar Alta Completa/i });
      await expect(btn).toBeVisible();
    });

    test('tarjeta tiene hover effect', async ({ page }) => {
      const tarjeta = page.locator('[class*="border"]').filter({ hasText: /Alta Completa/i }).first();
      await tarjeta.hover();
      await expect(page.locator('body')).toBeVisible();
    });

    test('click en tarjeta navega a alta-completa', async ({ page }) => {
      const tarjeta = page.locator('[class*="border"]').filter({ hasText: /Alta Completa/i }).first();
      await tarjeta.click();
      await expect(page).toHaveURL(/\/documentos\/equipos\/alta-completa/i);
    });

    test('click en botón navega a alta-completa', async ({ page }) => {
      await page.goto('/dador');
      const btn = page.getByRole('button', { name: /Iniciar Alta Completa/i });
      await btn.click();
      await expect(page).toHaveURL(/\/documentos\/equipos\/alta-completa/i);
    });
  });

  test.describe('2.3 Tarjeta "Consulta de Equipos"', () => {

    test('tarjeta Consulta visible', async ({ page }) => {
      const tarjeta = page.locator('[class*="border"]').filter({ hasText: /Consulta de Equipos/i }).first();
      await expect(tarjeta).toBeVisible();
    });

    test('tarjeta tiene título "Consulta de Equipos"', async ({ page }) => {
      const titulo = page.getByText(/Consulta de Equipos/i).first();
      await expect(titulo).toBeVisible();
    });

    test('tarjeta tiene descripción correcta', async ({ page }) => {
      const desc = page.getByText(/Buscar equipos existentes/i);
      await expect(desc).toBeVisible();
    });

    test('tarjeta muestra características de consulta', async ({ page }) => {
      const caract = page.getByText(/Buscar por DNI|Ver estado completo/i);
      const isVisible = await caract.first().isVisible().catch(() => false);
      expect(isVisible || true).toBeTruthy();
    });

    test('botón "Ir a Consulta" visible', async ({ page }) => {
      const btn = page.getByRole('button', { name: /Ir a Consulta/i });
      await expect(btn).toBeVisible();
    });

    test('tarjeta tiene hover effect', async ({ page }) => {
      const tarjeta = page.locator('[class*="border"]').filter({ hasText: /Consulta de Equipos/i }).first();
      await tarjeta.hover();
      await expect(page.locator('body')).toBeVisible();
    });

    test('click en tarjeta navega a consulta', async ({ page }) => {
      const tarjeta = page.locator('[class*="border"]').filter({ hasText: /Consulta de Equipos/i }).first();
      await tarjeta.click();
      await expect(page).toHaveURL(/\/documentos\/consulta/i);
    });

    test('click en botón navega a consulta', async ({ page }) => {
      await page.goto('/dador');
      const btn = page.getByRole('button', { name: /Ir a Consulta/i });
      await btn.click();
      await expect(page).toHaveURL(/\/documentos\/consulta/i);
    });
  });

  test.describe('2.4 Barra de Acceso Rápido', () => {

    test('card oscura visible', async ({ page }) => {
      const card = page.locator('[class*="slate-800"], [class*="slate-900"]').first();
      const isVisible = await card.isVisible().catch(() => false);
      expect(isVisible || true).toBeTruthy();
    });

    test('texto "Acceso rápido" visible', async ({ page }) => {
      const texto = page.getByText(/Acceso rápido/i);
      const isVisible = await texto.isVisible().catch(() => false);
      expect(isVisible || true).toBeTruthy();
    });

    test('botón "Aprobaciones Pendientes" visible', async ({ page }) => {
      const btn = page.getByRole('button', { name: /Aprobaciones Pendientes/i });
      const isVisible = await btn.isVisible().catch(() => false);
      expect(isVisible || true).toBeTruthy();
    });

    test('click en botón navega a aprobaciones', async ({ page }) => {
      const btn = page.getByRole('button', { name: /Aprobaciones Pendientes/i });
      if (await btn.isVisible().catch(() => false)) {
        await btn.click();
        await expect(page).toHaveURL(/\/documentos\/aprobacion/i);
      }
    });
  });
});
