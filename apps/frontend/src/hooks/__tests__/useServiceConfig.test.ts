/**
 * Tests para useServiceConfig, useIsServiceEnabled, useServiceFlags hooks
 */
import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { apiSlice } from '../../store/apiSlice';
import { useServiceConfig, useIsServiceEnabled, useServiceFlags, ServiceConfig } from '../useServiceConfig';

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

describe('useServiceConfig', () => {
  let fetchSpy: jest.SpiedFunction<typeof global.fetch>;

  beforeEach(() => {
    fetchSpy = jest.spyOn(global, 'fetch');
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  it('retorna configuración por defecto mientras carga', () => {
    fetchSpy.mockImplementation(() => new Promise(() => {})); // Never resolves

    const store = createMockStore();
    const { result } = renderHook(() => useServiceConfig(), {
      wrapper: createWrapper(store),
    });

    expect(result.current.isLoading).toBe(true);
    expect(result.current.config).toBeDefined();
    expect(result.current.config.documentos).toBeDefined();
  });

  it('retorna config y summary cuando la API responde', async () => {
    const mockResponse = {
      services: {
        documentos: {
          enabled: true,
          name: 'Documentos',
          description: 'Gestión documental',
        },
      },
      summary: {
        totalEnabled: 1,
        enabledServices: ['Documentos'],
        coreServicesOnly: true,
      },
      timestamp: '2024-01-01T00:00:00Z',
      version: '1.0.0',
    };

    fetchSpy.mockResolvedValueOnce(
      new Response(JSON.stringify(mockResponse), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    const store = createMockStore();
    const { result } = renderHook(() => useServiceConfig(), {
      wrapper: createWrapper(store),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.config.documentos.enabled).toBe(true);
    expect(result.current.summary.totalEnabled).toBe(1);
    expect(result.current.timestamp).toBe('2024-01-01T00:00:00Z');
    expect(result.current.version).toBe('1.0.0');
  });

  it('getEnabledServices retorna lista de servicios habilitados', async () => {
    const mockResponse = {
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
    };

    fetchSpy.mockResolvedValueOnce(
      new Response(JSON.stringify(mockResponse), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    const store = createMockStore();
    const { result } = renderHook(() => useServiceConfig(), {
      wrapper: createWrapper(store),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.getEnabledServices()).toEqual(['Documentos']);
  });

  it('hasEnabledServices retorna true cuando hay servicios habilitados', async () => {
    const mockResponse = {
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
    };

    fetchSpy.mockResolvedValueOnce(
      new Response(JSON.stringify(mockResponse), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    const store = createMockStore();
    const { result } = renderHook(() => useServiceConfig(), {
      wrapper: createWrapper(store),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.hasEnabledServices()).toBe(true);
  });

  it('retorna configuración por defecto en caso de error', async () => {
    fetchSpy.mockRejectedValueOnce(new Error('Network error'));

    const store = createMockStore();
    const { result } = renderHook(() => useServiceConfig(), {
      wrapper: createWrapper(store),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Debería tener configuración por defecto
    expect(result.current.config).toBeDefined();
    expect(result.current.config.documentos).toBeDefined();
  });
});

describe('useIsServiceEnabled', () => {
  let fetchSpy: jest.SpiedFunction<typeof global.fetch>;

  beforeEach(() => {
    fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({
        services: {
          documentos: { enabled: true, name: 'Documentos', description: '' },
        },
        summary: { totalEnabled: 1, enabledServices: ['Documentos'], coreServicesOnly: true },
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

  it('retorna true para servicio habilitado', async () => {
    const store = createMockStore();
    const { result } = renderHook(() => useIsServiceEnabled('documentos'), {
      wrapper: createWrapper(store),
    });

    await waitFor(() => {
      expect(result.current).toBe(true);
    });
  });
});

describe('useServiceFlags', () => {
  let fetchSpy: jest.SpiedFunction<typeof global.fetch>;

  beforeEach(() => {
    fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({
        services: {
          documentos: { enabled: true, name: 'Documentos', description: '' },
        },
        summary: { totalEnabled: 1, enabledServices: ['Documentos'], coreServicesOnly: true },
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

  it('retorna objeto con flags de servicios', async () => {
    const store = createMockStore();
    const { result } = renderHook(() => useServiceFlags(), {
      wrapper: createWrapper(store),
    });

    await waitFor(() => {
      expect(result.current.documentos).toBe(true);
    });
  });
});
