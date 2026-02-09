/**
 * Propósito: Tests del Portal Admin Interno - Sección 5 (Detalle /documentos/aprobacion/:id).
 * Depende de que exista al menos 1 documento pendiente.
 */

import { test, expect } from '@playwright/test';
import { isBaseUrlReachable } from '../helpers/reachability';
import { AprobacionQueuePage } from '../../pages/documentos/aprobacionQueue.page';
import { AprobacionDetallePage } from '../../pages/documentos/aprobacionDetalle.page';

test.beforeAll(async ({ request }) => {
  const ok = await isBaseUrlReachable(request);
  test.skip(!ok, 'Ambiente de testing inaccesible (VPN/URL).');
});

test.describe('Portal Admin Interno - 5. DETALLE DE APROBACIÓN', () => {
  test('5.1 Navegación: desde cola, "Revisar" abre el detalle', async ({ page }) => {
    const cola = new AprobacionQueuePage(page);
    await cola.goto();

    const count = await cola.linkRevisar.count();
    if (count === 0) test.skip(true, 'No hay documentos pendientes para abrir detalle');

    await cola.linkRevisar.first().click();
    await expect(page).toHaveURL(/\/documentos\/aprobacion\/\d+/i);

    const detalle = new AprobacionDetallePage(page);
    await expect(detalle.btnVolver).toBeVisible();
  });

  test.skip('5.5 Aprobar: aprobar documento (destructivo)', async () => {});
  test.skip('5.6 Rechazar: rechazar documento (destructivo)', async () => {});
});


