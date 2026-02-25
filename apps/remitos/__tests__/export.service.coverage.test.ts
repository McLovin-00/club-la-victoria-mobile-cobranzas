/**
 * @jest-environment node
 */

process.env.REMITOS_DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
process.env.NODE_ENV = 'test';

const mockEachCell = jest.fn((cb: (cell: any) => void) => cb({ border: {} }));

const mockGetRow = jest.fn().mockReturnValue({
  font: {},
  fill: {},
  alignment: {},
  height: 0,
  eachCell: mockEachCell,
});

const mockAddRow = jest.fn().mockReturnValue({
  font: {},
  fill: {},
  alignment: {},
  height: 0,
  eachCell: mockEachCell,
});

const mockWorksheet = {
  columns: [] as any[],
  getRow: mockGetRow,
  addRow: mockAddRow,
  addRows: jest.fn(),
  eachRow: jest.fn((cb: (row: any, rowNumber: number) => void) => {
    cb({ font: {}, fill: {}, alignment: {}, eachCell: jest.fn((cb2: (cell: any) => void) => cb2({ border: {} })) }, 1);
    cb({ font: {}, fill: {}, alignment: {}, eachCell: jest.fn((cb2: (cell: any) => void) => cb2({ border: {} })) }, 2);
    cb({ font: {}, fill: {}, alignment: {}, eachCell: jest.fn((cb2: (cell: any) => void) => cb2({ border: {} })) }, 3);
  }),
  getColumn: jest.fn().mockReturnValue({ numFmt: '' }),
};

const mockWriteBuffer = jest.fn().mockResolvedValue(Buffer.from('test-excel'));

jest.mock('exceljs', () => ({
  __esModule: true,
  default: {
    Workbook: jest.fn().mockImplementation(() => ({
      creator: '',
      created: null,
      addWorksheet: jest.fn().mockReturnValue(mockWorksheet),
      xlsx: { writeBuffer: mockWriteBuffer },
    })),
  },
}));

jest.mock('../src/config/database', () => ({
  db: {
    getClient: jest.fn().mockReturnValue({
      remito: {
        findMany: jest.fn(),
      },
    }),
  },
}));

