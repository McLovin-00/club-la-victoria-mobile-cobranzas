/**
 * Tests para utilidades de validación
 */
import { describe, it, expect } from '@jest/globals';
import { 
  validatePhone, 
  phoneRegex,
  validateRequired, 
  validateEmail, 
  emailRegex,
  validateCuit, 
  cuitRegex,
  validateFileType, 
  validateFileSize 
} from '../validators';

describe('validatePhone', () => {
  it('valida teléfono con código de país', () => {
    expect(validatePhone('+5491112345678')).toBe(true);
  });

  it('valida teléfono sin +', () => {
    expect(validatePhone('5491112345678')).toBe(true);
  });

  it('rechaza teléfono muy corto', () => {
    expect(validatePhone('123')).toBe(false);
  });

  it('rechaza teléfono con letras', () => {
    expect(validatePhone('+54911ABC5678')).toBe(false);
  });

  it('rechaza teléfono que empieza con 0', () => {
    expect(validatePhone('0111234567')).toBe(false);
  });

  it('phoneRegex está exportado correctamente', () => {
    expect(phoneRegex).toBeInstanceOf(RegExp);
    expect(phoneRegex.test('+5491112345678')).toBe(true);
  });
});

describe('validateRequired', () => {
  it('retorna true para string con contenido', () => {
    expect(validateRequired('valor')).toBe(true);
  });

  it('retorna false para string vacío', () => {
    expect(validateRequired('')).toBe(false);
  });

  it('retorna false para string con solo espacios', () => {
    expect(validateRequired('   ')).toBe(false);
  });

  it('retorna true para número', () => {
    expect(validateRequired(123)).toBe(true);
  });

  it('retorna true para número 0', () => {
    expect(validateRequired(0)).toBe(true);
  });

  it('retorna false para undefined', () => {
    expect(validateRequired(undefined)).toBe(false);
  });

  it('retorna false para null', () => {
    expect(validateRequired(null)).toBe(false);
  });
});

describe('validateEmail', () => {
  it('valida email correcto', () => {
    expect(validateEmail('test@example.com')).toBe(true);
  });

  it('valida email con subdominios', () => {
    expect(validateEmail('user@mail.example.com')).toBe(true);
  });

  it('rechaza email sin @', () => {
    expect(validateEmail('testexample.com')).toBe(false);
  });

  it('rechaza email sin dominio', () => {
    expect(validateEmail('test@')).toBe(false);
  });

  it('rechaza email con espacios', () => {
    expect(validateEmail('test @example.com')).toBe(false);
  });

  it('emailRegex está exportado correctamente', () => {
    expect(emailRegex).toBeInstanceOf(RegExp);
  });
});

describe('validateCuit', () => {
  it('valida CUIT correcto de 11 dígitos', () => {
    expect(validateCuit('20304050607')).toBe(true);
  });

  it('valida CUIT con guiones', () => {
    expect(validateCuit('20-30405060-7')).toBe(true);
  });

  it('rechaza CUIT muy corto', () => {
    expect(validateCuit('2030405060')).toBe(false);
  });

  it('rechaza CUIT muy largo', () => {
    expect(validateCuit('203040506078')).toBe(false);
  });

  it('cuitRegex está exportado correctamente', () => {
    expect(cuitRegex).toBeInstanceOf(RegExp);
  });
});

describe('validateFileType', () => {
  const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'];

  it('retorna true para tipo permitido', () => {
    const file = new File(['content'], 'test.jpg', { type: 'image/jpeg' });
    expect(validateFileType(file, allowedTypes)).toBe(true);
  });

  it('retorna true para PDF', () => {
    const file = new File(['content'], 'test.pdf', { type: 'application/pdf' });
    expect(validateFileType(file, allowedTypes)).toBe(true);
  });

  it('retorna false para tipo no permitido', () => {
    const file = new File(['content'], 'test.exe', { type: 'application/x-msdownload' });
    expect(validateFileType(file, allowedTypes)).toBe(false);
  });

  it('retorna false para lista vacía de tipos permitidos', () => {
    const file = new File(['content'], 'test.jpg', { type: 'image/jpeg' });
    expect(validateFileType(file, [])).toBe(false);
  });
});

describe('validateFileSize', () => {
  it('retorna true para archivo dentro del límite', () => {
    const file = new File(['small content'], 'test.txt', { type: 'text/plain' });
    Object.defineProperty(file, 'size', { value: 1024 }); // 1KB
    
    expect(validateFileSize(file, 1024 * 1024)).toBe(true); // Límite 1MB
  });

  it('retorna true para archivo exactamente en el límite', () => {
    const file = new File(['content'], 'test.txt', { type: 'text/plain' });
    Object.defineProperty(file, 'size', { value: 1024 });
    
    expect(validateFileSize(file, 1024)).toBe(true);
  });

  it('retorna false para archivo que excede el límite', () => {
    const file = new File(['content'], 'test.txt', { type: 'text/plain' });
    Object.defineProperty(file, 'size', { value: 2048 });
    
    expect(validateFileSize(file, 1024)).toBe(false);
  });

  it('retorna true para archivo de 0 bytes', () => {
    const file = new File([], 'empty.txt', { type: 'text/plain' });
    expect(validateFileSize(file, 1024)).toBe(true);
  });
});

