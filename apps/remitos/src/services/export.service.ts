import ExcelJS from 'exceljs';
import { db } from '../config/database';
import { AppLogger } from '../config/logger';

interface ExportFilters {
  fechaDesde?: Date;
  fechaHasta?: Date;
  estado?: string;
  clienteNombre?: string;
  transportistaNombre?: string;
  patenteChasis?: string;
  numeroRemito?: string;
  tenantEmpresaId: number;
  dadorCargaId?: number;
}

interface RemitoRow {
  id: number;
  numeroRemito: string | null;
  fechaOperacion: Date | null;
  estado: string;
  emisorNombre: string | null;
  clienteNombre: string | null;
  producto: string | null;
  transportistaNombre: string | null;
  choferNombre: string | null;
  choferDni: string | null;
  patenteChasis: string | null;
  patenteAcoplado: string | null;
  pesoOrigenBruto: number | null;
  pesoOrigenTara: number | null;
  pesoOrigenNeto: number | null;
  pesoDestinoBruto: number | null;
  pesoDestinoTara: number | null;
  pesoDestinoNeto: number | null;
  confianzaIA: number | null;
  createdAt: Date;
}

// ============================================================================
// HELPERS - Extraídos para reducir complejidad cognitiva
// ============================================================================

function buildWhereClause(filters: ExportFilters): Record<string, unknown> {
  const where: Record<string, unknown> = {
    tenantEmpresaId: filters.tenantEmpresaId,
  };

  if (filters.dadorCargaId) {
    where.dadorCargaId = filters.dadorCargaId;
  }

  if (filters.fechaDesde || filters.fechaHasta) {
    where.fechaOperacion = buildDateFilter(filters.fechaDesde, filters.fechaHasta);
  }

  if (filters.estado) {
    where.estado = filters.estado;
  }

  if (filters.clienteNombre) {
    where.clienteNombre = buildContainsFilter(filters.clienteNombre);
  }

  if (filters.transportistaNombre) {
    where.transportistaNombre = buildContainsFilter(filters.transportistaNombre);
  }

  if (filters.patenteChasis) {
    where.patenteChasis = buildContainsFilter(filters.patenteChasis);
  }

  if (filters.numeroRemito) {
    where.numeroRemito = buildContainsFilter(filters.numeroRemito);
  }

  return where;
}

function buildDateFilter(desde?: Date, hasta?: Date): Record<string, Date> {
  const filter: Record<string, Date> = {};
  if (desde) filter.gte = desde;
  if (hasta) filter.lte = hasta;
  return filter;
}

function buildContainsFilter(value: string): Record<string, unknown> {
  return { contains: value, mode: 'insensitive' };
}

function formatEstado(estado: string): string {
  const labels: Record<string, string> = {
    PENDIENTE_ANALISIS: 'Pendiente Análisis',
    ANALIZANDO: 'Analizando',
    PENDIENTE_APROBACION: 'Pendiente Aprobación',
    APROBADO: 'Aprobado',
    RECHAZADO: 'Rechazado',
    ERROR_ANALISIS: 'Error en Análisis',
  };
  return labels[estado] || estado;
}

function formatDate(date: Date | null): string {
  return date ? new Date(date).toLocaleDateString('es-AR') : '-';
}

function formatDateTime(date: Date): string {
  return new Date(date).toLocaleString('es-AR');
}

function toNumberOrNull(value: unknown): number | null {
  return value ? Number(value) : null;
}

