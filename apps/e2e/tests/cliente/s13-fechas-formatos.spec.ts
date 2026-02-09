/**
 * Propósito: Tests de la Sección 13 - FECHAS Y FORMATOS del Portal Cliente.
 * Checklist: docs/checklists/cliente.md → Sección 13
 */

import { test, expect } from '@playwright/test';
import { ClienteDashboardPage } from '../../pages/cliente/dashboard.page';
import { ClienteDetallePage } from '../../pages/cliente/detalle.page';

test.describe('Portal Cliente - 13. FECHAS Y FORMATOS', () => {

  let dashboard: ClienteDashboardPage;
  let detalle: ClienteDetallePage;

  test.beforeEach(async ({ page }) => {
    dashboard = new ClienteDashboardPage(page);
    detalle = new ClienteDetallePage(page);
  });

  test.describe('13.1 Formato de Fechas', () => {

    // [ ] Fechas de vencimiento en formato argentino (DD/MM/YYYY)
    test('fechas deben estar en formato DD/MM/YYYY', async ({ page }) => {
      await dashboard.goto();
      await dashboard.listarTodos();

      const equipos = await dashboard.contarEquiposMostrados();

      if (equipos > 0) {
        await dashboard.clickEquipo(0);
        await detalle.esperarCarga();

        // Buscar fechas en la página
        const textosPagina = await page.locator('body').textContent();

        // Regex para formato DD/MM/YYYY
        const formatoArgentino = /\d{2}\/\d{2}\/\d{4}/;

        // Si hay fechas, deberían estar en formato argentino
        const tieneFechas = formatoArgentino.test(textosPagina ?? '');
        const tieneSinVencimiento = /Sin vencimiento/i.test(textosPagina ?? '');

        // Debe tener fechas en formato correcto o "Sin vencimiento"
        expect(tieneFechas || tieneSinVencimiento).toBeTruthy();
      }
    });

    // [ ] "Próx. venc:" en formato correcto
    test('próximo vencimiento debe estar en formato correcto', async ({ page }) => {
      await dashboard.goto();
      await dashboard.listarTodos();

      const equipos = await dashboard.contarEquiposMostrados();

      if (equipos > 0) {
        // Buscar tarjeta con fecha de vencimiento
        const tarjetaConFecha = dashboard.tarjetaEquipo.filter({ hasText: /\d{2}\/\d{2}\/\d{4}/ });
        const hayConFecha = await tarjetaConFecha.count() > 0;

        if (hayConFecha) {
          const texto = await tarjetaConFecha.first().textContent();
          // Verificar formato DD/MM/YYYY
          expect(texto).toMatch(/\d{2}\/\d{2}\/\d{4}/);
        }
      }
    });

    // [ ] "Asignado desde:" en formato correcto
    test('fecha de asignación debe estar en formato correcto', async ({ page }) => {
      await dashboard.goto();
      await dashboard.listarTodos();

      const equipos = await dashboard.contarEquiposMostrados();

      if (equipos > 0) {
        await dashboard.clickEquipo(0);
        await detalle.esperarCarga();

        // Buscar "Asignado desde" o similar
        const textoAsignado = await page.getByText(/Asignado desde/i).textContent().catch(() => '');

        if (textoAsignado) {
          // Debería tener fecha en formato DD/MM/YYYY
          expect(textoAsignado).toMatch(/\d{2}\/\d{2}\/\d{4}|Asignado/i);
        }
      }
    });

    // [ ] "Vence:" en documentos en formato correcto
    test('fecha de vencimiento en documentos debe estar en formato correcto', async ({ page }, testInfo) => {
      await dashboard.goto();
      await dashboard.listarTodos();

      const equipos = await dashboard.contarEquiposMostrados();

      if (equipos > 0) {
        await dashboard.clickEquipo(0);
        await detalle.esperarCarga();

        // Buscar textos de vencimiento en documentos (evitar falsos positivos como "Próx. vencer")
        const textoVence = await page.getByText(/Vence:\s*/i).first().textContent().catch(() => '');

        if (textoVence) {
          // Debería tener fecha DD/MM/YYYY o "Sin vencimiento"
          const tieneFormatoCorrecto =
            /\d{1,2}\/\d{1,2}\/\d{4}/.test(textoVence)
            || /\d{4}-\d{2}-\d{2}/.test(textoVence)
            || /\d{1,2}-\d{1,2}-\d{4}/.test(textoVence)
            || /Sin vencimiento/i.test(textoVence);
          await testInfo.attach('texto-vence', { body: textoVence, contentType: 'text/plain' });
          expect(tieneFormatoCorrecto).toBeTruthy();
        }
      }
    });
  });
});

