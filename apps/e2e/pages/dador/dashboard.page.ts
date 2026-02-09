/**
 * Propósito: Page Object del Dashboard del Portal Dador de Carga.
 * Basado en: monorepo-bca/apps/frontend/src/features/dador/pages/DadorDashboard.tsx
 */

import { expect, type Locator, type Page } from '@playwright/test';

export class DadorDashboardPage {
  readonly page: Page;

  readonly logoGrupoBca: Locator;
  readonly titulo: Locator;
  readonly subtitulo: Locator;

  readonly tarjetaAltaCompleta: Locator;
  readonly btnIniciarAltaCompleta: Locator;

  readonly tarjetaConsulta: Locator;
  readonly btnIrAConsulta: Locator;

  readonly barraAccesoRapido: Locator;
  readonly btnAprobacionesPendientes: Locator;

  constructor(page: Page) {
    this.page = page;

    this.logoGrupoBca = page.locator('img[alt="Grupo BCA"]').first();
    this.titulo = page.getByRole('heading', { name: 'Portal Dador de Carga' });
    this.subtitulo = page.getByText('Gestión completa de equipos y documentación');

    this.tarjetaAltaCompleta = page.locator('[class*="border-2"]').filter({ hasText: 'Alta Completa de Equipo' });
    this.btnIniciarAltaCompleta = page.getByRole('button', { name: 'Iniciar Alta Completa' });

    this.tarjetaConsulta = page.locator('[class*="border-2"]').filter({ hasText: 'Consulta de Equipos' });
    this.btnIrAConsulta = page.getByRole('button', { name: 'Ir a Consulta' });

    this.barraAccesoRapido = page.getByText('Acceso rápido:');
    this.btnAprobacionesPendientes = page.getByRole('button', { name: 'Aprobaciones Pendientes' });
  }

  async goto() {
    await this.page.goto('/dador', { waitUntil: 'domcontentloaded' });
    await expect(this.titulo).toBeVisible();
  }
}


