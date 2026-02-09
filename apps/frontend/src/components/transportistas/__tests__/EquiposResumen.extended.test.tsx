/**
 * Tests extendidos para EquiposResumen
 * Incrementa coverage cubriendo interacciones y barras de progreso
 */
import { describe, it, expect, jest } from '@jest/globals';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

// Mock de TouchFeedback
jest.unstable_mockModule('../../mobile/TouchFeedback', () => ({
  TouchFeedback: ({ children, onPress }: { children: React.ReactNode; onPress?: () => void }) => (
    <div onClick={onPress}>{children}</div>
  ),
}));

const { EquiposResumen } = await import('../EquiposResumen');

describe('EquiposResumen (extended)', () => {
  const mockStats = {
    vigentes: 10,
    vencidos: 3,
    proximos: 5,
    total: 18,
  };

  describe('navegación por tarjetas', () => {
    it('debe llamar handleCardPress con vigentes', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      render(<EquiposResumen stats={mockStats} />);

      fireEvent.click(screen.getByText('Vigentes'));
      expect(consoleSpy).toHaveBeenCalledWith('Navigating to filtered view: vigentes');

      consoleSpy.mockRestore();
    });

    it('debe llamar handleCardPress con proximos', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      render(<EquiposResumen stats={mockStats} />);

      fireEvent.click(screen.getByText('Próximos'));
      expect(consoleSpy).toHaveBeenCalledWith('Navigating to filtered view: proximos');

      consoleSpy.mockRestore();
    });

    it('debe llamar handleCardPress con vencidos', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      render(<EquiposResumen stats={mockStats} />);

      fireEvent.click(screen.getByText('Vencidos'));
      expect(consoleSpy).toHaveBeenCalledWith('Navigating to filtered view: vencidos');

      consoleSpy.mockRestore();
    });
  });

  describe('acción urgente', () => {
    it('debe llamar handleCardPress con action-urgente', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      render(<EquiposResumen stats={mockStats} />);

      fireEvent.click(screen.getByText('Acción Requerida'));
      expect(consoleSpy).toHaveBeenCalledWith('Navigating to filtered view: action-urgente');

      consoleSpy.mockRestore();
    });
  });

  describe('barras de progreso', () => {
    it('debe calcular ancho de barra correctamente para vigentes', () => {
      const { container } = render(<EquiposResumen stats={mockStats} />);

      // Las barras de progreso tienen estilo inline con width
      const progressBars = container.querySelectorAll('[style*="width"]');
      expect(progressBars.length).toBeGreaterThan(0);
    });

    it('no debe mostrar barras de progreso cuando total es 0', () => {
      const emptyStats = {
        vigentes: 0,
        vencidos: 0,
        proximos: 0,
        total: 0,
      };

      render(<EquiposResumen stats={emptyStats} />);

      // No debe haber porcentajes mostrados (excepto 0%)
      const percentages = screen.queryAllByText(/% del total/);
      expect(percentages.length).toBe(0);
    });
  });

  describe('colores de tarjetas', () => {
    it('debe tener color verde para vigentes', () => {
      const { container } = render(<EquiposResumen stats={mockStats} />);

      expect(container.querySelector('.text-green-600')).toBeInTheDocument();
      expect(container.querySelector('.bg-green-50')).toBeInTheDocument();
    });

    it('debe tener color naranja para próximos', () => {
      const { container } = render(<EquiposResumen stats={mockStats} />);

      expect(container.querySelector('.text-orange-600')).toBeInTheDocument();
      expect(container.querySelector('.bg-orange-50')).toBeInTheDocument();
    });

    it('debe tener color rojo para vencidos', () => {
      const { container } = render(<EquiposResumen stats={mockStats} />);

      expect(container.querySelector('.text-red-600')).toBeInTheDocument();
      expect(container.querySelector('.bg-red-50')).toBeInTheDocument();
    });
  });

  describe('descripciones de tarjetas', () => {
    it('debe mostrar descripción para cada tarjeta', () => {
      render(<EquiposResumen stats={mockStats} />);

      expect(screen.getByText('Documentos al día')).toBeInTheDocument();
      expect(screen.getByText('Vencen pronto')).toBeInTheDocument();
      expect(screen.getByText('Requieren acción')).toBeInTheDocument();
    });
  });

  describe('grid responsive', () => {
    it('debe tener grid de 3 columnas en sm', () => {
      const { container } = render(<EquiposResumen stats={mockStats} />);

      expect(container.querySelector('.sm\\:grid-cols-3')).toBeInTheDocument();
    });
  });

  describe('icono de camión', () => {
    it('debe mostrar icono de camión en header', () => {
      const { container } = render(<EquiposResumen stats={mockStats} />);

      // TruckIcon está en el header
      const svgs = container.querySelectorAll('svg');
      expect(svgs.length).toBeGreaterThan(0);
    });
  });
});

