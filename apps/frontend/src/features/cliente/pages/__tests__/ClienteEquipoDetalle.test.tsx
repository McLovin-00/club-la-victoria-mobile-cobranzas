// Tests de `ClienteEquipoDetalle`: loading/error + preview/download usando fetch/URL (Jest ESM).
import React from 'react';
import { describe, it, expect, beforeAll, beforeEach, jest } from '@jest/globals';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

describe('ClienteEquipoDetalle', () => {
  let useGetPortalClienteEquipoDetalleQuery = jest.fn();
  let goBack = jest.fn();

  let ClienteEquipoDetalle: React.FC;
  let MemoryRouter: typeof import('react-router-dom').MemoryRouter;
  let Routes: typeof import('react-router-dom').Routes;
  let Route: typeof import('react-router-dom').Route;

  const renderRoute = () =>
    render(
      <MemoryRouter initialEntries={['/cliente/equipos/1']}>
        <Routes>
          <Route path="/cliente/equipos/:id" element={<ClienteEquipoDetalle />} />
        </Routes>
      </MemoryRouter>
    );

  beforeAll(async () => {
    await jest.unstable_mockModule('../../../documentos/api/documentosApiSlice', () => ({
      useGetPortalClienteEquipoDetalleQuery: (...args: any[]) => useGetPortalClienteEquipoDetalleQuery(...args),
    }));

    await jest.unstable_mockModule('../../../../hooks/useRoleBasedNavigation', () => ({
      useRoleBasedNavigation: () => ({ goBack }),
    }));

    ({ default: ClienteEquipoDetalle } = await import('../ClienteEquipoDetalle'));
    ({ MemoryRouter, Routes, Route } = await import('react-router-dom'));
  });

  beforeEach(() => {
    useGetPortalClienteEquipoDetalleQuery = jest.fn();
    goBack = jest.fn();
    const ls: any = window.localStorage as any;
    if (ls?.getItem?.mockImplementation) {
      ls.getItem.mockImplementation((k: string) => (k === 'token' ? 'token-x' : null));
    } else {
      ls.getItem = jest.fn((k: string) => (k === 'token' ? 'token-x' : null));
    }
    (globalThis as any).alert = jest.fn();
    (globalThis as any).fetch = jest.fn();
    // jsdom no implementa createObjectURL por defecto.
    Object.defineProperty(URL, 'createObjectURL', {
      value: jest.fn(() => 'blob:preview'),
      writable: true,
    });
    Object.defineProperty(URL, 'revokeObjectURL', {
      value: jest.fn(() => undefined),
      writable: true,
    });
  });

  it('muestra loader cuando isLoading=true', () => {
    useGetPortalClienteEquipoDetalleQuery.mockReturnValue({ data: undefined, isLoading: true, error: undefined });
    renderRoute();
    expect(screen.getByText('Cargando detalle...')).toBeInTheDocument();
  });

  it('muestra error y permite volver cuando no hay equipo', () => {
    useGetPortalClienteEquipoDetalleQuery.mockReturnValue({ data: undefined, isLoading: false, error: new Error('x') });
    renderRoute();
    expect(screen.getByText('No se pudo cargar el detalle del equipo.')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Volver'));
    expect(goBack).toHaveBeenCalledTimes(1);
  });

  it('preview abre modal (iframe) y cerrar revoca object URL; descarga usa <a>.click()', async () => {
    const equipo = {
      camion: { patente: 'AB123CD', marca: 'Ford', modelo: 'F-100' },
      acoplado: { patente: 'ZZ999ZZ' },
      chofer: { nombre: 'Juan', apellido: 'P', dni: '123' },
      empresaTransportista: { razonSocial: 'Transp SA' },
      asignadoDesde: '2026-01-01T00:00:00.000Z',
    };
    const documentos = [
      {
        id: 7,
        templateName: 'DNI',
        entityType: 'CHOFER',
        entityName: 'Juan',
        estado: 'VIGENTE',
        descargable: true,
        expiresAt: '2026-02-01T00:00:00.000Z',
      },
      {
        id: 8,
        templateName: 'Licencia',
        entityType: 'CHOFER',
        entityName: 'Juan',
        estado: 'VENCIDO',
        descargable: true,
        expiresAt: '2025-01-01T00:00:00.000Z',
      },
    ];

    useGetPortalClienteEquipoDetalleQuery.mockReturnValue({
      data: { equipo, documentos, hayDocumentosDescargables: true },
      isLoading: false,
      error: undefined,
    });

    const linkMock: any = { href: '', download: '', click: jest.fn() };
    const originalCreateElement = document.createElement.bind(document);
    jest.spyOn(document, 'createElement').mockImplementation((tagName: any) => {
      if (tagName === 'a') return linkMock;
      return originalCreateElement(tagName);
    });

    (globalThis as any).fetch = jest.fn(async () => ({
      ok: true,
      blob: async () => new Blob(['x'], { type: 'application/pdf' }),
    }));

    renderRoute();
    expect(screen.getByText('Equipo AB123CD')).toBeInTheDocument();
    expect(screen.getByText('Descargar todo (ZIP)')).toBeInTheDocument();

    fireEvent.click(screen.getAllByTitle('Ver documento')[0]);
    await waitFor(() => expect(screen.getByText('DNI')).toBeInTheDocument());
    expect(URL.createObjectURL).toHaveBeenCalled();

    fireEvent.click(screen.getAllByTitle('Descargar documento')[0]);
    await waitFor(() => expect(linkMock.click).toHaveBeenCalledTimes(1));
  });
});
