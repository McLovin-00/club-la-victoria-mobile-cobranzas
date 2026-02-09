/**
 * Tests para el componente Textarea
 * Verifica renderizado y funcionalidad del área de texto
 */
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Textarea } from '../textarea';

describe('Textarea', () => {
  describe('renderizado básico', () => {
    it('debe renderizar el textarea', () => {
      render(<Textarea data-testid="textarea" />);
      expect(screen.getByTestId('textarea')).toBeInTheDocument();
    });

    it('debe renderizar como textarea HTML', () => {
      render(<Textarea data-testid="textarea" />);
      const textarea = screen.getByTestId('textarea');
      expect(textarea.tagName).toBe('TEXTAREA');
    });

    it('debe aplicar className adicional', () => {
      render(<Textarea className="custom-class" data-testid="textarea" />);
      const textarea = screen.getByTestId('textarea');
      expect(textarea).toHaveClass('custom-class');
    });
  });

  describe('props de textarea', () => {
    it('debe soportar placeholder', () => {
      render(<Textarea placeholder="Escribe aquí..." />);
      expect(screen.getByPlaceholderText('Escribe aquí...')).toBeInTheDocument();
    });

    it('debe soportar value controlado', () => {
      render(<Textarea value="Texto inicial" onChange={() => {}} data-testid="textarea" />);
      const textarea = screen.getByTestId('textarea');
      expect(textarea).toHaveValue('Texto inicial');
    });

    it('debe soportar defaultValue', () => {
      render(<Textarea defaultValue="Valor por defecto" data-testid="textarea" />);
      const textarea = screen.getByTestId('textarea');
      expect(textarea).toHaveValue('Valor por defecto');
    });

    it('debe soportar rows', () => {
      render(<Textarea rows={5} data-testid="textarea" />);
      const textarea = screen.getByTestId('textarea');
      expect(textarea).toHaveAttribute('rows', '5');
    });

    it('debe soportar maxLength', () => {
      render(<Textarea maxLength={100} data-testid="textarea" />);
      const textarea = screen.getByTestId('textarea');
      expect(textarea).toHaveAttribute('maxLength', '100');
    });

    it('debe soportar name', () => {
      render(<Textarea name="description" data-testid="textarea" />);
      const textarea = screen.getByTestId('textarea');
      expect(textarea).toHaveAttribute('name', 'description');
    });
  });

  describe('interacción', () => {
    it('debe permitir escribir texto', async () => {
      render(<Textarea data-testid="textarea" />);
      const textarea = screen.getByTestId('textarea');
      
      await userEvent.type(textarea, 'Hola mundo');
      
      expect(textarea).toHaveValue('Hola mundo');
    });

    it('debe llamar onChange al escribir', async () => {
      const handleChange = jest.fn();
      render(<Textarea onChange={handleChange} data-testid="textarea" />);
      
      const textarea = screen.getByTestId('textarea');
      await userEvent.type(textarea, 'a');
      
      expect(handleChange).toHaveBeenCalled();
    });

    it('debe llamar onBlur al perder foco', () => {
      const handleBlur = jest.fn();
      render(<Textarea onBlur={handleBlur} data-testid="textarea" />);
      
      const textarea = screen.getByTestId('textarea');
      fireEvent.focus(textarea);
      fireEvent.blur(textarea);
      
      expect(handleBlur).toHaveBeenCalledTimes(1);
    });

    it('debe llamar onFocus al recibir foco', () => {
      const handleFocus = jest.fn();
      render(<Textarea onFocus={handleFocus} data-testid="textarea" />);
      
      const textarea = screen.getByTestId('textarea');
      fireEvent.focus(textarea);
      
      expect(handleFocus).toHaveBeenCalledTimes(1);
    });
  });

  describe('estados', () => {
    it('debe soportar disabled', () => {
      render(<Textarea disabled data-testid="textarea" />);
      const textarea = screen.getByTestId('textarea');
      expect(textarea).toBeDisabled();
    });

    it('debe soportar readOnly', () => {
      render(<Textarea readOnly value="Solo lectura" data-testid="textarea" />);
      const textarea = screen.getByTestId('textarea');
      expect(textarea).toHaveAttribute('readonly');
    });

    it('debe soportar required', () => {
      render(<Textarea required data-testid="textarea" />);
      const textarea = screen.getByTestId('textarea');
      expect(textarea).toBeRequired();
    });
  });

  describe('accesibilidad', () => {
    it('debe ser focuseable', () => {
      render(<Textarea data-testid="textarea" />);
      const textarea = screen.getByTestId('textarea');
      
      textarea.focus();
      expect(document.activeElement).toBe(textarea);
    });

    it('debe soportar aria-label', () => {
      render(<Textarea aria-label="Descripción del producto" />);
      expect(screen.getByLabelText('Descripción del producto')).toBeInTheDocument();
    });

    it('debe soportar aria-describedby', () => {
      render(
        <>
          <Textarea aria-describedby="help-text" data-testid="textarea" />
          <span id="help-text">Máximo 500 caracteres</span>
        </>
      );
      const textarea = screen.getByTestId('textarea');
      expect(textarea).toHaveAttribute('aria-describedby', 'help-text');
    });

    it('debe soportar aria-invalid', () => {
      render(<Textarea aria-invalid="true" data-testid="textarea" />);
      const textarea = screen.getByTestId('textarea');
      expect(textarea).toHaveAttribute('aria-invalid', 'true');
    });
  });

  describe('ref forwarding', () => {
    it('debe permitir ref', () => {
      const ref = { current: null };
      render(<Textarea ref={ref} data-testid="textarea" />);
      expect(ref.current).not.toBeNull();
      expect(ref.current).toBeInstanceOf(HTMLTextAreaElement);
    });

    it('debe permitir focus programático via ref', () => {
      const ref = { current: null as HTMLTextAreaElement | null };
      render(<Textarea ref={ref} data-testid="textarea" />);
      
      ref.current?.focus();
      
      expect(document.activeElement).toBe(ref.current);
    });
  });

  describe('estilos', () => {
    it('debe tener clases base', () => {
      render(<Textarea data-testid="textarea" />);
      const textarea = screen.getByTestId('textarea');
      expect(textarea).toHaveClass('flex');
      expect(textarea).toHaveClass('w-full');
      expect(textarea).toHaveClass('rounded-md');
    });

    it('debe tener altura mínima', () => {
      render(<Textarea data-testid="textarea" />);
      const textarea = screen.getByTestId('textarea');
      expect(textarea).toHaveClass('min-h-[80px]');
    });

    it('debe tener estilos de disabled', () => {
      render(<Textarea disabled data-testid="textarea" />);
      const textarea = screen.getByTestId('textarea');
      expect(textarea).toHaveClass('disabled:cursor-not-allowed');
      expect(textarea).toHaveClass('disabled:opacity-50');
    });
  });

  describe('displayName', () => {
    it('debe tener displayName definido', () => {
      expect(Textarea.displayName).toBe('Textarea');
    });
  });
});

