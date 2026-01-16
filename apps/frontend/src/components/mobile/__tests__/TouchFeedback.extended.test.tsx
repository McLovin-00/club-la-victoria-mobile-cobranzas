/**
 * Tests extendidos para el componente TouchFeedback
 * Verifica feedback visual, háptico y ripple effect
 */
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { render, screen, fireEvent } from '@testing-library/react';
import { TouchFeedback } from '../TouchFeedback';

describe('TouchFeedback', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock de navigator.vibrate
    Object.defineProperty(navigator, 'vibrate', {
      value: jest.fn(),
      configurable: true,
      writable: true,
    });
  });

  describe('renderizado básico', () => {
    it('debe renderizar children correctamente', () => {
      render(
        <TouchFeedback>
          <button>Click me</button>
        </TouchFeedback>
      );
      expect(screen.getByRole('button', { name: 'Click me' })).toBeInTheDocument();
    });

    it('debe aplicar className adicional', () => {
      render(
        <TouchFeedback className="custom-class">
          <span>Content</span>
        </TouchFeedback>
      );
      expect(screen.getByText('Content').parentElement).toHaveClass('custom-class');
    });

    it('debe tener estilos base', () => {
      render(
        <TouchFeedback data-testid="touch-feedback">
          <span>Content</span>
        </TouchFeedback>
      );
      const container = screen.getByText('Content').parentElement;
      expect(container).toHaveClass('relative');
      expect(container).toHaveClass('overflow-hidden');
      expect(container).toHaveClass('cursor-pointer');
    });
  });

  describe('estado disabled', () => {
    it('debe aplicar estilos de disabled', () => {
      render(
        <TouchFeedback disabled>
          <span>Disabled</span>
        </TouchFeedback>
      );
      const container = screen.getByText('Disabled').parentElement;
      expect(container).toHaveClass('opacity-50');
      expect(container).toHaveClass('cursor-not-allowed');
      expect(container).toHaveClass('pointer-events-none');
    });

    it('no debe llamar onPress cuando está disabled', () => {
      const mockOnPress = jest.fn();
      render(
        <TouchFeedback disabled onPress={mockOnPress}>
          <span>Disabled</span>
        </TouchFeedback>
      );
      
      fireEvent.mouseDown(screen.getByText('Disabled').parentElement!);
      fireEvent.mouseUp(screen.getByText('Disabled').parentElement!);
      
      expect(mockOnPress).not.toHaveBeenCalled();
    });
  });

  describe('eventos de mouse', () => {
    it('debe llamar onPress al hacer mouseUp', () => {
      const mockOnPress = jest.fn();
      render(
        <TouchFeedback onPress={mockOnPress}>
          <span>Clickable</span>
        </TouchFeedback>
      );
      
      const container = screen.getByText('Clickable').parentElement!;
      fireEvent.mouseDown(container);
      fireEvent.mouseUp(container);
      
      expect(mockOnPress).toHaveBeenCalledTimes(1);
    });

    it('debe quitar estado pressed al mouseLeave', () => {
      render(
        <TouchFeedback scaleOnPress>
          <span>Content</span>
        </TouchFeedback>
      );
      
      const container = screen.getByText('Content').parentElement!;
      fireEvent.mouseDown(container);
      expect(container).toHaveClass('scale-95');
      
      fireEvent.mouseLeave(container);
      expect(container).not.toHaveClass('scale-95');
    });
  });

  describe('eventos de touch', () => {
    it('debe manejar touchStart y touchEnd', () => {
      const mockOnPress = jest.fn();
      render(
        <TouchFeedback onPress={mockOnPress}>
          <span>Touch me</span>
        </TouchFeedback>
      );
      
      const container = screen.getByText('Touch me').parentElement!;
      fireEvent.touchStart(container, { touches: [{ clientX: 0, clientY: 0 }] });
      fireEvent.touchEnd(container);
      
      expect(mockOnPress).toHaveBeenCalledTimes(1);
    });
  });

  describe('scaleOnPress', () => {
    it('debe aplicar escala cuando scaleOnPress es true', () => {
      render(
        <TouchFeedback scaleOnPress>
          <span>Scale</span>
        </TouchFeedback>
      );
      
      const container = screen.getByText('Scale').parentElement!;
      fireEvent.mouseDown(container);
      
      expect(container).toHaveClass('scale-95');
    });

    it('no debe aplicar escala cuando scaleOnPress es false', () => {
      render(
        <TouchFeedback scaleOnPress={false}>
          <span>No Scale</span>
        </TouchFeedback>
      );
      
      const container = screen.getByText('No Scale').parentElement!;
      fireEvent.mouseDown(container);
      
      expect(container).not.toHaveClass('scale-95');
    });
  });

  describe('haptic feedback', () => {
    it('debe llamar navigator.vibrate con intensidad light', () => {
      render(
        <TouchFeedback hapticFeedback="light">
          <span>Haptic</span>
        </TouchFeedback>
      );
      
      const container = screen.getByText('Haptic').parentElement!;
      fireEvent.touchStart(container, { touches: [{ clientX: 0, clientY: 0 }] });
      
      expect(navigator.vibrate).toHaveBeenCalledWith(10);
    });

    it('debe llamar navigator.vibrate con intensidad medium', () => {
      render(
        <TouchFeedback hapticFeedback="medium">
          <span>Haptic</span>
        </TouchFeedback>
      );
      
      const container = screen.getByText('Haptic').parentElement!;
      fireEvent.touchStart(container, { touches: [{ clientX: 0, clientY: 0 }] });
      
      expect(navigator.vibrate).toHaveBeenCalledWith(20);
    });

    it('debe llamar navigator.vibrate con intensidad heavy', () => {
      render(
        <TouchFeedback hapticFeedback="heavy">
          <span>Haptic</span>
        </TouchFeedback>
      );
      
      const container = screen.getByText('Haptic').parentElement!;
      fireEvent.touchStart(container, { touches: [{ clientX: 0, clientY: 0 }] });
      
      expect(navigator.vibrate).toHaveBeenCalledWith(30);
    });
  });

  describe('ripple effect', () => {
    it('debe crear ripple cuando rippleEffect es true', () => {
      jest.useFakeTimers();
      
      render(
        <TouchFeedback rippleEffect>
          <span>Ripple</span>
        </TouchFeedback>
      );
      
      const container = screen.getByText('Ripple').parentElement!;
      fireEvent.touchStart(container, { 
        touches: [{ clientX: 50, clientY: 50 }] 
      });
      
      // El ripple debe existir
      const rippleContainer = container.querySelector('.pointer-events-none');
      expect(rippleContainer).toBeInTheDocument();
      
      jest.useRealTimers();
    });
  });

  describe('pressed overlay', () => {
    it('debe mostrar overlay cuando está presionado', () => {
      render(
        <TouchFeedback scaleOnPress>
          <span>Overlay</span>
        </TouchFeedback>
      );
      
      const container = screen.getByText('Overlay').parentElement!;
      fireEvent.mouseDown(container);
      
      // Debe haber un overlay visible
      const overlay = container.querySelector('.bg-black\\/5');
      expect(overlay).toBeInTheDocument();
    });
  });
});