function getColumnDefinitions(): Partial<ExcelJS.Column>[] {
  return [
    { header: 'ID', key: 'id', width: 8 },
    { header: 'Nº Remito', key: 'numeroRemito', width: 18 },
    { header: 'Fecha Operación', key: 'fechaOperacion', width: 15 },
    { header: 'Estado', key: 'estado', width: 18 },
    { header: 'Emisor', key: 'emisorNombre', width: 25 },
    { header: 'Cliente', key: 'clienteNombre', width: 25 },
    { header: 'Producto', key: 'producto', width: 20 },
    { header: 'Transportista', key: 'transportistaNombre', width: 25 },
    { header: 'Chofer', key: 'choferNombre', width: 20 },
    { header: 'DNI Chofer', key: 'choferDni', width: 12 },
    { header: 'Patente Chasis', key: 'patenteChasis', width: 14 },
    { header: 'Patente Acoplado', key: 'patenteAcoplado', width: 14 },
    { header: 'Peso Origen Bruto', key: 'pesoOrigenBruto', width: 16 },
    { header: 'Peso Origen Tara', key: 'pesoOrigenTara', width: 15 },
    { header: 'Peso Origen Neto', key: 'pesoOrigenNeto', width: 15 },
    { header: 'Peso Destino Bruto', key: 'pesoDestinoBruto', width: 16 },
    { header: 'Peso Destino Tara', key: 'pesoDestinoTara', width: 15 },
    { header: 'Peso Destino Neto', key: 'pesoDestinoNeto', width: 15 },
    { header: 'Confianza IA (%)', key: 'confianzaIA', width: 14 },
    { header: 'Fecha Carga', key: 'createdAt', width: 18 },
  ];
}

function mapRemitoToRow(remito: RemitoRow): Record<string, unknown> {
  return {
    id: remito.id,
    numeroRemito: remito.numeroRemito ?? '-',
    fechaOperacion: formatDate(remito.fechaOperacion),
    estado: formatEstado(remito.estado),
    emisorNombre: remito.emisorNombre ?? '-',
    clienteNombre: remito.clienteNombre ?? '-',
    producto: remito.producto ?? '-',
    transportistaNombre: remito.transportistaNombre ?? '-',
    choferNombre: remito.choferNombre ?? '-',
    choferDni: remito.choferDni ?? '-',
    patenteChasis: remito.patenteChasis ?? '-',
    patenteAcoplado: remito.patenteAcoplado ?? '-',
    pesoOrigenBruto: toNumberOrNull(remito.pesoOrigenBruto),
    pesoOrigenTara: toNumberOrNull(remito.pesoOrigenTara),
    pesoOrigenNeto: toNumberOrNull(remito.pesoOrigenNeto),
    pesoDestinoBruto: toNumberOrNull(remito.pesoDestinoBruto),
    pesoDestinoTara: toNumberOrNull(remito.pesoDestinoTara),
    pesoDestinoNeto: toNumberOrNull(remito.pesoDestinoNeto),
    confianzaIA: toNumberOrNull(remito.confianzaIA),
    createdAt: formatDateTime(remito.createdAt),
  };
}

function applyHeaderStyle(row: ExcelJS.Row): void {
  row.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  row.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF2563EB' },
  };
  row.alignment = { vertical: 'middle', horizontal: 'center' };
  row.height = 25;
}

function applyNumericFormat(worksheet: ExcelJS.Worksheet): void {
  const numericColumns = [
    'pesoOrigenBruto', 'pesoOrigenTara', 'pesoOrigenNeto',
    'pesoDestinoBruto', 'pesoDestinoTara', 'pesoDestinoNeto',
  ];
  numericColumns.forEach((key) => {
    const col = worksheet.getColumn(key);
    col.numFmt = '#,##0';
  });
}

function applyRowStyles(worksheet: ExcelJS.Worksheet): void {
  worksheet.eachRow((row, rowNumber) => {
    applyAlternateRowColor(row, rowNumber);
    applyBorders(row);
    row.alignment = { vertical: 'middle' };
  });
}

function applyAlternateRowColor(row: ExcelJS.Row, rowNumber: number): void {
  if (rowNumber > 1 && rowNumber % 2 === 0) {
    row.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFF3F4F6' },
    };
  }
}

function applyBorders(row: ExcelJS.Row): void {
  row.eachCell((cell) => {
    cell.border = {
      top: { style: 'thin', color: { argb: 'FFE5E7EB' } },
      left: { style: 'thin', color: { argb: 'FFE5E7EB' } },
      bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
      right: { style: 'thin', color: { argb: 'FFE5E7EB' } },
    };
  });
}

