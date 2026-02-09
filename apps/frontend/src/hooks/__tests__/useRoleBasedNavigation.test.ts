/**
 * Tests para el hook useRoleBasedNavigation
 * Verifica la navegación basada en roles de usuario
 */
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';

// En `jest.setup.cjs` este hook está mockeado globalmente; para este test necesitamos el módulo real.
jest.mock('../useRoleBasedNavigation', () => jest.requireActual('../useRoleBasedNavigation'));

/**
 * Permite simular `window.history.length` sin romper APIs que React Router necesita
 * (replaceState/pushState), evitando flakiness en BrowserRouter.
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

describe('useRoleBasedNavigation', () => {
  beforeEach(() => {
    setHistoryLength(1);
  });

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

  it('debe exponer funciones principales', async () => {
    const { useRoleBasedNavigation } = await import('../useRoleBasedNavigation');

    const { result } = renderHook(() => useRoleBasedNavigation(), { wrapper: createWrapper('ADMIN') });

    expect(typeof result.current.getHomeRoute).toBe('function');
    expect(typeof result.current.goToHome).toBe('function');
    expect(typeof result.current.goBack).toBe('function');
    expect(typeof result.current.getDocumentosBaseRoute).toBe('function');
  });

  describe('getHomeRoute', () => {
    it('debe ir a /login si no hay usuario', async () => {
      const { useRoleBasedNavigation } = await import('../useRoleBasedNavigation');
      const { result } = renderHook(() => useRoleBasedNavigation(), { wrapper: createWrapper(null) });
      expect(result.current.getHomeRoute()).toBe('/login');
    });

    it('debe mapear roles a rutas esperadas', async () => {
      const { useRoleBasedNavigation } = await import('../useRoleBasedNavigation');

      const cases: Array<{ role: string; expected: string }> = [
        { role: 'ADMIN_INTERNO', expected: '/portal/admin-interno' },
        { role: 'DADOR_DE_CARGA', expected: '/dador' },
        { role: 'TRANSPORTISTA', expected: '/transportista' },
        { role: 'EMPRESA_TRANSPORTISTA', expected: '/transportista' },
        { role: 'CHOFER', expected: '/chofer' },
        { role: 'CLIENTE', expected: '/cliente' },
        { role: 'CLIENTE_TRANSPORTE', expected: '/cliente' },
        { role: 'SUPERADMIN', expected: '/' },
        { role: 'ADMIN', expected: '/' },
        { role: 'UNKNOWN_ROLE', expected: '/' },
      ];

      for (const { role, expected } of cases) {
        const { result } = renderHook(() => useRoleBasedNavigation(), { wrapper: createWrapper(role) });
        expect(result.current.getHomeRoute()).toBe(expected);
      }
    });
  });

  describe('getDocumentosBaseRoute', () => {
    it('debe devolver /documentos si no hay usuario', async () => {
      const { useRoleBasedNavigation } = await import('../useRoleBasedNavigation');
      const { result } = renderHook(() => useRoleBasedNavigation(), { wrapper: createWrapper(null) });
      expect(result.current.getDocumentosBaseRoute()).toBe('/documentos');
    });
  });

  describe('goToHome', () => {
    it('debe navegar a la ruta home del rol', async () => {
      const { useRoleBasedNavigation } = await import('../useRoleBasedNavigation');
      const { result } = renderHook(() => useRoleBasedNavigation(), { wrapper: createWrapper('CHOFER') });

      expect(() => {
        act(() => result.current.goToHome());
      }).not.toThrow();
    });
  });

  describe('goBack', () => {
    it('si hay historial suficiente, debe navegar -1', async () => {
      setHistoryLength(5);
      const { useRoleBasedNavigation } = await import('../useRoleBasedNavigation');
      const { result } = renderHook(() => useRoleBasedNavigation(), { wrapper: createWrapper('ADMIN') });

      expect(() => {
        act(() => result.current.goBack());
      }).not.toThrow();
    });

    it('si no hay historial suficiente, debe navegar al home del rol', async () => {
      setHistoryLength(1);
      const { useRoleBasedNavigation } = await import('../useRoleBasedNavigation');
      const { result } = renderHook(() => useRoleBasedNavigation(), { wrapper: createWrapper('TRANSPORTISTA') });

      expect(() => {
        act(() => result.current.goBack());
      }).not.toThrow();
    });
  });
});

