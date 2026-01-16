/**
 * Propósito: Page Object del Dashboard del Portal Cliente.
 * Incluye: búsqueda, filtros, contadores, lista de equipos, paginación, descarga ZIP.
 * Basado en: monorepo-bca/apps/frontend/src/features/cliente/pages/ClienteDashboard.tsx
 */

import { Page, Locator, expect } from '@playwright/test';

export class ClienteDashboardPage {
  readonly page: Page;

  // Header y navegación
  readonly logo: Locator;
  readonly titulo: Locator;
  readonly subtitulo: Locator;
  readonly btnVolver: Locator;
  readonly footer: Locator;

  // Búsqueda
  readonly inputBusqueda: Locator;
  readonly btnBuscar: Locator;
  readonly btnBusquedaMasiva: Locator;
  readonly btnListarTodos: Locator;
  readonly btnListarTodosTop: Locator;
  readonly btnLimpiar: Locator;

  // Panel búsqueda masiva
  readonly panelBusquedaMasiva: Locator;
  readonly textareaBusquedaMasiva: Locator;
  readonly btnBuscarLista: Locator;
  readonly btnCerrarBusquedaMasiva: Locator;

  // Contadores (Cards con texto "Total", "Vigentes", etc.)
  readonly contadorTotal: Locator;
  readonly contadorVigentes: Locator;
  readonly contadorProxVencer: Locator;
  readonly contadorVencidos: Locator;
  readonly contadorIncompletos: Locator;

  // Filtro por estado (select nativo)
  readonly selectFiltroEstado: Locator;

  // Lista de equipos
  readonly listaEquipos: Locator;
  readonly tarjetaEquipo: Locator;
  readonly mensajeNoEquipos: Locator;
  readonly mensajeEstadoInicial: Locator;

  // Paginación
  readonly paginacion: Locator;
  readonly btnPaginaAnterior: Locator;
  readonly btnPaginaSiguiente: Locator;
  readonly textoPaginacion: Locator;
  readonly textoMostrando: Locator;

  // Descarga ZIP
  readonly btnDescargarZip: Locator;

  // Estados de carga
  readonly spinner: Locator;
  readonly mensajeCargando: Locator;
  readonly mensajeError: Locator;
  readonly btnReintentar: Locator;

