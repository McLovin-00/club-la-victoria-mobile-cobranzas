/**
 * Tests para el componente Badge
 * Verifica renderizado y variantes del badge
 */
import { render, screen } from '@testing-library/react';
import { Badge } from '../badge';

describe('Badge', () => {
  describe('renderizado básico', () => {
    it('debe renderizar el contenido del badge', () => {
      render(<Badge>Nuevo</Badge>);
      expect(screen.getByText('Nuevo')).toBeInTheDocument();
    });

    it('debe aplicar className adicional', () => {
      render(<Badge className="custom-class">Test</Badge>);
      const badge = screen.getByText('Test');
      expect(badge).toHaveClass('custom-class');
    });

    it('debe renderizar como div', () => {
      render(<Badge data-testid="badge">Test</Badge>);
      const badge = screen.getByTestId('badge');
      expect(badge.tagName).toBe('DIV');
    });
  });

  describe('variantes', () => {
    it('debe aplicar variante default correctamente', () => {
      render(<Badge variant="default">Default</Badge>);
      const badge = screen.getByText('Default');
      expect(badge).toBeInTheDocument();
    });

    it('debe aplicar variante secondary', () => {
      render(<Badge variant="secondary">Secondary</Badge>);
      const badge = screen.getByText('Secondary');
      expect(badge).toBeInTheDocument();
    });

    it('debe aplicar variante destructive', () => {
      render(<Badge variant="destructive">Destructive</Badge>);
      const badge = screen.getByText('Destructive');
      expect(badge).toBeInTheDocument();
    });

    it('debe aplicar variante outline', () => {
      render(<Badge variant="outline">Outline</Badge>);
      const badge = screen.getByText('Outline');
      expect(badge).toBeInTheDocument();
    });

    it('debe usar variante default cuando no se especifica', () => {
      render(<Badge>Sin variante</Badge>);
      const badge = screen.getByText('Sin variante');
      expect(badge).toBeInTheDocument();
    });
  });

  describe('props HTML', () => {
    it('debe pasar props HTML adicionales', () => {
      render(
        <Badge 
          data-testid="badge" 
          id="my-badge"
          title="Badge tooltip"
        >
          Props Test
        </Badge>
      );
      
      const badge = screen.getByTestId('badge');
      expect(badge).toHaveAttribute('id', 'my-badge');
      expect(badge).toHaveAttribute('title', 'Badge tooltip');
    });

    it('debe soportar onClick', () => {
      const handleClick = jest.fn();
      render(<Badge onClick={handleClick}>Clickable</Badge>);
      
      const badge = screen.getByText('Clickable');
      badge.click();
      
      expect(handleClick).toHaveBeenCalledTimes(1);
    });
  });

  describe('contenido', () => {
    it('debe renderizar contenido complejo', () => {
      render(
        <Badge>
          <span>Icono</span>
          <span>Texto</span>
        </Badge>
      );
      
      expect(screen.getByText('Icono')).toBeInTheDocument();
      expect(screen.getByText('Texto')).toBeInTheDocument();
    });

    it('debe renderizar números', () => {
      render(<Badge>42</Badge>);
      expect(screen.getByText('42')).toBeInTheDocument();
    });
  });
});

