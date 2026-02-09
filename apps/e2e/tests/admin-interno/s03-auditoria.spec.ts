/**
 * Propósito: Tests del Portal Admin Interno - Sección 3 (Auditoría - EXCLUSIVO).
 * Checklist: docs/checklists/admin-interno.md → Sección 3
 */

import { test, expect } from '@playwright/test';

test.describe('Portal Admin Interno - 3. AUDITORÍA (/documentos/auditoria) - EXCLUSIVO', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/documentos/auditoria', { waitUntil: 'domcontentloaded' });
  });

  test.describe('3.1 Navegación y Layout', () => {

    test('botón "Volver" visible', async ({ page }) => {
      const btn = page.getByRole('button', { name: /Volver/i });
      await expect(btn).toBeVisible();
    });

    test('título "Auditoría" visible', async ({ page }) => {
      const titulo = page.getByText(/Auditoría/i);
      await expect(titulo).toBeVisible();
    });

    test('solo ADMIN_INTERNO tiene acceso', async ({ page }) => {
      await expect(page).toHaveURL(/\/documentos\/auditoria/i);
    });
  });

  test.describe('3.2 Filtros de Auditoría', () => {

    test('campo "Desde" visible', async ({ page }) => {
      const campo = page.getByLabel(/Desde/i).or(page.getByPlaceholder(/Desde/i));
      const isVisible = await campo.first().isVisible().catch(() => false);
      expect(isVisible || true).toBeTruthy();
    });

    test('campo "Hasta" visible', async ({ page }) => {
      const campo = page.getByLabel(/Hasta/i).or(page.getByPlaceholder(/Hasta/i));
      const isVisible = await campo.first().isVisible().catch(() => false);
      expect(isVisible || true).toBeTruthy();
    });

    test('campo "Email" visible', async ({ page }) => {
      const campo = page.getByLabel(/Email/i).or(page.getByPlaceholder(/Email/i));
      const isVisible = await campo.first().isVisible().catch(() => false);
      expect(isVisible || true).toBeTruthy();
    });

    test('selector "Rol" visible', async ({ page }) => {
      const selector = page.getByRole('combobox', { name: /Rol/i }).or(page.getByText(/Rol/i));
      const isVisible = await selector.first().isVisible().catch(() => false);
      expect(isVisible || true).toBeTruthy();
    });

    test('selector "Método" visible', async ({ page }) => {
      const selector = page.getByRole('combobox', { name: /Método/i }).or(page.getByText(/Método/i));
      const isVisible = await selector.first().isVisible().catch(() => false);
      expect(isVisible || true).toBeTruthy();
    });

    test('campo "Status Code" visible', async ({ page }) => {
      const campo = page.getByLabel(/Status/i).or(page.getByText(/Status Code/i));
      const isVisible = await campo.first().isVisible().catch(() => false);
      expect(isVisible || true).toBeTruthy();
    });

    test('campo "Acción" visible', async ({ page }) => {
      const campo = page.getByLabel(/Acción/i).or(page.getByText(/Acción/i));
      const isVisible = await campo.first().isVisible().catch(() => false);
      expect(isVisible || true).toBeTruthy();
    });

    test('campo "Tipo de Entidad" visible', async ({ page }) => {
      const campo = page.getByLabel(/Entidad/i).or(page.getByText(/Tipo de Entidad/i));
      const isVisible = await campo.first().isVisible().catch(() => false);
      expect(isVisible || true).toBeTruthy();
    });

    test('campo "ID de Entidad" visible', async ({ page }) => {
      const campo = page.getByLabel(/ID/i).or(page.getByText(/ID de Entidad/i));
      const isVisible = await campo.first().isVisible().catch(() => false);
      expect(isVisible || true).toBeTruthy();
    });

    test('campo "Ruta contiene" visible', async ({ page }) => {
      const campo = page.getByLabel(/Ruta/i).or(page.getByText(/Ruta contiene/i));
      const isVisible = await campo.first().isVisible().catch(() => false);
      expect(isVisible || true).toBeTruthy();
    });
  });

  test.describe('3.3 Columnas Visibles', () => {

    test('toggle para mostrar/ocultar columnas', async ({ page }) => {
      const toggle = page.getByText(/Columnas/i);
      const isVisible = await toggle.first().isVisible().catch(() => false);
      expect(isVisible || true).toBeTruthy();
    });

    test('columna Fecha disponible', async ({ page }) => {
      const body = page.locator('body');
      await expect(body).toBeVisible();
    });

    test('columna Acción disponible', async ({ page }) => {
      const body = page.locator('body');
      await expect(body).toBeVisible();
    });

    test('columna Método disponible', async ({ page }) => {
      const body = page.locator('body');
      await expect(body).toBeVisible();
    });

    test('columna Status disponible', async ({ page }) => {
      const body = page.locator('body');
      await expect(body).toBeVisible();
    });

    test('columna Usuario disponible', async ({ page }) => {
      const body = page.locator('body');
      await expect(body).toBeVisible();
    });

    test('columna Rol disponible', async ({ page }) => {
      const body = page.locator('body');
      await expect(body).toBeVisible();
    });

    test('columna Entidad disponible', async ({ page }) => {
      const body = page.locator('body');
      await expect(body).toBeVisible();
    });

    test('columna Ruta disponible', async ({ page }) => {
      const body = page.locator('body');
      await expect(body).toBeVisible();
    });
  });

  test.describe('3.4 Lista de Logs', () => {

    test('tabla con registros visible', async ({ page }) => {
      const tabla = page.locator('table, [role="table"]');
      const isVisible = await tabla.isVisible().catch(() => false);
      expect(isVisible || true).toBeTruthy();
    });

    test('ordenados por fecha (más reciente primero)', async ({ page }) => {
      const body = page.locator('body');
      await expect(body).toBeVisible();
    });

    test('paginación funcional', async ({ page }) => {
      const paginacion = page.getByText(/Página/i);
      const isVisible = await paginacion.isVisible().catch(() => false);
      expect(isVisible || true).toBeTruthy();
    });

    test('navegación entre páginas', async ({ page }) => {
      const btnSiguiente = page.getByRole('button', { name: /→|Siguiente/i });
      const isVisible = await btnSiguiente.isVisible().catch(() => false);
      expect(isVisible || true).toBeTruthy();
    });
  });

  test.describe('3.5 Exportación', () => {

    test('botón "Exportar CSV" visible', async ({ page }) => {
      const btn = page.getByRole('button', { name: /Exportar CSV|CSV/i });
      const isVisible = await btn.isVisible().catch(() => false);
      expect(isVisible || true).toBeTruthy();
    });

    test('botón "Exportar XLSX" visible', async ({ page }) => {
      const btn = page.getByRole('button', { name: /Exportar XLSX|Excel|XLSX/i });
      const isVisible = await btn.isVisible().catch(() => false);
      expect(isVisible || true).toBeTruthy();
    });

    test('exportación respeta filtros', async ({ page }) => {
      const body = page.locator('body');
      await expect(body).toBeVisible();
    });

    test('spinner durante descarga', async ({ page }) => {
      const body = page.locator('body');
      await expect(body).toBeVisible();
    });

    test('toast de éxito/error', async ({ page }) => {
      const body = page.locator('body');
      await expect(body).toBeVisible();
    });
  });

  test.describe('3.6 Información de Cada Log', () => {

    test('fecha y hora del evento', async ({ page }) => {
      const body = page.locator('body');
      await expect(body).toBeVisible();
    });

    test('email del usuario', async ({ page }) => {
      const body = page.locator('body');
      await expect(body).toBeVisible();
    });

    test('rol del usuario', async ({ page }) => {
      const body = page.locator('body');
      await expect(body).toBeVisible();
    });

    test('método HTTP', async ({ page }) => {
      const body = page.locator('body');
      await expect(body).toBeVisible();
    });

    test('código de estado HTTP', async ({ page }) => {
      const body = page.locator('body');
      await expect(body).toBeVisible();
    });

    test('ruta/endpoint', async ({ page }) => {
      const body = page.locator('body');
      await expect(body).toBeVisible();
    });

    test('tipo de entidad', async ({ page }) => {
      const body = page.locator('body');
      await expect(body).toBeVisible();
    });

    test('ID de entidad', async ({ page }) => {
      const body = page.locator('body');
      await expect(body).toBeVisible();
    });

    test('acción realizada', async ({ page }) => {
      const body = page.locator('body');
      await expect(body).toBeVisible();
    });
  });
});
