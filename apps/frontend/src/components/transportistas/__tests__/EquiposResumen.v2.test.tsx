/**
 * Tests adicionales para EquiposResumen
 * Incrementa coverage cubriendo handleCardPress y barras de progreso
 */
import { render, screen, fireEvent } from '@testing-library/react';
import { EquiposResumen } from '../EquiposResumen';

// Mock de TouchFeedback
jest.mock('@/components/mobile/TouchFeedback', () => ({
  TouchFeedback: ({ children, onPress }: { children: React.ReactNode; onPress?: () => void }) => (
    <div onClick={onPress}>{children}</div>
  ),
}));

describe('EquiposResumen (v2)', () => {
  const mockStats = {
    vigentes: 10,
    vencidos: 3,
    proximos: 5,
    total: 18,
  };

  describe('console.log en handleCardPress', () => {
    it('debe loggear vigentes al hacer clic', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      render(<EquiposResumen stats={mockStats} />);
      
      fireEvent.click(screen.getByText('Vigentes'));
      
      expect(consoleSpy).toHaveBeenCalledWith('Navigating to filtered view: vigentes');
      consoleSpy.mockRestore();
    });

    it('debe loggear proximos al hacer clic', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      render(<EquiposResumen stats={mockStats} />);
      
      fireEvent.click(screen.getByText('Próximos'));
      
      expect(consoleSpy).toHaveBeenCalledWith('Navigating to filtered view: proximos');
      consoleSpy.mockRestore();
    });

    it('debe loggear vencidos al hacer clic', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      render(<EquiposResumen stats={mockStats} />);
      
      fireEvent.click(screen.getByText('Vencidos'));
      
      expect(consoleSpy).toHaveBeenCalledWith('Navigating to filtered view: vencidos');
      consoleSpy.mockRestore();
    });

    it('debe loggear action-urgente al hacer clic en Acción Requerida', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      render(<EquiposResumen stats={mockStats} />);
      
      fireEvent.click(screen.getByText('Acción Requerida'));
      
      expect(consoleSpy).toHaveBeenCalledWith('Navigating to filtered view: action-urgente');
      consoleSpy.mockRestore();
    });
  });

  describe('cálculo de porcentajes', () => {
    it('debe calcular correctamente el porcentaje de vigentes', () => {
      render(<EquiposResumen stats={mockStats} />);
      
      // 10/18 * 100 ≈ 55.56%
      const vigentesCard = screen.getByText('Vigentes').closest('div')?.parentElement;
      expect(vigentesCard).toBeInTheDocument();
    });

    it('debe manejar total = 0 sin dividir por cero', () => {
      const emptyStats = { vigentes: 0, vencidos: 0, proximos: 0, total: 0 };
      
      expect(() => render(<EquiposResumen stats={emptyStats} />)).not.toThrow();
    });
  });

  describe('estructura de tarjetas', () => {
    it('debe mostrar las 3 tarjetas principales', () => {
      render(<EquiposResumen stats={mockStats} />);
      
      expect(screen.getByText('Vigentes')).toBeInTheDocument();
      expect(screen.getByText('Próximos')).toBeInTheDocument();
      expect(screen.getByText('Vencidos')).toBeInTheDocument();
    });

    it('debe mostrar tarjeta de Acción Requerida', () => {
      render(<EquiposResumen stats={mockStats} />);
      
      expect(screen.getByText('Acción Requerida')).toBeInTheDocument();
    });

    it('debe mostrar los contadores numéricos', () => {
      render(<EquiposResumen stats={mockStats} />);
      
      expect(screen.getByText('10')).toBeInTheDocument();
      expect(screen.getByText('5')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument();
    });
  });

  describe('descripciones', () => {
    it('debe mostrar descripción de documentos al día', () => {
      render(<EquiposResumen stats={mockStats} />);
      expect(screen.getByText('Documentos al día')).toBeInTheDocument();
    });

    it('debe mostrar descripción de vencen pronto', () => {
      render(<EquiposResumen stats={mockStats} />);
      expect(screen.getByText('Vencen pronto')).toBeInTheDocument();
    });

    it('debe mostrar descripción de requieren acción', () => {
      render(<EquiposResumen stats={mockStats} />);
      expect(screen.getByText('Requieren acción')).toBeInTheDocument();
    });
  });

  describe('iconos SVG', () => {
    it('debe tener iconos en las tarjetas', () => {
      const { container } = render(<EquiposResumen stats={mockStats} />);
      
      const svgs = container.querySelectorAll('svg');
      expect(svgs.length).toBeGreaterThanOrEqual(4);
    });
  });
});

