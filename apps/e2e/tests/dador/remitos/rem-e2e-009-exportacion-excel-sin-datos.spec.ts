/**
 * Proposito: validar exportacion Excel cuando el dataset de remitos esta vacio.
 */

import AdmZip from 'adm-zip';
import { expect, test } from '@playwright/test';
import { buildMockXlsx } from '../../helpers/excel-mock.helper';
import { downloadFromFirstVisibleButton } from '../../helpers/remitos-qa.helper';

function xmlToText(xml: string): string {
  return xml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

test.describe('REM-E2E-009 - Exportacion Excel sin datos', () => {
  test('debe descargar excel valido con solo encabezados cuando no hay remitos', async ({ page }) => {
    const headers = ['Nº Remito', 'Fecha Operacion', 'Estado'];
    const emptyWorkbook = buildMockXlsx(headers, []);

    await page.route('**/api/remitos**', async (route) => {
      const request = route.request();
      const url = request.url();
      const method = request.method().toUpperCase();

      if (method === 'GET' && /\/api\/remitos\/export(\?.*)?$/.test(url)) {
        await route.fulfill({
          status: 200,
          headers: {
            'content-type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'content-disposition': 'attachment; filename="remitos_vacio.xlsx"',
          },
          body: emptyWorkbook,
        });
        return;
      }

      if (method === 'GET' && /\/api\/remitos(\?.*)?$/.test(url)) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: [],
            pagination: { page: 1, limit: 20, total: 0, pages: 1 },
            stats: { total: 0, pendientes: 0, aprobados: 0, rechazados: 0 },
          }),
        });
        return;
      }

      await route.continue();
    });

    await page.goto('/remitos', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText(/No hay remitos/i).first()).toBeVisible();

    await page.getByRole('button', { name: /^Exportar$/i }).first().click();
    await expect(page.getByText(/Exportar Remitos a Excel/i).first()).toBeVisible();

    const download = await downloadFromFirstVisibleButton(
      page,
      ['button:has-text("Exportar Excel")'],
      'boton confirmar exportacion sin datos',
    );

    const filename = download.suggestedFilename().toLowerCase();
    expect(filename).toContain('remitos');
    expect(filename.endsWith('.xlsx') || filename.endsWith('.xls')).toBeTruthy();

    const downloadedPath = await download.path();
    expect(downloadedPath).toBeTruthy();
    if (!downloadedPath) {
      throw new Error('No se obtuvo la ruta de descarga del excel sin datos.');
    }

    const zip = new AdmZip(downloadedPath);
    const sheetEntry = zip.getEntry('xl/worksheets/sheet1.xml');
    const sharedEntry = zip.getEntry('xl/sharedStrings.xml');
    expect(sheetEntry).toBeTruthy();
    expect(sharedEntry).toBeTruthy();

    if (!sheetEntry || !sharedEntry) {
      throw new Error('No se encontraron entradas esperadas de XLSX.');
    }

    const sheetXml = sheetEntry.getData().toString('utf8');
    const sharedText = xmlToText(sharedEntry.getData().toString('utf8'));
    const rowCount = (sheetXml.match(/<row\b/g) ?? []).length;

    expect(rowCount).toBe(1);
    expect(sharedText).toMatch(/Remito|Fecha|Estado/i);
  });
});
