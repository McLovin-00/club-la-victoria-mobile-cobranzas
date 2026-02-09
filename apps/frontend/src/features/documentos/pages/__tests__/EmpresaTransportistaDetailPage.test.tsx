// Tests completos de `EmpresaTransportistaDetailPage`: render con choferes y equipos (Jest ESM).
import React from 'react';
import { describe, it, expect, beforeAll, beforeEach, jest } from '@jest/globals';
import { render, screen } from '@testing-library/react';

describe('EmpresaTransportistaDetailPage - render completo con coverage', () => {
  let EmpresaTransportistaDetailPage: React.FC;
  let MemoryRouter: typeof import('react-router-dom').MemoryRouter;
  let Routes: typeof import('react-router-dom').Routes;
  let Route: typeof import('react-router-dom').Route;

  let useGetEmpresasTransportistasQuery: jest.Mock;
  let useGetEmpresaTransportistaChoferesQuery: jest.Mock;
  let useGetEmpresaTransportistaEquiposQuery: jest.Mock;

  const renderWithRouter = (id: string = '123') => {
    const entryPath = `/documentos/empresas-transportistas/${id}`;
    return render(
      <MemoryRouter initialEntries={[entryPath]}>
        <Routes>
          <Route path="/documentos/empresas-transportistas/:id" element={<EmpresaTransportistaDetailPage />} />
        </Routes>
      </MemoryRouter>
    );
  };

  beforeAll(async () => {
    useGetEmpresasTransportistasQuery = jest.fn();
    useGetEmpresaTransportistaChoferesQuery = jest.fn();
    useGetEmpresaTransportistaEquiposQuery = jest.fn();

    await jest.unstable_mockModule('../../api/documentosApiSlice', () => ({
      useGetEmpresasTransportistasQuery: (...args: any[]) => useGetEmpresasTransportistasQuery(...args),
      useGetEmpresaTransportistaChoferesQuery: (...args: any[]) => useGetEmpresaTransportistaChoferesQuery(...args),
      useGetEmpresaTransportistaEquiposQuery: (...args: any[]) => useGetEmpresaTransportistaEquiposQuery(...args),
    }));

    ({ default: EmpresaTransportistaDetailPage } = await import('../EmpresaTransportistaDetailPage'));
    ({ MemoryRouter, Routes, Route } = await import('react-router-dom'));
  });

  beforeEach(() => {
    jest.clearAllMocks();
    useGetEmpresasTransportistasQuery.mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
    });
    useGetEmpresaTransportistaChoferesQuery.mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
    });
    useGetEmpresaTransportistaEquiposQuery.mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
    });
  });

  it('renderiza página con empresa ID y link de volver', () => {
    renderWithRouter('123');
    expect(screen.getByText('Empresa #123')).toBeInTheDocument();
    expect(screen.getByText('← Atrás')).toBeInTheDocument();
    expect(screen.getByText('Choferes')).toBeInTheDocument();
    expect(screen.getByText('Equipos')).toBeInTheDocument();
  });

  it('muestra "Sin choferes" y "Sin equipos" cuando no hay datos', () => {
    renderWithRouter('456');
    expect(screen.getByText('Sin choferes')).toBeInTheDocument();
    expect(screen.getByText('Sin equipos')).toBeInTheDocument();
  });

  it('muestra razón social y CUIT de la empresa', () => {
    useGetEmpresasTransportistasQuery.mockReturnValue({
      data: [{ id: 123, razonSocial: 'Transporte SA', cuit: '20-12345678-9' }],
      isLoading: false,
      error: null,
    });

    renderWithRouter('123');
    expect(screen.getByText('Transporte SA · CUIT 20-12345678-9')).toBeInTheDocument();
  });

  it('muestra "—" cuando empresa no tiene razón social ni CUIT', () => {
    useGetEmpresasTransportistasQuery.mockReturnValue({
      data: [{ id: 123, razonSocial: null, cuit: null }],
      isLoading: false,
      error: null,
    });

    renderWithRouter('123');
    expect(screen.getByText('— · CUIT —')).toBeInTheDocument();
  });

  it('muestra lista de choferes con sus datos', () => {
    useGetEmpresaTransportistaChoferesQuery.mockReturnValue({
      data: [
        { id: 1, nombre: 'Juan', apellido: 'Pérez', dni: '12345678', activo: true },
        { id: 2, nombre: 'María', apellido: 'García', dni: '87654321', activo: false },
      ],
      isLoading: false,
      error: null,
    });

    renderWithRouter('123');
    expect(screen.getByText('Pérez, Juan')).toBeInTheDocument();
    expect(screen.getByText('DNI 12345678 · Activo')).toBeInTheDocument();
    expect(screen.getByText('García, María')).toBeInTheDocument();
    expect(screen.getByText('DNI 87654321 · Inactivo')).toBeInTheDocument();
  });

  it('muestra DNI cuando chofer no tiene apellido', () => {
    useGetEmpresaTransportistaChoferesQuery.mockReturnValue({
      data: [{ id: 1, nombre: 'Carlos', apellido: null, dni: '11111111', activo: true }],
      isLoading: false,
      error: null,
    });

    renderWithRouter('123');
    expect(screen.getByText('11111111')).toBeInTheDocument();
    expect(screen.getByText('DNI 11111111 · Activo')).toBeInTheDocument();
  });

  it('muestra lista de equipos con sus datos', () => {
    useGetEmpresaTransportistaEquiposQuery.mockReturnValue({
      data: [
        { id: 1, driverDniNorm: '12345678', truckPlateNorm: 'AB123CD', trailerPlateNorm: 'ZZ999ZZ' },
        { id: 2, driverDniNorm: '87654321', truckPlateNorm: 'EF456GH', trailerPlateNorm: null },
      ],
      isLoading: false,
      error: null,
    });

    renderWithRouter('123');
    expect(screen.getByText('Equipo #1')).toBeInTheDocument();
    expect(screen.getByText('DNI 12345678 · AB123CD · ZZ999ZZ')).toBeInTheDocument();
    expect(screen.getByText('Equipo #2')).toBeInTheDocument();
    expect(screen.getByText('DNI 87654321 · EF456GH · -')).toBeInTheDocument();
  });
});
