import { useState, useEffect, useMemo, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../store/store';

/**
 * Hook para gestión de eventos del calendario
 * Maneja la carga, filtrado y manipulación de eventos de vencimiento
 */

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

interface CalendarEventsHook {
  events: CalendarEvent[];
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  refreshEvents: () => Promise<void>;
  getEventsForDate: (date: Date) => CalendarEvent[];
}

export const useCalendarEvents = (): CalendarEventsHook => {
  const authToken = useSelector((s: RootState) => (s as any)?.auth?.token);
  const empresaId = useSelector((s: RootState) => (s as any)?.auth?.user?.empresaId);
  // En Vite `import.meta.env` existe. En tests/Node puede no estar definido: fallback seguro.
  const baseUrl = `${(import.meta as any)?.env?.VITE_DOCUMENTOS_API_URL || (process as any)?.env?.VITE_DOCUMENTOS_API_URL || ''}/api/docs`;

  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const authHeaders: HeadersInit = useMemo(() => ({
    ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
    ...(empresaId ? { 'x-tenant-id': String(empresaId) } : {}),
    'Content-Type': 'application/json',
  }), [authToken, empresaId]);

  // Función para cargar eventos
  const fetchEvents = useCallback(async (showLoading = true) => {
    try {
      if (showLoading) {
        setIsLoading(true);
      } else {
        setIsRefreshing(true);
      }
      setError(null);

      const response = await fetch(`${baseUrl}/transportistas/calendar-events`, {
        method: 'GET',
        headers: authHeaders,
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success && Array.isArray(data.data)) {
        // Convertir fechas y procesar datos
        const processedEvents: CalendarEvent[] = data.data.map((event: any) => ({
          ...event,
          fechaVencimiento: new Date(event.fechaVencimiento),
        }));
        
        setEvents(processedEvents);
      } else {
        console.warn('Unexpected API response format:', data);
        setEvents([]);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      console.error('Error fetching calendar events:', errorMessage);
      setError(errorMessage);
      setEvents([]);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [baseUrl, authHeaders]);

  // Cargar eventos al montar el componente
  useEffect(() => {
    fetchEvents(true);
  }, [fetchEvents]);

  // Función para refrescar eventos
  const refreshEvents = useCallback(() => {
    return fetchEvents(false);
  }, [fetchEvents]);

  // Función para obtener eventos por fecha
  const getEventsForDate = useCallback((date: Date): CalendarEvent[] => {
    const targetDateStr = date.toDateString();
    return events.filter(event => 
      event.fechaVencimiento.toDateString() === targetDateStr
    );
  }, [events]);

  // Alias para refetch
  const refetch = useCallback(() => {
    return fetchEvents(true);
  }, [fetchEvents]);

  return {
    events,
    isLoading,
    isRefreshing,
    error,
    refetch,
    refreshEvents,
    getEventsForDate,
  };
};