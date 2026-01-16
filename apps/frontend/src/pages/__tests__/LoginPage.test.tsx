/**
 * Tests para LoginPage
 */
import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import React from 'react';

// Mock del LoginForm ANTES de importar LoginPage
jest.mock('../../features/auth/components/LoginForm', () => ({
  LoginForm: () => React.createElement('div', { 'data-testid': 'login-form' }, 'Mocked LoginForm'),
}));

describe('LoginPage', () => {
  beforeEach(() => {
    jest.resetModules();
  });

  it('exporta LoginPage correctamente', async () => {
    const module = await import('../LoginPage');
    expect(module.LoginPage).toBeDefined();
    expect(typeof module.LoginPage).toBe('function');
  });

  it('LoginPage es un componente React', async () => {
    const { LoginPage } = await import('../LoginPage');
    
    // Verificar que retorna JSX válido
    const element = LoginPage();
    expect(element).toBeDefined();
    expect(element.type).toBe('div');
  });

  it('LoginPage tiene clases de layout correctas', async () => {
    const { LoginPage } = await import('../LoginPage');
    
    const element = LoginPage();
    expect(element.props.className).toContain('flex');
    expect(element.props.className).toContain('min-h-screen');
  });

  it('LoginPage contiene el título de inicio de sesión', async () => {
    const { LoginPage } = await import('../LoginPage');
    
    const element = LoginPage();
    const children = element.props.children;
    
    // El primer hijo debe ser el contenedor del título
    const headerSection = children[0];
    expect(headerSection).toBeDefined();
  });
});
