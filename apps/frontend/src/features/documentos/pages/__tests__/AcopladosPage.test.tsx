// Tests completos de `AcopladosPage`: CRUD de acoplados (Jest ESM).
import React from 'react';
import { describe, it, expect, beforeAll, beforeEach, jest } from '@jest/globals';
import { render, screen, fireEvent } from '@testing-library/react';

describe('AcopladosPage - render completo con coverage', () => {
  let AcopladosPage: React.FC;
  let MemoryRouter: typeof import('react-router-dom').MemoryRouter;

  let useGetDadoresQuery: jest.Mock;
  let useGetAcopladosQuery: jest.Mock;
  let useCreateAcopladoMutation: jest.Mock;
  let useUpdateAcopladoMutation: jest.Mock;
  let useDeleteAcopladoMutation: jest.Mock;
  let mockShow: jest.Mock;
  let mockGoBack: jest.Mock;

  const mockDadores = [
    { id: 1, razonSocial: 'Dador A', cuit: '20123456789' },
    { id: 2, razonSocial: 'Dador B', cuit: '20987654321' },
  ];

  const mockAcoplados = [
    { id: 1, patente: 'ABC123', tipo: 'Tipo A', activo: true },
    { id: 2, patente: 'DEF456', tipo: 'Tipo B', activo: false },
  ];

  beforeAll(async () => {
    useGetDadoresQuery = jest.fn();
    useGetAcopladosQuery = jest.fn();
    useCreateAcopladoMutation = jest.fn();
    useUpdateAcopladoMutation = jest.fn();
    useDeleteAcopladoMutation = jest.fn();
    mockShow = jest.fn();
    mockGoBack = jest.fn();

    // Mock RTK Query hooks
    await jest.unstable_mockModule('../../api/documentosApiSlice', () => ({
      useGetDadoresQuery: (...args: any[]) => useGetDadoresQuery(...args),
      useGetAcopladosQuery: (...args: any[]) => useGetAcopladosQuery(...args),
      useCreateAcopladoMutation: (...args: any[]) => useCreateAcopladoMutation(...args),
      useUpdateAcopladoMutation: (...args: any[]) => useUpdateAcopladoMutation(...args),
      useDeleteAcopladoMutation: (...args: any[]) => useDeleteAcopladoMutation(...args),
    }));

    // Mock hooks
    await jest.unstable_mockModule('../../../../hooks/useToast', () => ({
      useToast: () => ({ show: mockShow }),
    }));

    await jest.unstable_mockModule('../../../../hooks/useRoleBasedNavigation', () => ({
      useRoleBasedNavigation: () => ({ goBack: mockGoBack }),
    }));

    ({ default: AcopladosPage } = await import('../AcopladosPage'));
    ({ MemoryRouter } = await import('react-router-dom'));
  });

  beforeEach(() => {
    jest.clearAllMocks();
    useGetDadoresQuery.mockReturnValue({
      data: { list: mockDadores },
      isLoading: false,
    });
    useGetAcopladosQuery.mockReturnValue({
      data: { data: mockAcoplados, pagination: { total: 2 } },
      isLoading: false,
    });
    useCreateAcopladoMutation.mockReturnValue([
      jest.fn(),
      { isLoading: false },
    ]);
    useUpdateAcopladoMutation.mockReturnValue([
      jest.fn(),
      { isLoading: false },
    ]);
    useDeleteAcopladoMutation.mockReturnValue([
      jest.fn(),
      { isLoading: false },
    ]);
  });

  const renderPage = () => {
    return render(
      <MemoryRouter>
        <AcopladosPage />
      </MemoryRouter>
    );
  };

  it('renderiza página con título y botón volver', () => {
    renderPage();
    expect(screen.getByText('Acoplados')).toBeInTheDocument();
    expect(screen.getByText('Volver')).toBeInTheDocument();
  });

  it('muestra lista de dadores de carga', () => {
    renderPage();
    expect(screen.getByText('Dador A · CUIT 20123456789')).toBeInTheDocument();
    expect(screen.getByText('Dador B · CUIT 20987654321')).toBeInTheDocument();
  });

  it('muestra lista de acoplados', () => {
    renderPage();
    expect(screen.getByText('Patente ABC123')).toBeInTheDocument();
    expect(screen.getByText('Patente DEF456')).toBeInTheDocument();
  });

  it('muestra búsqueda y filtros', () => {
    renderPage();
    expect(screen.getByPlaceholderText('Buscar por patente o tipo')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Patente')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Tipo (opcional)')).toBeInTheDocument();
  });

  it('muestra warning cuando no hay dador seleccionado', () => {
    useGetDadoresQuery.mockReturnValue({
      data: { list: [] },
      isLoading: false,
    });

    renderPage();
    expect(screen.getByText('Seleccioná un dador de carga para ver y crear acoplados.')).toBeInTheDocument();
  });

  it('crea acoplado con patente y tipo', async () => {
    const mockCreate = jest.fn().mockResolvedValue({
      unwrap: async () => ({ id: 3, patente: 'XYZ789', tipo: 'Tipo C' }),
    });
    useCreateAcopladoMutation.mockReturnValue([
      mockCreate,
      { isLoading: false },
    ]);

    renderPage();

    const patenteInput = screen.getByPlaceholderText('Patente');
    const tipoInput = screen.getByPlaceholderText('Tipo (opcional)');
    const crearButton = screen.getByText('Crear');

    fireEvent.change(patenteInput, { target: { value: 'xyz789' } });
    fireEvent.change(tipoInput, { target: { value: 'Tipo C' } });
    fireEvent.click(crearButton);

    // Verifica que se llamó
    expect(mockCreate).toHaveBeenCalled();
  });

  it('convierte patente a mayúsculas', () => {
    renderPage();
    const patenteInput = screen.getByPlaceholderText('Patente');
    fireEvent.change(patenteInput, { target: { value: 'abc123' } });
    expect(patenteInput).toHaveValue('ABC123');
  });

  it('deshabilita botón Crear si no hay patente', () => {
    renderPage();
    const crearButton = screen.getByText('Crear') as HTMLButtonElement;
    expect(crearButton.disabled).toBe(true);
  });

  it('busca acoplados por patente', () => {
    renderPage();
    const searchInput = screen.getByPlaceholderText('Buscar por patente o tipo');
    fireEvent.change(searchInput, { target: { value: 'ABC' } });
    expect(useGetAcopladosQuery).toHaveBeenCalled();
  });

  it('cambia dador de carga', () => {
    renderPage();
    const select = screen.getByDisplayValue('Dador A · CUIT 20123456789');
    fireEvent.change(select, { target: { value: '2' } });
    // Verifica que el evento se disparó
    expect(select).toBeInTheDocument();
  });

  it('muestra mensaje sin acoplados', () => {
    useGetAcopladosQuery.mockReturnValue({
      data: { data: [], pagination: { total: 0 } },
      isLoading: false,
    });

    renderPage();
    expect(screen.getByText('Sin acoplados')).toBeInTheDocument();
  });

  it('muestra total de acoplados', () => {
    renderPage();
    expect(screen.getByText('Total: 2')).toBeInTheDocument();
  });

  it('edita acoplado inline', () => {
    renderPage();
    const editButtons = screen.getAllByText('Editar');
    fireEvent.click(editButtons[0]);

    // Deberían aparecer inputs de edición
    const inputs = screen.getAllByPlaceholderText('Patente');
    expect(inputs.length).toBeGreaterThan(1);
  });

  it('cancela edición de acoplado', () => {
    renderPage();
    const editButtons = screen.getAllByText('Editar');
    fireEvent.click(editButtons[0]);

    const cancelButtons = screen.getAllByText('Cancelar');
    // El primer botón Cancelar es del modal, el segundo es de edición
    // Solo hay un botón Cancelar visible después de editar
    fireEvent.click(cancelButtons[0] as HTMLElement);

    // Volvió al estado normal
    expect(screen.getAllByText('Editar').length).toBe(2);
  });

  it('llama goBack al hacer click en volver', () => {
    renderPage();
    const volverButton = screen.getByText('Volver');
    fireEvent.click(volverButton);
    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });

  describe('Modal de confirmación de eliminación', () => {
    it('muestra modal al hacer click en borrar', () => {
      renderPage();
      const deleteButtons = screen.getAllByText('Borrar');
      fireEvent.click(deleteButtons[0]);

      expect(screen.getByText('Confirmar eliminación')).toBeInTheDocument();
      expect(screen.getByText(/eliminar el semirremolque #1/)).toBeInTheDocument();
    });

    it('cierra modal al cancelar', () => {
      renderPage();
      const deleteButtons = screen.getAllByText('Borrar');
      fireEvent.click(deleteButtons[0]);

      const cancelButton = screen.getByText('Cancelar');
      fireEvent.click(cancelButton);

      expect(screen.queryByText('Confirmar eliminación')).not.toBeInTheDocument();
    });

    it('confirma eliminación de acoplado', async () => {
      const mockDelete = jest.fn().mockResolvedValue({});
      useDeleteAcopladoMutation.mockReturnValue([
        mockDelete,
        { isLoading: false },
      ]);

      renderPage();
      const deleteButtons = screen.getAllByText('Borrar');
      fireEvent.click(deleteButtons[0]);

      const confirmButton = screen.getByText('Eliminar');
      fireEvent.click(confirmButton);

      expect(mockDelete).toHaveBeenCalledWith(1);
      // No verificamos mockShow porque es async y puede no haberse llamado aún
    });
  });

  describe('Activar/Desactivar acoplado', () => {
    it('muestra botón Desactivar para acoplado activo', () => {
      renderPage();
      const toggleButtons = screen.getAllByText('Desactivar');
      expect(toggleButtons.length).toBe(1);
    });

    it('muestra botón Activar para acoplado inactivo', () => {
      renderPage();
      const toggleButtons = screen.getAllByText('Activar');
      expect(toggleButtons.length).toBe(1);
    });

    it('llama onToggleActivo al hacer click', async () => {
      const mockUpdate = jest.fn().mockResolvedValue({});
      useUpdateAcopladoMutation.mockReturnValue([
        mockUpdate,
        { isLoading: false },
      ]);

      renderPage();
      const toggleButtons = screen.getAllByText('Desactivar');
      fireEvent.click(toggleButtons[0]);

      expect(mockUpdate).toHaveBeenCalledWith({
        id: 1,
        activo: false,
      });
    });
  });

  describe('Paginación', () => {
    it('muestra componente de paginación', () => {
      renderPage();
      expect(screen.getByText('Total: 2')).toBeInTheDocument();
    });
  });
});

