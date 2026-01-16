/**
 * Propósito: Page Object de la gestión de usuarios de plataforma (/platform-users),
 * con foco en permisos del rol TRANSPORTISTA (solo puede crear usuarios CHOFER).
 * Basado en: monorepo-bca/apps/frontend/src/features/platform-users/pages/PlatformUsersPage.tsx
 */

import { expect, type Locator, type Page } from '@playwright/test';

export class PlatformUsersPage {
  readonly page: Page;

  readonly titulo: Locator;
  readonly inputBuscar: Locator;
  readonly btnBuscar: Locator;
  readonly btnNuevoUsuario: Locator;

  readonly tabla: Locator;
  readonly filas: Locator;

  // Modal Nuevo Usuario
  readonly modalNuevoUsuario: Locator;
  readonly modalTitulo: Locator;
  readonly selectRol: Locator;
  readonly btnCrearUsuario: Locator;

  constructor(page: Page) {
    this.page = page;

    this.titulo = page.getByRole('heading', { name: 'Usuarios de Plataforma' });
    this.inputBuscar = page.getByPlaceholder('Buscar por email o nombre');
    this.btnBuscar = page.getByRole('button', { name: 'Buscar' });
    this.btnNuevoUsuario = page.getByRole('button', { name: 'Nuevo Usuario' });

    this.tabla = page.locator('table');
    this.filas = this.tabla.locator('tbody tr');

    this.modalNuevoUsuario = page.locator('.fixed.inset-0').filter({ hasText: 'Nuevo Usuario' });
    this.modalTitulo = this.modalNuevoUsuario.getByText('Nuevo Usuario').first();
    this.selectRol = this.modalNuevoUsuario.locator('select').first();
    this.btnCrearUsuario = this.modalNuevoUsuario.getByRole('button', { name: 'Crear Usuario' });
  }

  async goto() {
    await this.page.goto('/platform-users', { waitUntil: 'domcontentloaded' });
    await expect(this.titulo).toBeVisible();
  }

  async abrirModalNuevoUsuario() {
    await this.btnNuevoUsuario.click();
    await expect(this.modalNuevoUsuario).toBeVisible();
  }
}


