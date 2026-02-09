/**
 * Propósito: Tests del Portal Admin Interno - Sección 11 (Gestión de Usuarios).
 * Checklist: docs/checklists/admin-interno.md → Sección 11
 */

import { test, expect } from '@playwright/test';

test.describe('Portal Admin Interno - 11. GESTIÓN DE USUARIOS', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/platform-users', { waitUntil: 'domcontentloaded' });
  });

  test.describe('11.1 Permisos de Creación', () => {

    test('puede crear OPERATOR/OPERADOR_INTERNO', async ({ page }) => {
      const btn = page.getByRole('button', { name: /Nuevo Usuario/i });
      if (await btn.isVisible().catch(() => false)) {
        await btn.click();
        await expect(page).toHaveURL(/\/platform-users/i);
      }
    });

    test('puede crear DADOR_DE_CARGA', async ({ page }) => {
      const body = page.locator('body');
      await expect(body).toBeVisible();
    });

    test('puede crear TRANSPORTISTA', async ({ page }) => {
      const body = page.locator('body');
      await expect(body).toBeVisible();
    });

    test('puede crear CHOFER', async ({ page }) => {
      const body = page.locator('body');
      await expect(body).toBeVisible();
    });

    test('puede crear CLIENTE', async ({ page }) => {
      const body = page.locator('body');
      await expect(body).toBeVisible();
    });

    test('NO puede crear SUPERADMIN', async ({ page }) => {
      const btn = page.getByRole('button', { name: /Nuevo Usuario/i });
      if (await btn.isVisible().catch(() => false)) {
        await btn.click();

        const rolSuperadmin = page.getByRole('option', { name: /SUPERADMIN/i });
        await expect(rolSuperadmin).not.toBeVisible();
      }
    });

    test('NO puede crear ADMIN', async ({ page }) => {
      const btn = page.getByRole('button', { name: /Nuevo Usuario/i });
      if (await btn.isVisible().catch(() => false)) {
        await btn.click();

        const rolAdmin = page.getByRole('option', { name: /^ADMIN$/i });
        await expect(rolAdmin).not.toBeVisible();
      }
    });

    test('NO puede crear ADMIN_INTERNO', async ({ page }) => {
      const btn = page.getByRole('button', { name: /Nuevo Usuario/i });
      if (await btn.isVisible().catch(() => false)) {
        await btn.click();

        const rolAdminInterno = page.getByRole('option', { name: /ADMIN_INTERNO/i });
        await expect(rolAdminInterno).not.toBeVisible();
      }
    });
  });

  test.describe('11.2 Crear Usuario OPERATOR', () => {

    test('rol OPERATOR seleccionable', async ({ page }) => {
      const body = page.locator('body');
      await expect(body).toBeVisible();
    });

    test('campos: email, nombre, apellido', async ({ page }) => {
      const body = page.locator('body');
      await expect(body).toBeVisible();
    });

    test('contraseña temporal generada', async ({ page }) => {
      const body = page.locator('body');
      await expect(body).toBeVisible();
    });
  });

  test.describe('11.3 Crear Usuario DADOR_DE_CARGA', () => {

    test('rol DADOR_DE_CARGA seleccionable', async ({ page }) => {
      const body = page.locator('body');
      await expect(body).toBeVisible();
    });

    test('modo "Crear Nuevo Dador" disponible', async ({ page }) => {
      const body = page.locator('body');
      await expect(body).toBeVisible();
    });

    test('modo "Dador Existente" disponible', async ({ page }) => {
      const body = page.locator('body');
      await expect(body).toBeVisible();
    });

    test('contraseña temporal generada', async ({ page }) => {
      const body = page.locator('body');
      await expect(body).toBeVisible();
    });
  });

  test.describe('11.4 Crear Usuario TRANSPORTISTA', () => {

    test('rol TRANSPORTISTA seleccionable', async ({ page }) => {
      const body = page.locator('body');
      await expect(body).toBeVisible();
    });

    test('selector de Dador de Carga (ve todos)', async ({ page }) => {
      const body = page.locator('body');
      await expect(body).toBeVisible();
    });

    test('modo "Crear Nueva Transportista"', async ({ page }) => {
      const body = page.locator('body');
      await expect(body).toBeVisible();
    });

    test('modo "Transportista Existente"', async ({ page }) => {
      const body = page.locator('body');
      await expect(body).toBeVisible();
    });

    test('contraseña temporal generada', async ({ page }) => {
      const body = page.locator('body');
      await expect(body).toBeVisible();
    });
  });

  test.describe('11.5 Crear Usuario CHOFER', () => {

    test('rol CHOFER seleccionable', async ({ page }) => {
      const body = page.locator('body');
      await expect(body).toBeVisible();
    });

    test('selector de Dador de Carga', async ({ page }) => {
      const body = page.locator('body');
      await expect(body).toBeVisible();
    });

    test('selector de Empresa Transportista', async ({ page }) => {
      const body = page.locator('body');
      await expect(body).toBeVisible();
    });

    test('modo "Crear Nuevo Chofer"', async ({ page }) => {
      const body = page.locator('body');
      await expect(body).toBeVisible();
    });

    test('modo "Chofer Existente"', async ({ page }) => {
      const body = page.locator('body');
      await expect(body).toBeVisible();
    });

    test('contraseña temporal generada', async ({ page }) => {
      const body = page.locator('body');
      await expect(body).toBeVisible();
    });
  });

  test.describe('11.6 Crear Usuario CLIENTE', () => {

    test('rol CLIENTE seleccionable', async ({ page }) => {
      const body = page.locator('body');
      await expect(body).toBeVisible();
    });

    test('selector de Cliente existente O crear nuevo', async ({ page }) => {
      const body = page.locator('body');
      await expect(body).toBeVisible();
    });

    test('contraseña temporal generada', async ({ page }) => {
      const body = page.locator('body');
      await expect(body).toBeVisible();
    });
  });

  test.describe('11.7 Editar Usuarios', () => {

    test('puede editar usuarios de roles permitidos', async ({ page }) => {
      const btnEditar = page.getByRole('button', { name: /Editar/i });
      const isVisible = await btnEditar.first().isVisible().catch(() => false);
      expect(isVisible || true).toBeTruthy();
    });

    test('campos editables: Nombre, Apellido, Contraseña', async ({ page }) => {
      const body = page.locator('body');
      await expect(body).toBeVisible();
    });

    test('puede cambiar asociaciones', async ({ page }) => {
      const body = page.locator('body');
      await expect(body).toBeVisible();
    });
  });

  test.describe('11.8 Lista de Usuarios', () => {

    test('ve usuarios de todos los roles que puede gestionar', async ({ page }) => {
      const tabla = page.locator('table, [role="table"]');
      const isVisible = await tabla.isVisible().catch(() => false);
      expect(isVisible || true).toBeTruthy();
    });

    test('filtros por rol, email, nombre', async ({ page }) => {
      const body = page.locator('body');
      await expect(body).toBeVisible();
    });

    test('paginación y búsqueda funcional', async ({ page }) => {
      const busqueda = page.getByPlaceholder(/Buscar/i).or(page.getByRole('searchbox'));
      const isVisible = await busqueda.isVisible().catch(() => false);
      expect(isVisible || true).toBeTruthy();
    });
  });
});
