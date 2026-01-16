/**
 * Propósito: Page Object de la página compartida "Consulta" (/documentos/consulta),
 * usada por Chofer/Transportista/Dador/Admin para buscar equipos y operar sobre ellos.
 * Basado en: monorepo-bca/apps/frontend/src/features/documentos/pages/ConsultaPage.tsx
 */

import { expect, type Locator, type Page } from '@playwright/test';

export class ConsultaPage {
  readonly page: Page;

  // Header
  readonly btnVolver: Locator;
  readonly titulo: Locator;

  // Filtro tipo (puede existir aunque el rol no lo use)
  readonly filtroTodos: Locator;
  readonly filtroPorDador: Locator;
  readonly filtroPorCliente: Locator;
  readonly filtroPorEmpresa: Locator;

  // Estado activo/inactivo
  readonly filtroSoloActivos: Locator;
  readonly filtroSoloInactivos: Locator;
  readonly filtroTodosEstados: Locator;

  // Inputs adicionales
  readonly inputDniChofer: Locator;
  readonly inputPatenteCamion: Locator;
  readonly inputPatenteAcoplado: Locator;

  // Acciones
  readonly btnBuscar: Locator;
  readonly btnLimpiar: Locator;
  readonly btnBusquedaMasiva: Locator;
  readonly btnDescargaMasivaVigentes: Locator;

  // Modal búsqueda masiva
  readonly modalBusquedaMasiva: Locator;
  readonly textareaBusquedaMasiva: Locator;
  readonly btnCancelarBusquedaMasiva: Locator;
  readonly btnBuscarBusquedaMasiva: Locator;

  // Estados
  readonly spinnerBuscando: Locator;
  readonly txtBuscandoEquipos: Locator;
  readonly txtCalculandoCompliance: Locator;
  readonly txtSinResultados: Locator;

  // Dashboard de estado documental
  readonly contadorTotal: Locator;
  readonly contadorFaltantes: Locator;
  readonly contadorVencidos: Locator;
  readonly contadorPorVencer: Locator;
  readonly badgeFiltroActivo: Locator;
  readonly linkQuitarFiltro: Locator;

  // Paginación
  readonly txtMostrando: Locator;
  readonly txtPagina: Locator;
  readonly btnPaginaAnteriorIcon: Locator;
  readonly btnPaginaSiguienteIcon: Locator;

  // Resultados
  readonly itemsEquipo: Locator;

