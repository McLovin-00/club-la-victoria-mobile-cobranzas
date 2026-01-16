/**
 * Tests para el hook useEventFilters
 * Verifica la gestión de filtros del calendario
 */
import { renderHook, act } from '@testing-library/react';
import { useEventFilters } from '../useEventFilters';

describe('useEventFilters', () => {
  describe('estado inicial', () => {
    it('debe inicializar con filtros por defecto', () => {
      const { result } = renderHook(() => useEventFilters());

      expect(result.current.filters).toEqual({
        equipos: [],
        tiposDocumento: [],
        prioridades: [],
        estados: [],
        rango: { inicio: null, fin: null },
        search: '',
        soloUrgentes: false,
        soloMisEquipos: true,
      });
    });

    it('debe inicializar con isFiltersOpen en false', () => {
      const { result } = renderHook(() => useEventFilters());
      expect(result.current.isFiltersOpen).toBe(false);
    });

    it('debe inicializar hasActiveFilters en false', () => {
      const { result } = renderHook(() => useEventFilters());
      // soloMisEquipos es true por defecto, pero eso NO cuenta como "activo"
      // porque hasActiveFilters incluye !filters.soloMisEquipos
      expect(result.current.hasActiveFilters).toBe(false);
    });

    it('debe inicializar activeFiltersCount en 0', () => {
      const { result } = renderHook(() => useEventFilters());
      expect(result.current.activeFiltersCount).toBe(0);
    });
  });

  describe('updateFilter', () => {
    it('debe actualizar un filtro específico', () => {
      const { result } = renderHook(() => useEventFilters());

      act(() => {
        result.current.updateFilter('search', 'camion');
      });

      expect(result.current.filters.search).toBe('camion');
    });

    it('debe actualizar filtro booleano', () => {
      const { result } = renderHook(() => useEventFilters());

      act(() => {
        result.current.updateFilter('soloUrgentes', true);
      });

      expect(result.current.filters.soloUrgentes).toBe(true);
    });

    it('debe actualizar array de equipos', () => {
      const { result } = renderHook(() => useEventFilters());

      act(() => {
        result.current.updateFilter('equipos', ['equipo1', 'equipo2']);
      });

      expect(result.current.filters.equipos).toEqual(['equipo1', 'equipo2']);
    });

    it('debe actualizar rango de fechas', () => {
      const { result } = renderHook(() => useEventFilters());
      const inicio = new Date('2024-01-01');
      const fin = new Date('2024-01-31');

      act(() => {
        result.current.updateFilter('rango', { inicio, fin });
      });

      expect(result.current.filters.rango).toEqual({ inicio, fin });
    });
  });

  describe('toggleArrayFilter', () => {
    it('debe agregar valor a array vacío', () => {
      const { result } = renderHook(() => useEventFilters());

      act(() => {
        result.current.toggleArrayFilter('equipos', 'equipo1');
      });

      expect(result.current.filters.equipos).toContain('equipo1');
    });

    it('debe remover valor existente del array', () => {
      const { result } = renderHook(() => useEventFilters());

      act(() => {
        result.current.toggleArrayFilter('equipos', 'equipo1');
      });
      expect(result.current.filters.equipos).toContain('equipo1');

      act(() => {
        result.current.toggleArrayFilter('equipos', 'equipo1');
      });
      expect(result.current.filters.equipos).not.toContain('equipo1');
    });

    it('debe funcionar con prioridades', () => {
      const { result } = renderHook(() => useEventFilters());

      act(() => {
        result.current.toggleArrayFilter('prioridades', 'alta');
        result.current.toggleArrayFilter('prioridades', 'media');
      });

      expect(result.current.filters.prioridades).toEqual(['alta', 'media']);
    });

    it('debe funcionar con estados', () => {
      const { result } = renderHook(() => useEventFilters());

      act(() => {
        result.current.toggleArrayFilter('estados', 'vigente');
      });

      expect(result.current.filters.estados).toContain('vigente');
    });
  });

  describe('clearFilters', () => {
    it('debe resetear todos los filtros a valores iniciales', () => {
      const { result } = renderHook(() => useEventFilters());

      // Modificar varios filtros
      act(() => {
        result.current.updateFilter('search', 'test');
        result.current.updateFilter('soloUrgentes', true);
        result.current.toggleArrayFilter('equipos', 'equipo1');
      });

      // Limpiar
      act(() => {
        result.current.clearFilters();
      });

      expect(result.current.filters).toEqual({
        equipos: [],
        tiposDocumento: [],
        prioridades: [],
        estados: [],
        rango: { inicio: null, fin: null },
        search: '',
        soloUrgentes: false,
        soloMisEquipos: true,
      });
    });
  });

  describe('clearFilter', () => {
    it('debe limpiar solo el filtro específico', () => {
      const { result } = renderHook(() => useEventFilters());

      act(() => {
        result.current.updateFilter('search', 'test');
        result.current.updateFilter('soloUrgentes', true);
      });

      act(() => {
        result.current.clearFilter('search');
      });

      expect(result.current.filters.search).toBe('');
      expect(result.current.filters.soloUrgentes).toBe(true);
    });

    it('debe limpiar array de equipos', () => {
      const { result } = renderHook(() => useEventFilters());

      act(() => {
        result.current.toggleArrayFilter('equipos', 'equipo1');
        result.current.toggleArrayFilter('equipos', 'equipo2');
      });

      act(() => {
        result.current.clearFilter('equipos');
      });

      expect(result.current.filters.equipos).toEqual([]);
    });
  });

  describe('presets', () => {
    it('applyUrgentPreset debe configurar filtros para urgentes', () => {
      const { result } = renderHook(() => useEventFilters());

      act(() => {
        result.current.applyUrgentPreset();
      });

      expect(result.current.filters.soloUrgentes).toBe(true);
      expect(result.current.filters.estados).toEqual(['proximo', 'vencido']);
      expect(result.current.filters.rango.inicio).toBeInstanceOf(Date);
      expect(result.current.filters.rango.fin).toBeInstanceOf(Date);
    });

    it('applyThisMonthPreset debe configurar rango del mes actual', () => {
      const { result } = renderHook(() => useEventFilters());

      act(() => {
        result.current.applyThisMonthPreset();
      });

      expect(result.current.filters.rango.inicio).toBeInstanceOf(Date);
      expect(result.current.filters.rango.fin).toBeInstanceOf(Date);
      expect(result.current.filters.soloUrgentes).toBe(false);

      // Verificar que inicio es el primer día del mes
      const inicio = result.current.filters.rango.inicio!;
      expect(inicio.getDate()).toBe(1);
    });

    it('applyNext30DaysPreset debe configurar rango de 30 días', () => {
      const { result } = renderHook(() => useEventFilters());

      act(() => {
        result.current.applyNext30DaysPreset();
      });

      const inicio = result.current.filters.rango.inicio!;
      const fin = result.current.filters.rango.fin!;

      expect(inicio).toBeInstanceOf(Date);
      expect(fin).toBeInstanceOf(Date);
      expect(result.current.filters.soloUrgentes).toBe(false);

      // Verificar diferencia aproximada de 30 días
      const diffDays = Math.ceil((fin.getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24));
      expect(diffDays).toBe(30);
    });
  });

  describe('hasActiveFilters', () => {
    it('debe ser true cuando hay equipos seleccionados', () => {
      const { result } = renderHook(() => useEventFilters());

      act(() => {
        result.current.toggleArrayFilter('equipos', 'equipo1');
      });

      expect(result.current.hasActiveFilters).toBe(true);
    });

    it('debe ser true cuando hay búsqueda activa', () => {
      const { result } = renderHook(() => useEventFilters());

      act(() => {
        result.current.updateFilter('search', 'test');
      });

      expect(result.current.hasActiveFilters).toBe(true);
    });

    it('debe ser true cuando soloUrgentes está activo', () => {
      const { result } = renderHook(() => useEventFilters());

      act(() => {
        result.current.updateFilter('soloUrgentes', true);
      });

      expect(result.current.hasActiveFilters).toBe(true);
    });

    it('debe ser true cuando hay rango de fechas', () => {
      const { result } = renderHook(() => useEventFilters());

      act(() => {
        result.current.updateFilter('rango', { 
          inicio: new Date(), 
          fin: null 
        });
      });

      expect(result.current.hasActiveFilters).toBe(true);
    });
  });

  describe('activeFiltersCount', () => {
    it('debe contar correctamente filtros activos', () => {
      const { result } = renderHook(() => useEventFilters());

      act(() => {
        result.current.toggleArrayFilter('equipos', 'equipo1');
        result.current.updateFilter('search', 'test');
        result.current.updateFilter('soloUrgentes', true);
      });

      expect(result.current.activeFiltersCount).toBe(3);
    });

    it('debe contar rango como un solo filtro', () => {
      const { result } = renderHook(() => useEventFilters());

      act(() => {
        result.current.updateFilter('rango', { 
          inicio: new Date(), 
          fin: new Date() 
        });
      });

      expect(result.current.activeFiltersCount).toBe(1);
    });
  });

  describe('setIsFiltersOpen', () => {
    it('debe abrir el panel de filtros', () => {
      const { result } = renderHook(() => useEventFilters());

      act(() => {
        result.current.setIsFiltersOpen(true);
      });

      expect(result.current.isFiltersOpen).toBe(true);
    });

    it('debe cerrar el panel de filtros', () => {
      const { result } = renderHook(() => useEventFilters());

      act(() => {
        result.current.setIsFiltersOpen(true);
      });
      act(() => {
        result.current.setIsFiltersOpen(false);
      });

      expect(result.current.isFiltersOpen).toBe(false);
    });
  });
});

