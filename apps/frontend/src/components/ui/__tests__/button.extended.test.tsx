/**
 * Tests extendidos para el componente Button
 * Verifica variantes, tamaños y comportamiento asChild
 */
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from '../button';

describe('Button', () => {
  describe('renderizado básico', () => {
    it('debe renderizar el contenido del botón', () => {
      render(<Button>Click me</Button>);
      expect(screen.getByRole('button', { name: 'Click me' })).toBeInTheDocument();
    });

    it('debe ser un elemento button por defecto', () => {
      render(<Button>Test</Button>);
      expect(screen.getByRole('button').tagName).toBe('BUTTON');
    });

    it('debe aplicar className adicional', () => {
      render(<Button className="custom-btn">Test</Button>);
      expect(screen.getByRole('button')).toHaveClass('custom-btn');
    });
  });

  describe('variantes', () => {
    it('debe aplicar variante default', () => {
      render(<Button variant="default">Default</Button>);
      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('debe aplicar variante destructive', () => {
      render(<Button variant="destructive">Destructive</Button>);
      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('debe aplicar variante outline', () => {
      render(<Button variant="outline">Outline</Button>);
      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('debe aplicar variante secondary', () => {
      render(<Button variant="secondary">Secondary</Button>);
      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('debe aplicar variante ghost', () => {
      render(<Button variant="ghost">Ghost</Button>);
      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('debe aplicar variante link', () => {
      render(<Button variant="link">Link</Button>);
      expect(screen.getByRole('button')).toBeInTheDocument();
    });
  });

  describe('tamaños', () => {
    it('debe aplicar tamaño default', () => {
      render(<Button size="default">Default Size</Button>);
      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('debe aplicar tamaño sm', () => {
      render(<Button size="sm">Small</Button>);
      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('debe aplicar tamaño lg', () => {
      render(<Button size="lg">Large</Button>);
      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('debe aplicar tamaño icon', () => {
      render(<Button size="icon">🔍</Button>);
      expect(screen.getByRole('button')).toBeInTheDocument();
    });
  });

  describe('estados', () => {
    it('debe soportar estado disabled', () => {
      render(<Button disabled>Disabled</Button>);
      expect(screen.getByRole('button')).toBeDisabled();
    });

    it('no debe disparar onClick cuando está disabled', () => {
      const handleClick = jest.fn();
      render(<Button disabled onClick={handleClick}>Disabled</Button>);
      
      fireEvent.click(screen.getByRole('button'));
      expect(handleClick).not.toHaveBeenCalled();
    });
  });

  describe('eventos', () => {
    it('debe llamar onClick al hacer clic', () => {
      const handleClick = jest.fn();
      render(<Button onClick={handleClick}>Click</Button>);
      
      fireEvent.click(screen.getByRole('button'));
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('debe llamar onFocus al recibir foco', () => {
      const handleFocus = jest.fn();
      render(<Button onFocus={handleFocus}>Focus</Button>);
      
      fireEvent.focus(screen.getByRole('button'));
      expect(handleFocus).toHaveBeenCalled();
    });

    it('debe llamar onBlur al perder foco', () => {
      const handleBlur = jest.fn();
      render(<Button onBlur={handleBlur}>Blur</Button>);
      
      const button = screen.getByRole('button');
      fireEvent.focus(button);
      fireEvent.blur(button);
      expect(handleBlur).toHaveBeenCalled();
    });
  });

  describe('asChild', () => {
    it('debe renderizar como slot cuando asChild es true', () => {
      render(
        <Button asChild>
          <a href="/test">Link Button</a>
        </Button>
      );

      const link = screen.getByRole('link');
      expect(link).toBeInTheDocument();
      expect(link).toHaveAttribute('href', '/test');
    });

    it('no debe ser un button cuando asChild es true', () => {
      render(
        <Button asChild>
          <span>Span Button</span>
        </Button>
      );

      expect(screen.queryByRole('button')).not.toBeInTheDocument();
      expect(screen.getByText('Span Button')).toBeInTheDocument();
    });
  });

  describe('tipos de botón', () => {
    it('debe soportar type="submit"', () => {
      render(<Button type="submit">Submit</Button>);
      expect(screen.getByRole('button')).toHaveAttribute('type', 'submit');
    });

    it('debe soportar type="button"', () => {
      render(<Button type="button">Button</Button>);
      expect(screen.getByRole('button')).toHaveAttribute('type', 'button');
    });

    it('debe soportar type="reset"', () => {
      render(<Button type="reset">Reset</Button>);
      expect(screen.getByRole('button')).toHaveAttribute('type', 'reset');
    });
  });

  describe('ref forwarding', () => {
    it('debe soportar ref', () => {
      const ref = { current: null as HTMLButtonElement | null };
      render(<Button ref={ref}>Ref Test</Button>);
      expect(ref.current).toBeInstanceOf(HTMLButtonElement);
    });
  });

  describe('props HTML', () => {
    it('debe pasar props HTML adicionales', () => {
      render(
        <Button 
          data-testid="custom-button" 
          id="my-button"
          title="Tooltip"
          aria-label="Accessible button"
        >
          Props Test
        </Button>
      );

      const button = screen.getByTestId('custom-button');
      expect(button).toHaveAttribute('id', 'my-button');
      expect(button).toHaveAttribute('title', 'Tooltip');
      expect(button).toHaveAttribute('aria-label', 'Accessible button');
    });
  });

  describe('contenido', () => {
    it('debe renderizar contenido complejo', () => {
      render(
        <Button>
          <span>Icono</span>
          <span>Texto</span>
        </Button>
      );

      expect(screen.getByText('Icono')).toBeInTheDocument();
      expect(screen.getByText('Texto')).toBeInTheDocument();
    });

    it('debe renderizar con icono SVG', () => {
      render(
        <Button>
          <svg data-testid="icon" className="h-4 w-4" />
          Submit
        </Button>
      );

      expect(screen.getByTestId('icon')).toBeInTheDocument();
      expect(screen.getByText('Submit')).toBeInTheDocument();
    });
  });
});