function createSummarySheet(workbook: ExcelJS.Workbook, remitos: RemitoRow[]): void {
  const summarySheet = workbook.addWorksheet('Resumen');
  summarySheet.columns = [
    { header: 'Métrica', key: 'metric', width: 30 },
    { header: 'Valor', key: 'value', width: 20 },
  ];

  applyHeaderStyle(summarySheet.getRow(1));

  const stats = calculateStats(remitos);
  summarySheet.addRows([
    { metric: 'Total de Remitos', value: stats.total },
    { metric: 'Aprobados', value: stats.aprobados },
    { metric: 'Pendientes de Aprobación', value: stats.pendientes },
    { metric: 'Rechazados', value: stats.rechazados },
    { metric: 'Peso Neto Total (kg)', value: stats.pesoNetoTotal },
    { metric: 'Fecha de Exportación', value: formatDateTime(new Date()) },
  ]);
}

function calculateStats(remitos: RemitoRow[]): Record<string, number> {
  return {
    total: remitos.length,
    aprobados: remitos.filter(r => r.estado === 'APROBADO').length,
    pendientes: remitos.filter(r => r.estado === 'PENDIENTE_APROBACION').length,
    rechazados: remitos.filter(r => r.estado === 'RECHAZADO').length,
    pesoNetoTotal: remitos.reduce((sum, r) => sum + (r.pesoOrigenNeto ? Number(r.pesoOrigenNeto) : 0), 0),
  };
}

// ============================================================================
// EXPORT SERVICE
// ============================================================================

/**
 * Servicio para exportar remitos a Excel
 */
export class ExportService {
  /**
   * Genera un archivo Excel con los remitos filtrados
   */
  static async exportToExcel(filters: ExportFilters): Promise<Buffer> {
    const remitos = await this.fetchRemitos(filters);
    const workbook = this.createWorkbook(remitos);
    return this.generateBuffer(workbook);
  }

  private static async fetchRemitos(filters: ExportFilters): Promise<RemitoRow[]> {
    const prisma = db.getClient();
    const where = buildWhereClause(filters);

    AppLogger.info('Exportando remitos con filtros:', { where });

    const remitos = await prisma.remito.findMany({
      where,
      orderBy: [{ fechaOperacion: 'desc' }, { createdAt: 'desc' }],
      select: {
        id: true,
        numeroRemito: true,
        fechaOperacion: true,
        estado: true,
        emisorNombre: true,
        clienteNombre: true,
        producto: true,
        transportistaNombre: true,
        choferNombre: true,
        choferDni: true,
        patenteChasis: true,
        patenteAcoplado: true,
        pesoOrigenBruto: true,
        pesoOrigenTara: true,
        pesoOrigenNeto: true,
        pesoDestinoBruto: true,
        pesoDestinoTara: true,
        pesoDestinoNeto: true,
        confianzaIA: true,
        createdAt: true,
      },
    });

    AppLogger.info(`Encontrados ${remitos.length} remitos para exportar`);
    return remitos as unknown as RemitoRow[];
  }

  private static createWorkbook(remitos: RemitoRow[]): ExcelJS.Workbook {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'BCA - Sistema de Remitos';
    workbook.created = new Date();

    this.createDataSheet(workbook, remitos);
    createSummarySheet(workbook, remitos);

    return workbook;
  }

  private static createDataSheet(workbook: ExcelJS.Workbook, remitos: RemitoRow[]): void {
    const worksheet = workbook.addWorksheet('Remitos', {
      views: [{ state: 'frozen', ySplit: 1 }],
    });

    worksheet.columns = getColumnDefinitions();
    applyHeaderStyle(worksheet.getRow(1));

    remitos.forEach((remito) => {
      worksheet.addRow(mapRemitoToRow(remito));
    });

    applyNumericFormat(worksheet);
    applyRowStyles(worksheet);
  }

  private static async generateBuffer(workbook: ExcelJS.Workbook): Promise<Buffer> {
    const arrayBuffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(arrayBuffer);
  }
}
