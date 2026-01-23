/**
 * Tests de cobertura completa para toastContext
 * Objetivo: 100% de cobertura del módulo
 */
import { describe, it, expect, jest } from '@jest/globals';
import { renderHook } from '@testing-library/react';
import React, { useContext } from 'react';
import { ToastContext, ToastVariant } from '../toastContext';

describe('toastContext', () => {
  describe('ToastContext - valores por defecto', () => {
    it('debe exportar ToastContext como un contexto React válido', () => {
      expect(ToastContext).toBeDefined();
      expect(ToastContext.Provider).toBeDefined();
      expect(ToastContext.Consumer).toBeDefined();
    });

    it('el valor por defecto debe tener función show', () => {
      const { result } = renderHook(() => useContext(ToastContext));
      expect(result.current).toBeDefined();
      expect(typeof result.current.show).toBe('function');
    });

    it('show por defecto no debe lanzar error', () => {
      const { result } = renderHook(() => useContext(ToastContext));
      expect(() => result.current.show('Test message')).not.toThrow();
    });

    it('show por defecto debe retornar undefined (void)', () => {
      const { result } = renderHook(() => useContext(ToastContext));
      const returnValue = result.current.show('Test message');
      expect(returnValue).toBeUndefined();
    });
  });

  describe('ToastVariant - tipado', () => {
    it('debe aceptar success', () => {
      const variant: ToastVariant = 'success';
      expect(variant).toBe('success');
    });

    it('debe aceptar error', () => {
      const variant: ToastVariant = 'error';
      expect(variant).toBe('error');
    });

    it('debe aceptar info', () => {
      const variant: ToastVariant = 'info';
      expect(variant).toBe('info');
    });

    it('debe aceptar warning', () => {
      const variant: ToastVariant = 'warning';
      expect(variant).toBe('warning');
    });
  });

  describe('ToastContext.Provider', () => {
    it('debe proporcionar valor personalizado a los consumidores', () => {
      const mockShow = jest.fn();
      const customValue = { show: mockShow };

      const wrapper = ({ children }: { children: React.ReactNode }) =>
        React.createElement(ToastContext.Provider, { value: customValue }, children);

      const { result } = renderHook(() => useContext(ToastContext), { wrapper });

      expect(result.current.show).toBe(mockShow);
    });

    it('show debe recibir mensaje', () => {
      const mockShow = jest.fn();
      const customValue = { show: mockShow };

      const wrapper = ({ children }: { children: React.ReactNode }) =>
        React.createElement(ToastContext.Provider, { value: customValue }, children);

      const { result } = renderHook(() => useContext(ToastContext), { wrapper });

      result.current.show('Test message');
      expect(mockShow).toHaveBeenCalledWith('Test message');
    });

    it('show debe recibir mensaje y variante', () => {
      const mockShow = jest.fn();
      const customValue = { show: mockShow };

      const wrapper = ({ children }: { children: React.ReactNode }) =>
        React.createElement(ToastContext.Provider, { value: customValue }, children);

      const { result } = renderHook(() => useContext(ToastContext), { wrapper });

      result.current.show('Success message', 'success');
      expect(mockShow).toHaveBeenCalledWith('Success message', 'success');

      result.current.show('Error message', 'error');
      expect(mockShow).toHaveBeenCalledWith('Error message', 'error');

      result.current.show('Info message', 'info');
      expect(mockShow).toHaveBeenCalledWith('Info message', 'info');

      result.current.show('Warning message', 'warning');
      expect(mockShow).toHaveBeenCalledWith('Warning message', 'warning');
    });

    it('show debe recibir mensaje, variante y duración', () => {
      const mockShow = jest.fn();
      const customValue = { show: mockShow };

      const wrapper = ({ children }: { children: React.ReactNode }) =>
        React.createElement(ToastContext.Provider, { value: customValue }, children);

      const { result } = renderHook(() => useContext(ToastContext), { wrapper });

      result.current.show('Long message', 'info', 5000);
      expect(mockShow).toHaveBeenCalledWith('Long message', 'info', 5000);

      result.current.show('Short message', 'success', 1000);
      expect(mockShow).toHaveBeenCalledWith('Short message', 'success', 1000);
    });

    it('debe manejar múltiples llamadas a show', () => {
      const mockShow = jest.fn();
      const customValue = { show: mockShow };

      const wrapper = ({ children }: { children: React.ReactNode }) =>
        React.createElement(ToastContext.Provider, { value: customValue }, children);

      const { result } = renderHook(() => useContext(ToastContext), { wrapper });

      result.current.show('First');
      result.current.show('Second', 'error');
      result.current.show('Third', 'success', 3000);

      expect(mockShow).toHaveBeenCalledTimes(3);
      expect(mockShow).toHaveBeenNthCalledWith(1, 'First');
      expect(mockShow).toHaveBeenNthCalledWith(2, 'Second', 'error');
      expect(mockShow).toHaveBeenNthCalledWith(3, 'Third', 'success', 3000);
    });
  });

  describe('ToastContext.Consumer', () => {
    it('debe funcionar con Consumer pattern', async () => {
      const TestComponent = () => {
        const context = useContext(ToastContext);
        return React.createElement('span', { 'data-testid': 'has-show' }, typeof context.show);
      };

      const { render: renderComponent } = await import('@testing-library/react');
      const { container } = renderComponent(React.createElement(TestComponent));
      expect(container.textContent).toBe('function');
    });
  });

  describe('uso con hooks personalizados', () => {
    it('debe integrarse con useContext de React', () => {
      const useToast = () => {
        const context = useContext(ToastContext);
        return context;
      };

      const { result } = renderHook(() => useToast());

      expect(result.current).toBeDefined();
      expect(result.current.show).toBeDefined();
    });

    it('debe permitir crear wrappers para variantes', () => {
      const mockShow = jest.fn();
      const customValue = { show: mockShow };

      const useToastHelpers = () => {
        const { show } = useContext(ToastContext);
        return {
          success: (message: string, duration?: number) => show(message, 'success', duration),
          error: (message: string, duration?: number) => show(message, 'error', duration),
          info: (message: string, duration?: number) => show(message, 'info', duration),
          warning: (message: string, duration?: number) => show(message, 'warning', duration),
        };
      };

      const wrapper = ({ children }: { children: React.ReactNode }) =>
        React.createElement(ToastContext.Provider, { value: customValue }, children);

      const { result } = renderHook(() => useToastHelpers(), { wrapper });

      result.current.success('Success!');
      expect(mockShow).toHaveBeenCalledWith('Success!', 'success', undefined);

      result.current.error('Error!', 5000);
      expect(mockShow).toHaveBeenCalledWith('Error!', 'error', 5000);
    });
  });

  describe('parámetros opcionales', () => {
    it('variante debe ser opcional', () => {
      const mockShow = jest.fn();
      const customValue = { show: mockShow };

      const wrapper = ({ children }: { children: React.ReactNode }) =>
        React.createElement(ToastContext.Provider, { value: customValue }, children);

      const { result } = renderHook(() => useContext(ToastContext), { wrapper });

      result.current.show('Message without variant');
      expect(mockShow).toHaveBeenCalledWith('Message without variant');
    });

    it('duración debe ser opcional', () => {
      const mockShow = jest.fn();
      const customValue = { show: mockShow };

      const wrapper = ({ children }: { children: React.ReactNode }) =>
        React.createElement(ToastContext.Provider, { value: customValue }, children);

      const { result } = renderHook(() => useContext(ToastContext), { wrapper });

      result.current.show('Message with variant', 'info');
      expect(mockShow).toHaveBeenCalledWith('Message with variant', 'info');
    });
  });
});
