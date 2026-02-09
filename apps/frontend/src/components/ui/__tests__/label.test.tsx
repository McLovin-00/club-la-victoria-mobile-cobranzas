/**
 * Tests para el componente Label
 * Verifica renderizado y comportamiento del label
 */
import { render, screen } from '@testing-library/react';
import { Label } from '../label';

describe('Label', () => {
  describe('renderizado básico', () => {
    it('debe renderizar el contenido del label', () => {
      render(<Label>Etiqueta</Label>);
      expect(screen.getByText('Etiqueta')).toBeInTheDocument();
    });

    it('debe aplicar clases base', () => {
      render(<Label data-testid="label">Test</Label>);
      const label = screen.getByTestId('label');
      expect(label).toHaveClass('text-sm');
      expect(label).toHaveClass('font-medium');
    });

    it('debe aplicar className adicional', () => {
      render(<Label data-testid="label" className="custom-label">Test</Label>);
      expect(screen.getByTestId('label')).toHaveClass('custom-label');
    });
  });

  describe('propiedades del label', () => {
    it('debe soportar htmlFor', () => {
      render(<Label htmlFor="my-input">Nombre</Label>);
      expect(screen.getByText('Nombre')).toHaveAttribute('for', 'my-input');
    });

    it('debe soportar id', () => {
      render(<Label data-testid="label" id="my-label">Test</Label>);
      expect(screen.getByTestId('label')).toHaveAttribute('id', 'my-label');
    });
  });

  describe('contenido', () => {
    it('debe renderizar contenido complejo con children', () => {
      render(
        <Label>
          <span>Icono</span>
          <span>Texto</span>
        </Label>
      );
      expect(screen.getByText('Icono')).toBeInTheDocument();
      expect(screen.getByText('Texto')).toBeInTheDocument();
    });

    it('debe renderizar con asterisco para campos requeridos', () => {
      render(
        <Label>
          Campo requerido <span className="text-red-500">*</span>
        </Label>
      );
      expect(screen.getByText('Campo requerido')).toBeInTheDocument();
      expect(screen.getByText('*')).toBeInTheDocument();
    });
  });

  describe('ref forwarding', () => {
    it('debe soportar ref', () => {
      const ref = { current: null as HTMLLabelElement | null };
      render(<Label ref={ref}>Test</Label>);
      expect(ref.current).toBeInstanceOf(HTMLLabelElement);
    });
  });

  describe('accesibilidad', () => {
    it('debe asociar correctamente el label con el input mediante htmlFor', () => {
      render(
        <>
          <Label htmlFor="email">Email</Label>
          <input id="email" type="email" />
        </>
      );
      
      const input = screen.getByRole('textbox');
      expect(screen.getByText('Email')).toHaveAttribute('for', 'email');
      expect(input).toHaveAttribute('id', 'email');
    });
  });
});

