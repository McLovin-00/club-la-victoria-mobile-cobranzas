// Tests de `ClienteDashboard`: flujo "Listar Todos", búsqueda masiva y descarga ZIP (Jest ESM).
import React from 'react';
import { describe, it, expect, beforeAll, beforeEach, jest } from '@jest/globals';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

describe('ClienteDashboard', () => {
  let useGetPortalClienteEquiposQuery = jest.fn();
  let showToast = jest.fn();

  let ClienteDashboard: React.FC;
  let MemoryRouter: typeof import('react-router-dom').MemoryRouter;
  let Routes: typeof import('react-router-dom').Routes;
  let Route: typeof import('react-router-dom').Route;

  const renderWithRoutes = () =>
    render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/" element={<ClienteDashboard />} />
          <Route path="/cliente/equipos/:id" element={<div>detalle</div>} />
        </Routes>
      </MemoryRouter>
    );

  beforeAll(async () => {
    await jest.unstable_mockModule('../../../documentos/api/documentosApiSlice', () => ({
      useGetPortalClienteEquiposQuery: (...args: any[]) => useGetPortalClienteEquiposQuery(...args),
    }));

    await jest.unstable_mockModule('../../../../components/ui/Toast.utils', () => ({
      showToast: (...args: any[]) => showToast(...args),
    }));

    ({ default: ClienteDashboard } = await import('../ClienteDashboard'));
    ({ MemoryRouter, Routes, Route } = await import('react-router-dom'));
  });

  beforeEach(() => {
    useGetPortalClienteEquiposQuery = jest.fn();
    showToast = jest.fn();
    const ls: any = window.localStorage as any;
    try {
      ls?.setItem?.('token', 'token-x');
    } catch {
      // ignore
    }
    if (ls?.getItem?.mockImplementation) {
      ls.getItem.mockImplementation((k: string) => (k === 'token' ? 'token-x' : null));
    } else {
      ls.getItem = jest.fn((k: string) => (k === 'token' ? 'token-x' : null));
    }
  });

  it('renderiza estado inicial y al listar todos muestra resultados + navega al detalle', async () => {
    useGetPortalClienteEquiposQuery.mockImplementation((_args: any, opts: any) => {
      if (opts?.skip) return { data: undefined, isLoading: false, isFetching: false, error: undefined };
      return {
        data: {
          equipos: [
            {
              id: 10,
              estadoCompliance: 'VIGENTE',
              camion: { patente: 'AB123CD' },
              acoplado: { patente: 'ZZ999ZZ' },
              chofer: { nombre: 'Juan', apellido: 'P', dni: '123' },
              empresaTransportista: { razonSocial: 'Transp SA' },
              proximoVencimiento: '2026-01-10T00:00:00.000Z',
            },
          ],
          resumen: { total: 1, vigentes: 1, proximosVencer: 0, vencidos: 0, incompletos: 0 },
          pagination: { page: 1, limit: 10, total: 1, totalPages: 1, hasNext: false, hasPrev: false },
        },
        isLoading: false,
        isFetching: false,
        error: undefined,
      };
    });

    renderWithRoutes();

    expect(screen.getByText('Busca o lista tus equipos asignados')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Listar Todos'));

    await waitFor(() => {
      expect(screen.getByText(/Mostrando 1 - 1 de 1 equipos/i)).toBeInTheDocument();
    });
    expect(screen.getByText('AB123CD / ZZ999ZZ')).toBeInTheDocument();

    // Click en card -> navega al detalle
    fireEvent.click(screen.getByText('AB123CD / ZZ999ZZ'));
    expect(screen.getByText('detalle')).toBeInTheDocument();
  });

  it('descarga ZIP usando form POST (sin blob) y muestra toast', async () => {
    useGetPortalClienteEquiposQuery.mockImplementation((_args: any, opts: any) => {
      if (opts?.skip) return { data: undefined, isLoading: false, isFetching: false, error: undefined };
      return {
        data: {
          equipos: [{ id: 10, estadoCompliance: 'VIGENTE', camion: { patente: 'AB123CD' } }],
          resumen: { total: 1, vigentes: 1, proximosVencer: 0, vencidos: 0, incompletos: 0 },
          pagination: { page: 1, limit: 10, total: 1, totalPages: 1, hasNext: false, hasPrev: false },
        },
        isLoading: false,
        isFetching: false,
        error: undefined,
      };
    });

    // Interceptar submit del form SIN romper el render de React.
    const originalCreateElement = document.createElement.bind(document);
    const submitSpy = jest.fn();
    jest.spyOn(document, 'createElement').mockImplementation((tagName: any) => {
      const el = originalCreateElement(tagName);
      if (tagName === 'form') {
        (el as any).submit = submitSpy;
      }
      return el;
    });

    renderWithRoutes();
    fireEvent.click(screen.getByText('Listar Todos'));

    await waitFor(() => {
      expect(screen.getByText('Descargar ZIP (1 equipos)')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Descargar ZIP (1 equipos)'));

    expect(showToast).toHaveBeenCalledWith('Iniciando descarga ZIP de 1 equipos...');
    expect(submitSpy).toHaveBeenCalledTimes(1);
  });

  it('búsqueda masiva arma query con "|" y ejecuta fetch', async () => {
    useGetPortalClienteEquiposQuery.mockImplementation((_args: any, opts: any) => {
      if (opts?.skip) return { data: undefined, isLoading: false, isFetching: false, error: undefined };
      return {
        data: {
          equipos: [],
          resumen: { total: 0, vigentes: 0, proximosVencer: 0, vencidos: 0, incompletos: 0 },
          pagination: { page: 1, limit: 10, total: 0, totalPages: 0, hasNext: false, hasPrev: false },
        },
        isLoading: false,
        isFetching: false,
        error: undefined,
      };
    });

    renderWithRoutes();

    fireEvent.click(screen.getByText('Búsqueda Masiva'));
    fireEvent.change(screen.getByPlaceholderText(/Pegá una lista/i), {
      target: { value: '34288054\nAB123CD' },
    });
    fireEvent.click(screen.getByText('Buscar Lista'));

    await waitFor(() => {
      const calls = useGetPortalClienteEquiposQuery.mock.calls.filter((c: any[]) => c?.[1]?.skip === false);
      expect(calls.length).toBeGreaterThan(0);
      expect(calls.at(-1)?.[0]).toEqual(expect.objectContaining({ search: '34288054|AB123CD' }));
    });
  });
});
