/**
 * Tests para el componente Spinner
 * Verifica renderizado y accesibilidad del spinner
 */
import { render, screen } from '@testing-library/react';
import { Spinner } from '../spinner';

describe('Spinner', () => {
  describe('renderizado básico', () => {
    it('debe renderizar correctamente', () => {
      render(<Spinner data-testid="spinner" />);
      expect(screen.getByTestId('spinner')).toBeInTheDocument();
    });

    it('debe tener role="status" para accesibilidad', () => {
      render(<Spinner />);
      expect(screen.getByRole('status')).toBeInTheDocument();
    });

    it('debe tener aria-label para lectores de pantalla', () => {
      render(<Spinner />);
      expect(screen.getByRole('status')).toHaveAttribute('aria-label', 'Cargando');
    });

    it('debe incluir texto oculto para lectores de pantalla', () => {
      render(<Spinner />);
      expect(screen.getByText('Cargando')).toHaveClass('sr-only');
    });

    it('debe aplicar clase de animación', () => {
      render(<Spinner data-testid="spinner" />);
      expect(screen.getByTestId('spinner')).toHaveClass('animate-spin');
    });
  });

  describe('estilos', () => {
    it('debe aplicar className adicional', () => {
      render(<Spinner data-testid="spinner" className="custom-spinner" />);
      expect(screen.getByTestId('spinner')).toHaveClass('custom-spinner');
    });

    it('debe soportar clases de tamaño personalizadas', () => {
      render(<Spinner data-testid="spinner" className="h-8 w-8" />);
      const spinner = screen.getByTestId('spinner');
      expect(spinner).toHaveClass('h-8');
      expect(spinner).toHaveClass('w-8');
    });

    it('debe soportar clases de color personalizadas', () => {
      render(<Spinner data-testid="spinner" className="text-blue-500" />);
      expect(screen.getByTestId('spinner')).toHaveClass('text-blue-500');
    });
  });

  describe('SVG interno', () => {
    it('debe contener un elemento SVG', () => {
      render(<Spinner data-testid="spinner" />);
      const spinner = screen.getByTestId('spinner');
      const svg = spinner.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });

    it('el SVG debe tener las propiedades correctas', () => {
      render(<Spinner data-testid="spinner" />);
      const spinner = screen.getByTestId('spinner');
      const svg = spinner.querySelector('svg');
      expect(svg).toHaveAttribute('fill', 'none');
      expect(svg).toHaveAttribute('viewBox', '0 0 24 24');
    });

    it('debe contener círculo y path para el diseño', () => {
      render(<Spinner data-testid="spinner" />);
      const spinner = screen.getByTestId('spinner');
      const circle = spinner.querySelector('circle');
      const path = spinner.querySelector('path');
      expect(circle).toBeInTheDocument();
      expect(path).toBeInTheDocument();
    });
  });

  describe('props HTML', () => {
    it('debe pasar props adicionales', () => {
      render(<Spinner data-testid="spinner" id="my-spinner" title="Cargando datos" />);
      const spinner = screen.getByTestId('spinner');
      expect(spinner).toHaveAttribute('id', 'my-spinner');
      expect(spinner).toHaveAttribute('title', 'Cargando datos');
    });
  });
});

