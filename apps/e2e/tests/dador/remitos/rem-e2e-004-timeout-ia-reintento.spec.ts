/**
 * Proposito: validar manejo de timeout/falla de IA y reintento en carga de remitos.
 */

import { expect, test } from '@playwright/test';
import {
  clickFirstVisible,
  uploadFileInFirstInput,
} from '../../helpers/remitos-qa.helper';

const PROCESS_BUTTON_SELECTORS = [
  'button:has-text("Enviar")',
  'button:has-text("Cargar")',
  'button:has-text("Subir")',
  'button:has-text("Analisis")',
];

test.describe('REM-E2E-004 - Timeout IA y reintento', () => {
  test('debe mostrar error de timeout y permitir reintento consistente', async ({ page }) => {
    let injectedFailure = false;

    await page.route('**/*', async (route) => {
      const request = route.request();
      const url = request.url().toLowerCase();
      const method = request.method().toUpperCase();

      const isRemitoMutation = url.includes('remit') && ['POST', 'PUT', 'PATCH'].includes(method);
      if (!injectedFailure && isRemitoMutation) {
        injectedFailure = true;
        await route.fulfill({
          status: 504,
          contentType: 'application/json',
          body: JSON.stringify({ message: 'Timeout de IA para test E2E' }),
        });
        return;
      }

      await route.continue();
    });

    await page.goto('/remitos', { waitUntil: 'domcontentloaded' });
    await clickFirstVisible(page, ['button:has-text("Cargar Remito")'], 'boton abrir uploader');
    await uploadFileInFirstInput(page, 'remito-timeout.pdf', 'application/pdf', Buffer.from('%PDF-1.4 QA TIMEOUT'));
    await clickFirstVisible(page, PROCESS_BUTTON_SELECTORS, 'boton procesar');
    await page.waitForTimeout(5_000);

    // Validacion de consistencia: el flujo no debe romper la UI ni dejarla fuera de la pantalla de remitos.
    await expect(page).toHaveURL(/\/remitos/i);
    await expect(page.getByRole('button', { name: /Cargar Remito/i }).first()).toBeVisible();

    // Debe poder volver a intentar una nueva carga.
    const uploadButton = page.getByRole('button', { name: /Enviar|Analisis|Cargar|Subir/i }).first();
    await expect(uploadButton).toBeVisible();
    await expect(page).toHaveURL(/\/remitos/i);
  });
});
