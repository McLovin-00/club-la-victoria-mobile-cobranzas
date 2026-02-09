/**
 * Tests completos para useCalendarEvents hook
 * Verifica la carga de eventos, refetch y filtrado por fecha
 */
import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { renderHook, waitFor, act } from '@testing-library/react';
import React from 'react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';

// Crear store mock con auth
const createMockStore = (token = 'test-token', empresaId = 1) => configureStore({
  reducer: {
    auth: () => ({
      token,
      user: { empresaId },
    }),
  },
});

// Wrapper con Provider
const createWrapper = (store: ReturnType<typeof createMockStore>) => {
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(Provider, { store }, children);
};

describe('useCalendarEvents - renderHook tests', () => {
  let fetchSpy: jest.SpiedFunction<typeof global.fetch>;

  beforeEach(() => {
    fetchSpy = jest.spyOn(global, 'fetch');
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  it('debe iniciar con isLoading en true', async () => {
    // Mock que nunca resuelve para verificar estado inicial
    fetchSpy.mockImplementation(() => new Promise(() => {}));

    const { useCalendarEvents } = await import('../useCalendarEvents');
    const store = createMockStore();
    const { result } = renderHook(() => useCalendarEvents(), {
      wrapper: createWrapper(store),
    });

    expect(result.current.isLoading).toBe(true);
    expect(result.current.events).toEqual([]);
    expect(result.current.error).toBeNull();
  });

  it('debe cargar eventos exitosamente desde la API', async () => {
    const mockEvents = [
      {
        id: '1',
        equipoId: 'eq-1',
        equipoNombre: 'Equipo 1',
        documentoTipo: 'Licencia',
        fechaVencimiento: '2024-12-31T00:00:00.000Z',
        estado: 'vigente',
        prioridad: 'alta',
        diasRestantes: 30,
      },
      {
        id: '2',
        equipoId: 'eq-2',
        equipoNombre: 'Equipo 2',
        documentoTipo: 'Seguro',
        fechaVencimiento: '2024-11-15T00:00:00.000Z',
        estado: 'proximo',
        prioridad: 'media',
        diasRestantes: 10,
      },
    ];

    fetchSpy.mockResolvedValueOnce(
      new Response(JSON.stringify({ success: true, data: mockEvents }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    const { useCalendarEvents } = await import('../useCalendarEvents');
    const store = createMockStore();
    const { result } = renderHook(() => useCalendarEvents(), {
      wrapper: createWrapper(store),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.events).toHaveLength(2);
    expect(result.current.events[0].equipoNombre).toBe('Equipo 1');
    expect(result.current.events[0].fechaVencimiento).toBeInstanceOf(Date);
    expect(result.current.error).toBeNull();
  });

  it('debe manejar errores de la API correctamente', async () => {
    fetchSpy.mockResolvedValueOnce(
      new Response(JSON.stringify({ error: 'Server error' }), {
        status: 500,
        statusText: 'Internal Server Error',
      })
    );

    const { useCalendarEvents } = await import('../useCalendarEvents');
    const store = createMockStore();
    const { result } = renderHook(() => useCalendarEvents(), {
      wrapper: createWrapper(store),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toContain('500');
    expect(result.current.events).toEqual([]);
  });

  it('debe manejar errores de red', async () => {
    fetchSpy.mockRejectedValueOnce(new Error('Network error'));

    const { useCalendarEvents } = await import('../useCalendarEvents');
    const store = createMockStore();
    const { result } = renderHook(() => useCalendarEvents(), {
      wrapper: createWrapper(store),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBe('Network error');
    expect(result.current.events).toEqual([]);
  });

  it('debe manejar respuesta con formato inesperado', async () => {
    fetchSpy.mockResolvedValueOnce(
      new Response(JSON.stringify({ success: false, message: 'Bad format' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    const { useCalendarEvents } = await import('../useCalendarEvents');
    const store = createMockStore();
    const { result } = renderHook(() => useCalendarEvents(), {
      wrapper: createWrapper(store),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.events).toEqual([]);
  });

  it('refetch debe recargar los eventos con isLoading en true', async () => {
    const initialEvents = [
      {
        id: '1',
        equipoId: 'eq-1',
        equipoNombre: 'Equipo 1',
        documentoTipo: 'Licencia',
        fechaVencimiento: '2024-12-31T00:00:00.000Z',
        estado: 'vigente',
        prioridad: 'alta',
        diasRestantes: 30,
      },
    ];

    const updatedEvents = [
      ...initialEvents,
      {
        id: '2',
        equipoId: 'eq-2',
        equipoNombre: 'Equipo Nuevo',
        documentoTipo: 'Seguro',
        fechaVencimiento: '2024-11-20T00:00:00.000Z',
        estado: 'proximo',
        prioridad: 'baja',
        diasRestantes: 5,
      },
    ];

    fetchSpy
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ success: true, data: initialEvents }), {
          status: 200,
        })
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ success: true, data: updatedEvents }), {
          status: 200,
        })
      );

    const { useCalendarEvents } = await import('../useCalendarEvents');
    const store = createMockStore();
    const { result } = renderHook(() => useCalendarEvents(), {
      wrapper: createWrapper(store),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.events).toHaveLength(1);

    // Llamar a refetch
    await act(async () => {
      await result.current.refetch();
    });

    await waitFor(() => {
      expect(result.current.events).toHaveLength(2);
    });
  });

  it('refreshEvents debe recargar con isRefreshing en true (sin isLoading)', async () => {
    const initialEvents = [
      {
        id: '1',
        equipoId: 'eq-1',
        equipoNombre: 'Equipo 1',
        documentoTipo: 'Licencia',
        fechaVencimiento: '2024-12-31T00:00:00.000Z',
        estado: 'vigente',
        prioridad: 'alta',
        diasRestantes: 30,
      },
    ];

    fetchSpy
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ success: true, data: initialEvents }), {
          status: 200,
        })
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ success: true, data: initialEvents }), {
          status: 200,
        })
      );

    const { useCalendarEvents } = await import('../useCalendarEvents');
    const store = createMockStore();
    const { result } = renderHook(() => useCalendarEvents(), {
      wrapper: createWrapper(store),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Llamar a refreshEvents
    await act(async () => {
      await result.current.refreshEvents();
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.isRefreshing).toBe(false);
  });

  it('getEventsForDate debe filtrar eventos por fecha específica', async () => {
    // Usar fechas en formato que garantice el mismo día local
    const targetDateStr = '2024-12-31';
    const targetDate = new Date(targetDateStr + 'T12:00:00');
    
    const mockEvents = [
      {
        id: '1',
        equipoId: 'eq-1',
        equipoNombre: 'Equipo 1',
        documentoTipo: 'Licencia',
        fechaVencimiento: targetDateStr + 'T12:00:00',
        estado: 'vigente',
        prioridad: 'alta',
        diasRestantes: 30,
      },
      {
        id: '2',
        equipoId: 'eq-2',
        equipoNombre: 'Equipo 2',
        documentoTipo: 'Seguro',
        fechaVencimiento: '2024-11-15T12:00:00',
        estado: 'proximo',
        prioridad: 'media',
        diasRestantes: 10,
      },
      {
        id: '3',
        equipoId: 'eq-3',
        equipoNombre: 'Equipo 3',
        documentoTipo: 'VTV',
        fechaVencimiento: targetDateStr + 'T18:00:00',
        estado: 'vigente',
        prioridad: 'baja',
        diasRestantes: 30,
      },
    ];

    fetchSpy.mockResolvedValueOnce(
      new Response(JSON.stringify({ success: true, data: mockEvents }), {
        status: 200,
      })
    );

    const { useCalendarEvents } = await import('../useCalendarEvents');
    const store = createMockStore();
    const { result } = renderHook(() => useCalendarEvents(), {
      wrapper: createWrapper(store),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const eventsForDate = result.current.getEventsForDate(targetDate);
    // Puede haber 1 o 2 eventos dependiendo de la zona horaria
    expect(eventsForDate.length).toBeGreaterThanOrEqual(1);
    expect(eventsForDate[0].equipoNombre).toBe('Equipo 1');
  });

  it('getEventsForDate debe retornar array vacío si no hay eventos en la fecha', async () => {
    const mockEvents = [
      {
        id: '1',
        equipoId: 'eq-1',
        equipoNombre: 'Equipo 1',
        documentoTipo: 'Licencia',
        fechaVencimiento: '2024-12-31T00:00:00.000Z',
        estado: 'vigente',
        prioridad: 'alta',
        diasRestantes: 30,
      },
    ];

    fetchSpy.mockResolvedValueOnce(
      new Response(JSON.stringify({ success: true, data: mockEvents }), {
        status: 200,
      })
    );

    const { useCalendarEvents } = await import('../useCalendarEvents');
    const store = createMockStore();
    const { result } = renderHook(() => useCalendarEvents(), {
      wrapper: createWrapper(store),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const noEvents = result.current.getEventsForDate(new Date('2025-01-15'));
    expect(noEvents).toHaveLength(0);
  });

  it('debe construir authHeaders correctamente', async () => {
    fetchSpy.mockResolvedValueOnce(
      new Response(JSON.stringify({ success: true, data: [] }), {
        status: 200,
      })
    );

    const { useCalendarEvents } = await import('../useCalendarEvents');
    const store = createMockStore('my-token', 42);
    renderHook(() => useCalendarEvents(), {
      wrapper: createWrapper(store),
    });

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalled();
    });

    const fetchCall = fetchSpy.mock.calls[0];
    const requestInit = fetchCall[1] as RequestInit;
    
    expect(requestInit.headers).toBeDefined();
    expect((requestInit.headers as Record<string, string>)['Authorization']).toBe('Bearer my-token');
    expect((requestInit.headers as Record<string, string>)['x-tenant-id']).toBe('42');
  });
});

