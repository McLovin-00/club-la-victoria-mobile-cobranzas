/**
 * Tests para el componente TouchFeedback
 * Verifica el feedback visual y háptico para interacciones táctiles
 */
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TouchFeedback } from '../TouchFeedback';

// Mock de navigator.vibrate
const mockVibrate = jest.fn();
Object.defineProperty(navigator, 'vibrate', {
  value: mockVibrate,
  writable: true,
});

describe('TouchFeedback', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('renderizado básico', () => {
    it('debe renderizar los children correctamente', () => {
      render(
        <TouchFeedback>
          <button>Contenido hijo</button>
        </TouchFeedback>
      );

      expect(screen.getByRole('button')).toBeInTheDocument();
      expect(screen.getByText('Contenido hijo')).toBeInTheDocument();
    });

    it('debe aplicar className adicional', () => {
      const { container } = render(
        <TouchFeedback className="custom-class" data-testid="touch-feedback">
          <span>Test</span>
        </TouchFeedback>
      );

      const wrapper = container.firstElementChild as HTMLElement;
      expect(wrapper).toHaveClass('custom-class');
    });

    it('debe tener clases base de interacción', () => {
      const { container } = render(
        <TouchFeedback data-testid="touch-feedback">
          <span>Test</span>
        </TouchFeedback>
      );

      const wrapper = container.firstElementChild as HTMLElement;
      expect(wrapper).toHaveClass('relative');
      expect(wrapper).toHaveClass('cursor-pointer');
    });
  });

  describe('estado disabled', () => {
    it('debe aplicar estilos de disabled', () => {
      const { container } = render(
        <TouchFeedback disabled data-testid="touch-feedback">
          <span>Test</span>
        </TouchFeedback>
      );

      const wrapper = container.firstElementChild as HTMLElement;
      expect(wrapper).toHaveClass('opacity-50');
      expect(wrapper).toHaveClass('cursor-not-allowed');
    });

    it('no debe llamar onPress cuando está disabled', () => {
      const handlePress = jest.fn();

      const { container } = render(
        <TouchFeedback disabled onPress={handlePress} data-testid="touch-feedback">
          <span>Test</span>
        </TouchFeedback>
      );

      const wrapper = container.firstElementChild as HTMLElement;
      fireEvent.mouseDown(wrapper);
      fireEvent.mouseUp(wrapper);

      expect(handlePress).not.toHaveBeenCalled();
    });

    it('no debe activar vibración cuando está disabled', () => {
      const { container } = render(
        <TouchFeedback disabled hapticFeedback="medium" data-testid="touch-feedback">
          <span>Test</span>
        </TouchFeedback>
      );

      const wrapper = container.firstElementChild as HTMLElement;
      fireEvent.touchStart(wrapper, { touches: [{ clientX: 0, clientY: 0 }] });

      expect(mockVibrate).not.toHaveBeenCalled();
    });
  });

  describe('interacción con mouse', () => {
    it('debe llamar onPress al hacer click (mouseUp)', () => {
      const handlePress = jest.fn();

      const { container } = render(
        <TouchFeedback onPress={handlePress} data-testid="touch-feedback">
          <span>Test</span>
        </TouchFeedback>
      );

      const wrapper = container.firstElementChild as HTMLElement;
      fireEvent.mouseDown(wrapper);
      fireEvent.mouseUp(wrapper);

      expect(handlePress).toHaveBeenCalledTimes(1);
    });

    it('debe aplicar escala cuando scaleOnPress=true y se presiona', () => {
      const { container } = render(
        <TouchFeedback scaleOnPress data-testid="touch-feedback">
          <span>Test</span>
        </TouchFeedback>
      );

      const wrapper = container.firstElementChild as HTMLElement;

      fireEvent.mouseDown(wrapper);
      expect(wrapper).toHaveClass('scale-95');

      fireEvent.mouseUp(wrapper);
      expect(wrapper).not.toHaveClass('scale-95');
    });

    it('debe resetear estado pressed al salir con mouse (mouseLeave)', () => {
      const { container } = render(
        <TouchFeedback scaleOnPress data-testid="touch-feedback">
          <span>Test</span>
        </TouchFeedback>
      );

      const wrapper = container.firstElementChild as HTMLElement;

      fireEvent.mouseDown(wrapper);
      expect(wrapper).toHaveClass('scale-95');

      fireEvent.mouseLeave(wrapper);
      expect(wrapper).not.toHaveClass('scale-95');
    });
  });

  describe('interacción táctil', () => {
    it('debe llamar onPress en touchEnd', () => {
      const handlePress = jest.fn();

      const { container } = render(
        <TouchFeedback onPress={handlePress} data-testid="touch-feedback">
          <span>Test</span>
        </TouchFeedback>
      );

      const wrapper = container.firstElementChild as HTMLElement;
      fireEvent.touchStart(wrapper, { touches: [{ clientX: 50, clientY: 50 }] });
      fireEvent.touchEnd(wrapper);

      expect(handlePress).toHaveBeenCalledTimes(1);
    });

    it('debe activar feedback háptico light en touchStart', () => {
      const { container } = render(
        <TouchFeedback hapticFeedback="light" data-testid="touch-feedback">
          <span>Test</span>
        </TouchFeedback>
      );

      const wrapper = container.firstElementChild as HTMLElement;
      fireEvent.touchStart(wrapper, { touches: [{ clientX: 50, clientY: 50 }] });

      expect(mockVibrate).toHaveBeenCalledWith(10);
    });

    it('debe activar feedback háptico medium en touchStart', () => {
      const { container } = render(
        <TouchFeedback hapticFeedback="medium" data-testid="touch-feedback">
          <span>Test</span>
        </TouchFeedback>
      );

      const wrapper = container.firstElementChild as HTMLElement;
      fireEvent.touchStart(wrapper, { touches: [{ clientX: 50, clientY: 50 }] });

      expect(mockVibrate).toHaveBeenCalledWith(20);
    });

    it('debe activar feedback háptico heavy en touchStart', () => {
      const { container } = render(
        <TouchFeedback hapticFeedback="heavy" data-testid="touch-feedback">
          <span>Test</span>
        </TouchFeedback>
      );

      const wrapper = container.firstElementChild as HTMLElement;
      fireEvent.touchStart(wrapper, { touches: [{ clientX: 50, clientY: 50 }] });

      expect(mockVibrate).toHaveBeenCalledWith(30);
    });
  });

  describe('efecto ripple', () => {
    it('debe crear ripple en touchStart cuando rippleEffect=true', async () => {
      const { container } = render(
        <TouchFeedback rippleEffect data-testid="touch-feedback">
          <span>Test</span>
        </TouchFeedback>
      );

      const wrapper = container.firstElementChild as HTMLElement;

      fireEvent.touchStart(wrapper, { touches: [{ clientX: 50, clientY: 50 }] });

      // Verificar que se crea el contenedor de ripples
      const rippleContainer = wrapper.querySelector('.absolute.inset-0');
      expect(rippleContainer).toBeInTheDocument();
    });

    it('no debe crear ripple cuando rippleEffect=false', () => {
      const { container } = render(
        <TouchFeedback rippleEffect={false} data-testid="touch-feedback">
          <span>Test</span>
        </TouchFeedback>
      );

      const wrapper = container.firstElementChild as HTMLElement;
      fireEvent.touchStart(wrapper, { touches: [{ clientX: 50, clientY: 50 }] });

      // Verificar que NO existe el ripple específico (solo el overlay de pressed)
      const ripple = wrapper.querySelector('.animate-ping');
      expect(ripple).not.toBeInTheDocument();
    });

    it('debe remover ripple después de 600ms', async () => {
      jest.useFakeTimers();

      const { container } = render(
        <TouchFeedback rippleEffect data-testid="touch-feedback">
          <span>Test</span>
        </TouchFeedback>
      );

      const wrapper = container.firstElementChild as HTMLElement;
      fireEvent.touchStart(wrapper, { touches: [{ clientX: 50, clientY: 50 }] });

      // Avanzar el timer 600ms
      jest.advanceTimersByTime(600);

      await waitFor(() => {
        const ripple = wrapper.querySelector('.animate-ping');
        expect(ripple).not.toBeInTheDocument();
      });

      jest.useRealTimers();
    });
  });

  describe('overlay de pressed', () => {
    it('debe mostrar overlay cuando está presionado', () => {
      const { container } = render(
        <TouchFeedback scaleOnPress data-testid="touch-feedback">
          <span>Test</span>
        </TouchFeedback>
      );

      const wrapper = container.firstElementChild as HTMLElement;
      fireEvent.mouseDown(wrapper);

      const overlay = wrapper.querySelector('.bg-black\\/5');
      expect(overlay).toBeInTheDocument();
    });

    it('debe ocultar overlay cuando no está presionado', () => {
      const { container } = render(
        <TouchFeedback data-testid="touch-feedback">
          <span>Test</span>
        </TouchFeedback>
      );

      const wrapper = container.firstElementChild as HTMLElement;

      // Sin presionar, no debe haber overlay
      const overlay = wrapper.querySelector('.bg-black\\/5');
      expect(overlay).not.toBeInTheDocument();
    });
  });

  describe('estilos de accesibilidad', () => {
    it('debe tener WebkitTapHighlightColor transparent', () => {
      const { container } = render(
        <TouchFeedback data-testid="touch-feedback">
          <span>Test</span>
        </TouchFeedback>
      );

      const wrapper = container.firstElementChild as HTMLElement;
      expect(wrapper).toHaveStyle({ WebkitTapHighlightColor: 'transparent' });
    });

    it('debe tener touchAction manipulation', () => {
      const { container } = render(
        <TouchFeedback data-testid="touch-feedback">
          <span>Test</span>
        </TouchFeedback>
      );

      const wrapper = container.firstElementChild as HTMLElement;
      // `toHaveStyle` puede fallar con propiedades camelCase en JSDOM; verificamos el style directo.
      expect(wrapper.style.touchAction).toBe('manipulation');
    });

    it('debe tener clase select-none', () => {
      const { container } = render(
        <TouchFeedback data-testid="touch-feedback">
          <span>Test</span>
        </TouchFeedback>
      );

      const wrapper = container.firstElementChild as HTMLElement;
      expect(wrapper).toHaveClass('select-none');
    });
  });

  describe('comportamiento sin navigator.vibrate', () => {
    it('debe funcionar correctamente sin soporte de vibración', () => {
      // Temporalmente remover vibrate
      const originalVibrate = navigator.vibrate;
      Object.defineProperty(navigator, 'vibrate', {
        value: undefined,
        writable: true,
      });

      const handlePress = jest.fn();

      const { container } = render(
        <TouchFeedback hapticFeedback="medium" onPress={handlePress} data-testid="touch-feedback">
          <span>Test</span>
        </TouchFeedback>
      );

      const wrapper = container.firstElementChild as HTMLElement;

      // No debe fallar
      expect(() => {
        fireEvent.touchStart(wrapper, { touches: [{ clientX: 50, clientY: 50 }] });
        fireEvent.touchEnd(wrapper);
      }).not.toThrow();

      expect(handlePress).toHaveBeenCalled();

      // Restaurar
      Object.defineProperty(navigator, 'vibrate', {
        value: originalVibrate,
        writable: true,
      });
    });
  });
});

