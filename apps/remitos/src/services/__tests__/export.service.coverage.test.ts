/**
 * Propósito: subir cobertura de `ExportService` (export a Excel) sin depender de ExcelJS real ni Prisma real.
 */

import { beforeAll, beforeEach, describe, expect, it, jest } from '@jest/globals';

// Mock de logger para evitar ruido en consola durante coverage
jest.mock('../../config/logger', () => ({
  AppLogger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

// Mock de DB/Prisma
const findManyMock = jest.fn() as unknown as jest.MockedFunction<(arg: unknown) => Promise<unknown[]>>;
jest.mock('../../config/database', () => ({
  db: {
    getClient: () => ({
      remito: {
        findMany: (arg: unknown) => findManyMock(arg),
      },
    }),
  },
}));

// Mock liviano de ExcelJS (Workbook/Worksheet/Row) para cubrir estilos/formatos.
class FakeCell {
  border: unknown;
}

class FakeRow {
  font: unknown;
  fill: unknown;
  alignment: unknown;
  height: number | undefined;
  private readonly cells: FakeCell[];

  constructor(cellCount: number = 3) {
    this.cells = Array.from({ length: cellCount }, () => new FakeCell());
  }

  eachCell(cb: (cell: FakeCell) => void): void {
    this.cells.forEach((c) => cb(c));
  }
}

class FakeWorksheet {
  columns: unknown;
  private readonly rows = new Map<number, FakeRow>();
  private readonly columnsByKey = new Map<string, { numFmt?: string }>();

  getRow(rowNumber: number): FakeRow {
    const existing = this.rows.get(rowNumber);
    if (existing) return existing;
    const row = new FakeRow();
    this.rows.set(rowNumber, row);
    return row;
  }

  addRow(_data: unknown): FakeRow {
    const rowNumber = this.rows.size + 1;
    const row = new FakeRow();
    this.rows.set(rowNumber, row);
    return row;
  }

  addRows(_rows: unknown[]): void {
    // Solo necesitamos que exista para que el servicio no falle.
  }

  eachRow(cb: (row: FakeRow, rowNumber: number) => void): void {
    // Iterar filas ya creadas (incluye header si se pidió con getRow(1)).
    const entries = Array.from(this.rows.entries()).sort((a, b) => a[0] - b[0]);
    for (const [n, r] of entries) cb(r, n);
  }

  getColumn(key: string): { numFmt?: string } {
    const existing = this.columnsByKey.get(key);
    if (existing) return existing;
    const col = { numFmt: undefined as string | undefined };
    this.columnsByKey.set(key, col);
    return col;
  }
}

class FakeWorkbook {
  creator: string | undefined;
  created: Date | undefined;
  readonly xlsx = {
    writeBuffer: jest.fn(async () => new ArrayBuffer(3)),
  };
  private readonly sheets: FakeWorksheet[] = [];

  addWorksheet(_name: string, _opts?: unknown): FakeWorksheet {
    const sheet = new FakeWorksheet();
    this.sheets.push(sheet);
    return sheet;
  }
}

jest.mock('exceljs', () => ({
  __esModule: true,
  default: {
    Workbook: FakeWorkbook,
  },
}));

describe('ExportService (coverage)', () => {
  let ExportService: typeof import('../export.service').ExportService;

  beforeAll(async () => {
    const mod = await import('../export.service');
    ExportService = mod.ExportService;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    findManyMock.mockResolvedValue([
      {
        id: 1,
        numeroRemito: 'R-1',
        fechaOperacion: new Date('2026-01-01T00:00:00.000Z'),
        estado: 'APROBADO',
        emisorNombre: 'Emisor',
        clienteNombre: 'Cliente',
        producto: 'Prod',
        transportistaNombre: 'Transp',
        choferNombre: 'Chofer',
        choferDni: '123',
        patenteChasis: 'AAA111',
        patenteAcoplado: null,
        pesoOrigenBruto: 1000,
        pesoOrigenTara: 200,
        pesoOrigenNeto: 800,
        pesoDestinoBruto: null,
        pesoDestinoTara: null,
        pesoDestinoNeto: null,
        confianzaIA: 95,
        createdAt: new Date('2026-01-02T12:00:00.000Z'),
      },
      {
        id: 2,
        numeroRemito: null,
        fechaOperacion: null,
        estado: 'RECHAZADO',
        emisorNombre: null,
        clienteNombre: null,
        producto: null,
        transportistaNombre: null,
        choferNombre: null,
        choferDni: null,
        patenteChasis: null,
        patenteAcoplado: null,
        pesoOrigenBruto: null,
        pesoOrigenTara: null,
        pesoOrigenNeto: null,
        pesoDestinoBruto: null,
        pesoDestinoTara: null,
        pesoDestinoNeto: null,
        confianzaIA: null,
        createdAt: new Date('2026-01-03T12:00:00.000Z'),
      },
    ]);
  });

  it('exportToExcel genera un Buffer y arma whereClause con filtros', async () => {
    const result = await ExportService.exportToExcel({
      tenantEmpresaId: 10,
      dadorCargaId: 55,
      estado: 'APROBADO',
      clienteNombre: 'acme',
      transportistaNombre: 't1',
      patenteChasis: 'AAA',
      numeroRemito: 'R-',
      fechaDesde: new Date('2026-01-01T00:00:00.000Z'),
      fechaHasta: new Date('2026-01-31T00:00:00.000Z'),
    });

    expect(Buffer.isBuffer(result)).toBe(true);

    expect(findManyMock).toHaveBeenCalledTimes(1);
    const callArg = findManyMock.mock.calls[0]?.[0] as any;
    expect(callArg.where).toEqual(
      expect.objectContaining({
        tenantEmpresaId: 10,
        dadorCargaId: 55,
        estado: 'APROBADO',
        clienteNombre: expect.objectContaining({ contains: 'acme', mode: 'insensitive' }),
        transportistaNombre: expect.objectContaining({ contains: 't1', mode: 'insensitive' }),
        patenteChasis: expect.objectContaining({ contains: 'AAA', mode: 'insensitive' }),
        numeroRemito: expect.objectContaining({ contains: 'R-', mode: 'insensitive' }),
        fechaOperacion: expect.objectContaining({
          gte: expect.any(Date),
          lte: expect.any(Date),
        }),
      })
    );
  });

  it('exportToExcel soporta filtros mínimos (solo tenantEmpresaId)', async () => {
    const result = await ExportService.exportToExcel({ tenantEmpresaId: 1 });
    expect(Buffer.isBuffer(result)).toBe(true);

    const callArg = findManyMock.mock.calls[0]?.[0] as any;
    expect(callArg.where).toEqual(expect.objectContaining({ tenantEmpresaId: 1 }));
  });
});

