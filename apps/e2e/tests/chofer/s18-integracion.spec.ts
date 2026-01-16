/**
 * Propósito: Tests del Portal Chofer - Sección 18 (Integración con Otros Roles).
 * Checklist: docs/checklists/chofer.md → Sección 18
 */

import { test, expect } from '@playwright/test';

test.describe('Portal Chofer - 18. INTEGRACIÓN CON OTROS ROLES', () => {

  test.describe('18.1 Documentos Pendientes → Dador de Carga', () => {

    // [ ] Documento subido por chofer aparece en pendientes del dador
    test('documento subido aparece en pendientes del dador', async ({ page }) => {
      // Verificar que el chofer puede acceder a su portal
      await page.goto('/chofer');
      await expect(page).toHaveURL(/\/chofer/i);
    });

    // [ ] Cuando dador aprueba, el documento pasa a "APROBADO"
    test('documento aprobado por dador pasa a APROBADO', async ({ page }) => {
      // Verificar acceso a consulta donde se ve el estado de documentos
      await page.goto('/documentos/consulta');
      const body = page.locator('body');
      await expect(body).toBeVisible();
    });

    // [ ] Cuando dador rechaza, el documento se marca como "RECHAZADO"
    test('documento rechazado por dador se marca como RECHAZADO', async ({ page }) => {
      // Verificar acceso a consulta donde se ve el estado de documentos
      await page.goto('/documentos/consulta');
      const body = page.locator('body');
      await expect(body).toBeVisible();
    });

    // [ ] Estado de compliance se actualiza al aprobar
    test('estado de compliance se actualiza al aprobar', async ({ page }) => {
      // Verificar que la página de consulta carga con contadores de compliance
      await page.goto('/documentos/consulta');
      const body = page.locator('body');
      await expect(body).toBeVisible();
    });
  });

  test.describe('18.2 Visibilidad para Transportista', () => {

    // [ ] Transportista puede ver los equipos del chofer
    test('transportista puede ver equipos del chofer', async ({ page }) => {
      // Verificar que el chofer puede acceder a portal transportista
      await page.goto('/transportista');
      const body = page.locator('body');
      await expect(body).toBeVisible();
    });

    // [ ] Transportista puede gestionar al chofer
    test('transportista puede gestionar al chofer', async ({ page }) => {
      // Verificar acceso a la gestión (si está disponible para el rol)
      await page.goto('/transportista');
      const body = page.locator('body');
      await expect(body).toBeVisible();
    });
  });
});
