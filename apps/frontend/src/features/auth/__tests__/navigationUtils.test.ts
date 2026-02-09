/**
 * Tests Unitarios para navigationUtils
 * Objetivo: 100% de cobertura - funciones puras sin dependencias externas
 */
import { describe, it, expect } from '@jest/globals';
import {
  getDestinationByRole,
  isValidRole,
  getLoginErrorMessage,
  classifyLoginError,
  type UserRole,
} from '../navigationUtils';

describe('navigationUtils - getDestinationByRole', () => {
  describe('roles válados', () => {
    it('debería retornar /portal/admin-interno para ADMIN_INTERNO', () => {
      expect(getDestinationByRole('ADMIN_INTERNO')).toBe('/portal/admin-interno');
    });

    it('debería retornar /portal/dadores para DADOR_DE_CARGA', () => {
      expect(getDestinationByRole('DADOR_DE_CARGA')).toBe('/portal/dadores');
    });

    it('debería retornar /portal/transportistas para TRANSPORTISTA', () => {
      expect(getDestinationByRole('TRANSPORTISTA')).toBe('/portal/transportistas');
    });

    it('debería retornar /portal/transportistas para CHOFER (mismo destino que TRANSPORTISTA)', () => {
      expect(getDestinationByRole('CHOFER')).toBe('/portal/transportistas');
    });

    it('debería retornar /portal/cliente para CLIENTE', () => {
      expect(getDestinationByRole('CLIENTE')).toBe('/portal/cliente');
    });

    it('debería retornar /dashboard para SUPERADMIN', () => {
      expect(getDestinationByRole('SUPERADMIN')).toBe('/dashboard');
    });
  });

  describe('caso default (fallback)', () => {
    it('debería aceptar rol como string para cubrir default', () => {
      // El default del switch se cubre con cualquier valor no válido
      const result = getDestinationByRole('INVALID_ROLE' as UserRole);
      expect(result).toBe('/');
    });

    it('debería retornar / para string vacío', () => {
      expect(getDestinationByRole('' as UserRole)).toBe('/');
    });
  });
});

describe('navigationUtils - isValidRole', () => {
  describe('roles válidos', () => {
    const validRoles: UserRole[] = [
      'ADMIN_INTERNO',
      'DADOR_DE_CARGA',
      'TRANSPORTISTA',
      'CHOFER',
      'CLIENTE',
      'SUPERADMIN',
    ];

    validRoles.forEach((role) => {
      it(`debería considerar válido ${role}`, () => {
        expect(isValidRole(role)).toBe(true);
      });
    });
  });

  describe('roles inválidos', () => {
    it('debería retornar false para rol desconocido', () => {
      expect(isValidRole('INVALID_ROLE')).toBe(false);
    });

    it('debería retornar false para string vacío', () => {
      expect(isValidRole('')).toBe(false);
    });

    it('debería retornar false para null', () => {
      expect(isValidRole(null)).toBe(false);
    });

    it('debería retornar false para undefined', () => {
      expect(isValidRole(undefined)).toBe(false);
    });
  });

  describe('casos edge', () => {
    it('debería retornar false para number ( TypeScript safety)', () => {
      expect(isValidRole(123 as unknown as string)).toBe(false);
    });

    it('debería retornar false para object', () => {
      expect(isValidRole({} as unknown as string)).toBe(false);
    });
  });
});

describe('navigationUtils - getLoginErrorMessage', () => {
  describe('códigos de error específicos', () => {
    it('debería retornar "Credenciales inválidas" para 401', () => {
      expect(getLoginErrorMessage(401)).toBe('Credenciales inválidas');
    });

    it('debería retornar "Usuario no autorizado" para 403', () => {
      expect(getLoginErrorMessage(403)).toBe('Usuario no autorizado');
    });
  });

  describe('caso default (otros errores)', () => {
    it('debería retornar mensaje genérico para 400', () => {
      expect(getLoginErrorMessage(400)).toBe('Error al iniciar sesión');
    });

    it('debería retornar mensaje genérico para 404', () => {
      expect(getLoginErrorMessage(404)).toBe('Error al iniciar sesión');
    });

    it('debería retornar mensaje genérico para 500', () => {
      expect(getLoginErrorMessage(500)).toBe('Error al iniciar sesión');
    });

    it('debería retornar mensaje genérico para 0', () => {
      expect(getLoginErrorMessage(0)).toBe('Error al iniciar sesión');
    });

    it('debería retornar mensaje genérico para -1', () => {
      expect(getLoginErrorMessage(-1)).toBe('Error al iniciar sesión');
    });
  });

  describe('códigos de error comunes', () => {
    it('debería manejar 408 (Request Timeout)', () => {
      expect(getLoginErrorMessage(408)).toBe('Error al iniciar sesión');
    });

    it('debería manejar 502 (Bad Gateway)', () => {
      expect(getLoginErrorMessage(502)).toBe('Error al iniciar sesión');
    });

    it('debería manejar 503 (Service Unavailable)', () => {
      expect(getLoginErrorMessage(503)).toBe('Error al iniciar sesión');
    });
  });
});

describe('navigationUtils - classifyLoginError', () => {
  describe('clasificación de errores', () => {
    it('debería clasificar 401 como "credentials"', () => {
      expect(classifyLoginError(401)).toBe('credentials');
    });

    it('debería clasificar 403 como "unauthorized"', () => {
      expect(classifyLoginError(403)).toBe('unauthorized');
    });

    it('debería clasificar undefined como "unknown"', () => {
      expect(classifyLoginError(undefined)).toBe('unknown');
    });

    it('debería clasificar otros códigos como "unknown"', () => {
      expect(classifyLoginError(400)).toBe('unknown');
      expect(classifyLoginError(404)).toBe('unknown');
      expect(classifyLoginError(500)).toBe('unknown');
      expect(classifyLoginError(0)).toBe('unknown');
    });
  });

  describe('casos edge', () => {
    it('debería clasificar null como "unknown" (convertido a undefined)', () => {
      expect(classifyLoginError(null as unknown as undefined)).toBe('unknown');
    });
  });
});

describe('navigationUtils - integración de funciones', () => {
  it('debería validar rol y obtener destino correctamente', () => {
    const role: UserRole = 'ADMIN_INTERNO';
    if (isValidRole(role)) {
      const destination = getDestinationByRole(role);
      expect(destination).toBe('/portal/admin-interno');
    }
  });

  it('debería clasificar error y obtener mensaje correctamente', () => {
    const status = 401;
    const errorType = classifyLoginError(status);
    const message = getLoginErrorMessage(status);

    expect(errorType).toBe('credentials');
    expect(message).toBe('Credenciales inválidas');
  });
});
