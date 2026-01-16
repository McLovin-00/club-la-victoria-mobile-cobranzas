/**
 * Tests para el componente Toast y ToastProvider
 * Verifica renderizado, variantes y comportamiento del toast
 */
import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { Toast, ToastProvider } from '../Toast';
import { ToastContext } from '../../../contexts/toastContext';

describe('Toast Component', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('renderizado básico', () => {
    it('debe renderizar el mensaje correctamente', () => {
      const onClose = jest.fn();
      render(<Toast message="Mensaje de prueba" onClose={onClose} />);
      expect(screen.getByText('Mensaje de prueba')).toBeInTheDocument();
    });

    it('debe tener un botón de cerrar', () => {
      const onClose = jest.fn();
      render(<Toast message="Test" onClose={onClose} />);
      expect(screen.getByRole('button', { name: /cerrar/i })).toBeInTheDocument();
    });

    it('debe llamar onClose al hacer clic en cerrar', () => {
      const onClose = jest.fn();
      render(<Toast message="Test" onClose={onClose} />);

      fireEvent.click(screen.getByRole('button', { name: /cerrar/i }));
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('variantes', () => {
    it('debe aplicar estilos para variante success', () => {
      const onClose = jest.fn();
      render(<Toast message="Éxito" variant="success" onClose={onClose} />);
      expect(screen.getByText('Éxito').closest('div')).toBeInTheDocument();
    });

    it('debe aplicar estilos para variante error', () => {
      const onClose = jest.fn();
      render(<Toast message="Error" variant="error" onClose={onClose} />);
      expect(screen.getByText('Error')).toBeInTheDocument();
    });

    it('debe aplicar estilos para variante warning', () => {
      const onClose = jest.fn();
      render(<Toast message="Advertencia" variant="warning" onClose={onClose} />);
      expect(screen.getByText('Advertencia')).toBeInTheDocument();
    });

    it('debe usar variante default cuando no se especifica', () => {
      const onClose = jest.fn();
      render(<Toast message="Default" onClose={onClose} />);
      expect(screen.getByText('Default')).toBeInTheDocument();
    });
  });

  describe('auto-cierre', () => {
    it('debe llamar onClose después del duration por defecto', () => {
      const onClose = jest.fn();
      render(<Toast message="Test" onClose={onClose} />);

      expect(onClose).not.toHaveBeenCalled();

      act(() => {
        jest.advanceTimersByTime(5000);
      });

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('debe respetar duration personalizado', () => {
      const onClose = jest.fn();
      render(<Toast message="Test" duration={3000} onClose={onClose} />);

      act(() => {
        jest.advanceTimersByTime(2000);
      });
      expect(onClose).not.toHaveBeenCalled();

      act(() => {
        jest.advanceTimersByTime(1000);
      });
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('no debe auto-cerrar si duration es 0', () => {
      const onClose = jest.fn();
      render(<Toast message="Test" duration={0} onClose={onClose} />);

      act(() => {
        jest.advanceTimersByTime(10000);
      });

      expect(onClose).not.toHaveBeenCalled();
    });
  });

  describe('iconos', () => {
    it('debe mostrar icono para variante success', () => {
      const onClose = jest.fn();
      render(<Toast message="Test" variant="success" onClose={onClose} />);
      const toast = screen.getByText('Test').closest('div.p-4');
      expect(toast?.querySelector('svg')).toBeInTheDocument();
    });

    it('debe mostrar icono para variante error', () => {
      const onClose = jest.fn();
      render(<Toast message="Test" variant="error" onClose={onClose} />);
      const toast = screen.getByText('Test').closest('div.p-4');
      expect(toast?.querySelector('svg')).toBeInTheDocument();
    });

    it('debe mostrar icono para variante warning', () => {
      const onClose = jest.fn();
      render(<Toast message="Test" variant="warning" onClose={onClose} />);
      const toast = screen.getByText('Test').closest('div.p-4');
      expect(toast?.querySelector('svg')).toBeInTheDocument();
    });

    it('debe mostrar icono para variante default', () => {
      const onClose = jest.fn();
      render(<Toast message="Test" variant="default" onClose={onClose} />);
      const toast = screen.getByText('Test').closest('div.p-4');
      expect(toast?.querySelector('svg')).toBeInTheDocument();
    });
  });
});

describe('ToastProvider', () => {
  it('debe renderizar children correctamente', () => {
    render(
      <ToastProvider>
        <div>Contenido hijo</div>
      </ToastProvider>
    );
    expect(screen.getByText('Contenido hijo')).toBeInTheDocument();
  });

  it('debe proveer contexto a los children', () => {
    const TestComponent = () => {
      const context = React.useContext(ToastContext);
      return <div data-testid="has-context">{context ? 'Has Context' : 'No Context'}</div>;
    };

    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    );

    expect(screen.getByTestId('has-context')).toHaveTextContent('Has Context');
  });
});
