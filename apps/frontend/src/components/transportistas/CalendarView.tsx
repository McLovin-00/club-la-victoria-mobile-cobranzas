import React, { useState, useMemo } from 'react';
import { 
  ChevronLeftIcon, 
  ChevronRightIcon,
  CalendarDaysIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon 
} from '@heroicons/react/24/outline';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths } from 'date-fns';
import { es } from 'date-fns/locale';
import { TouchFeedback } from '../mobile/TouchFeedback';
import { Badge } from '../ui/badge';

export interface CalendarEvent {
  id: string;
  equipoId: string;
  equipoNombre: string;
  documentoTipo: string;
  fechaVencimiento: Date;
  estado: 'vigente' | 'vencido' | 'proximo';
  prioridad: 'alta' | 'media' | 'baja';
  diasRestantes: number;
}

interface CalendarViewProps {
  events: CalendarEvent[];
  selectedDate: Date | null;
  onDateSelect: (date: Date) => void;
  onEventClick: (event: CalendarEvent) => void;
  className?: string;
}

/**
 * CalendarView - Vista de calendario móvil con eventos
 * Diseño touch-friendly con indicadores visuales claros
 */
export const CalendarView: React.FC<CalendarViewProps> = ({
  events,
  selectedDate,
  onDateSelect,
  onEventClick,
  className = '',
}) => {
  const [currentMonth, setCurrentMonth] = useState(selectedDate || new Date());

  // Navegación de meses
  const goToPreviousMonth = () => setCurrentMonth(prev => subMonths(prev, 1));
  const goToNextMonth = () => setCurrentMonth(prev => addMonths(prev, 1));
  const goToToday = () => {
    const today = new Date();
    setCurrentMonth(today);
    onDateSelect(today);
  };

  // Generar días del mes
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Agrupar eventos por fecha
  const eventsByDate = useMemo(() => {
    const grouped: Record<string, CalendarEvent[]> = {};
    events.forEach(event => {
      const dateKey = format(event.fechaVencimiento, 'yyyy-MM-dd');
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(event);
    });
    return grouped;
  }, [events]);

  // Obtener eventos para una fecha específica
  const getEventsForDate = (date: Date): CalendarEvent[] => {
    const dateKey = format(date, 'yyyy-MM-dd');
    return eventsByDate[dateKey] ?? [];
  };

  // Obtener indicador de prioridad para una fecha
  const getDatePriority = (date: Date): 'alta' | 'media' | 'baja' | null => {
    const dayEvents = getEventsForDate(date);
    if (dayEvents.length === 0) return null;
    
    // Retornar la prioridad más alta
    if (dayEvents.some(e => e.prioridad === 'alta')) return 'alta';
    if (dayEvents.some(e => e.prioridad === 'media')) return 'media';
    return 'baja';
  };

  // Obtener clases CSS para un día
  const getDayClasses = (date: Date) => {
    const events = getEventsForDate(date);
    const priority = getDatePriority(date);
    const isSelected = selectedDate && isSameDay(date, selectedDate);
    const isToday = isSameDay(date, new Date());
    const isCurrentMonth = isSameMonth(date, currentMonth);

    let classes = `
      relative w-12 h-12 rounded-xl flex items-center justify-center text-sm font-medium
      transition-all duration-200 touch-manipulation
    `;

    if (!isCurrentMonth) {
      classes += ' text-gray-300 bg-transparent';
    } else if (isSelected) {
      classes += ' bg-blue-500 text-white shadow-lg scale-105';
    } else if (isToday) {
      classes += ' bg-blue-100 text-blue-600 ring-2 ring-blue-500';
    } else if (events.length > 0) {
      switch (priority) {
        case 'alta':
          classes += ' bg-red-100 text-red-700 ring-1 ring-red-300';
          break;
        case 'media':
          classes += ' bg-yellow-100 text-yellow-700 ring-1 ring-yellow-300';
          break;
        case 'baja':
          classes += ' bg-green-100 text-green-700 ring-1 ring-green-300';
          break;
      }
    } else {
      classes += ' text-gray-700 hover:bg-gray-100';
    }

    return classes;
  };

  // Renderizar indicadores de eventos
  const renderEventIndicators = (date: Date) => {
    const events = getEventsForDate(date);
    if (events.length === 0) return null;

    return (
      <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 flex space-x-0.5">
        {events.slice(0, 3).map((event, index) => (
          <div
            key={`${event.id}-${index}`}
            className={`w-1.5 h-1.5 rounded-full ${
              event.estado === 'vencido' ? 'bg-red-500' :
              event.estado === 'proximo' ? 'bg-yellow-500' :
              'bg-green-500'
            }`}
          />
        ))}
        {events.length > 3 && (
          <div className="w-1.5 h-1.5 rounded-full bg-gray-400" />
        )}
      </div>
    );
  };

  return (
    <div className={`bg-white rounded-2xl shadow-lg border-0 overflow-hidden ${className}`}>
      {/* Header del calendario */}
      <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-4">
        <div className="flex items-center justify-between mb-4">
          <TouchFeedback>
            <button
              onClick={goToPreviousMonth}
              className="p-2 rounded-xl bg-white/20 text-white hover:bg-white/30 transition-colors"
            >
              <ChevronLeftIcon className="h-5 w-5" />
            </button>
          </TouchFeedback>

          <div className="text-center">
            <h3 className="text-lg font-bold text-white capitalize">
              {format(currentMonth, 'MMMM yyyy', { locale: es })}
            </h3>
            <TouchFeedback>
              <button
                onClick={goToToday}
                className="text-sm text-blue-100 hover:text-white transition-colors"
              >
                Ir a hoy
              </button>
            </TouchFeedback>
          </div>

          <TouchFeedback>
            <button
              onClick={goToNextMonth}
              className="p-2 rounded-xl bg-white/20 text-white hover:bg-white/30 transition-colors"
            >
              <ChevronRightIcon className="h-5 w-5" />
            </button>
          </TouchFeedback>
        </div>

        {/* Días de la semana */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map(day => (
            <div key={day} className="text-center text-sm font-medium text-blue-100 py-2">
              {day}
            </div>
          ))}
        </div>
      </div>

      {/* Grid del calendario */}
      <div className="p-4">
        <div className="grid grid-cols-7 gap-2">
          {days.map(day => (
            <TouchFeedback key={day.toISOString()}>
              <button
                onClick={() => onDateSelect(day)}
                className={getDayClasses(day)}
                disabled={!isSameMonth(day, currentMonth)}
              >
                {format(day, 'd')}
                {renderEventIndicators(day)}
              </button>
            </TouchFeedback>
          ))}
        </div>
      </div>

      {/* Eventos del día seleccionado */}
      {selectedDate && (
        <div className="border-t border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-3">
            <CalendarDaysIcon className="h-5 w-5 text-blue-500" />
            <h4 className="font-semibold text-gray-900">
              {format(selectedDate, "d 'de' MMMM", { locale: es })}
            </h4>
          </div>

          {getEventsForDate(selectedDate).length === 0 ? (
            <p className="text-sm text-gray-500 italic">No hay eventos programados</p>
          ) : (
            <div className="space-y-2">
              {getEventsForDate(selectedDate).map(event => (
                <TouchFeedback key={event.id}>
                  <div
                    onClick={() => onEventClick(event)}
                    onKeyDown={(e) => e.key === 'Enter' && onEventClick(event)}
                    role="button"
                    tabIndex={0}
                    className="flex items-center justify-between p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {event.estado === 'vencido' && (
                          <ExclamationTriangleIcon className="h-4 w-4 text-red-500 flex-shrink-0" />
                        )}
                        {event.estado === 'proximo' && (
                          <ClockIcon className="h-4 w-4 text-yellow-500 flex-shrink-0" />
                        )}
                        {event.estado === 'vigente' && (
                          <CheckCircleIcon className="h-4 w-4 text-green-500 flex-shrink-0" />
                        )}
                        <span className="font-medium text-gray-900 truncate">
                          {event.equipoNombre}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 truncate">
                        {event.documentoTipo}
                      </p>
                    </div>
                    <div className="flex-shrink-0 ml-3">
                      <Badge
                        variant={
                          event.prioridad === 'alta' ? 'destructive' :
                          event.prioridad === 'media' ? 'secondary' :
                          'default'
                        }
                        className="text-xs"
                      >
                        {event.prioridad}
                      </Badge>
                    </div>
                  </div>
                </TouchFeedback>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
