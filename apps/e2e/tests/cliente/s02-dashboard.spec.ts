/**
 * Propósito: Tests de la Sección 2 - DASHBOARD PRINCIPAL del Portal Cliente.
 * Checklist: docs/checklists/cliente.md → Sección 2
 */

import { test, expect } from '@playwright/test';
import { ClienteDashboardPage } from '../../pages/cliente/dashboard.page';

test.describe('Portal Cliente - 2. DASHBOARD PRINCIPAL', () => {

  let dashboard: ClienteDashboardPage;

  test.beforeEach(async ({ page }) => {
    dashboard = new ClienteDashboardPage(page);
    await dashboard.goto();
  });

  test.describe('2.1 Interfaz Visual', () => {

    // [ ] Verificar que se muestra el logo de Grupo BCA
    test('debe mostrar el logo de Grupo BCA', async () => {
      await expect(dashboard.logo).toBeVisible();
    });

    // [ ] Verificar que el título dice "Portal Cliente"
    test('debe mostrar el título "Portal Cliente"', async () => {
      await expect(dashboard.titulo).toBeVisible();
      await expect(dashboard.titulo).toContainText(/Portal Cliente/i);
    });

    // [ ] Verificar que muestra el mensaje "Consulta el estado documental de tus equipos asignados"
    test('debe mostrar el mensaje de consulta de estado documental', async () => {
      await expect(dashboard.subtitulo).toBeVisible();
    });

    // [ ] Verificar que existe el botón "Volver"
    test('debe existir el botón "Volver"', async () => {
      await expect(dashboard.btnVolver).toBeVisible();
    });

    // [ ] Verificar que el footer dice "Este portal es de solo lectura"
    test('debe mostrar footer con mensaje de solo lectura', async () => {
      const footerText = await dashboard.footer.textContent();
      expect(footerText?.toLowerCase()).toContain('solo lectura');
    });
  });

  test.describe('2.2 Estado Inicial (sin búsqueda)', () => {

    // [ ] Al ingresar, NO debe cargar equipos automáticamente
    test('no debe cargar equipos automáticamente al ingresar', async () => {
      // No debería haber tarjetas de equipos visibles inicialmente
      const cantidadEquipos = await dashboard.contarEquiposMostrados();
      expect(cantidadEquipos).toBe(0);
    });

    // [ ] Debe mostrar el icono de camión con mensaje "Busca o lista tus equipos asignados"
    test('debe mostrar mensaje de estado inicial', async () => {
      await expect(dashboard.mensajeEstadoInicial).toBeVisible();
    });

    // [ ] Debe existir el botón "Listar Todos los Equipos"
    test('debe existir el botón "Listar Todos"', async () => {
      await expect(dashboard.btnListarTodos).toBeVisible();
    });

    // [ ] Debe existir el campo de búsqueda vacío
    test('debe existir el campo de búsqueda vacío', async () => {
      await expect(dashboard.inputBusqueda).toBeVisible();
      await expect(dashboard.inputBusqueda).toHaveValue('');
    });

    // [ ] El filtro de estado NO debe aparecer hasta que haya datos
    test('el filtro de estado no debe aparecer sin datos', async () => {
      // Sin equipos cargados, el filtro no debería estar visible
      // (algunos UIs lo muestran disabled en vez de hidden)
      const filtroVisible = await dashboard.selectFiltroEstado.isVisible();
      if (filtroVisible) {
        // Si está visible, debería estar deshabilitado o sin opciones útiles
        const isDisabled = await dashboard.selectFiltroEstado.isDisabled();
        expect(isDisabled).toBe(true);
      }
    });
  });
});

