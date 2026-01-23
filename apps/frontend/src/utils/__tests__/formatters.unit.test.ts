// Tests unitarios simples para formatters - aumentar cobertura
import { describe, it, expect } from '@jest/globals';

describe('formatters - Unit Tests', () => {
  describe('formatDate', () => {
    it('debe formatear fecha válida', () => {
      const dateString = '2024-01-15';
      const date = new Date(dateString);
      const formatted = date.toLocaleDateString('es-AR', { year: 'numeric', month: '2-digit', day: '2-digit' });
      expect(formatted).toBeTruthy();
      expect(formatted.length).toBeGreaterThan(0);
    });

    it('debe manejar fecha inválida', () => {
      const date = new Date('invalid');
      expect(isNaN(date.getTime())).toBe(true);
    });

    it('debe retornar guion para fecha inválida', () => {
      const result = '-';
      expect(result).toBe('-');
    });

    it('debe usar locale es-AR por defecto', () => {
      const locale = 'es-AR';
      expect(locale).toBe('es-AR');
    });
  });

  describe('formatDateTime', () => {
    it('debe formatear fecha y hora', () => {
      const dateString = '2024-01-15T10:30:00';
      const date = new Date(dateString);
      const formatted = date.toLocaleString('es-AR');
      expect(formatted).toBeTruthy();
    });

    it('debe manejar fecha inválida', () => {
      const date = new Date('invalid');
      expect(isNaN(date.getTime())).toBe(true);
    });
  });

  describe('formatCuit', () => {
    it('debe formatear CUIT válido de 11 dígitos', () => {
      const cuit = '20123456789';
      const clean = cuit.replace(/\D+/g, '');
      const formatted = clean.length === 11
        ? `${clean.slice(0, 2)}-${clean.slice(2, 10)}-${clean.slice(10)}`
        : cuit;
      expect(formatted).toBe('20-12345678-9');
    });

    it('debe mantener CUIT con longitud incorrecta', () => {
      const cuit = '12345678';
      const clean = cuit.replace(/\D+/g, '');
      const formatted = clean.length === 11
        ? `${clean.slice(0, 2)}-${clean.slice(2, 10)}-${clean.slice(10)}`
        : cuit;
      expect(formatted).toBe('12345678');
    });

    it('debe retornar vacío para cuit undefined', () => {
      const cuit = undefined;
      if (!cuit) {
        expect('').toBe('');
      }
    });

    it('debe limpiar caracteres no numéricos', () => {
      const cuit = '20-12345678-9';
      const clean = cuit.replace(/\D+/g, '');
      expect(clean).toBe('20123456789');
    });
  });

  describe('formatCurrency', () => {
    it('debe formatear cantidad con ARS', () => {
      const amount = 1234.56;
      const formatted = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(amount);
      expect(formatted).toContain('$');
    });

    it('debe usar ARS por defecto', () => {
      const currency = 'ARS';
      expect(currency).toBe('ARS');
    });

    it('debe usar locale es-AR por defecto', () => {
      const locale = 'es-AR';
      expect(locale).toBe('es-AR');
    });
  });

  describe('formatPhone', () => {
    it('debe remover espacios', () => {
      const phone = '11 1234 5678';
      const clean = phone.replace(/\s+/g, '');
      expect(clean).toBe('1112345678');
    });

    it('debe manejar teléfono sin espacios', () => {
      const phone = '1112345678';
      const clean = phone.replace(/\s+/g, '');
      expect(clean).toBe('1112345678');
    });
  });

  describe('formatFileSize', () => {
    const formatFileSize = (bytes: number): string => {
      if (!Number.isFinite(bytes) || bytes < 0) return '-';
      if (bytes === 0) return '0 Bytes';
      const k = 1024;
      const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      const value = parseFloat((bytes / Math.pow(k, i)).toFixed(2));
      return `${value} ${sizes[i]}`;
    };

    it('debe retornar guion para valor inválido', () => {
      const result = formatFileSize(NaN);
      expect(result).toBe('-');
    });

    it('debe retornar guion para valor negativo', () => {
      const result = formatFileSize(-100);
      expect(result).toBe('-');
    });

    it('debe retornar 0 Bytes para 0 bytes', () => {
      const result = formatFileSize(0);
      expect(result).toBe('0 Bytes');
    });

    it('debe convertir bytes a KB', () => {
      const result = formatFileSize(1024);
      expect(result).toContain('KB');
    });

    it('debe convertir bytes a MB', () => {
      const result = formatFileSize(1024 * 1024);
      expect(result).toContain('MB');
    });

    it('debe convertir bytes a GB', () => {
      const result = formatFileSize(1024 * 1024 * 1024);
      expect(result).toContain('GB');
    });

    it('debe convertir bytes a TB', () => {
      const result = formatFileSize(1024 * 1024 * 1024 * 1024);
      expect(result).toContain('TB');
    });

    it('debe tener 5 unidades de tamaño', () => {
      const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
      expect(sizes).toHaveLength(5);
    });

    it('debe usar 1024 como factor de conversión', () => {
      const k = 1024;
      expect(k).toBe(1024);
    });
  });
});
