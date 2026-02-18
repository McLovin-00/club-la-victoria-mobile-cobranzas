/**
 * Proposito: generar archivos XLSX mock para validaciones E2E de exportacion.
 */

import AdmZip from 'adm-zip';

function columnNameFromIndex(index: number): string {
  let value = index;
  let column = '';
  while (value >= 0) {
    column = String.fromCharCode((value % 26) + 65) + column;
    value = Math.floor(value / 26) - 1;
  }
  return column;
}

/**
 * Crea un XLSX minimo con una hoja y contenido en sharedStrings.
 */
export function buildMockXlsx(headers: string[], rows: string[][]): Buffer {
  const allRows = [headers, ...rows];
  const sharedStrings = allRows.flat();

  const uniqueStrings: string[] = [];
  const indexByString = new Map<string, number>();
  for (const value of sharedStrings) {
    if (!indexByString.has(value)) {
      indexByString.set(value, uniqueStrings.length);
      uniqueStrings.push(value);
    }
  }

  const sheetRowsXml = allRows
    .map((row, rowIndex) => {
      const rowNumber = rowIndex + 1;
      const cells = row
        .map((value, colIndex) => {
          const col = columnNameFromIndex(colIndex);
          const cellRef = `${col}${rowNumber}`;
          const sharedIndex = indexByString.get(value);
          return `<c r="${cellRef}" t="s"><v>${sharedIndex}</v></c>`;
        })
        .join('');
      return `<row r="${rowNumber}">${cells}</row>`;
    })
    .join('');

  const worksheetXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <sheetData>${sheetRowsXml}</sheetData>
</worksheet>`;

  const workbookXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets>
    <sheet name="Remitos" sheetId="1" r:id="rId1"/>
  </sheets>
</workbook>`;

  const sharedStringsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="${sharedStrings.length}" uniqueCount="${uniqueStrings.length}">
  ${uniqueStrings.map((value) => `<si><t>${escapeXml(value)}</t></si>`).join('')}
</sst>`;

  const contentTypesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/xl/sharedStrings.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml"/>
</Types>`;

  const rootRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`;

  const workbookRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/sharedStrings" Target="sharedStrings.xml"/>
</Relationships>`;

  const zip = new AdmZip();
  zip.addFile('[Content_Types].xml', Buffer.from(contentTypesXml, 'utf8'));
  zip.addFile('_rels/.rels', Buffer.from(rootRelsXml, 'utf8'));
  zip.addFile('xl/workbook.xml', Buffer.from(workbookXml, 'utf8'));
  zip.addFile('xl/_rels/workbook.xml.rels', Buffer.from(workbookRelsXml, 'utf8'));
  zip.addFile('xl/worksheets/sheet1.xml', Buffer.from(worksheetXml, 'utf8'));
  zip.addFile('xl/sharedStrings.xml', Buffer.from(sharedStringsXml, 'utf8'));

  return zip.toBuffer();
}

function escapeXml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}
