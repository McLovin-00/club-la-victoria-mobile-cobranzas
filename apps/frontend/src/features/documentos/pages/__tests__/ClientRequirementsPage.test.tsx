// Tests completos de `ClientRequirementsPage`: gestión de requisitos por cliente (Jest ESM).
import React from 'react';
import { describe, it, expect, beforeAll, beforeEach, jest } from '@jest/globals';
import { render, screen, fireEvent } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { MemoryRouter, Routes, Route } from 'react-router-dom';

describe('ClientRequirementsPage - render completo con coverage', () => {
  let ClientRequirementsPage: React.FC;
  let useGetClientsQuery: jest.Mock;
  let useGetClientRequirementsQuery: jest.Mock;
  let useGetTemplatesQuery: jest.Mock;
  let useAddClientRequirementMutation: jest.Mock;
  let useRemoveClientRequirementMutation: jest.Mock;
  let mockNavigate: jest.Mock;
  let mockStore: any;

  const mockClients = [
    { id: 1, razonSocial: 'Transportes A' },
    { id: 2, razonSocial: 'Transportes B' },
  ];

  const mockReqs = [
    { id: 1, clienteId: 1, templateId: 10, entityType: 'CHOFER', template: { name: 'DNI Chofer' } },
    { id: 2, clienteId: 1, templateId: 20, entityType: 'CAMION', template: { name: 'Seguro Camión' } },
  ];

  const mockTemplates = [
    { id: 10, entityType: 'CHOFER', nombre: 'DNI Chofer' },
    { id: 11, entityType: 'CHOFER', nombre: 'Licencia Chofer' },
    { id: 20, entityType: 'CAMION', nombre: 'Seguro Camión' },
    { id: 21, entityType: 'CAMION', nombre: 'VTV Camión' },
    { id: 30, entityType: 'ACOPLADO', nombre: 'Seguro Acoplado' },
    { id: 40, entityType: 'EMPRESA_TRANSPORTISTA', nombre: 'Habilitación Municipal' },
  ];

  beforeAll(async () => {
    useGetClientsQuery = jest.fn();
    useGetClientRequirementsQuery = jest.fn();
    useGetTemplatesQuery = jest.fn();
    useAddClientRequirementMutation = jest.fn();
    useRemoveClientRequirementMutation = jest.fn();
    mockNavigate = jest.fn();

    mockStore = configureStore({
      reducer: {
        [Math.random().toString()]: (state = {}) => state,
      },
    });

    const actualModule = await import('../../api/documentosApiSlice');

    await jest.unstable_mockModule('../../api/documentosApiSlice', () => ({
      ...actualModule,
      useGetClientsQuery: (...args: any[]) => useGetClientsQuery(...args),
      useGetClientRequirementsQuery: (...args: any[]) => useGetClientRequirementsQuery(...args),
      useGetTemplatesQuery: (...args: any[]) => useGetTemplatesQuery(...args),
      useAddClientRequirementMutation: (...args: any[]) => useAddClientRequirementMutation(...args),
      useRemoveClientRequirementMutation: (...args: any[]) => useRemoveClientRequirementMutation(...args),
    }));

    // Mock react-router-dom
    await jest.unstable_mockModule('react-router-dom', () => ({
      ...jest.requireActual('react-router-dom'),
      useNavigate: () => mockNavigate,
      useParams: () => ({ clienteId: '1' }),
    }));

    const module = await import('../ClientRequirementsPage');
    ClientRequirementsPage = module.ClientRequirementsPage;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    useGetClientsQuery.mockReturnValue({
      data: { list: mockClients },
      isLoading: false,
    });
    useGetClientRequirementsQuery.mockReturnValue({
      data: mockReqs,
      isLoading: false,
      refetch: jest.fn(),
    });
    useGetTemplatesQuery.mockReturnValue({
      data: mockTemplates,
      isLoading: false,
    });
    useAddClientRequirementMutation.mockReturnValue([
      jest.fn().mockResolvedValue({}),
      { isLoading: false },
    ]);
    useRemoveClientRequirementMutation.mockReturnValue([
      jest.fn().mockResolvedValue({}),
      { isLoading: false },
    ]);
  });

  const renderPage = (clienteId: string = '1') => {
    return render(
      <Provider store={mockStore}>
        <MemoryRouter initialEntries={[`/documentos/clientes/${clienteId}/requirements`]}>
          <Routes>
            <Route path="/documentos/clientes/:clienteId/requirements" element={<ClientRequirementsPage />} />
          </Routes>
        </MemoryRouter>
      </Provider>
    );
  };

  it('renderiza página con título y botón volver', () => {
    renderPage();
    expect(screen.getByText('Requisitos por Cliente')).toBeInTheDocument();
    expect(screen.getByText('Volver')).toBeInTheDocument();
  });

  it('muestra select de clientes', () => {
    renderPage();
    expect(screen.getByDisplayValue('Transportes A')).toBeInTheDocument();
    expect(screen.getByText('Transportes B')).toBeInTheDocument();
  });

  it('muestra select de entidad', () => {
    renderPage();
    expect(screen.getByText('Empresa Transportista')).toBeInTheDocument();
    expect(screen.getByText('Chofer')).toBeInTheDocument();
    expect(screen.getByText('Camión')).toBeInTheDocument();
    expect(screen.getByText('Acoplado')).toBeInTheDocument();
  });

  it('muestra select de plantillas', () => {
    renderPage();
    expect(screen.getByText('Selecciona una plantilla')).toBeInTheDocument();
  });

  it('muestra requisitos existentes', () => {
    renderPage();
    expect(screen.getByText('DNI Chofer')).toBeInTheDocument();
    expect(screen.getByText('Camión')).toBeInTheDocument();
    expect(screen.getByText('(Chofer)')).toBeInTheDocument();
    expect(screen.getByText('Seguro Camión')).toBeInTheDocument();
  });

  it('muestra mensaje sin requisitos cuando no hay configurados', () => {
    useGetClientRequirementsQuery.mockReturnValue({
      data: [],
      isLoading: false,
      refetch: jest.fn(),
    });

    renderPage();
    expect(screen.getByText('Sin requisitos configurados')).toBeInTheDocument();
  });

  it('navega atrás al hacer click en Volver', () => {
    renderPage();
    const volverButton = screen.getByText('Volver');
    fireEvent.click(volverButton);
    expect(mockNavigate).toHaveBeenCalledWith('/documentos/clientes');
  });

  it('cambia de cliente al seleccionar en el select', () => {
    renderPage();
    const select = screen.getByDisplayValue('Transportes A');
    fireEvent.change(select, { target: { value: '2' } });
    expect(mockNavigate).toHaveBeenCalledWith('/documentos/clientes/2/requirements');
  });

  it('filtra plantillas por entidad', () => {
    renderPage();

    // Por defecto EMPRESA_TRANSPORTISTA
    const entitySelect = screen.getByDisplayValue('Empresa Transportista');
    expect(entitySelect).toBeInTheDocument();
  });

  it('cambia entidad y actualiza plantillas disponibles', () => {
    renderPage();

    const entitySelect = screen.getByDisplayValue('Empresa Transportista');
    fireEvent.change(entitySelect, { target: { value: 'CHOFER' } });

    // Debería mostrar plantillas de chofer
    expect(screen.getByText('DNI Chofer')).toBeInTheDocument();
    expect(screen.getByText('Licencia Chofer')).toBeInTheDocument();
  });

  it('agrega requisito cuando se selecciona plantilla y clic en Agregar', async () => {
    const mockAdd = jest.fn().mockResolvedValue({});
    useAddClientRequirementMutation.mockReturnValue([mockAdd, { isLoading: false }]);

    renderPage();

    // Cambiar a CHOFER
    const entitySelect = screen.getByDisplayValue('Empresa Transportista');
    fireEvent.change(entitySelect, { target: { value: 'CHOFER' } });

    // Esperar a que se actualicen las plantillas
    const templateSelect = screen.getByText('Selecciona una plantilla');
    fireEvent.change(templateSelect, { target: { value: '11' } });

    const addButton = screen.getByText('Agregar');
    fireEvent.click(addButton);

    expect(mockAdd).toHaveBeenCalledWith({
      clienteId: 1,
      templateId: 11,
      entityType: 'CHOFER',
    });
  });

  it('deshabilita botón Agregar cuando no hay plantilla seleccionada', () => {
    renderPage();
    const addButton = screen.getByText('Agregar') as HTMLButtonElement;
    expect(addButton.disabled).toBe(true);
  });

  it('quita requisito al hacer click en Quitar', () => {
    const mockRemove = jest.fn().mockResolvedValue({});
    useRemoveClientRequirementMutation.mockReturnValue([mockRemove, { isLoading: false }]);

    renderPage();

    const removeButtons = screen.getAllByText('Quitar');
    fireEvent.click(removeButtons[0]);

    expect(mockRemove).toHaveBeenCalledWith({
      clienteId: 1,
      requirementId: 1,
    });
  });

  it('filtra plantillas ya seleccionadas para no mostrar duplicados', () => {
    renderPage();

    // Cambiar a CHOFER
    const entitySelect = screen.getByDisplayValue('Empresa Transportista');
    fireEvent.change(entitySelect, { target: { value: 'CHOFER' } });

    // DNI Chofer (id=10) ya está seleccionado, no debería aparecer en el select de plantillas
    // Verificamos que solo aparece Licencia Chofer (id=11)
    const dniText = screen.queryAllByText('DNI Chofer');
    const licenciaText = screen.getAllByText('Licencia Chofer');
    expect(dniText.filter(el => el.tagName === 'OPTION').length).toBe(0);
    expect(licenciaText.filter(el => el.tagName === 'OPTION').length).toBeGreaterThan(0);
  });

  it('resetea templateId al cambiar de entidad', () => {
    renderPage();

    // Cambiar a CHOFER
    const entitySelect = screen.getByDisplayValue('Empresa Transportista');
    fireEvent.change(entitySelect, { target: { value: 'CHOFER' } });

    // El select de plantilla debería resetearse
    const templateSelect = screen.getByText('Selecciona una plantilla');
    expect(templateSelect).toBeInTheDocument();
  });
});

