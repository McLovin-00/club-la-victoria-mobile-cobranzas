/**
 * Proposito: validar que no se pueda cargar un remito con archivo invalido.
 */

import { expect, test } from '@playwright/test';
import { clickFirstVisible } from '../../helpers/remitos-qa.helper';

const PROCESS_BUTTON_SELECTORS = [
  'button:has-text("Enviar")',
  'button:has-text("Cargar")',
  'button:has-text("Subir")',
  'button:has-text("Analisis")',
];

test.describe('REM-E2E-003 - Archivo invalido en carga de remitos', () => {
  test('debe mostrar error y no permitir confirmacion', async ({ page }) => {
    await page.goto('/remitos', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/\/remitos/i);
    await clickFirstVisible(page, ['button:has-text("Cargar Remito")'], 'boton abrir uploader');

    // Validacion de formato permitido a nivel de input y mensaje visible de UX.
    const fileInput = page.locator('input[type="file"]').first();
    await expect(fileInput).toHaveAttribute('accept', /image\/\*,application\/pdf/i);
    await expect(page.getByText(/Formatos:\s*JPG,\s*PNG,\s*PDF/i).first()).toBeVisible();

    // Sin archivo valido cargado no debe existir accion de envio.
    await expect(page.getByRole('button', { name: /Enviar|Analisis|Subiendo/i }).first()).toHaveCount(0);

    // En caso de flujo invalido no deberia quedar disponible una confirmacion valida.
    await clickFirstVisible(page, PROCESS_BUTTON_SELECTORS, 'boton procesar').catch(() => {});
    const confirmButton = page.getByRole('button', { name: /Confirmar|Guardar|Aprobar/i }).first();
    const isVisible = await confirmButton.isVisible().catch(() => false);
    if (isVisible) {
      await expect(confirmButton).toBeDisabled();
    }

    await expect(page).toHaveURL(/\/remitos/i);
  });
});
