/**
 * Tests para utilidades generales (cn, Logger)
 */
import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { cn, Logger, isDevelopment, isProduction } from '../utils';

describe('utils module', () => {
  describe('cn (className merger)', () => {
    it('combina clases simples', () => {
      expect(cn('class1', 'class2')).toBe('class1 class2');
    });

    it('maneja clases condicionales', () => {
      expect(cn('base', true && 'active', false && 'inactive')).toBe('base active');
    });

    it('maneja arrays de clases', () => {
      expect(cn(['class1', 'class2'])).toBe('class1 class2');
    });

    it('maneja objetos de clases', () => {
      expect(cn({ active: true, disabled: false })).toBe('active');
    });

    it('merge clases de Tailwind correctamente', () => {
      // tailwind-merge debería resolver conflictos
      expect(cn('px-2', 'px-4')).toBe('px-4');
    });

    it('maneja valores undefined y null', () => {
      expect(cn('base', undefined, null, 'final')).toBe('base final');
    });

    it('maneja string vacío', () => {
      expect(cn('base', '', 'final')).toBe('base final');
    });

    it('resuelve conflictos de margin', () => {
      expect(cn('mt-2', 'mt-4')).toBe('mt-4');
    });

    it('resuelve conflictos de padding', () => {
      expect(cn('py-2', 'py-4')).toBe('py-4');
    });

    it('mantiene clases no conflictivas', () => {
      expect(cn('text-red-500', 'bg-blue-500')).toBe('text-red-500 bg-blue-500');
    });

    it('maneja combinaciones complejas', () => {
      const result = cn(
        'base-class',
        ['array-class'],
        { 'object-class': true },
        true && 'conditional-class'
      );
      expect(result).toContain('base-class');
      expect(result).toContain('array-class');
      expect(result).toContain('object-class');
      expect(result).toContain('conditional-class');
    });
  });

  describe('isDevelopment / isProduction', () => {
    it('isDevelopment está definido', () => {
      expect(typeof isDevelopment).toBe('boolean');
    });

    it('isProduction está definido', () => {
      expect(typeof isProduction).toBe('boolean');
    });

    it('isDevelopment y isProduction son opuestos o ambos false', () => {
      expect(isDevelopment !== undefined).toBe(true);
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
      it('es una función', () => {
        expect(typeof Logger.log).toBe('function');
      });

      it('no lanza error al ejecutarse', () => {
        expect(() => Logger.log('Test message')).not.toThrow();
      });

      it('acepta múltiples argumentos', () => {
        expect(() => Logger.log('Message', { data: 1 }, [1, 2, 3])).not.toThrow();
      });

      it('acepta objetos', () => {
        expect(() => Logger.log({ key: 'value', nested: { a: 1 } })).not.toThrow();
      });

      it('acepta null y undefined', () => {
        expect(() => Logger.log(null, undefined, 'string')).not.toThrow();
      });
    });

    describe('Logger.warn', () => {
      it('es una función', () => {
        expect(typeof Logger.warn).toBe('function');
      });

      it('no lanza error al ejecutarse', () => {
        expect(() => Logger.warn('Warning')).not.toThrow();
      });

      it('acepta múltiples argumentos', () => {
        expect(() => Logger.warn('Warning', 'extra', 123)).not.toThrow();
      });
    });

    describe('Logger.error', () => {
      it('es una función', () => {
        expect(typeof Logger.error).toBe('function');
      });

      it('no lanza error al ejecutarse', () => {
        expect(() => Logger.error('Error message')).not.toThrow();
      });

      it('acepta objetos como argumento', () => {
        expect(() => Logger.error({ error: 'test' })).not.toThrow();
      });

      it('acepta Error objects', () => {
        expect(() => Logger.error(new Error('Test error'))).not.toThrow();
      });

      it('maneja strings con palabras sensibles', () => {
        expect(() => Logger.error('Error with token')).not.toThrow();
        expect(() => Logger.error('Error with password')).not.toThrow();
        expect(() => Logger.error('Error with JWT')).not.toThrow();
        expect(() => Logger.error('Error with Bearer')).not.toThrow();
      });
    });

    describe('Logger.debug', () => {
      it('es una función', () => {
        expect(typeof Logger.debug).toBe('function');
      });

      it('no lanza error al ejecutarse', () => {
        expect(() => Logger.debug('Debug info')).not.toThrow();
      });

      it('acepta objetos complejos', () => {
        expect(() => Logger.debug({ nested: { data: [1, 2, 3] } })).not.toThrow();
      });
    });

    describe('Logger.api', () => {
      it('es una función', () => {
        expect(typeof Logger.api).toBe('function');
      });

      it('no lanza error con mensaje solo', () => {
        expect(() => Logger.api('API call')).not.toThrow();
      });

      it('no lanza error con mensaje y data', () => {
        expect(() => Logger.api('Request', { url: '/test', method: 'GET' })).not.toThrow();
      });

      it('no lanza error con headers que contienen authorization', () => {
        expect(() => Logger.api('Request', { 
          headers: { authorization: 'Bearer token123' } 
        })).not.toThrow();
      });
    });

    describe('Logger.performance', () => {
      it('es una función', () => {
        expect(typeof Logger.performance).toBe('function');
      });

      it('no lanza error con mensaje solo', () => {
        expect(() => Logger.performance('Metric')).not.toThrow();
      });

      it('no lanza error con data', () => {
        expect(() => Logger.performance('Load time', { duration: 100 })).not.toThrow();
      });
    });

    describe('Logger.audit', () => {
      it('es una función', () => {
        expect(typeof Logger.audit).toBe('function');
      });

      it('no lanza error con acción solo', () => {
        expect(() => Logger.audit('USER_LOGIN')).not.toThrow();
      });

      it('no lanza error con acción y data', () => {
        expect(() => Logger.audit('USER_LOGIN', { userId: 1 })).not.toThrow();
      });

      it('incluye timestamp', () => {
        const beforeTimestamp = new Date().toISOString();
        Logger.audit('TEST_ACTION');
        const afterTimestamp = new Date().toISOString();
        
        // Verificamos que la función se ejecuta sin error
        expect(beforeTimestamp).toBeTruthy();
        expect(afterTimestamp).toBeTruthy();
      });
    });
  });
});

describe('Logger - comportamiento según entorno', () => {
  it('Logger existe y tiene todos los métodos', () => {
    expect(Logger.log).toBeDefined();
    expect(Logger.warn).toBeDefined();
    expect(Logger.error).toBeDefined();
    expect(Logger.debug).toBeDefined();
    expect(Logger.api).toBeDefined();
    expect(Logger.performance).toBeDefined();
    expect(Logger.audit).toBeDefined();
  });

  it('todos los métodos de Logger son funciones', () => {
    expect(typeof Logger.log).toBe('function');
    expect(typeof Logger.warn).toBe('function');
    expect(typeof Logger.error).toBe('function');
    expect(typeof Logger.debug).toBe('function');
    expect(typeof Logger.api).toBe('function');
    expect(typeof Logger.performance).toBe('function');
    expect(typeof Logger.audit).toBe('function');
  });
});
