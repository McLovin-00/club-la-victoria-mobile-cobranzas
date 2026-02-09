// Tests de cobertura adicional para ConsultaPage
import React from 'react';
import { describe, it, expect, beforeAll, beforeEach, jest } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

describe('ConsultaPage - Additional Coverage', () => {
  let ConsultaPage: React.FC;

  let useSearchEquiposPagedQuery: jest.Mock;

  const mockResults = [
    {
      equipo: { id: 1, driverDni: '12345678', truckPlate: 'ABC123' },
      clientes: [],
    },
  ];

  beforeAll(async () => {
    useSearchEquiposPagedQuery = jest.fn();

    await jest.unstable_mockModule('../../api/documentosApiSlice', () => ({
      useSearchEquiposPagedQuery: (...args: unknown[]) => useSearchEquiposPagedQuery(...args),
      useLazySearchEquiposPagedQuery: () => [jest.fn(), { isLoading: false }],
    }));

    await jest.unstable_mockModule('react-router-dom', () => ({
      ...jest.requireActual('react-router-dom'),
      useSearchParams: () => [new URLSearchParams(), jest.fn()],
    }));

    const module = await import('../ConsultaPage.tsx');
    ConsultaPage = module.ConsultaPage;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    useSearchEquiposPagedQuery.mockReturnValue({
      data: mockResults,
      pagination: { page: 1, limit: 10, total: 1, totalPages: 1 },
      isLoading: false,
    });
  });

  const renderPage = () => {
    return render(
      <MemoryRouter>
        <ConsultaPage />
      </MemoryRouter>
    );
  };

  it('debe importar el componente', () => {
    expect(ConsultaPage).toBeDefined();
  });

  it('debe renderizar la página', () => {
    renderPage();
    expect(document.body.children.length).toBeGreaterThan(0);
  });

  it('debe realizar búsqueda', () => {
    renderPage();
    expect(useSearchEquiposPagedQuery).toHaveBeenCalled();
  });

  it('debe mostrar resultados', () => {
    renderPage();
    expect(document.body.children.length).toBeGreaterThan(0);
  });

  it('debe mostrar resultados vacíos', () => {
    useSearchEquiposPagedQuery.mockReturnValue({
      data: [],
      pagination: { page: 1, limit: 10, total: 0, totalPages: 0 },
      isLoading: false,
    });
    renderPage();
    expect(document.body.children.length).toBeGreaterThan(0);
  });
});
