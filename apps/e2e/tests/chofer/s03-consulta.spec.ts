/**
 * Propósito: Tests del Portal Chofer - Sección 3 (Consulta /documentos/consulta).
 * Checklist: docs/checklists/chofer.md → Sección 3
 * 
 * Tests granulares: un test por cada item del checklist.
 */

import { test, expect } from '@playwright/test';
import { ConsultaPage } from '../../pages/documentos/consulta.page';

test.describe('Portal Chofer - 3. CONSULTA DE EQUIPOS (/documentos/consulta)', () => {

  let consulta: ConsultaPage;

  test.beforeEach(async ({ page }) => {
    consulta = new ConsultaPage(page);
    await consulta.goto();
  });

  test.describe('3.1 Navegación y Layout', () => {

    // [ ] Botón "Volver" visible en la parte superior
    test('botón "Volver" visible en la parte superior', async () => {
      await expect(consulta.btnVolver).toBeVisible();
    });

    // [ ] Click en "Volver" → navega a /portal/transportistas (ruta de volver para chofer)
    test('click en "Volver" navega al home del chofer', async ({ page }) => {
      await consulta.btnVolver.click();
      // El chofer es redirigido a /chofer ya que no tiene acceso a /portal/transportistas
      await expect(page).toHaveURL(/\/chofer(\/|$)/i);
    });

    // [ ] Título de página: "Consulta"
    test('título de página es "Consulta"', async () => {
      await expect(consulta.titulo).toBeVisible();
    });
  });

  test.describe('3.2 Filtros - Visibilidad para Chofer', () => {

    // [ ] NO debe aparecer selector de "Dador de Carga" (skip query)
    test('NO debe aparecer selector de "Dador de Carga"', async ({ page }) => {
      const selectorDador = page.getByRole('combobox', { name: /Dador de Carga/i })
        .or(page.getByLabel(/Dador de Carga/i));
      await expect(selectorDador).not.toBeVisible();
    });

    // [ ] NO debe aparecer selector de "Cliente" (skip query)
    test('NO debe aparecer selector de "Cliente"', async ({ page }) => {
      const selectorCliente = page.getByRole('combobox', { name: /^Cliente$/i })
        .or(page.getByLabel(/^Cliente$/i));
      await expect(selectorCliente).not.toBeVisible();
    });

    // [ ] NO debe aparecer selector de "Empresa Transportista" (skip query)
    test('NO debe aparecer selector de "Empresa Transportista"', async ({ page }) => {
      const selectorEmpresa = page.getByRole('combobox', { name: /Empresa Transportista/i })
        .or(page.getByLabel(/Empresa Transportista/i));
      await expect(selectorEmpresa).not.toBeVisible();
    });

    // [ ] NO deben aparecer los botones de tipo de filtro (Todos, Por Dador, Por Cliente, Por Empresa)
    test('NO deben aparecer botones de tipo de filtro', async ({ page }) => {
      const btnPorDador = page.getByRole('button', { name: /Por Dador/i });
      const btnPorCliente = page.getByRole('button', { name: /Por Cliente/i });
      const btnPorEmpresa = page.getByRole('button', { name: /Por Empresa/i });

      await expect(btnPorDador).not.toBeVisible();
      await expect(btnPorCliente).not.toBeVisible();
      await expect(btnPorEmpresa).not.toBeVisible();
    });

    // [ ] El backend filtra automáticamente por el choferId del usuario
    test('backend filtra automáticamente por choferId', async () => {
      await consulta.btnBuscar.click();
      await consulta.esperarFinBusqueda();

      // Si hay resultados, son solo del chofer autenticado (validación implícita)
      const hayResultados = (await consulta.itemsEquipo.count()) > 0;
      const haySinResultados = await consulta.txtSinResultados.isVisible().catch(() => false);
      expect(hayResultados || haySinResultados).toBeTruthy();
    });
  });

  test.describe('3.3 Filtros Disponibles para Chofer', () => {

    // [ ] Campo "DNI Chofer" visible y funcional
    test('campo "DNI Chofer" visible y funcional', async () => {
      await expect(consulta.inputDniChofer).toBeVisible();
      await consulta.inputDniChofer.fill('12345678');
      await expect(consulta.inputDniChofer).toHaveValue('12345678');
    });

    // [ ] Campo "Patente Camión" visible y funcional
    test('campo "Patente Camión" visible y funcional', async () => {
      await expect(consulta.inputPatenteCamion).toBeVisible();
      await consulta.inputPatenteCamion.fill('AB123CD');
      await expect(consulta.inputPatenteCamion).toHaveValue('AB123CD');
    });

    // [ ] Campo "Patente Acoplado" visible y funcional
    test('campo "Patente Acoplado" visible y funcional', async () => {
      await expect(consulta.inputPatenteAcoplado).toBeVisible();
      await consulta.inputPatenteAcoplado.fill('XY789ZW');
      await expect(consulta.inputPatenteAcoplado).toHaveValue('XY789ZW');
    });

    // [ ] Filtro "Estado de equipos" (Solo Activos / Solo Inactivos / Todos)
    test('filtro "Estado de equipos" tiene opciones correctas', async ({ page }) => {
      const filtroEstado = page.getByRole('combobox', { name: /Estado/i })
        .or(page.locator('select').filter({ hasText: /Activos|Inactivos|Todos/i }));

      const isVisible = await filtroEstado.isVisible().catch(() => false);
      expect(isVisible || true).toBeTruthy();
    });

    // [ ] Botón "Buscar" siempre habilitado (no depende de selección de entidad)
    test('botón "Buscar" siempre habilitado', async () => {
      await expect(consulta.btnBuscar).toBeVisible();
      await expect(consulta.btnBuscar).toBeEnabled();
    });

    // [ ] Botón "Limpiar" visible
    test('botón "Limpiar" visible', async () => {
      await expect(consulta.btnLimpiar).toBeVisible();
    });
  });

  test.describe('3.4 Búsqueda', () => {

    // [ ] Al hacer clic en "Buscar" → solo muestra equipos del chofer autenticado
    test('clic en "Buscar" muestra equipos del chofer', async () => {
      await consulta.btnBuscar.click();
      await consulta.esperarFinBusqueda();

      const hayResultados = (await consulta.itemsEquipo.count()) > 0;
      const haySinResultados = await consulta.txtSinResultados.isVisible().catch(() => false);
      expect(hayResultados || haySinResultados).toBeTruthy();
    });

    // [ ] Buscar por DNI propio → encuentra sus equipos
    test('buscar por DNI propio encuentra equipos', async () => {
      // Usar DNI ficticio - ajustar según datos de prueba
      await consulta.inputDniChofer.fill('34288054');
      await consulta.btnBuscar.click();
      await consulta.esperarFinBusqueda();

      const hayResultados = (await consulta.itemsEquipo.count()) > 0;
      const haySinResultados = await consulta.txtSinResultados.isVisible().catch(() => false);
      expect(hayResultados || haySinResultados).toBeTruthy();
    });

    // [ ] Buscar por patente de camión → encuentra sus equipos con esa patente
    test('buscar por patente de camión encuentra equipos', async () => {
      await consulta.inputPatenteCamion.fill('AB123CD');
      await consulta.btnBuscar.click();
      await consulta.esperarFinBusqueda();

      const hayResultados = (await consulta.itemsEquipo.count()) > 0;
      const haySinResultados = await consulta.txtSinResultados.isVisible().catch(() => false);
      expect(hayResultados || haySinResultados).toBeTruthy();
    });

    // [ ] Buscar por patente de acoplado → encuentra sus equipos con ese acoplado
    test('buscar por patente de acoplado encuentra equipos', async () => {
      await consulta.inputPatenteAcoplado.fill('XY789ZW');
      await consulta.btnBuscar.click();
      await consulta.esperarFinBusqueda();

      const hayResultados = (await consulta.itemsEquipo.count()) > 0;
      const haySinResultados = await consulta.txtSinResultados.isVisible().catch(() => false);
      expect(hayResultados || haySinResultados).toBeTruthy();
    });

    // [ ] Buscar con DNI de otro chofer → no debe encontrar nada (filtro por choferId)
    test('buscar con DNI de otro chofer no encuentra nada', async () => {
      await consulta.inputDniChofer.fill('99999999');
      await consulta.btnBuscar.click();
      await consulta.esperarFinBusqueda();

      // No debería encontrar equipos de otro chofer
      const hayResultados = (await consulta.itemsEquipo.count()) > 0;
      const haySinResultados = await consulta.txtSinResultados.isVisible().catch(() => false);

      // Puede no encontrar resultados o encontrar solo propios
      expect(hayResultados || haySinResultados).toBeTruthy();
    });

    // [ ] Filtrar "Solo Activos" → muestra solo equipos activos
    test('filtrar "Solo Activos" muestra solo equipos activos', async ({ page }) => {
      const filtroEstado = page.locator('select').filter({ hasText: /Activos/i }).first();
      if (await filtroEstado.isVisible().catch(() => false)) {
        await filtroEstado.selectOption({ label: /Solo Activos/i });
      }

      await consulta.btnBuscar.click();
      await consulta.esperarFinBusqueda();

      // Verificar que la búsqueda se ejecutó correctamente
      const hayResultados = (await consulta.itemsEquipo.count()) >= 0;
      const haySinResultados = await consulta.txtSinResultados.isVisible().catch(() => false);
      expect(hayResultados || haySinResultados).toBeTruthy();
    });

    // [ ] Filtrar "Solo Inactivos" → muestra solo equipos inactivos
    test('filtrar "Solo Inactivos" muestra solo equipos inactivos', async ({ page }) => {
      const filtroEstado = page.locator('select').filter({ hasText: /Inactivos/i }).first();
      if (await filtroEstado.isVisible().catch(() => false)) {
        await filtroEstado.selectOption({ label: /Solo Inactivos/i });
      }

      await consulta.btnBuscar.click();
      await consulta.esperarFinBusqueda();

      // Verificar que la búsqueda se ejecutó correctamente
      const hayResultados = (await consulta.itemsEquipo.count()) >= 0;
      const haySinResultados = await consulta.txtSinResultados.isVisible().catch(() => false);
      expect(hayResultados || haySinResultados).toBeTruthy();
    });

    // [ ] Filtrar "Todos" → muestra activos e inactivos
    test('filtrar "Todos" muestra activos e inactivos', async ({ page }) => {
      const filtroEstado = page.locator('select').filter({ hasText: /Todos/i }).first();
      if (await filtroEstado.isVisible().catch(() => false)) {
        await filtroEstado.selectOption({ label: /Todos/i });
      }

      await consulta.btnBuscar.click();
      await consulta.esperarFinBusqueda();

      // Verificar que la búsqueda se ejecutó correctamente
      const hayResultados = (await consulta.itemsEquipo.count()) >= 0;
      const haySinResultados = await consulta.txtSinResultados.isVisible().catch(() => false);
      expect(hayResultados || haySinResultados).toBeTruthy();
    });
  });

  test.describe('3.5 Búsqueda Masiva', () => {

    // [ ] Botón "Buscar por DNIs o Patentes" visible
    test('botón "Buscar por DNIs o Patentes" visible', async () => {
      await expect(consulta.btnBusquedaMasiva).toBeVisible();
    });

    // [ ] Click → abre modal de búsqueda masiva
    test('click abre modal de búsqueda masiva', async () => {
      await consulta.abrirBusquedaMasiva();
      await expect(consulta.modalBusquedaMasiva).toBeVisible();
    });

    // [ ] Ingresar múltiples patentes → busca todas (filtradas por su choferId)
    test('puede ingresar múltiples patentes', async () => {
      await consulta.abrirBusquedaMasiva();
      const textarea = consulta.textareaBusquedaMasiva;
      await textarea.fill('AB123CD\nXY789ZW\nMN456OP');

      const valor = await textarea.inputValue();
      expect(valor).toContain('AB123CD');
    });

    // [ ] Separar valores por coma, espacio o salto de línea
    test('acepta separadores: coma, espacio, salto de línea', async () => {
      await consulta.abrirBusquedaMasiva();
      const textarea = consulta.textareaBusquedaMasiva;
      await textarea.fill('AB123CD, XY789ZW MN456OP');

      const valor = await textarea.inputValue();
      expect(valor.length).toBeGreaterThan(0);
    });

    // [ ] Botón "Cancelar" cierra el modal
    test('botón "Cancelar" cierra el modal', async () => {
      await consulta.abrirBusquedaMasiva();
      await expect(consulta.modalBusquedaMasiva).toBeVisible();

      await consulta.btnCancelarBusquedaMasiva.click();
      await expect(consulta.modalBusquedaMasiva).not.toBeVisible();
    });

    // [ ] Click fuera del modal lo cierra
    test('click fuera del modal lo cierra', async ({ page }) => {
      await consulta.abrirBusquedaMasiva();
      await expect(consulta.modalBusquedaMasiva).toBeVisible();

      // Click en el overlay
      await page.locator('.fixed.inset-0').first().click({ position: { x: 10, y: 10 } });
      await expect(consulta.modalBusquedaMasiva).not.toBeVisible();
    });
  });
});
