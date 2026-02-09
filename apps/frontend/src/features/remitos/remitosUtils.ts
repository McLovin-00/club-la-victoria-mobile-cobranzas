/**
 * Utilidades de Remitos - Funciones puras para testabilidad
 * Extraídas de RemitoDetail.tsx y RemitosPage.tsx
 */

export type FilterType = 'todos' | 'PENDIENTE_APROBACION' | 'APROBADO' | 'RECHAZADO';

/**
 * Obtiene el label del filtro de remitos
 */
export function getFilterLabel(filter: FilterType): string {
  const labels: Record<FilterType, string> = {
    todos: '',
    PENDIENTE_APROBACION: 'pendientes',
    APROBADO: 'aprobados',
    RECHAZADO: 'rechazados',
  };
  return labels[filter];
}

/**
 * Formatea una fecha para mostrar
 */
export function formatDate(dateStr: string | null): string {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Formatea un peso para mostrar
 */
export function formatWeight(weight: number | null): string {
  if (weight === null) return '-';
  return `${weight.toLocaleString('es-AR')} kg`;
}

/**
 * Datos para cálculo de peso
 */
export interface PesoData {
  bruto: string;
  tara: string;
  neto: string;
}

/**
 * Resultado del cálculo de peso
 */
export interface PesoCalculationResult {
  bruto?: string;
  tara?: string;
  neto?: string;
}

/**
 * Calcula el peso faltante basado en dos de tres valores
 * Fórmula: Bruto - Tara = Neto
 */
export function calcularPeso(data: PesoData): PesoCalculationResult {
  const bruto = Number.parseFloat(data.bruto) || 0;
  const tara = Number.parseFloat(data.tara) || 0;
  const neto = Number.parseFloat(data.neto) || 0;

  const hasBruto = data.bruto !== '';
  const hasTara = data.tara !== '';
  const hasNeto = data.neto !== '';

  if (hasBruto && hasTara && !hasNeto) {
    // Calcular Neto = Bruto - Tara
    return { neto: (bruto - tara).toString() };
  } else if (hasBruto && hasNeto && !hasTara) {
    // Calcular Tara = Bruto - Neto
    return { tara: (bruto - neto).toString() };
  } else if (hasTara && hasNeto && !hasBruto) {
    // Calcular Bruto = Tara + Neto
    return { bruto: (tara + neto).toString() };
  } else if (hasBruto && hasTara) {
    // Si ya tiene bruto y tara, recalcular neto
    return { neto: (bruto - tara).toString() };
  }

  return {};
}

/**
 * Valida que el motivo de rechazo sea válido
 */
export function validateRejectMotivo(motivo: string): boolean {
  return motivo.trim().length >= 5;
}

/**
 * Clase de color según confianza IA
 */
export function getConfianzaColor(confianza: number | null): string {
  if (confianza === null) return 'bg-slate-200';
  if (confianza >= 80) return 'bg-green-500';
  if (confianza >= 50) return 'bg-yellow-500';
  return 'bg-red-500';
}

/**
 * Clase de texto según confianza IA
 */
export function getConfianzaTextColor(confianza: number | null): string {
  if (confianza === null) return 'text-slate-600';
  if (confianza >= 80) return 'text-green-600';
  if (confianza >= 50) return 'text-yellow-600';
  return 'text-red-600';
}

/**
 * Genera nombre de archivo para exportación
 */
export function getExportFilename(): string {
  return `remitos_${new Date().toISOString().slice(0, 10)}.xlsx`;
}

/**
 * Construye URL de parámetros de exportación
 */
export interface ExportFilters {
  fechaDesde?: string;
  fechaHasta?: string;
  estado?: string;
  clienteNombre?: string;
  transportistaNombre?: string;
  patenteChasis?: string;
}

export function buildExportParams(filters: ExportFilters): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.fechaDesde) params.append('fechaDesde', filters.fechaDesde);
  if (filters.fechaHasta) params.append('fechaHasta', filters.fechaHasta);
  if (filters.estado) params.append('estado', filters.estado);
  if (filters.clienteNombre) params.append('clienteNombre', filters.clienteNombre);
  if (filters.transportistaNombre) params.append('transportistaNombre', filters.transportistaNombre);
  if (filters.patenteChasis) params.append('patenteChasis', filters.patenteChasis);
  return params;
}

/**
 * Convierte fecha de ISO a formato date input (YYYY-MM-DD)
 */
export function isoToInputDate(isoDate: string | null): string {
  if (!isoDate) return '';
  return new Date(isoDate).toISOString().split('T')[0];
}

/**
 * Convierte valor numérico a string o vacío
 */
export function numberToString(value: number | null | undefined): string {
  return value?.toString() || '';
}

/**
 * Convierte string a número o null
 */
export function stringToNumber(value: string): number | null {
  if (value === '') return null;
  const num = Number(value);
  return isNaN(num) ? null : num;
}
