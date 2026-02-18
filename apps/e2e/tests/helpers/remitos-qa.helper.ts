/**
 * Proposito: helpers reutilizables para pruebas E2E de QA del modulo de remitos.
 */

import { expect, type Download, type Locator, type Page } from '@playwright/test';

/**
 * Devuelve el primer locator visible de una lista de selectores.
 */
export async function getFirstVisibleLocator(
  page: Page,
  selectors: readonly string[],
  alias: string,
  timeoutMs = 10_000,
): Promise<Locator> {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    for (const selector of selectors) {
      const locator = page.locator(selector);
      const count = await locator.count().catch(() => 0);
      for (let index = 0; index < count; index++) {
        const candidate = locator.nth(index);
        const isVisible = await candidate.isVisible().catch(() => false);
        if (isVisible) {
          return candidate;
        }
      }
    }
    await page.waitForTimeout(200);
  }

  throw new Error(`No se encontro un elemento visible para "${alias}".`);
}

/**
 * Hace click en el primer elemento visible de una lista de selectores.
 */
export async function clickFirstVisible(
  page: Page,
  selectors: readonly string[],
  alias: string,
): Promise<void> {
  const locator = await getFirstVisibleLocator(page, selectors, alias);
  await locator.click();
}

/**
 * Carga un archivo en el primer input file visible.
 */
export async function uploadFileInFirstInput(
  page: Page,
  fileName: string,
  mimeType: string,
  buffer: Buffer,
): Promise<void> {
  const fileInputSelector = 'input[type="file"]';
  const count = await page.locator(fileInputSelector).count().catch(() => 0);
  if (count === 0) {
    throw new Error('No se encontro input file para carga de remito.');
  }
  await page.setInputFiles(fileInputSelector, {
    name: fileName,
    mimeType,
    buffer,
  });
}

/**
 * Espera una descarga despues de hacer click en un boton visible.
 */
export async function downloadFromFirstVisibleButton(
  page: Page,
  selectors: readonly string[],
  alias: string,
  timeoutMs = 20_000,
): Promise<Download> {
  const button = await getFirstVisibleLocator(page, selectors, alias);
  const downloadPromise = page.waitForEvent('download', { timeout: timeoutMs });
  await button.click();
  return await downloadPromise;
}

/**
 * Verifica que se muestre al menos un mensaje esperado.
 */
export async function expectAtLeastOneMessage(
  page: Page,
  regexMessages: readonly RegExp[],
  timeoutMs = 6_000,
): Promise<void> {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    for (const pattern of regexMessages) {
      const locator = page.getByText(pattern).first();
      const isVisible = await locator.isVisible().catch(() => false);
      if (isVisible) {
        await expect(locator).toBeVisible();
        return;
      }
    }
    await page.waitForTimeout(200);
  }

  throw new Error('No se encontro ninguno de los mensajes esperados.');
}
