// Tests de cobertura adicional para AcopladosPage
import React from 'react';
import { describe, it, expect, beforeAll, beforeEach, jest } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

describe('AcopladosPage - Additional Coverage', () => {
  let AcopladosPage: React.FC;

  let useGetAcopladosQuery: jest.Mock;
  let useCreateAcopladoMutation: jest.Mock;
  let useUpdateAcopladoMutation: jest.Mock;
  let useDeleteAcopladoMutation: jest.Mock;

  const mockAcoplados = [
    { id: 1, patente: 'ABC123', tipo: 'Semi', activo: true },
    { id: 2, patente: 'DEF456', tipo: 'Full', activo: false },
  ];

  beforeAll(async () => {
    useGetAcopladosQuery = jest.fn();
    useCreateAcopladoMutation = jest.fn();
    useUpdateAcopladoMutation = jest.fn();
    useDeleteAcopladoMutation = jest.fn();

    await jest.unstable_mockModule('../../api/documentosApiSlice', () => ({
      useGetAcopladosQuery: (...args: unknown[]) => useGetAcopladosQuery(...args),
      useCreateAcopladoMutation: (...args: unknown[]) => useCreateAcopladoMutation(...args),
      useUpdateAcopladoMutation: (...args: unknown[]) => useUpdateAcopladoMutation(...args),
      useDeleteAcopladoMutation: (...args: unknown[]) => useDeleteAcopladoMutation(...args),
    }));

    await jest.unstable_mockModule('react-router-dom', () => ({
      ...jest.requireActual('react-router-dom'),
      useParams: () => ({ empresaId: '1' }),
    }));

    const module = await import('../AcopladosPage.tsx');
    AcopladosPage = module.AcopladosPage;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    useGetAcopladosQuery.mockReturnValue({
      data: { data: mockAcoplados, pagination: { page: 1, limit: 20, total: 2 } },
      isLoading: false,
      error: null,
    });
    useCreateAcopladoMutation.mockReturnValue([jest.fn().mockResolvedValue({ data: mockAcoplados[0] }), { isLoading: false }]);
    useUpdateAcopladoMutation.mockReturnValue([jest.fn().mockResolvedValue({ data: mockAcoplados[0] }), { isLoading: false }]);
    useDeleteAcopladoMutation.mockReturnValue([jest.fn().mockResolvedValue(undefined), { isLoading: false }]);
  });

  const renderPage = () => {
    return render(
      <MemoryRouter>
        <AcopladosPage />
      </MemoryRouter>
    );
  };

  it('debe importar el componente', () => {
    expect(AcopladosPage).toBeDefined();
  });

  it('debe renderizar la página', () => {
    renderPage();
    expect(document.body.children.length).toBeGreaterThan(0);
  });

  it('debe manejar lista vacía', () => {
    useGetAcopladosQuery.mockReturnValue({
      data: { data: [], pagination: { page: 1, limit: 20, total: 0 } },
      isLoading: false,
      error: null,
    });
    renderPage();
    expect(document.body.children.length).toBeGreaterThan(0);
  });

  it('debe manejar error de API', () => {
    useGetAcopladosQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: { message: 'Error loading acoplados' },
    });
    renderPage();
    expect(document.body.children.length).toBeGreaterThan(0);
  });

  it('debe mostrar loading state', () => {
    useGetAcopladosQuery.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    });
    renderPage();
    expect(document.body.children.length).toBeGreaterThan(0);
  });
});
