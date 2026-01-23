/**
 * Tests Unitarios para remitosUtils
 * Objetivo: 100% de cobertura - funciones puras sin dependencias externas
 */
import { describe, it, expect } from '@jest/globals';
import {
  getFilterLabel,
  formatDate,
  formatWeight,
  calcularPeso,
  type PesoData,
  validateRejectMotivo,
  getConfianzaColor,
  getConfianzaTextColor,
  getExportFilename,
  buildExportParams,
  isoToInputDate,
  numberToString,
  stringToNumber,
  type ExportFilters,
} from '../remitosUtils';

describe('remitosUtils - getFilterLabel', () => {
  it('debería retornar string vacío para todos', () => {
    expect(getFilterLabel('todos')).toBe('');
  });

  it('debería retornar "pendientes" para PENDIENTE_APROBACION', () => {
    expect(getFilterLabel('PENDIENTE_APROBACION')).toBe('pendientes');
  });

  it('debería retornar "aprobados" para APROBADO', () => {
    expect(getFilterLabel('APROBADO')).toBe('aprobados');
  });

  it('debería retornar "rechazados" para RECHAZADO', () => {
    expect(getFilterLabel('RECHAZADO')).toBe('rechazados');
  });
});

describe('remitosUtils - formatDate', () => {
  it('debería retornar "-" para null', () => {
    expect(formatDate(null)).toBe('-');
  });

  it('debería formatear fecha correctamente', () => {
    const date = '2024-01-15T10:30:00';
    const result = formatDate(date);
    // Formato esperado en locale es-AR: DD/MM/YYYY, HH:MM con AM/PM
    expect(result).toMatch(/^\d{2}\/\d{2}\/\d{4}/);
    expect(result).toContain('10:30');
  });

  it('debería formatear fecha con milisegundos', () => {
    const date = '2024-12-31T23:59:59.999Z';
    const result = formatDate(date);
    expect(result).toContain('2024');
  });

  it('debería manejar fecha inválida gracefulmente', () => {
    const result = formatDate('fecha-invalida');
    // Date constructor crea fecha inválida pero toLocaleDateString no lanza error
    expect(typeof result).toBe('string');
  });
});

describe('remitosUtils - formatWeight', () => {
  it('debería retornar "-" para null', () => {
    expect(formatWeight(null)).toBe('-');
  });

  it('debería formatear peso con separador de miles', () => {
    expect(formatWeight(1000)).toBe('1.000 kg');
  });

  it('debería formatear peso grande', () => {
    expect(formatWeight(1234567)).toBe('1.234.567 kg');
  });

  it('debería formatear peso decimal', () => {
    expect(formatWeight(1234.56)).toBe('1.234,56 kg');
  });

  it('debería formatear cero', () => {
    expect(formatWeight(0)).toBe('0 kg');
  });
});

