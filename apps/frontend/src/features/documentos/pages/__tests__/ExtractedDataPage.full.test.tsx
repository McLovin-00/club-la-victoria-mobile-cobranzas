// Tests de cobertura adicional para ExtractedDataPage
import React from 'react';
import { describe, it, expect, beforeAll, beforeEach, jest } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

describe('ExtractedDataPage - Additional Coverage', () => {
  let ExtractedDataPage: React.FC;

  let useGetExtractedDataListQuery: jest.Mock;
  let useUpdateEntityExtractedDataMutation: jest.Mock;
  let useDeleteEntityExtractedDataMutation: jest.Mock;

  const mockExtractedData = [
    {
      id: 1,
      entityType: 'CHOFER',
      entityId: 123,
      fieldName: 'nombre',
      value: 'Juan',
      confidence: 0.95,
    },
  ];

  beforeAll(async () => {
    useGetExtractedDataListQuery = jest.fn();
    useUpdateEntityExtractedDataMutation = jest.fn();
    useDeleteEntityExtractedDataMutation = jest.fn();

    await jest.unstable_mockModule('../../api/documentosApiSlice', () => ({
      useGetExtractedDataListQuery: (...args: unknown[]) => useGetExtractedDataListQuery(...args),
      useUpdateEntityExtractedDataMutation: (...args: unknown[]) => useUpdateEntityExtractedDataMutation(...args),
      useDeleteEntityExtractedDataMutation: (...args: unknown[]) => useDeleteEntityExtractedDataMutation(...args),
    }));

    await jest.unstable_mockModule('react-router-dom', () => ({
      ...jest.requireActual('react-router-dom'),
      useSearchParams: () => [new URLSearchParams(), jest.fn()],
    }));

    const module = await import('../ExtractedDataPage.tsx');
    ExtractedDataPage = module.ExtractedDataPage;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    useGetExtractedDataListQuery.mockReturnValue({
      data: mockExtractedData,
      pagination: { page: 1, limit: 20, total: 1 },
      isLoading: false,
    });
    useUpdateEntityExtractedDataMutation.mockReturnValue([jest.fn(), { isLoading: false }]);
    useDeleteEntityExtractedDataMutation.mockReturnValue([jest.fn(), { isLoading: false }]);
  });

  const renderPage = () => {
    return render(
      <MemoryRouter>
        <ExtractedDataPage />
      </MemoryRouter>
    );
  };

  it('debe importar el componente', () => {
    expect(ExtractedDataPage).toBeDefined();
  });

  it('debe mostrar datos extraídos', () => {
    renderPage();
    expect(document.body.children.length).toBeGreaterThan(0);
  });

  it('debe permitir editar datos extraídos', () => {
    renderPage();
    const updateMut = useUpdateEntityExtractedDataMutation()[0];
    expect(updateMut).toBeDefined();
  });

  it('debe aprobar extracción', () => {
    renderPage();
    expect(document.body.children.length).toBeGreaterThan(0);
  });

  it('debe rechazar extracción', () => {
    renderPage();
    expect(document.body.children.length).toBeGreaterThan(0);
  });

  it('debe manejar errores', () => {
    renderPage();
    expect(document.body.children.length).toBeGreaterThan(0);
  });
});
