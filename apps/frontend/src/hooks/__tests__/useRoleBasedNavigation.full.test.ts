/**
 * Tests adicionales para useRoleBasedNavigation hook
 * Cubre lógica de navegación basada en roles
 */
import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { renderHook, act } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';

// En `jest.setup.cjs` este hook está mockeado globalmente; para este test necesitamos el módulo real.
jest.mock('../useRoleBasedNavigation', () => jest.requireActual('../useRoleBasedNavigation'));

/**
 * Permite simular `window.history.length` 
 */
function setHistoryLength(length: number) {
  const originalHistory = window.history;
  const historyProxy = new Proxy(originalHistory, {
    get(target, prop, receiver) {
      if (prop === 'length') return length;
      return Reflect.get(target, prop, receiver);
    },
  });

  Object.defineProperty(window, 'history', {
    value: historyProxy,
    configurable: true,
  });
}

function createWrapper(role: string | null) {
  const user = role ? ({ role } as { role: string }) : null;
  const store = configureStore({
    reducer: {
      auth: () => ({
        user,
        token: user ? 'mock-token' : null,
        isInitialized: true,
      }),
    },
  });

  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(
      Provider,
      { store },
      React.createElement(MemoryRouter, null, children)
    );
}

describe('useRoleBasedNavigation - cobertura adicional', () => {
  beforeEach(() => {
    setHistoryLength(1);
  });

  it('debe manejar rol ADMIN_EXTERNO', async () => {
    const { useRoleBasedNavigation } = await import('../useRoleBasedNavigation');
    const { result } = renderHook(() => useRoleBasedNavigation(), {
      wrapper: createWrapper('ADMIN_EXTERNO'),
    });

    expect(result.current.getHomeRoute()).toBeDefined();
    expect(typeof result.current.getHomeRoute()).toBe('string');
  });

  it('debe manejar rol OPERADOR', async () => {
    const { useRoleBasedNavigation } = await import('../useRoleBasedNavigation');
    const { result } = renderHook(() => useRoleBasedNavigation(), {
      wrapper: createWrapper('OPERADOR'),
    });

    expect(result.current.getHomeRoute()).toBeDefined();
  });

  it('debe manejar rol SUPERVISOR', async () => {
    const { useRoleBasedNavigation } = await import('../useRoleBasedNavigation');
    const { result } = renderHook(() => useRoleBasedNavigation(), {
      wrapper: createWrapper('SUPERVISOR'),
    });

    expect(result.current.getHomeRoute()).toBeDefined();
  });

  it('getDocumentosBaseRoute para diferentes roles', async () => {
    const { useRoleBasedNavigation } = await import('../useRoleBasedNavigation');
    
    const roles = ['TRANSPORTISTA', 'ADMIN', 'CHOFER', 'DADOR_DE_CARGA'];
    
    for (const role of roles) {
      const { result } = renderHook(() => useRoleBasedNavigation(), {
        wrapper: createWrapper(role),
      });
      expect(typeof result.current.getDocumentosBaseRoute()).toBe('string');
    }
  });

  it('goBack debe funcionar con historial largo', async () => {
    setHistoryLength(10);
    const { useRoleBasedNavigation } = await import('../useRoleBasedNavigation');
    const { result } = renderHook(() => useRoleBasedNavigation(), {
      wrapper: createWrapper('ADMIN'),
    });

    expect(() => {
      act(() => result.current.goBack());
    }).not.toThrow();
  });

  it('goBack con historial = 2', async () => {
    setHistoryLength(2);
    const { useRoleBasedNavigation } = await import('../useRoleBasedNavigation');
    const { result } = renderHook(() => useRoleBasedNavigation(), {
      wrapper: createWrapper('TRANSPORTISTA'),
    });

    expect(() => {
      act(() => result.current.goBack());
    }).not.toThrow();
  });

  it('goBack con historial = 0', async () => {
    setHistoryLength(0);
    const { useRoleBasedNavigation } = await import('../useRoleBasedNavigation');
    const { result } = renderHook(() => useRoleBasedNavigation(), {
      wrapper: createWrapper('CHOFER'),
    });

    expect(() => {
      act(() => result.current.goBack());
    }).not.toThrow();
  });

  it('goToHome para CLIENTE_TRANSPORTE', async () => {
    const { useRoleBasedNavigation } = await import('../useRoleBasedNavigation');
    const { result } = renderHook(() => useRoleBasedNavigation(), {
      wrapper: createWrapper('CLIENTE_TRANSPORTE'),
    });

    expect(() => {
      act(() => result.current.goToHome());
    }).not.toThrow();
  });

  it('goToHome para EMPRESA_TRANSPORTISTA', async () => {
    const { useRoleBasedNavigation } = await import('../useRoleBasedNavigation');
    const { result } = renderHook(() => useRoleBasedNavigation(), {
      wrapper: createWrapper('EMPRESA_TRANSPORTISTA'),
    });

    expect(() => {
      act(() => result.current.goToHome());
    }).not.toThrow();
  });

  it('goToHome para ADMIN_INTERNO', async () => {
    const { useRoleBasedNavigation } = await import('../useRoleBasedNavigation');
    const { result } = renderHook(() => useRoleBasedNavigation(), {
      wrapper: createWrapper('ADMIN_INTERNO'),
    });

    expect(() => {
      act(() => result.current.goToHome());
    }).not.toThrow();
  });
});

describe('useRoleBasedNavigation - edge cases', () => {
  beforeEach(() => {
    setHistoryLength(1);
  });

  it('getHomeRoute con string vacío como rol', async () => {
    const { useRoleBasedNavigation } = await import('../useRoleBasedNavigation');
    const { result } = renderHook(() => useRoleBasedNavigation(), {
      wrapper: createWrapper(''),
    });

    expect(typeof result.current.getHomeRoute()).toBe('string');
  });

  it('todas las funciones retornadas son válidas', async () => {
    const { useRoleBasedNavigation } = await import('../useRoleBasedNavigation');
    const { result } = renderHook(() => useRoleBasedNavigation(), {
      wrapper: createWrapper('SUPERADMIN'),
    });

    expect(typeof result.current.getHomeRoute).toBe('function');
    expect(typeof result.current.goToHome).toBe('function');
    expect(typeof result.current.goBack).toBe('function');
    expect(typeof result.current.getDocumentosBaseRoute).toBe('function');
  });
});