describe('remitosUtils - calcularPeso', () => {
  describe('cálculo de neto (Bruto - Tara)', () => {
    it('debería calcular neto cuando hay bruto y tara', () => {
      const data: PesoData = { bruto: '1000', tara: '200', neto: '' };
      const result = calcularPeso(data);
      expect(result.neto).toBe('800');
    });

    it('debería recalcular neto cuando los tres valores están presentes', () => {
      const data: PesoData = { bruto: '1000', tara: '200', neto: '999' };
      const result = calcularPeso(data);
      expect(result.neto).toBe('800'); // Recalcula porque tiene bruto y tara
    });

    it('debería manejar valores decimales', () => {
      const data: PesoData = { bruto: '1000.5', tara: '200.2', neto: '' };
      const result = calcularPeso(data);
      expect(parseFloat(result.neto!)).toBeCloseTo(800.3, 1);
    });
  });

  describe('cálculo de tara (Bruto - Neto)', () => {
    it('debería calcular tara cuando hay bruto y neto', () => {
      const data: PesoData = { bruto: '1000', tara: '', neto: '800' };
      const result = calcularPeso(data);
      expect(result.tara).toBe('200');
    });
  });

  describe('cálculo de bruto (Tara + Neto)', () => {
    it('debería calcular bruto cuando hay tara y neto', () => {
      const data: PesoData = { bruto: '', tara: '200', neto: '800' };
      const result = calcularPeso(data);
      expect(result.bruto).toBe('1000');
    });
  });

  describe('casos edge', () => {
    it('debería retornar objeto vacío cuando no hay suficientes datos', () => {
      const data: PesoData = { bruto: '', tara: '', neto: '' };
      const result = calcularPeso(data);
      expect(result).toEqual({});
    });

    it('debería manejar strings vacías como 0', () => {
      const data: PesoData = { bruto: '1000', tara: '', neto: '' };
      const result = calcularPeso(data);
      expect(result).toEqual({});
    });

    it('debería manejar valores inválidos gracefulmente', () => {
      const data: PesoData = { bruto: 'abc', tara: '200', neto: '' };
      const result = calcularPeso(data);
      // abc se convierte a 0, así que calcula neto = 0 - 200 = -200
      expect(result.neto).toBe('-200');
    });

    it('debería manejar resultado negativo', () => {
      const data: PesoData = { bruto: '100', tara: '200', neto: '' };
      const result = calcularPeso(data);
      expect(result.neto).toBe('-100');
    });
  });
});

describe('remitosUtils - validateRejectMotivo', () => {
  it('debería retornar true para motivo con 5 caracteres', () => {
    expect(validateRejectMotivo('abcde')).toBe(true);
  });

  it('debería retornar true para motivo con espacios y contenido', () => {
    expect(validateRejectMotivo('  abcde  ')).toBe(true);
  });

  it('debería retornar false para motivo con menos de 5 caracteres', () => {
    expect(validateRejectMotivo('abc')).toBe(false);
  });

  it('debería retornar false para string vacía', () => {
    expect(validateRejectMotivo('')).toBe(false);
  });

  it('debería retornar false para solo espacios', () => {
    expect(validateRejectMotivo('     ')).toBe(false);
  });

  it('debería retornar true para motivo largo', () => {
    const motivo = 'a'.repeat(100);
    expect(validateRejectMotivo(motivo)).toBe(true);
  });
});

describe('remitosUtils - getConfianzaColor', () => {
  it('debería retornar bg-green-500 para confianza >= 80', () => {
    expect(getConfianzaColor(80)).toBe('bg-green-500');
    expect(getConfianzaColor(90)).toBe('bg-green-500');
    expect(getConfianzaColor(100)).toBe('bg-green-500');
  });

  it('debería retornar bg-yellow-500 para confianza >= 50 y < 80', () => {
    expect(getConfianzaColor(50)).toBe('bg-yellow-500');
    expect(getConfianzaColor(65)).toBe('bg-yellow-500');
    expect(getConfianzaColor(79)).toBe('bg-yellow-500');
  });

  it('debería retornar bg-red-500 para confianza < 50', () => {
    expect(getConfianzaColor(0)).toBe('bg-red-500');
    expect(getConfianzaColor(25)).toBe('bg-red-500');
    expect(getConfianzaColor(49)).toBe('bg-red-500');
  });

  it('debería retornar bg-slate-200 para null', () => {
    expect(getConfianzaColor(null)).toBe('bg-slate-200');
  });
});

describe('remitosUtils - getConfianzaTextColor', () => {
  it('debería retornar text-green-600 para confianza >= 80', () => {
    expect(getConfianzaTextColor(80)).toBe('text-green-600');
    expect(getConfianzaTextColor(95)).toBe('text-green-600');
  });

  it('debería retornar text-yellow-600 para confianza >= 50 y < 80', () => {
    expect(getConfianzaTextColor(50)).toBe('text-yellow-600');
    expect(getConfianzaTextColor(70)).toBe('text-yellow-600');
  });

  it('debería retornar text-red-600 para confianza < 50', () => {
    expect(getConfianzaTextColor(0)).toBe('text-red-600');
    expect(getConfianzaTextColor(30)).toBe('text-red-600');
  });

  it('debería retornar text-slate-600 para null', () => {
    expect(getConfianzaTextColor(null)).toBe('text-slate-600');
  });
});

