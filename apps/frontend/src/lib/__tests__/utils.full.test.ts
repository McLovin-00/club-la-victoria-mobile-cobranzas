/**
 * Tests completos para lib/utils.ts
 * Cubre cn y Logger
 */
import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { cn, Logger, isDevelopment, isProduction } from '../utils';

describe('cn (className merge utility)', () => {
  it('combina clases simples', () => {
    expect(cn('class1', 'class2')).toBe('class1 class2');
  });

  it('maneja clases condicionales', () => {
    expect(cn('base', true && 'active', false && 'hidden')).toBe('base active');
  });

  it('maneja arrays de clases', () => {
    expect(cn(['class1', 'class2'])).toBe('class1 class2');
  });

  it('maneja objetos de clases', () => {
    expect(cn({ active: true, disabled: false })).toBe('active');
  });

  it('maneja undefined y null', () => {
    expect(cn('base', undefined, null, 'end')).toBe('base end');
  });

  it('resuelve conflictos de Tailwind', () => {
    // twMerge debe resolver conflictos
    expect(cn('p-4', 'p-2')).toBe('p-2');
    expect(cn('bg-red-500', 'bg-blue-500')).toBe('bg-blue-500');
  });

  it('maneja string vacío', () => {
    expect(cn('')).toBe('');
  });

  it('combina múltiples tipos', () => {
    const result = cn(
      'base',
      ['array1', 'array2'],
      { conditional: true },
      true && 'ternary'
    );
    expect(result).toContain('base');
    expect(result).toContain('array1');
    expect(result).toContain('conditional');
    expect(result).toContain('ternary');
  });
});

describe('Logger', () => {
  let consoleSpy: {
    log: jest.SpiedFunction<typeof console.log>;
    warn: jest.SpiedFunction<typeof console.warn>;
    error: jest.SpiedFunction<typeof console.error>;
    debug: jest.SpiedFunction<typeof console.debug>;
    group: jest.SpiedFunction<typeof console.group>;
    groupEnd: jest.SpiedFunction<typeof console.groupEnd>;
    table: jest.SpiedFunction<typeof console.table>;
  };

  beforeEach(() => {
    consoleSpy = {
      log: jest.spyOn(console, 'log').mockImplementation(() => {}),
      warn: jest.spyOn(console, 'warn').mockImplementation(() => {}),
      error: jest.spyOn(console, 'error').mockImplementation(() => {}),
      debug: jest.spyOn(console, 'debug').mockImplementation(() => {}),
      group: jest.spyOn(console, 'group').mockImplementation(() => {}),
      groupEnd: jest.spyOn(console, 'groupEnd').mockImplementation(() => {}),
      table: jest.spyOn(console, 'table').mockImplementation(() => {}),
    };
  });

  afterEach(() => {
    Object.values(consoleSpy).forEach(spy => spy.mockRestore());
  });

  describe('Logger.log', () => {
    it('existe y es callable', () => {
      expect(() => Logger.log('test')).not.toThrow();
    });

    it('acepta múltiples argumentos', () => {
      expect(() => Logger.log('arg1', 'arg2', { key: 'value' })).not.toThrow();
    });
  });

  describe('Logger.warn', () => {
    it('existe y es callable', () => {
      expect(() => Logger.warn('warning')).not.toThrow();
    });

    it('acepta múltiples argumentos', () => {
      expect(() => Logger.warn('warning', 'extra')).not.toThrow();
    });
  });

  describe('Logger.error', () => {
    it('existe y es callable', () => {
      expect(() => Logger.error('error')).not.toThrow();
    });

    it('loguea errores (visible en todos los entornos)', () => {
      Logger.error('test error');
      expect(consoleSpy.error).toHaveBeenCalled();
    });

    it('maneja objetos de error', () => {
      Logger.error(new Error('test'));
      expect(consoleSpy.error).toHaveBeenCalled();
    });

    it('maneja múltiples argumentos', () => {
      Logger.error('message', { detail: 'info' });
      expect(consoleSpy.error).toHaveBeenCalled();
    });
  });

  describe('Logger.debug', () => {
    it('existe y es callable', () => {
      expect(() => Logger.debug('debug')).not.toThrow();
    });

    it('acepta objetos', () => {
      expect(() => Logger.debug({ key: 'value' })).not.toThrow();
    });
  });

  describe('Logger.api', () => {
    it('existe y es callable', () => {
      expect(() => Logger.api('GET /users')).not.toThrow();
    });

    it('acepta data opcional', () => {
      expect(() => Logger.api('POST /users', { status: 201 })).not.toThrow();
    });

    it('maneja headers con authorization', () => {
      expect(() => Logger.api('request', { headers: { authorization: 'Bearer token' } })).not.toThrow();
    });
  });

  describe('Logger.performance', () => {
    it('existe y es callable', () => {
      expect(() => Logger.performance('Load time')).not.toThrow();
    });

    it('acepta data opcional', () => {
      expect(() => Logger.performance('Metrics', { ms: 100 })).not.toThrow();
    });
  });

  describe('Logger.audit', () => {
    it('existe y es callable', () => {
      expect(() => Logger.audit('action')).not.toThrow();
    });

    it('acepta data opcional', () => {
      expect(() => Logger.audit('login', { userId: 1 })).not.toThrow();
    });
  });
});

describe('Environment flags', () => {
  it('isDevelopment es booleano', () => {
    expect(typeof isDevelopment).toBe('boolean');
  });

  it('isProduction es booleano', () => {
    expect(typeof isProduction).toBe('boolean');
  });
});