  constructor(page: Page) {
    this.page = page;

    // Header y navegación (según ClienteDashboard.tsx líneas 196-216)
    this.logo = page.locator('header img[alt="Grupo BCA"]').first();
    this.titulo = page.locator('h1').filter({ hasText: 'Portal Cliente' });
    this.subtitulo = page.getByText('Consulta el estado documental de tus equipos asignados');
    this.btnVolver = page.getByRole('button', { name: /Volver/i });
    this.footer = page.getByText(/Este portal es de solo lectura/i);

    // Búsqueda (líneas 244-302)
    this.inputBusqueda = page.getByPlaceholder('Buscar por patente, DNI, nombre...');
    this.btnBuscar = page.getByRole('button', { name: 'Buscar' }).first();
    this.btnBusquedaMasiva = page.getByRole('button', { name: /Búsqueda Masiva/i });
    // Evitar strict-mode: existen dos botones similares. Para listar, usamos el CTA principal.
    this.btnListarTodos = page.getByRole('button', { name: 'Listar Todos los Equipos', exact: true });
    this.btnListarTodosTop = page.getByRole('button', { name: 'Listar Todos', exact: true });
    // Algunos estados pueden renderizar más de un "Limpiar"; elegimos el primero visible.
    this.btnLimpiar = page.getByRole('button', { name: 'Limpiar', exact: true }).or(
      page.getByRole('button', { name: /Limpiar/i }).first()
    );

    // Panel búsqueda masiva (líneas 321-356)
    this.panelBusquedaMasiva = page.locator('.bg-blue-50, .bg-blue-900\\/20').filter({ hasText: 'Búsqueda Masiva por Lista' }).first();
    this.textareaBusquedaMasiva = this.panelBusquedaMasiva.locator('textarea');
    this.btnBuscarLista = page.getByRole('button', { name: 'Buscar Lista' });
    this.btnCerrarBusquedaMasiva = this.panelBusquedaMasiva.getByRole('button').filter({ has: page.locator('svg') }).first();

    // Contadores (líneas 220-241) - Cards con texto específico
    this.contadorTotal = page.locator('.text-center').filter({ hasText: 'Total' });
    this.contadorVigentes = page.locator('.bg-green-50, .bg-green-900\\/20').filter({ hasText: 'Vigentes' });
    this.contadorProxVencer = page.locator('.bg-yellow-50, .bg-yellow-900\\/20').filter({ hasText: /Próx.*vencer/i });
    this.contadorVencidos = page.locator('.bg-red-50, .bg-red-900\\/20').filter({ hasText: 'Vencidos' });
    this.contadorIncompletos = page.locator('.bg-gray-50, .bg-gray-800').filter({ hasText: 'Incompletos' });

    // Filtro por estado (líneas 305-317 - select nativo)
    this.selectFiltroEstado = page.locator('select');

    // Lista de equipos (líneas 428-481)
    this.listaEquipos = page.locator('.space-y-4');
    this.tarjetaEquipo = page.locator('[class*="hover:shadow-md"][class*="cursor-pointer"]');
    this.mensajeNoEquipos = page.getByText(/No hay equipos|No tienes equipos asignados|No se encontraron equipos/i).first();
    this.mensajeEstadoInicial = page.getByText('Busca o lista tus equipos asignados');

    // Paginación (líneas 483-510)
    this.paginacion = page.locator('.flex.items-center.justify-center.gap-4');
    this.btnPaginaAnterior = page.getByRole('button', { name: /Anterior/i });
    this.btnPaginaSiguiente = page.getByRole('button', { name: /Siguiente/i });
    this.textoPaginacion = page.getByText(/Página \d+ de \d+/);
    this.textoMostrando = page.getByText(/Mostrando \d+ - \d+ de \d+ equipos/);

    // Descarga ZIP (líneas 417-425)
    this.btnDescargarZip = page.getByRole('button', { name: /Descargar ZIP|Iniciando descarga/i });

    // Estados de carga (líneas 377-393)
    this.spinner = page.locator('.animate-spin');
    this.mensajeCargando = page.getByText('Cargando equipos...');
    this.mensajeError = page.getByText('Error al cargar datos');
    this.btnReintentar = page.getByRole('button', { name: 'Reintentar' });
  }

  /** Navega al dashboard del cliente. */
  async goto() {
    await this.page.goto('/cliente');
    await this.page.waitForLoadState('domcontentloaded');
  }

  /** Ejecuta una búsqueda simple por texto. */
  async buscar(texto: string) {
    await this.inputBusqueda.fill(texto);
    await this.btnBuscar.click();
    await this.esperarCarga();
  }

  /** Ejecuta búsqueda presionando ENTER. */
  async buscarConEnter(texto: string) {
    await this.inputBusqueda.fill(texto);
    await this.inputBusqueda.press('Enter');
    await this.esperarCarga();
  }

  /** Abre el panel de búsqueda masiva. */
  async abrirBusquedaMasiva() {
    await this.btnBusquedaMasiva.click();
    // Validamos un elemento único del panel para evitar strict-mode
    await expect(this.textareaBusquedaMasiva).toBeVisible();
  }

  /** Ejecuta una búsqueda masiva con lista de valores. */
  async busquedaMasiva(valores: string[]) {
    await this.abrirBusquedaMasiva();
    await this.textareaBusquedaMasiva.fill(valores.join('\n'));
    await this.btnBuscarLista.click();
    await this.esperarCarga();
  }

  /** Cierra el panel de búsqueda masiva. */
  async cerrarBusquedaMasiva() {
    await this.btnCerrarBusquedaMasiva.click();
    await expect(this.panelBusquedaMasiva).not.toBeVisible();
  }

  /** Lista todos los equipos. */
  async listarTodos() {
    // En algunos estados solo existe el botón superior "Listar Todos".
    if (await this.btnListarTodos.isVisible().catch(() => false)) {
      await this.btnListarTodos.click();
    } else {
      await this.btnListarTodosTop.click();
    }
    await this.esperarCarga();
  }