describe('remitosUtils - getExportFilename', () => {
  it('debería generar nombre con fecha actual', () => {
    const filename = getExportFilename();
    expect(filename).toMatch(/^remitos_\d{4}-\d{2}-\d{2}\.xlsx$/);
  });

  it('debería tener extensión xlsx', () => {
    const filename = getExportFilename();
    expect(filename).toContain('.xlsx');
  });
});

describe('remitosUtils - buildExportParams', () => {
  it('debería construir params con todos los filtros', () => {
    const filters: ExportFilters = {
      fechaDesde: '2024-01-01',
      fechaHasta: '2024-12-31',
      estado: 'APROBADO',
      clienteNombre: 'Cliente Test',
      transportistaNombre: 'Transportista Test',
      patenteChasis: 'ABC123',
    };
    const params = buildExportParams(filters);
    expect(params.toString()).toBe(
      'fechaDesde=2024-01-01&fechaHasta=2024-12-31&estado=APROBADO&clienteNombre=Cliente+Test&transportistaNombre=Transportista+Test&patenteChasis=ABC123'
    );
  });

  it('debería construir params vacíos cuando no hay filtros', () => {
    const params = buildExportParams({});
    expect(params.toString()).toBe('');
  });

  it('debería incluir solo filtros definidos', () => {
    const filters: ExportFilters = {
      estado: 'PENDIENTE_APROBACION',
      clienteNombre: 'Cliente',
    };
    const params = buildExportParams(filters);
    expect(params.toString()).toBe('estado=PENDIENTE_APROBACION&clienteNombre=Cliente');
  });

  it('debería manejar caracteres especiales en nombres', () => {
    const filters: ExportFilters = {
      clienteNombre: 'Cliente O\'Brien',
    };
    const params = buildExportParams(filters);
    expect(params.get('clienteNombre')).toBe("Cliente O'Brien");
  });
});

describe('remitosUtils - isoToInputDate', () => {
  it('debería convertir fecha ISO a formato input', () => {
    expect(isoToInputDate('2024-01-15T10:30:00')).toBe('2024-01-15');
  });

  it('debería retornar string vacío para null', () => {
    expect(isoToInputDate(null)).toBe('');
  });

  it('debería manejar fecha con zona horaria', () => {
    expect(isoToInputDate('2024-12-31T23:59:59Z')).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe('remitosUtils - numberToString', () => {
  it('debería convertir número a string', () => {
    expect(numberToString(123)).toBe('123');
  });

  it('debería retornar string vacío para null', () => {
    expect(numberToString(null)).toBe('');
  });

  it('debería retornar string vacío para undefined', () => {
    expect(numberToString(undefined)).toBe('');
  });

  it('debería manejar decimales', () => {
    expect(numberToString(123.45)).toBe('123.45');
  });

  it('debería manejar cero', () => {
    expect(numberToString(0)).toBe('0');
  });
});

describe('remitosUtils - stringToNumber', () => {
  it('debería convertir string válido a número', () => {
    expect(stringToNumber('123')).toBe(123);
  });

  it('debería retornar null para string vacío', () => {
    expect(stringToNumber('')).toBe(null);
  });

  it('debería convertir string decimal', () => {
    expect(stringToNumber('123.45')).toBe(123.45);
  });

  it('debería retornar null para string inválido', () => {
    expect(stringToNumber('abc')).toBe(null);
  });

  it('debería manejar string con espacios', () => {
    expect(stringToNumber(' 123 ')).toBe(123);
  });

  it('debería manejar cero', () => {
    expect(stringToNumber('0')).toBe(0);
  });
});
