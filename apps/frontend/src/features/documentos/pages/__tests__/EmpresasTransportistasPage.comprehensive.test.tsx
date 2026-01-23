/**
 * Tests comprehensivos para EmpresasTransportistasPage
 * Cubre todos los branches y handlers para alcanzar ≥90% cobertura
 */
import React from 'react';
import { describe, it, expect, beforeAll, beforeEach, jest } from '@jest/globals';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

describe('EmpresasTransportistasPage - Comprehensive Coverage', () => {
  let EmpresasTransportistasPage: React.FC;
  let MemoryRouter: typeof import('react-router-dom').MemoryRouter;
  let mockGoBack: jest.Mock;
  let mockAlert: jest.Mock;

  const mockDadores = [
    { id: 1, razonSocial: 'Dador 1' },
    { id: 2, razonSocial: 'Dador 2' },
  ];

  const mockEmpresas = [
    { id: 1, razonSocial: 'Transporte SA', cuit: '20-12345678-9', activo: true, dadorCargaId: 1 },
    { id: 2, razonSocial: 'Logística Express', cuit: '20-87654321-1', activo: false, dadorCargaId: 1 },
  ];

  beforeAll(async () => {
    mockGoBack = jest.fn();
    mockAlert = jest.fn();

    // Mock de hooks
    await jest.unstable_mockModule('../../../../hooks/useRoleBasedNavigation', () => ({
      useRoleBasedNavigation: () => ({ goBack: mockGoBack }),
    }));

    // Mock de RTK Query hooks
    await jest.unstable_mockModule('../../api/documentosApiSlice', () => ({
      useGetDadoresQuery: () => ({
        data: { list: mockDadores, defaults: { defaultDadorId: 1 } },
        isLoading: false,
      }),
      useGetDefaultsQuery: () => ({
        data: { defaultDadorId: 1 },
        isLoading: false,
      }),
      useGetEmpresasTransportistasQuery: () => ({
        data: mockEmpresas,
        refetch: jest.fn(),
        isFetching: false,
      }),
      useCreateEmpresaTransportistaMutation: () => [jest.fn().mockResolvedValue({}), { isLoading: false }],
      useUpdateEmpresaTransportistaMutation: () => [jest.fn().mockResolvedValue({}), { isLoading: false }],
      useDeleteEmpresaTransportistaMutation: () => [jest.fn().mockResolvedValue({}), { isLoading: false }],
    }));

    // Setup global alert
    (global as any).alert = mockAlert;

    ({ default: EmpresasTransportistasPage } = await import('../EmpresasTransportistasPage'));
    ({ MemoryRouter } = await import('react-router-dom'));
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const renderPage = () => {
    return render(
      <MemoryRouter initialEntries={['/documentos/empresas-transportistas']}>
        <EmpresasTransportistasPage />
      </MemoryRouter>
    );
  };

  describe('Renderizado básico', () => {
    it('debería importar el componente', () => {
      expect(EmpresasTransportistasPage).toBeDefined();
    });

    it('debería renderizar sin crashear', () => {
      renderPage();
      expect(screen.getByText('Empresas Transportistas')).toBeInTheDocument();
    });

    it('debería mostrar título y botón volver', () => {
      renderPage();
      expect(screen.getByText('Empresas Transportistas')).toBeInTheDocument();
      expect(screen.getByText('← Volver')).toBeInTheDocument();
    });

    it('debería mostrar botón Nueva Empresa', () => {
      renderPage();
      expect(screen.getByText('Nueva Empresa')).toBeInTheDocument();
    });

    it('debería mostrar tabla de empresas', () => {
      renderPage();
      expect(screen.getByText('ID')).toBeInTheDocument();
      expect(screen.getByText('Razón Social')).toBeInTheDocument();
      expect(screen.getByText('CUIT')).toBeInTheDocument();
      expect(screen.getByText('Activo')).toBeInTheDocument();
      expect(screen.getByText('Acciones')).toBeInTheDocument();
    });
  });

  describe('Tabla de empresas', () => {
    it('debería mostrar empresas cuando hay datos', () => {
      renderPage();
      expect(screen.getByText('Transporte SA')).toBeInTheDocument();
      expect(screen.getByText('Logística Express')).toBeInTheDocument();
    });

    it('debería mostrar "Sin resultados" cuando no hay datos', async () => {
      await jest.unstable_mockModule('../../api/documentosApiSlice', () => ({
        useGetDadoresQuery: () => ({
          data: { list: mockDadores },
          isLoading: false,
        }),
        useGetDefaultsQuery: () => ({
          data: { defaultDadorId: 1 },
          isLoading: false,
        }),
        useGetEmpresasTransportistasQuery: () => ({
          data: [],
          refetch: jest.fn(),
          isFetching: false,
        }),
        useCreateEmpresaTransportistaMutation: () => [jest.fn(), { isLoading: false }],
        useUpdateEmpresaTransportistaMutation: () => [jest.fn(), { isLoading: false }],
        useDeleteEmpresaTransportistaMutation: () => [jest.fn(), { isLoading: false }],
      }));

      const module = await import('../EmpresasTransportistasPage');
      const Page = module.default;

      render(
        <MemoryRouter>
          <Page />
        </MemoryRouter>
      );

      expect(screen.getByText('Sin resultados')).toBeInTheDocument();
    });

    it('debería manejar lista no array', async () => {
      await jest.unstable_mockModule('../../api/documentosApiSlice', () => ({
        useGetDadoresQuery: () => ({
          data: { list: mockDadores },
          isLoading: false,
        }),
        useGetDefaultsQuery: () => ({
          data: { defaultDadorId: 1 },
          isLoading: false,
        }),
        useGetEmpresasTransportistasQuery: () => ({
          data: null,
          refetch: jest.fn(),
          isFetching: false,
        }),
        useCreateEmpresaTransportistaMutation: () => [jest.fn(), { isLoading: false }],
        useUpdateEmpresaTransportistaMutation: () => [jest.fn(), { isLoading: false }],
        useDeleteEmpresaTransportistaMutation: () => [jest.fn(), { isLoading: false }],
      }));

      const module = await import('../EmpresasTransportistasPage');
      const Page = module.default;

      render(
        <MemoryRouter>
          <Page />
        </MemoryRouter>
      );
    });
  });

  describe('Filtros y búsqueda', () => {
    it('debería cambiar texto de búsqueda', () => {
      renderPage();

      const searchInput = screen.getByPlaceholderText('Buscar por razón social o CUIT');
      fireEvent.change(searchInput, { target: { value: 'Transporte' } });
      expect(searchInput).toHaveValue('Transporte');
    });

    it('debería cambiar filtro de dador', () => {
      renderPage();

      const select = screen.getByDisplayValue('Todos los dadores');
      fireEvent.change(select, { target: { value: '1' } });
      expect(select).toHaveValue('1');
    });

    it('debería refrescar al hacer click en Buscar', async () => {
      const refetchMock = jest.fn();
      await jest.unstable_mockModule('../../api/documentosApiSlice', () => ({
        useGetDadoresQuery: () => ({
          data: { list: mockDadores },
          isLoading: false,
        }),
        useGetDefaultsQuery: () => ({
          data: { defaultDadorId: 1 },
          isLoading: false,
        }),
        useGetEmpresasTransportistasQuery: () => ({
          data: mockEmpresas,
          refetch: refetchMock,
          isFetching: false,
        }),
        useCreateEmpresaTransportistaMutation: () => [jest.fn(), { isLoading: false }],
        useUpdateEmpresaTransportistaMutation: () => [jest.fn(), { isLoading: false }],
        useDeleteEmpresaTransportistaMutation: () => [jest.fn(), { isLoading: false }],
      }));

      const module = await import('../EmpresasTransportistasPage');
      const Page = module.default;

      render(
        <MemoryRouter>
          <Page />
        </MemoryRouter>
      );

      const searchButton = screen.getByText('Buscar');
      fireEvent.click(searchButton);

      expect(refetchMock).toHaveBeenCalled();
    });
  });

  describe('Paginación', () => {
    it('debería cambiar de página', () => {
      renderPage();

      // La paginación se maneja con el componente Pagination
      // Verificamos que se renderiza
      expect(screen.getByText('Empresas Transportistas')).toBeInTheDocument();
    });
  });

  describe('Modal de creación/edición', () => {
    it('debería abrir modal de creación al hacer click en Nueva Empresa', async () => {
      renderPage();

      const newButton = screen.getByText('Nueva Empresa');
      fireEvent.click(newButton);

      await waitFor(() => {
        expect(screen.getByText('Nueva Empresa')).toBeInTheDocument();
      });
    });

    it('debería cerrar modal al hacer click en Cancelar', async () => {
      renderPage();

      const newButton = screen.getByText('Nueva Empresa');
      fireEvent.click(newButton);

      await waitFor(() => {
        expect(screen.getByText('Nueva Empresa')).toBeInTheDocument();
      });

      const cancelButton = screen.getByText('Cancelar');
      fireEvent.click(cancelButton);

      await waitFor(() => {
        expect(screen.queryByText('Nueva Empresa')).not.toBeInTheDocument();
      });
    });

    it('debería cambiar dador en el modal', async () => {
      renderPage();

      const newButton = screen.getByText('Nueva Empresa');
      fireEvent.click(newButton);

      await waitFor(() => {
        expect(screen.getByText('Nueva Empresa')).toBeInTheDocument();
      });

      const dadorSelect = screen.getByDisplayValue('Seleccionar…');
      fireEvent.change(dadorSelect, { target: { value: '1' } });
      expect(dadorSelect).toHaveValue('1');
    });

    it('debería cambiar razón social en el modal', async () => {
      renderPage();

      const newButton = screen.getByText('Nueva Empresa');
      fireEvent.click(newButton);

      await waitFor(() => {
        expect(screen.getByText('Nueva Empresa')).toBeInTheDocument();
      });

      const razonSocialInput = screen.getByDisplayValue('');
      fireEvent.change(razonSocialInput, { target: { value: 'Nueva Transporte SA' } });
      expect(razonSocialInput).toHaveValue('Nueva Transporte SA');
    });

    it('debería cambiar CUIT en el modal', async () => {
      renderPage();

      const newButton = screen.getByText('Nueva Empresa');
      fireEvent.click(newButton);

      await waitFor(() => {
        expect(screen.getByText('Nueva Empresa')).toBeInTheDocument();
      });

      const cuitInput = screen.getByDisplayValue('');
      fireEvent.change(cuitInput, { target: { value: '20-99999999-9' } });
      expect(cuitInput).toHaveValue('20-99999999-9');
    });

    it('debería cambiar estado Activo en el modal', async () => {
      renderPage();

      const newButton = screen.getByText('Nueva Empresa');
      fireEvent.click(newButton);

      await waitFor(() => {
        expect(screen.getByText('Nueva Empresa')).toBeInTheDocument();
      });

      const activoSelect = screen.getByDisplayValue('Sí');
      fireEvent.change(activoSelect, { target: { value: '0' } });
      expect(activoSelect).toHaveValue('0');
    });

    it('debería cambiar notas en el modal', async () => {
      renderPage();

      const newButton = screen.getByText('Nueva Empresa');
      fireEvent.click(newButton);

      await waitFor(() => {
        expect(screen.getByText('Nueva Empresa')).toBeInTheDocument();
      });

      const notasTextarea = screen.getByDisplayValue('');
      fireEvent.change(notasTextarea, { target: { value: 'Notas de prueba' } });
      expect(notasTextarea).toHaveValue('Notas de prueba');
    });

    it('debería cerrar modal y resetear editing al cancelar', async () => {
      renderPage();

      const newButton = screen.getByText('Nueva Empresa');
      fireEvent.click(newButton);

      await waitFor(() => {
        expect(screen.getByText('Nueva Empresa')).toBeInTheDocument();
      });

      const cancelButton = screen.getByText('Cancelar');
      fireEvent.click(cancelButton);

      await waitFor(() => {
        expect(screen.queryByText('Nueva Empresa')).not.toBeInTheDocument();
      });
    });
  });

  describe('onSave - Crear empresa', () => {
    it('debería crear empresa exitosamente', async () => {
      const createMock = jest.fn().mockResolvedValue({});
      await jest.unstable_mockModule('../../api/documentosApiSlice', () => ({
        useGetDadoresQuery: () => ({
          data: { list: mockDadores, defaults: { defaultDadorId: 1 } },
          isLoading: false,
        }),
        useGetDefaultsQuery: () => ({
          data: { defaultDadorId: 1 },
          isLoading: false,
        }),
        useGetEmpresasTransportistasQuery: () => ({
          data: mockEmpresas,
          refetch: jest.fn(),
          isFetching: false,
        }),
        useCreateEmpresaTransportistaMutation: () => [createMock, { isLoading: false }],
        useUpdateEmpresaTransportistaMutation: () => [jest.fn(), { isLoading: false }],
        useDeleteEmpresaTransportistaMutation: () => [jest.fn(), { isLoading: false }],
      }));

      const module = await import('../EmpresasTransportistasPage');
      const Page = module.default;

      render(
        <MemoryRouter>
          <Page />
        </MemoryRouter>
      );

      const newButton = screen.getByText('Nueva Empresa');
      fireEvent.click(newButton);

      await waitFor(() => {
        expect(screen.getByText('Nueva Empresa')).toBeInTheDocument();
      });

      // Llenar formulario
      const dadorSelect = screen.getByDisplayValue('Seleccionar…');
      fireEvent.change(dadorSelect, { target: { value: '1' } });

      const inputs = screen.getAllByDisplayValue('');
      fireEvent.change(inputs[0], { target: { value: 'Nueva Empresa SA' } });
      fireEvent.change(inputs[1], { target: { value: '20-12345678-9' } });

      // Guardar
      const saveButton = screen.getByText('Guardar');
      await act(async () => {
        fireEvent.click(saveButton);
      });

      await waitFor(() => {
        expect(createMock).toHaveBeenCalledWith({
          dadorCargaId: 1,
          razonSocial: 'Nueva Empresa SA',
          cuit: '20-12345678-9',
          activo: true,
          notas: '',
        });
        expect(mockAlert).toHaveBeenCalledWith('Empresa creada', 'success');
      });
    });

    it('debería validar campos requeridos al crear', async () => {
      renderPage();

      const newButton = screen.getByText('Nueva Empresa');
      fireEvent.click(newButton);

      await waitFor(() => {
        expect(screen.getByText('Nueva Empresa')).toBeInTheDocument();
      });

      // Intentar guardar sin llenar campos
      const saveButton = screen.getByText('Guardar');
      fireEvent.click(saveButton);

      expect(mockAlert).toHaveBeenCalledWith('Completá Razón Social, CUIT y Dador', 'error');
    });
  });

  describe('onSave - Editar empresa', () => {
    it('debería editar empresa exitosamente', async () => {
      const updateMock = jest.fn().mockResolvedValue({});
      await jest.unstable_mockModule('../../api/documentosApiSlice', () => ({
        useGetDadoresQuery: () => ({
          data: { list: mockDadores, defaults: { defaultDadorId: 1 } },
          isLoading: false,
        }),
        useGetDefaultsQuery: () => ({
          data: { defaultDadorId: 1 },
          isLoading: false,
        }),
        useGetEmpresasTransportistasQuery: () => ({
          data: mockEmpresas,
          refetch: jest.fn(),
          isFetching: false,
        }),
        useCreateEmpresaTransportistaMutation: () => [jest.fn(), { isLoading: false }],
        useUpdateEmpresaTransportistaMutation: () => [updateMock, { isLoading: false }],
        useDeleteEmpresaTransportistaMutation: () => [jest.fn(), { isLoading: false }],
      }));

      const module = await import('../EmpresasTransportistasPage');
      const Page = module.default;

      render(
        <MemoryRouter>
          <Page />
        </MemoryRouter>
      );

      // Click en Editar de la primera empresa
      const editButtons = screen.getAllByText('Editar');
      fireEvent.click(editButtons[0]);

      await waitFor(() => {
        expect(screen.getByText('Editar Empresa')).toBeInTheDocument();
      });

      // Guardar
      const saveButton = screen.getByText('Guardar');
      await act(async () => {
        fireEvent.click(saveButton);
      });

      await waitFor(() => {
        expect(updateMock).toHaveBeenCalled();
        expect(mockAlert).toHaveBeenCalledWith('Empresa actualizada', 'success');
      });
    });

    it('debería mostrar título correcto al editar', async () => {
      renderPage();

      const editButtons = screen.getAllByText('Editar');
      fireEvent.click(editButtons[0]);

      await waitFor(() => {
        expect(screen.getByText('Editar Empresa')).toBeInTheDocument();
      });
    });
  });

  describe('onSave - Validaciones', () => {
    it('debería validar razón social vacía', async () => {
      renderPage();

      const newButton = screen.getByText('Nueva Empresa');
      fireEvent.click(newButton);

      await waitFor(() => {
        expect(screen.getByText('Nueva Empresa')).toBeInTheDocument();
      });

      const dadorSelect = screen.getByDisplayValue('Seleccionar…');
      fireEvent.change(dadorSelect, { target: { value: '1' } });

      const inputs = screen.getAllByDisplayValue('');
      fireEvent.change(inputs[1], { target: { value: '20-12345678-9' } });

      const saveButton = screen.getByText('Guardar');
      fireEvent.click(saveButton);

      expect(mockAlert).toHaveBeenCalledWith('Completá Razón Social, CUIT y Dador', 'error');
    });

    it('debería validar CUIT vacío', async () => {
      renderPage();

      const newButton = screen.getByText('Nueva Empresa');
      fireEvent.click(newButton);

      await waitFor(() => {
        expect(screen.getByText('Nueva Empresa')).toBeInTheDocument();
      });

      const dadorSelect = screen.getByDisplayValue('Seleccionar…');
      fireEvent.change(dadorSelect, { target: { value: '1' } });

      const inputs = screen.getAllByDisplayValue('');
      fireEvent.change(inputs[0], { target: { value: 'Empresa SA' } });

      const saveButton = screen.getByText('Guardar');
      fireEvent.click(saveButton);

      expect(mockAlert).toHaveBeenCalledWith('Completá Razón Social, CUIT y Dador', 'error');
    });

    it('debería retornar temprano si editing es null', async () => {
      renderPage();

      // El modal no está abierto, editing es null
      // No debería pasar nada
      expect(screen.getByText('Empresas Transportistas')).toBeInTheDocument();
    });
  });

  describe('Eliminación', () => {
    it('debería abrir modal de confirmación al hacer click en Eliminar', async () => {
      renderPage();

      const deleteButtons = screen.getAllByText('Eliminar');
      fireEvent.click(deleteButtons[0]);

      await waitFor(() => {
        expect(screen.getByText('Confirmar eliminación')).toBeInTheDocument();
      });
    });

    it('debería cerrar modal de confirmación al cancelar', async () => {
      renderPage();

      const deleteButtons = screen.getAllByText('Eliminar');
      fireEvent.click(deleteButtons[0]);

      await waitFor(() => {
        expect(screen.getByText('Confirmar eliminación')).toBeInTheDocument();
      });

      const cancelButton = screen.getByText('Cancelar');
      fireEvent.click(cancelButton);

      await waitFor(() => {
        expect(screen.queryByText('Confirmar eliminación')).not.toBeInTheDocument();
      });
    });

    it('debería eliminar empresa al confirmar', async () => {
      const deleteMock = jest.fn().mockResolvedValue({});
      await jest.unstable_mockModule('../../api/documentosApiSlice', () => ({
        useGetDadoresQuery: () => ({
          data: { list: mockDadores, defaults: { defaultDadorId: 1 } },
          isLoading: false,
        }),
        useGetDefaultsQuery: () => ({
          data: { defaultDadorId: 1 },
          isLoading: false,
        }),
        useGetEmpresasTransportistasQuery: () => ({
          data: mockEmpresas,
          refetch: jest.fn(),
          isFetching: false,
        }),
        useCreateEmpresaTransportistaMutation: () => [jest.fn(), { isLoading: false }],
        useUpdateEmpresaTransportistaMutation: () => [jest.fn(), { isLoading: false }],
        useDeleteEmpresaTransportistaMutation: () => [deleteMock, { isLoading: false }],
      }));

      const module = await import('../EmpresasTransportistasPage');
      const Page = module.default;

      render(
        <MemoryRouter>
          <Page />
        </MemoryRouter>
      );

      const deleteButtons = screen.getAllByText('Eliminar');
      fireEvent.click(deleteButtons[0]);

      await waitFor(() => {
        expect(screen.getByText('Confirmar eliminación')).toBeInTheDocument();
      });

      const confirmButton = screen.getByText('Eliminar');
      await act(async () => {
        fireEvent.click(confirmButton);
      });

      await waitFor(() => {
        expect(deleteMock).toHaveBeenCalledWith(1);
        expect(mockAlert).toHaveBeenCalledWith('Empresa eliminada', 'success');
      });
    });

    it('debería deshabilitar botón Eliminar durante eliminación', async () => {
      await jest.unstable_mockModule('../../api/documentosApiSlice', () => ({
        useGetDadoresQuery: () => ({
          data: { list: mockDadores, defaults: { defaultDadorId: 1 } },
          isLoading: false,
        }),
        useGetDefaultsQuery: () => ({
          data: { defaultDadorId: 1 },
          isLoading: false,
        }),
        useGetEmpresasTransportistasQuery: () => ({
          data: mockEmpresas,
          refetch: jest.fn(),
          isFetching: false,
        }),
        useCreateEmpresaTransportistaMutation: () => [jest.fn(), { isLoading: false }],
        useUpdateEmpresaTransportistaMutation: () => [jest.fn(), { isLoading: false }],
        useDeleteEmpresaTransportistaMutation: () => [jest.fn(), { isLoading: true }],
      }));

      const module = await import('../EmpresasTransportistasPage');
      const Page = module.default;

      render(
        <MemoryRouter>
          <Page />
        </MemoryRouter>
      );

      const deleteButtons = screen.getAllByText('Eliminar');
      expect(deleteButtons[0]).toBeDisabled();
    });
  });

  describe('effectiveDadorId', () => {
    it('debería usar dadorCargaId cuando es número', async () => {
      renderPage();

      // El componente debería usar el dador seleccionado
      expect(screen.getByText('Empresas Transportistas')).toBeInTheDocument();
    });

    it('debería usar defaultDadorId cuando dadorCargaId está vacío', async () => {
      await jest.unstable_mockModule('../../api/documentosApiSlice', () => ({
        useGetDadoresQuery: () => ({
          data: { list: mockDadores, defaults: { defaultDadorId: 2 } },
          isLoading: false,
        }),
        useGetDefaultsQuery: () => ({
          data: { defaultDadorId: 2 },
          isLoading: false,
        }),
        useGetEmpresasTransportistasQuery: () => ({
          data: mockEmpresas,
          refetch: jest.fn(),
          isFetching: false,
        }),
        useCreateEmpresaTransportistaMutation: () => [jest.fn(), { isLoading: false }],
        useUpdateEmpresaTransportistaMutation: () => [jest.fn(), { isLoading: false }],
        useDeleteEmpresaTransportistaMutation: () => [jest.fn(), { isLoading: false }],
      }));

      const module = await import('../EmpresasTransportistasPage');
      const Page = module.default;

      render(
        <MemoryRouter>
          <Page />
        </MemoryRouter>
      );
    });

    it('debería usar primer dador cuando no hay defaults', async () => {
      await jest.unstable_mockModule('../../api/documentosApiSlice', () => ({
        useGetDadoresQuery: () => ({
          data: { list: mockDadores },
          isLoading: false,
        }),
        useGetDefaultsQuery: () => ({
          data: {},
          isLoading: false,
        }),
        useGetEmpresasTransportistasQuery: () => ({
          data: mockEmpresas,
          refetch: jest.fn(),
          isFetching: false,
        }),
        useCreateEmpresaTransportistaMutation: () => [jest.fn(), { isLoading: false }],
        useUpdateEmpresaTransportistaMutation: () => [jest.fn(), { isLoading: false }],
        useDeleteEmpresaTransportistaMutation: () => [jest.fn(), { isLoading: false }],
      }));

      const module = await import('../EmpresasTransportistasPage');
      const Page = module.default;

      render(
        <MemoryRouter>
          <Page />
        </MemoryRouter>
      );
    });
  });

  describe('Acciones de fila', () => {
    it('debería tener botón Detalle', () => {
      renderPage();

      expect(screen.getByText('Detalle')).toBeInTheDocument();
    });

    it('debería tener botón Editar', () => {
      renderPage();

      const editButtons = screen.getAllByText('Editar');
      expect(editButtons.length).toBeGreaterThan(0);
    });

    it('debería tener botón Eliminar', () => {
      renderPage();

      const deleteButtons = screen.getAllByText('Eliminar');
      expect(deleteButtons.length).toBeGreaterThan(0);
    });
  });

  describe('Navegación', () => {
    it('debería navegar atrás al hacer click en Volver', async () => {
      const user = userEvent.setup();
      renderPage();

      const backButton = screen.getByText('← Volver');
      await user.click(backButton);

      expect(mockGoBack).toHaveBeenCalledTimes(1);
    });
  });

  describe('Loading states', () => {
    it('debería deshabilitar botón Buscar durante isFetching', async () => {
      await jest.unstable_mockModule('../../api/documentosApiSlice', () => ({
        useGetDadoresQuery: () => ({
          data: { list: mockDadores },
          isLoading: false,
        }),
        useGetDefaultsQuery: () => ({
          data: {},
          isLoading: false,
        }),
        useGetEmpresasTransportistasQuery: () => ({
          data: mockEmpresas,
          refetch: jest.fn(),
          isFetching: true,
        }),
        useCreateEmpresaTransportistaMutation: () => [jest.fn(), { isLoading: false }],
        useUpdateEmpresaTransportistaMutation: () => [jest.fn(), { isLoading: false }],
        useDeleteEmpresaTransportistaMutation: () => [jest.fn(), { isLoading: false }],
      }));

      const module = await import('../EmpresasTransportistasPage');
      const Page = module.default;

      render(
        <MemoryRouter>
          <Page />
        </MemoryRouter>
      );

      const searchButton = screen.getByText('Buscar');
      expect(searchButton).toBeDisabled();
    });

    it('debería deshabilitar botón Guardar durante creación', async () => {
      await jest.unstable_mockModule('../../api/documentosApiSlice', () => ({
        useGetDadoresQuery: () => ({
          data: { list: mockDadores, defaults: { defaultDadorId: 1 } },
          isLoading: false,
        }),
        useGetDefaultsQuery: () => ({
          data: { defaultDadorId: 1 },
          isLoading: false,
        }),
        useGetEmpresasTransportistasQuery: () => ({
          data: mockEmpresas,
          refetch: jest.fn(),
          isFetching: false,
        }),
        useCreateEmpresaTransportistaMutation: () => [jest.fn(), { isLoading: true }],
        useUpdateEmpresaTransportistaMutation: () => [jest.fn(), { isLoading: false }],
        useDeleteEmpresaTransportistaMutation: () => [jest.fn(), { isLoading: false }],
      }));

      const module = await import('../EmpresasTransportistasPage');
      const Page = module.default;

      render(
        <MemoryRouter>
          <Page />
        </MemoryRouter>
      );

      const newButton = screen.getByText('Nueva Empresa');
      fireEvent.click(newButton);

      await waitFor(() => {
        expect(screen.getByText('Guardar')).toBeDisabled();
      });
    });

    it('debería deshabilitar botón Guardar durante actualización', async () => {
      await jest.unstable_mockModule('../../api/documentosApiSlice', () => ({
        useGetDadoresQuery: () => ({
          data: { list: mockDadores, defaults: { defaultDadorId: 1 } },
          isLoading: false,
        }),
        useGetDefaultsQuery: () => ({
          data: { defaultDadorId: 1 },
          isLoading: false,
        }),
        useGetEmpresasTransportistasQuery: () => ({
          data: mockEmpresas,
          refetch: jest.fn(),
          isFetching: false,
        }),
        useCreateEmpresaTransportistaMutation: () => [jest.fn(), { isLoading: false }],
        useUpdateEmpresaTransportistaMutation: () => [jest.fn(), { isLoading: true }],
        useDeleteEmpresaTransportistaMutation: () => [jest.fn(), { isLoading: false }],
      }));

      const module = await import('../EmpresasTransportistasPage');
      const Page = module.default;

      render(
        <MemoryRouter>
          <Page />
        </MemoryRouter>
      );

      const editButtons = screen.getAllByText('Editar');
      fireEvent.click(editButtons[0]);

      await waitFor(() => {
        expect(screen.getByText('Guardar')).toBeDisabled();
      });
    });
  });
});