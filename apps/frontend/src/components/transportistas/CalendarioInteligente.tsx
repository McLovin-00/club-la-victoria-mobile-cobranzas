import React, { useState, useMemo } from 'react';
import {
  CalendarDaysIcon,
  FunnelIcon,
  ArrowPathIcon,
  ListBulletIcon,
  Squares2X2Icon,
} from '@heroicons/react/24/outline';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { TouchFeedback } from '../mobile/TouchFeedback';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Spinner } from '../ui/spinner';
import { CalendarView, CalendarEvent } from './CalendarView';
import { CalendarFilters } from './CalendarFilters';
import { useCalendarEvents } from '../../hooks/useCalendarEvents';
import { useEventFilters, FilterOption } from '../../hooks/useEventFilters';

/**
 * CalendarioInteligente - Calendario completo de vencimientos
 * Vista principal con filtros avanzados y navegación inteligente
 */
export const CalendarioInteligente: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');

  // Hooks para datos y filtros
  const { events, isLoading, error, refetch } = useCalendarEvents();
  const filterHooks = useEventFilters();
  const { 
    filters, 
    isFiltersOpen, 
    setIsFiltersOpen, 
    hasActiveFilters, 
    activeFiltersCount 
  } = filterHooks;

  // Filtrar eventos según los criterios seleccionados
  const filteredEvents = useMemo(() => {
    if (!events) return [];

    let filtered = [...events];

    // Filtro por texto
    if (filters.search.trim()) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(event =>
        event.equipoNombre.toLowerCase().includes(searchLower) ||
        event.documentoTipo.toLowerCase().includes(searchLower)
      );
    }

    // Filtro por equipos
    if (filters.equipos.length > 0) {
      filtered = filtered.filter(event =>
        filters.equipos.includes(event.equipoId)
      );
    }

    // Filtro por tipos de documento
    if (filters.tiposDocumento.length > 0) {
      filtered = filtered.filter(event =>
        filters.tiposDocumento.includes(event.documentoTipo)
      );
    }

    // Filtro por prioridades
    if (filters.prioridades.length > 0) {
      filtered = filtered.filter(event =>
        filters.prioridades.includes(event.prioridad)
      );
    }

    // Filtro por estados
    if (filters.estados.length > 0) {
      filtered = filtered.filter(event =>
        filters.estados.includes(event.estado)
      );
    }

    // Filtro por rango de fechas
    if (filters.rango.inicio || filters.rango.fin) {
      filtered = filtered.filter(event => {
        const eventDate = event.fechaVencimiento;
        if (filters.rango.inicio && eventDate < filters.rango.inicio) return false;
        if (filters.rango.fin && eventDate > filters.rango.fin) return false;
        return true;
      });
    }

    // Filtro solo urgentes
    if (filters.soloUrgentes) {
      filtered = filtered.filter(event =>
        event.estado === 'vencido' || 
        (event.estado === 'proximo' && event.diasRestantes <= 7)
      );
    }

    return filtered;
  }, [events, filters]);

  // Generar opciones para filtros dinámicos
  const equipoOptions: FilterOption[] = useMemo(() => {
    if (!events) return [];
    
    const equipoMap = new Map<string, { label: string; count: number }>();
    events.forEach(event => {
      const existing = equipoMap.get(event.equipoId);
      equipoMap.set(event.equipoId, {
        label: event.equipoNombre,
        count: (existing?.count || 0) + 1,
      });
    });

    return Array.from(equipoMap.entries()).map(([id, data]) => ({
      id,
      label: data.label,
      count: data.count,
    }));
  }, [events]);

  const tipoDocumentoOptions: FilterOption[] = useMemo(() => {
    if (!events) return [];
    
    const tipoMap = new Map<string, number>();
    events.forEach(event => {
      tipoMap.set(event.documentoTipo, (tipoMap.get(event.documentoTipo) || 0) + 1);
    });

    return Array.from(tipoMap.entries()).map(([tipo, count]) => ({
      id: tipo,
      label: tipo,
      count,
    }));
  }, [events]);

  // Manejar selección de evento
  const handleEventClick = (event: CalendarEvent) => {
    // TODO: Navegar a detalle del equipo/documento
    console.log('Evento seleccionado:', event);
  };

  // Estadísticas rápidas
  const stats = useMemo(() => {
    if (!filteredEvents) return null;

    const vencidos = filteredEvents.filter(e => e.estado === 'vencido').length;
    const proximos = filteredEvents.filter(e => e.estado === 'proximo').length;
    const vigentes = filteredEvents.filter(e => e.estado === 'vigente').length;
    const urgentes = filteredEvents.filter(e => 
      e.estado === 'vencido' || (e.estado === 'proximo' && e.diasRestantes <= 7)
    ).length;

    return { vencidos, proximos, vigentes, urgentes, total: filteredEvents.length };
  }, [filteredEvents]);

  if (error) {
    return (
      <div className="p-8 text-center">
        <div className="text-red-500 mb-4">
          <CalendarDaysIcon className="h-12 w-12 mx-auto mb-2" />
          <p className="text-lg font-medium">Error al cargar el calendario</p>
          <p className="text-sm text-gray-500 mt-1">{error}</p>
        </div>
        <TouchFeedback>
          <Button onClick={refetch} variant="outline">
            <ArrowPathIcon className="h-4 w-4 mr-2" />
            Reintentar
          </Button>
        </TouchFeedback>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header con controles */}
      <div className="bg-white rounded-2xl shadow-lg border-0 p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <CalendarDaysIcon className="h-6 w-6 text-blue-600" />
            <div>
              <h2 className="text-xl font-bold text-gray-900">Calendario de Vencimientos</h2>
              {stats && (
                <p className="text-sm text-gray-600">
                  {stats.total} evento{stats.total !== 1 ? 's' : ''} 
                  {hasActiveFilters && ' (filtrado)'}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Toggle vista */}
            <div className="bg-gray-100 rounded-xl p-1 flex">
              <TouchFeedback>
                <button
                  onClick={() => setViewMode('calendar')}
                  className={`p-2 rounded-lg transition-colors ${
                    viewMode === 'calendar'
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <Squares2X2Icon className="h-5 w-5" />
                </button>
              </TouchFeedback>
              <TouchFeedback>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded-lg transition-colors ${
                    viewMode === 'list'
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <ListBulletIcon className="h-5 w-5" />
                </button>
              </TouchFeedback>
            </div>

            {/* Botón de filtros */}
            <TouchFeedback>
              <Button
                variant={hasActiveFilters ? "default" : "outline"}
                size="sm"
                onClick={() => setIsFiltersOpen(true)}
                className="relative"
              >
                <FunnelIcon className="h-4 w-4 mr-2" />
                Filtros
                {activeFiltersCount > 0 && (
                  <Badge
                    variant="destructive"
                    className="absolute -top-2 -right-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
                  >
                    {activeFiltersCount}
                  </Badge>
                )}
              </Button>
            </TouchFeedback>
          </div>
        </div>

        {/* Estadísticas rápidas */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-red-50 border border-red-200 rounded-xl p-3">
              <div className="text-red-600 text-sm font-medium">Vencidos</div>
              <div className="text-red-700 text-xl font-bold">{stats.vencidos}</div>
            </div>
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3">
              <div className="text-yellow-600 text-sm font-medium">Próximos</div>
              <div className="text-yellow-700 text-xl font-bold">{stats.proximos}</div>
            </div>
            <div className="bg-green-50 border border-green-200 rounded-xl p-3">
              <div className="text-green-600 text-sm font-medium">Vigentes</div>
              <div className="text-green-700 text-xl font-bold">{stats.vigentes}</div>
            </div>
            <div className="bg-purple-50 border border-purple-200 rounded-xl p-3">
              <div className="text-purple-600 text-sm font-medium">Urgentes</div>
              <div className="text-purple-700 text-xl font-bold">{stats.urgentes}</div>
            </div>
          </div>
        )}
      </div>

      {/* Contenido principal */}
      {isLoading ? (
        <div className="bg-white rounded-2xl shadow-lg border-0 p-8">
          <div className="flex flex-col items-center justify-center text-gray-500">
            <Spinner className="mb-4 h-8 w-8" />
            <p className="text-lg font-medium">Cargando calendario...</p>
            <p className="text-sm">Obteniendo eventos de vencimiento</p>
          </div>
        </div>
      ) : viewMode === 'calendar' ? (
        <CalendarView
          events={filteredEvents}
          selectedDate={selectedDate}
          onDateSelect={setSelectedDate}
          onEventClick={handleEventClick}
        />
      ) : (
        <div className="bg-white rounded-2xl shadow-lg border-0 p-4">
          <h3 className="font-semibold text-gray-900 mb-4">Lista de eventos</h3>
          {filteredEvents.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <CalendarDaysIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p className="text-lg font-medium">No hay eventos</p>
              <p className="text-sm">
                {hasActiveFilters 
                  ? 'Intenta ajustar los filtros' 
                  : 'No hay vencimientos programados'
                }
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredEvents
                .sort((a, b) => a.fechaVencimiento.getTime() - b.fechaVencimiento.getTime())
                .map(event => (
                  <TouchFeedback key={event.id}>
                    <div
                      onClick={() => handleEventClick(event)}
                      onKeyDown={(e) => e.key === 'Enter' && handleEventClick(event)}
                      role="button"
                      tabIndex={0}
                      className="flex items-center justify-between p-4 rounded-xl border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-colors cursor-pointer"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-gray-900 truncate">
                            {event.equipoNombre}
                          </span>
                          <Badge
                            variant={
                              event.estado === 'vencido' ? 'destructive' :
                              event.estado === 'proximo' ? 'secondary' :
                              'default'
                            }
                            className="text-xs"
                          >
                            {event.estado}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600 truncate mb-1">
                          {event.documentoTipo}
                        </p>
                        <p className="text-xs text-gray-500">
                          {format(event.fechaVencimiento, "d 'de' MMMM 'de' yyyy", { locale: es })}
                        </p>
                      </div>
                      <div className="flex-shrink-0 ml-3 text-right">
                        <Badge
                          variant={
                            event.prioridad === 'alta' ? 'destructive' :
                            event.prioridad === 'media' ? 'secondary' :
                            'default'
                          }
                          className="text-xs mb-1"
                        >
                          {event.prioridad}
                        </Badge>
                        <p className="text-xs text-gray-500">
                          {event.diasRestantes > 0 
                            ? `${event.diasRestantes} días`
                            : event.diasRestantes === 0 
                              ? 'Hoy'
                              : `${Math.abs(event.diasRestantes)} días atrasado`
                          }
                        </p>
                      </div>
                    </div>
                  </TouchFeedback>
                ))}
            </div>
          )}
        </div>
      )}

      {/* Panel de filtros */}
      <CalendarFilters
        isOpen={isFiltersOpen}
        onClose={() => setIsFiltersOpen(false)}
        filters={filters}
        onFiltersChange={filterHooks}
        equipoOptions={equipoOptions}
        tipoDocumentoOptions={tipoDocumentoOptions}
      />
    </div>
  );
};
