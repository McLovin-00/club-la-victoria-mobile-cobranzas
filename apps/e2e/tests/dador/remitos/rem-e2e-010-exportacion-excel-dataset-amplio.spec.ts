/**
 * Proposito: validar exportacion Excel estable con dataset amplio de remitos.
 */

import AdmZip from 'adm-zip';
import { expect, test } from '@playwright/test';
import { buildMockXlsx } from '../../helpers/excel-mock.helper';
import { downloadFromFirstVisibleButton } from '../../helpers/remitos-qa.helper';

function xmlToText(xml: string): string {
  return xml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

test.describe('REM-E2E-010 - Exportacion Excel dataset amplio', () => {
  test('debe descargar excel consistente con alto volumen de filas', async ({ page }) => {
    const headers = ['Nº Remito', 'Fecha Operacion', 'Estado'];
    const rows = Array.from({ length: 250 }, (_, index) => [
      `REM-AMP-${String(index + 1).padStart(4, '0')}`,
      '2026-02-18',
      index % 2 === 0 ? 'APROBADO' : 'PENDIENTE_APROBACION',
    ]);
    const wideWorkbook = buildMockXlsx(headers, rows);

    await page.route('**/api/remitos**', async (route) => {
      const request = route.request();
      const url = request.url();
      const method = request.method().toUpperCase();

      if (method === 'GET' && /\/api\/remitos\/export(\?.*)?$/.test(url)) {
        await route.fulfill({
          status: 200,
          headers: {
            'content-type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'content-disposition': 'attachment; filename="remitos_amplio.xlsx"',
          },
          body: wideWorkbook,
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
            stats: { total: 250, pendientes: 125, aprobados: 125, rechazados: 0 },
          }),
        });
        return;
      }

      await route.continue();
    });

    await page.goto('/remitos', { waitUntil: 'domcontentloaded' });
    await page.getByRole('button', { name: /^Exportar$/i }).first().click();
    await expect(page.getByText(/Exportar Remitos a Excel/i).first()).toBeVisible();

    const download = await downloadFromFirstVisibleButton(
      page,
      ['button:has-text("Exportar Excel")'],
      'boton confirmar exportacion amplia',
    );

    const filename = download.suggestedFilename().toLowerCase();
    expect(filename).toContain('remitos');
    expect(filename.endsWith('.xlsx') || filename.endsWith('.xls')).toBeTruthy();

    const downloadedPath = await download.path();
    expect(downloadedPath).toBeTruthy();
    if (!downloadedPath) {
      throw new Error('No se obtuvo la ruta de descarga del excel amplio.');
    }

    const zip = new AdmZip(downloadedPath);
    const sheetEntry = zip.getEntry('xl/worksheets/sheet1.xml');
    const sharedEntry = zip.getEntry('xl/sharedStrings.xml');
    expect(sheetEntry).toBeTruthy();
    expect(sharedEntry).toBeTruthy();

    if (!sheetEntry || !sharedEntry) {
      throw new Error('No se encontraron entradas esperadas del XLSX amplio.');
    }

    const sheetXml = sheetEntry.getData().toString('utf8');
    const sharedText = xmlToText(sharedEntry.getData().toString('utf8'));
    const rowCount = (sheetXml.match(/<row\b/g) ?? []).length;

    // 250 filas de datos + 1 fila de encabezados.
    expect(rowCount).toBe(251);
    expect(sharedText).toMatch(/Nº Remito|Fecha Operacion|Estado/i);
    expect(sharedText).toMatch(/REM-AMP-0001/i);
    expect(sharedText).toMatch(/REM-AMP-0250/i);
  });
});
