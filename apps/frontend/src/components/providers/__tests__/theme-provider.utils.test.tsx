/**
 * Tests para theme-provider.utils
 * Verifica el contexto, el hook useTheme y los tipos
 */
import { renderHook } from '@testing-library/react';
import React from 'react';
import {
  ThemeProviderContext,
  useTheme,
  initialThemeState,
  Theme,
  ThemeProviderState
} from '../theme-provider.utils';

describe('theme-provider.utils', () => {
  describe('initialThemeState', () => {
    it('debe tener tema system por defecto', () => {
      expect(initialThemeState.theme).toBe('system');
    });

    it('debe tener función setTheme definida', () => {
      expect(typeof initialThemeState.setTheme).toBe('function');
    });

    it('setTheme debe retornar null por defecto', () => {
      expect(initialThemeState.setTheme('dark')).toBeNull();
    });
  });

  describe('ThemeProviderContext', () => {
    it('debe ser un contexto React válido', () => {
      expect(ThemeProviderContext).toBeDefined();
      expect(ThemeProviderContext.Provider).toBeDefined();
      expect(ThemeProviderContext.Consumer).toBeDefined();
    });
  });

  describe('useTheme', () => {
    it('debe devolver el contexto cuando está dentro del Provider', () => {
      const mockSetTheme = jest.fn();
      const wrapper = ({ children }: { children: React.ReactNode }) =>
        React.createElement(
          ThemeProviderContext.Provider,
          { value: { theme: 'dark', setTheme: mockSetTheme } },
          children
        );

      const { result } = renderHook(() => useTheme(), { wrapper });

      expect(result.current.theme).toBe('dark');
      expect(result.current.setTheme).toBe(mockSetTheme);
    });

    it('debe retornar estado inicial cuando no hay Provider', () => {
      // Como el contexto tiene un valor por defecto (initialThemeState),
      // no lanza error sino que retorna ese estado inicial
      const { result } = renderHook(() => useTheme());

      expect(result.current.theme).toBe('system');
      expect(result.current.setTheme).toBeDefined();
    });

    it('debe permitir cambiar el tema', () => {
      const mockSetTheme = jest.fn();
      const wrapper = ({ children }: { children: React.ReactNode }) =>
        React.createElement(
          ThemeProviderContext.Provider,
          { value: { theme: 'light', setTheme: mockSetTheme } },
          children
        );

      const { result } = renderHook(() => useTheme(), { wrapper });

      result.current.setTheme('dark');
      expect(mockSetTheme).toHaveBeenCalledWith('dark');
    });

    it('debe soportar el tema system', () => {
      const mockSetTheme = jest.fn();
      const wrapper = ({ children }: { children: React.ReactNode }) =>
        React.createElement(
          ThemeProviderContext.Provider,
          { value: { theme: 'system', setTheme: mockSetTheme } },
          children
        );

      const { result } = renderHook(() => useTheme(), { wrapper });

      expect(result.current.theme).toBe('system');
    });
  });

  describe('tipos', () => {
    it('Theme debe aceptar valores válidos', () => {
      const light: Theme = 'light';
      const dark: Theme = 'dark';
      const system: Theme = 'system';

      expect(light).toBe('light');
      expect(dark).toBe('dark');
      expect(system).toBe('system');
    });

    it('ThemeProviderState debe tener la estructura correcta', () => {
      const state: ThemeProviderState = {
        theme: 'light',
        setTheme: jest.fn(),
      };

      expect(state).toHaveProperty('theme');
      expect(state).toHaveProperty('setTheme');
    });
  });
});
