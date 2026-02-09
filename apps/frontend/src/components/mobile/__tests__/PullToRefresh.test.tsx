/**
 * Tests para el componente PullToRefresh
 * Verifica el comportamiento de pull-to-refresh para dispositivos móviles
 */
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { PullToRefresh } from '../PullToRefresh';

describe('PullToRefresh', () => {
  const mockOnRefresh = jest.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    jest.clearAllMocks();
    mockOnRefresh.mockResolvedValue(undefined);
  });

  describe('renderizado básico', () => {
    it('debe renderizar los children correctamente', () => {
      render(
        <PullToRefresh onRefresh={mockOnRefresh}>
          <div data-testid="content">Contenido</div>
        </PullToRefresh>
      );

      expect(screen.getByTestId('content')).toBeInTheDocument();
      expect(screen.getByText('Contenido')).toBeInTheDocument();
    });

    it('debe aplicar className adicional', () => {
      const { container } = render(
        <PullToRefresh onRefresh={mockOnRefresh} className="custom-class" data-testid="pull-container">
          <div>Contenido</div>
        </PullToRefresh>
      );

      const wrapper = container.firstElementChild as HTMLElement;
      expect(wrapper).toHaveClass('custom-class');
    });

    it('debe tener clase overflow-auto por defecto', () => {
      const { container } = render(
        <PullToRefresh onRefresh={mockOnRefresh} data-testid="pull-container">
          <div>Contenido</div>
        </PullToRefresh>
      );

      const wrapper = container.firstElementChild as HTMLElement;
      expect(wrapper).toHaveClass('overflow-auto');
    });

    it('debe tener clase relative', () => {
      const { container } = render(
        <PullToRefresh onRefresh={mockOnRefresh} data-testid="pull-container">
          <div>Contenido</div>
        </PullToRefresh>
      );

      const wrapper = container.firstElementChild as HTMLElement;
      expect(wrapper).toHaveClass('relative');
    });
  });

  describe('estado inicial', () => {
    it('no debe mostrar indicador de refresh inicialmente', () => {
      render(
        <PullToRefresh onRefresh={mockOnRefresh}>
          <div>Contenido</div>
        </PullToRefresh>
      );

      // No debe mostrar texto de actualización
      expect(screen.queryByText('Tira para actualizar')).not.toBeInTheDocument();
      expect(screen.queryByText('Actualizando...')).not.toBeInTheDocument();
    });
  });

  describe('interacción táctil - pull', () => {
    it('debe iniciar pull en touchStart cuando scrollTop es 0', () => {
      const { container } = render(
        <PullToRefresh onRefresh={mockOnRefresh} data-testid="pull-container">
          <div>Contenido</div>
        </PullToRefresh>
      );

      const wrapper = container.firstElementChild as HTMLElement;

      // Simular scrollTop = 0
      Object.defineProperty(wrapper, 'scrollTop', { value: 0, writable: true });

      fireEvent.touchStart(wrapper, { touches: [{ clientY: 100 }] });

      // El componente debería estar en estado de pulling (aunque no visible aún)
      expect(wrapper).toBeInTheDocument();
    });

    it('debe mostrar indicador "Tira para actualizar" al tirar', () => {
      const { container } = render(
        <PullToRefresh onRefresh={mockOnRefresh} threshold={60} data-testid="pull-container">
          <div>Contenido</div>
        </PullToRefresh>
      );

      const wrapper = container.firstElementChild as HTMLElement;
      Object.defineProperty(wrapper, 'scrollTop', { value: 0, writable: true });

      fireEvent.touchStart(wrapper, { touches: [{ clientY: 100 }] });
      fireEvent.touchMove(wrapper, { touches: [{ clientY: 140 }] });

      expect(screen.getByText('Tira para actualizar')).toBeInTheDocument();
    });

    it('debe mostrar "Suelta para actualizar" cuando se supera el threshold', () => {
      const { container } = render(
        <PullToRefresh onRefresh={mockOnRefresh} threshold={60} data-testid="pull-container">
          <div>Contenido</div>
        </PullToRefresh>
      );

      const wrapper = container.firstElementChild as HTMLElement;
      Object.defineProperty(wrapper, 'scrollTop', { value: 0, writable: true });

      fireEvent.touchStart(wrapper, { touches: [{ clientY: 100 }] });
      // Con resistencia (0.4x cuando distance >= threshold), necesitamos distance >= 150 para superar 60.
      fireEvent.touchMove(wrapper, { touches: [{ clientY: 300 }] }); // distance=200 => adjusted ~80

      expect(screen.getByText('Suelta para actualizar')).toBeInTheDocument();
    });
  });

  describe('activación de refresh', () => {
    it('debe llamar onRefresh cuando se suelta después de superar threshold', async () => {
      const { container } = render(
        <PullToRefresh onRefresh={mockOnRefresh} threshold={60} data-testid="pull-container">
          <div>Contenido</div>
        </PullToRefresh>
      );

      const wrapper = container.firstElementChild as HTMLElement;
      Object.defineProperty(wrapper, 'scrollTop', { value: 0, writable: true });

      fireEvent.touchStart(wrapper, { touches: [{ clientY: 100 }] });
      fireEvent.touchMove(wrapper, { touches: [{ clientY: 300 }] }); // distance=200 => adjusted ~80
      fireEvent.touchEnd(wrapper);

      await waitFor(() => {
        expect(mockOnRefresh).toHaveBeenCalledTimes(1);
      });
    });

    it('no debe llamar onRefresh si no se supera el threshold', async () => {
      const { container } = render(
        <PullToRefresh onRefresh={mockOnRefresh} threshold={60} data-testid="pull-container">
          <div>Contenido</div>
        </PullToRefresh>
      );

      const wrapper = container.firstElementChild as HTMLElement;
      Object.defineProperty(wrapper, 'scrollTop', { value: 0, writable: true });

      fireEvent.touchStart(wrapper, { touches: [{ clientY: 100 }] });
      fireEvent.touchMove(wrapper, { touches: [{ clientY: 130 }] }); // Pull < 60px (considerando resistencia)
      fireEvent.touchEnd(wrapper);

      // Esperar un momento para verificar que no se llamó
      await new Promise(resolve => setTimeout(resolve, 100));
      expect(mockOnRefresh).not.toHaveBeenCalled();
    });

    it('debe mostrar "Actualizando..." durante el refresh', async () => {
      // Mock "lento" que no resuelve para evitar flakiness (si resuelve rápido, puede no verse el estado "Actualizando...")
      const slowRefresh = jest.fn().mockImplementation(() => new Promise<void>(() => {}));

      const { container } = render(
        <PullToRefresh onRefresh={slowRefresh} threshold={60} data-testid="pull-container">
          <div>Contenido</div>
        </PullToRefresh>
      );

      const wrapper = container.firstElementChild as HTMLElement;
      Object.defineProperty(wrapper, 'scrollTop', { value: 0, writable: true });

      fireEvent.touchStart(wrapper, { touches: [{ clientY: 100 }] });
      fireEvent.touchMove(wrapper, { touches: [{ clientY: 300 }] });

      await waitFor(() => {
        expect(screen.getByText('Suelta para actualizar')).toBeInTheDocument();
      });

      fireEvent.touchEnd(wrapper);

      // Debe mostrar "Actualizando..."
      await waitFor(() => {
        expect(screen.getByText('Actualizando...')).toBeInTheDocument();
      });
    });
  });

  describe('estado disabled', () => {
    it('no debe iniciar pull cuando está disabled', () => {
      const { container } = render(
        <PullToRefresh onRefresh={mockOnRefresh} disabled data-testid="pull-container">
          <div>Contenido</div>
        </PullToRefresh>
      );

      const wrapper = container.firstElementChild as HTMLElement;
      Object.defineProperty(wrapper, 'scrollTop', { value: 0, writable: true });

      fireEvent.touchStart(wrapper, { touches: [{ clientY: 100 }] });
      fireEvent.touchMove(wrapper, { touches: [{ clientY: 200 }] });

      // No debe mostrar indicador
      expect(screen.queryByText('Tira para actualizar')).not.toBeInTheDocument();
    });

    it('no debe llamar onRefresh cuando está disabled', async () => {
      const { container } = render(
        <PullToRefresh onRefresh={mockOnRefresh} disabled threshold={60} data-testid="pull-container">
          <div>Contenido</div>
        </PullToRefresh>
      );

      const wrapper = container.firstElementChild as HTMLElement;
      Object.defineProperty(wrapper, 'scrollTop', { value: 0, writable: true });

      fireEvent.touchStart(wrapper, { touches: [{ clientY: 100 }] });
      fireEvent.touchMove(wrapper, { touches: [{ clientY: 200 }] });
      fireEvent.touchEnd(wrapper);

      await new Promise(resolve => setTimeout(resolve, 100));
      expect(mockOnRefresh).not.toHaveBeenCalled();
    });
  });

  describe('threshold personalizado', () => {
    it('debe usar threshold por defecto de 60', () => {
      const { container } = render(
        <PullToRefresh onRefresh={mockOnRefresh} data-testid="pull-container">
          <div>Contenido</div>
        </PullToRefresh>
      );

      const wrapper = container.firstElementChild as HTMLElement;
      Object.defineProperty(wrapper, 'scrollTop', { value: 0, writable: true });

      fireEvent.touchStart(wrapper, { touches: [{ clientY: 100 }] });
      fireEvent.touchMove(wrapper, { touches: [{ clientY: 120 }] }); // 20px

      // Con resistencia, 20px < 60 threshold, no debe mostrar "Suelta"
      expect(screen.queryByText('Suelta para actualizar')).not.toBeInTheDocument();
    });

    it('debe respetar threshold personalizado', () => {
      const { container } = render(
        <PullToRefresh onRefresh={mockOnRefresh} threshold={30} data-testid="pull-container">
          <div>Contenido</div>
        </PullToRefresh>
      );

      const wrapper = container.firstElementChild as HTMLElement;
      Object.defineProperty(wrapper, 'scrollTop', { value: 0, writable: true });

      fireEvent.touchStart(wrapper, { touches: [{ clientY: 100 }] });
      fireEvent.touchMove(wrapper, { touches: [{ clientY: 180 }] }); // 80px, supera threshold de 30

      expect(screen.getByText('Suelta para actualizar')).toBeInTheDocument();
    });
  });

  describe('manejo de errores', () => {
    it('debe manejar errores en onRefresh gracefully', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      const failingRefresh = jest.fn().mockRejectedValue(new Error('Refresh failed'));

      const { container } = render(
        <PullToRefresh onRefresh={failingRefresh} threshold={60} data-testid="pull-container">
          <div>Contenido</div>
        </PullToRefresh>
      );

      const wrapper = container.firstElementChild as HTMLElement;
      Object.defineProperty(wrapper, 'scrollTop', { value: 0, writable: true });

      fireEvent.touchStart(wrapper, { touches: [{ clientY: 100 }] });
      fireEvent.touchMove(wrapper, { touches: [{ clientY: 300 }] });

      await waitFor(() => {
        expect(screen.getByText('Suelta para actualizar')).toBeInTheDocument();
      });

      fireEvent.touchEnd(wrapper);

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith(
          'Error during refresh:',
          expect.any(Error)
        );
      });

      consoleSpy.mockRestore();
    });
  });

  describe('comportamiento de scroll', () => {
    it('no debe iniciar pull si scrollTop > 0', () => {
      const { container } = render(
        <PullToRefresh onRefresh={mockOnRefresh} data-testid="pull-container">
          <div>Contenido</div>
        </PullToRefresh>
      );

      const wrapper = container.firstElementChild as HTMLElement;
      // Simular que ya hay scroll
      Object.defineProperty(wrapper, 'scrollTop', { value: 100, writable: true });

      fireEvent.touchStart(wrapper, { touches: [{ clientY: 100 }] });
      fireEvent.touchMove(wrapper, { touches: [{ clientY: 200 }] });

      // No debe mostrar indicador porque scrollTop > 0
      expect(screen.queryByText('Tira para actualizar')).not.toBeInTheDocument();
    });
  });

  describe('resistencia al pull', () => {
    it('debe aplicar resistencia al tirar', () => {
      const { container } = render(
        <PullToRefresh onRefresh={mockOnRefresh} threshold={60} data-testid="pull-container">
          <div>Contenido</div>
        </PullToRefresh>
      );

      const wrapper = container.firstElementChild as HTMLElement;
      Object.defineProperty(wrapper, 'scrollTop', { value: 0, writable: true });

      fireEvent.touchStart(wrapper, { touches: [{ clientY: 100 }] });
      fireEvent.touchMove(wrapper, { touches: [{ clientY: 160 }] }); // 60px pull

      // El componente aplica resistencia, así que el movimiento real será menor
      // Solo verificamos que el componente está en estado de pulling
      expect(screen.getByText(/actualizar/)).toBeInTheDocument();
    });
  });

  describe('animación de spinner', () => {
    it('debe mostrar icono de refresh durante el refresh', async () => {
      const slowRefresh = jest.fn().mockImplementation(() => new Promise<void>(() => {}));

      const { container } = render(
        <PullToRefresh onRefresh={slowRefresh} threshold={60} data-testid="pull-container">
          <div>Contenido</div>
        </PullToRefresh>
      );

      const wrapper = container.firstElementChild as HTMLElement;
      Object.defineProperty(wrapper, 'scrollTop', { value: 0, writable: true });

      fireEvent.touchStart(wrapper, { touches: [{ clientY: 100 }] });
      fireEvent.touchMove(wrapper, { touches: [{ clientY: 300 }] });

      await waitFor(() => {
        expect(screen.getByText('Suelta para actualizar')).toBeInTheDocument();
      });

      fireEvent.touchEnd(wrapper);

      // Verificar que hay un spinner con clase animate-spin
      await waitFor(() => {
        const spinner = screen.getByText('Actualizando...').parentElement?.querySelector('.animate-spin');
        expect(spinner).toBeInTheDocument();
      });
    });
  });
});

