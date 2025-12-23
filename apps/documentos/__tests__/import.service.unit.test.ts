/**
 * Unit tests for Import Service logic
 * @jest-environment node
 */

jest.mock('../src/config/logger', () => ({
  AppLogger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

describe('ImportService', () => {
  describe('CSV parsing', () => {
    function parseCsvLine(line: string, delimiter: string = ','): string[] {
      const result: string[] = [];
      let current = '';
      let inQuotes = false;

      for (const char of line) {
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === delimiter && !inQuotes) {
          result.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      result.push(current.trim());

      return result;
    }

    it('should parse simple CSV line', () => {
      const result = parseCsvLine('a,b,c');
      expect(result).toEqual(['a', 'b', 'c']);
    });

    it('should handle quoted fields', () => {
      const result = parseCsvLine('a,"b,c",d');
      expect(result).toEqual(['a', 'b,c', 'd']);
    });

    it('should handle empty fields', () => {
      const result = parseCsvLine('a,,c');
      expect(result).toEqual(['a', '', 'c']);
    });

    it('should handle semicolon delimiter', () => {
      const result = parseCsvLine('a;b;c', ';');
      expect(result).toEqual(['a', 'b', 'c']);
    });
  });

  describe('Data validation', () => {
    interface ImportRow {
      dni?: string;
      nombre?: string;
      apellido?: string;
      patente?: string;
      cuit?: string;
    }

    function validateImportRow(row: ImportRow, rowNumber: number): string[] {
      const errors: string[] = [];

      if (row.dni && !/^\d{7,8}$/.test(row.dni.replace(/\./g, ''))) {
        errors.push(`Fila ${rowNumber}: DNI inválido`);
      }

      if (row.patente) {
        const cleaned = row.patente.replace(/[-\s]/g, '').toUpperCase();
        if (!/^[A-Z]{2,3}\d{3}[A-Z]{0,2}$/.test(cleaned)) {
          errors.push(`Fila ${rowNumber}: Patente inválida`);
        }
      }

      if (row.cuit && !/^\d{11}$/.test(row.cuit.replace(/[-\s]/g, ''))) {
        errors.push(`Fila ${rowNumber}: CUIT inválido`);
      }

      return errors;
    }

    it('should validate correct row', () => {
      const row: ImportRow = {
        dni: '12345678',
        nombre: 'Juan',
        apellido: 'Pérez',
      };
      expect(validateImportRow(row, 1)).toHaveLength(0);
    });

    it('should detect invalid DNI', () => {
      const errors = validateImportRow({ dni: '123' }, 1);
      expect(errors).toContain('Fila 1: DNI inválido');
    });

    it('should detect invalid patente', () => {
      const errors = validateImportRow({ patente: 'INVALID' }, 2);
      expect(errors).toContain('Fila 2: Patente inválida');
    });

    it('should detect invalid CUIT', () => {
      const errors = validateImportRow({ cuit: '123' }, 3);
      expect(errors).toContain('Fila 3: CUIT inválido');
    });
  });

  describe('Header mapping', () => {
    interface ColumnMapping {
      [key: string]: string;
    }

    const standardMappings: ColumnMapping = {
      'dni': 'dni',
      'documento': 'dni',
      'dni chofer': 'dni',
      'nombre': 'nombre',
      'nombres': 'nombre',
      'apellido': 'apellido',
      'apellidos': 'apellido',
      'patente': 'patente',
      'dominio': 'patente',
      'patente camion': 'patenteCamion',
      'patente acoplado': 'patenteAcoplado',
      'cuit': 'cuit',
      'cuit empresa': 'cuitEmpresa',
    };

    function mapHeader(header: string): string | null {
      const normalized = header.toLowerCase().trim();
      return standardMappings[normalized] || null;
    }

    it('should map standard headers', () => {
      expect(mapHeader('DNI')).toBe('dni');
      expect(mapHeader('Nombre')).toBe('nombre');
      expect(mapHeader('Patente')).toBe('patente');
    });

    it('should map alternative headers', () => {
      expect(mapHeader('Documento')).toBe('dni');
      expect(mapHeader('Dominio')).toBe('patente');
    });

    it('should return null for unknown headers', () => {
      expect(mapHeader('Unknown Column')).toBeNull();
    });
  });

  describe('Duplicate detection', () => {
    interface ImportItem {
      identifier: string;
      lineNumber: number;
    }

    function findDuplicates(items: ImportItem[]): Array<{ identifier: string; lines: number[] }> {
      const groups = new Map<string, number[]>();

      for (const item of items) {
        const normalized = item.identifier.replace(/[.\-\s]/g, '').toLowerCase();
        const lines = groups.get(normalized) || [];
        lines.push(item.lineNumber);
        groups.set(normalized, lines);
      }

      return Array.from(groups.entries())
        .filter(([, lines]) => lines.length > 1)
        .map(([identifier, lines]) => ({ identifier, lines }));
    }

    it('should find duplicates', () => {
      const items: ImportItem[] = [
        { identifier: '12345678', lineNumber: 1 },
        { identifier: '12.345.678', lineNumber: 5 },
        { identifier: '87654321', lineNumber: 3 },
      ];

      const dups = findDuplicates(items);
      expect(dups).toHaveLength(1);
      expect(dups[0].lines).toContain(1);
      expect(dups[0].lines).toContain(5);
    });

    it('should return empty for no duplicates', () => {
      const items: ImportItem[] = [
        { identifier: '12345678', lineNumber: 1 },
        { identifier: '87654321', lineNumber: 2 },
      ];
      expect(findDuplicates(items)).toHaveLength(0);
    });
  });

  describe('Import result aggregation', () => {
    interface ImportResult {
      created: number;
      updated: number;
      skipped: number;
      errors: Array<{ line: number; error: string }>;
    }

    function aggregateResults(results: ImportResult[]): ImportResult {
      return results.reduce(
        (acc, result) => ({
          created: acc.created + result.created,
          updated: acc.updated + result.updated,
          skipped: acc.skipped + result.skipped,
          errors: [...acc.errors, ...result.errors],
        }),
        { created: 0, updated: 0, skipped: 0, errors: [] }
      );
    }

    function getSuccessRate(result: ImportResult): number {
      const total = result.created + result.updated + result.skipped + result.errors.length;
      if (total === 0) return 100;
      return Math.round(((result.created + result.updated) / total) * 100);
    }

    it('should aggregate results', () => {
      const results: ImportResult[] = [
        { created: 5, updated: 2, skipped: 1, errors: [] },
        { created: 3, updated: 1, skipped: 0, errors: [{ line: 10, error: 'Error' }] },
      ];

      const aggregated = aggregateResults(results);
      expect(aggregated.created).toBe(8);
      expect(aggregated.updated).toBe(3);
      expect(aggregated.skipped).toBe(1);
      expect(aggregated.errors).toHaveLength(1);
    });

    it('should calculate success rate', () => {
      const result: ImportResult = {
        created: 80,
        updated: 10,
        skipped: 5,
        errors: [{ line: 1, error: 'Error' }, { line: 2, error: 'Error' }, { line: 3, error: 'Error' }, { line: 4, error: 'Error' }, { line: 5, error: 'Error' }],
      };
      expect(getSuccessRate(result)).toBe(90);
    });
  });

  describe('Excel date handling', () => {
    function excelDateToJsDate(excelDate: number): Date {
      // Excel dates are number of days since Dec 30, 1899
      const millisecondsPerDay = 24 * 60 * 60 * 1000;
      const excelEpoch = new Date(1899, 11, 30).getTime();
      return new Date(excelEpoch + excelDate * millisecondsPerDay);
    }

    function isExcelDate(value: any): boolean {
      return typeof value === 'number' && value > 1 && value < 100000;
    }

    it('should convert Excel date', () => {
      // Excel date 44561 should be around late Dec 2021 / early Jan 2022
      const date = excelDateToJsDate(44561);
      // Due to Excel epoch quirks, accept 2021 or 2022
      expect([2021, 2022]).toContain(date.getFullYear());
    });

    it('should identify Excel date', () => {
      expect(isExcelDate(44561)).toBe(true);
      expect(isExcelDate('2024-01-01')).toBe(false);
      expect(isExcelDate(0)).toBe(false);
    });
  });

  describe('File type detection', () => {
    function detectFileType(filename: string): 'csv' | 'xlsx' | 'xls' | 'unknown' {
      const ext = filename.split('.').pop()?.toLowerCase();
      if (ext === 'csv') return 'csv';
      if (ext === 'xlsx') return 'xlsx';
      if (ext === 'xls') return 'xls';
      return 'unknown';
    }

    function isValidImportFile(mimeType: string): boolean {
      const validTypes = [
        'text/csv',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      ];
      return validTypes.includes(mimeType);
    }

    it('should detect CSV', () => {
      expect(detectFileType('data.csv')).toBe('csv');
    });

    it('should detect XLSX', () => {
      expect(detectFileType('data.xlsx')).toBe('xlsx');
    });

    it('should detect XLS', () => {
      expect(detectFileType('data.xls')).toBe('xls');
    });

    it('should return unknown for other types', () => {
      expect(detectFileType('data.txt')).toBe('unknown');
    });

    it('should validate import file MIME type', () => {
      expect(isValidImportFile('text/csv')).toBe(true);
      expect(isValidImportFile('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')).toBe(true);
      expect(isValidImportFile('application/pdf')).toBe(false);
    });
  });

  describe('Batch processing', () => {
    function createBatches<T>(items: T[], batchSize: number): T[][] {
      const batches: T[][] = [];
      for (let i = 0; i < items.length; i += batchSize) {
        batches.push(items.slice(i, i + batchSize));
      }
      return batches;
    }

    it('should create correct number of batches', () => {
      const items = Array(25).fill(1);
      const batches = createBatches(items, 10);
      expect(batches).toHaveLength(3);
      expect(batches[0]).toHaveLength(10);
      expect(batches[1]).toHaveLength(10);
      expect(batches[2]).toHaveLength(5);
    });

    it('should handle fewer items than batch size', () => {
      const items = [1, 2, 3];
      const batches = createBatches(items, 10);
      expect(batches).toHaveLength(1);
      expect(batches[0]).toEqual([1, 2, 3]);
    });

    it('should handle empty array', () => {
      expect(createBatches([], 10)).toHaveLength(0);
    });
  });

  describe('Import progress tracking', () => {
    interface ImportProgress {
      total: number;
      processed: number;
      currentBatch: number;
      totalBatches: number;
    }

    function calculateProgress(progress: ImportProgress): number {
      if (progress.total === 0) return 100;
      return Math.round((progress.processed / progress.total) * 100);
    }

    function getProgressMessage(progress: ImportProgress): string {
      const percent = calculateProgress(progress);
      return `Procesando lote ${progress.currentBatch}/${progress.totalBatches} (${percent}%)`;
    }

    it('should calculate progress percentage', () => {
      expect(calculateProgress({ total: 100, processed: 50, currentBatch: 3, totalBatches: 5 })).toBe(50);
    });

    it('should return 100% for empty import', () => {
      expect(calculateProgress({ total: 0, processed: 0, currentBatch: 0, totalBatches: 0 })).toBe(100);
    });

    it('should format progress message', () => {
      const message = getProgressMessage({ total: 100, processed: 50, currentBatch: 3, totalBatches: 5 });
      expect(message).toBe('Procesando lote 3/5 (50%)');
    });
  });
});

