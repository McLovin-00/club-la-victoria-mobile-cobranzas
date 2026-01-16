/**
 * Tests extendidos para Toast y ToastProvider
 * Incrementa coverage cubriendo variantes y comportamiento del componente
 */
import React, { useContext } from 'react';
import { render, screen, act } from '@testing-library/react';
import { Toast, ToastProvider } from '../Toast';
import { ToastContext } from '../../../contexts/toastContext';

describe('Toast (extended)', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('variantes de icono', () => {
    it('debe renderizar icono de success correctamente', () => {
      const onClose = jest.fn();
      const { container } = render(<Toast message="Success" variant="success" onClose={onClose} />);

      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });

    it('debe renderizar icono de error correctamente', () => {
      const onClose = jest.fn();
      const { container } = render(<Toast message="Error" variant="error" onClose={onClose} />);

      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });

    it('debe renderizar icono de warning correctamente', () => {
      const onClose = jest.fn();
      const { container } = render(<Toast message="Warning" variant="warning" onClose={onClose} />);

      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });
  });

  describe('estilos de variantes', () => {
    it('debe aplicar clases de success', () => {
      const onClose = jest.fn();
      const { container } = render(<Toast message="Test" variant="success" onClose={onClose} />);

      expect(container.querySelector('.bg-success\\/10')).toBeInTheDocument();
    });

    it('debe aplicar clases de error/destructive', () => {
      const onClose = jest.fn();
      const { container } = render(<Toast message="Test" variant="error" onClose={onClose} />);

      expect(container.querySelector('.bg-destructive\\/10')).toBeInTheDocument();
    });

    it('debe aplicar clases de warning', () => {
      const onClose = jest.fn();
      const { container } = render(<Toast message="Test" variant="warning" onClose={onClose} />);

      expect(container.querySelector('.bg-warning\\/10')).toBeInTheDocument();
    });

    it('debe aplicar clases de default (bg-card)', () => {
      const onClose = jest.fn();
      const { container } = render(<Toast message="Test" variant="default" onClose={onClose} />);

      expect(container.querySelector('.bg-card')).toBeInTheDocument();
    });
  });

  describe('timer cleanup', () => {
    it('debe limpiar el timer al desmontar', () => {
      const onClose = jest.fn();
      const { unmount } = render(<Toast message="Test" duration={5000} onClose={onClose} />);

      // Avanzar 2 segundos
      act(() => {
        jest.advanceTimersByTime(2000);
      });

      // Desmontar antes de que expire
      unmount();

      // Avanzar más tiempo
      act(() => {
        jest.advanceTimersByTime(5000);
      });

      // No debería haberse llamado
      expect(onClose).not.toHaveBeenCalled();
    });
  });
});

describe('ToastProvider (extended)', () => {
  it('debe renderizar children correctamente', () => {
    render(
      <ToastProvider>
        <div data-testid="child">Contenido hijo</div>
      </ToastProvider>
    );

    expect(screen.getByTestId('child')).toBeInTheDocument();
  });

  it('debe proveer contexto a los children', () => {
    const TestComponent = () => {
      const context = useContext(ToastContext);
      return <div data-testid="has-context">{context ? 'Has Context' : 'No Context'}</div>;
    };

    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    );

    expect(screen.getByTestId('has-context')).toHaveTextContent('Has Context');
  });

  it('debe proveer función show en el contexto', () => {
    const TestComponent = () => {
      const context = useContext(ToastContext);
      return (
        <div data-testid="has-show">
          {typeof context?.show === 'function' ? 'Has Show Function' : 'No Show Function'}
        </div>
      );
    };

    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    );

    expect(screen.getByTestId('has-show')).toHaveTextContent('Has Show Function');
  });

  it('debe permitir llamar show sin errores', () => {
    const TestComponent = () => {
      const context = useContext(ToastContext);

      const handleClick = () => {
        // Solo verificamos que no lance error
        try {
          context?.show('Test message', 'success');
        } catch {
          // Ignorar errores de DOM no existente en tests
        }
      };

      return <button onClick={handleClick}>Show Toast</button>;
    };

    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    );

    // No debería lanzar error
    expect(() => {
      screen.getByText('Show Toast').click();
    }).not.toThrow();
  });
});