  constructor(page: Page) {
    this.page = page;

    this.btnVolver = page.getByRole('button', { name: /Volver/i });
    this.titulo = page.getByRole('heading', { name: 'Consulta' });

    // Tipo de filtro (en el código existe siempre)
    this.filtroTodos = page.getByRole('button', { name: 'Todos los equipos' });
    this.filtroPorDador = page.getByRole('button', { name: 'Por Dador' });
    this.filtroPorCliente = page.getByRole('button', { name: 'Por Cliente' });
    this.filtroPorEmpresa = page.getByRole('button', { name: 'Por Empresa Transp.' });

    this.filtroSoloActivos = page.getByRole('button', { name: 'Solo Activos' });
    this.filtroSoloInactivos = page.getByRole('button', { name: 'Solo Inactivos' });
    // Evitar strict-mode: existe "Todos los equipos" (tipo de filtro) y "Todos" (estado).
    this.filtroTodosEstados = page.getByRole('button', { name: 'Todos', exact: true });

    this.inputDniChofer = page.getByPlaceholder('DNI Chofer');
    this.inputPatenteCamion = page.getByPlaceholder('Patente Camión');
    this.inputPatenteAcoplado = page.getByPlaceholder('Patente Acoplado');

    this.btnBuscar = page.getByRole('button', { name: 'Buscar' }).first();
    this.btnLimpiar = page.getByRole('button', { name: 'Limpiar' });
    this.btnBusquedaMasiva = page.getByRole('button', { name: /Buscar por DNIs o Patentes/i });
    this.btnDescargaMasivaVigentes = page.getByRole('button', { name: /Bajar documentación vigente \(ZIP\)|Preparando archivos/i });

    this.modalBusquedaMasiva = page.locator('.fixed.inset-0').filter({ hasText: 'Buscar Equipos por DNIs o Patentes' });
    this.textareaBusquedaMasiva = this.modalBusquedaMasiva.locator('textarea');
    this.btnCancelarBusquedaMasiva = this.modalBusquedaMasiva.getByRole('button', { name: 'Cancelar' });
    this.btnBuscarBusquedaMasiva = this.modalBusquedaMasiva.getByRole('button', { name: 'Buscar' }).last();

    this.spinnerBuscando = page.locator('.animate-spin');
    this.txtBuscandoEquipos = page.getByText('Buscando equipos...');
    this.txtCalculandoCompliance = page.getByText('Calculando estado de compliance');
    this.txtSinResultados = page.getByText('Sin resultados para los criterios de filtro seleccionados.');

    // Contadores (botones)
    this.contadorTotal = page.getByRole('button').filter({ hasText: 'Total' }).first();
    this.contadorFaltantes = page.getByRole('button').filter({ hasText: 'Faltantes' }).first();
    this.contadorVencidos = page.getByRole('button').filter({ hasText: 'Vencidos' }).first();
    this.contadorPorVencer = page.getByRole('button').filter({ hasText: 'Por Vencer' }).first();
    this.badgeFiltroActivo = page.locator('span').filter({ hasText: /Doc\. (Faltante|Vencida|Por Vencer)/i });
    this.linkQuitarFiltro = page.getByRole('button', { name: /Quitar filtro/i }).or(page.getByText('Quitar filtro'));

    // Paginación
    this.txtMostrando = page.getByText(/Mostrando \d+ - \d+ de \d+ equipos/i);
    this.txtPagina = page.getByText(/Página \d+ de \d+/i);
    // Botones solo con ícono: los buscamos dentro del contenedor de paginación
    const contPaginacion = page.locator('.flex').filter({ hasText: /Mostrando \d+ - \d+ de \d+ equipos/i }).first();
    this.btnPaginaAnteriorIcon = contPaginacion.locator('button').nth(0);
    this.btnPaginaSiguienteIcon = contPaginacion.locator('button').nth(1);

    // Resultados: cada ítem es una tarjeta con estructura específica
    // Usamos un selector más preciso para evitar strict mode violation
    this.itemsEquipo = page.locator('[class*="rounded-lg"][class*="shadow"]')
      .filter({ hasText: /Equipo #\d+/ })
      .filter({ has: page.getByRole('button', { name: /Editar/i }) });
  }

  async goto() {
    await this.page.goto('/documentos/consulta', { waitUntil: 'domcontentloaded' });
    await expect(this.titulo).toBeVisible();
  }

  async buscar(params: { dni?: string; camion?: string; acoplado?: string }) {
    if (params.dni != null) await this.inputDniChofer.fill(params.dni);
    if (params.camion != null) await this.inputPatenteCamion.fill(params.camion);
    if (params.acoplado != null) await this.inputPatenteAcoplado.fill(params.acoplado);
    await this.btnBuscar.click();
    await this.esperarFinBusqueda();
  }

  async limpiar() {
    await this.btnLimpiar.click();
  }

  async abrirBusquedaMasiva() {
    await this.btnBusquedaMasiva.click();
    await expect(this.modalBusquedaMasiva).toBeVisible();
  }

  async buscarMasivo(texto: string) {
    await this.abrirBusquedaMasiva();
    await this.textareaBusquedaMasiva.fill(texto);
    await this.btnBuscarBusquedaMasiva.click();
    await this.esperarFinBusqueda();
  }

  async cancelarBusquedaMasiva() {
    await this.btnCancelarBusquedaMasiva.click();
    await expect(this.modalBusquedaMasiva).not.toBeVisible();
  }

  async esperarFinBusqueda() {
    // Puede ser muy rápido; intentamos observar spinner/texto si aparecen.
    await this.txtBuscandoEquipos.waitFor({ state: 'visible', timeout: 2_000 }).catch(() => { });
    await this.txtBuscandoEquipos.waitFor({ state: 'hidden', timeout: 30_000 }).catch(() => { });
    await this.spinnerBuscando.first().waitFor({ state: 'hidden', timeout: 30_000 }).catch(() => { });
  }
}


