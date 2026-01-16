/**
 * Tests para el hook useToast
 * Verifica el acceso al contexto de toast/notificaciones
 */
import { renderHook } from '@testing-library/react';
import { describe, it, expect, jest, beforeAll } from '@jest/globals';
import React from 'react';
import { ToastContext } from '../../contexts/toastContext';

let useToast: typeof import('../useToast').useToast;

beforeAll(async () => {
  // En `jest.setup.cjs` este hook está mockeado globalmente; para este test necesitamos el módulo real.
  jest.unmock('../useToast');
  ({ useToast } = await import('../useToast'));
});

describe('useToast', () => {
  it('debe retornar el contexto de toast por defecto', () => {
    const { result } = renderHook(() => useToast());
    
    expect(result.current).toBeDefined();
    expect(result.current.show).toBeDefined();
    expect(typeof result.current.show).toBe('function');
  });

  it('no debe lanzar error cuando show se llama sin provider', () => {
    const { result } = renderHook(() => useToast());
    
    // El show por defecto es una función vacía
    expect(() => result.current.show('Test message')).not.toThrow();
  });

  it('debe usar el show del provider cuando está disponible', () => {
    const mockShow = jest.fn();
    const mockContextValue = { show: mockShow };

    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(ToastContext.Provider, { value: mockContextValue }, children);

    const { result } = renderHook(() => useToast(), { wrapper });

    result.current.show('Mensaje de prueba');
    
    expect(mockShow).toHaveBeenCalledWith('Mensaje de prueba');
  });

  it('debe pasar variante de toast correctamente', () => {
    const mockShow = jest.fn();
    const mockContextValue = { show: mockShow };

    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(ToastContext.Provider, { value: mockContextValue }, children);

    const { result } = renderHook(() => useToast(), { wrapper });

    result.current.show('Operación exitosa', 'success');
    expect(mockShow).toHaveBeenCalledWith('Operación exitosa', 'success');

    result.current.show('Error en operación', 'error');
    expect(mockShow).toHaveBeenCalledWith('Error en operación', 'error');

    result.current.show('Información', 'info');
    expect(mockShow).toHaveBeenCalledWith('Información', 'info');

    result.current.show('Advertencia', 'warning');
    expect(mockShow).toHaveBeenCalledWith('Advertencia', 'warning');
  });

  it('debe pasar duración personalizada', () => {
    const mockShow = jest.fn();
    const mockContextValue = { show: mockShow };

    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(ToastContext.Provider, { value: mockContextValue }, children);

    const { result } = renderHook(() => useToast(), { wrapper });

    result.current.show('Mensaje largo', 'info', 5000);
    
    expect(mockShow).toHaveBeenCalledWith('Mensaje largo', 'info', 5000);
  });
});

