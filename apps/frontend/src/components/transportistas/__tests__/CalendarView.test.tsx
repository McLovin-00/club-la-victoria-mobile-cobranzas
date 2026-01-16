/**
 * Tests para el componente CalendarView
 * Verifica renderizado del calendario, navegación y eventos
 */
import { describe, it, expect, jest } from '@jest/globals';
import { render, screen, fireEvent } from '@testing-library/react';
import { CalendarView, CalendarEvent } from '../CalendarView';

// Mock de TouchFeedback
jest.mock('@/components/mobile/TouchFeedback', () => ({
  TouchFeedback: ({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) => (
    <div onClick={onClick}>{children}</div>
  ),
}));

describe('CalendarView', () => {
  const mockEvents: CalendarEvent[] = [
    {
      id: '1',
      equipoId: 'equipo-1',
      equipoNombre: 'Camión ABC123',
      documentoTipo: 'VTV',
      fechaVencimiento: new Date(),
      estado: 'proximo',
      prioridad: 'alta',
      diasRestantes: 5,
    },
    {
      id: '2',
      equipoId: 'equipo-2',
      equipoNombre: 'Camión DEF456',
      documentoTipo: 'Seguro',
      fechaVencimiento: new Date(),
      estado: 'vigente',
      prioridad: 'baja',
      diasRestantes: 30,
    },
    {
      id: '3',
      equipoId: 'equipo-3',
      equipoNombre: 'Camión GHI789',
      documentoTipo: 'RUTA',
      fechaVencimiento: new Date(),
      estado: 'vencido',
      prioridad: 'alta',
      diasRestantes: -5,
    },
  ];

  const mockOnDateSelect = jest.fn();
  const mockOnEventClick = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('renderizado básico', () => {
    it('debe renderizar el calendario correctamente', () => {
      render(
        <CalendarView
          events={[]}
          selectedDate={new Date()}
          onDateSelect={mockOnDateSelect}
          onEventClick={mockOnEventClick}
        />
      );

      expect(screen.getByText(/Ir a hoy/i)).toBeInTheDocument();
    });

    it('debe mostrar los días de la semana', () => {
      render(
        <CalendarView
          events={[]}
          selectedDate={new Date()}
          onDateSelect={mockOnDateSelect}
          onEventClick={mockOnEventClick}
        />
      );

      expect(screen.getByText('Dom')).toBeInTheDocument();
      expect(screen.getByText('Lun')).toBeInTheDocument();
      expect(screen.getByText('Mar')).toBeInTheDocument();
      expect(screen.getByText('Mié')).toBeInTheDocument();
      expect(screen.getByText('Jue')).toBeInTheDocument();
      expect(screen.getByText('Vie')).toBeInTheDocument();
      expect(screen.getByText('Sáb')).toBeInTheDocument();
    });

    it('debe aplicar className adicional', () => {
      const { container } = render(
        <CalendarView
          events={[]}
          selectedDate={new Date()}
          onDateSelect={mockOnDateSelect}
          onEventClick={mockOnEventClick}
          className="custom-calendar"
        />
      );

      expect(container.firstChild).toHaveClass('custom-calendar');
    });
  });

  describe('eventos del día seleccionado', () => {
    it('debe mostrar eventos del día seleccionado', () => {
      render(
        <CalendarView
          events={mockEvents}
          selectedDate={new Date()}
          onDateSelect={mockOnDateSelect}
          onEventClick={mockOnEventClick}
        />
      );

      // Verifica que se muestran los nombres de equipos
      expect(screen.getByText('Camión ABC123')).toBeInTheDocument();
      expect(screen.getByText('Camión DEF456')).toBeInTheDocument();
    });

    it('debe mostrar mensaje cuando no hay eventos', () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 15);

      render(
        <CalendarView
          events={[]}
          selectedDate={tomorrow}
          onDateSelect={mockOnDateSelect}
          onEventClick={mockOnEventClick}
        />
      );

      expect(screen.getByText(/No hay eventos programados/i)).toBeInTheDocument();
    });

    it('debe llamar onEventClick al hacer clic en un evento', () => {
      render(
        <CalendarView
          events={mockEvents}
          selectedDate={new Date()}
          onDateSelect={mockOnDateSelect}
          onEventClick={mockOnEventClick}
        />
      );

      fireEvent.click(screen.getByText('Camión ABC123'));
      expect(mockOnEventClick).toHaveBeenCalled();
    });
  });

  describe('navegación', () => {
    it('debe renderizar botones de navegación', () => {
      render(
        <CalendarView
          events={[]}
          selectedDate={new Date()}
          onDateSelect={mockOnDateSelect}
          onEventClick={mockOnEventClick}
        />
      );

      // Buscar botones por SVG icons o por texto alternativo
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('indicadores de eventos', () => {
    it('debe mostrar badges de prioridad', () => {
      render(
        <CalendarView
          events={mockEvents}
          selectedDate={new Date()}
          onDateSelect={mockOnDateSelect}
          onEventClick={mockOnEventClick}
        />
      );

      // Verifica que hay badges de prioridad
      const highPriorityBadges = screen.getAllByText('alta');
      expect(highPriorityBadges.length).toBeGreaterThan(0);
      expect(screen.getByText('baja')).toBeInTheDocument();
    });
  });

  describe('sin fecha seleccionada', () => {
    it('no debe mostrar sección de eventos cuando no hay fecha seleccionada', () => {
      render(
        <CalendarView
          events={mockEvents}
          selectedDate={null}
          onDateSelect={mockOnDateSelect}
          onEventClick={mockOnEventClick}
        />
      );

      // No debería mostrar el listado de eventos del día
      expect(screen.queryByText('Camión ABC123')).not.toBeInTheDocument();
    });
  });
});

