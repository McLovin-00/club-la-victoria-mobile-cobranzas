/**
 * Propósito: Tests del Portal Admin Interno - Sección 15 (Paginación).
 */

import { test, expect } from '@playwright/test';
import { isBaseUrlReachable } from '../helpers/reachability';
import { ConsultaPage } from '../../pages/documentos/consulta.page';

test.beforeAll(async ({ request }) => {
  const ok = await isBaseUrlReachable(request);
  test.skip(!ok, 'Ambiente de testing inaccesible (VPN/URL).');
});

test.describe('Portal Admin Interno - 15. PAGINACIÓN', () => {
  test('Controles: si hay paginación, muestra Mostrando / Página y botones', async ({ page }) => {
    const consulta = new ConsultaPage(page);
    await consulta.goto();
    await consulta.btnBuscar.click();
    await consulta.esperarFinBusqueda();

    const showingVisible = await consulta.txtMostrando.isVisible().catch(() => false);
    if (!showingVisible) test.skip(true, 'No hay suficientes resultados para paginación');

    await expect(consulta.txtMostrando).toBeVisible();
    await expect(consulta.txtPagina).toBeVisible();
    await expect(consulta.btnPaginaAnteriorIcon).toBeVisible();
    await expect(consulta.btnPaginaSiguienteIcon).toBeVisible();
  });
});


