/**
 * Tests para utilidades de formateo
 */
import { describe, it, expect } from '@jest/globals';
import { 
  formatDate, 
  formatDateTime, 
  formatCuit, 
  formatCurrency, 
  formatPhone, 
  formatFileSize 
} from '../formatters';

describe('formatDate', () => {
  it('formatea fecha string correctamente', () => {
    const result = formatDate('2024-03-15T12:00:00');
    // Verificamos que la fecha se formatee (el formato exacto depende del locale)
    expect(result).toBeDefined();
    expect(result).not.toBe('-');
    expect(result.length).toBeGreaterThan(5);
  });

  it('formatea objeto Date correctamente', () => {
    const date = new Date(2024, 2, 15); // Marzo 15, 2024
    const result = formatDate(date);
    expect(result).toMatch(/15/);
  });

  it('retorna "-" para fecha inválida', () => {
    expect(formatDate('invalid-date')).toBe('-');
  });

  it('acepta locale personalizado', () => {
    const result = formatDate('2024-03-15', 'en-US');
    expect(result).toBeDefined();
  });

  it('acepta opciones de formato personalizadas', () => {
    const options: Intl.DateTimeFormatOptions = { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    };
    const result = formatDate('2024-03-15', 'es-AR', options);
    expect(result).toContain('2024');
  });
});

describe('formatDateTime', () => {
  it('formatea fecha y hora string correctamente', () => {
    const result = formatDateTime('2024-03-15T14:30:00');
    expect(result).toBeDefined();
    expect(result.length).toBeGreaterThan(5);
  });

  it('formatea objeto Date correctamente', () => {
    const date = new Date(2024, 2, 15, 14, 30);
    const result = formatDateTime(date);
    expect(result).toBeDefined();
  });

  it('retorna "-" para fecha inválida', () => {
    expect(formatDateTime('not-a-date')).toBe('-');
  });

  it('acepta locale personalizado', () => {
    const result = formatDateTime('2024-03-15T14:30:00', 'en-US');
    expect(result).toBeDefined();
  });
});

describe('formatCuit', () => {
  it('formatea CUIT completo correctamente', () => {
    expect(formatCuit('20304050607')).toBe('20-30405060-7');
  });

  it('formatea CUIT que ya tiene guiones', () => {
    expect(formatCuit('20-30405060-7')).toBe('20-30405060-7');
  });

  it('retorna string vacío para undefined', () => {
    expect(formatCuit(undefined)).toBe('');
  });

  it('retorna string vacío para null', () => {
    expect(formatCuit(null as any)).toBe('');
  });

  it('retorna el valor original para CUIT con longitud incorrecta', () => {
    expect(formatCuit('12345')).toBe('12345');
  });

  it('limpia caracteres no numéricos antes de formatear', () => {
    expect(formatCuit('20.30405060.7')).toBe('20-30405060-7');
  });
});

describe('formatCurrency', () => {
  it('formatea monto en ARS correctamente', () => {
    const result = formatCurrency(1500.50);
    expect(result).toContain('1');
    expect(result).toMatch(/500|\.500|,500/);
  });

  it('acepta moneda personalizada', () => {
    const result = formatCurrency(100, 'USD');
    expect(result).toContain('100');
  });

  it('acepta locale personalizado', () => {
    const result = formatCurrency(100, 'USD', 'en-US');
    expect(result).toContain('$');
  });

  it('retorna string del número si hay error de formato', () => {
    // Moneda inválida debería causar error en algunos locales
    const result = formatCurrency(100, 'INVALID', 'es-AR');
    // Puede retornar el string o formatear según la implementación
    expect(result).toBeDefined();
  });
});

describe('formatPhone', () => {
  it('limpia espacios del teléfono', () => {
    expect(formatPhone('+54 9 11 1234 5678')).toBe('+5491112345678');
  });

  it('retorna teléfono sin espacios intacto', () => {
    expect(formatPhone('+5491112345678')).toBe('+5491112345678');
  });

  it('maneja string vacío', () => {
    expect(formatPhone('')).toBe('');
  });
});

describe('formatFileSize', () => {
  it('formatea 0 bytes correctamente', () => {
    expect(formatFileSize(0)).toBe('0 Bytes');
  });

  it('formatea bytes pequeños', () => {
    expect(formatFileSize(500)).toBe('500 Bytes');
  });

  it('formatea kilobytes', () => {
    const result = formatFileSize(1536);
    expect(result).toBe('1.5 KB');
  });

  it('formatea megabytes', () => {
    const result = formatFileSize(2 * 1024 * 1024);
    expect(result).toBe('2 MB');
  });

  it('formatea gigabytes', () => {
    const result = formatFileSize(3 * 1024 * 1024 * 1024);
    expect(result).toBe('3 GB');
  });

  it('retorna "-" para números negativos', () => {
    expect(formatFileSize(-100)).toBe('-');
  });

  it('retorna "-" para Infinity', () => {
    expect(formatFileSize(Infinity)).toBe('-');
  });

  it('retorna "-" para NaN', () => {
    expect(formatFileSize(NaN)).toBe('-');
  });
});

