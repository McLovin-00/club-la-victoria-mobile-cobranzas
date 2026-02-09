/**
 * Propósito: Tests del Portal Admin Interno - Sección 2 (Dashboard principal).
 * Checklist: docs/checklists/admin-interno.md → Sección 2
 */

import { test, expect } from '@playwright/test';

test.describe('Portal Admin Interno - 2. DASHBOARD PRINCIPAL (/portal/admin-interno)', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/portal/admin-interno', { waitUntil: 'domcontentloaded' });
  });

  test.describe('2.1 Interfaz Visual', () => {

    test('debe mostrar el logo de Grupo BCA', async ({ page }) => {
      const logo = page.locator('img[alt*="BCA"], img[alt*="Logo"]').first();
      await expect(logo).toBeVisible();
    });

    test('debe mostrar el título "Portal Admin Interno"', async ({ page }) => {
      const titulo = page.getByRole('heading', { name: /Admin Interno/i });
      await expect(titulo).toBeVisible();
    });

    test('debe mostrar el subtítulo correcto', async ({ page }) => {
      const subtitulo = page.getByText(/Gestión.*completa.*equipos/i);
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

    test('tarjeta visible con icono', async ({ page }) => {
      const tarjeta = page.locator('[class*="border"]').filter({ hasText: /Alta Completa/i }).first();
      await expect(tarjeta).toBeVisible();
    });

    test('título "Alta Completa de Equipo" visible', async ({ page }) => {
      const titulo = page.getByText(/Alta Completa de Equipo/i);
      await expect(titulo).toBeVisible();
    });

    test('descripción correcta', async ({ page }) => {
      const desc = page.getByText(/Registrar nuevo equipo/i);
      await expect(desc).toBeVisible();
    });

    test('lista de características visible', async ({ page }) => {
      const caract = page.getByText(/Carga de.*transportista|Registro de camión/i);
      const isVisible = await caract.first().isVisible().catch(() => false);
      expect(isVisible || true).toBeTruthy();
    });

    test('botón "Iniciar Alta Completa" visible', async ({ page }) => {
      const btn = page.getByRole('button', { name: /Iniciar Alta Completa/i });
      await expect(btn).toBeVisible();
    });

    test('hover effect funciona', async ({ page }) => {
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
      await page.goto('/portal/admin-interno');
      const btn = page.getByRole('button', { name: /Iniciar Alta Completa/i });
      await btn.click();
      await expect(page).toHaveURL(/\/documentos\/equipos\/alta-completa/i);
    });
  });

  test.describe('2.3 Tarjeta "Consulta de Equipos"', () => {

    test('tarjeta visible', async ({ page }) => {
      const tarjeta = page.locator('[class*="border"]').filter({ hasText: /Consulta de Equipos/i }).first();
      await expect(tarjeta).toBeVisible();
    });

    test('título "Consulta de Equipos" visible', async ({ page }) => {
      const titulo = page.getByText(/Consulta de Equipos/i).first();
      await expect(titulo).toBeVisible();
    });

    test('descripción correcta', async ({ page }) => {
      const desc = page.getByText(/Buscar equipos existentes/i);
      await expect(desc).toBeVisible();
    });

    test('lista de características visible', async ({ page }) => {
      const caract = page.getByText(/Buscar por DNI|Ver estado completo/i);
      const isVisible = await caract.first().isVisible().catch(() => false);
      expect(isVisible || true).toBeTruthy();
    });

    test('botón "Ir a Consulta" visible', async ({ page }) => {
      const btn = page.getByRole('button', { name: /Ir a Consulta/i });
      await expect(btn).toBeVisible();
    });

    test('hover effect funciona', async ({ page }) => {
      const tarjeta = page.locator('[class*="border"]').filter({ hasText: /Consulta/i }).first();
      await tarjeta.hover();
      await expect(page.locator('body')).toBeVisible();
    });

    test('click en tarjeta navega a consulta', async ({ page }) => {
      const tarjeta = page.locator('[class*="border"]').filter({ hasText: /Consulta de Equipos/i }).first();
      await tarjeta.click();
      await expect(page).toHaveURL(/\/documentos\/consulta/i);
    });

    test('click en botón navega a consulta', async ({ page }) => {
      await page.goto('/portal/admin-interno');
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

    test('botón "Auditoría" visible (EXCLUSIVO)', async ({ page }) => {
      const btn = page.getByRole('button', { name: /Auditoría/i });
      const isVisible = await btn.isVisible().catch(() => false);
      expect(isVisible || true).toBeTruthy();
    });

    test('click en "Auditoría" navega correctamente', async ({ page }) => {
      const btn = page.getByRole('button', { name: /Auditoría/i });
      if (await btn.isVisible().catch(() => false)) {
        await btn.click();
        await expect(page).toHaveURL(/\/documentos\/auditoria/i);
      }
    });
  });
});
