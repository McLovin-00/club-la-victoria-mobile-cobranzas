/**
 * Tests para los componentes Alert
 * Verifica renderizado y variantes de Alert, AlertTitle, AlertDescription
 */
import { render, screen } from '@testing-library/react';
import { Alert, AlertTitle, AlertDescription } from '../alert';

describe('Alert Components', () => {
  describe('Alert', () => {
    it('debe renderizar correctamente', () => {
      render(<Alert>Contenido de alerta</Alert>);
      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByText('Contenido de alerta')).toBeInTheDocument();
    });

    it('debe tener role="alert"', () => {
      render(<Alert>Test</Alert>);
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    it('debe aplicar clases base', () => {
      render(<Alert data-testid="alert">Test</Alert>);
      const alert = screen.getByTestId('alert');
      expect(alert).toHaveClass('relative');
      expect(alert).toHaveClass('rounded-lg');
      expect(alert).toHaveClass('border');
    });

    it('debe aplicar className adicional', () => {
      render(<Alert data-testid="alert" className="custom-alert">Test</Alert>);
      expect(screen.getByTestId('alert')).toHaveClass('custom-alert');
    });
  });

  describe('Alert variantes', () => {
    it('debe aplicar variante default', () => {
      render(<Alert data-testid="alert" variant="default">Default Alert</Alert>);
      const alert = screen.getByTestId('alert');
      expect(alert).toHaveClass('bg-background');
    });

    it('debe aplicar variante destructive', () => {
      render(<Alert data-testid="alert" variant="destructive">Destructive Alert</Alert>);
      const alert = screen.getByTestId('alert');
      expect(alert).toHaveClass('border-destructive/50');
    });

    it('debe usar variante default cuando no se especifica', () => {
      render(<Alert data-testid="alert">Sin variante</Alert>);
      const alert = screen.getByTestId('alert');
      expect(alert).toHaveClass('bg-background');
    });
  });

  describe('AlertTitle', () => {
    it('debe renderizar correctamente', () => {
      render(<AlertTitle>Título de alerta</AlertTitle>);
      expect(screen.getByText('Título de alerta')).toBeInTheDocument();
    });

    it('debe ser un h5', () => {
      render(<AlertTitle data-testid="title">Título</AlertTitle>);
      expect(screen.getByTestId('title').tagName).toBe('H5');
    });

    it('debe aplicar estilos de tipografía', () => {
      render(<AlertTitle data-testid="title">Título</AlertTitle>);
      const title = screen.getByTestId('title');
      expect(title).toHaveClass('font-medium');
      expect(title).toHaveClass('leading-none');
    });

    it('debe aceptar className adicional', () => {
      render(<AlertTitle data-testid="title" className="custom-title">Título</AlertTitle>);
      expect(screen.getByTestId('title')).toHaveClass('custom-title');
    });
  });

  describe('AlertDescription', () => {
    it('debe renderizar correctamente', () => {
      render(<AlertDescription>Descripción de alerta</AlertDescription>);
      expect(screen.getByText('Descripción de alerta')).toBeInTheDocument();
    });

    it('debe aplicar estilos de texto', () => {
      render(<AlertDescription data-testid="desc">Descripción</AlertDescription>);
      const desc = screen.getByTestId('desc');
      expect(desc).toHaveClass('text-sm');
    });

    it('debe aceptar className adicional', () => {
      render(<AlertDescription data-testid="desc" className="custom-desc">Descripción</AlertDescription>);
      expect(screen.getByTestId('desc')).toHaveClass('custom-desc');
    });
  });

  describe('Alert compuesto', () => {
    it('debe renderizar estructura completa', () => {
      render(
        <Alert>
          <AlertTitle>Error de validación</AlertTitle>
          <AlertDescription>
            Por favor revise los campos marcados en rojo.
          </AlertDescription>
        </Alert>
      );

      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByText('Error de validación')).toBeInTheDocument();
      expect(screen.getByText('Por favor revise los campos marcados en rojo.')).toBeInTheDocument();
    });

    it('debe renderizar con icono', () => {
      render(
        <Alert>
          <svg data-testid="icon" className="h-4 w-4" />
          <AlertTitle>Alerta con icono</AlertTitle>
          <AlertDescription>Descripción con icono</AlertDescription>
        </Alert>
      );

      expect(screen.getByTestId('icon')).toBeInTheDocument();
      expect(screen.getByText('Alerta con icono')).toBeInTheDocument();
    });
  });

  describe('props HTML', () => {
    it('debe pasar props adicionales', () => {
      render(
        <Alert 
          data-testid="alert" 
          id="my-alert"
          title="Tooltip"
        >
          Test
        </Alert>
      );
      
      const alert = screen.getByTestId('alert');
      expect(alert).toHaveAttribute('id', 'my-alert');
      expect(alert).toHaveAttribute('title', 'Tooltip');
    });
  });
});

