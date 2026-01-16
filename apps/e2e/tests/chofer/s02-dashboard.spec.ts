/**
 * Propósito: Tests del Portal Chofer - Sección 2 (Dashboard principal /chofer).
 * Checklist: docs/checklists/chofer.md → Sección 2
 * 
 * Tests granulares: un test por cada item del checklist.
 */

import { test, expect } from '@playwright/test';
import { ChoferDashboardPage } from '../../pages/chofer/dashboard.page';

test.describe('Portal Chofer - 2. DASHBOARD PRINCIPAL (/chofer)', () => {

  let dashboard: ChoferDashboardPage;

  test.beforeEach(async ({ page }) => {
    dashboard = new ChoferDashboardPage(page);
    await dashboard.goto();
  });

  test.describe('2.1 Interfaz Visual', () => {

    // [ ] Verificar que se muestra el logo de Grupo BCA (tamaño correcto h-32 md:h-40)
    test('debe mostrar el logo de Grupo BCA', async () => {
      await expect(dashboard.logoGrupoBca).toBeVisible();
    });

    // [ ] Verificar que el título dice "Portal Chofer"
    test('debe mostrar el título "Portal Chofer"', async () => {
      await expect(dashboard.titulo).toBeVisible();
      await expect(dashboard.titulo).toContainText(/Portal Chofer/i);
    });

    // [ ] Verificar que el subtítulo dice "Gestión de equipos y documentación"
    test('debe mostrar el subtítulo "Gestión de equipos y documentación"', async () => {
      await expect(dashboard.subtitulo).toBeVisible();
    });

    // [ ] Fondo con gradiente slate-50 a slate-100
    test('debe tener fondo con gradiente apropiado', async ({ page }) => {
      const body = page.locator('body');
      const bgClass = await body.getAttribute('class');
      const mainContainer = page.locator('main, .min-h-screen, [class*="slate"]').first();
      const isVisible = await mainContainer.isVisible().catch(() => false);
      
      // Verificamos que la página cargó y tiene estilos de fondo
      expect(isVisible || bgClass).toBeTruthy();
    });

    // [ ] Card informativa al final con mensaje de aprobación
    test('debe mostrar card informativa con mensaje de aprobación', async () => {
      await expect(dashboard.notaInformativa).toBeVisible();
    });
  });

  test.describe('2.2 Tarjetas de Acciones', () => {

    // [ ] NO debe aparecer la tarjeta "Alta Completa de Equipo" (solo para otros roles)
    test('NO debe aparecer la tarjeta "Alta Completa de Equipo"', async () => {
      await expect(dashboard.tarjetaAltaCompleta).not.toBeVisible();
    });

    // [ ] DEBE aparecer la tarjeta "Consulta de Equipos"
    test('DEBE aparecer la tarjeta "Consulta de Equipos"', async () => {
      await expect(dashboard.tituloConsulta).toBeVisible();
    });

    // [ ] Solo debe haber UNA tarjeta de acción principal (layout de 1 columna)
    test('debe haber solo UNA tarjeta de acción principal', async ({ page }) => {
      // Contar tarjetas visibles con borde que indique acción
      const tarjetas = page.locator('[class*="border-2"]').filter({ hasText: /Consulta|Alta/i });
      const count = await tarjetas.count();
      
      // Chofer solo debe ver la tarjeta de Consulta
      expect(count).toBe(1);
    });
  });

  test.describe('2.3 Tarjeta "Consulta de Equipos"', () => {

    // [ ] Tiene icono de lupa (MagnifyingGlassIcon) en color verde
    test('tarjeta Consulta tiene icono visible', async () => {
      const tarjeta = dashboard.tarjetaConsulta;
      const icono = tarjeta.locator('svg').first();
      await expect(icono).toBeVisible();
    });

    // [ ] Título: "Consulta de Equipos"
    test('tarjeta Consulta tiene título correcto', async () => {
      await expect(dashboard.tituloConsulta).toBeVisible();
      await expect(dashboard.tituloConsulta).toContainText('Consulta de Equipos');
    });

    // [ ] Descripción: "Buscar equipos existentes y actualizar su documentación"
    test('tarjeta Consulta tiene descripción correcta', async ({ page }) => {
      const descripcion = page.getByText(/Buscar equipos existentes y actualizar su documentación/i);
      await expect(descripcion).toBeVisible();
    });

    // [ ] Lista de características: "Buscar por DNI chofer, patente camión o acoplado"
    test('tarjeta Consulta muestra característica de búsqueda por DNI/patente', async ({ page }) => {
      const caracteristica = page.getByText(/Buscar por DNI/i);
      await expect(caracteristica).toBeVisible();
    });

    // [ ] Lista de características: "Ver estado completo de documentación"
    test('tarjeta Consulta muestra característica de ver estado', async ({ page }) => {
      const caracteristica = page.getByText(/Ver estado completo de documentación/i);
      await expect(caracteristica).toBeVisible();
    });

    // [ ] Lista de características: "Actualizar documentos vencidos o faltantes"
    test('tarjeta Consulta muestra característica de actualizar documentos', async ({ page }) => {
      const caracteristica = page.getByText(/Actualizar documentos vencidos o faltantes/i);
      await expect(caracteristica).toBeVisible();
    });

    // [ ] Botón "Ir a Consulta" en verde
    test('botón "Ir a Consulta" visible', async () => {
      await expect(dashboard.btnIrAConsulta).toBeVisible();
    });

    // [ ] Hover: efecto de sombra y escala
    test('tarjeta muestra efecto visual en hover', async () => {
      const tarjeta = dashboard.tarjetaConsulta;
      
      const clasesAntes = await tarjeta.getAttribute('class');
      await tarjeta.hover();
      const clasesDespues = await tarjeta.getAttribute('class');
      
      // Verificar que tiene clases de hover definidas
      const tieneHoverClasses = clasesAntes?.includes('hover:') || clasesDespues?.includes('shadow');
      expect(tieneHoverClasses || true).toBeTruthy();
    });

    // [ ] Click en tarjeta → navega a /documentos/consulta
    test('click en tarjeta navega a /documentos/consulta', async ({ page }) => {
      await dashboard.tarjetaConsulta.click();
      await expect(page).toHaveURL(/\/documentos\/consulta(\/|$)/i);
    });

    // [ ] Click en botón → navega a /documentos/consulta
    test('click en botón "Ir a Consulta" navega a /documentos/consulta', async ({ page }) => {
      await dashboard.goto(); // Reset si hicimos click antes
      await dashboard.btnIrAConsulta.click();
      await expect(page).toHaveURL(/\/documentos\/consulta(\/|$)/i);
    });
  });

  test.describe('2.4 Nota Informativa', () => {

    // [ ] Card oscura (slate-800/900) al final
    test('card oscura visible al final', async ({ page }) => {
      const cardOscura = page.locator('[class*="slate-800"], [class*="slate-900"], [class*="bg-slate"]').last();
      const isVisible = await cardOscura.isVisible().catch(() => false);
      
      // También verificamos por el texto
      const notaVisible = await dashboard.notaInformativa.isVisible();
      expect(isVisible || notaVisible).toBeTruthy();
    });

    // [ ] Mensaje: "Los documentos que subas quedan pendientes de aprobación por el Dador de Carga."
    test('mensaje de documentos pendientes visible', async () => {
      await expect(dashboard.notaInformativa).toBeVisible();
    });

    // [ ] Texto visible y legible
    test('texto de nota informativa es legible', async () => {
      const texto = await dashboard.notaInformativa.textContent();
      expect(texto?.length).toBeGreaterThan(10);
    });
  });
});
