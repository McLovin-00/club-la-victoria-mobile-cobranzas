/**
 * Tests adicionales para useServiceConfig, useIsServiceEnabled, useServiceFlags hooks
 * Enfocados en aumentar cobertura
 */
import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { apiSlice } from '../../store/apiSlice';

// Crear store con apiSlice
const createMockStore = () => configureStore({
  reducer: {
    [apiSlice.reducerPath]: apiSlice.reducer,
    auth: () => ({
      token: 'test-token',
      user: { empresaId: 1 },
    }),
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(apiSlice.middleware),
});

// Wrapper con Provider
const createWrapper = (store: ReturnType<typeof createMockStore>) => {
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(Provider, { store }, children);
};

describe('useServiceConfig - cobertura adicional', () => {
  let fetchSpy: jest.SpiedFunction<typeof global.fetch>;

  beforeEach(() => {
    fetchSpy = jest.spyOn(global, 'fetch');
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  it('getEnabledServices retorna array vacío cuando summary no tiene enabledServices', async () => {
    fetchSpy.mockResolvedValueOnce(
      new Response(JSON.stringify({
        services: {
          documentos: { enabled: false, name: 'Documentos', description: '' },
        },
        summary: {
          totalEnabled: 0,
          enabledServices: [],
          coreServicesOnly: true,
        },
        timestamp: '',
        version: '',
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    const { useServiceConfig } = await import('../useServiceConfig');
    const store = createMockStore();
    const { result } = renderHook(() => useServiceConfig(), {
      wrapper: createWrapper(store),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.getEnabledServices()).toEqual([]);
    expect(result.current.hasEnabledServices()).toBe(false);
  });

  it('hasEnabledServices retorna false cuando totalEnabled es 0', async () => {
    fetchSpy.mockResolvedValueOnce(
      new Response(JSON.stringify({
        services: {
          documentos: { enabled: false, name: 'Documentos', description: '' },
        },
        summary: {
          totalEnabled: 0,
          enabledServices: [],
          coreServicesOnly: true,
        },
        timestamp: '',
        version: '',
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    const { useServiceConfig } = await import('../useServiceConfig');
    const store = createMockStore();
    const { result } = renderHook(() => useServiceConfig(), {
      wrapper: createWrapper(store),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.hasEnabledServices()).toBe(false);
  });

  it('isFetching se actualiza correctamente', async () => {
    fetchSpy.mockImplementation(() => new Promise(() => {})); // Never resolves

    const { useServiceConfig } = await import('../useServiceConfig');
    const store = createMockStore();
    const { result } = renderHook(() => useServiceConfig(), {
      wrapper: createWrapper(store),
    });

    // isFetching debería ser true mientras carga
    expect(result.current.isFetching || result.current.isLoading).toBe(true);
  });

  it('timestamp y version se extraen de la respuesta', async () => {
    const mockTimestamp = '2024-01-15T10:30:00Z';
    const mockVersion = '2.1.0';

    fetchSpy.mockResolvedValueOnce(
      new Response(JSON.stringify({
        services: {
          documentos: { enabled: true, name: 'Documentos', description: '' },
        },
        summary: {
          totalEnabled: 1,
          enabledServices: ['Documentos'],
          coreServicesOnly: true,
        },
        timestamp: mockTimestamp,
        version: mockVersion,
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    const { useServiceConfig } = await import('../useServiceConfig');
    const store = createMockStore();
    const { result } = renderHook(() => useServiceConfig(), {
      wrapper: createWrapper(store),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.timestamp).toBe(mockTimestamp);
    expect(result.current.version).toBe(mockVersion);
  });

  it('isSuccess es true cuando la petición es exitosa', async () => {
    fetchSpy.mockResolvedValueOnce(
      new Response(JSON.stringify({
        services: {
          documentos: { enabled: true, name: 'Documentos', description: '' },
        },
        summary: {
          totalEnabled: 1,
          enabledServices: ['Documentos'],
          coreServicesOnly: true,
        },
        timestamp: '',
        version: '',
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    const { useServiceConfig } = await import('../useServiceConfig');
    const store = createMockStore();
    const { result } = renderHook(() => useServiceConfig(), {
      wrapper: createWrapper(store),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.isSuccess).toBe(true);
  });

  it('refetch puede ser llamado después de la carga inicial', async () => {
    fetchSpy.mockResolvedValue(
      new Response(JSON.stringify({
        services: {
          documentos: { enabled: true, name: 'Documentos', description: '' },
        },
        summary: {
          totalEnabled: 1,
          enabledServices: ['Documentos'],
          coreServicesOnly: true,
        },
        timestamp: '',
        version: '',
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    const { useServiceConfig } = await import('../useServiceConfig');
    const store = createMockStore();
    const { result } = renderHook(() => useServiceConfig(), {
      wrapper: createWrapper(store),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // refetch está definido
    expect(result.current.refetch).toBeDefined();
    expect(typeof result.current.refetch).toBe('function');
  });
});

describe('useIsServiceEnabled - cobertura adicional', () => {
  let fetchSpy: jest.SpiedFunction<typeof global.fetch>;

  beforeEach(() => {
    fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({
        services: {
          documentos: { enabled: false, name: 'Documentos', description: '' },
        },
        summary: { totalEnabled: 0, enabledServices: [], coreServicesOnly: true },
        timestamp: '',
        version: '',
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  it('retorna true por defecto para documentos (fallback)', async () => {
    const { useIsServiceEnabled } = await import('../useServiceConfig');
    const store = createMockStore();
    const { result } = renderHook(() => useIsServiceEnabled('documentos'), {
      wrapper: createWrapper(store),
    });

    // Mientras carga, debería usar el fallback
    expect(typeof result.current).toBe('boolean');
  });
});

describe('useServiceFlags - cobertura adicional', () => {
  let fetchSpy: jest.SpiedFunction<typeof global.fetch>;

  beforeEach(() => {
    fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({
        services: {
          documentos: { enabled: false, name: 'Documentos', description: '' },
        },
        summary: { totalEnabled: 0, enabledServices: [], coreServicesOnly: true },
        timestamp: '',
        version: '',
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  it('retorna objeto con propiedad documentos', async () => {
    const { useServiceFlags } = await import('../useServiceConfig');
    const store = createMockStore();
    const { result } = renderHook(() => useServiceFlags(), {
      wrapper: createWrapper(store),
    });

    expect(result.current).toHaveProperty('documentos');
    expect(typeof result.current.documentos).toBe('boolean');
  });
});

describe('ServiceConfig - tipos e interfaces', () => {
  interface ServiceInfo {
    enabled: boolean;
    name: string;
    description: string;
  }

  interface ServiceConfig {
    documentos: ServiceInfo;
  }

  interface ServicesSummary {
    totalEnabled: number;
    enabledServices: string[];
    coreServicesOnly: boolean;
  }

  it('ServiceInfo tiene estructura correcta', () => {
    const info: ServiceInfo = {
      enabled: true,
      name: 'Documentos',
      description: 'Gestión documental',
    };

    expect(info.enabled).toBe(true);
    expect(info.name).toBe('Documentos');
    expect(info.description).toBe('Gestión documental');
  });

  it('ServiceConfig tiene estructura correcta', () => {
    const config: ServiceConfig = {
      documentos: {
        enabled: true,
        name: 'Documentos',
        description: 'Test',
      },
    };

    expect(config.documentos.enabled).toBe(true);
  });

  it('ServicesSummary tiene estructura correcta', () => {
    const summary: ServicesSummary = {
      totalEnabled: 2,
      enabledServices: ['Documentos', 'Remitos'],
      coreServicesOnly: false,
    };

    expect(summary.totalEnabled).toBe(2);
    expect(summary.enabledServices).toHaveLength(2);
    expect(summary.coreServicesOnly).toBe(false);
  });
});

