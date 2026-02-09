/**
 * Tests de cobertura completa para confirmContext
 * Objetivo: 100% de cobertura del módulo
 */
import { describe, it, expect, jest } from '@jest/globals';
import { renderHook, act } from '@testing-library/react';
import React, { useContext } from 'react';
import { ConfirmContext, ConfirmContextType, ConfirmOptions } from '../confirmContext';

describe('confirmContext', () => {
  describe('ConfirmContext - valores por defecto', () => {
    it('debe exportar ConfirmContext como un contexto React válido', () => {
      expect(ConfirmContext).toBeDefined();
      expect(ConfirmContext.Provider).toBeDefined();
      expect(ConfirmContext.Consumer).toBeDefined();
    });

    it('el valor por defecto debe tener función confirm', () => {
      const { result } = renderHook(() => useContext(ConfirmContext));
      expect(result.current).toBeDefined();
      expect(typeof result.current.confirm).toBe('function');
    });

    it('confirm por defecto debe retornar Promise<false>', async () => {
      const { result } = renderHook(() => useContext(ConfirmContext));
      const confirmResult = await result.current.confirm({ message: 'Test' });
      expect(confirmResult).toBe(false);
    });
  });

  describe('ConfirmOptions - tipado', () => {
    it('debe aceptar solo message como requerido', () => {
      const options: ConfirmOptions = { message: 'Test message' };
      expect(options.message).toBe('Test message');
      expect(options.title).toBeUndefined();
      expect(options.confirmText).toBeUndefined();
      expect(options.cancelText).toBeUndefined();
      expect(options.variant).toBeUndefined();
    });

    it('debe aceptar todas las opciones', () => {
      const options: ConfirmOptions = {
        message: 'Test message',
        title: 'Test title',
        confirmText: 'Confirm',
        cancelText: 'Cancel',
        variant: 'danger',
      };

      expect(options.message).toBe('Test message');
      expect(options.title).toBe('Test title');
      expect(options.confirmText).toBe('Confirm');
      expect(options.cancelText).toBe('Cancel');
      expect(options.variant).toBe('danger');
    });

    it('variant debe aceptar danger', () => {
      const options: ConfirmOptions = { message: 'Test', variant: 'danger' };
      expect(options.variant).toBe('danger');
    });

    it('variant debe aceptar primary', () => {
      const options: ConfirmOptions = { message: 'Test', variant: 'primary' };
      expect(options.variant).toBe('primary');
    });
  });

  describe('ConfirmContextType - tipado', () => {
    it('debe tener la estructura correcta', () => {
      const mockConfirm = jest.fn<(options: ConfirmOptions) => Promise<boolean>>().mockResolvedValue(true);
      const contextValue: ConfirmContextType = { confirm: mockConfirm };

      expect(contextValue).toHaveProperty('confirm');
      expect(typeof contextValue.confirm).toBe('function');
    });
  });

  describe('ConfirmContext.Provider', () => {
    it('debe proporcionar valor personalizado a los consumidores', async () => {
      const mockConfirm = jest.fn<(options: ConfirmOptions) => Promise<boolean>>().mockResolvedValue(true);
      const customValue: ConfirmContextType = { confirm: mockConfirm };

      const wrapper = ({ children }: { children: React.ReactNode }) =>
        React.createElement(ConfirmContext.Provider, { value: customValue }, children);

      const { result } = renderHook(() => useContext(ConfirmContext), { wrapper });

      expect(result.current.confirm).toBe(mockConfirm);

      const confirmResult = await result.current.confirm({ message: 'Test' });
      expect(confirmResult).toBe(true);
      expect(mockConfirm).toHaveBeenCalledWith({ message: 'Test' });
    });

    it('confirm debe recibir opciones completas', async () => {
      const mockConfirm = jest.fn<(options: ConfirmOptions) => Promise<boolean>>().mockResolvedValue(false);
      const customValue: ConfirmContextType = { confirm: mockConfirm };

      const wrapper = ({ children }: { children: React.ReactNode }) =>
        React.createElement(ConfirmContext.Provider, { value: customValue }, children);

      const { result } = renderHook(() => useContext(ConfirmContext), { wrapper });

      const options: ConfirmOptions = {
        message: 'Are you sure?',
        title: 'Confirm Action',
        confirmText: 'Yes',
        cancelText: 'No',
        variant: 'danger',
      };

      await result.current.confirm(options);

      expect(mockConfirm).toHaveBeenCalledWith(options);
    });

    it('debe manejar múltiples llamadas a confirm', async () => {
      const mockConfirm = jest.fn<(options: ConfirmOptions) => Promise<boolean>>();
      mockConfirm.mockResolvedValueOnce(true).mockResolvedValueOnce(false).mockResolvedValueOnce(true);

      const customValue: ConfirmContextType = { confirm: mockConfirm };

      const wrapper = ({ children }: { children: React.ReactNode }) =>
        React.createElement(ConfirmContext.Provider, { value: customValue }, children);

      const { result } = renderHook(() => useContext(ConfirmContext), { wrapper });

      const result1 = await result.current.confirm({ message: 'First' });
      const result2 = await result.current.confirm({ message: 'Second' });
      const result3 = await result.current.confirm({ message: 'Third' });

      expect(result1).toBe(true);
      expect(result2).toBe(false);
      expect(result3).toBe(true);
      expect(mockConfirm).toHaveBeenCalledTimes(3);
    });
  });

  describe('ConfirmContext.Consumer', () => {
    it('debe funcionar con Consumer pattern', async () => {
      const TestComponent = () => {
        const context = useContext(ConfirmContext);
        return React.createElement('span', { 'data-testid': 'has-confirm' }, typeof context.confirm);
      };

      const { render: renderComponent } = await import('@testing-library/react');
      const { container } = renderComponent(React.createElement(TestComponent));
      expect(container.textContent).toBe('function');
    });
  });

  describe('uso con hooks personalizados', () => {
    it('debe integrarse con useContext de React', () => {
      const useConfirm = () => {
        const context = useContext(ConfirmContext);
        return context;
      };

      const { result } = renderHook(() => useConfirm());

      expect(result.current).toBeDefined();
      expect(result.current.confirm).toBeDefined();
    });
  });
});
