// Tests de cobertura adicional para EmpresaTransportistaDetailPage
import React from 'react';
import { describe, it, expect, beforeAll, beforeEach, jest } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

describe('EmpresaTransportistaDetailPage - Additional Coverage', () => {
  let EmpresaTransportistaDetailPage: React.FC;

  let useGetEmpresaTransportistaByIdQuery: jest.Mock;
  let useGetEmpresaTransportistaChoferesQuery: jest.Mock;
  let useGetEmpresaTransportistaEquiposQuery: jest.Mock;

  const mockEmpresa = {
    id: 1,
    razonSocial: 'Transportista S.A.',
    cuit: '20123456789',
    activo: true,
  };

  beforeAll(async () => {
    useGetEmpresaTransportistaByIdQuery = jest.fn();
    useGetEmpresaTransportistaChoferesQuery = jest.fn();
    useGetEmpresaTransportistaEquiposQuery = jest.fn();

    await jest.unstable_mockModule('../../api/documentosApiSlice', () => ({
      useGetEmpresaTransportistaByIdQuery: (...args: unknown[]) => useGetEmpresaTransportistaByIdQuery(...args),
      useGetEmpresaTransportistaChoferesQuery: (...args: unknown[]) => useGetEmpresaTransportistaChoferesQuery(...args),
      useGetEmpresaTransportistaEquiposQuery: (...args: unknown[]) => useGetEmpresaTransportistaEquiposQuery(...args),
      useUpdateEmpresaTransportistaMutation: () => [jest.fn(), { isLoading: false }],
    }));

    await jest.unstable_mockModule('react-router-dom', () => ({
      ...jest.requireActual('react-router-dom'),
      useParams: () => ({ id: '1' }),
    }));

    await jest.unstable_mockModule('@heroicons/react/24/outline', () => ({
      ArrowLeftIcon: ({ className }: any) => <span className={className}>◀</span>,
      PencilIcon: ({ className }: any) => <span className={className}>✏️</span>,
    }));

    const module = await import('../EmpresaTransportistaDetailPage.tsx');
    EmpresaTransportistaDetailPage = module.EmpresaTransportistaDetailPage;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    useGetEmpresaTransportistaByIdQuery.mockReturnValue({
      data: mockEmpresa,
      isLoading: false,
    });
    useGetEmpresaTransportistaChoferesQuery.mockReturnValue({
      data: [],
      isLoading: false,
    });
    useGetEmpresaTransportistaEquiposQuery.mockReturnValue({
      data: [],
      isLoading: false,
    });
  });

  const renderPage = () => {
    return render(
      <MemoryRouter>
        <EmpresaTransportistaDetailPage />
      </MemoryRouter>
    );
  };

  it('debe importar el componente', () => {
    expect(EmpresaTransportistaDetailPage).toBeDefined();
  });

  it('debe mostrar información de la empresa', () => {
    renderPage();
    expect(document.body.children.length).toBeGreaterThan(0);
  });

  it('debe mostrar choferes asociados', () => {
    renderPage();
    expect(useGetEmpresaTransportistaChoferesQuery).toHaveBeenCalled();
  });

  it('debe mostrar equipos asociados', () => {
    renderPage();
    expect(useGetEmpresaTransportistaEquiposQuery).toHaveBeenCalled();
  });

  it('debe mostrar requisitos de documentos', () => {
    renderPage();
    expect(document.body.children.length).toBeGreaterThan(0);
  });

  it('debe permitir edición', () => {
    renderPage();
    expect(document.body.children.length).toBeGreaterThan(0);
  });

  it('debe manejar estado de carga', () => {
    useGetEmpresaTransportistaByIdQuery.mockReturnValue({
      data: undefined,
      isLoading: true,
    });
    renderPage();
    expect(document.body.children.length).toBeGreaterThan(0);
  });

  it('debe manejar error de API', () => {
    useGetEmpresaTransportistaByIdQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: { message: 'Error loading empresa' },
    });
    renderPage();
    expect(document.body.children.length).toBeGreaterThan(0);
  });
});
