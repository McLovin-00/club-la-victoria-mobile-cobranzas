/**
 * Tests para el componente Select (BasicSelect)
 * Verifica renderizado y comportamiento del select básico
 */
import { render, screen, fireEvent } from '@testing-library/react';
import { BasicSelect } from '../select';

describe('BasicSelect', () => {
  describe('renderizado básico', () => {
    it('debe renderizar correctamente', () => {
      render(<BasicSelect data-testid="select" />);
      expect(screen.getByTestId('select')).toBeInTheDocument();
    });

    it('debe ser un elemento select', () => {
      render(<BasicSelect data-testid="select" />);
      expect(screen.getByTestId('select').tagName).toBe('SELECT');
    });

    it('debe aplicar clases base', () => {
      render(<BasicSelect data-testid="select" />);
      const select = screen.getByTestId('select');
      expect(select).toHaveClass('flex');
      expect(select).toHaveClass('rounded-md');
      expect(select).toHaveClass('border');
    });

    it('debe aplicar className adicional', () => {
      render(<BasicSelect data-testid="select" className="custom-select" />);
      expect(screen.getByTestId('select')).toHaveClass('custom-select');
    });
  });

  describe('opciones', () => {
    it('debe renderizar opciones correctamente', () => {
      render(
        <BasicSelect data-testid="select">
          <option value="">Seleccione...</option>
          <option value="1">Opción 1</option>
          <option value="2">Opción 2</option>
        </BasicSelect>
      );
      
      expect(screen.getByText('Seleccione...')).toBeInTheDocument();
      expect(screen.getByText('Opción 1')).toBeInTheDocument();
      expect(screen.getByText('Opción 2')).toBeInTheDocument();
    });

    it('debe tener el valor seleccionado correcto', () => {
      render(
        <BasicSelect data-testid="select" value="2" onChange={() => {}}>
          <option value="1">Opción 1</option>
          <option value="2">Opción 2</option>
        </BasicSelect>
      );
      
      expect(screen.getByTestId('select')).toHaveValue('2');
    });
  });

  describe('eventos', () => {
    it('debe llamar onChange cuando se selecciona una opción', () => {
      const handleChange = jest.fn();
      render(
        <BasicSelect data-testid="select" onChange={handleChange}>
          <option value="1">Opción 1</option>
          <option value="2">Opción 2</option>
        </BasicSelect>
      );
      
      fireEvent.change(screen.getByTestId('select'), { target: { value: '2' } });
      expect(handleChange).toHaveBeenCalled();
    });

    it('debe llamar onFocus cuando recibe foco', () => {
      const handleFocus = jest.fn();
      render(
        <BasicSelect data-testid="select" onFocus={handleFocus}>
          <option value="1">Opción 1</option>
        </BasicSelect>
      );
      
      fireEvent.focus(screen.getByTestId('select'));
      expect(handleFocus).toHaveBeenCalled();
    });

    it('debe llamar onBlur cuando pierde foco', () => {
      const handleBlur = jest.fn();
      render(
        <BasicSelect data-testid="select" onBlur={handleBlur}>
          <option value="1">Opción 1</option>
        </BasicSelect>
      );
      
      fireEvent.blur(screen.getByTestId('select'));
      expect(handleBlur).toHaveBeenCalled();
    });
  });

  describe('propiedades', () => {
    it('debe soportar disabled', () => {
      render(<BasicSelect data-testid="select" disabled />);
      expect(screen.getByTestId('select')).toBeDisabled();
    });

    it('debe soportar required', () => {
      render(<BasicSelect data-testid="select" required />);
      expect(screen.getByTestId('select')).toBeRequired();
    });

    it('debe soportar name', () => {
      render(<BasicSelect data-testid="select" name="my-select" />);
      expect(screen.getByTestId('select')).toHaveAttribute('name', 'my-select');
    });

    it('debe soportar id', () => {
      render(<BasicSelect data-testid="select" id="select-id" />);
      expect(screen.getByTestId('select')).toHaveAttribute('id', 'select-id');
    });
  });

  describe('ref forwarding', () => {
    it('debe soportar ref', () => {
      const ref = { current: null as HTMLSelectElement | null };
      render(<BasicSelect ref={ref} />);
      expect(ref.current).toBeInstanceOf(HTMLSelectElement);
    });
  });
});

