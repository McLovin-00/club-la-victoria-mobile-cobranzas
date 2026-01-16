/**
 * Tests para el componente DashboardCumplimiento
 * Verifica renderizado del dashboard y estados de carga
 */
import { describe, it, expect, beforeAll, beforeEach, jest } from '@jest/globals';
import { render, screen } from '@testing-library/react';

describe('DashboardCumplimiento', () => {
  let useEquipoStatsResult: any = {};
  let DashboardCumplimiento: React.FC<{ className?: string }>;

  beforeAll(async () => {
    // Mock de hooks
    await jest.unstable_mockModule('../../../hooks/useEquipoStats', () => ({
      useEquipoStats: () => useEquipoStatsResult,
    }));

    // Mock de componentes hijos
    await jest.unstable_mockModule('../EstadoGeneral', () => ({
      EstadoGeneral: ({ stats }: any) => <div data-testid="estado-general">EstadoGeneral: {stats?.total}</div>,
    }));

    await jest.unstable_mockModule('../EquiposResumen', () => ({
      EquiposResumen: ({ stats }: any) => <div data-testid="equipos-resumen">EquiposResumen: {stats?.total}</div>,
    }));

    await jest.unstable_mockModule('../AlertasUrgentes', () => ({
      AlertasUrgentes: ({ alertas }: any) => <div data-testid="alertas-urgentes">AlertasUrgentes: {alertas?.length || 0}</div>,
    }));

    await jest.unstable_mockModule('../AccionesRapidas', () => ({
      AccionesRapidas: () => <div data-testid="acciones-rapidas">AccionesRapidas</div>,
    }));

    await jest.unstable_mockModule('../../mobile/PullToRefresh', () => ({
      PullToRefresh: ({ children, onRefresh, className }: any) => (
        <div data-testid="pull-to-refresh" className={className}>{children}</div>
      ),
    }));

    ({ DashboardCumplimiento } = await import('../DashboardCumplimiento'));
  });

  beforeEach(() => {
    useEquipoStatsResult = {
      stats: {
        total: 15,
        vigentes: 10,
        vencidos: 2,
        proximos: 3,
      },
      alertas: [
        { id: '1', message: 'Alerta 1' },
        { id: '2', message: 'Alerta 2' },
      ],
      isLoading: false,
      refetch: jest.fn(),
    };
  });

  describe('renderizado cuando está cargado', () => {
    it('debe renderizar el título del dashboard', () => {
      render(<DashboardCumplimiento />);
      expect(screen.getByText('Panel de Control')).toBeInTheDocument();
    });

    it('debe renderizar el subtítulo', () => {
      render(<DashboardCumplimiento />);
      expect(screen.getByText('Estado general de tus equipos')).toBeInTheDocument();
    });

    it('debe renderizar EstadoGeneral', () => {
      render(<DashboardCumplimiento />);
      expect(screen.getByTestId('estado-general')).toBeInTheDocument();
    });

    it('debe renderizar EquiposResumen', () => {
      render(<DashboardCumplimiento />);
      expect(screen.getByTestId('equipos-resumen')).toBeInTheDocument();
    });

    it('debe renderizar AlertasUrgentes', () => {
      render(<DashboardCumplimiento />);
      expect(screen.getByTestId('alertas-urgentes')).toBeInTheDocument();
    });

    it('debe renderizar AccionesRapidas', () => {
      render(<DashboardCumplimiento />);
      expect(screen.getByTestId('acciones-rapidas')).toBeInTheDocument();
    });

    it('debe renderizar PullToRefresh', () => {
      render(<DashboardCumplimiento />);
      expect(screen.getByTestId('pull-to-refresh')).toBeInTheDocument();
    });

    it('debe aplicar className adicional', () => {
      render(<DashboardCumplimiento className="custom-dashboard" />);
      expect(screen.getByTestId('pull-to-refresh')).toHaveClass('custom-dashboard');
    });
  });

  describe('estado de carga', () => {
    it('debe mostrar skeleton mientras carga', () => {
      useEquipoStatsResult = {
        ...useEquipoStatsResult,
        isLoading: true,
      };

      render(<DashboardCumplimiento />);
      
      // El skeleton tiene clases animate-pulse
      const { container } = render(<DashboardCumplimiento />);
      expect(container.querySelector('.animate-pulse')).toBeInTheDocument();
    });
  });

  describe('pasar datos a componentes hijos', () => {
    it('debe pasar stats a EstadoGeneral', () => {
      render(<DashboardCumplimiento />);
      expect(screen.getByTestId('estado-general')).toHaveTextContent('EstadoGeneral: 15');
    });

    it('debe pasar stats a EquiposResumen', () => {
      render(<DashboardCumplimiento />);
      expect(screen.getByTestId('equipos-resumen')).toHaveTextContent('EquiposResumen: 15');
    });

    it('debe pasar alertas a AlertasUrgentes', () => {
      render(<DashboardCumplimiento />);
      expect(screen.getByTestId('alertas-urgentes')).toHaveTextContent('AlertasUrgentes: 2');
    });
  });
});

