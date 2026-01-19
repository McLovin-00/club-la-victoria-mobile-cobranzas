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

/**
 * Servicio para exportar remitos a Excel
 */
export class ExportService {
  /**
   * Genera un archivo Excel con los remitos filtrados
   */
  static async exportToExcel(filters: ExportFilters): Promise<Buffer> {
    const prisma = db.getClient();

    // Construir filtros de búsqueda
    const where: any = {
      tenantEmpresaId: filters.tenantEmpresaId,
    };

    // Filtro por dador si no es admin
    if (filters.dadorCargaId) {
      where.dadorCargaId = filters.dadorCargaId;
    }

    // Filtro por fecha de operación
    if (filters.fechaDesde || filters.fechaHasta) {
      where.fechaOperacion = {};
      if (filters.fechaDesde) {
        where.fechaOperacion.gte = filters.fechaDesde;
      }
      if (filters.fechaHasta) {
        where.fechaOperacion.lte = filters.fechaHasta;
      }
    }

    // Filtro por estado
    if (filters.estado) {
      where.estado = filters.estado;
    }

    // Filtro por cliente (búsqueda parcial)
    if (filters.clienteNombre) {
      where.clienteNombre = {
        contains: filters.clienteNombre,
        mode: 'insensitive',
      };
    }

    // Filtro por transportista (búsqueda parcial)
    if (filters.transportistaNombre) {
      where.transportistaNombre = {
        contains: filters.transportistaNombre,
        mode: 'insensitive',
      };
    }

    // Filtro por patente
    if (filters.patenteChasis) {
      where.patenteChasis = {
        contains: filters.patenteChasis,
        mode: 'insensitive',
      };
    }

    // Filtro por número de remito
    if (filters.numeroRemito) {
      where.numeroRemito = {
        contains: filters.numeroRemito,
        mode: 'insensitive',
      };
    }

    AppLogger.info('Exportando remitos con filtros:', { where });

    // Obtener remitos
    const remitos = await prisma.remito.findMany({
      where,
      orderBy: [
        { fechaOperacion: 'desc' },
        { createdAt: 'desc' },
      ],
      select: {
        id: true,
        numeroRemito: true,
        fechaOperacion: true,
        estado: true,
        emisorNombre: true,
        emisorDetalle: true,
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
        aprobadoAt: true,
        rechazadoAt: true,
      },
    });

    AppLogger.info(`Encontrados ${remitos.length} remitos para exportar`);

    // Crear workbook
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'BCA - Sistema de Remitos';
    workbook.created = new Date();

    const worksheet = workbook.addWorksheet('Remitos', {
      views: [{ state: 'frozen', ySplit: 1 }],
    });

    // Definir columnas
    worksheet.columns = [
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

    // Estilo del header
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF2563EB' },
    };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
    headerRow.height = 25;

    // Agregar datos
    remitos.forEach((remito) => {
      worksheet.addRow({
        id: remito.id,
        numeroRemito: remito.numeroRemito || '-',
        fechaOperacion: remito.fechaOperacion 
          ? new Date(remito.fechaOperacion).toLocaleDateString('es-AR')
          : '-',
        estado: this.formatEstado(remito.estado),
        emisorNombre: remito.emisorNombre || '-',
        clienteNombre: remito.clienteNombre || '-',
        producto: remito.producto || '-',
        transportistaNombre: remito.transportistaNombre || '-',
        choferNombre: remito.choferNombre || '-',
        choferDni: remito.choferDni || '-',
        patenteChasis: remito.patenteChasis || '-',
        patenteAcoplado: remito.patenteAcoplado || '-',
        pesoOrigenBruto: remito.pesoOrigenBruto ? Number(remito.pesoOrigenBruto) : null,
        pesoOrigenTara: remito.pesoOrigenTara ? Number(remito.pesoOrigenTara) : null,
        pesoOrigenNeto: remito.pesoOrigenNeto ? Number(remito.pesoOrigenNeto) : null,
        pesoDestinoBruto: remito.pesoDestinoBruto ? Number(remito.pesoDestinoBruto) : null,
        pesoDestinoTara: remito.pesoDestinoTara ? Number(remito.pesoDestinoTara) : null,
        pesoDestinoNeto: remito.pesoDestinoNeto ? Number(remito.pesoDestinoNeto) : null,
        confianzaIA: remito.confianzaIA ? Number(remito.confianzaIA) : null,
        createdAt: new Date(remito.createdAt).toLocaleString('es-AR'),
      });
    });

    // Formato de columnas numéricas
    ['pesoOrigenBruto', 'pesoOrigenTara', 'pesoOrigenNeto', 
     'pesoDestinoBruto', 'pesoDestinoTara', 'pesoDestinoNeto'].forEach((key) => {
      const col = worksheet.getColumn(key);
      col.numFmt = '#,##0';
    });

    // Alternar colores de filas
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber > 1 && rowNumber % 2 === 0) {
        row.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF3F4F6' },
        };
      }
      row.alignment = { vertical: 'middle' };
    });

    // Agregar bordes
    worksheet.eachRow((row) => {
      row.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFE5E7EB' } },
          left: { style: 'thin', color: { argb: 'FFE5E7EB' } },
          bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
          right: { style: 'thin', color: { argb: 'FFE5E7EB' } },
        };
      });
    });

    // Agregar hoja de resumen
    const summarySheet = workbook.addWorksheet('Resumen');
    summarySheet.columns = [
      { header: 'Métrica', key: 'metric', width: 30 },
      { header: 'Valor', key: 'value', width: 20 },
    ];

    const headerRowSummary = summarySheet.getRow(1);
    headerRowSummary.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRowSummary.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF2563EB' },
    };

    // Estadísticas
    const totalRemitos = remitos.length;
    const aprobados = remitos.filter(r => r.estado === 'APROBADO').length;
    const pendientes = remitos.filter(r => r.estado === 'PENDIENTE_APROBACION').length;
    const rechazados = remitos.filter(r => r.estado === 'RECHAZADO').length;
    const totalPesoNeto = remitos.reduce((sum, r) => sum + (r.pesoOrigenNeto ? Number(r.pesoOrigenNeto) : 0), 0);

    summarySheet.addRows([
      { metric: 'Total de Remitos', value: totalRemitos },
      { metric: 'Aprobados', value: aprobados },
      { metric: 'Pendientes de Aprobación', value: pendientes },
      { metric: 'Rechazados', value: rechazados },
      { metric: 'Peso Neto Total (kg)', value: totalPesoNeto },
      { metric: 'Fecha de Exportación', value: new Date().toLocaleString('es-AR') },
    ]);

    // Generar buffer
    const arrayBuffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(arrayBuffer);
  }

  private static formatEstado(estado: string): string {
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
}
