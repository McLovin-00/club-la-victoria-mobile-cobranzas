/**
 * Tests para el hook useConfirmDialog
 * Verifica el acceso al contexto de confirmación
 */
import { renderHook } from '@testing-library/react';
import { describe, it, expect, jest } from '@jest/globals';
import React from 'react';
import { useConfirmDialog } from '../useConfirmDialog';
import { ConfirmContext, ConfirmContextType } from '../../contexts/confirmContext';

describe('useConfirmDialog', () => {
  it('debe retornar el contexto de confirmación por defecto', () => {
    const { result } = renderHook(() => useConfirmDialog());
    
    expect(result.current).toBeDefined();
    expect(result.current.confirm).toBeDefined();
    expect(typeof result.current.confirm).toBe('function');
  });

  it('debe resolver un booleano cuando no hay provider', async () => {
    const { result } = renderHook(() => useConfirmDialog());
    
    const confirmResult = await result.current.confirm({ message: 'Test message' });
    expect(typeof confirmResult).toBe('boolean');
  });

  it('debe usar el confirm del provider cuando está disponible', async () => {
    const mockConfirm = jest.fn().mockResolvedValue(true);
    const mockContextValue: ConfirmContextType = { confirm: mockConfirm };

    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(ConfirmContext.Provider, { value: mockContextValue }, children);

    const { result } = renderHook(() => useConfirmDialog(), { wrapper });

    const confirmResult = await result.current.confirm({ 
      message: 'Test message',
      title: 'Test Title' 
    });

    expect(mockConfirm).toHaveBeenCalledWith({
      message: 'Test message',
      title: 'Test Title',
    });
    expect(confirmResult).toBe(true);
  });

  it('debe manejar opciones completas de confirmación', async () => {
    const mockConfirm = jest.fn().mockResolvedValue(false);
    const mockContextValue: ConfirmContextType = { confirm: mockConfirm };

    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(ConfirmContext.Provider, { value: mockContextValue }, children);

    const { result } = renderHook(() => useConfirmDialog(), { wrapper });

    await result.current.confirm({
      message: 'Confirmar acción',
      title: 'Título',
      confirmText: 'Aceptar',
      cancelText: 'Cancelar',
      variant: 'danger',
    });

    expect(mockConfirm).toHaveBeenCalledWith({
      message: 'Confirmar acción',
      title: 'Título',
      confirmText: 'Aceptar',
      cancelText: 'Cancelar',
      variant: 'danger',
    });
  });
});

