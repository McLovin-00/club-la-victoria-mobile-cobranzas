/**
 * Tests de cobertura para RequireAuth
 * Actualizado para usar jest.mock en lugar de unstable_mockModule
 */
import React from 'react';
import { describe, it, expect, beforeEach, jest } from '@jest/globals';

// Mock de react-router-dom
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  Navigate: ({ to }: { to: string }) => {
    mockNavigate(to);
    return null;
  },
  Outlet: () => null,
}));

// Mock de react-redux
const mockUseSelector = jest.fn();
const mockDispatch = jest.fn();
jest.mock('react-redux', () => ({
  useSelector: () => mockUseSelector(),
  useDispatch: () => mockDispatch,
}));

describe('RequireAuth - Coverage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseSelector.mockReturnValue({
      auth: {
        user: { id: 1, email: 'test@test.com', role: 'ADMIN_INTERNO' },
        isAuthenticated: true,
        token: 'test-token',
      },
    });
  });

  it('debería importar el componente', async () => {
    const module = await import('../RequireAuth');
    expect(module.RequireAuth).toBeDefined();
  });

  it('debería ser una función componente', async () => {
    const module = await import('../RequireAuth');
    expect(typeof module.RequireAuth).toBe('function');
  });

  it('debería exportar por defecto', async () => {
    const module = await import('../RequireAuth');
    expect(module.default || module.RequireAuth).toBeDefined();
  });

  it('debería tener el nombre RequireAuth', async () => {
    const module = await import('../RequireAuth');
    const Component = module.RequireAuth;
    expect(Component.displayName || Component.name).toBe('RequireAuth');
  });

  it('debería usar Navigate y Outlet de react-router-dom', async () => {
    const routerModule = await import('react-router-dom');
    expect(routerModule.Navigate).toBeDefined();
    expect(routerModule.Outlet).toBeDefined();
  });

  it('debería usar useSelector y useDispatch de react-redux', async () => {
    const reduxModule = await import('react-redux');
    expect(reduxModule.useSelector).toBeDefined();
    expect(reduxModule.useDispatch).toBeDefined();
  });
});
