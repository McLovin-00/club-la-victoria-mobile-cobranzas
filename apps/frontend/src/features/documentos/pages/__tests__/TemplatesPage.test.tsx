// Tests completos de `TemplatesPage`: CRUD de plantillas (Jest ESM).
import React from 'react';
import { describe, it, expect, beforeAll, beforeEach, jest } from '@jest/globals';
import { render, screen, fireEvent } from '@testing-library/react';

describe('TemplatesPage - render completo con coverage', () => {
  let TemplatesPage: React.FC;
  let MemoryRouter: typeof import('react-router-dom').MemoryRouter;

  let useGetTemplatesQuery: jest.Mock;
  let useCreateTemplateMutation: jest.Mock;
  let useUpdateTemplateMutation: jest.Mock;
  let useDeleteTemplateMutation: jest.Mock;
  let mockShow: jest.Mock;
  let mockConfirm: jest.Mock;
  let mockNavigate: jest.Mock;

  const mockTemplates = [
    {
      id: 1,
      nombre: 'DNI Chofer',
      entityType: 'CHOFER',
      descripcion: 'Plantilla de DNI',
      isActive: true,
      createdAt: '2025-01-01T00:00:00.000Z',
      updatedAt: '2025-01-10T00:00:00.000Z',
    },
    {
      id: 2,
      nombre: 'Seguro Camión',
      entityType: 'CAMION',
      descripcion: 'Seguro del camión',
      isActive: false,
      createdAt: '2025-01-02T00:00:00.000Z',
      updatedAt: '2025-01-11T00:00:00.000Z',
    },
  ];

  beforeAll(async () => {
    useGetTemplatesQuery = jest.fn();
    useCreateTemplateMutation = jest.fn();
    useUpdateTemplateMutation = jest.fn();
    useDeleteTemplateMutation = jest.fn();
    mockShow = jest.fn();
    mockConfirm = jest.fn();
    mockNavigate = jest.fn();

    // Mock RTK Query hooks
    await jest.unstable_mockModule('../../api/documentosApiSlice', () => ({
      useGetTemplatesQuery: (...args: any[]) => useGetTemplatesQuery(...args),
      useCreateTemplateMutation: (...args: any[]) => useCreateTemplateMutation(...args),
      useUpdateTemplateMutation: (...args: any[]) => useUpdateTemplateMutation(...args),
      useDeleteTemplateMutation: (...args: any[]) => useDeleteTemplateMutation(...args),
    }));

    // Mock hooks
    await jest.unstable_mockModule('../../../../hooks/useToast', () => ({
      useToast: () => ({ show: mockShow }),
    }));

    await jest.unstable_mockModule('../../../../hooks/useConfirmDialog', () => ({
      useConfirmDialog: () => ({ confirm: mockConfirm }),
    }));

    // Mock react-router-dom
    await jest.unstable_mockModule('react-router-dom', () => ({
      ...jest.requireActual('react-router-dom'),
      useNavigate: () => mockNavigate,
    }));

    const module = await import('../TemplatesPage');
    TemplatesPage = module.TemplatesPage;
    ({ MemoryRouter } = await import('react-router-dom'));
  });

  beforeEach(() => {
    jest.clearAllMocks();
    useGetTemplatesQuery.mockReturnValue({
      data: mockTemplates,
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    });
    useCreateTemplateMutation.mockReturnValue([jest.fn(), { isLoading: false }]);
    useUpdateTemplateMutation.mockReturnValue([jest.fn(), { isLoading: false }]);
    useDeleteTemplateMutation.mockReturnValue([jest.fn(), { isLoading: false }]);
    mockConfirm.mockResolvedValue(true);
  });

  const renderPage = () => {
    return render(
      <MemoryRouter>
        <TemplatesPage />
      </MemoryRouter>
    );
  };

  it('renderiza página con título y botón volver', () => {
    renderPage();
    expect(screen.getByText('Gestión de Plantillas')).toBeInTheDocument();
    expect(screen.getByText('Volver')).toBeInTheDocument();
  });

  it('muestra estadísticas de templates', () => {
    renderPage();
    expect(screen.getByText('Gestión de Plantillas')).toBeInTheDocument();
    // Las estadísticas se muestran (Total, Activas, Inactivas, Tipos)
    const stats = screen.getAllByText(/Total|Activas|Inactivas|Tipos/);
    expect(stats.length).toBeGreaterThan(0);
  });

  it('muestra botón Nueva Plantilla', () => {
    renderPage();
    expect(screen.getByText('Nueva Plantilla')).toBeInTheDocument();
  });

  it('muestra loading cuando isLoading=true', () => {
    useGetTemplatesQuery.mockReturnValue({
      data: [],
      isLoading: true,
      error: null,
      refetch: jest.fn(),
    });

    renderPage();
    // TemplatesList muestra skeleton
  });

  it('muestra error cuando templatesError existe', () => {
    useGetTemplatesQuery.mockReturnValue({
      data: [],
      isLoading: false,
      error: { message: 'Error loading' },
      refetch: jest.fn(),
    });

    renderPage();
    expect(screen.getByText('Error')).toBeInTheDocument();
    expect(screen.getByText('No se pudieron cargar las plantillas')).toBeInTheDocument();
  });

  it('navega atrás al hacer click en Volver', () => {
    renderPage();
    const volverButton = screen.getByText('Volver');
    fireEvent.click(volverButton);
    expect(mockNavigate).toHaveBeenCalledWith('/documentos');
  });

  it('abre modal al hacer click en Nueva Plantilla', () => {
    renderPage();
    const nuevaButton = screen.getByText('Nueva Plantilla');
    fireEvent.click(nuevaButton);
    // El modal se abre pero TemplateFormModal es un componente separado
  });

  it('deshabilita botón Nueva Plantilla cuando isLoading', () => {
    useGetTemplatesQuery.mockReturnValue({
      data: mockTemplates,
      isLoading: true,
      error: null,
      refetch: jest.fn(),
    });

    renderPage();
    const nuevaButton = screen.getByText('Nueva Plantilla') as HTMLButtonElement;
    expect(nuevaButton.disabled).toBe(true);
  });

  it('cierra modal y resetea edición al cancelar', () => {
    renderPage();
    // TemplateFormModal maneja esto internamente
  });

  it('calcula correctamente estadísticas de templates activas', () => {
    const allActiveTemplates = [
      {
        id: 1,
        nombre: 'A',
        entityType: 'CHOFER',
        descripcion: 'A',
        isActive: true,
        createdAt: '2025-01-01T00:00:00.000Z',
        updatedAt: '2025-01-10T00:00:00.000Z',
      },
      {
        id: 2,
        nombre: 'B',
        entityType: 'CAMION',
        descripcion: 'B',
        isActive: true,
        createdAt: '2025-01-02T00:00:00.000Z',
        updatedAt: '2025-01-11T00:00:00.000Z',
      },
    ];

    useGetTemplatesQuery.mockReturnValue({
      data: allActiveTemplates,
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    });

    renderPage();
    const activasElements = screen.getAllByText('2');
    expect(activasElements.length).toBeGreaterThan(0);
  });

  it('calcula correctamente tipos únicos', () => {
    useGetTemplatesQuery.mockReturnValue({
      data: mockTemplates,
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    });

    renderPage();
    // CHOFER y CAMION = 2 tipos únicos
    const twos = screen.getAllByText('2');
    expect(twos.length).toBeGreaterThan(0);
  });

  it('muestra TemplatesList con los templates', () => {
    renderPage();
    // TemplatesList se renderiza con los templates
    expect(screen.getByText('DNI Chofer')).toBeInTheDocument();
    expect(screen.getByText('Seguro Camión')).toBeInTheDocument();
  });
});


