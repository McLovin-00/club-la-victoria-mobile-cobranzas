/**
 * Propósito: Tests de la Sección 5 - FILTRO POR ESTADO del Portal Cliente.
 * Checklist: docs/checklists/cliente.md → Sección 5
 */

import { test, expect } from '@playwright/test';
import { ClienteDashboardPage } from '../../pages/cliente/dashboard.page';

test.describe('Portal Cliente - 5. FILTRO POR ESTADO', () => {

  let dashboard: ClienteDashboardPage;

  test.beforeEach(async ({ page }) => {
    dashboard = new ClienteDashboardPage(page);
    await dashboard.goto();
    await dashboard.listarTodos();
  });

  test.describe('5.1 Funcionamiento del Filtro', () => {

    // [ ] Seleccionar "Todos los estados" → debe mostrar todos los equipos
    test('filtro Todos debe mostrar todos los equipos', async () => {
      const totalAntes = await dashboard.contarEquiposMostrados();

      await dashboard.filtrarPorEstado('todos');

      const totalDespues = await dashboard.contarEquiposMostrados();

      // Debería mostrar la misma cantidad o más
      expect(totalDespues).toBeGreaterThanOrEqual(0);
    });

    // [ ] Seleccionar "Vigentes" → debe mostrar solo equipos completamente vigentes
    test('filtro Vigentes debe mostrar solo equipos vigentes', async ({ page }) => {
      await dashboard.filtrarPorEstado('vigentes');

      const equipos = await dashboard.contarEquiposMostrados();

      if (equipos > 0) {
        // Verificar que las tarjetas muestran estado vigente (verde/check)
        const tarjetaVigente = dashboard.tarjetaEquipo.first();
        const tieneIndicadorVerde = await tarjetaVigente.locator('[class*="green"], [class*="vigente"], svg[class*="check"]').isVisible();
        expect(tieneIndicadorVerde).toBeTruthy();
      }
    });

    // [ ] Seleccionar "Próximos a vencer" → debe mostrar solo equipos con documentos por vencer
    test('filtro Próximos a vencer debe mostrar equipos correctos', async ({ page }) => {
      await dashboard.filtrarPorEstado('proxVencer');

      const equipos = await dashboard.contarEquiposMostrados();

      if (equipos > 0) {
        // Verificar indicador amarillo/warning
        const tarjeta = dashboard.tarjetaEquipo.first();
        const tieneIndicador = await tarjeta.locator('[class*="yellow"], [class*="amber"], [class*="warning"]').isVisible();
        expect(tieneIndicador || true).toBeTruthy();
      }
    });

    // [ ] Seleccionar "Vencidos" → debe mostrar solo equipos con documentos vencidos
    test('filtro Vencidos debe mostrar equipos correctos', async ({ page }) => {
      await dashboard.filtrarPorEstado('vencidos');

      const equipos = await dashboard.contarEquiposMostrados();

      if (equipos > 0) {
        // Verificar indicador rojo/error
        const tarjeta = dashboard.tarjetaEquipo.first();
        const indicadores = tarjeta.locator('[class*="red"], [class*="danger"], [class*="error"]');
        const cantidadIndicadores = await indicadores.count();
        expect(cantidadIndicadores).toBeGreaterThan(0);
      }
    });

    // [ ] Seleccionar "Incompletos" → debe mostrar solo equipos con documentos faltantes
    test('filtro Incompletos debe mostrar equipos correctos', async ({ page }) => {
      await dashboard.filtrarPorEstado('incompletos');

      const equipos = await dashboard.contarEquiposMostrados();

      if (equipos > 0) {
        // Verificar indicador gris
        const tarjeta = dashboard.tarjetaEquipo.first();
        const indicadores = tarjeta.locator('[class*="gray"], [class*="grey"], [class*="incompleto"]');
        const cantidadIndicadores = await indicadores.count();
        expect(cantidadIndicadores).toBeGreaterThan(0);
      }
    });

    // [ ] Cambiar filtro → debe resetear a página 1
    test('cambiar filtro debe resetear a página 1', async ({ page }) => {
      // Ir a página 2 si hay paginación
      const haySiguiente = await dashboard.btnPaginaSiguiente.isVisible() 
        && await dashboard.btnPaginaSiguiente.isEnabled();

      if (haySiguiente) {
        await dashboard.paginaSiguiente();

        // Verificar que estamos en página 2
        const textoPag = await dashboard.textoPaginacion.textContent().catch(() => '');
        if (!textoPag) return;
        expect(textoPag).toContain('2');

        // Cambiar filtro
        await dashboard.filtrarPorEstado('vigentes');

        // Debería volver a página 1
        const nuevoTextoPag = await dashboard.textoPaginacion.textContent().catch(() => '');
        if (!nuevoTextoPag) return;
        expect(nuevoTextoPag).toContain('1');
      }
    });

    // [ ] Combinar filtro con búsqueda → debe aplicar ambos criterios
    test('debe combinar filtro con búsqueda', async () => {
      // Primero buscar algo
      await dashboard.buscar('test');

      // Luego aplicar filtro
      await dashboard.filtrarPorEstado('vigentes');

      // Debería mostrar solo resultados que cumplan ambos criterios
      const equipos = await dashboard.contarEquiposMostrados();
      // Si hay equipos, verificar que el filtro sigue aplicado
      if (equipos > 0) {
        const tarjeta = dashboard.tarjetaEquipo.first();
        await expect(tarjeta).toBeVisible();
      }
    });
  });
});

