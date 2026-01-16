/**
 * Propósito: Page Object de la cola de aprobación (/documentos/aprobacion).
 * Basado en: monorepo-bca/apps/frontend/src/features/documentos/pages/ApprovalQueuePage.tsx
 */

import { expect, type Locator, type Page } from '@playwright/test';

export class AprobacionQueuePage {
  readonly page: Page;

  readonly btnVolver: Locator;
  readonly titulo: Locator;
  readonly descripcion: Locator;

  readonly kpiPendientes: Locator;
  readonly kpiAprobadosHoy: Locator;
  readonly kpiRechazadosHoy: Locator;
  readonly kpiTiempoMedio: Locator;

  readonly selectEntidad: Locator;
  readonly btnFiltrar: Locator;
  readonly btnRefrescar: Locator;

  readonly tabla: Locator;
  readonly filaSinPendientes: Locator;
  readonly linkRevisar: Locator;

  constructor(page: Page) {
    this.page = page;

    this.btnVolver = page.getByRole('button', { name: /Volver/i });
    this.titulo = page.getByRole('heading', { name: 'Aprobación de Documentos' });
    this.descripcion = page.getByText(/Revisá y aprobá o rechazá documentos clasificados por la IA/i);

    // KPI cards: usamos texto del label
    this.kpiPendientes = page.getByText('Pendientes').first();
    this.kpiAprobadosHoy = page.getByText('Aprobados hoy').first();
    this.kpiRechazadosHoy = page.getByText('Rechazados hoy').first();
    this.kpiTiempoMedio = page.getByText(/T\. medio revisión/i).first();

    // Filtros (asumimos un select en la sección)
    this.selectEntidad = page.locator('select').first();
    this.btnFiltrar = page.getByRole('button', { name: /Filtrar/i }).or(page.getByText('Filtrar'));
    this.btnRefrescar = page.getByRole('button', { name: /Refrescar/i }).or(page.getByText('Refrescar'));

    this.tabla = page.locator('table');
    this.filaSinPendientes = page.getByText('No hay documentos pendientes.').first();
    this.linkRevisar = page.getByRole('link', { name: 'Revisar' });
  }

  async goto() {
    await this.page.goto('/documentos/aprobacion', { waitUntil: 'domcontentloaded' });
    await expect(this.titulo).toBeVisible();
  }
}


