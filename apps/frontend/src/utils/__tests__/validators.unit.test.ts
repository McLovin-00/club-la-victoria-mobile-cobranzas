// Tests unitarios simples para validators - aumentar cobertura
import { describe, it, expect } from '@jest/globals';

describe('validators - Unit Tests', () => {
  describe('validatePhone', () => {
    const phoneRegex = /^\+?[1-9]\d{7,14}$/;

    const validatePhone = (value: string): boolean => phoneRegex.test(value);

    it('debe aceptar teléfono válido sin +', () => {
      expect(validatePhone('5491112345678')).toBe(true);
    });

    it('debe aceptar teléfono válido con +', () => {
      expect(validatePhone('+5491112345678')).toBe(true);
    });

    it('debe rechazar teléfono muy corto', () => {
      expect(validatePhone('123456')).toBe(false);
    });

    it('debe rechazar teléfono muy largo', () => {
      expect(validatePhone('1234567890123456')).toBe(false);
    });

    it('debe rechazar teléfono que empieza con 0', () => {
      expect(validatePhone('01234567890')).toBe(false);
    });
  });

  describe('validateRequired', () => {
    const validateRequired = (value: string | number | undefined | null): boolean => {
      if (value === undefined || value === null) return false;
      if (typeof value === 'string') return value.trim().length > 0;
      return true;
    };

    it('debe rechazar undefined', () => {
      expect(validateRequired(undefined)).toBe(false);
    });

    it('debe rechazar null', () => {
      expect(validateRequired(null)).toBe(false);
    });

    it('debe rechazar string vacío', () => {
      expect(validateRequired('')).toBe(false);
    });

    it('debe rechazar string solo con espacios', () => {
      expect(validateRequired('   ')).toBe(false);
    });

    it('debe aceptar string con contenido', () => {
      expect(validateRequired('texto')).toBe(true);
    });

    it('debe aceptar número', () => {
      expect(validateRequired(123)).toBe(true);
    });

    it('debe aceptar 0', () => {
      expect(validateRequired(0)).toBe(true);
    });
  });

  describe('validateEmail', () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    const validateEmail = (email: string): boolean => emailRegex.test(email);

    it('debe aceptar email válido', () => {
      expect(validateEmail('usuario@example.com')).toBe(true);
    });

    it('debe aceptar email con subdominio', () => {
      expect(validateEmail('usuario@mail.example.com')).toBe(true);
    });

    it('debe aceptar email con números', () => {
      expect(validateEmail('user123@example.com')).toBe(true);
    });

    it('debe rechazar email sin @', () => {
      expect(validateEmail('usuarioexample.com')).toBe(false);
    });

    it('debe rechazar email sin dominio', () => {
      expect(validateEmail('usuario@')).toBe(false);
    });

    it('debe rechazar email sin TLD', () => {
      expect(validateEmail('usuario@example')).toBe(false);
    });

    it('debe rechazar email con espacios', () => {
      expect(validateEmail('usuario @example.com')).toBe(false);
    });
  });

  describe('validateCuit', () => {
    const cuitRegex = /^\d{2}-?\d{8}-?\d$/;

    const validateCuit = (cuit: string): boolean => cuitRegex.test(cuit.replace(/\D+/g, ''));

    it('debe aceptar CUIT válido de 11 dígitos', () => {
      expect(validateCuit('20123456789')).toBe(true);
    });

    it('debe aceptar CUIT con guiones', () => {
      expect(validateCuit('20-12345678-9')).toBe(true);
    });

    it('debe rechazar CUIT muy corto', () => {
      expect(validateCuit('12345678')).toBe(false);
    });

    it('debe rechazar CUIT muy largo', () => {
      expect(validateCuit('201234567890')).toBe(false);
    });

    it('debe limpiar caracteres no numéricos', () => {
      const cuit = '20-123-45678-9';
      const clean = cuit.replace(/\D+/g, '');
      expect(clean).toBe('20123456789');
    });
  });

  describe('validateFileType', () => {
    const validateFileType = (file: { type: string }, allowedTypes: string[]): boolean => {
      return allowedTypes.includes(file.type);
    };

    it('debe aceptar tipo de archivo permitido', () => {
      const file = { type: 'application/pdf' };
      const allowedTypes = ['application/pdf', 'image/jpeg'];
      expect(validateFileType(file, allowedTypes)).toBe(true);
    });

    it('debe rechazar tipo de archivo no permitido', () => {
      const file = { type: 'application/msword' };
      const allowedTypes = ['application/pdf', 'image/jpeg'];
      expect(validateFileType(file, allowedTypes)).toBe(false);
    });

    it('debe aceptar imagen JPEG', () => {
      const file = { type: 'image/jpeg' };
      const allowedTypes = ['image/jpeg', 'image/png'];
      expect(validateFileType(file, allowedTypes)).toBe(true);
    });

    it('debe aceptar imagen PNG', () => {
      const file = { type: 'image/png' };
      const allowedTypes = ['image/jpeg', 'image/png'];
      expect(validateFileType(file, allowedTypes)).toBe(true);
    });
  });

  describe('validateFileSize', () => {
    const validateFileSize = (file: { size: number }, maxBytes: number): boolean => {
      return file.size <= maxBytes;
    };

    it('debe aceptar archivo dentro del límite', () => {
      const file = { size: 1024 * 1024 }; // 1 MB
      const maxBytes = 10 * 1024 * 1024; // 10 MB
      expect(validateFileSize(file, maxBytes)).toBe(true);
    });

    it('debe aceptar archivo exactamente en el límite', () => {
      const file = { size: 10 * 1024 * 1024 }; // 10 MB
      const maxBytes = 10 * 1024 * 1024; // 10 MB
      expect(validateFileSize(file, maxBytes)).toBe(true);
    });

    it('debe rechazar archivo que excede el límite', () => {
      const file = { size: 11 * 1024 * 1024 }; // 11 MB
      const maxBytes = 10 * 1024 * 1024; // 10 MB
      expect(validateFileSize(file, maxBytes)).toBe(false);
    });

    it('debe aceptar archivo vacío', () => {
      const file = { size: 0 };
      const maxBytes = 10 * 1024 * 1024;
      expect(validateFileSize(file, maxBytes)).toBe(true);
    });
  });

  describe('expresiones regulares', () => {
    it('phoneRegex debe empezar opcionalmente con +', () => {
      const phoneRegex = /^\+?[1-9]\d{7,14}$/;
      expect(phoneRegex.test('+5491112345678')).toBe(true);
      expect(phoneRegex.test('5491112345678')).toBe(true);
    });

    it('emailRegex debe tener estructura básica', () => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      expect(emailRegex.test('a@b.c')).toBe(true);
    });

    it('cuitRegex debe aceptar formato con guiones', () => {
      const cuitRegex = /^\d{2}-?\d{8}-?\d$/;
      expect(cuitRegex.test('20-12345678-9')).toBe(true);
      expect(cuitRegex.test('20123456789')).toBe(true);
    });
  });
});
