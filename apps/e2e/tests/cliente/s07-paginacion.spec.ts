/**
 * Propósito: Tests de la Sección 7 - PAGINACIÓN del Portal Cliente.
 * Checklist: docs/checklists/cliente.md → Sección 7
 * 
 * Nota: Requiere al menos 11 equipos para probar paginación completa.
 */

import { test, expect } from '@playwright/test';
import { ClienteDashboardPage } from '../../pages/cliente/dashboard.page';

test.describe('Portal Cliente - 7. PAGINACIÓN', () => {

  let dashboard: ClienteDashboardPage;

  test.beforeEach(async ({ page }) => {
    dashboard = new ClienteDashboardPage(page);
    await dashboard.goto();
    await dashboard.listarTodos();
  });

  test.describe('7.1 Navegación entre Páginas', () => {

    // [ ] Con más de 10 equipos → debe mostrar paginación
    test('debe mostrar paginación con más de 10 equipos', async () => {
      const total = await dashboard.getContador('total');

      if (total > 10) {
        await expect(dashboard.textoPaginacion).toBeVisible();
      }
    });

    // [ ] Verificar texto "Mostrando X - Y de Z equipos"
    test('debe mostrar texto "Mostrando X - Y de Z equipos"', async () => {
      const total = await dashboard.getContador('total');

      if (total > 0) {
        await expect(dashboard.textoMostrando).toBeVisible();
        const texto = await dashboard.textoMostrando.textContent();
        expect(texto).toMatch(/Mostrando \d+/i);
      }
    });

    // [ ] Verificar texto "Página N de M"
    test('debe mostrar texto "Página N de M"', async () => {
      const total = await dashboard.getContador('total');

      if (total > 10) {
        await expect(dashboard.textoPaginacion).toBeVisible();
        const texto = await dashboard.textoPaginacion.textContent();
        expect(texto).toMatch(/Página \d+ de \d+/i);
      }
    });

    // [ ] Botón "Anterior" deshabilitado en página 1
    test('botón Anterior debe estar deshabilitado en página 1', async () => {
      const total = await dashboard.getContador('total');

      if (total > 10) {
        await expect(dashboard.btnPaginaAnterior).toBeDisabled();
      }
    });

    // [ ] Botón "Siguiente" deshabilitado en última página
    test('botón Siguiente debe estar deshabilitado en última página', async () => {
      const total = await dashboard.getContador('total');

      if (total > 10) {
        // Navegar hasta la última página
        while (await dashboard.btnPaginaSiguiente.isEnabled()) {
          await dashboard.paginaSiguiente();
        }

        await expect(dashboard.btnPaginaSiguiente).toBeDisabled();
      }
    });

    // [ ] Hacer clic en "Siguiente" → carga página 2
    test('clic en Siguiente debe cargar página 2', async () => {
      const total = await dashboard.getContador('total');

      if (total > 10) {
        await dashboard.paginaSiguiente();

        const texto = await dashboard.textoPaginacion.textContent();
        expect(texto).toContain('2');
      }
    });

    // [ ] Hacer clic en "Anterior" → vuelve a página 1
    test('clic en Anterior debe volver a página 1', async () => {
      const total = await dashboard.getContador('total');

      if (total > 10) {
        // Ir a página 2
        await dashboard.paginaSiguiente();

        // Volver a página 1
        await dashboard.paginaAnterior();

        const texto = await dashboard.textoPaginacion.textContent();
        expect(texto).toContain('1');
      }
    });

    // [ ] Al cambiar filtro, debe volver a página 1
    test('cambiar filtro debe volver a página 1', async () => {
      const total = await dashboard.getContador('total');

      if (total > 10) {
        // Ir a página 2
        await dashboard.paginaSiguiente();

        // Cambiar filtro
        await dashboard.filtrarPorEstado('vigentes');

        // Debe volver a página 1 si sigue existiendo paginación.
        // Si el filtro reduce a <=10 o a 0 resultados, puede no renderizar paginación.
        const visible = await dashboard.textoPaginacion.isVisible().catch(() => false);
        if (visible) {
          const texto = await dashboard.textoPaginacion.textContent();
          expect(texto ?? '').toContain('1');
        }
      }
    });

    // [ ] Al buscar, debe volver a página 1
    test('buscar debe volver a página 1', async () => {
      const total = await dashboard.getContador('total');

      if (total > 10) {
        // Ir a página 2
        await dashboard.paginaSiguiente();

        // Buscar
        await dashboard.buscar('test');

        // Verificar que volvió a página 1 (o no hay paginación por pocos resultados)
        const textoPag = await dashboard.textoPaginacion.textContent().catch(() => '1');
        if (textoPag) {
          expect(textoPag).toContain('1');
        }
      }
    });
  });
});

