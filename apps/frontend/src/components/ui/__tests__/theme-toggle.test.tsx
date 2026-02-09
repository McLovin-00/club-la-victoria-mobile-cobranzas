/**
 * Tests para el componente ThemeToggle
 * Verifica renderizado y comportamiento del toggle de tema
 */
import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeToggle } from '../theme-toggle';
import { ThemeProviderContext } from '../../providers/theme-provider.utils';

// Wrapper para proveer contexto de tema
const renderWithThemeContext = (theme: 'light' | 'dark' = 'light') => {
  const setTheme = jest.fn();
  
  render(
    <ThemeProviderContext.Provider value={{ theme, setTheme }}>
      <ThemeToggle />
    </ThemeProviderContext.Provider>
  );
  
  return { setTheme };
};

describe('ThemeToggle', () => {
  describe('renderizado básico', () => {
    it('debe renderizar correctamente', () => {
      renderWithThemeContext();
      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('debe tener aria-label para accesibilidad', () => {
      renderWithThemeContext();
      expect(screen.getByRole('button')).toHaveAttribute('aria-label', 'Cambiar tema');
    });
  });

  describe('interacción', () => {
    it('debe cambiar de light a dark al hacer clic', () => {
      const { setTheme } = renderWithThemeContext('light');
      
      fireEvent.click(screen.getByRole('button'));
      expect(setTheme).toHaveBeenCalledWith('dark');
    });

    it('debe cambiar de dark a light al hacer clic', () => {
      const { setTheme } = renderWithThemeContext('dark');
      
      fireEvent.click(screen.getByRole('button'));
      expect(setTheme).toHaveBeenCalledWith('light');
    });
  });

  describe('iconos', () => {
    it('debe contener iconos de sol y luna', () => {
      renderWithThemeContext();
      const button = screen.getByRole('button');
      // Los iconos son SVGs dentro del botón
      const svgs = button.querySelectorAll('svg');
      expect(svgs.length).toBe(2);
    });
  });

  describe('estilos', () => {
    it('debe aplicar estilos de botón ghost', () => {
      renderWithThemeContext();
      const button = screen.getByRole('button');
      expect(button).toHaveClass('rounded-full');
    });

    it('debe tener tamaño correcto', () => {
      renderWithThemeContext();
      const button = screen.getByRole('button');
      expect(button).toHaveClass('h-9');
      expect(button).toHaveClass('w-9');
    });
  });
});

