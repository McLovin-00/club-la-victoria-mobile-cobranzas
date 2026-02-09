/**
 * Propósito: Page Object de la edición de equipo (/documentos/equipos/:id/editar),
 * con foco en el rol CHOFER (solo puede subir documentación, no editar entidades).
 * Basado en: monorepo-bca/apps/frontend/src/features/equipos/pages/EditarEquipoPage.tsx
 */

import { expect, type Locator, type Page } from '@playwright/test';

export class EditarEquipoPage {
  readonly page: Page;

  readonly btnVolver: Locator;
  readonly titulo: Locator;

  // Sección info actual (siempre visible)
  readonly infoActual: Locator;
  readonly infoChofer: Locator;
  readonly infoCamion: Locator;
  readonly infoAcoplado: Locator;
  readonly infoEmpresa: Locator;

  // Secciones restringidas (no deben estar para chofer)
  readonly seccionModificarEntidades: Locator;
  readonly seccionClientesAsociados: Locator;
  readonly botonCrearEntidad: Locator;

  // Documentación requerida
  readonly seccionDocumentacion: Locator;
  readonly filaRequisito: Locator;
  readonly labelSeleccionarArchivo: Locator;
  readonly inputFileHidden: Locator;
  readonly inputFechaVencimiento: Locator;
  readonly btnSubir: Locator;
  readonly mensajeExito: Locator;

  constructor(page: Page) {
    this.page = page;

    this.btnVolver = page.getByRole('button', { name: /Volver/i });
    this.titulo = page.getByRole('heading').first();

    this.infoActual = page.getByText('Información Actual').locator('..');
    this.infoChofer = page.getByText(/Chofer:/i);
    this.infoCamion = page.getByText(/Camión:/i);
    this.infoAcoplado = page.getByText(/Acoplado:/i);
    this.infoEmpresa = page.getByText(/Empresa:/i);

    this.seccionModificarEntidades = page.getByText('Modificar Entidades');
    this.seccionClientesAsociados = page.getByText('Clientes Asociados');
    this.botonCrearEntidad = page.getByTitle(/Crear nuevo/i).or(page.getByRole('button', { name: /Crear/i }));

    this.seccionDocumentacion = page.getByText('Documentación Requerida');

    // Cada requisito muestra templateName y tiene label de seleccionar archivo
    this.filaRequisito = page.locator('div').filter({ hasText: '📎 Seleccionar archivo (PDF o imagen)' }).first();
    this.labelSeleccionarArchivo = page.getByText('📎 Seleccionar archivo (PDF o imagen)').first();
    this.inputFileHidden = page.locator('input[type="file"][accept*=".pdf"]').first();
    this.inputFechaVencimiento = page.locator('input[type="date"]').first();
    this.btnSubir = page.getByRole('button', { name: 'Subir' }).first();

    // Mensaje de éxito (en código: 'Documento subido correctamente. Pendiente de aprobación.')
    this.mensajeExito = page.getByText(/Documento subido correctamente\. Pendiente de aprobación\./i);
  }

  async goto(equipoId: number) {
    await this.page.goto(`/documentos/equipos/${equipoId}/editar`, { waitUntil: 'domcontentloaded' });
    await expect(this.btnVolver).toBeVisible();
    await expect(this.seccionDocumentacion).toBeVisible();
  }
}


