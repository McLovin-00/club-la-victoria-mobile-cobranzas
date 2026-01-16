/**
 * Tests para el componente EquiposResumen
 * Verifica renderizado de estadísticas y tarjetas
 */
import { describe, it, expect, jest } from '@jest/globals';
import { render, screen, fireEvent } from '@testing-library/react';
import { EquiposResumen } from '../EquiposResumen';

// Mock de TouchFeedback
jest.mock('@/components/mobile/TouchFeedback', () => ({
  TouchFeedback: ({ children, onPress }: { children: React.ReactNode; onPress?: () => void }) => (
    <div onClick={onPress}>{children}</div>
  ),
}));

describe('EquiposResumen', () => {
  const mockStats = {
    vigentes: 10,
    vencidos: 3,
    proximos: 5,
    total: 18,
  };

  describe('renderizado básico', () => {
    it('debe renderizar el título correctamente', () => {
      render(<EquiposResumen stats={mockStats} />);
      expect(screen.getByText('Estado de Documentos')).toBeInTheDocument();
    });

    it('debe mostrar el total de equipos', () => {
      render(<EquiposResumen stats={mockStats} />);
      expect(screen.getByText('18 total')).toBeInTheDocument();
    });
  });

  describe('tarjetas de estadísticas', () => {
    it('debe mostrar la tarjeta de vigentes', () => {
      render(<EquiposResumen stats={mockStats} />);
      expect(screen.getByText('Vigentes')).toBeInTheDocument();
      expect(screen.getByText('10')).toBeInTheDocument();
      expect(screen.getByText('Documentos al día')).toBeInTheDocument();
    });

    it('debe mostrar la tarjeta de próximos', () => {
      render(<EquiposResumen stats={mockStats} />);
      expect(screen.getByText('Próximos')).toBeInTheDocument();
      expect(screen.getByText('5')).toBeInTheDocument();
      expect(screen.getByText('Vencen pronto')).toBeInTheDocument();
    });

    it('debe mostrar la tarjeta de vencidos', () => {
      render(<EquiposResumen stats={mockStats} />);
      expect(screen.getByText('Vencidos')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument();
      expect(screen.getByText('Requieren acción')).toBeInTheDocument();
    });
  });

  describe('alerta de acción urgente', () => {
    it('debe mostrar alerta cuando hay documentos vencidos', () => {
      render(<EquiposResumen stats={mockStats} />);
      expect(screen.getByText('Acción Requerida')).toBeInTheDocument();
      expect(screen.getByText(/3 documentos vencidos/)).toBeInTheDocument();
      expect(screen.getByText('¡Urgente!')).toBeInTheDocument();
    });

    it('no debe mostrar alerta cuando no hay documentos vencidos', () => {
      const statsWithoutVencidos = {
        ...mockStats,
        vencidos: 0,
      };
      render(<EquiposResumen stats={statsWithoutVencidos} />);
      expect(screen.queryByText('Acción Requerida')).not.toBeInTheDocument();
    });

    it('debe usar singular cuando hay un solo documento vencido', () => {
      const statsWithOneVencido = {
        ...mockStats,
        vencidos: 1,
      };
      render(<EquiposResumen stats={statsWithOneVencido} />);
      expect(screen.getByText(/1 documento vencido/)).toBeInTheDocument();
    });
  });

  describe('barras de progreso', () => {
    it('debe mostrar barras de progreso cuando hay datos', () => {
      render(<EquiposResumen stats={mockStats} />);
      // Las barras de progreso muestran porcentajes
      expect(screen.getByText('56% del total')).toBeInTheDocument(); // 10/18
      expect(screen.getByText('28% del total')).toBeInTheDocument(); // 5/18
      expect(screen.getByText('17% del total')).toBeInTheDocument(); // 3/18
    });

    it('debe mostrar 0 cuando total es 0', () => {
      const emptyStats = {
        vigentes: 0,
        vencidos: 0,
        proximos: 0,
        total: 0,
      };
      render(<EquiposResumen stats={emptyStats} />);
      // El componente muestra los valores numéricos, no porcentajes
      expect(screen.getByText('0 total')).toBeInTheDocument();
    });
  });

  describe('valores por defecto', () => {
    it('debe manejar stats undefined', () => {
      render(<EquiposResumen stats={undefined as any} />);
      expect(screen.getByText('0 total')).toBeInTheDocument();
    });

    it('debe manejar valores faltantes en stats', () => {
      const partialStats = { total: 5 } as any;
      render(<EquiposResumen stats={partialStats} />);
      expect(screen.getByText('5 total')).toBeInTheDocument();
    });
  });

  describe('interacción', () => {
    it('debe renderizar tarjetas clickeables', () => {
      render(<EquiposResumen stats={mockStats} />);

      // Verificar que las tarjetas existen y son visibles
      expect(screen.getByText('Vigentes')).toBeInTheDocument();
      expect(screen.getByText('Próximos')).toBeInTheDocument();
      expect(screen.getByText('Vencidos')).toBeInTheDocument();
    });
  });
});
