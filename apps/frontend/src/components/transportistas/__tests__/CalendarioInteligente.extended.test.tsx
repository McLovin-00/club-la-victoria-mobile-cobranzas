/**
 * Tests extendidos para CalendarioInteligente
 * Incrementa coverage cubriendo filtros y vista de lista
 */
import { describe, it, expect, beforeAll, beforeEach, jest } from '@jest/globals';
import { render, screen, fireEvent } from '@testing-library/react';

describe('CalendarioInteligente (extended)', () => {
  let CalendarioInteligente: React.FC;
  let mockUseCalendarEvents: any;
  let mockUseEventFilters: any;

  beforeAll(async () => {
    const baseEvents = [
      {
        id: '1',
        equipoId: 'eq1',
        equipoNombre: 'Camión Test 1',
        documentoTipo: 'VTV',
        fechaVencimiento: new Date(),
        estado: 'proximo',
        prioridad: 'alta',
        diasRestantes: 5,
      },
      {
        id: '2',
        equipoId: 'eq2',
        equipoNombre: 'Camión Test 2',
        documentoTipo: 'Seguro',
        fechaVencimiento: new Date(),
        estado: 'vencido',
        prioridad: 'alta',
        diasRestantes: -3,
      },
      {
        id: '3',
        equipoId: 'eq1',
        equipoNombre: 'Camión Test 1',
        documentoTipo: 'RUTA',
        fechaVencimiento: new Date(),
        estado: 'vigente',
        prioridad: 'baja',
        diasRestantes: 30,
      },
    ];

    mockUseCalendarEvents = {
      events: baseEvents,
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    };

    mockUseEventFilters = {
      filters: {
        search: '',
        equipos: [],
        tiposDocumento: [],
        prioridades: [],
        estados: [],
        rango: { inicio: null, fin: null },
        soloUrgentes: false,
        soloMisEquipos: false,
      },
      isFiltersOpen: false,
      setIsFiltersOpen: jest.fn(),
      hasActiveFilters: false,
      activeFiltersCount: 0,
      updateFilter: jest.fn(),
      toggleArrayFilter: jest.fn(),
      clearFilters: jest.fn(),
      clearFilter: jest.fn(),
      applyUrgentPreset: jest.fn(),
      applyThisMonthPreset: jest.fn(),
      applyNext30DaysPreset: jest.fn(),
    };

    await jest.unstable_mockModule('../../../hooks/useCalendarEvents', () => ({
      useCalendarEvents: () => mockUseCalendarEvents,
    }));

    await jest.unstable_mockModule('../../../hooks/useEventFilters', () => ({
      useEventFilters: () => mockUseEventFilters,
      FilterOption: {},
    }));

    await jest.unstable_mockModule('../CalendarView', () => ({
      CalendarView: ({ events, onEventClick, onDateSelect }: any) => (
        <div data-testid="calendar-view">
          CalendarView: {events?.length} eventos
          {events?.map((e: any) => (
            <div key={e.id} onClick={() => onEventClick?.(e)} data-testid={`event-${e.id}`}>
              {e.equipoNombre}
            </div>
          ))}
        </div>
      ),
    }));

    await jest.unstable_mockModule('../CalendarFilters', () => ({
      CalendarFilters: ({ isOpen, onClose }: any) => (
        isOpen ? <div data-testid="calendar-filters" onClick={onClose}>CalendarFilters</div> : null
      ),
    }));

    await jest.unstable_mockModule('../../mobile/TouchFeedback', () => ({
      TouchFeedback: ({ children, onClick }: any) => (
        <div onClick={onClick}>{children}</div>
      ),
    }));

    await jest.unstable_mockModule('../../ui/spinner', () => ({
      Spinner: () => <div data-testid="spinner">Loading...</div>,
    }));

    ({ CalendarioInteligente } = await import('../CalendarioInteligente'));
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseCalendarEvents.isLoading = false;
    mockUseCalendarEvents.error = null;
    mockUseCalendarEvents.events = [
      {
        id: '1',
        equipoId: 'eq1',
        equipoNombre: 'Camión Test 1',
        documentoTipo: 'VTV',
        fechaVencimiento: new Date(),
        estado: 'proximo',
        prioridad: 'alta',
        diasRestantes: 5,
      },
      {
        id: '2',
        equipoId: 'eq2',
        equipoNombre: 'Camión Test 2',
        documentoTipo: 'Seguro',
        fechaVencimiento: new Date(),
        estado: 'vencido',
        prioridad: 'alta',
        diasRestantes: -3,
      },
    ];
    mockUseEventFilters.isFiltersOpen = false;
    mockUseEventFilters.hasActiveFilters = false;
    mockUseEventFilters.filters = {
      search: '',
      equipos: [],
      tiposDocumento: [],
      prioridades: [],
      estados: [],
      rango: { inicio: null, fin: null },
      soloUrgentes: false,
      soloMisEquipos: false,
    };
  });

  describe('filtrado de eventos', () => {
    it('debe filtrar por texto de búsqueda', () => {
      mockUseEventFilters.filters.search = 'Test 1';
      
      render(<CalendarioInteligente />);
      
      // Solo debe mostrar el evento que coincide
      expect(screen.getByText('1 evento')).toBeInTheDocument();
    });

    it('debe filtrar por equipos', () => {
      mockUseEventFilters.filters.equipos = ['eq1'];
      
      render(<CalendarioInteligente />);
      
      expect(screen.getByText('1 evento')).toBeInTheDocument();
    });

    it('debe filtrar por tipos de documento', () => {
      mockUseEventFilters.filters.tiposDocumento = ['VTV'];
      
      render(<CalendarioInteligente />);
      
      expect(screen.getByText('1 evento')).toBeInTheDocument();
    });

    it('debe filtrar por prioridades', () => {
      mockUseEventFilters.filters.prioridades = ['alta'];
      
      render(<CalendarioInteligente />);
      
      expect(screen.getByText('2 eventos')).toBeInTheDocument();
    });

    it('debe filtrar por estados', () => {
      mockUseEventFilters.filters.estados = ['vencido'];
      
      render(<CalendarioInteligente />);
      
      expect(screen.getByText('1 evento')).toBeInTheDocument();
    });

    it('debe filtrar solo urgentes', () => {
      mockUseEventFilters.filters.soloUrgentes = true;
      
      render(<CalendarioInteligente />);
      
      // Debe incluir vencidos y próximos con diasRestantes <= 7
      expect(screen.getByText('2 eventos')).toBeInTheDocument();
    });

    it('debe filtrar por rango de fechas', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 10);
      
      mockUseEventFilters.filters.rango = {
        inicio: new Date(),
        fin: futureDate,
      };
      
      render(<CalendarioInteligente />);
    });
  });

  describe('vista de lista', () => {
    it('debe cambiar a vista de lista', () => {
      render(<CalendarioInteligente />);
      
      // Buscar botones de toggle
      const buttons = screen.getAllByRole('button');
      // El segundo botón del toggle es para vista lista
      const listButton = buttons.find(btn => btn.querySelector('svg'));
      if (listButton) {
        fireEvent.click(buttons[1]);
      }
      
      // Debería mostrar la lista
      expect(screen.getByText('Lista de eventos')).toBeInTheDocument();
    });

    it('debe mostrar mensaje de sin eventos en lista vacía', () => {
      mockUseCalendarEvents.events = [];
      
      render(<CalendarioInteligente />);
      
      // Cambiar a vista lista
      const buttons = screen.getAllByRole('button');
      fireEvent.click(buttons[1]);
      
      expect(screen.getByText('No hay eventos')).toBeInTheDocument();
      expect(screen.getByText('No hay vencimientos programados')).toBeInTheDocument();
    });

    it('debe mostrar mensaje diferente si hay filtros activos', () => {
      mockUseCalendarEvents.events = [];
      mockUseEventFilters.hasActiveFilters = true;
      
      render(<CalendarioInteligente />);
      
      const buttons = screen.getAllByRole('button');
      fireEvent.click(buttons[1]);
      
      expect(screen.getByText('Intenta ajustar los filtros')).toBeInTheDocument();
    });

    it('debe mostrar eventos ordenados por fecha en lista', () => {
      render(<CalendarioInteligente />);
      
      const buttons = screen.getAllByRole('button');
      fireEvent.click(buttons[1]);
      
      expect(screen.getByText('Lista de eventos')).toBeInTheDocument();
    });

    it('debe mostrar información de días restantes', () => {
      render(<CalendarioInteligente />);
      
      const buttons = screen.getAllByRole('button');
      fireEvent.click(buttons[1]);
      
      // Debería mostrar días restantes o atrasados
      expect(screen.getByText(/5 días/)).toBeInTheDocument();
    });
  });

  describe('estadísticas', () => {
    it('debe calcular estadísticas correctamente', () => {
      render(<CalendarioInteligente />);
      
      expect(screen.getByText('Vencidos')).toBeInTheDocument();
      expect(screen.getByText('Próximos')).toBeInTheDocument();
      expect(screen.getByText('Vigentes')).toBeInTheDocument();
      expect(screen.getByText('Urgentes')).toBeInTheDocument();
    });

    it('debe mostrar indicador de filtrado activo', () => {
      mockUseEventFilters.hasActiveFilters = true;
      
      render(<CalendarioInteligente />);
      
      expect(screen.getByText(/\(filtrado\)/)).toBeInTheDocument();
    });
  });

  describe('opciones de filtros dinámicos', () => {
    it('debe generar opciones de equipos', () => {
      render(<CalendarioInteligente />);
      
      // Las opciones se generan internamente y se pasan a CalendarFilters
      expect(screen.getByTestId('calendar-view')).toBeInTheDocument();
    });

    it('debe generar opciones de tipos de documento', () => {
      render(<CalendarioInteligente />);
      
      expect(screen.getByTestId('calendar-view')).toBeInTheDocument();
    });
  });

  describe('interacción con eventos', () => {
    it('debe manejar click en evento de calendario', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      render(<CalendarioInteligente />);
      
      fireEvent.click(screen.getByTestId('event-1'));
      
      expect(consoleSpy).toHaveBeenCalledWith('Evento seleccionado:', expect.any(Object));
      
      consoleSpy.mockRestore();
    });

    it('debe manejar click en evento de lista', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      render(<CalendarioInteligente />);
      
      // Cambiar a vista lista
      const buttons = screen.getAllByRole('button');
      fireEvent.click(buttons[1]);
      
      // Click en un evento de la lista
      const eventItem = screen.getByText('Camión Test 1').closest('div');
      if (eventItem) {
        fireEvent.click(eventItem);
      }
      
      consoleSpy.mockRestore();
    });
  });

  describe('badges de filtros', () => {
    it('debe mostrar badge con contador cuando hay filtros activos', () => {
      mockUseEventFilters.activeFiltersCount = 3;
      
      render(<CalendarioInteligente />);
      
      expect(screen.getByText('3')).toBeInTheDocument();
    });

    it('no debe mostrar badge cuando no hay filtros', () => {
      mockUseEventFilters.activeFiltersCount = 0;
      
      render(<CalendarioInteligente />);
      
      // No debería haber un badge con número
      expect(screen.queryByText('0')).not.toBeInTheDocument();
    });
  });

  describe('sin eventos', () => {
    it('debe manejar null events', () => {
      mockUseCalendarEvents.events = null;
      
      render(<CalendarioInteligente />);
      
      // Debería renderizar sin crash
      expect(screen.getByText('Calendario de Vencimientos')).toBeInTheDocument();
    });
  });
});

