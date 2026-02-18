/**
 * Proposito: validar consistencia al refrescar la pantalla durante edicion de un remito.
 */

import { expect, test } from '@playwright/test';
import { createMockRemito, createRemitosResponse, type MockRemito } from '../../helpers/remitos-mock.helper';

test.describe('REM-E2E-012 - Refresh durante edicion', () => {
  test('debe descartar cambios no guardados y volver a estado consistente tras refresh', async ({ page }) => {
    const currentRemito: MockRemito = createMockRemito({
      id: 9_012,
      numeroRemito: 'REM-012-BASE',
      estado: 'PENDIENTE_APROBACION',
    });
    const unsavedNumero = 'REM-012-UNSAVED';

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

      if (method === 'GET' && /\/api\/remitos\/9012$/.test(url)) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, data: currentRemito }),
        });
        return;
      }

      if (method === 'PATCH' && /\/api\/remitos\/9012$/.test(url)) {
        // Este caso no deberia ocurrir en este test, porque no se guarda.
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ success: false, message: 'No deberia guardar en este escenario' }),
        });
        return;
      }

      await route.continue();
    });

    await page.goto('/remitos', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('div[role="button"]').filter({ hasText: 'REM-012-BASE' }).first()).toBeVisible();

    await page.locator('div[role="button"]').filter({ hasText: 'REM-012-BASE' }).first().click();
    await expect(page.getByText(/Datos del Remito/i).first()).toBeVisible();

    const editButton = page.getByRole('button', { name: /Editar/i }).first();
    await expect(editButton).toBeVisible();
    await editButton.click();

    const numeroInput = page.getByPlaceholder(/Numero de remito|Número de remito/i).first();
    await expect(numeroInput).toBeVisible();
    await numeroInput.fill(unsavedNumero);
    await expect(numeroInput).toHaveValue(unsavedNumero);

    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/\/remitos/i);

    await expect(page.locator('div[role="button"]').filter({ hasText: 'REM-012-BASE' }).first()).toBeVisible();
    await expect(page.locator('div[role="button"]').filter({ hasText: unsavedNumero })).toHaveCount(0);
  });
});
