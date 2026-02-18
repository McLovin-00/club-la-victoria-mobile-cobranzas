/**
 * Proposito: validar reglas de rechazo de remito para motivo vacio, invalido y valido.
 */

import { expect, test } from '@playwright/test';
import { createMockRemito, createRemitosResponse, type MockRemito } from '../../helpers/remitos-mock.helper';

test.describe('REM-E2E-007 - Rechazo de remito con motivo', () => {
  test('debe exigir motivo valido y permitir rechazo cuando el motivo es correcto', async ({ page }) => {
    let currentRemito: MockRemito = createMockRemito({
      id: 9_007,
      numeroRemito: 'REM-007-QA',
      estado: 'PENDIENTE_APROBACION',
      motivoRechazo: null,
    });
    let lastRejectMotivo: string | null = null;

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

      if (method === 'GET' && /\/api\/remitos\/9007$/.test(url)) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, data: currentRemito }),
        });
        return;
      }

      if (method === 'POST' && /\/api\/remitos\/9007\/reject$/.test(url)) {
        const payload = (request.postDataJSON?.() ?? {}) as { motivo?: string };
        const motivo = payload.motivo?.trim() ?? '';
        lastRejectMotivo = motivo;

        if (motivo.length < 5) {
          await route.fulfill({
            status: 400,
            contentType: 'application/json',
            body: JSON.stringify({ success: false, message: 'Motivo invalido' }),
          });
          return;
        }

        currentRemito = {
          ...currentRemito,
          estado: 'RECHAZADO',
          motivoRechazo: motivo,
          rechazadoAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, message: 'Remito rechazado' }),
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
    await page.getByRole('button', { name: /Rechazar/i }).click();

    const rejectConfirmButton = page.getByRole('button', { name: /Confirmar Rechazo/i }).first();
    const motivoInput = page.getByPlaceholder(/Motivo del rechazo/i).first();

    await expect(motivoInput).toBeVisible();
    await expect(rejectConfirmButton).toBeDisabled();

    await motivoInput.fill('abc');
    await expect(rejectConfirmButton).toBeDisabled();

    const validMotivo = 'Motivo valido de rechazo QA';
    await motivoInput.fill(validMotivo);
    await expect(rejectConfirmButton).toBeEnabled();
    await rejectConfirmButton.click();

    await expect(page.getByPlaceholder(/Motivo del rechazo/i)).toHaveCount(0);
    await expect(page.getByRole('button', { name: /Rechazar/i })).toHaveCount(0);
    await expect(page.getByRole('button', { name: /Aprobar/i })).toHaveCount(0);
    expect(lastRejectMotivo).toBe(validMotivo);
    expect(currentRemito.estado).toBe('RECHAZADO');
    expect(currentRemito.motivoRechazo).toBe(validMotivo);
  });
});
