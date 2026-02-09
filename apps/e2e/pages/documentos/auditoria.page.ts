/**
 * Propósito: Page Object de la página de Auditoría (/documentos/auditoria).
 * Basado en: monorepo-bca/apps/frontend/src/features/documentos/pages/AuditLogsPage.tsx
 */

import { expect, type Locator, type Page } from '@playwright/test';

export class AuditoriaPage {
  readonly page: Page;

  readonly btnVolver: Locator;
  readonly titulo: Locator;

  // Filtros
  readonly inputDesde: Locator;
  readonly inputHasta: Locator;
  readonly inputEmail: Locator;
  readonly inputRol: Locator;
  readonly selectMetodo: Locator;
  readonly inputStatus: Locator;
  readonly inputAccion: Locator;
  readonly inputEntidad: Locator;
  readonly inputEntidadId: Locator;
  readonly inputRutaContiene: Locator;

  // Controles
  readonly btnAnterior: Locator;
  readonly btnSiguiente: Locator;
  readonly txtPagina: Locator;
  readonly selectLimite: Locator;
  readonly btnDescargarCsv: Locator;
  readonly btnDescargarExcel: Locator;

  // Columnas
  readonly toggleFecha: Locator;
  readonly toggleAccion: Locator;
  readonly toggleMetodo: Locator;
  readonly toggleStatus: Locator;
  readonly toggleUsuario: Locator;
  readonly toggleRol: Locator;
  readonly toggleEntidad: Locator;
  readonly toggleRuta: Locator;

  // Tabla
  readonly tabla: Locator;
  readonly txtCargando: Locator;
  readonly txtSinResultados: Locator;

  constructor(page: Page) {
    this.page = page;

    this.btnVolver = page.getByRole('button', { name: /Volver/i });
    this.titulo = page.getByRole('heading', { name: 'Auditoría' });

    this.inputDesde = page.getByLabel('Desde');
    this.inputHasta = page.getByLabel('Hasta');
    this.inputEmail = page.getByLabel('Email');
    this.inputRol = page.getByLabel('Rol');
    this.selectMetodo = page.getByLabel('Método');
    this.inputStatus = page.getByLabel('Status');
    this.inputAccion = page.getByLabel('Acción');
    this.inputEntidad = page.getByLabel('Entidad');
    this.inputEntidadId = page.getByLabel('Entidad ID');
    this.inputRutaContiene = page.getByLabel('Ruta contiene');

    this.btnAnterior = page.getByRole('button', { name: 'Anterior' });
    this.btnSiguiente = page.getByRole('button', { name: 'Siguiente' });
    this.txtPagina = page.getByText(/Página \d+ \/ \d+/);
    this.selectLimite = page.getByRole('combobox').filter({ hasText: '' }).first();
    this.btnDescargarCsv = page.getByRole('button', { name: /Descargar CSV/i });
    this.btnDescargarExcel = page.getByRole('button', { name: /Descargar Excel/i });

    this.toggleFecha = page.getByText('Columnas:').locator('..').getByLabel('Fecha');
    this.toggleAccion = page.getByLabel('Acción');
    this.toggleMetodo = page.getByLabel('Método');
    this.toggleStatus = page.getByLabel('Status');
    this.toggleUsuario = page.getByLabel('Usuario');
    this.toggleRol = page.getByLabel('Rol');
    this.toggleEntidad = page.getByLabel('Entidad');
    this.toggleRuta = page.getByLabel('Ruta');

    this.tabla = page.locator('table');
    this.txtCargando = page.getByText('Cargando...');
    this.txtSinResultados = page.getByText('Sin resultados');
  }

  async goto() {
    await this.page.goto('/documentos/auditoria', { waitUntil: 'domcontentloaded' });
    await expect(this.titulo).toBeVisible();
  }
}


