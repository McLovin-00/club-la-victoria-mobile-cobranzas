/**
 * Tests completos para useEquipoStats hook
 * Verifica la carga de estadísticas y alertas del dashboard
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

describe('useEquipoStats - renderHook tests', () => {
  let fetchSpy: jest.SpiedFunction<typeof global.fetch>;

  beforeEach(() => {
    fetchSpy = jest.spyOn(global, 'fetch');
    jest.useFakeTimers();
  });

  afterEach(() => {
    fetchSpy.mockRestore();
    jest.useRealTimers();
  });

  it('debe iniciar con isLoadingStats e isLoadingAlerts en true', async () => {
    // Mock que nunca resuelve para verificar estado inicial
    fetchSpy.mockImplementation(() => new Promise(() => {}));

    const { useEquipoStats } = await import('../useEquipoStats');
    const store = createMockStore();
    const { result } = renderHook(() => useEquipoStats(), {
      wrapper: createWrapper(store),
    });

    expect(result.current.isLoadingStats).toBe(true);
    expect(result.current.isLoadingAlerts).toBe(true);
    expect(result.current.stats).toBeNull();
    expect(result.current.alerts).toEqual([]);
  });

  it('debe cargar stats exitosamente desde la API', async () => {
    const mockStats = {
      totalEquipos: 10,
      equiposVigentes: 7,
      equiposProximos: 2,
      equiposVencidos: 1,
      equiposFaltantes: 0,
      compliancePercentage: 70,
    };

    const mockAlerts = [
      { id: '1', type: 'VENCIMIENTO', message: 'Documento por vencer' },
    ];

    fetchSpy.mockImplementation((url) => {
      if (String(url).includes('dashboard-stats')) {
        return Promise.resolve(
          new Response(JSON.stringify({ data: mockStats }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          })
        );
      }
      if (String(url).includes('alertas-urgentes')) {
        return Promise.resolve(
          new Response(JSON.stringify({ data: mockAlerts }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          })
        );
      }
      return Promise.resolve(new Response('{}', { status: 200 }));
    });

    const { useEquipoStats } = await import('../useEquipoStats');
    const store = createMockStore();
    const { result } = renderHook(() => useEquipoStats(), {
      wrapper: createWrapper(store),
    });

    await waitFor(() => {
      expect(result.current.isLoadingStats).toBe(false);
    });

    await waitFor(() => {
      expect(result.current.isLoadingAlerts).toBe(false);
    });

    expect(result.current.stats).toEqual(mockStats);
    expect(result.current.alerts).toEqual(mockAlerts);
    expect(result.current.errorStats).toBeNull();
    expect(result.current.errorAlerts).toBeNull();
  });

  it('debe manejar errores de stats correctamente', async () => {
    fetchSpy.mockImplementation((url) => {
      if (String(url).includes('dashboard-stats')) {
        return Promise.resolve(
          new Response(JSON.stringify({ error: 'Server error' }), {
            status: 500,
            statusText: 'Internal Server Error',
          })
        );
      }
      if (String(url).includes('alertas-urgentes')) {
        return Promise.resolve(
          new Response(JSON.stringify({ data: [] }), {
            status: 200,
          })
        );
      }
      return Promise.resolve(new Response('{}', { status: 200 }));
    });

    const { useEquipoStats } = await import('../useEquipoStats');
    const store = createMockStore();
    const { result } = renderHook(() => useEquipoStats(), {
      wrapper: createWrapper(store),
    });

    await waitFor(() => {
      expect(result.current.isLoadingStats).toBe(false);
    });

    expect(result.current.errorStats).toContain('500');
    expect(result.current.stats).toBeNull();
  });

  it('debe manejar errores de alertas correctamente', async () => {
    fetchSpy.mockImplementation((url) => {
      if (String(url).includes('dashboard-stats')) {
        return Promise.resolve(
          new Response(JSON.stringify({ data: { totalEquipos: 5, equiposVigentes: 3, equiposProximos: 1, equiposVencidos: 1, equiposFaltantes: 0, compliancePercentage: 60 } }), {
            status: 200,
          })
        );
      }
      if (String(url).includes('alertas-urgentes')) {
        return Promise.resolve(
          new Response(JSON.stringify({ error: 'Unauthorized' }), {
            status: 401,
          })
        );
      }
      return Promise.resolve(new Response('{}', { status: 200 }));
    });

    const { useEquipoStats } = await import('../useEquipoStats');
    const store = createMockStore();
    const { result } = renderHook(() => useEquipoStats(), {
      wrapper: createWrapper(store),
    });

    await waitFor(() => {
      expect(result.current.isLoadingAlerts).toBe(false);
    });

    expect(result.current.errorAlerts).toContain('401');
    expect(result.current.alerts).toEqual([]);
  });

  it('debe manejar errores de red en stats', async () => {
    fetchSpy.mockImplementation((url) => {
      if (String(url).includes('dashboard-stats')) {
        return Promise.reject(new Error('Network failure'));
      }
      if (String(url).includes('alertas-urgentes')) {
        return Promise.resolve(
          new Response(JSON.stringify({ data: [] }), {
            status: 200,
          })
        );
      }
      return Promise.resolve(new Response('{}', { status: 200 }));
    });

    const { useEquipoStats } = await import('../useEquipoStats');
    const store = createMockStore();
    const { result } = renderHook(() => useEquipoStats(), {
      wrapper: createWrapper(store),
    });

    await waitFor(() => {
      expect(result.current.isLoadingStats).toBe(false);
    });

    expect(result.current.errorStats).toBe('Network failure');
    expect(result.current.stats).toBeNull();
  });

  it('refetchStats debe recargar las estadísticas', async () => {
    const initialStats = {
      totalEquipos: 5,
      equiposVigentes: 3,
      equiposProximos: 1,
      equiposVencidos: 1,
      equiposFaltantes: 0,
      compliancePercentage: 60,
    };

    const updatedStats = {
      ...initialStats,
      totalEquipos: 6,
      compliancePercentage: 65,
    };

    let callCount = 0;
    fetchSpy.mockImplementation((url) => {
      if (String(url).includes('dashboard-stats')) {
        callCount++;
        const data = callCount === 1 ? initialStats : updatedStats;
        return Promise.resolve(
          new Response(JSON.stringify({ data }), {
            status: 200,
          })
        );
      }
      if (String(url).includes('alertas-urgentes')) {
        return Promise.resolve(
          new Response(JSON.stringify({ data: [] }), {
            status: 200,
          })
        );
      }
      return Promise.resolve(new Response('{}', { status: 200 }));
    });

    const { useEquipoStats } = await import('../useEquipoStats');
    const store = createMockStore();
    const { result } = renderHook(() => useEquipoStats(), {
      wrapper: createWrapper(store),
    });

    await waitFor(() => {
      expect(result.current.isLoadingStats).toBe(false);
    });

    expect(result.current.stats?.totalEquipos).toBe(5);

    // Llamar a refetchStats
    await act(async () => {
      await result.current.refetchStats();
    });

    await waitFor(() => {
      expect(result.current.stats?.totalEquipos).toBe(6);
    });
  });

  it('refetchAlerts debe recargar las alertas', async () => {
    const initialAlerts = [
      { id: '1', type: 'VENCIMIENTO', message: 'Alerta 1' },
    ];

    const updatedAlerts = [
      ...initialAlerts,
      { id: '2', type: 'FALTANTE', message: 'Alerta 2' },
    ];

    let callCount = 0;
    fetchSpy.mockImplementation((url) => {
      if (String(url).includes('dashboard-stats')) {
        return Promise.resolve(
          new Response(JSON.stringify({ data: { totalEquipos: 5, equiposVigentes: 3, equiposProximos: 1, equiposVencidos: 1, equiposFaltantes: 0, compliancePercentage: 60 } }), {
            status: 200,
          })
        );
      }
      if (String(url).includes('alertas-urgentes')) {
        callCount++;
        const data = callCount === 1 ? initialAlerts : updatedAlerts;
        return Promise.resolve(
          new Response(JSON.stringify({ data }), {
            status: 200,
          })
        );
      }
      return Promise.resolve(new Response('{}', { status: 200 }));
    });

    const { useEquipoStats } = await import('../useEquipoStats');
    const store = createMockStore();
    const { result } = renderHook(() => useEquipoStats(), {
      wrapper: createWrapper(store),
    });

    await waitFor(() => {
      expect(result.current.isLoadingAlerts).toBe(false);
    });

    expect(result.current.alerts).toHaveLength(1);

    // Llamar a refetchAlerts
    await act(async () => {
      await result.current.refetchAlerts();
    });

    await waitFor(() => {
      expect(result.current.alerts).toHaveLength(2);
    });
  });

  it('debe construir authHeaders correctamente', async () => {
    fetchSpy.mockResolvedValue(
      new Response(JSON.stringify({ data: [] }), {
        status: 200,
      })
    );

    const { useEquipoStats } = await import('../useEquipoStats');
    const store = createMockStore('my-token', 42);
    renderHook(() => useEquipoStats(), {
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

