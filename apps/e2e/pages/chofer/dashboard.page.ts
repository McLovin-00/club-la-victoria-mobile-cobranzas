/**
 * Propósito: Page Object del Dashboard del Portal Chofer.
 * Basado en: monorepo-bca/apps/frontend/src/features/chofer/pages/ChoferDashboard.tsx
 */

import { expect, type Locator, type Page } from '@playwright/test';

export class ChoferDashboardPage {
  readonly page: Page;

  readonly logoGrupoBca: Locator;
  readonly titulo: Locator;
  readonly subtitulo: Locator;

  readonly tarjetaConsulta: Locator;
  readonly tituloConsulta: Locator;
  readonly btnIrAConsulta: Locator;

  readonly tarjetaAltaCompleta: Locator;
  readonly notaInformativa: Locator;

  constructor(page: Page) {
    this.page = page;

    // En el layout puede haber más de un logo (header general + pantalla). Tomamos el primero visible.
    this.logoGrupoBca = page.locator('img[alt="Grupo BCA"]').first();
    this.titulo = page.getByRole('heading', { name: 'Portal Chofer' });
    this.subtitulo = page.getByText('Gestión de equipos y documentación');

    this.tarjetaConsulta = page.locator('[class*="border-2"]').filter({ hasText: 'Consulta de Equipos' });
    this.tituloConsulta = page.getByText('Consulta de Equipos').first();
    this.btnIrAConsulta = page.getByRole('button', { name: 'Ir a Consulta' });

    // En Chofer NO debe mostrarse
    this.tarjetaAltaCompleta = page.getByText('Alta Completa de Equipo');

    this.notaInformativa = page.getByText(/Los documentos que subas quedan pendientes de aprobación por el Dador de Carga/i);
  }

  /** Navega al dashboard del chofer. */
  async goto() {
    await this.page.goto('/chofer', { waitUntil: 'domcontentloaded' });
    await expect(this.titulo).toBeVisible();
  }

  /** Entra a la consulta desde el dashboard. */
  async irAConsulta() {
    await this.btnIrAConsulta.click();
    await expect(this.page).toHaveURL(/\/documentos\/consulta(\/|$)/i);
  }
}


