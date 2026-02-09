/**
 * Tests extendidos para ThemeProvider
 * Incrementa coverage cubriendo cambio de tema y persistencia
 */
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { render, screen, act } from '@testing-library/react';
import React, { useContext } from 'react';
import { ThemeProvider } from '../theme-provider';
import { ThemeProviderContext } from '../theme-provider.utils';

// Mock de localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  const mock = {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      store = {};
      // Resetear el mock para que retorne null después de clear
      mock.getItem.mockImplementation((key: string) => store[key] || null);
    }),
  };

  return mock;
})();

Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Mock de matchMedia - se configurará en beforeEach
let matchMediaMock: jest.Mock;

describe('ThemeProvider (extended)', () => {
  beforeEach(() => {
    // Limpiar localStorage completamente
    localStorageMock.clear();

    // Asegurarse que getItem retorna null para ui-theme
    localStorageMock.getItem.mockReturnValue(null);

    jest.clearAllMocks();

    // Resetear el DOM
    document.documentElement.classList.remove('light', 'dark');

    // Mock de matchMedia con light mode por defecto
    matchMediaMock = jest.fn().mockImplementation((query: string) => ({
      matches: false, // Light mode por defecto
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    }));

    // @ts-ignore
    window.matchMedia = matchMediaMock;
  });

  describe('renderizado básico', () => {
    it('debe renderizar children correctamente', () => {
      render(
        <ThemeProvider>
          <div data-testid="child">Child Content</div>
        </ThemeProvider>
      );

      expect(screen.getByTestId('child')).toBeInTheDocument();
      expect(screen.getByText('Child Content')).toBeInTheDocument();
    });
  });

  describe('tema por defecto', () => {
    it('debe usar system como tema por defecto', () => {
      render(
        <ThemeProvider>
          <div>Test</div>
        </ThemeProvider>
      );

      // Con system theme y matchMedia mock que devuelve dark
      expect(document.documentElement.classList.contains('dark') ||
             document.documentElement.classList.contains('light')).toBe(true);
    });

    it('debe respetar defaultTheme light', () => {
      render(
        <ThemeProvider defaultTheme="light">
          <div>Test</div>
        </ThemeProvider>
      );

      expect(document.documentElement.classList.contains('light')).toBe(true);
    });

    it('debe respetar defaultTheme dark', () => {
      render(
        <ThemeProvider defaultTheme="dark">
          <div>Test</div>
        </ThemeProvider>
      );

      expect(document.documentElement.classList.contains('dark')).toBe(true);
    });
  });

  describe('persistencia en localStorage', () => {
    it('debe leer tema de localStorage si existe', () => {
      localStorageMock.getItem.mockReturnValue('dark');

      render(
        <ThemeProvider>
          <div>Test</div>
        </ThemeProvider>
      );

      expect(localStorageMock.getItem).toHaveBeenCalledWith('ui-theme');
      expect(document.documentElement.classList.contains('dark')).toBe(true);
    });

    it('debe usar storageKey personalizado', () => {
      render(
        <ThemeProvider storageKey="custom-theme-key">
          <div>Test</div>
        </ThemeProvider>
      );

      expect(localStorageMock.getItem).toHaveBeenCalledWith('custom-theme-key');
    });
  });

  describe('cambio de tema', () => {
    it('debe cambiar tema y guardarlo en localStorage', () => {
      const TestConsumer = () => {
        const { theme, setTheme } = useContext(ThemeProviderContext);
        return (
          <div>
            <span data-testid="theme">{theme}</span>
            <button onClick={() => setTheme('dark')}>Set Dark</button>
            <button onClick={() => setTheme('light')}>Set Light</button>
          </div>
        );
      };

      render(
        <ThemeProvider defaultTheme="light">
          <TestConsumer />
        </ThemeProvider>
      );

      expect(screen.getByTestId('theme').textContent).toBe('light');

      act(() => {
        screen.getByText('Set Dark').click();
      });

      expect(screen.getByTestId('theme').textContent).toBe('dark');
      expect(localStorageMock.setItem).toHaveBeenCalledWith('ui-theme', 'dark');
      expect(document.documentElement.classList.contains('dark')).toBe(true);
    });

    it('debe alternar entre light y dark', () => {
      const TestConsumer = () => {
        const { theme, setTheme } = useContext(ThemeProviderContext);
        return (
          <div>
            <span data-testid="theme">{theme}</span>
            <button onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}>Toggle</button>
          </div>
        );
      };

      render(
        <ThemeProvider defaultTheme="light">
          <TestConsumer />
        </ThemeProvider>
      );

      // Initial state
      expect(screen.getByTestId('theme').textContent).toBe('light');

      // Toggle to dark
      act(() => {
        screen.getByText('Toggle').click();
      });
      expect(screen.getByTestId('theme').textContent).toBe('dark');

      // Toggle back to light
      act(() => {
        screen.getByText('Toggle').click();
      });
      expect(screen.getByTestId('theme').textContent).toBe('light');
    });
  });

  describe('tema del sistema', () => {
    it('debe aplicar tema oscuro cuando sistema es dark', () => {
      matchMediaMock.mockImplementation((query: string) => ({
        matches: query.includes('dark'),
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      }));

      render(
        <ThemeProvider defaultTheme="system">
          <div>Test</div>
        </ThemeProvider>
      );

      expect(document.documentElement.classList.contains('dark')).toBe(true);
    });

    it('debe aplicar tema claro cuando sistema es light', () => {
      matchMediaMock.mockImplementation((query: string) => ({
        matches: !query.includes('dark'),
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      }));

      render(
        <ThemeProvider defaultTheme="system">
          <div>Test</div>
        </ThemeProvider>
      );

      expect(document.documentElement.classList.contains('light')).toBe(true);
    });
  });

  describe('limpieza de clases', () => {
    it('debe remover clases anteriores al cambiar tema', () => {
      document.documentElement.classList.add('light');

      const TestConsumer = () => {
        const { setTheme } = useContext(ThemeProviderContext);
        return <button onClick={() => setTheme('dark')}>Set Dark</button>;
      };

      render(
        <ThemeProvider defaultTheme="light">
          <TestConsumer />
        </ThemeProvider>
      );

      act(() => {
        screen.getByText('Set Dark').click();
      });

      expect(document.documentElement.classList.contains('light')).toBe(false);
      expect(document.documentElement.classList.contains('dark')).toBe(true);
    });
  });
});
