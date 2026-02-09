/**
 * Propósito: Page Object de Mi Perfil (/perfil).
 * Basado en: monorepo-bca/apps/frontend/src/pages/PerfilPage.tsx
 */

import { expect, type Locator, type Page } from '@playwright/test';

export class PerfilPage {
  readonly page: Page;

  readonly titulo: Locator;
  readonly labelEmail: Locator;
  readonly inputEmail: Locator;
  readonly labelRol: Locator;
  readonly inputRol: Locator;

  readonly seccionCambiarContrasena: Locator;

  constructor(page: Page) {
    this.page = page;
    this.titulo = page.getByRole('heading', { name: 'Mi Perfil' });
    this.labelEmail = page.getByText('Email');
    this.inputEmail = page.locator('input[type="email"][disabled]').first();
    this.labelRol = page.getByText('Rol');
    this.inputRol = page.locator('input[type="text"][disabled]').nth(0);
    // Evitar strict-mode: existe el título de sección y también un botón con el mismo texto.
    this.seccionCambiarContrasena = page.locator('span').filter({ hasText: 'Cambiar Contraseña' }).first();
  }

  async goto() {
    await this.page.goto('/perfil', { waitUntil: 'domcontentloaded' });
    await expect(this.titulo).toBeVisible();
  }
}


