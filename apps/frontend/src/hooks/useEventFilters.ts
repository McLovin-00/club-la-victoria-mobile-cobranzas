import { useState, useMemo, useCallback } from 'react';

/**
 * Hook para filtros avanzados del calendario
 * Maneja filtros inteligentes y estado de UI
 */

export interface CalendarFilters {
  equipos: string[];
  tiposDocumento: string[];
  prioridades: ('alta' | 'media' | 'baja')[];
  estados: ('vigente' | 'vencido' | 'proximo')[];
  rango: {
    inicio: Date | null;
    fin: Date | null;
  };
  search: string;
  soloUrgentes: boolean;
  soloMisEquipos: boolean;
}

export interface FilterOption {
  id: string;
  label: string;
  count: number;
  color?: string;
}

const initialFilters: CalendarFilters = {
  equipos: [],
  tiposDocumento: [],
  prioridades: [],
  estados: [],
  rango: {
    inicio: null,
    fin: null,
  },
  search: '',
  soloUrgentes: false,
  soloMisEquipos: true, // Por defecto solo mis equipos
};

export const useEventFilters = () => {
  const [filters, setFilters] = useState<CalendarFilters>(initialFilters);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);

  // Actualizar filtro específico
  const updateFilter = useCallback(<K extends keyof CalendarFilters>(
    key: K,
    value: CalendarFilters[K]
  ) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
    }));
  }, []);

  // Toggle arrays de filtros (equipos, tipos, etc.)
  const toggleArrayFilter = useCallback(<K extends keyof Pick<CalendarFilters, 'equipos' | 'tiposDocumento' | 'prioridades' | 'estados'>>(
    key: K,
    value: string
  ) => {
    setFilters(prev => ({
      ...prev,
      [key]: prev[key].includes(value)
        ? prev[key].filter(item => item !== value)
        : [...prev[key], value],
    }));
  }, []);

  // Limpiar todos los filtros
  const clearFilters = useCallback(() => {
    setFilters(initialFilters);
  }, []);

  // Limpiar filtro específico
  const clearFilter = useCallback(<K extends keyof CalendarFilters>(key: K) => {
    const defaultValue = initialFilters[key];
    setFilters(prev => ({
      ...prev,
      [key]: defaultValue,
    }));
  }, []);

  // Preset: Solo urgentes (próximos 7 días)
  const applyUrgentPreset = useCallback(() => {
    const now = new Date();
    const urgentEnd = new Date();
    urgentEnd.setDate(now.getDate() + 7);

    setFilters(prev => ({
      ...prev,
      soloUrgentes: true,
      estados: ['proximo', 'vencido'],
      rango: {
        inicio: now,
        fin: urgentEnd,
      },
    }));
  }, []);

  // Preset: Este mes
  const applyThisMonthPreset = useCallback(() => {
    const now = new Date();
    const inicio = new Date(now.getFullYear(), now.getMonth(), 1);
    const fin = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    setFilters(prev => ({
      ...prev,
      rango: { inicio, fin },
      soloUrgentes: false,
    }));
  }, []);

  // Preset: Próximos 30 días
  const applyNext30DaysPreset = useCallback(() => {
    const now = new Date();
    const fin = new Date();
    fin.setDate(now.getDate() + 30);

    setFilters(prev => ({
      ...prev,
      rango: { inicio: now, fin },
      soloUrgentes: false,
    }));
  }, []);

  // Verificar si hay filtros activos
  const hasActiveFilters = useMemo(() => {
    return (
      filters.equipos.length > 0 ||
      filters.tiposDocumento.length > 0 ||
      filters.prioridades.length > 0 ||
      filters.estados.length > 0 ||
      filters.rango.inicio !== null ||
      filters.rango.fin !== null ||
      filters.search.trim() !== '' ||
      filters.soloUrgentes ||
      !filters.soloMisEquipos
    );
  }, [filters]);

  // Contar filtros activos
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filters.equipos.length > 0) count++;
    if (filters.tiposDocumento.length > 0) count++;
    if (filters.prioridades.length > 0) count++;
    if (filters.estados.length > 0) count++;
    if (filters.rango.inicio || filters.rango.fin) count++;
    if (filters.search.trim()) count++;
    if (filters.soloUrgentes) count++;
    if (!filters.soloMisEquipos) count++;
    return count;
  }, [filters]);

  return {
    // Estado
    filters,
    isFiltersOpen,
    hasActiveFilters,
    activeFiltersCount,

    // Acciones
    updateFilter,
    toggleArrayFilter,
    clearFilters,
    clearFilter,
    setIsFiltersOpen,

    // Presets
    applyUrgentPreset,
    applyThisMonthPreset,
    applyNext30DaysPreset,
  };
};
