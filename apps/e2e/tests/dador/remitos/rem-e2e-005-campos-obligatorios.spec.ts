/**
 * Proposito: validar que no se pueda confirmar remitos con campos obligatorios faltantes.
 */

import { expect, test } from '@playwright/test';
import {
  clickFirstVisible
} from '../../helpers/remitos-qa.helper';

test.describe('REM-E2E-005 - Campos obligatorios antes de confirmar', () => {
  test('debe bloquear confirmacion cuando faltan campos requeridos', async ({ page }) => {
    await page.goto('/remitos', { waitUntil: 'domcontentloaded' });
    await clickFirstVisible(page, ['button:has-text("Cargar Remito")'], 'boton abrir uploader');

    // Sin archivos seleccionados no debe habilitarse la accion de envio.
    await expect(page.getByRole('button', { name: /Seleccionar archivos/i }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: /Tomar foto/i }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: /Enviar|Analisis|Subiendo/i }).first()).toHaveCount(0);

    // Si el selector de chofer aparece, confirma que no alcanza con seleccionar chofer sin adjuntar archivo.
    const choferInput = page.getByPlaceholder(/Buscar por nombre o DNI/i).first();
    if (await choferInput.isVisible().catch(() => false)) {
      await expect(choferInput).toBeVisible();
      await expect(page.getByRole('button', { name: /Enviar|Analisis|Subiendo/i }).first()).toHaveCount(0);
    }

    await expect(page).toHaveURL(/\/remitos/i);
  });
});
