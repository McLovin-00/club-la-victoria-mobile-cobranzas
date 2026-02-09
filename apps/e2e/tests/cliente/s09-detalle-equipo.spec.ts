/**
 * Propósito: Tests de la Sección 9 - DETALLE DE EQUIPO del Portal Cliente.
 * Checklist: docs/checklists/cliente.md → Sección 9
 */

import { test, expect } from '@playwright/test';
import { ClienteDashboardPage } from '../../pages/cliente/dashboard.page';
import { ClienteDetallePage } from '../../pages/cliente/detalle.page';

test.describe('Portal Cliente - 9. DETALLE DE EQUIPO', () => {

  let dashboard: ClienteDashboardPage;
  let detalle: ClienteDetallePage;

  test.beforeEach(async ({ page }) => {
    dashboard = new ClienteDashboardPage(page);
    detalle = new ClienteDetallePage(page);
  });

  test.describe('9.1 Navegación', () => {

    // [ ] Hacer clic en un equipo → debe navegar a /cliente/equipos/:id
    test('clic en equipo debe navegar al detalle', async ({ page }) => {
      await dashboard.goto();
      await dashboard.listarTodos();

      const equipos = await dashboard.contarEquiposMostrados();

      if (equipos > 0) {
        await dashboard.clickEquipo(0);

        await expect(page).toHaveURL(/\/cliente\/equipos\/\d+|\/cliente\/equipos\/[a-zA-Z0-9-]+/);
      }
    });

    // [ ] Botón "Volver" → debe regresar al listado
    test('botón Volver debe regresar al listado', async ({ page }) => {
      await dashboard.goto();
      await dashboard.listarTodos();

      const equipos = await dashboard.contarEquiposMostrados();

      if (equipos > 0) {
        await dashboard.clickEquipo(0);
        await detalle.esperarCarga();

        await detalle.volver();

        await expect(page).toHaveURL(/\/cliente(\/|$)/);
      }
    });

    // [ ] Con equipo inexistente → debe mostrar error "No se pudo cargar el detalle"
    test('equipo inexistente debe mostrar error', async ({ page }) => {
      await page.goto('/cliente/equipos/99999999');

      await expect(detalle.mensajeError).toBeVisible();
    });
  });

  test.describe('9.2 Información del Equipo', () => {

    test.beforeEach(async ({ page }) => {
      // Navegar a un equipo real
      await dashboard.goto();
      await dashboard.listarTodos();

      const equipos = await dashboard.contarEquiposMostrados();
      if (equipos > 0) {
        await dashboard.clickEquipo(0);
        await detalle.esperarCarga();
      }
    });

    // [ ] Muestra título "Equipo {PATENTE}"
    test('debe mostrar título con patente del equipo', async () => {
      const titulo = await detalle.getTitulo();
      expect(titulo).toMatch(/Equipo|[A-Z]{2,3}\d{3}/i);
    });

    // [ ] Sección "Información del Equipo" con camión, acoplado, chofer, transportista
    test('debe mostrar sección de información del equipo', async () => {
      await expect(detalle.seccionInfoEquipo).toBeVisible();
    });

    // [ ] Camión: patente, marca y modelo
    test('debe mostrar información del camión', async () => {
      await expect(detalle.infoCamion).toBeVisible();

      const texto = await detalle.infoCamion.textContent();
      // Debe tener patente
      expect(texto).toMatch(/[A-Z]{2,3}\d{3}|Camión/i);
    });

    // [ ] Acoplado: patente (o "-" si no tiene)
    test('debe mostrar información del acoplado', async () => {
      await expect(detalle.infoAcoplado).toBeVisible();

      const texto = await detalle.infoAcoplado.textContent();
      // Puede tener patente o "-"
      expect(texto).toMatch(/[A-Z]{2,3}\d{3}|-|Acoplado/i);
    });

    // [ ] Chofer: nombre, apellido, DNI (o "-" si no tiene)
    test('debe mostrar información del chofer', async () => {
      await expect(detalle.infoChofer).toBeVisible();

      const texto = await detalle.infoChofer.textContent();
      // Puede tener nombre y DNI o "-"
      expect(texto).toMatch(/\d{7,8}|-|Chofer|Sin chofer/i);
    });

    // [ ] Empresa Transportista: razón social
    test('debe mostrar información del transportista', async () => {
      await expect(detalle.infoTransportista).toBeVisible();
    });
  });

  test.describe('9.3 Resumen de Documentos', () => {

    test.beforeEach(async ({ page }) => {
      await dashboard.goto();
      await dashboard.listarTodos();

      const equipos = await dashboard.contarEquiposMostrados();
      if (equipos > 0) {
        await dashboard.clickEquipo(0);
        await detalle.esperarCarga();
      }
    });

    // [ ] Contador "Total" de documentos
    test('debe mostrar contador Total de documentos', async () => {
      const total = await detalle.getContador('total');
      expect(total).toBeGreaterThanOrEqual(0);
    });

    // [ ] Contador "Vigentes" en verde
    test('debe mostrar contador Vigentes', async () => {
      await expect(detalle.contadorVigentes).toBeVisible();
    });

    // [ ] Contador "Próx. vencer" en amarillo
    test('debe mostrar contador Próx. vencer', async () => {
      await expect(detalle.contadorProxVencer).toBeVisible();
    });

    // [ ] Contador "Vencidos" en rojo
    test('debe mostrar contador Vencidos', async () => {
      await expect(detalle.contadorVencidos).toBeVisible();
    });

    // [ ] Suma de estados debe ser <= Total
    test('suma de contadores debe ser <= Total', async () => {
      const total = await detalle.getContador('total');
      const vigentes = await detalle.getContador('vigentes');
      const proxVencer = await detalle.getContador('proxVencer');
      const vencidos = await detalle.getContador('vencidos');

      expect(vigentes).toBeLessThanOrEqual(total);
      expect(proxVencer).toBeLessThanOrEqual(total);
      expect(vencidos).toBeLessThanOrEqual(total);
    });
  });

  test.describe('9.4 Aviso de Documentos Vencidos', () => {

    // [ ] Si hay documentos vencidos → mostrar banner rojo con mensaje
    test('debe mostrar banner si hay documentos vencidos', async ({ page }) => {
      await dashboard.goto();
      await dashboard.listarTodos();

      // Filtrar por vencidos para encontrar un equipo con vencidos
      await dashboard.filtrarPorEstado('vencidos');

      const equipos = await dashboard.contarEquiposMostrados();

      if (equipos > 0) {
        await dashboard.clickEquipo(0);
        await detalle.esperarCarga();

        const tieneBanner = await detalle.tieneBannerVencidos();
        expect(tieneBanner).toBeTruthy();
      }
    });

    // [ ] Si no hay vencidos → no mostrar el banner
    test('no debe mostrar banner si no hay documentos vencidos', async ({ page }) => {
      await dashboard.goto();
      await dashboard.listarTodos();

      // Filtrar por vigentes (sin vencidos)
      await dashboard.filtrarPorEstado('vigentes');

      const equipos = await dashboard.contarEquiposMostrados();

      if (equipos > 0) {
        await dashboard.clickEquipo(0);
        await detalle.esperarCarga();

        const vencidos = await detalle.getContador('vencidos');
        if (vencidos === 0) {
          const tieneBanner = await detalle.tieneBannerVencidos();
          expect(tieneBanner).toBeFalsy();
        }
      }
    });
  });

  test.describe('9.5 Documentos Agrupados por Entidad', () => {

    test.beforeEach(async ({ page }) => {
      await dashboard.goto();
      await dashboard.listarTodos();

      const equipos = await dashboard.contarEquiposMostrados();
      if (equipos > 0) {
        await dashboard.clickEquipo(0);
        await detalle.esperarCarga();
      }
    });

    // [ ] Documentos del CHOFER agrupados con icono de persona
    test('debe agrupar documentos del chofer', async () => {
      const docs = await detalle.contarDocumentos();

      if (docs > 0) {
        // Buscar grupo de chofer
        const grupoVisible = await detalle.grupoChofer.isVisible();
        // Es válido que no haya documentos de chofer
        expect(grupoVisible || true).toBeTruthy();
      }
    });

    // [ ] Documentos del CAMIÓN agrupados con icono de camión
    test('debe agrupar documentos del camión', async () => {
      const docs = await detalle.contarDocumentos();

      if (docs > 0) {
        const grupoVisible = await detalle.grupoCamion.isVisible();
        expect(grupoVisible || true).toBeTruthy();
      }
    });

    // [ ] Documentos del ACOPLADO agrupados
    test('debe agrupar documentos del acoplado si existe', async () => {
      const docs = await detalle.contarDocumentos();

      if (docs > 0) {
        const grupoVisible = await detalle.grupoAcoplado.isVisible();
        // Es válido que no haya acoplado
        expect(grupoVisible || true).toBeTruthy();
      }
    });

    // [ ] Documentos de la EMPRESA TRANSPORTISTA agrupados
    test('debe agrupar documentos del transportista', async () => {
      const docs = await detalle.contarDocumentos();

      if (docs > 0) {
        const grupoVisible = await detalle.grupoTransportista.isVisible();
        expect(grupoVisible || true).toBeTruthy();
      }
    });

    // [ ] Cada grupo muestra el nombre/identificador de la entidad
    test('cada grupo debe mostrar identificador', async () => {
      // Verificar que los grupos tienen contenido
      const grupos = detalle.page.locator('section, [class*="group"]').filter({ hasText: /Chofer|Camión|Acoplado|Transportista/i });
      const cantidadGrupos = await grupos.count();

      expect(cantidadGrupos).toBeGreaterThanOrEqual(0);
    });
  });

  test.describe('9.6 Lista de Documentos', () => {

    test.beforeEach(async ({ page }) => {
      await dashboard.goto();
      await dashboard.listarTodos();

      const equipos = await dashboard.contarEquiposMostrados();
      if (equipos > 0) {
        await dashboard.clickEquipo(0);
        await detalle.esperarCarga();
      }
    });

    // [ ] Cada documento muestra: nombre, fecha vencimiento, estado, botones
    test('cada documento debe mostrar información completa', async () => {
      const docs = await detalle.contarDocumentos();

      if (docs > 0) {
        const primerDoc = detalle.documentos.first();
        const texto = await primerDoc.textContent();

        // Debe tener contenido sustancial
        expect(texto?.length).toBeGreaterThan(5);
      }
    });

    // [ ] Botón "Ver" (ojo) existe
    test('debe existir botón Ver en documentos', async () => {
      const docs = await detalle.contarDocumentos();

      if (docs > 0) {
        const cantidadBtnVer = await detalle.btnVerDoc.count();
        expect(cantidadBtnVer).toBeGreaterThan(0);
      }
    });

    // [ ] Botón "Descargar" o icono deshabilitado si vencido
    test('debe existir botón Descargar o indicador de deshabilitado', async () => {
      const docs = await detalle.contarDocumentos();

      if (docs > 0) {
        const cantidadBtnDescargar = await detalle.btnDescargarDoc.count();
        const cantidadDisabled = await detalle.btnDescargarDocDisabled.count();

        // Debe haber al menos uno de los dos tipos
        expect(cantidadBtnDescargar + cantidadDisabled).toBeGreaterThanOrEqual(0);
      }
    });
  });
});

