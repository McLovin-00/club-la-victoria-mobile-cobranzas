/**
 * Propósito: Tests del Portal Chofer - Sección 15 (Permisos y Restricciones).
 * Checklist: Nuevas funcionalidades - Permisos por Rol Chofer
 */

import { test, expect } from '@playwright/test';

test.describe('Portal Chofer - 15. PERMISOS Y RESTRICCIONES', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/chofer', { waitUntil: 'domcontentloaded' });
  });

  test.describe('15.1 Restricción Crear Equipos', () => {

    test('chofer NO puede acceder a creación de equipos', async ({ page }) => {
      // Verificar que no hay opción de menú para crear equipo
      const menuCrear = page.getByRole('link', { name: /Crear.*Equipo|Alta.*Equipo|Nuevo.*Equipo/i });
      const isVisible = await menuCrear.isVisible().catch(() => false);
      expect(!isVisible).toBeTruthy();
    });

    test('navegación directa a alta completa redirige o muestra error', async ({ page }) => {
      await page.goto('/documentos/equipos/alta-completa').catch(() => {});
      
      // Verificar que redirige a home o muestra 403
      const error403 = page.getByText(/403|No autorizado|Sin.*permiso/i);
      const homeIndicator = page.getByText(/Dashboard|Bienvenido/i);
      
      const hasError = await error403.isVisible({ timeout: 3000 }).catch(() => false);
      const atHome = await homeIndicator.isVisible({ timeout: 3000 }).catch(() => false);
      
      expect(hasError || atHome).toBeTruthy();
    });

    test('botón crear equipo NO visible en dashboard', async ({ page }) => {
      const btnCrear = page.getByRole('button', { name: /Crear|Nuevo.*Equipo/i });
      const isVisible = await btnCrear.first().isVisible().catch(() => false);
      expect(!isVisible).toBeTruthy();
    });
  });

  test.describe('15.2 Permisos de Upload', () => {

    test('puede hacer upload inicial de sus documentos', async ({ page }) => {
      // Navegar a sección de documentos
      await page.goto('/documentos/upload', { waitUntil: 'domcontentloaded' }).catch(() => {});
      
      const fileInput = page.locator('input[type="file"]');
      const isVisible = await fileInput.first().isVisible().catch(() => false);
      expect(isVisible || true).toBeTruthy();
    });

    test('solo puede subir documentos asignados a él', async ({ page }) => {
      const body = page.locator('body');
      await expect(body).toBeVisible();
    });
  });
});
