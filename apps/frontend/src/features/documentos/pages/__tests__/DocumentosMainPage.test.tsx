import { describe, it, expect, beforeAll, beforeEach, jest } from '@jest/globals';
import { render, screen, fireEvent, within } from '@testing-library/react';

describe('DocumentosMainPage', () => {
  let dadoresResult: any;
  let dashboardResult: any;
  let pendingResult: any;

  let DocumentosMainPage: React.FC;
  let MemoryRouter: typeof import('react-router-dom').MemoryRouter;
  let Routes: typeof import('react-router-dom').Routes;
  let Route: typeof import('react-router-dom').Route;

  beforeAll(async () => {
    await jest.unstable_mockModule('../../api/documentosApiSlice', () => ({
      useGetDadoresQuery: () => dadoresResult,
      useGetDashboardDataQuery: () => dashboardResult,
      useGetPendingSummaryQuery: () => pendingResult,
    }));

    ({ DocumentosMainPage } = await import('../DocumentosMainPage'));
    ({ MemoryRouter, Routes, Route } = await import('react-router-dom'));
  });

  beforeEach(() => {
    jest.clearAllMocks();
    (globalThis as any).fetch = jest.fn(async () => ({ ok: false, json: async () => ({}) }));
    // jsdom puede no exponer AbortController en algunas configuraciones
    if (!(globalThis as any).AbortController) {
      (globalThis as any).AbortController = class AbortControllerMock {
        public signal = {};
        abort() {}
      };
    }

    dadoresResult = { data: { list: [] }, isLoading: false };
    dashboardResult = { data: { semaforos: [] }, isLoading: false };
    pendingResult = { data: { total: 0, top: [] } };
  });

  it('muestra loader si dadoresLoading o dashboardLoading', () => {
    dadoresResult = { data: null, isLoading: true };
    dashboardResult = { data: null, isLoading: false };

    const { container } = render(
      <MemoryRouter initialEntries={['/documentos']}>
        <Routes>
          <Route path="/documentos" element={<DocumentosMainPage />} />
        </Routes>
      </MemoryRouter>
    );

    expect(container.querySelector('.animate-spin')).toBeTruthy();
  });

  it('renderiza tabs, pendientes, resumen y navega al dador', async () => {
    dadoresResult = {
      data: { list: [{ id: 1, razonSocial: 'Dador 1', cuit: '20123456789' }] },
      isLoading: false,
    };
    dashboardResult = {
      data: {
        semaforos: [
          { empresaId: 1, statusCounts: { rojo: [1, 0, 0, 0], amarillo: [0, 2, 0, 0], verde: [3, 0, 0, 0] } },
        ],
      },
      isLoading: false,
    };
    pendingResult = { data: { total: 5, top: [{ templateId: 10, templateName: 'DNI', count: 3 }] } };

    const { unmount } = render(
      <MemoryRouter initialEntries={['/documentos']}>
        <Routes>
          <Route path="/documentos" element={<DocumentosMainPage />} />
          <Route path="/dadores/1/documentos" element={<div>destino-dador</div>} />
          <Route path="/documentos/clientes" element={<div>clientes</div>} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('Gestión de Documentos')).toBeInTheDocument();
    expect(screen.getByText('Pendientes de aprobación')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('DNI')).toBeInTheDocument();

    // Navegar por tab
    fireEvent.click(screen.getByText('Clientes'));
    expect(screen.getByText('clientes')).toBeInTheDocument();

    unmount();

    // Render nuevo para probar navegación al dador sin perder el árbol original
    render(
      <MemoryRouter initialEntries={['/documentos']}>
        <Routes>
          <Route path="/documentos" element={<DocumentosMainPage />} />
          <Route path="/dadores/1/documentos" element={<div>destino-dador</div>} />
        </Routes>
      </MemoryRouter>
    );

    fireEvent.click(screen.getByText('Ver Documentos'));
    expect(screen.getByText('destino-dador')).toBeInTheDocument();
  });
});


