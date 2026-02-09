/**
 * Tests para el componente Input
 * Verifica renderizado, tipos, y comportamiento del input
 */
import { render, screen, fireEvent } from '@testing-library/react';
import { Input } from '../input';

describe('Input', () => {
  describe('renderizado básico', () => {
    it('debe renderizar el input correctamente', () => {
      render(<Input data-testid="input" />);
      expect(screen.getByTestId('input')).toBeInTheDocument();
    });

    it('debe renderizarse como elemento input', () => {
      render(<Input data-testid="input" />);
      expect(screen.getByTestId('input').tagName).toBe('INPUT');
    });

    it('debe aplicar clases base', () => {
      render(<Input data-testid="input" />);
      const input = screen.getByTestId('input');
      expect(input).toHaveClass('flex');
      expect(input).toHaveClass('rounded-md');
      expect(input).toHaveClass('border');
    });

    it('debe aplicar className adicional', () => {
      render(<Input data-testid="input" className="custom-input" />);
      expect(screen.getByTestId('input')).toHaveClass('custom-input');
    });
  });

  describe('tipos de input', () => {
    it('debe soportar type="text" (default)', () => {
      render(<Input data-testid="input" type="text" />);
      expect(screen.getByTestId('input')).toHaveAttribute('type', 'text');
    });

    it('debe soportar type="password"', () => {
      render(<Input data-testid="input" type="password" />);
      expect(screen.getByTestId('input')).toHaveAttribute('type', 'password');
    });

    it('debe soportar type="email"', () => {
      render(<Input data-testid="input" type="email" />);
      expect(screen.getByTestId('input')).toHaveAttribute('type', 'email');
    });

    it('debe soportar type="number"', () => {
      render(<Input data-testid="input" type="number" />);
      expect(screen.getByTestId('input')).toHaveAttribute('type', 'number');
    });

    it('debe soportar type="tel"', () => {
      render(<Input data-testid="input" type="tel" />);
      expect(screen.getByTestId('input')).toHaveAttribute('type', 'tel');
    });

    it('debe soportar type="search"', () => {
      render(<Input data-testid="input" type="search" />);
      expect(screen.getByTestId('input')).toHaveAttribute('type', 'search');
    });
  });

  describe('propiedades del input', () => {
    it('debe soportar placeholder', () => {
      render(<Input placeholder="Ingrese texto..." />);
      expect(screen.getByPlaceholderText('Ingrese texto...')).toBeInTheDocument();
    });

    it('debe soportar value y onChange', () => {
      const handleChange = jest.fn();
      render(<Input data-testid="input" value="test" onChange={handleChange} />);
      
      const input = screen.getByTestId('input') as HTMLInputElement;
      expect(input.value).toBe('test');
      
      fireEvent.change(input, { target: { value: 'nuevo valor' } });
      expect(handleChange).toHaveBeenCalled();
    });

    it('debe soportar defaultValue', () => {
      render(<Input data-testid="input" defaultValue="valor inicial" />);
      expect(screen.getByTestId('input')).toHaveValue('valor inicial');
    });

    it('debe soportar disabled', () => {
      render(<Input data-testid="input" disabled />);
      expect(screen.getByTestId('input')).toBeDisabled();
    });

    it('debe soportar required', () => {
      render(<Input data-testid="input" required />);
      expect(screen.getByTestId('input')).toBeRequired();
    });

    it('debe soportar readOnly', () => {
      render(<Input data-testid="input" readOnly value="solo lectura" />);
      expect(screen.getByTestId('input')).toHaveAttribute('readonly');
    });

    it('debe soportar autoComplete', () => {
      render(<Input data-testid="input" autoComplete="email" />);
      expect(screen.getByTestId('input')).toHaveAttribute('autocomplete', 'email');
    });

    it('debe soportar name', () => {
      render(<Input data-testid="input" name="username" />);
      expect(screen.getByTestId('input')).toHaveAttribute('name', 'username');
    });

    it('debe soportar id', () => {
      render(<Input data-testid="input" id="my-input" />);
      expect(screen.getByTestId('input')).toHaveAttribute('id', 'my-input');
    });

    it('debe soportar maxLength', () => {
      render(<Input data-testid="input" maxLength={10} />);
      expect(screen.getByTestId('input')).toHaveAttribute('maxlength', '10');
    });

    it('debe soportar minLength', () => {
      render(<Input data-testid="input" minLength={3} />);
      expect(screen.getByTestId('input')).toHaveAttribute('minlength', '3');
    });
  });

  describe('eventos', () => {
    it('debe llamar onFocus cuando recibe foco', () => {
      const handleFocus = jest.fn();
      render(<Input data-testid="input" onFocus={handleFocus} />);
      
      fireEvent.focus(screen.getByTestId('input'));
      expect(handleFocus).toHaveBeenCalledTimes(1);
    });

    it('debe llamar onBlur cuando pierde foco', () => {
      const handleBlur = jest.fn();
      render(<Input data-testid="input" onBlur={handleBlur} />);
      
      const input = screen.getByTestId('input');
      fireEvent.focus(input);
      fireEvent.blur(input);
      expect(handleBlur).toHaveBeenCalledTimes(1);
    });

    it('debe llamar onKeyDown cuando se presiona una tecla', () => {
      const handleKeyDown = jest.fn();
      render(<Input data-testid="input" onKeyDown={handleKeyDown} />);
      
      fireEvent.keyDown(screen.getByTestId('input'), { key: 'Enter' });
      expect(handleKeyDown).toHaveBeenCalledTimes(1);
    });
  });

  describe('ref forwarding', () => {
    it('debe soportar ref', () => {
      const ref = { current: null as HTMLInputElement | null };
      render(<Input ref={ref} />);
      expect(ref.current).toBeInstanceOf(HTMLInputElement);
    });
  });
});

