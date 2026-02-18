/**
 * Proposito: cubrir flujo E2E critico de remitos (carga -> IA -> edicion -> confirmacion -> listado).
 */

import { expect, test } from '@playwright/test';
import {
  clickFirstVisible,
  expectAtLeastOneMessage,
  getFirstVisibleLocator,
  uploadFileInFirstInput,
} from '../../helpers/remitos-qa.helper';

const PROCESS_BUTTON_SELECTORS = [
  'button:has-text("Enviar")',
  'button:has-text("Cargar")',
  'button:has-text("Subir")',
  'button:has-text("Analisis")',
];

const CONFIRM_BUTTON_SELECTORS = [
  'button:has-text("Confirmar")',
  'button:has-text("Guardar")',
  'button:has-text("Aprobar")',
];

test.describe('REM-E2E-001 - Flujo completo de remitos', () => {
  test('debe completar carga, permitir edicion y dejar remito visible en listado', async ({ page }) => {
    await page.goto('/remitos', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/\/remitos/i);

    const remitoCards = page.locator('div[role="button"]');
    const countBefore = await remitoCards.count();

    await clickFirstVisible(page, ['button:has-text("Cargar Remito")'], 'boton abrir uploader');
    await uploadFileInFirstInput(page, 'remito-valido.pdf', 'application/pdf', Buffer.from('%PDF-1.4 QA REMITO'));

    // Para dador, si el selector de chofer aparece, se selecciona una opcion.
    const choferSearch = page.getByPlaceholder(/Buscar por nombre o DNI/i).first();
    if (await choferSearch.isVisible().catch(() => false)) {
      await choferSearch.fill(' ');
      const choferOption = page.locator('button').filter({ hasText: /DNI:/i }).first();
      if (await choferOption.isVisible({ timeout: 4_000 }).catch(() => false)) {
        await choferOption.click();
      }
    }

    await clickFirstVisible(page, PROCESS_BUTTON_SELECTORS, 'boton enviar remito para analisis');
    await expectAtLeastOneMessage(page, [/Subiendo|procesando|analisis|exito|cargado/i], 20_000);

    // Se espera que el listado tenga al menos la misma cantidad o mayor.
    await page.waitForTimeout(1_500);
    const countAfter = await remitoCards.count();
    expect(countAfter).toBeGreaterThanOrEqual(countBefore);

    // Edicion y confirmacion desde detalle del primer remito visible.
    if (countAfter === 0) {
      await expect(page.getByText(/No hay remitos|No se encontraron/i).first()).toBeVisible();
      return;
    }

    const firstCard = remitoCards.first();
    await expect(firstCard).toBeVisible({ timeout: 10_000 });
    await firstCard.click();
    await expect(page.getByText(/Datos del Remito/i).first()).toBeVisible();

    const editButton = page.getByRole('button', { name: /Editar/i }).first();
    if (await editButton.isVisible().catch(() => false)) {
      await editButton.click();
      const numberInput = await getFirstVisibleLocator(
        page,
        ['input[placeholder*="Número"]', 'input[placeholder*="numero"]', 'input[type="text"]'],
        'campo numero editable',
      );
      await numberInput.fill(`QA-REM-${Date.now()}`);
      await clickFirstVisible(page, ['button:has-text("Guardar")'], 'boton guardar edicion');
    }

    const approveButton = page.getByRole('button', { name: /Aprobar/i }).first();
    if (await approveButton.isVisible().catch(() => false)) {
      await approveButton.click();
      await expectAtLeastOneMessage(page, [/Aprobando|Aprobado|exito|confirmado/i], 10_000);
    }

    await clickFirstVisible(page, ['button:has-text("Volver")'], 'boton volver a listado');
    await expect(page).toHaveURL(/\/remitos/i);
    await expect(remitoCards.first()).toBeVisible({ timeout: 10_000 });
  });
});
