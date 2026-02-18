/**
 * Proposito: validar exportacion Excel de remitos con chequeos de contenido basico.
 */

import { readFileSync } from 'node:fs';
import AdmZip from 'adm-zip';
import { expect, test } from '@playwright/test';
import { createTestRemito } from '../../helpers/remitos.helper';
import { downloadFromFirstVisibleButton, getFirstVisibleLocator } from '../../helpers/remitos-qa.helper';

const EXCEL_BUTTON_SELECTORS = [
  'button[title*="Exportar"]',
  'button:has-text("Exportar")',
  'button:has-text("Descargar Excel")',
  'button:has-text("Exportar Excel")',
  'button:has-text("Excel")',
];

/**
 * Extrae texto legible de un XML simple para validar contenido exportado.
 */
function xmlToText(xml: string): string {
  return xml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

test.describe('REM-E2E-002 - Exportacion Excel de remitos', () => {
  test('debe descargar excel valido con headers y datos de remito', async ({ page, request }) => {
    const uniqueNumber = `QA-XLS-${Date.now()}`;

    await createTestRemito(request, {
      numero: uniqueNumber,
      estado: 'APROBADO',
    });

    await page.goto('/remitos', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/\/remitos/i);

    // Si existe buscador, filtra por el remito creado para acotar datos.
    const searchInput = await getFirstVisibleLocator(
      page,
      ['input[placeholder*="Buscar"]', 'input[name*="search"]', 'input[type="search"]'],
      'buscador de remitos',
      3_000,
    ).catch(() => null);

    if (searchInput) {
      await searchInput.fill(uniqueNumber);
      await searchInput.press('Enter').catch(() => {});
    }

    // Paso 1: abrir modal de exportacion.
    await getFirstVisibleLocator(page, EXCEL_BUTTON_SELECTORS, 'boton abrir exportacion').then((button) => button.click());
    await expect(page.getByText(/Exportar Remitos a Excel/i).first()).toBeVisible();

    // Paso 2: confirmar exportacion y descargar archivo.
    const download = await downloadFromFirstVisibleButton(
      page,
      ['button:has-text("Exportar Excel")', 'button:has-text("Exportar")'],
      'boton confirmar exportacion',
    );
    const fileName = download.suggestedFilename();
    expect(fileName.toLowerCase()).toMatch(/\.xlsx?$|excel/i);
    expect(fileName.toLowerCase().endsWith('.zip')).toBeFalsy();

    const downloadedPath = await download.path();
    expect(downloadedPath).toBeTruthy();
    if (!downloadedPath) {
      throw new Error('No se obtuvo ruta de descarga del archivo Excel.');
    }

    const buffer = readFileSync(downloadedPath);
    expect(buffer.length).toBeGreaterThan(128);

    // Validaciones de estructura XLSX (zip OpenXML).
    const zip = new AdmZip(buffer);
    const entries = zip.getEntries().map((entry) => entry.entryName);
    expect(entries).toContain('xl/workbook.xml');
    expect(entries.some((entry) => entry.startsWith('xl/worksheets/'))).toBeTruthy();

    const sharedStringsEntry = zip.getEntry('xl/sharedStrings.xml');
    const sheetEntry = entries
      .map((name) => zip.getEntry(name))
      .find((entry) => entry?.entryName.startsWith('xl/worksheets/'));

    const sharedText = sharedStringsEntry
      ? xmlToText(sharedStringsEntry.getData().toString('utf8'))
      : '';
    const sheetText = sheetEntry ? xmlToText(sheetEntry.getData().toString('utf8')) : '';
    const combinedText = `${sharedText} ${sheetText}`;

    // Headers minimos esperados en export de remitos.
    expect(combinedText).toMatch(/Numero|N[°º]|Fecha|Estado/i);
    // Debe existir al menos una fila de datos exportados (ademas de los encabezados).
    const dataRows = combinedText.match(/\d{4}-\d{4,}|\d{1,2}\/\d{1,2}\/\d{4}/g) ?? [];
    expect(dataRows.length).toBeGreaterThan(0);
  });
});