jest.mock('../src/config/logger', () => ({
  AppLogger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

import { ExportService } from '../src/services/export.service';
import { db } from '../src/config/database';

const prisma = (db.getClient as jest.Mock)();

function makeRemitoRow(overrides: Record<string, any> = {}) {
  return {
    id: 1,
    numeroRemito: '0012-001',
    fechaOperacion: new Date('2025-05-17'),
    estado: 'APROBADO',
    emisorNombre: 'Emisor SA',
    clienteNombre: 'Cliente SA',
    producto: 'Arena',
    transportistaNombre: 'Trans SA',
    choferNombre: 'Juan',
    choferDni: '12345678',
    patenteChasis: 'AB-123-CD',
    patenteAcoplado: 'EF-456-GH',
    pesoOrigenBruto: 52300,
    pesoOrigenTara: 16360,
    pesoOrigenNeto: 35940,
    pesoDestinoBruto: 51360,
    pesoDestinoTara: 16540,
    pesoDestinoNeto: 34820,
    confianzaIA: 85,
    createdAt: new Date('2025-05-17T10:30:00'),
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockWorksheet.getRow.mockReturnValue({
    font: {}, fill: {}, alignment: {}, height: 0,
    eachCell: mockEachCell,
  });
});

// ============================================================================
// exportToExcel end-to-end
// ============================================================================
describe('ExportService.exportToExcel', () => {
  it('generates Excel buffer with data', async () => {
    prisma.remito.findMany.mockResolvedValue([makeRemitoRow()]);

    const buffer = await ExportService.exportToExcel({ tenantEmpresaId: 1 });

    expect(Buffer.isBuffer(buffer)).toBe(true);
    expect(mockWriteBuffer).toHaveBeenCalled();
    expect(mockWorksheet.addRow).toHaveBeenCalled();
  });

  it('generates Excel with empty data', async () => {
    prisma.remito.findMany.mockResolvedValue([]);

    const buffer = await ExportService.exportToExcel({ tenantEmpresaId: 1 });

    expect(Buffer.isBuffer(buffer)).toBe(true);
  });

  it('applies all filters to where clause', async () => {
    prisma.remito.findMany.mockResolvedValue([]);

    await ExportService.exportToExcel({
      tenantEmpresaId: 1,
      dadorCargaId: 2,
      fechaDesde: new Date('2025-01-01'),
      fechaHasta: new Date('2025-12-31'),
      estado: 'APROBADO',
      clienteNombre: 'PROSIL',
      transportistaNombre: 'Quebracho',
      patenteChasis: 'AB-123',
      numeroRemito: '0012',
    });

    const findCall = prisma.remito.findMany.mock.calls[0][0];
    expect(findCall.where.tenantEmpresaId).toBe(1);
    expect(findCall.where.dadorCargaId).toBe(2);
    expect(findCall.where.estado).toBe('APROBADO');
    expect(findCall.where.clienteNombre).toEqual({ contains: 'PROSIL', mode: 'insensitive' });
    expect(findCall.where.transportistaNombre).toEqual({ contains: 'Quebracho', mode: 'insensitive' });
    expect(findCall.where.patenteChasis).toEqual({ contains: 'AB-123', mode: 'insensitive' });
    expect(findCall.where.numeroRemito).toEqual({ contains: '0012', mode: 'insensitive' });
    expect(findCall.where.fechaOperacion).toEqual({
      gte: new Date('2025-01-01'),
      lte: new Date('2025-12-31'),
    });
  });

  it('builds where with only fechaDesde', async () => {
    prisma.remito.findMany.mockResolvedValue([]);

    await ExportService.exportToExcel({
      tenantEmpresaId: 1,
      fechaDesde: new Date('2025-06-01'),
    });

    const findCall = prisma.remito.findMany.mock.calls[0][0];
    expect(findCall.where.fechaOperacion).toEqual({ gte: new Date('2025-06-01') });
  });

  it('builds where with only fechaHasta', async () => {
    prisma.remito.findMany.mockResolvedValue([]);

    await ExportService.exportToExcel({
      tenantEmpresaId: 1,
      fechaHasta: new Date('2025-12-31'),
    });

    const findCall = prisma.remito.findMany.mock.calls[0][0];
    expect(findCall.where.fechaOperacion).toEqual({ lte: new Date('2025-12-31') });
  });

  it('builds where without optional filters', async () => {
    prisma.remito.findMany.mockResolvedValue([]);

    await ExportService.exportToExcel({ tenantEmpresaId: 5 });

    const findCall = prisma.remito.findMany.mock.calls[0][0];
    expect(findCall.where.tenantEmpresaId).toBe(5);
    expect(findCall.where.dadorCargaId).toBeUndefined();
    expect(findCall.where.estado).toBeUndefined();
    expect(findCall.where.fechaOperacion).toBeUndefined();
  });

  it('maps remito rows with null fields to dash', async () => {
    prisma.remito.findMany.mockResolvedValue([
      makeRemitoRow({
        numeroRemito: null,
        emisorNombre: null,
        clienteNombre: null,
        producto: null,
        transportistaNombre: null,
        choferNombre: null,
        choferDni: null,
        patenteChasis: null,
        patenteAcoplado: null,
        fechaOperacion: null,
        pesoOrigenBruto: null,
        pesoOrigenTara: null,
        pesoOrigenNeto: null,
        pesoDestinoBruto: null,
        pesoDestinoTara: null,
        pesoDestinoNeto: null,
        confianzaIA: null,
      }),
    ]);

    await ExportService.exportToExcel({ tenantEmpresaId: 1 });

    const addRowCall = mockWorksheet.addRow.mock.calls[0][0];
    expect(addRowCall.numeroRemito).toBe('-');
    expect(addRowCall.emisorNombre).toBe('-');
    expect(addRowCall.fechaOperacion).toBe('-');
    expect(addRowCall.pesoOrigenBruto).toBeNull();
    expect(addRowCall.confianzaIA).toBeNull();
  });

  it('formats known estados', async () => {
    const estados = [
      ['PENDIENTE_ANALISIS', 'Pendiente Análisis'],
      ['ANALIZANDO', 'Analizando'],
      ['PENDIENTE_APROBACION', 'Pendiente Aprobación'],
      ['APROBADO', 'Aprobado'],
      ['RECHAZADO', 'Rechazado'],
      ['ERROR_ANALISIS', 'Error en Análisis'],
    ];

    for (const [raw, formatted] of estados) {
      jest.clearAllMocks();
      prisma.remito.findMany.mockResolvedValue([makeRemitoRow({ estado: raw })]);
      await ExportService.exportToExcel({ tenantEmpresaId: 1 });
      const addRowCall = mockWorksheet.addRow.mock.calls[0][0];
      expect(addRowCall.estado).toBe(formatted);
    }
  });

  it('returns raw estado for unknown values', async () => {
    prisma.remito.findMany.mockResolvedValue([makeRemitoRow({ estado: 'DESCONOCIDO' })]);

    await ExportService.exportToExcel({ tenantEmpresaId: 1 });

    const addRowCall = mockWorksheet.addRow.mock.calls[0][0];
    expect(addRowCall.estado).toBe('DESCONOCIDO');
  });

  it('calculates stats for summary sheet', async () => {
    prisma.remito.findMany.mockResolvedValue([
      makeRemitoRow({ estado: 'APROBADO', pesoOrigenNeto: 1000 }),
      makeRemitoRow({ id: 2, estado: 'APROBADO', pesoOrigenNeto: 2000 }),
      makeRemitoRow({ id: 3, estado: 'PENDIENTE_APROBACION', pesoOrigenNeto: null }),
      makeRemitoRow({ id: 4, estado: 'RECHAZADO', pesoOrigenNeto: 500 }),
    ]);

    await ExportService.exportToExcel({ tenantEmpresaId: 1 });

    expect(mockWorksheet.addRows).toHaveBeenCalled();
    const summaryRows = mockWorksheet.addRows.mock.calls[0][0];
    expect(summaryRows[0]).toEqual({ metric: 'Total de Remitos', value: 4 });
    expect(summaryRows[1]).toEqual({ metric: 'Aprobados', value: 2 });
    expect(summaryRows[2]).toEqual({ metric: 'Pendientes de Aprobación', value: 1 });
    expect(summaryRows[3]).toEqual({ metric: 'Rechazados', value: 1 });
    expect(summaryRows[4].metric).toBe('Peso Neto Total (kg)');
    expect(summaryRows[4].value).toBe(3500);
  });

  it('toNumberOrNull returns null for falsy, number for truthy', async () => {
    prisma.remito.findMany.mockResolvedValue([
      makeRemitoRow({ pesoOrigenBruto: 0, pesoOrigenTara: 100, pesoOrigenNeto: null }),
    ]);

    await ExportService.exportToExcel({ tenantEmpresaId: 1 });

    const addRowCall = mockWorksheet.addRow.mock.calls[0][0];
    expect(addRowCall.pesoOrigenBruto).toBeNull();
    expect(addRowCall.pesoOrigenTara).toBe(100);
    expect(addRowCall.pesoOrigenNeto).toBeNull();
  });

  it('formats date and datetime correctly', async () => {
    prisma.remito.findMany.mockResolvedValue([
      makeRemitoRow({
        fechaOperacion: new Date('2025-05-17'),
        createdAt: new Date('2025-05-17T14:30:00'),
      }),
    ]);

    await ExportService.exportToExcel({ tenantEmpresaId: 1 });

    const addRowCall = mockWorksheet.addRow.mock.calls[0][0];
    expect(typeof addRowCall.fechaOperacion).toBe('string');
    expect(typeof addRowCall.createdAt).toBe('string');
  });
});
