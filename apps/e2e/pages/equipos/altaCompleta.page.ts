/**
 * Propósito: Page Object de la página Alta Completa de Equipo (/documentos/equipos/alta-completa).
 * Basado en: monorepo-bca/apps/frontend/src/features/equipos/pages/AltaEquipoCompletaPage.tsx
 */

import { expect, type Locator, type Page } from '@playwright/test';

export class AltaCompletaEquipoPage {
  readonly page: Page;

  readonly titulo: Locator;
  readonly btnVolver: Locator;

  // Admin Interno: selector de dador (solo visible para rol ADMIN_INTERNO)
  readonly seccionDadorAdmin: Locator;
  readonly selectDadorDeCarga: Locator;
  readonly textoDebeSeleccionarDador: Locator;

  readonly progresoTitulo: Locator;
  readonly progresoTexto: Locator;

  readonly inputRazonSocial: Locator;
  readonly inputCuit: Locator;

  readonly inputDni: Locator;
  readonly inputNombre: Locator;
  readonly inputApellido: Locator;
  readonly inputTelefonos: Locator;

  readonly inputPatenteTractor: Locator;
  readonly inputMarcaTractor: Locator;
  readonly inputModeloTractor: Locator;

  readonly inputPatenteSemi: Locator;
  readonly inputTipoSemi: Locator;
  readonly textoSemiInfo: Locator;

  readonly avisoCamposObligatorios: Locator;

  readonly seccionDocsEmpresa: Locator;
  readonly seccionDocsChofer: Locator;
  readonly seccionDocsTractor: Locator;
  readonly seccionDocsSemi: Locator;

  readonly btnCrearEquipo: Locator;
  readonly avisoDocumentosPendientes: Locator;

  readonly loadingTemplates: Locator;

  constructor(page: Page) {
    this.page = page;

    this.titulo = page.getByRole('heading', { name: 'Alta Completa de Equipo' });
    this.btnVolver = page.getByRole('button', { name: /Volver/i });

    this.seccionDadorAdmin = page.getByText('Dador de Carga *');
    this.selectDadorDeCarga = page.getByLabel(/Seleccionar Dador de Carga/i);
    this.textoDebeSeleccionarDador = page.getByText(/Debe seleccionar un dador de carga/i);

    this.progresoTitulo = page.getByText('Progreso de selección');
    this.progresoTexto = page.locator('span').filter({ hasText: /documentos \(\d+%\)/i }).first();

    this.inputRazonSocial = page.getByPlaceholder('Ej: Transportes del Norte S.A.');
    this.inputCuit = page.getByPlaceholder('30123456789');

    this.inputDni = page.getByPlaceholder('12345678');
    this.inputNombre = page.getByPlaceholder('Juan');
    this.inputApellido = page.getByPlaceholder('Pérez');
    this.inputTelefonos = page.getByPlaceholder('+5491112345678, +5491187654321');

    this.inputPatenteTractor = page.getByPlaceholder('ABC123');
    this.inputMarcaTractor = page.getByPlaceholder('Mercedes-Benz');
    this.inputModeloTractor = page.getByPlaceholder('Actros 2046');

    this.inputPatenteSemi = page.getByPlaceholder('DEF456');
    this.inputTipoSemi = page.getByPlaceholder('Ej: Caja seca, Cisterna, etc.');
    this.textoSemiInfo = page.getByText(/aparecerá la sección de documentos del semi/i);

    this.avisoCamposObligatorios = page.getByText(/Completá todos los campos obligatorios/i);

    this.seccionDocsEmpresa = page.getByText('📄 DOCUMENTOS EMPRESA TRANSPORTISTA');
    this.seccionDocsChofer = page.getByText('👤 DOCUMENTOS CHOFER');
    this.seccionDocsTractor = page.getByText('🚛 DOCUMENTOS TRACTOR');
    this.seccionDocsSemi = page.getByText('🚚 DOCUMENTOS SEMI / ACOPLADO');

    this.btnCrearEquipo = page.getByRole('button', { name: /Crear Equipo/i });
    this.avisoDocumentosPendientes = page.getByText(/Seleccioná \d+ documentos más para habilitar la creación del equipo/i);

    this.loadingTemplates = page.locator('text=/Cargando templates/i').first();
  }

  async goto() {
    await this.page.goto('/documentos/equipos/alta-completa', { waitUntil: 'domcontentloaded' });
    // La pantalla puede mostrar "Cargando templates..." antes de renderizar.
    await this.loadingTemplates.waitFor({ state: 'hidden', timeout: 20_000 }).catch(() => {});
    await expect(this.titulo).toBeVisible();
  }
}


