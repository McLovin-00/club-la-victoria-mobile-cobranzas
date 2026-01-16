/**
 * Tests extendidos para el componente PullToRefresh
 * Verifica gestos de pull, estados y animaciones
 */
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { PullToRefresh } from '../PullToRefresh';

describe('PullToRefresh', () => {
  const mockOnRefresh = jest.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('renderizado básico', () => {
    it('debe renderizar children correctamente', () => {
      render(
        <PullToRefresh onRefresh={mockOnRefresh}>
          <div>Contenido</div>
        </PullToRefresh>
      );
      expect(screen.getByText('Contenido')).toBeInTheDocument();
    });

    it('debe aplicar className adicional', () => {
      const { container } = render(
        <PullToRefresh onRefresh={mockOnRefresh} className="custom-class">
          <div>Content</div>
        </PullToRefresh>
      );
      expect(container.firstChild).toHaveClass('custom-class');
    });

    it('debe tener clases base de contenedor', () => {
      const { container } = render(
        <PullToRefresh onRefresh={mockOnRefresh}>
          <div>Content</div>
        </PullToRefresh>
      );
      expect(container.firstChild).toHaveClass('relative');
      expect(container.firstChild).toHaveClass('overflow-auto');
    });
  });

  describe('gesto de pull', () => {
    it('debe iniciar pull al hacer touchStart en el top', () => {
      const { container } = render(
        <PullToRefresh onRefresh={mockOnRefresh}>
          <div>Content</div>
        </PullToRefresh>
      );

      const wrapper = container.firstChild as HTMLElement;
      
      fireEvent.touchStart(wrapper, {
        touches: [{ clientY: 0 }],
      });

      // El estado isPulling se activa internamente
      expect(wrapper).toBeInTheDocument();
    });

    it('debe mostrar indicador de refresh al hacer pull', () => {
      const { container } = render(
        <PullToRefresh onRefresh={mockOnRefresh} threshold={60}>
          <div>Content</div>
        </PullToRefresh>
      );

      const wrapper = container.firstChild as HTMLElement;
      
      fireEvent.touchStart(wrapper, {
        touches: [{ clientY: 0 }],
      });

      fireEvent.touchMove(wrapper, {
        touches: [{ clientY: 80 }],
      });

      // Debe mostrar algún indicador de pull
      expect(screen.getByText(/actualizar/i)).toBeInTheDocument();
    });

    it('debe llamar onRefresh cuando se supera el threshold', async () => {
      const { container } = render(
        <PullToRefresh onRefresh={mockOnRefresh} threshold={60}>
          <div>Content</div>
        </PullToRefresh>
      );

      const wrapper = container.firstChild as HTMLElement;
      
      fireEvent.touchStart(wrapper, {
        touches: [{ clientY: 0 }],
      });

      fireEvent.touchMove(wrapper, {
        touches: [{ clientY: 100 }],
      });

      fireEvent.touchEnd(wrapper);

      await waitFor(() => {
        expect(mockOnRefresh).toHaveBeenCalled();
      });
    });

    it('no debe llamar onRefresh si no se supera el threshold', async () => {
      const { container } = render(
        <PullToRefresh onRefresh={mockOnRefresh} threshold={100}>
          <div>Content</div>
        </PullToRefresh>
      );

      const wrapper = container.firstChild as HTMLElement;
      
      fireEvent.touchStart(wrapper, {
        touches: [{ clientY: 0 }],
      });

      fireEvent.touchMove(wrapper, {
        touches: [{ clientY: 50 }],
      });

      fireEvent.touchEnd(wrapper);

      // Dar tiempo para que se procese
      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect(mockOnRefresh).not.toHaveBeenCalled();
    });
  });

  describe('estado disabled', () => {
    it('no debe iniciar pull cuando está disabled', () => {
      const { container } = render(
        <PullToRefresh onRefresh={mockOnRefresh} disabled>
          <div>Content</div>
        </PullToRefresh>
      );

      const wrapper = container.firstChild as HTMLElement;
      
      fireEvent.touchStart(wrapper, {
        touches: [{ clientY: 0 }],
      });

      fireEvent.touchMove(wrapper, {
        touches: [{ clientY: 100 }],
      });

      fireEvent.touchEnd(wrapper);

      expect(mockOnRefresh).not.toHaveBeenCalled();
    });
  });

  describe('indicador de refresh', () => {
    it('debe mostrar "Tira para actualizar" al iniciar pull', () => {
      const { container } = render(
        <PullToRefresh onRefresh={mockOnRefresh} threshold={60}>
          <div>Content</div>
        </PullToRefresh>
      );

      const wrapper = container.firstChild as HTMLElement;
      
      fireEvent.touchStart(wrapper, {
        touches: [{ clientY: 0 }],
      });

      fireEvent.touchMove(wrapper, {
        touches: [{ clientY: 40 }],
      });

      expect(screen.getByText('Tira para actualizar')).toBeInTheDocument();
    });

    it('debe mostrar "Suelta para actualizar" cuando supera threshold', () => {
      const { container } = render(
        <PullToRefresh onRefresh={mockOnRefresh} threshold={60}>
          <div>Content</div>
        </PullToRefresh>
      );

      const wrapper = container.firstChild as HTMLElement;
      
      fireEvent.touchStart(wrapper, {
        touches: [{ clientY: 0 }],
      });

      fireEvent.touchMove(wrapper, {
        touches: [{ clientY: 80 }],
      });

      expect(screen.getByText('Suelta para actualizar')).toBeInTheDocument();
    });

    it('debe mostrar "Actualizando..." durante el refresh', async () => {
      const slowRefresh = jest.fn().mockImplementation(() => 
        new Promise(resolve => setTimeout(resolve, 500))
      );

      const { container } = render(
        <PullToRefresh onRefresh={slowRefresh} threshold={60}>
          <div>Content</div>
        </PullToRefresh>
      );

      const wrapper = container.firstChild as HTMLElement;
      
      fireEvent.touchStart(wrapper, {
        touches: [{ clientY: 0 }],
      });

      fireEvent.touchMove(wrapper, {
        touches: [{ clientY: 80 }],
      });

      fireEvent.touchEnd(wrapper);

      await waitFor(() => {
        expect(screen.getByText('Actualizando...')).toBeInTheDocument();
      });
    });
  });

  describe('manejo de errores', () => {
    it('debe manejar errores en onRefresh sin romper', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const errorRefresh = jest.fn().mockRejectedValue(new Error('Error de red'));

      const { container } = render(
        <PullToRefresh onRefresh={errorRefresh} threshold={60}>
          <div>Content</div>
        </PullToRefresh>
      );

      const wrapper = container.firstChild as HTMLElement;
      
      fireEvent.touchStart(wrapper, {
        touches: [{ clientY: 0 }],
      });

      fireEvent.touchMove(wrapper, {
        touches: [{ clientY: 80 }],
      });

      fireEvent.touchEnd(wrapper);

      await waitFor(() => {
        expect(errorRefresh).toHaveBeenCalled();
      });

      // El componente no debería romperse
      expect(screen.getByText('Content')).toBeInTheDocument();
      
      consoleSpy.mockRestore();
    });
  });

  describe('threshold personalizado', () => {
    it('debe respetar threshold personalizado', async () => {
      const { container } = render(
        <PullToRefresh onRefresh={mockOnRefresh} threshold={120}>
          <div>Content</div>
        </PullToRefresh>
      );

      const wrapper = container.firstChild as HTMLElement;
      
      fireEvent.touchStart(wrapper, {
        touches: [{ clientY: 0 }],
      });

      // Pull de 100px, menos que threshold de 120
      fireEvent.touchMove(wrapper, {
        touches: [{ clientY: 100 }],
      });

      fireEvent.touchEnd(wrapper);

      // No debería disparar refresh
      await new Promise(resolve => setTimeout(resolve, 100));
      expect(mockOnRefresh).not.toHaveBeenCalled();
    });
  });
});

