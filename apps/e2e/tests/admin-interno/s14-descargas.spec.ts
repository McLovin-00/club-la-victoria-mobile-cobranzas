/**
 * Propósito: Tests del Portal Admin Interno - Sección 14 (Descargas).
 */

import { test, expect } from '@playwright/test';
import { isBaseUrlReachable } from '../helpers/reachability';
import { ConsultaPage } from '../../pages/documentos/consulta.page';

test.beforeAll(async ({ request }) => {
  const ok = await isBaseUrlReachable(request);
  test.skip(!ok, 'Ambiente de testing inaccesible (VPN/URL).');
});

test.describe('Portal Admin Interno - 14. DESCARGAS', () => {
  test('14.2 Descarga masiva: botón visible y deshabilitado sin resultados', async ({ page }) => {
    const consulta = new ConsultaPage(page);
    await consulta.goto();
    await expect(consulta.btnDescargaMasivaVigentes).toBeVisible();
    await expect(consulta.btnDescargaMasivaVigentes).toBeDisabled();
  });

  test('14.1/14.2 Descargas: después de buscar, si hay resultados se habilitan botones', async ({ page }) => {
    const consulta = new ConsultaPage(page);
    await consulta.goto();
    await consulta.btnBuscar.click();
    await consulta.esperarFinBusqueda();

    const hayResultados = (await consulta.itemsEquipo.count()) > 0;
    if (!hayResultados) test.skip(true, 'Sin resultados para validar descargas habilitadas');

    await expect(consulta.btnDescargaMasivaVigentes).toBeEnabled();
    await expect(consulta.itemsEquipo.first().getByRole('button', { name: /Bajar documentación/i })).toBeVisible();
  });
});


