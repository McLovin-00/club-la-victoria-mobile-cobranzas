/**
 * Propósito: Page Object del Dashboard del Portal Empresa Transportista.
 * Basado en: monorepo-bca/apps/frontend/src/features/transportista/pages/TransportistaDashboard.tsx
 */

import { expect, type Locator, type Page } from '@playwright/test';

export class TransportistaDashboardPage {
  readonly page: Page;

  readonly logoGrupoBca: Locator;
  readonly titulo: Locator;
  readonly subtitulo: Locator;

  readonly tarjetaAltaCompleta: Locator;
  readonly btnIniciarAltaCompleta: Locator;

  readonly tarjetaConsulta: Locator;
  readonly btnIrAConsulta: Locator;

  readonly notaInformativa: Locator;

  constructor(page: Page) {
    this.page = page;

    // Puede haber logo también en el layout general. Tomamos el primero visible.
    this.logoGrupoBca = page.locator('img[alt="Grupo BCA"]').first();
    this.titulo = page.getByRole('heading', { name: 'Portal Empresa Transportista' });
    this.subtitulo = page.getByText('Gestión de equipos y documentación');

    this.tarjetaAltaCompleta = page.locator('[class*="border-2"]').filter({ hasText: 'Alta Completa de Equipo' });
    this.btnIniciarAltaCompleta = page.getByRole('button', { name: 'Iniciar Alta Completa' });

    this.tarjetaConsulta = page.locator('[class*="border-2"]').filter({ hasText: 'Consulta de Equipos' });
    this.btnIrAConsulta = page.getByRole('button', { name: 'Ir a Consulta' });

    this.notaInformativa = page.getByText(/Los documentos que subas quedan pendientes de aprobación por el Dador de Carga/i);
  }

  /** Navega al dashboard del transportista. */
  async goto() {
    await this.page.goto('/transportista', { waitUntil: 'domcontentloaded' });
    await expect(this.titulo).toBeVisible();
  }

  /** Entra a Alta Completa desde el dashboard. */
  async iniciarAltaCompleta() {
    await this.btnIniciarAltaCompleta.click();
    await expect(this.page).toHaveURL(/\/documentos\/equipos\/alta-completa(\/|$)/i);
  }

  /** Entra a Consulta desde el dashboard. */
  async irAConsulta() {
    await this.btnIrAConsulta.click();
    await expect(this.page).toHaveURL(/\/documentos\/consulta(\/|$)/i);
  }
}


