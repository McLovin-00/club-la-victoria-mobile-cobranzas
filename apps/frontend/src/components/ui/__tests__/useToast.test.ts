/**
 * Tests para el hook useToast
 * Verifica que el hook devuelve el contexto correctamente
 */
import { renderHook } from '@testing-library/react';
import React from 'react';
import { useToast } from '../useToast';
import { ToastContext } from '../../../contexts/toastContext';

describe('useToast', () => {
  it('debe devolver el contexto de Toast', () => {
    const mockShow = jest.fn();
    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(ToastContext.Provider, { value: { show: mockShow } }, children);
    
    const { result } = renderHook(() => useToast(), { wrapper });
    
    expect(result.current).toEqual({ show: mockShow });
  });

  it('debe permitir llamar a show desde el contexto', () => {
    const mockShow = jest.fn();
    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(ToastContext.Provider, { value: { show: mockShow } }, children);
    
    const { result } = renderHook(() => useToast(), { wrapper });
    
    result.current.show('Mensaje de prueba', 'success');
    expect(mockShow).toHaveBeenCalledWith('Mensaje de prueba', 'success');
  });

  it('debe manejar contexto vacío sin errores', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(ToastContext.Provider, { value: { show: () => {} } }, children);
    
    const { result } = renderHook(() => useToast(), { wrapper });
    
    expect(result.current.show).toBeDefined();
    expect(typeof result.current.show).toBe('function');
  });
});

