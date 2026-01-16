/**
 * Propósito: Page Object del Detalle de Equipo en Portal Cliente.
 * Incluye: información del equipo, documentos agrupados, preview, descargas.
 * Basado en: monorepo-bca/apps/frontend/src/features/cliente/pages/ClienteEquipoDetalle.tsx
 */

import { Page, Locator, expect } from '@playwright/test';

export class ClienteDetallePage {
  readonly page: Page;

  // Navegación
  readonly btnVolver: Locator;
  readonly titulo: Locator;
  readonly subtitulo: Locator;

  // Información del equipo (Card líneas 249-279)
  readonly seccionInfoEquipo: Locator;
  readonly infoCamion: Locator;
  readonly infoAcoplado: Locator;
  readonly infoChofer: Locator;
  readonly infoTransportista: Locator;

  // Contadores de documentos (líneas 282-299)
  readonly seccionContadores: Locator;
  readonly contadorTotal: Locator;
  readonly contadorVigentes: Locator;
  readonly contadorProxVencer: Locator;
  readonly contadorVencidos: Locator;

  // Banner de vencidos (líneas 301-309)
  readonly bannerVencidos: Locator;

  // Grupos de documentos por entidad (líneas 318-399)
  readonly grupoChofer: Locator;
  readonly grupoCamion: Locator;
  readonly grupoAcoplado: Locator;
  readonly grupoTransportista: Locator;

  // Lista de documentos
  readonly documentos: Locator;
  readonly btnVerDoc: Locator;
  readonly btnDescargarDoc: Locator;
  readonly btnDescargarDocDisabled: Locator;

  // Descarga ZIP del equipo (líneas 241-246)
  readonly btnDescargarTodoZip: Locator;

  // Modal preview (líneas 407-429)
  readonly modalPreview: Locator;
  readonly modalTitulo: Locator;
  readonly btnCerrarModal: Locator;

  // Estados
  readonly spinner: Locator;
  readonly mensajeCargando: Locator;
  readonly mensajeError: Locator;
  readonly mensajeNoDocumentos: Locator;

  // Footer con fecha de asignación
  readonly footerAsignadoDesde: Locator;

  constructor(page: Page) {
    this.page = page;

    // Navegación (líneas 227-239)
    this.btnVolver = page.getByRole('button', { name: /Volver/i });
    this.titulo = page.locator('h1').filter({ hasText: /Equipo/ });
    this.subtitulo = page.getByText('Detalle de documentación');

    // Información del equipo (Card con h2 "Información del Equipo")
    this.seccionInfoEquipo = page.getByRole('heading', { name: 'Información del Equipo', level: 2 }).locator('..');
    this.infoCamion = this.seccionInfoEquipo.getByText('Camión:').locator('..');
    this.infoAcoplado = this.seccionInfoEquipo.getByText('Acoplado:').locator('..');
    this.infoChofer = this.seccionInfoEquipo.getByText('Chofer:').locator('..');
    this.infoTransportista = this.seccionInfoEquipo.getByText('Empresa Transportista:').locator('..');

    // Contadores de documentos: scoping para evitar colisiones con textos del listado
    this.seccionContadores = page
      .locator('main')
      .locator('div')
      .filter({ has: page.getByText('Total', { exact: true }) })
      .filter({ has: page.getByText('Vigentes', { exact: true }) })
      .filter({ has: page.getByText(/Próx\./i) })
      .filter({ has: page.getByText('Vencidos', { exact: true }) })
      .first();
    this.contadorTotal = this.seccionContadores.getByText('Total', { exact: true }).locator('..');
    this.contadorVigentes = this.seccionContadores.getByText('Vigentes', { exact: true }).locator('..');
    this.contadorProxVencer = this.seccionContadores.getByText(/Próx\./i).locator('..');
    this.contadorVencidos = this.seccionContadores.getByText('Vencidos', { exact: true }).locator('..');

    // Banner de vencidos (div con bg-red-50 y NoSymbolIcon)
    this.bannerVencidos = page.getByText(/Los documentos vencidos se muestran para referencia/i).locator('..');

    // Grupos de documentos (Cards con iconos y labels)
    const grupoBase = page.locator('main').locator('div').filter({ has: page.getByRole('button', { name: /Ver documento/i }) });
    this.grupoChofer = grupoBase.filter({ has: page.getByText('Chofer', { exact: true }) }).first();
    this.grupoCamion = grupoBase.filter({ has: page.getByText('Camión', { exact: true }) }).first();
    this.grupoAcoplado = grupoBase.filter({ has: page.getByText('Acoplado', { exact: true }) }).first();
    this.grupoTransportista = grupoBase.filter({ has: page.getByText('Empresa Transportista', { exact: true }) }).first();

    // Lista de documentos (filas dentro de los grupos)
    this.documentos = page.locator('.rounded-lg').filter({ has: page.locator('.font-medium') });
    // Botón ver (EyeIcon)
    this.btnVerDoc = page.getByRole('button', { name: '' }).filter({ has: page.locator('svg') }).locator('[title="Ver documento"]').or(
      page.locator('button').filter({ has: page.locator('svg.h-4.w-4') }).filter({ hasNotText: /./  })
    );
    // Botón descargar habilitado
    this.btnDescargarDoc = page.locator('button:not([disabled])').filter({ has: page.locator('svg') }).filter({ hasText: '' });
    // Botón descargar deshabilitado (NoSymbolIcon)
    this.btnDescargarDocDisabled = page.locator('button[disabled]').filter({ has: page.locator('svg') });

    // Descarga ZIP del equipo
    this.btnDescargarTodoZip = page.getByRole('button', { name: /Descargar todo \(ZIP\)/i });

    // Modal preview (fixed inset-0 z-50)
    this.modalPreview = page.locator('.fixed.inset-0.z-50');
    this.modalTitulo = page.locator('.fixed.inset-0.z-50 h3');
    this.btnCerrarModal = page.locator('.fixed.inset-0.z-50 button').filter({ has: page.locator('svg') }).first();

    // Estados de carga
    this.spinner = page.locator('.animate-spin');
    this.mensajeCargando = page.getByText('Cargando detalle...');
    this.mensajeError = page.getByText('No se pudo cargar el detalle del equipo.');
    this.mensajeNoDocumentos = page.getByText('No hay documentos aprobados disponibles.');

    // Footer
    this.footerAsignadoDesde = page.getByText(/Asignado desde:/i);
  }