  /** Limpia la búsqueda y resultados. */
  async limpiar() {
    // Si existe el botón "Limpiar", lo usamos. Si no, y está abierto el panel masivo, lo cerramos.
    const puedeLimpiar = await this.btnLimpiar.isVisible().catch(() => false);
    if (puedeLimpiar) {
      await this.btnLimpiar.scrollIntoViewIfNeeded().catch(() => {});
      await this.btnLimpiar.click({ timeout: 15_000 });
      return;
    }
    const panelAbierto = await this.panelBusquedaMasiva.isVisible().catch(() => false);
    if (panelAbierto) {
      await this.btnCerrarBusquedaMasiva.click();
      await expect(this.panelBusquedaMasiva).not.toBeVisible();
    }
  }

  /** Aplica un filtro por estado. */
  async filtrarPorEstado(estado: 'todos' | 'vigentes' | 'proxVencer' | 'vencidos' | 'incompletos') {
    // Usamos selectOption para evitar strict-mode (hay textos similares fuera del <select>)
    const opciones: Record<typeof estado, RegExp> = {
      todos: /Todos/i,
      vigentes: /Vigentes?/i,
      proxVencer: /Próx.*vencer/i,
      vencidos: /Vencidos?/i,
      incompletos: /Incompletos?/i,
    };
    const opt = this.selectFiltroEstado.locator('option').filter({ hasText: opciones[estado] }).first();
    const value = await opt.getAttribute('value');
    if (value) {
      await this.selectFiltroEstado.selectOption(value);
    } else {
      // Fallback por índice si el option no tiene value (poco probable)
      const index = await opt.evaluate((el) => (el as HTMLOptionElement).index);
      await this.selectFiltroEstado.selectOption({ index });
    }
    await this.esperarCarga();
  }

  /** Espera a que termine de cargar (spinner desaparezca). */
  async esperarCarga() {
    // Espera breve para que aparezca el spinner (si hay)
    await this.page.waitForTimeout(300);
    // Espera a que desaparezca
    await this.spinner.waitFor({ state: 'hidden', timeout: 30_000 }).catch(() => {});
    await this.mensajeCargando.waitFor({ state: 'hidden', timeout: 5_000 }).catch(() => {});
  }

  /** Obtiene el número de equipos mostrados. */
  async contarEquiposMostrados(): Promise<number> {
    return this.tarjetaEquipo.count();
  }

  /** Obtiene el valor de un contador por tipo. */
  async getContador(tipo: 'total' | 'vigentes' | 'proxVencer' | 'vencidos' | 'incompletos'): Promise<number> {
    const contadores: Record<string, Locator> = {
      total: this.contadorTotal,
      vigentes: this.contadorVigentes,
      proxVencer: this.contadorProxVencer,
      vencidos: this.contadorVencidos,
      incompletos: this.contadorIncompletos,
    };
    const texto = await contadores[tipo].textContent() ?? '0';
    const match = texto.match(/\d+/);
    return match ? parseInt(match[0], 10) : 0;
  }

  /** Hace clic en una tarjeta de equipo por índice (0-based). */
  async clickEquipo(index: number) {
    await this.tarjetaEquipo.nth(index).click();
  }

  /** Hace clic en el botón "Ver docs" de un equipo por índice. */
  async clickVerDocs(index: number) {
    await this.tarjetaEquipo.nth(index).getByRole('button', { name: /Ver docs/i }).or(this.tarjetaEquipo.nth(index).getByText(/Ver docs/i)).click();
  }

  /** Navega a la página siguiente. */
  async paginaSiguiente() {
    await this.btnPaginaSiguiente.click();
    await this.esperarCarga();
  }

  /** Navega a la página anterior. */
  async paginaAnterior() {
    await this.btnPaginaAnterior.click();
    await this.esperarCarga();
  }

  /** Inicia descarga del ZIP masivo y retorna la promesa de descarga. */
  async descargarZip() {
    const downloadPromise = this.page.waitForEvent('download');
    await this.btnDescargarZip.click();
    return downloadPromise;
  }
}

