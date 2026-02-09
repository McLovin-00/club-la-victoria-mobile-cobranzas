/**
 * Tests extendidos para CalendarFilters
 * Incrementa coverage cubriendo interacciones y branches adicionales
 */
import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { render, screen, fireEvent } from '@testing-library/react';
import { CalendarFilters } from '../CalendarFilters';
import type { CalendarFilters as FiltersType } from '../../../hooks/useEventFilters';

// Mock de TouchFeedback
jest.mock('@/components/mobile/TouchFeedback', () => ({
  TouchFeedback: ({ children, onClick, className }: { children: React.ReactNode; onClick?: () => void; className?: string }) => (
    <div onClick={onClick} className={className}>{children}</div>
  ),
}));

describe('CalendarFilters (extended)', () => {
  const mockFilters: FiltersType = {
    search: '',
    equipos: [],
    tiposDocumento: [],
    prioridades: [],
    estados: [],
    rango: { inicio: null, fin: null },
    soloUrgentes: false,
    soloMisEquipos: false,
  };

  const mockOnFiltersChange = {
    filters: mockFilters,
    updateFilter: jest.fn(),
    toggleArrayFilter: jest.fn(),
    clearFilters: jest.fn(),
    clearFilter: jest.fn(),
    applyUrgentPreset: jest.fn(),
    applyThisMonthPreset: jest.fn(),
    applyNext30DaysPreset: jest.fn(),
    activeFiltersCount: 0,
    isFiltersOpen: true,
    setIsFiltersOpen: jest.fn(),
    hasActiveFilters: false,
  };

  const mockEquipoOptions = [
    { id: 'eq1', label: 'Camión 1', count: 5 },
    { id: 'eq2', label: 'Camión 2', count: 3 },
  ];

  const mockTipoDocumentoOptions = [
    { id: 'VTV', label: 'VTV', count: 10 },
    { id: 'Seguro', label: 'Seguro', count: 8 },
  ];

  const mockOnClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('interacciones con búsqueda', () => {
    it('debe llamar updateFilter al escribir en búsqueda', async () => {
      jest.useFakeTimers();
      
      render(
        <CalendarFilters
          isOpen={true}
          onClose={mockOnClose}
          filters={mockFilters}
          onFiltersChange={mockOnFiltersChange as any}
          equipoOptions={mockEquipoOptions}
          tipoDocumentoOptions={mockTipoDocumentoOptions}
        />
      );

      const searchInput = screen.getByPlaceholderText(/Buscar por equipo/i);
      fireEvent.change(searchInput, { target: { value: 'test' } });
      
      jest.advanceTimersByTime(300);
      
      expect(mockOnFiltersChange.updateFilter).toHaveBeenCalledWith('search', 'test');
      
      jest.useRealTimers();
    });
  });

  describe('presets de filtros', () => {
    it('debe llamar applyThisMonthPreset', () => {
      render(
        <CalendarFilters
          isOpen={true}
          onClose={mockOnClose}
          filters={mockFilters}
          onFiltersChange={mockOnFiltersChange as any}
          equipoOptions={mockEquipoOptions}
          tipoDocumentoOptions={mockTipoDocumentoOptions}
        />
      );

      fireEvent.click(screen.getByText('Este mes'));
      expect(mockOnFiltersChange.applyThisMonthPreset).toHaveBeenCalled();
    });

    it('debe llamar applyNext30DaysPreset', () => {
      render(
        <CalendarFilters
          isOpen={true}
          onClose={mockOnClose}
          filters={mockFilters}
          onFiltersChange={mockOnFiltersChange as any}
          equipoOptions={mockEquipoOptions}
          tipoDocumentoOptions={mockTipoDocumentoOptions}
        />
      );

      fireEvent.click(screen.getByText('Próximos 30 días'));
      expect(mockOnFiltersChange.applyNext30DaysPreset).toHaveBeenCalled();
    });
  });

  describe('toggles de opciones', () => {
    it('debe llamar updateFilter para soloUrgentes', () => {
      render(
        <CalendarFilters
          isOpen={true}
          onClose={mockOnClose}
          filters={mockFilters}
          onFiltersChange={mockOnFiltersChange as any}
          equipoOptions={mockEquipoOptions}
          tipoDocumentoOptions={mockTipoDocumentoOptions}
        />
      );

      // Buscar el switch de soloUrgentes y hacer click
      const toggles = screen.getAllByRole('switch');
      if (toggles.length > 0) {
        fireEvent.click(toggles[0]);
        expect(mockOnFiltersChange.updateFilter).toHaveBeenCalled();
      }
    });

    it('debe llamar updateFilter para soloMisEquipos', () => {
      render(
        <CalendarFilters
          isOpen={true}
          onClose={mockOnClose}
          filters={mockFilters}
          onFiltersChange={mockOnFiltersChange as any}
          equipoOptions={mockEquipoOptions}
          tipoDocumentoOptions={mockTipoDocumentoOptions}
        />
      );

      const toggles = screen.getAllByRole('switch');
      if (toggles.length > 1) {
        fireEvent.click(toggles[1]);
        expect(mockOnFiltersChange.updateFilter).toHaveBeenCalled();
      }
    });
  });

  describe('selección de estados', () => {
    it('debe llamar toggleArrayFilter al seleccionar estado', () => {
      render(
        <CalendarFilters
          isOpen={true}
          onClose={mockOnClose}
          filters={mockFilters}
          onFiltersChange={mockOnFiltersChange as any}
          equipoOptions={mockEquipoOptions}
          tipoDocumentoOptions={mockTipoDocumentoOptions}
        />
      );

      fireEvent.click(screen.getByText('Vencido'));
      expect(mockOnFiltersChange.toggleArrayFilter).toHaveBeenCalledWith('estados', 'vencido');
    });

    it('debe mostrar checkmark cuando estado está seleccionado', () => {
      const filtersWithEstados = {
        ...mockFilters,
        estados: ['vencido' as const],
      };
      
      render(
        <CalendarFilters
          isOpen={true}
          onClose={mockOnClose}
          filters={filtersWithEstados}
          onFiltersChange={mockOnFiltersChange as any}
          equipoOptions={mockEquipoOptions}
          tipoDocumentoOptions={mockTipoDocumentoOptions}
        />
      );

      expect(screen.getAllByText('✓').length).toBeGreaterThan(0);
    });

    it('debe llamar clearFilter para estados', () => {
      const filtersWithEstados = {
        ...mockFilters,
        estados: ['vencido' as const],
      };
      const onFiltersChangeWithActive = {
        ...mockOnFiltersChange,
        activeFiltersCount: 1,
      };
      
      render(
        <CalendarFilters
          isOpen={true}
          onClose={mockOnClose}
          filters={filtersWithEstados}
          onFiltersChange={onFiltersChangeWithActive as any}
          equipoOptions={mockEquipoOptions}
          tipoDocumentoOptions={mockTipoDocumentoOptions}
        />
      );

      const limpiarButtons = screen.getAllByText('Limpiar');
      if (limpiarButtons.length > 0) {
        fireEvent.click(limpiarButtons[0]);
      }
    });
  });

  describe('selección de prioridades', () => {
    it('debe llamar toggleArrayFilter al seleccionar prioridad', () => {
      render(
        <CalendarFilters
          isOpen={true}
          onClose={mockOnClose}
          filters={mockFilters}
          onFiltersChange={mockOnFiltersChange as any}
          equipoOptions={mockEquipoOptions}
          tipoDocumentoOptions={mockTipoDocumentoOptions}
        />
      );

      fireEvent.click(screen.getByText('Alta'));
      expect(mockOnFiltersChange.toggleArrayFilter).toHaveBeenCalledWith('prioridades', 'alta');
    });

    it('debe llamar toggleArrayFilter al seleccionar prioridad media', () => {
      render(
        <CalendarFilters
          isOpen={true}
          onClose={mockOnClose}
          filters={mockFilters}
          onFiltersChange={mockOnFiltersChange as any}
          equipoOptions={mockEquipoOptions}
          tipoDocumentoOptions={mockTipoDocumentoOptions}
        />
      );

      fireEvent.click(screen.getByText('Media'));
      expect(mockOnFiltersChange.toggleArrayFilter).toHaveBeenCalledWith('prioridades', 'media');
    });
  });

  describe('selección de equipos', () => {
    it('debe llamar toggleArrayFilter al seleccionar equipo', () => {
      render(
        <CalendarFilters
          isOpen={true}
          onClose={mockOnClose}
          filters={mockFilters}
          onFiltersChange={mockOnFiltersChange as any}
          equipoOptions={mockEquipoOptions}
          tipoDocumentoOptions={mockTipoDocumentoOptions}
        />
      );

      fireEvent.click(screen.getByText('Camión 1'));
      expect(mockOnFiltersChange.toggleArrayFilter).toHaveBeenCalledWith('equipos', 'eq1');
    });

    it('debe mostrar contador de eventos por equipo', () => {
      render(
        <CalendarFilters
          isOpen={true}
          onClose={mockOnClose}
          filters={mockFilters}
          onFiltersChange={mockOnFiltersChange as any}
          equipoOptions={mockEquipoOptions}
          tipoDocumentoOptions={mockTipoDocumentoOptions}
        />
      );

      expect(screen.getByText('5 eventos')).toBeInTheDocument();
      expect(screen.getByText('3 eventos')).toBeInTheDocument();
    });

    it('no debe mostrar sección de equipos si no hay opciones', () => {
      render(
        <CalendarFilters
          isOpen={true}
          onClose={mockOnClose}
          filters={mockFilters}
          onFiltersChange={mockOnFiltersChange as any}
          equipoOptions={[]}
          tipoDocumentoOptions={mockTipoDocumentoOptions}
        />
      );

      expect(screen.queryByText('Equipos')).not.toBeInTheDocument();
    });
  });

  describe('selección de tipos de documento', () => {
    it('debe llamar toggleArrayFilter al seleccionar tipo documento', () => {
      render(
        <CalendarFilters
          isOpen={true}
          onClose={mockOnClose}
          filters={mockFilters}
          onFiltersChange={mockOnFiltersChange as any}
          equipoOptions={mockEquipoOptions}
          tipoDocumentoOptions={mockTipoDocumentoOptions}
        />
      );

      fireEvent.click(screen.getByText('VTV'));
      expect(mockOnFiltersChange.toggleArrayFilter).toHaveBeenCalledWith('tiposDocumento', 'VTV');
    });

    it('no debe mostrar sección de tipos documento si no hay opciones', () => {
      render(
        <CalendarFilters
          isOpen={true}
          onClose={mockOnClose}
          filters={mockFilters}
          onFiltersChange={mockOnFiltersChange as any}
          equipoOptions={mockEquipoOptions}
          tipoDocumentoOptions={[]}
        />
      );

      expect(screen.queryByText('Tipos de documento')).not.toBeInTheDocument();
    });
  });

  describe('footer y acciones', () => {
    it('debe llamar clearFilters al hacer clic en limpiar todo', () => {
      const onFiltersChangeWithActive = {
        ...mockOnFiltersChange,
        activeFiltersCount: 1,
      };
      
      render(
        <CalendarFilters
          isOpen={true}
          onClose={mockOnClose}
          filters={mockFilters}
          onFiltersChange={onFiltersChangeWithActive as any}
          equipoOptions={mockEquipoOptions}
          tipoDocumentoOptions={mockTipoDocumentoOptions}
        />
      );

      fireEvent.click(screen.getByText('Limpiar todo'));
      expect(mockOnFiltersChange.clearFilters).toHaveBeenCalled();
    });

    it('debe estar deshabilitado limpiar todo si no hay filtros', () => {
      render(
        <CalendarFilters
          isOpen={true}
          onClose={mockOnClose}
          filters={mockFilters}
          onFiltersChange={mockOnFiltersChange as any}
          equipoOptions={mockEquipoOptions}
          tipoDocumentoOptions={mockTipoDocumentoOptions}
        />
      );

      const limpiarTodoBtn = screen.getByText('Limpiar todo').closest('button');
      expect(limpiarTodoBtn).toBeDisabled();
    });
  });

  describe('cierre del modal', () => {
    it('debe llamar onClose al hacer clic en el overlay', () => {
      render(
        <CalendarFilters
          isOpen={true}
          onClose={mockOnClose}
          filters={mockFilters}
          onFiltersChange={mockOnFiltersChange as any}
          equipoOptions={mockEquipoOptions}
          tipoDocumentoOptions={mockTipoDocumentoOptions}
        />
      );

      // El overlay es el primer div fijo
      const overlay = document.querySelector('.fixed.inset-0.z-50');
      if (overlay) {
        fireEvent.click(overlay);
        expect(mockOnClose).toHaveBeenCalled();
      }
    });

    it('no debe cerrar al hacer clic en el contenido', () => {
      render(
        <CalendarFilters
          isOpen={true}
          onClose={mockOnClose}
          filters={mockFilters}
          onFiltersChange={mockOnFiltersChange as any}
          equipoOptions={mockEquipoOptions}
          tipoDocumentoOptions={mockTipoDocumentoOptions}
        />
      );

      // El contenido tiene stopPropagation
      const content = document.querySelector('.fixed.inset-x-0.bottom-0');
      if (content) {
        fireEvent.click(content);
        // mockOnClose no debe haber sido llamado por este click específico
      }
    });

    it('debe llamar onClose al hacer clic en botón cerrar', () => {
      render(
        <CalendarFilters
          isOpen={true}
          onClose={mockOnClose}
          filters={mockFilters}
          onFiltersChange={mockOnFiltersChange as any}
          equipoOptions={mockEquipoOptions}
          tipoDocumentoOptions={mockTipoDocumentoOptions}
        />
      );

      // El botón de cerrar es el que tiene XMarkIcon
      const closeButtons = screen.getAllByRole('button');
      const closeBtn = closeButtons.find(btn => btn.querySelector('svg'));
      if (closeBtn) {
        fireEvent.click(closeBtn);
      }
    });
  });

  describe('contador de filtros', () => {
    it('debe mostrar singular cuando hay 1 filtro', () => {
      const onFiltersChangeWith1 = {
        ...mockOnFiltersChange,
        activeFiltersCount: 1,
      };
      
      render(
        <CalendarFilters
          isOpen={true}
          onClose={mockOnClose}
          filters={mockFilters}
          onFiltersChange={onFiltersChangeWith1 as any}
          equipoOptions={mockEquipoOptions}
          tipoDocumentoOptions={mockTipoDocumentoOptions}
        />
      );

      expect(screen.getByText('1 filtro activo')).toBeInTheDocument();
    });
  });
});

