/**
 * Proposito: validar idempotencia ante doble confirmacion/accion repetida sobre remitos.
 */

import { expect, test } from '@playwright/test';
import { createMockRemito, createRemitosResponse, type MockRemito } from '../../helpers/remitos-mock.helper';

test.describe('REM-E2E-011 - Doble confirmacion / accion repetida', () => {
  test('debe enviar una sola aprobacion aunque se intente doble click', async ({ page }) => {
    let currentRemito: MockRemito = createMockRemito({
      id: 9_011,
      numeroRemito: 'REM-011-QA',
      estado: 'PENDIENTE_APROBACION',
    });
    let approveCalls = 0;

    await page.route('**/api/remitos**', async (route) => {
      const request = route.request();
      const url = request.url();
      const method = request.method().toUpperCase();

      if (method === 'GET' && /\/api\/remitos(\?.*)?$/.test(url)) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(createRemitosResponse([currentRemito])),
        });
        return;
      }

      if (method === 'GET' && /\/api\/remitos\/9011$/.test(url)) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, data: currentRemito }),
        });
        return;
      }

      if (method === 'POST' && /\/api\/remitos\/9011\/approve$/.test(url)) {
        approveCalls += 1;

        if (approveCalls > 1) {
          await route.fulfill({
            status: 409,
            contentType: 'application/json',
            body: JSON.stringify({ success: false, message: 'Remito ya aprobado' }),
          });
          return;
        }

        currentRemito = {
          ...currentRemito,
          estado: 'APROBADO',
          aprobadoAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, message: 'Remito aprobado' }),
        });
        return;
      }

      await route.continue();
    });

    await page.goto('/remitos', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('h1').filter({ hasText: /Remitos/i }).first()).toBeVisible();

    const firstCard = page.locator('div[role="button"]').first();
    await expect(firstCard).toBeVisible();
    await firstCard.click();
    await expect(page.getByText(/Datos del Remito/i).first()).toBeVisible();

    const approveButton = page.getByRole('button', { name: /Aprobar/i }).first();
    await expect(approveButton).toBeVisible();

    await Promise.allSettled([approveButton.click(), approveButton.click()]);
    await page.waitForTimeout(500);

    expect(approveCalls).toBe(1);
    expect(currentRemito.estado).toBe('APROBADO');
  });
});
