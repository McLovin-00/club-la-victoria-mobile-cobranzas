/**
 * Tests para el componente CalendarFilters
 * Verifica renderizado y comportamiento del panel de filtros
 */
import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { render, screen, fireEvent } from '@testing-library/react';
import { CalendarFilters } from '../CalendarFilters';
import type { CalendarFilters as FiltersType } from '../../../hooks/useEventFilters';

// Mock de componentes
jest.mock('@/components/mobile/TouchFeedback', () => ({
  TouchFeedback: ({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) => (
    <div onClick={onClick}>{children}</div>
  ),
}));

describe('CalendarFilters', () => {
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

  describe('renderizado básico', () => {
    it('no debe renderizar nada cuando isOpen es false', () => {
      const { container } = render(
        <CalendarFilters
          isOpen={false}
          onClose={mockOnClose}
          filters={mockFilters}
          onFiltersChange={mockOnFiltersChange as any}
          equipoOptions={mockEquipoOptions}
          tipoDocumentoOptions={mockTipoDocumentoOptions}
        />
      );

      expect(container.firstChild).toBeNull();
    });

    it('debe renderizar cuando isOpen es true', () => {
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

      expect(screen.getByText('Filtros')).toBeInTheDocument();
    });

    it('debe mostrar sección de búsqueda', () => {
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

      expect(screen.getByText('Buscar')).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/Buscar por equipo/i)).toBeInTheDocument();
    });
  });

  describe('filtros rápidos', () => {
    it('debe mostrar presets de filtros rápidos', () => {
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

      expect(screen.getByText('Filtros rápidos')).toBeInTheDocument();
      expect(screen.getByText('Urgentes (7 días)')).toBeInTheDocument();
      expect(screen.getByText('Este mes')).toBeInTheDocument();
      expect(screen.getByText('Próximos 30 días')).toBeInTheDocument();
    });

    it('debe llamar applyUrgentPreset al hacer clic en preset urgente', () => {
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

      fireEvent.click(screen.getByText('Urgentes (7 días)'));
      expect(mockOnFiltersChange.applyUrgentPreset).toHaveBeenCalled();
    });
  });

  describe('toggles de opciones', () => {
    it('debe mostrar toggle de solo urgentes', () => {
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

      expect(screen.getByText('Solo urgentes')).toBeInTheDocument();
    });

    it('debe mostrar toggle de solo mis equipos', () => {
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

      expect(screen.getByText('Solo mis equipos')).toBeInTheDocument();
    });
  });

  describe('secciones de filtros', () => {
    it('debe mostrar sección de Estados', () => {
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

      expect(screen.getByText('Estados')).toBeInTheDocument();
      expect(screen.getByText('Vencido')).toBeInTheDocument();
      expect(screen.getByText('Próximo a vencer')).toBeInTheDocument();
      expect(screen.getByText('Vigente')).toBeInTheDocument();
    });

    it('debe mostrar sección de Prioridades', () => {
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

      expect(screen.getByText('Prioridades')).toBeInTheDocument();
      expect(screen.getByText('Alta')).toBeInTheDocument();
      expect(screen.getByText('Media')).toBeInTheDocument();
      expect(screen.getByText('Baja')).toBeInTheDocument();
    });

    it('debe mostrar sección de Equipos si hay opciones', () => {
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

      expect(screen.getByText('Equipos')).toBeInTheDocument();
      expect(screen.getByText('Camión 1')).toBeInTheDocument();
      expect(screen.getByText('Camión 2')).toBeInTheDocument();
    });

    it('debe mostrar sección de Tipos de documento si hay opciones', () => {
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

      expect(screen.getByText('Tipos de documento')).toBeInTheDocument();
      expect(screen.getByText('VTV')).toBeInTheDocument();
      expect(screen.getByText('Seguro')).toBeInTheDocument();
    });
  });

  describe('botones de acción', () => {
    it('debe mostrar botón de limpiar todo', () => {
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

      expect(screen.getByText('Limpiar todo')).toBeInTheDocument();
    });

    it('debe mostrar botón de aplicar filtros', () => {
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

      expect(screen.getByText('Aplicar filtros')).toBeInTheDocument();
    });

    it('debe llamar onClose al hacer clic en aplicar filtros', () => {
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

      fireEvent.click(screen.getByText('Aplicar filtros'));
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  describe('contador de filtros activos', () => {
    it('debe mostrar cantidad de filtros activos', () => {
      const activeFiltersChange = {
        ...mockOnFiltersChange,
        activeFiltersCount: 3,
      };

      render(
        <CalendarFilters
          isOpen={true}
          onClose={mockOnClose}
          filters={mockFilters}
          onFiltersChange={activeFiltersChange as any}
          equipoOptions={mockEquipoOptions}
          tipoDocumentoOptions={mockTipoDocumentoOptions}
        />
      );

      expect(screen.getByText(/3 filtros activos/i)).toBeInTheDocument();
    });
  });
});

