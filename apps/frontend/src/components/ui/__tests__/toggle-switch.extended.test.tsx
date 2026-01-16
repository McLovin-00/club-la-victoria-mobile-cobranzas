/**
 * Tests extendidos para ToggleSwitch
 * Incrementa coverage cubriendo accesibilidad y focus
 */
import { render, screen, fireEvent } from '@testing-library/react';
import { ToggleSwitch } from '../toggle-switch';

// Mock de TouchFeedback
jest.mock('@/components/mobile/TouchFeedback', () => ({
  TouchFeedback: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

describe('ToggleSwitch (extended)', () => {
  describe('accesibilidad', () => {
    it('debe tener focus ring al hacer focus', () => {
      render(<ToggleSwitch checked={false} onChange={() => {}} />);
      const toggle = screen.getByRole('switch');

      toggle.focus();

      expect(toggle).toHaveClass('focus:ring-2');
      expect(toggle).toHaveClass('focus:ring-blue-500');
    });

    it('debe tener focus:ring-offset-2', () => {
      render(<ToggleSwitch checked={false} onChange={() => {}} />);
      const toggle = screen.getByRole('switch');

      expect(toggle).toHaveClass('focus:ring-offset-2');
    });
  });

  describe('hover states', () => {
    it('debe tener hover:bg-blue-600 cuando está checked', () => {
      render(<ToggleSwitch checked={true} onChange={() => {}} />);
      const toggle = screen.getByRole('switch');

      expect(toggle).toHaveClass('hover:bg-blue-600');
    });

    it('debe tener hover:bg-gray-400 cuando no está checked', () => {
      render(<ToggleSwitch checked={false} onChange={() => {}} />);
      const toggle = screen.getByRole('switch');

      expect(toggle).toHaveClass('hover:bg-gray-400');
    });
  });

  describe('transiciones', () => {
    it('debe tener transición de colores', () => {
      render(<ToggleSwitch checked={false} onChange={() => {}} />);
      const toggle = screen.getByRole('switch');

      expect(toggle).toHaveClass('transition-colors');
      expect(toggle).toHaveClass('duration-200');
      expect(toggle).toHaveClass('ease-in-out');
    });

    it('el thumb debe tener transición de transform', () => {
      render(<ToggleSwitch checked={false} onChange={() => {}} />);
      const thumb = screen.getByRole('switch').querySelector('span');

      expect(thumb).toHaveClass('transition-transform');
      expect(thumb).toHaveClass('duration-200');
    });
  });

  describe('thumb styling', () => {
    it('debe tener shadow-lg en el thumb', () => {
      render(<ToggleSwitch checked={false} onChange={() => {}} />);
      const thumb = screen.getByRole('switch').querySelector('span');

      expect(thumb).toHaveClass('shadow-lg');
    });

    it('debe tener transform en el thumb', () => {
      render(<ToggleSwitch checked={false} onChange={() => {}} />);
      const thumb = screen.getByRole('switch').querySelector('span');

      expect(thumb).toHaveClass('transform');
    });
  });

  describe('tamaños de thumb', () => {
    it('debe tener thumb w-4 h-4 para tamaño sm', () => {
      render(<ToggleSwitch checked={false} onChange={() => {}} size="sm" />);
      const thumb = screen.getByRole('switch').querySelector('span');

      expect(thumb).toHaveClass('w-4');
      expect(thumb).toHaveClass('h-4');
    });

    it('debe tener thumb w-5 h-5 para tamaño md', () => {
      render(<ToggleSwitch checked={false} onChange={() => {}} size="md" />);
      const thumb = screen.getByRole('switch').querySelector('span');

      expect(thumb).toHaveClass('w-5');
      expect(thumb).toHaveClass('h-5');
    });

    it('debe tener thumb w-6 h-6 para tamaño lg', () => {
      render(<ToggleSwitch checked={false} onChange={() => {}} size="lg" />);
      const thumb = screen.getByRole('switch').querySelector('span');

      expect(thumb).toHaveClass('w-6');
      expect(thumb).toHaveClass('h-6');
    });
  });

  describe('cursor', () => {
    it('debe tener cursor-pointer cuando no está disabled', () => {
      render(<ToggleSwitch checked={false} onChange={() => {}} />);
      const toggle = screen.getByRole('switch');

      expect(toggle).toHaveClass('cursor-pointer');
    });
  });

  describe('layout', () => {
    it('debe ser inline-flex', () => {
      render(<ToggleSwitch checked={false} onChange={() => {}} />);
      const toggle = screen.getByRole('switch');

      expect(toggle).toHaveClass('inline-flex');
      expect(toggle).toHaveClass('items-center');
    });

    it('debe tener position relative', () => {
      render(<ToggleSwitch checked={false} onChange={() => {}} />);
      const toggle = screen.getByRole('switch');

      expect(toggle).toHaveClass('relative');
    });
  });

  describe('forma', () => {
    it('debe ser redondeado (rounded-full)', () => {
      render(<ToggleSwitch checked={false} onChange={() => {}} />);
      const toggle = screen.getByRole('switch');
      const thumb = toggle.querySelector('span');

      expect(toggle).toHaveClass('rounded-full');
      expect(thumb).toHaveClass('rounded-full');
    });
  });

  describe('múltiples interacciones', () => {
    it('debe permitir múltiples toggles consecutivos', () => {
      const handleChange = jest.fn();
      const { rerender } = render(<ToggleSwitch checked={false} onChange={handleChange} />);

      // Primera interacción
      fireEvent.click(screen.getByRole('switch'));
      expect(handleChange).toHaveBeenCalledWith(true);

      rerender(<ToggleSwitch checked={true} onChange={handleChange} />);

      // Segunda interacción
      fireEvent.click(screen.getByRole('switch'));
      expect(handleChange).toHaveBeenCalledWith(false);

      expect(handleChange).toHaveBeenCalledTimes(2);
    });
  });
});
