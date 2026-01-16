/**
 * Smoke tests para auth.controller.ts
 * Verifica que el módulo se puede importar y las funciones están definidas
 */

import * as authController from '../auth.controller';

describe('AuthController - Smoke Tests', () => {
  it('should export login function', () => {
    expect(authController.login).toBeDefined();
    expect(typeof authController.login).toBe('function');
  });

  it('should export register function', () => {
    expect(authController.register).toBeDefined();
    expect(typeof authController.register).toBe('function');
  });

  it('should export getCurrentUser function', () => {
    expect(authController.getCurrentUser).toBeDefined();
    expect(typeof authController.getCurrentUser).toBe('function');
  });

  it('should export changePassword function', () => {
    expect(authController.changePassword).toBeDefined();
    expect(typeof authController.changePassword).toBe('function');
  });

  it('should export checkEmail function', () => {
    expect(authController.checkEmail).toBeDefined();
    expect(typeof authController.checkEmail).toBe('function');
  });

  it('should export refreshToken function', () => {
    expect(authController.refreshToken).toBeDefined();
    expect(typeof authController.refreshToken).toBe('function');
  });

  it('should export updateEmpresa function', () => {
    expect(authController.updateEmpresa).toBeDefined();
    expect(typeof authController.updateEmpresa).toBe('function');
  });
});

