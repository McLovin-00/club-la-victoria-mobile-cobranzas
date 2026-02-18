/**
 * Proposito: validar precision de filtros de listado de remitos (estado, texto y combinacion).
 */

import { expect, test } from '@playwright/test';
import { createMockRemito, type MockRemito } from '../../helpers/remitos-mock.helper';

function buildFilteredResponse(remitosBase: MockRemito[], requestUrl: string) {
  const url = new URL(requestUrl);
  const estado = url.searchParams.get('estado');
  const numeroRemito = url.searchParams.get('numeroRemito')?.trim().toLowerCase();

  let data = [...remitosBase];
  if (estado) {
    data = data.filter((item) => item.estado === estado);
  }
  if (numeroRemito) {
    data = data.filter((item) => (item.numeroRemito ?? '').toLowerCase().includes(numeroRemito));
  }

  return {
    success: true,
    data,
    pagination: {
      page: 1,
      limit: 20,
      total: data.length,
      pages: 1,
    },
    stats: {
      total: remitosBase.length,
      pendientes: remitosBase.filter((r) => r.estado === 'PENDIENTE_APROBACION').length,
      aprobados: remitosBase.filter((r) => r.estado === 'APROBADO').length,
      rechazados: remitosBase.filter((r) => r.estado === 'RECHAZADO').length,
    },
  };
}

test.describe('REM-E2E-008 - Filtros del listado', () => {
  test('debe aplicar filtros por estado y texto con resultados consistentes', async ({ page }) => {
    const remitosBase: MockRemito[] = [
      createMockRemito({ id: 8_001, numeroRemito: 'ABC-100', estado: 'PENDIENTE_APROBACION' }),
      createMockRemito({ id: 8_002, numeroRemito: 'ABC-200', estado: 'APROBADO' }),
      createMockRemito({ id: 8_003, numeroRemito: 'XYZ-300', estado: 'RECHAZADO' }),
    ];

    await page.route('**/api/remitos**', async (route) => {
      const request = route.request();
      const url = request.url();

      if (request.method().toUpperCase() === 'GET' && /\/api\/remitos(\?.*)?$/.test(url)) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(buildFilteredResponse(remitosBase, url)),
        });
        return;
      }

      await route.continue();
    });

    await page.goto('/remitos', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/\/remitos/i);

    const pendingCard = page.locator('div[role="button"]').filter({ hasText: 'ABC-100' }).first();
    await expect(pendingCard).toBeVisible();

    const searchInput = page.getByPlaceholder(/Buscar por n[úu]mero/i);
    await searchInput.fill('ABC-100');
    await expect(page.locator('div[role="button"]').filter({ hasText: 'ABC-100' }).first()).toBeVisible();
    await expect(page.locator('div[role="button"]').filter({ hasText: 'ABC-200' })).toHaveCount(0);

    await page.getByRole('button', { name: /Aprobados/i }).click();
    await expect(page.getByText(/No hay remitos aprobados/i).first()).toBeVisible();

    await searchInput.fill('');
    await expect(page.locator('div[role="button"]').filter({ hasText: 'ABC-200' }).first()).toBeVisible();

    await page.getByRole('button', { name: /Total/i }).click();

    const allCards = page.locator('div[role="button"]');
    await expect(allCards).toHaveCount(3);
  });
});
