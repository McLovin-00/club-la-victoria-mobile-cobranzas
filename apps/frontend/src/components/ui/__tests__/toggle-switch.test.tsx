/**
 * Tests para el componente ToggleSwitch
 * Verifica renderizado, tamaños y comportamiento del toggle
 */
import { render, screen, fireEvent } from '@testing-library/react';
import { ToggleSwitch } from '../toggle-switch';

// Mock de TouchFeedback para simplificar los tests
jest.mock('@/components/mobile/TouchFeedback', () => ({
  TouchFeedback: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

describe('ToggleSwitch', () => {
  describe('renderizado básico', () => {
    it('debe renderizar correctamente', () => {
      render(<ToggleSwitch checked={false} onChange={() => {}} />);
      expect(screen.getByRole('switch')).toBeInTheDocument();
    });

    it('debe tener aria-checked="false" cuando no está marcado', () => {
      render(<ToggleSwitch checked={false} onChange={() => {}} />);
      expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'false');
    });

    it('debe tener aria-checked="true" cuando está marcado', () => {
      render(<ToggleSwitch checked={true} onChange={() => {}} />);
      expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'true');
    });

    it('debe ser un botón', () => {
      render(<ToggleSwitch checked={false} onChange={() => {}} />);
      expect(screen.getByRole('switch').tagName).toBe('BUTTON');
    });

    it('debe tener type="button"', () => {
      render(<ToggleSwitch checked={false} onChange={() => {}} />);
      expect(screen.getByRole('switch')).toHaveAttribute('type', 'button');
    });
  });

  describe('tamaños', () => {
    it('debe aplicar tamaño sm', () => {
      render(<ToggleSwitch checked={false} onChange={() => {}} size="sm" />);
      const toggle = screen.getByRole('switch');
      expect(toggle).toHaveClass('w-10');
      expect(toggle).toHaveClass('h-6');
    });

    it('debe aplicar tamaño md (default)', () => {
      render(<ToggleSwitch checked={false} onChange={() => {}} size="md" />);
      const toggle = screen.getByRole('switch');
      expect(toggle).toHaveClass('w-12');
      expect(toggle).toHaveClass('h-7');
    });

    it('debe aplicar tamaño lg', () => {
      render(<ToggleSwitch checked={false} onChange={() => {}} size="lg" />);
      const toggle = screen.getByRole('switch');
      expect(toggle).toHaveClass('w-14');
      expect(toggle).toHaveClass('h-8');
    });

    it('debe usar tamaño md por defecto', () => {
      render(<ToggleSwitch checked={false} onChange={() => {}} />);
      const toggle = screen.getByRole('switch');
      expect(toggle).toHaveClass('w-12');
    });
  });

  describe('estados', () => {
    it('debe aplicar estilos cuando está activado', () => {
      render(<ToggleSwitch checked={true} onChange={() => {}} />);
      const toggle = screen.getByRole('switch');
      expect(toggle).toHaveClass('bg-blue-500');
    });

    it('debe aplicar estilos cuando está desactivado', () => {
      render(<ToggleSwitch checked={false} onChange={() => {}} />);
      const toggle = screen.getByRole('switch');
      expect(toggle).toHaveClass('bg-gray-300');
    });

    it('debe aplicar estilos cuando está disabled', () => {
      render(<ToggleSwitch checked={false} onChange={() => {}} disabled />);
      const toggle = screen.getByRole('switch');
      expect(toggle).toBeDisabled();
      expect(toggle).toHaveClass('opacity-50');
      expect(toggle).toHaveClass('cursor-not-allowed');
    });
  });

  describe('interacción', () => {
    it('debe llamar onChange al hacer clic', () => {
      const handleChange = jest.fn();
      render(<ToggleSwitch checked={false} onChange={handleChange} />);

      fireEvent.click(screen.getByRole('switch'));
      expect(handleChange).toHaveBeenCalledWith(true);
    });

    it('debe llamar onChange con el valor opuesto', () => {
      const handleChange = jest.fn();
      render(<ToggleSwitch checked={true} onChange={handleChange} />);

      fireEvent.click(screen.getByRole('switch'));
      expect(handleChange).toHaveBeenCalledWith(false);
    });

    it('no debe llamar onChange cuando está disabled', () => {
      const handleChange = jest.fn();
      render(<ToggleSwitch checked={false} onChange={handleChange} disabled />);

      fireEvent.click(screen.getByRole('switch'));
      expect(handleChange).not.toHaveBeenCalled();
    });
  });

  describe('thumb', () => {
    it('debe renderizar el thumb (indicador)', () => {
      render(<ToggleSwitch checked={false} onChange={() => {}} />);
      const toggle = screen.getByRole('switch');
      const thumb = toggle.querySelector('span');
      expect(thumb).toBeInTheDocument();
      expect(thumb).toHaveClass('bg-white');
      expect(thumb).toHaveClass('rounded-full');
    });

    it('debe animar el thumb según estado checked para tamaño sm', () => {
      const { rerender } = render(<ToggleSwitch checked={false} onChange={() => {}} size="sm" />);
      let thumb = screen.getByRole('switch').querySelector('span');
      expect(thumb).toHaveClass('translate-x-1');

      rerender(<ToggleSwitch checked={true} onChange={() => {}} size="sm" />);
      thumb = screen.getByRole('switch').querySelector('span');
      expect(thumb).toHaveClass('translate-x-4');
    });

    it('debe animar el thumb según estado checked para tamaño md', () => {
      const { rerender } = render(<ToggleSwitch checked={false} onChange={() => {}} size="md" />);
      let thumb = screen.getByRole('switch').querySelector('span');
      expect(thumb).toHaveClass('translate-x-1');

      rerender(<ToggleSwitch checked={true} onChange={() => {}} size="md" />);
      thumb = screen.getByRole('switch').querySelector('span');
      expect(thumb).toHaveClass('translate-x-5');
    });

    it('debe animar el thumb según estado checked para tamaño lg', () => {
      const { rerender } = render(<ToggleSwitch checked={false} onChange={() => {}} size="lg" />);
      let thumb = screen.getByRole('switch').querySelector('span');
      expect(thumb).toHaveClass('translate-x-1');

      rerender(<ToggleSwitch checked={true} onChange={() => {}} size="lg" />);
      thumb = screen.getByRole('switch').querySelector('span');
      expect(thumb).toHaveClass('translate-x-6');
    });
  });

  describe('className', () => {
    it('debe aplicar className adicional', () => {
      render(<ToggleSwitch checked={false} onChange={() => {}} className="custom-toggle" />);
      expect(screen.getByRole('switch')).toHaveClass('custom-toggle');
    });
  });
});
