/**
 * Propósito: Page Object de la página "Ver Estado" (/documentos/equipos/:id/estado).
 * Basado en: monorepo-bca/apps/frontend/src/features/documentos/pages/EstadoEquipoPage.tsx
 */

import { expect, type Locator, type Page } from '@playwright/test';

export class EstadoEquipoPage {
  readonly page: Page;

  readonly btnVolver: Locator;
  readonly titulo: Locator;

  readonly filtroTexto: Locator;
  readonly selectOnly: Locator;

  readonly btnDescargarZipVigentes: Locator;
  readonly btnDescargarExcel: Locator;

  readonly seccionEntidad: Locator;
  readonly itemDocumento: Locator;
  readonly btnPreviewDocumento: Locator;

  readonly spinner: Locator;
  readonly iframePreview: Locator;

  constructor(page: Page) {
    this.page = page;

    this.btnVolver = page.getByRole('button', { name: /Volver/i });
    // El título exacto cambia; al menos hay un H1/H2 visible arriba
    this.titulo = page.getByRole('heading').first();

    this.filtroTexto = page.locator('input').first();
    this.selectOnly = page.locator('select').first();

    this.btnDescargarZipVigentes = page.getByRole('button', { name: /ZIP|vigentes/i }).first();
    this.btnDescargarExcel = page.getByRole('button', { name: /Excel|resumen/i }).first();

    this.seccionEntidad = page.locator('h3').filter({ hasText: /Chofer|Camión|Acoplado|Empresa/i });
    this.itemDocumento = page.locator('div').filter({ has: page.locator('button[title="Ver documento"]') });
    this.btnPreviewDocumento = page.locator('button[title="Ver documento"]');

    this.spinner = page.locator('.animate-spin');
    this.iframePreview = page.locator('iframe');
  }

  async goto(equipoId: number) {
    await this.page.goto(`/documentos/equipos/${equipoId}/estado`, { waitUntil: 'domcontentloaded' });
    await expect(this.btnVolver).toBeVisible();
  }

  async abrirPreviewPrimerDocumento() {
    const count = await this.btnPreviewDocumento.count();
    if (count === 0) return false;
    await this.btnPreviewDocumento.first().click();
    // El preview se renderiza como iframe cuando termina la carga
    await this.iframePreview.waitFor({ state: 'visible', timeout: 20_000 }).catch(() => {});
    return true;
  }
}