  /** Navega al detalle de un equipo por ID. */
  async goto(equipoId: string) {
    await this.page.goto(`/cliente/equipos/${equipoId}`);
    await this.page.waitForLoadState('domcontentloaded');
    await this.esperarCarga();
  }

  /** Espera a que termine de cargar. */
  async esperarCarga() {
    await this.page.waitForTimeout(300);
    await this.spinner.waitFor({ state: 'hidden', timeout: 30_000 }).catch(() => {});
    await this.mensajeCargando.waitFor({ state: 'hidden', timeout: 5_000 }).catch(() => {});
  }

  /** Vuelve al listado. */
  async volver() {
    await this.btnVolver.click();
    await expect(this.page).toHaveURL(/\/cliente(\/|$)/);
  }

  /** Obtiene el título del equipo (patente). */
  async getTitulo(): Promise<string> {
    return ((await this.titulo.textContent().catch(() => null)) ?? '').trim();
  }

  /** Verifica si hay banner de documentos vencidos. */
  async tieneBannerVencidos(): Promise<boolean> {
    return this.bannerVencidos.isVisible();
  }

  /** Obtiene cantidad de documentos mostrados. */
  async contarDocumentos(): Promise<number> {
    return this.documentos.count();
  }

  /** Abre preview del documento en posición index (0-based). */
  async verDocumento(index: number) {
    await this.btnVerDoc.nth(index).click();
    await expect(this.modalPreview).toBeVisible();
  }

  /** Cierra el modal de preview. */
  async cerrarPreview() {
    await this.btnCerrarModal.click();
    await expect(this.modalPreview).not.toBeVisible();
  }

  /** Cierra modal clickeando fuera de él. */
  async cerrarPreviewClickeandoFuera() {
    // Click en el backdrop (fuera del contenido del modal)
    await this.page.locator('[class*="backdrop"], [class*="overlay"]').click({ position: { x: 10, y: 10 } });
    await expect(this.modalPreview).not.toBeVisible();
  }

  /** Descarga un documento individual. Retorna la descarga o null si no se disparó. */
  async descargarDocumento(index: number) {
    const downloadPromise = this.page
      .waitForEvent('download', { timeout: 10_000 })
      .catch(() => null);
    await this.btnDescargarDoc.nth(index).click();
    return downloadPromise;
  }

  /** Descarga el ZIP completo del equipo. */
  async descargarTodoZip() {
    const downloadPromise = this.page.waitForEvent('download');
    await this.btnDescargarTodoZip.click();
    return downloadPromise;
  }

  /** Verifica que un documento vencido tiene botón de descarga deshabilitado. */
  async verificarDescargaDeshabilitada(index: number): Promise<boolean> {
    const fila = this.documentos.nth(index);
    const btnDisabled = fila.locator('button[disabled], [class*="disabled"], [class*="prohibido"]');
    return btnDisabled.isVisible();
  }

  /** Obtiene el valor de un contador de documentos. */
  async getContador(tipo: 'total' | 'vigentes' | 'proxVencer' | 'vencidos'): Promise<number> {
    const contadores: Record<string, Locator> = {
      total: this.contadorTotal,
      vigentes: this.contadorVigentes,
      proxVencer: this.contadorProxVencer,
      vencidos: this.contadorVencidos,
    };
    const texto = await contadores[tipo].textContent() ?? '0';
    const match = texto.match(/\d+/);
    return match ? parseInt(match[0], 10) : 0;
  }
}

