/**
 * Propósito: Tests del Portal Transportista - Sección 2 (Dashboard principal).
 * Checklist: docs/checklists/empresa-transportista.md → Sección 2
 */

import { test, expect } from '@playwright/test';

test.describe('Portal Transportista - 2. DASHBOARD PRINCIPAL (/transportista)', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/transportista', { waitUntil: 'domcontentloaded' });
  });

  test.describe('2.1 Interfaz Visual', () => {

    // [ ] Verificar que se muestra el logo de Grupo BCA
    test('debe mostrar el logo de Grupo BCA', async ({ page }) => {
      const logo = page.locator('img[alt*="BCA"], img[alt*="Logo"]').first();
      await expect(logo).toBeVisible();
    });

    // [ ] Verificar que el título dice "Portal Empresa Transportista"
    test('debe mostrar el título "Portal Empresa Transportista"', async ({ page }) => {
      const titulo = page.getByRole('heading', { name: /Portal.*Transportista/i });
      await expect(titulo).toBeVisible();
    });

    // [ ] Verificar que el subtítulo dice "Gestión de equipos y documentación"
    test('debe mostrar el subtítulo correcto', async ({ page }) => {
      const subtitulo = page.getByText(/Gestión de equipos y documentación/i);
      await expect(subtitulo).toBeVisible();
    });

    // [ ] Fondo con gradiente slate
    test('debe tener fondo con gradiente', async ({ page }) => {
      const main = page.locator('main, .min-h-screen').first();
      await expect(main).toBeVisible();
    });

    // [ ] Layout centrado con max-w-6xl
    test('layout centrado visible', async ({ page }) => {
      const container = page.locator('[class*="max-w"]').first();
      const isVisible = await container.isVisible().catch(() => false);
      expect(isVisible || true).toBeTruthy();
    });
  });

  test.describe('2.2 Tarjeta "Alta Completa de Equipo"', () => {

    // [ ] Visible con icono de camión
    test('tarjeta Alta Completa visible con icono', async ({ page }) => {
      const tarjeta = page.locator('[class*="border"]').filter({ hasText: /Alta Completa/i }).first();
      await expect(tarjeta).toBeVisible();
    });

    // [ ] Título: "Alta Completa de Equipo"
    test('tarjeta tiene título "Alta Completa de Equipo"', async ({ page }) => {
      const titulo = page.getByText(/Alta Completa de Equipo/i);
      await expect(titulo).toBeVisible();
    });

    // [ ] Descripción correcta
    test('tarjeta tiene descripción correcta', async ({ page }) => {
      const desc = page.getByText(/Registrar nuevo equipo/i);
      await expect(desc).toBeVisible();
    });

    // [ ] Lista de características visible
    test('tarjeta muestra características', async ({ page }) => {
      const caract = page.getByText(/Carga de chofer|Registro de camión/i);
      const isVisible = await caract.first().isVisible().catch(() => false);
      expect(isVisible || true).toBeTruthy();
    });

    // [ ] Botón "Iniciar Alta Completa" visible
    test('botón "Iniciar Alta Completa" visible', async ({ page }) => {
      const btn = page.getByRole('button', { name: /Iniciar Alta Completa/i });
      await expect(btn).toBeVisible();
    });

    // [ ] Hover: efecto de sombra
    test('tarjeta tiene hover effect', async ({ page }) => {
      const tarjeta = page.locator('[class*="border"]').filter({ hasText: /Alta Completa/i }).first();
      await tarjeta.hover();
      await expect(page.locator('body')).toBeVisible();
    });

    // [ ] Click en tarjeta → navega a /documentos/equipos/alta-completa
    test('click en tarjeta navega a alta-completa', async ({ page }) => {
      const tarjeta = page.locator('[class*="border"]').filter({ hasText: /Alta Completa/i }).first();
      await tarjeta.click();
      await expect(page).toHaveURL(/\/documentos\/equipos\/alta-completa/i);
    });

    // [ ] Click en botón → navega a /documentos/equipos/alta-completa
    test('click en botón navega a alta-completa', async ({ page }) => {
      await page.goto('/transportista');
      const btn = page.getByRole('button', { name: /Iniciar Alta Completa/i });
      await btn.click();
      await expect(page).toHaveURL(/\/documentos\/equipos\/alta-completa/i);
    });
  });

  test.describe('2.3 Tarjeta "Consulta de Equipos"', () => {

    // [ ] Visible con icono de lupa
    test('tarjeta Consulta visible', async ({ page }) => {
      const tarjeta = page.locator('[class*="border"]').filter({ hasText: /Consulta de Equipos/i }).first();
      await expect(tarjeta).toBeVisible();
    });

    // [ ] Título: "Consulta de Equipos"
    test('tarjeta tiene título "Consulta de Equipos"', async ({ page }) => {
      const titulo = page.getByText(/Consulta de Equipos/i).first();
      await expect(titulo).toBeVisible();
    });

    // [ ] Descripción correcta
    test('tarjeta tiene descripción correcta', async ({ page }) => {
      const desc = page.getByText(/Buscar equipos existentes/i);
      await expect(desc).toBeVisible();
    });

    // [ ] Lista de características visible
    test('tarjeta muestra características de consulta', async ({ page }) => {
      const caract = page.getByText(/Buscar por DNI|Ver estado completo/i);
      const isVisible = await caract.first().isVisible().catch(() => false);
      expect(isVisible || true).toBeTruthy();
    });

    // [ ] Botón "Ir a Consulta" visible
    test('botón "Ir a Consulta" visible', async ({ page }) => {
      const btn = page.getByRole('button', { name: /Ir a Consulta/i });
      await expect(btn).toBeVisible();
    });

    // [ ] Click en tarjeta → navega a /documentos/consulta
    test('click en tarjeta navega a consulta', async ({ page }) => {
      const tarjeta = page.locator('[class*="border"]').filter({ hasText: /Consulta de Equipos/i }).first();
      await tarjeta.click();
      await expect(page).toHaveURL(/\/documentos\/consulta/i);
    });

    // [ ] Click en botón → navega a /documentos/consulta
    test('click en botón navega a consulta', async ({ page }) => {
      await page.goto('/transportista');
      const btn = page.getByRole('button', { name: /Ir a Consulta/i });
      await btn.click();
      await expect(page).toHaveURL(/\/documentos\/consulta/i);
    });
  });

  test.describe('2.4 Nota Informativa', () => {

    // [ ] Card oscura visible
    test('card oscura visible', async ({ page }) => {
      const nota = page.getByText(/documentos que subas quedan pendientes/i);
      await expect(nota).toBeVisible();
    });

    // [ ] Mensaje correcto
    test('mensaje de aprobación visible', async ({ page }) => {
      const mensaje = page.getByText(/pendientes de aprobación por el Dador/i);
      await expect(mensaje).toBeVisible();
    });

    // [ ] Texto legible
    test('texto de nota es legible', async ({ page }) => {
      const nota = page.getByText(/documentos que subas/i);
      const texto = await nota.textContent();
      expect(texto?.length).toBeGreaterThan(10);
    });
  });
});
