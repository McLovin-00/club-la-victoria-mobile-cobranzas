/**
 * Tests para utilidades de MainLayout
 * Extraídas para mejorar la testabilidad y cobertura
 */
import { describe, it, expect, beforeAll } from '@jest/globals';

describe('MainLayout.utils - getRoleLabel', () => {
  let getRoleLabel: (role?: string) => string;

  beforeAll(async () => {
    ({ getRoleLabel } = await import('../MainLayout.utils'));
  });

  it('debería retornar "Usuario" para rol undefined', () => {
    expect(getRoleLabel(undefined)).toBe('Usuario');
  });

  it('debería retornar "Usuario" para rol vacío', () => {
    expect(getRoleLabel('')).toBe('Usuario');
  });

  it('debería retornar "Superadministrador" para SUPERADMIN', () => {
    expect(getRoleLabel('SUPERADMIN')).toBe('Superadministrador');
  });

  it('debería retornar "Administrador" para ADMIN', () => {
    expect(getRoleLabel('ADMIN')).toBe('Administrador');
  });

  it('debería retornar "Usuario de empresa" para OPERATOR', () => {
    expect(getRoleLabel('OPERATOR')).toBe('Usuario de empresa');
  });

  it('debería retornar "Usuario" para roles no reconocidos', () => {
    expect(getRoleLabel('UNKNOWN_ROLE')).toBe('Usuario');
    expect(getRoleLabel('DADOR_DE_CARGA')).toBe('Usuario');
    expect(getRoleLabel('TRANSPORTISTA')).toBe('Usuario');
  });
});

describe('MainLayout.utils - handleNavItemMouseEnter', () => {
  let handleNavItemMouseEnter: (to: string) => void;

  beforeAll(async () => {
    ({ handleNavItemMouseEnter } = await import('../MainLayout.utils'));
  });

  it('debería hacer preload para ruta /empresas sin errores', () => {
    expect(() => handleNavItemMouseEnter('/empresas')).not.toThrow();
  });

  it('no debería hacer nada para rutas diferentes a /empresas', () => {
    expect(() => handleNavItemMouseEnter('/documentos')).not.toThrow();
    expect(() => handleNavItemMouseEnter('/remitos')).not.toThrow();
    expect(() => handleNavItemMouseEnter('/perfil')).not.toThrow();
    expect(() => handleNavItemMouseEnter('/')).not.toThrow();
  });

  it('debería manejar ruta vacía sin errores', () => {
    expect(() => handleNavItemMouseEnter('')).not.toThrow();
  });

  it('debería manejar ruta undefined sin errores', () => {
    expect(() => handleNavItemMouseEnter(undefined as any)).not.toThrow();
  });
});
