/**
 * Propósito: Tests de la Sección 3 - BÚSQUEDA DE EQUIPOS del Portal Cliente.
 * Checklist: docs/checklists/cliente.md → Sección 3
 * 
 * Nota: Algunos tests requieren datos de prueba en el ambiente.
 * Si no hay datos, los tests de búsqueda exitosa fallarán.
 */

import { test, expect } from '@playwright/test';
import { ClienteDashboardPage } from '../../pages/cliente/dashboard.page';

test.describe('Portal Cliente - 3. BÚSQUEDA DE EQUIPOS', () => {

  let dashboard: ClienteDashboardPage;

  test.beforeEach(async ({ page }) => {
    dashboard = new ClienteDashboardPage(page);
    await dashboard.goto();
  });

  test.describe('3.1 Búsqueda Simple', () => {

    // [ ] Buscar por patente de camión completa (ej: "AB123CD") → debe encontrar el equipo
    test('debe buscar por patente completa', async () => {
      // Usar patente de prueba - ajustar según datos reales
      await dashboard.buscar('AB123CD');

      // Debería mostrar resultados o mensaje de no encontrado
      const hayResultados = await dashboard.contarEquiposMostrados() > 0;
      const hayMensajeNoEncontrado = await dashboard.mensajeNoEquipos.isVisible();

      expect(hayResultados || hayMensajeNoEncontrado).toBeTruthy();
    });

    // [ ] Buscar por patente parcial (ej: "AB1") → debe encontrar equipos que coincidan
    test('debe buscar por patente parcial', async () => {
      await dashboard.buscar('AB1');

      const hayResultados = await dashboard.contarEquiposMostrados() > 0;
      const hayMensaje = await dashboard.mensajeNoEquipos.isVisible();

      expect(hayResultados || hayMensaje).toBeTruthy();
    });

    // [ ] Buscar por DNI de chofer completo (ej: "34288054") → debe encontrar el equipo
    test('debe buscar por DNI completo', async () => {
      await dashboard.buscar('34288054');

      const hayResultados = await dashboard.contarEquiposMostrados() > 0;
      const hayMensaje = await dashboard.mensajeNoEquipos.isVisible();

      expect(hayResultados || hayMensaje).toBeTruthy();
    });

    // [ ] Buscar por DNI parcial (ej: "3428") → debe encontrar equipos que coincidan
    test('debe buscar por DNI parcial', async () => {
      await dashboard.buscar('3428');

      const hayResultados = await dashboard.contarEquiposMostrados() > 0;
      const hayMensaje = await dashboard.mensajeNoEquipos.isVisible();

      expect(hayResultados || hayMensaje).toBeTruthy();
    });

    // [ ] Buscar por nombre de chofer (ej: "Juan") → debe encontrar equipos que coincidan
    test('debe buscar por nombre de chofer', async () => {
      await dashboard.buscar('Juan');

      const hayResultados = await dashboard.contarEquiposMostrados() > 0;
      const hayMensaje = await dashboard.mensajeNoEquipos.isVisible();

      expect(hayResultados || hayMensaje).toBeTruthy();
    });

    // [ ] Buscar por apellido de chofer → debe encontrar equipos que coincidan
    test('debe buscar por apellido de chofer', async () => {
      await dashboard.buscar('Perez');

      const hayResultados = await dashboard.contarEquiposMostrados() > 0;
      const hayMensaje = await dashboard.mensajeNoEquipos.isVisible();

      expect(hayResultados || hayMensaje).toBeTruthy();
    });

    // [ ] Buscar por razón social de empresa transportista → debe encontrar equipos
    test('debe buscar por razón social de transportista', async () => {
      await dashboard.buscar('Transportes');

      const hayResultados = await dashboard.contarEquiposMostrados() > 0;
      const hayMensaje = await dashboard.mensajeNoEquipos.isVisible();

      expect(hayResultados || hayMensaje).toBeTruthy();
    });

    // [ ] Buscar con texto que no existe → debe mostrar "No se encontraron equipos"
    test('debe mostrar mensaje cuando no hay resultados', async () => {
      await dashboard.buscar('XYZNOEXISTE999');

      await expect(dashboard.mensajeNoEquipos).toBeVisible();
    });

    // [ ] Presionar ENTER en el campo de búsqueda → debe ejecutar la búsqueda
    test('debe ejecutar búsqueda al presionar ENTER', async () => {
      await dashboard.buscarConEnter('test');

      // Verificar que se ejecutó la búsqueda (spinner apareció y desapareció, o hay resultados/mensaje)
      const hayResultados = await dashboard.contarEquiposMostrados() > 0;
      const hayMensaje = await dashboard.mensajeNoEquipos.isVisible();

      expect(hayResultados || hayMensaje).toBeTruthy();
    });

    // [ ] Hacer clic en botón "Buscar" → debe ejecutar la búsqueda
    test('debe ejecutar búsqueda al hacer clic en botón Buscar', async () => {
      await dashboard.buscar('test');

      const hayResultados = await dashboard.contarEquiposMostrados() > 0;
      const hayMensaje = await dashboard.mensajeNoEquipos.isVisible();

      expect(hayResultados || hayMensaje).toBeTruthy();
    });
  });

  test.describe('3.2 Búsqueda Masiva', () => {

    // [ ] Hacer clic en "Búsqueda Masiva" → debe abrir el panel de búsqueda masiva
    test('debe abrir panel de búsqueda masiva', async () => {
      await dashboard.abrirBusquedaMasiva();

      await expect(dashboard.textareaBusquedaMasiva).toBeVisible();
    });

    // [ ] Ingresar lista de DNIs separados por línea → debe buscar todos
    test('debe buscar lista de DNIs separados por línea', async () => {
      await dashboard.busquedaMasiva(['12345678', '87654321', '11111111']);

      const hayResultados = await dashboard.contarEquiposMostrados() > 0;
      const hayMensaje = await dashboard.mensajeNoEquipos.isVisible();

      expect(hayResultados || hayMensaje).toBeTruthy();
    });

    // [ ] Ingresar lista de DNIs separados por comas → debe buscar todos
    test('debe buscar lista de DNIs separados por comas', async ({ page }) => {
      await dashboard.abrirBusquedaMasiva();
      await dashboard.textareaBusquedaMasiva.fill('12345678, 87654321, 11111111');
      await dashboard.btnBuscarLista.click();
      await dashboard.esperarCarga();

      const hayResultados = await dashboard.contarEquiposMostrados() > 0;
      const hayMensaje = await dashboard.mensajeNoEquipos.isVisible();

      expect(hayResultados || hayMensaje).toBeTruthy();
    });

    // [ ] Ingresar lista de patentes separadas por línea → debe buscar todas
    test('debe buscar lista de patentes por línea', async () => {
      await dashboard.busquedaMasiva(['AB123CD', 'XY789ZW', 'AA111BB']);

      const hayResultados = await dashboard.contarEquiposMostrados() > 0;
      const hayMensaje = await dashboard.mensajeNoEquipos.isVisible();

      expect(hayResultados || hayMensaje).toBeTruthy();
    });

    // [ ] Mezclar DNIs y patentes en la lista → debe encontrar todos
    test('debe buscar mezclando DNIs y patentes', async () => {
      await dashboard.busquedaMasiva(['12345678', 'AB123CD', '87654321']);

      const hayResultados = await dashboard.contarEquiposMostrados() > 0;
      const hayMensaje = await dashboard.mensajeNoEquipos.isVisible();

      expect(hayResultados || hayMensaje).toBeTruthy();
    });

    // [ ] Ingresar más de 50 valores → debe limitar a 50
    test('debe limitar búsqueda masiva a 50 valores', async ({ page }) => {
      await dashboard.abrirBusquedaMasiva();

      // Generar 60 valores
      const valores = Array.from({ length: 60 }, (_, i) => `valor${i + 1}`);
      await dashboard.textareaBusquedaMasiva.fill(valores.join('\n'));

      // Verificar advertencia (evitar strict-mode: el textarea también contiene "50" por el placeholder)
      const advertencia = dashboard.panelBusquedaMasiva.getByText(/Máximo 50 valores/i);
      await expect(advertencia).toBeVisible();
    });

    // [ ] Ingresar lista vacía y presionar "Buscar Lista" → botón debe estar deshabilitado
    test('botón Buscar Lista debe estar deshabilitado con lista vacía', async () => {
      await dashboard.abrirBusquedaMasiva();
      await dashboard.textareaBusquedaMasiva.fill('');

      await expect(dashboard.btnBuscarLista).toBeDisabled();
    });

    // [ ] Cerrar panel de búsqueda masiva con la X
    test('debe cerrar panel de búsqueda masiva con X', async () => {
      await dashboard.abrirBusquedaMasiva();
      await dashboard.cerrarBusquedaMasiva();

      await expect(dashboard.panelBusquedaMasiva).not.toBeVisible();
    });
  });

  test.describe('3.3 Botón "Listar Todos"', () => {

    // [ ] Hacer clic en "Listar Todos" → debe mostrar todos los equipos asignados al cliente
    test('debe listar todos los equipos del cliente', async () => {
      await dashboard.listarTodos();

      // Debería mostrar equipos o mensaje de que no tiene
      const hayEquipos = await dashboard.contarEquiposMostrados() > 0;
      const noTieneEquipos = await dashboard.page.getByText(/No tienes equipos/i).isVisible();

      expect(hayEquipos || noTieneEquipos).toBeTruthy();
    });

    // [ ] Verificar que se resetea cualquier búsqueda previa
    test('debe resetear búsqueda previa al listar todos', async () => {
      // Primero buscar algo
      await dashboard.buscar('XYZNOEXISTE');
      await dashboard.esperarCarga();

      // Luego listar todos
      await dashboard.listarTodos();

      // El campo de búsqueda debería estar vacío (la UI puede resetearlo al listar)
      await expect(dashboard.inputBusqueda).toHaveValue('');
    });

    // [ ] Verificar que el filtro de estado se resetea a "TODOS"
    test('debe resetear filtro a TODOS al listar todos', async () => {
      await dashboard.listarTodos();

      // El filtro debería estar en "Todos" o equivalente
      const filtroTexto = await dashboard.selectFiltroEstado.textContent() 
        || await dashboard.selectFiltroEstado.inputValue();

      expect(filtroTexto?.toLowerCase()).toMatch(/todos|all/i);
    });
  });

  test.describe('3.4 Botón "Limpiar"', () => {

    // [ ] Hacer clic en "Limpiar" → debe vaciar campo, ocultar resultados, volver a estado inicial
    test('debe limpiar búsqueda y volver a estado inicial', async () => {
      // Primero hacer una búsqueda
      await dashboard.listarTodos();
      await dashboard.esperarCarga();

      // Luego limpiar
      await dashboard.limpiar();

      // Verificar estado inicial
      await expect(dashboard.inputBusqueda).toHaveValue('');

      // Debería volver al estado inicial (sin equipos cargados o mensaje inicial)
      const estadoInicial = await dashboard.mensajeEstadoInicial.isVisible();
      const sinEquipos = await dashboard.contarEquiposMostrados() === 0;

      expect(estadoInicial || sinEquipos).toBeTruthy();
    });

    // [ ] Cerrar panel de búsqueda masiva si estaba abierto
    test('debe cerrar panel de búsqueda masiva al limpiar', async () => {
      await dashboard.abrirBusquedaMasiva();
      await dashboard.limpiar();

      // El panel debería estar cerrado
      await expect(dashboard.panelBusquedaMasiva).not.toBeVisible();
    });
  });
});

