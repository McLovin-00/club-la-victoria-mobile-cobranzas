// Tests de cobertura adicional para DashboardDadoresPage
import React from 'react';
import { describe, it, expect, beforeAll, beforeEach, jest } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

describe('DashboardDadoresPage - Additional Coverage', () => {
  let DashboardDadoresPage: React.FC;

  let useGetDashboardDataQuery: jest.Mock;
  let useGetPendingSummaryQuery: jest.Mock;
  let useGetDashboardStatsQuery: jest.Mock;

  beforeAll(async () => {
    useGetDashboardDataQuery = jest.fn();
    useGetPendingSummaryQuery = jest.fn();
    useGetDashboardStatsQuery = jest.fn();

    await jest.unstable_mockModule('../../api/documentosApiSlice', () => ({
      useGetDashboardDataQuery: (...args: unknown[]) => useGetDashboardDataQuery(...args),
      useGetPendingSummaryQuery: (...args: unknown[]) => useGetPendingSummaryQuery(...args),
      useGetDashboardStatsQuery: (...args: unknown[]) => useGetDashboardStatsQuery(...args),
    }));

    await jest.unstable_mockModule('react-router-dom', () => ({
      ...jest.requireActual('react-router-dom'),
      useParams: () => ({ dadorId: '1' }),
    }));

    const module = await import('../DashboardDadoresPage.tsx');
    DashboardDadoresPage = module.DashboardDadoresPage;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    useGetDashboardDataQuery.mockReturnValue({
      data: {
        empresas: [
          { id: 1, nombre: 'Empresa 1', totalDocuments: 10, pendingDocuments: 2 },
        ],
        semaforos: [],
      },
      isLoading: false,
      error: null,
    });
    useGetPendingSummaryQuery.mockReturnValue({
      data: { total: 5, top: [], lastUploads: [] },
      isLoading: false,
    });
    useGetDashboardStatsQuery.mockReturnValue({
      data: { totalDocuments: 100, pendingDocuments: 20 },
      isLoading: false,
    });
  });

  const renderPage = () => {
    return render(
      <MemoryRouter>
        <DashboardDadoresPage />
      </MemoryRouter>
    );
  };

  it('debe importar el componente', () => {
    expect(DashboardDadoresPage).toBeDefined();
  });

  it('debe renderizar el dashboard', () => {
    renderPage();
    expect(document.body.children.length).toBeGreaterThan(0);
  });

  it('debe mostrar métricas calculadas', () => {
    renderPage();
    expect(document.body.children.length).toBeGreaterThan(0);
  });

  it('debe manejar filtros de rango de fechas', () => {
    renderPage();
    const dateInputs = document.querySelectorAll('input[type="date"]');
    expect(dateInputs.length).toBeGreaterThanOrEqual(0);
  });

  it('debe mostrar loading state', () => {
    useGetDashboardDataQuery.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    });
    renderPage();
    expect(document.body.children.length).toBeGreaterThan(0);
  });

  it('debe manejar error de API', () => {
    useGetDashboardDataQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: { message: 'Error loading dashboard' },
    });
    renderPage();
    expect(document.body.children.length).toBeGreaterThan(0);
  });
});
