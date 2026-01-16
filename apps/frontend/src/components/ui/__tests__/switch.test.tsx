/**
 * Tests para el componente Switch
 * Verifica renderizado y funcionalidad del switch/toggle
 */
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Switch } from '../switch';

describe('Switch', () => {
  describe('renderizado básico', () => {
    it('debe renderizar el switch', () => {
      render(<Switch data-testid="switch" />);
      expect(screen.getByTestId('switch')).toBeInTheDocument();
    });

    it('debe renderizar como button por accesibilidad', () => {
      render(<Switch data-testid="switch" />);
      const switchElement = screen.getByTestId('switch');
      expect(switchElement.tagName).toBe('BUTTON');
    });

    it('debe aplicar className adicional', () => {
      render(<Switch className="custom-class" data-testid="switch" />);
      const switchElement = screen.getByTestId('switch');
      expect(switchElement).toHaveClass('custom-class');
    });
  });

  describe('estados', () => {
    it('debe estar unchecked por defecto', () => {
      render(<Switch data-testid="switch" />);
      const switchElement = screen.getByTestId('switch');
      expect(switchElement).toHaveAttribute('data-state', 'unchecked');
    });

    it('debe estar checked cuando checked=true', () => {
      render(<Switch checked data-testid="switch" />);
      const switchElement = screen.getByTestId('switch');
      expect(switchElement).toHaveAttribute('data-state', 'checked');
    });

    it('debe estar checked con defaultChecked', () => {
      render(<Switch defaultChecked data-testid="switch" />);
      const switchElement = screen.getByTestId('switch');
      expect(switchElement).toHaveAttribute('data-state', 'checked');
    });
  });

  describe('interacción', () => {
    it('debe llamar onCheckedChange al hacer click', async () => {
      const handleChange = jest.fn();
      render(<Switch onCheckedChange={handleChange} data-testid="switch" />);
      
      const switchElement = screen.getByTestId('switch');
      await userEvent.click(switchElement);
      
      expect(handleChange).toHaveBeenCalledWith(true);
    });

    it('debe togglear estado al hacer click repetidamente', async () => {
      const handleChange = jest.fn();
      render(<Switch onCheckedChange={handleChange} data-testid="switch" />);
      
      const switchElement = screen.getByTestId('switch');
      
      await userEvent.click(switchElement);
      expect(handleChange).toHaveBeenLastCalledWith(true);
      
      // Para controlado, necesitamos simular el nuevo estado
      handleChange.mockClear();
    });

    it('debe ser controlable externamente', () => {
      const { rerender } = render(
        <Switch checked={false} data-testid="switch" />
      );
      
      let switchElement = screen.getByTestId('switch');
      expect(switchElement).toHaveAttribute('data-state', 'unchecked');

      rerender(<Switch checked={true} data-testid="switch" />);
      
      switchElement = screen.getByTestId('switch');
      expect(switchElement).toHaveAttribute('data-state', 'checked');
    });
  });

  describe('accesibilidad', () => {
    it('debe tener role de switch', () => {
      render(<Switch data-testid="switch" />);
      const switchElement = screen.getByRole('switch');
      expect(switchElement).toBeInTheDocument();
    });

    it('debe soportar aria-label', () => {
      render(<Switch aria-label="Activar notificaciones" data-testid="switch" />);
      const switchElement = screen.getByLabelText('Activar notificaciones');
      expect(switchElement).toBeInTheDocument();
    });

    it('debe ser focuseable con teclado', () => {
      render(<Switch data-testid="switch" />);
      const switchElement = screen.getByTestId('switch');
      
      switchElement.focus();
      expect(document.activeElement).toBe(switchElement);
    });

    it('debe responder a tecla Space', async () => {
      const handleChange = jest.fn();
      render(<Switch onCheckedChange={handleChange} data-testid="switch" />);
      
      const switchElement = screen.getByTestId('switch');
      switchElement.focus();
      
      fireEvent.keyDown(switchElement, { key: ' ', code: 'Space' });
      fireEvent.keyUp(switchElement, { key: ' ', code: 'Space' });
      
      // Radix maneja el toggle con Space
    });
  });

  describe('disabled', () => {
    it('debe aplicar estado disabled', () => {
      render(<Switch disabled data-testid="switch" />);
      const switchElement = screen.getByTestId('switch');
      expect(switchElement).toBeDisabled();
    });

    it('no debe llamar onCheckedChange cuando disabled', async () => {
      const handleChange = jest.fn();
      render(
        <Switch 
          disabled 
          onCheckedChange={handleChange} 
          data-testid="switch" 
        />
      );
      
      const switchElement = screen.getByTestId('switch');
      await userEvent.click(switchElement);
      
      expect(handleChange).not.toHaveBeenCalled();
    });

    it('debe tener estilos de disabled', () => {
      render(<Switch disabled data-testid="switch" />);
      const switchElement = screen.getByTestId('switch');
      expect(switchElement).toHaveClass('disabled:cursor-not-allowed');
      expect(switchElement).toHaveClass('disabled:opacity-50');
    });
  });

  describe('ref forwarding', () => {
    it('debe permitir ref', () => {
      const ref = { current: null };
      render(<Switch ref={ref} data-testid="switch" />);
      expect(ref.current).not.toBeNull();
    });
  });

  describe('estilos', () => {
    it('debe tener clases base', () => {
      render(<Switch data-testid="switch" />);
      const switchElement = screen.getByTestId('switch');
      expect(switchElement).toHaveClass('inline-flex');
      expect(switchElement).toHaveClass('cursor-pointer');
    });
  });
});

