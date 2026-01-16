/**
 * Tests para el componente Progress
 * Verifica renderizado de barra de progreso
 */
import { render } from '@testing-library/react';
import { Progress } from '../progress';

describe('Progress', () => {
  const getProgressBar = (container: HTMLElement) => {
    // El bar interno tiene clase `bg-primary` y es donde se setea `style.width`.
    const bar = container.querySelector('.bg-primary');
    expect(bar).not.toBeNull();
    return bar as HTMLElement;
  };

  describe('renderizado básico', () => {
    it('debe renderizar la barra de progreso', () => {
      const { container } = render(<Progress value={50} />);
      expect(container.firstChild).toBeInTheDocument();
    });

    it('debe aplicar className adicional', () => {
      const { container } = render(<Progress value={50} className="custom-class" />);
      expect(container.firstChild).toHaveClass('custom-class');
    });
  });

  describe('cálculo de porcentaje', () => {
    it('debe mostrar 0% para value=0', () => {
      const { container } = render(<Progress value={0} />);
      const bar = getProgressBar(container);
      expect(bar.style.width).toBe('0%');
    });

    it('debe mostrar 50% para value=50', () => {
      const { container } = render(<Progress value={50} />);
      const bar = getProgressBar(container);
      expect(bar.style.width).toBe('50%');
    });

    it('debe mostrar 100% para value=100', () => {
      const { container } = render(<Progress value={100} />);
      const bar = getProgressBar(container);
      expect(bar.style.width).toBe('100%');
    });

    it('debe limitar a 100% valores mayores', () => {
      const { container } = render(<Progress value={150} />);
      const bar = getProgressBar(container);
      expect(bar.style.width).toBe('100%');
    });

    it('debe limitar a 0% valores negativos', () => {
      const { container } = render(<Progress value={-10} />);
      const bar = getProgressBar(container);
      expect(bar.style.width).toBe('0%');
    });
  });

  describe('max personalizado', () => {
    it('debe calcular correctamente con max=200', () => {
      const { container } = render(<Progress value={100} max={200} />);
      const bar = getProgressBar(container);
      expect(bar.style.width).toBe('50%');
    });

    it('debe calcular correctamente con max=10', () => {
      const { container } = render(<Progress value={7} max={10} />);
      const bar = getProgressBar(container);
      expect(bar.style.width).toBe('70%');
    });

    it('debe usar max=100 por defecto', () => {
      const { container } = render(<Progress value={25} />);
      const bar = getProgressBar(container);
      expect(bar.style.width).toBe('25%');
    });
  });

  describe('estilos', () => {
    it('debe tener clases base del contenedor', () => {
      const { container } = render(<Progress value={50} />);
      const progressContainer = container.firstChild;
      expect(progressContainer).toHaveClass('w-full');
      expect(progressContainer).toHaveClass('rounded-full');
    });

    it('debe aplicar transición en la barra interna', () => {
      const { container } = render(<Progress value={50} />);
      const bar = getProgressBar(container);
      expect(bar).toHaveClass('transition-all');
    });
  });

  describe('valores decimales', () => {
    it('debe manejar valores decimales correctamente', () => {
      const { container } = render(<Progress value={33.33} />);
      const bar = getProgressBar(container);
      // El componente calcula el porcentaje, puede tener decimales (string con punto).
      expect(bar.style.width).toBe('33.33%');
    });
  });

  describe('casos límite', () => {
    it('debe manejar value=0 y max=0 sin errores', () => {
      // Evitar división por cero
      expect(() => {
        render(<Progress value={0} max={0} />);
      }).not.toThrow();
    });

    it('debe renderizar correctamente múltiples instancias', () => {
      const { container } = render(
        <div>
          <Progress value={25} />
          <Progress value={50} />
          <Progress value={75} />
        </div>
      );

      const progressContainers = container.querySelectorAll('.w-full.bg-gray-200.rounded-full.overflow-hidden');
      expect(progressContainers).toHaveLength(3);
    });
  });
});

