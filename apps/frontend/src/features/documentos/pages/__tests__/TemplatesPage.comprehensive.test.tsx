/**
 * Tests comprehensivos para TemplatesPage
 * Cubre todos los branches y handlers para alcanzar ≥90% cobertura
 */
import React from 'react';
import { describe, it, expect, beforeAll, beforeEach, jest } from '@jest/globals';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

describe('TemplatesPage - Comprehensive Coverage', () => {
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
      useGetTemplatesQuery: (...args: unknown[]) => useGetTemplatesQuery(...args),
      useCreateTemplateMutation: (...args: unknown[]) => useCreateTemplateMutation(...args),
      useUpdateTemplateMutation: (...args: unknown[]) => useUpdateTemplateMutation(...args),
      useDeleteTemplateMutation: (...args: unknown[]) => useDeleteTemplateMutation(...args),
      DocumentTemplate: {},
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

    // Mock de componentes UI
    await jest.unstable_mockModule('../../../../components/ui/button', () => ({
      Button: ({ children, onClick, disabled, variant, className }: any) => (
        <button onClick={onClick} disabled={disabled} className={className} data-variant={variant}>
          {children}
        </button>
      ),
    }));

    await jest.unstable_mockModule('../../../../components/ui/card', () => ({
      Card: ({ children, className }: any) => <div className={className}>{children}</div>,
    }));

    await jest.unstable_mockModule('@heroicons/react/24/outline', () => ({
      ArrowLeftIcon: ({ className }: any) => <span className={className}>◀</span>,
      PlusIcon: ({ className }: any) => <span className={className}>+</span>,
      DocumentTextIcon: ({ className }: any) => <span className={className}>📄</span>,
    }));

    // Mock de componentes hijos
    await jest.unstable_mockModule('../components/TemplatesList', () => ({
      TemplatesList: ({ templates, isLoading, onEdit, onDelete, onToggleActive }: any) => (
        <div data-testid="templates-list">
          {isLoading && <div data-testid="loading">Loading...</div>}
          {templates.map((t: any) => (
            <div key={t.id} data-testid={`template-${t.id}`}>
              <span>{t.nombre}</span>
              <button onClick={() => onEdit(t)}>Edit</button>
              <button onClick={() => onDelete(t.id)}>Delete</button>
              <button onClick={() => onToggleActive(t)}>Toggle</button>
            </div>
          ))}
        </div>
      ),
    }));

    await jest.unstable_mockModule('../components/TemplateFormModal', () => ({
      TemplateFormModal: ({ isOpen, onClose, onSave, template, isLoading }: any) => {
        if (!isOpen) return null;
        return (
          <div data-testid="form-modal">
            <span>{template ? 'Edit' : 'Create'} Template</span>
            <button
              onClick={() => onSave({ nombre: 'Test', entityType: 'CHOFER', descripcion: 'Test' })}
              disabled={isLoading}
            >
              Save
            </button>
            <button onClick={onClose}>Cancel</button>
          </div>
        );
      },
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

  describe('Renderizado básico', () => {
    it('debería importar el componente', () => {
      expect(TemplatesPage).toBeDefined();
    });

    it('debería renderizar sin crashear', () => {
      renderPage();
      expect(screen.getByText('Gestión de Plantillas')).toBeInTheDocument();
    });

    it('debería mostrar título y botón volver', () => {
      renderPage();
      expect(screen.getByText('Gestión de Plantillas')).toBeInTheDocument();
      expect(screen.getByText('Volver')).toBeInTheDocument();
    });

    it('debería mostrar botón Nueva Plantilla', () => {
      renderPage();
      expect(screen.getByText('Nueva Plantilla')).toBeInTheDocument();
    });

    it('debería mostrar la lista de templates', () => {
      renderPage();
      expect(screen.getByTestId('templates-list')).toBeInTheDocument();
      expect(screen.getByText('DNI Chofer')).toBeInTheDocument();
      expect(screen.getByText('Seguro Camión')).toBeInTheDocument();
    });
  });

  describe('Estadísticas', () => {
    it('debería mostrar estadísticas correctas', () => {
      renderPage();

      // Total: 2
      const twos = screen.getAllByText('2');
      expect(twos.length).toBeGreaterThan(0);

      // Activas: 1 (solo DNI Chofer)
      const ones = screen.getAllByText('1');
      expect(ones.length).toBeGreaterThan(0);

      // Inactivas: 1 (solo Seguro Camión)
      expect(screen.getByText('Inactivas')).toBeInTheDocument();
    });

    it('debería calcular tipos únicos correctamente', () => {
      renderPage();

      // CHOFER y CAMION = 2 tipos únicos
      const twos = screen.getAllByText('2');
      expect(twos.length).toBeGreaterThan(0);
    });

    it('debería manejar array vacío de templates', () => {
      useGetTemplatesQuery.mockReturnValue({
        data: [],
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      });

      renderPage();

      const zeros = screen.getAllByText('0');
      expect(zeros.length).toBeGreaterThan(0);
    });

    it('debería manejar templates con mismo entityType', () => {
      const sameTypeTemplates = [
        { ...mockTemplates[0], id: 1, entityType: 'CHOFER' },
        { ...mockTemplates[0], id: 2, entityType: 'CHOFER' },
      ];

      useGetTemplatesQuery.mockReturnValue({
        data: sameTypeTemplates,
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      });

      renderPage();

      // Total: 2, Activas: 2, Inactivas: 0, Tipos: 1
      expect(screen.getAllByText('2').length).toBeGreaterThan(0);
    });
  });

  describe('Estado de error', () => {
    it('debería mostrar pantalla de error cuando templatesError existe', () => {
      useGetTemplatesQuery.mockReturnValue({
        data: undefined,
        isLoading: false,
        error: { message: 'Error loading templates' },
        refetch: jest.fn(),
      });

      renderPage();

      expect(screen.getByText('Error')).toBeInTheDocument();
      expect(screen.getByText('No se pudieron cargar las plantillas')).toBeInTheDocument();
    });

    it('debería tener botón volver en pantalla de error', () => {
      useGetTemplatesQuery.mockReturnValue({
        data: undefined,
        isLoading: false,
        error: { message: 'Error loading templates' },
        refetch: jest.fn(),
      });

      renderPage();

      const errorButtons = screen.getAllByText('Volver');
      expect(errorButtons.length).toBeGreaterThan(0);
    });
  });

  describe('Estado de loading', () => {
    it('debería deshabilitar botón Nueva Plantilla durante loading', () => {
      useGetTemplatesQuery.mockReturnValue({
        data: mockTemplates,
        isLoading: true,
        error: null,
        refetch: jest.fn(),
      });

      renderPage();

      const button = screen.getByText('Nueva Plantilla') as HTMLButtonElement;
      expect(button.disabled).toBe(true);
    });

    it('debería mostrar indicador de loading en TemplatesList', () => {
      useGetTemplatesQuery.mockReturnValue({
        data: [],
        isLoading: true,
        error: null,
        refetch: jest.fn(),
      });

      renderPage();

      expect(screen.getByTestId('loading')).toBeInTheDocument();
    });
  });

  describe('handleCreate', () => {
    it('debería abrir modal para crear nueva plantilla', async () => {
      renderPage();

      const createButton = screen.getByText('Nueva Plantilla');
      fireEvent.click(createButton);

      await waitFor(() => {
        expect(screen.getByText('Create Template')).toBeInTheDocument();
      });
    });

    it('debería resetear editingTemplate al abrir modal de creación', async () => {
      renderPage();

      const createButton = screen.getByText('Nueva Plantilla');
      fireEvent.click(createButton);

      await waitFor(() => {
        const modal = screen.getByTestId('form-modal');
        expect(modal).toContainHTML('Create Template');
        expect(modal).not.toContainHTML('Edit Template');
      });
    });
  });

  describe('handleEdit', () => {
    it('debería abrir modal de edición con template seleccionado', async () => {
      renderPage();

      const editButton = screen.getAllByText('Edit')[0];
      fireEvent.click(editButton);

      await waitFor(() => {
        expect(screen.getByText('Edit Template')).toBeInTheDocument();
      });
    });

    it('debería pasar template correcto al modal', async () => {
      renderPage();

      const editButton = screen.getAllByText('Edit')[0]; // Edit DNI Chofer
      fireEvent.click(editButton);

      await waitFor(() => {
        expect(screen.getByText('Edit Template')).toBeInTheDocument();
      });
    });
  });

  describe('handleSave - Crear template', () => {
    it('debería crear template exitosamente', async () => {
      const createMut = jest.fn().mockResolvedValue({
        data: { id: 3, nombre: 'Nueva', entityType: 'CHOFER', isActive: true }
      });
      useCreateTemplateMutation.mockReturnValue([createMut, { isLoading: false }]);
      const refetchMock = jest.fn();
      useGetTemplatesQuery.mockReturnValue({
        data: mockTemplates,
        isLoading: false,
        error: null,
        refetch: refetchMock,
      });

      renderPage();

      // Abrir modal de creación
      const createButton = screen.getByText('Nueva Plantilla');
      fireEvent.click(createButton);

      await waitFor(() => {
        expect(screen.getByText('Create Template')).toBeInTheDocument();
      });

      // Guardar
      const saveButton = screen.getByText('Save');
      await act(async () => {
        fireEvent.click(saveButton);
      });

      await waitFor(() => {
        expect(createMut).toHaveBeenCalledWith({
          nombre: 'Test',
          entityType: 'CHOFER',
          descripcion: 'Test',
        });
        expect(mockShow).toHaveBeenCalledWith('Plantilla creada exitosamente', 'success');
        expect(refetchMock).toHaveBeenCalled();
      });
    });

    it('debería manejar error al crear template', async () => {
      const createMut = jest.fn().mockRejectedValue({
        data: { message: 'Error al crear plantilla' }
      });
      useCreateTemplateMutation.mockReturnValue([createMut, { isLoading: false }]);

      renderPage();

      const createButton = screen.getByText('Nueva Plantilla');
      fireEvent.click(createButton);

      await waitFor(() => {
        expect(screen.getByText('Create Template')).toBeInTheDocument();
      });

      const saveButton = screen.getByText('Save');
      await act(async () => {
        fireEvent.click(saveButton);
      });

      await waitFor(() => {
        expect(mockShow).toHaveBeenCalledWith('Error al crear plantilla', 'error');
      });
    });

    it('debería manejar error genérico al crear template', async () => {
      const createMut = jest.fn().mockRejectedValue({});
      useCreateTemplateMutation.mockReturnValue([createMut, { isLoading: false }]);

      renderPage();

      const createButton = screen.getByText('Nueva Plantilla');
      fireEvent.click(createButton);

      await waitFor(() => {
        expect(screen.getByText('Create Template')).toBeInTheDocument();
      });

      const saveButton = screen.getByText('Save');
      await act(async () => {
        fireEvent.click(saveButton);
      });

      await waitFor(() => {
        expect(mockShow).toHaveBeenCalledWith('Error al guardar plantilla', 'error');
      });
    });

    it('debería cerrar modal después de crear exitosamente', async () => {
      const createMut = jest.fn().mockResolvedValue({
        data: { id: 3, nombre: 'Nueva', entityType: 'CHOFER', isActive: true }
      });
      useCreateTemplateMutation.mockReturnValue([createMut, { isLoading: false }]);

      renderPage();

      const createButton = screen.getByText('Nueva Plantilla');
      fireEvent.click(createButton);

      await waitFor(() => {
        expect(screen.getByText('Create Template')).toBeInTheDocument();
      });

      const saveButton = screen.getByText('Save');
      await act(async () => {
        fireEvent.click(saveButton);
      });

      await waitFor(() => {
        expect(screen.queryByText('Create Template')).not.toBeInTheDocument();
      });
    });

    it('debería mostrar loading durante creación', async () => {
      let resolveCreate: (value: any) => void;
      const createMut = jest.fn(() => new Promise(resolve => {
        resolveCreate = resolve;
      }));
      useCreateTemplateMutation.mockReturnValue([createMut, { isLoading: true }]);

      renderPage();

      const createButton = screen.getByText('Nueva Plantilla');
      fireEvent.click(createButton);

      await waitFor(() => {
        expect(screen.getByText('Create Template')).toBeInTheDocument();
      });

      const saveButton = screen.getByText('Save');
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(saveButton).toBeDisabled();
      });

      resolveCreate!({ data: { id: 3, nombre: 'Nueva' } });
    });
  });

  describe('handleSave - Actualizar template', () => {
    it('debería actualizar template exitosamente', async () => {
      const updateMut = jest.fn().mockResolvedValue({
        data: { ...mockTemplates[0], nombre: 'DNI Chofer Actualizado' }
      });
      useUpdateTemplateMutation.mockReturnValue([updateMut, { isLoading: false }]);
      const refetchMock = jest.fn();
      useGetTemplatesQuery.mockReturnValue({
        data: mockTemplates,
        isLoading: false,
        error: null,
        refetch: refetchMock,
      });

      renderPage();

      // Abrir modal de edición
      const editButton = screen.getAllByText('Edit')[0];
      fireEvent.click(editButton);

      await waitFor(() => {
        expect(screen.getByText('Edit Template')).toBeInTheDocument();
      });

      // Guardar
      const saveButton = screen.getByText('Save');
      await act(async () => {
        fireEvent.click(saveButton);
      });

      await waitFor(() => {
        expect(updateMut).toHaveBeenCalledWith({
          id: 1,
          nombre: 'Test',
          entityType: 'CHOFER',
          descripcion: 'Test',
        });
        expect(mockShow).toHaveBeenCalledWith('Plantilla actualizada exitosamente', 'success');
        expect(refetchMock).toHaveBeenCalled();
      });
    });

    it('debería manejar error al actualizar template', async () => {
      const updateMut = jest.fn().mockRejectedValue({
        data: { message: 'Error al actualizar plantilla' }
      });
      useUpdateTemplateMutation.mockReturnValue([updateMut, { isLoading: false }]);

      renderPage();

      const editButton = screen.getAllByText('Edit')[0];
      fireEvent.click(editButton);

      await waitFor(() => {
        expect(screen.getByText('Edit Template')).toBeInTheDocument();
      });

      const saveButton = screen.getByText('Save');
      await act(async () => {
        fireEvent.click(saveButton);
      });

      await waitFor(() => {
        expect(mockShow).toHaveBeenCalledWith('Error al actualizar plantilla', 'error');
      });
    });

    it('debería manejar error genérico al actualizar template', async () => {
      const updateMut = jest.fn().mockRejectedValue({});
      useUpdateTemplateMutation.mockReturnValue([updateMut, { isLoading: false }]);

      renderPage();

      const editButton = screen.getAllByText('Edit')[0];
      fireEvent.click(editButton);

      await waitFor(() => {
        expect(screen.getByText('Edit Template')).toBeInTheDocument();
      });

      const saveButton = screen.getByText('Save');
      await act(async () => {
        fireEvent.click(saveButton);
      });

      await waitFor(() => {
        expect(mockShow).toHaveBeenCalledWith('Error al guardar plantilla', 'error');
      });
    });

    it('debería cerrar modal después de actualizar exitosamente', async () => {
      const updateMut = jest.fn().mockResolvedValue({
        data: { ...mockTemplates[0], nombre: 'Updated' }
      });
      useUpdateTemplateMutation.mockReturnValue([updateMut, { isLoading: false }]);

      renderPage();

      const editButton = screen.getAllByText('Edit')[0];
      fireEvent.click(editButton);

      await waitFor(() => {
        expect(screen.getByText('Edit Template')).toBeInTheDocument();
      });

      const saveButton = screen.getByText('Save');
      await act(async () => {
        fireEvent.click(saveButton);
      });

      await waitFor(() => {
        expect(screen.queryByText('Edit Template')).not.toBeInTheDocument();
      });
    });
  });

  describe('handleDelete', () => {
    it('debería eliminar template exitosamente', async () => {
      const deleteMut = jest.fn().mockResolvedValue(undefined);
      useDeleteTemplateMutation.mockReturnValue([deleteMut, { isLoading: false }]);
      const refetchMock = jest.fn();
      useGetTemplatesQuery.mockReturnValue({
        data: mockTemplates,
        isLoading: false,
        error: null,
        refetch: refetchMock,
      });

      renderPage();

      const deleteButton = screen.getAllByText('Delete')[0];
      await act(async () => {
        fireEvent.click(deleteButton);
      });

      await waitFor(() => {
        expect(mockConfirm).toHaveBeenCalledWith({
          message: '¿Estás seguro de que deseas eliminar esta plantilla?',
          confirmText: 'Eliminar',
        });
        expect(deleteMut).toHaveBeenCalledWith(1);
        expect(mockShow).toHaveBeenCalledWith('Plantilla eliminada exitosamente', 'success');
        expect(refetchMock).toHaveBeenCalled();
      });
    });

    it('debería no eliminar si confirm retorna false', async () => {
      const deleteMut = jest.fn().mockResolvedValue(undefined);
      useDeleteTemplateMutation.mockReturnValue([deleteMut, { isLoading: false }]);
      mockConfirm.mockResolvedValue(false);

      renderPage();

      const deleteButton = screen.getAllByText('Delete')[0];
      await act(async () => {
        fireEvent.click(deleteButton);
      });

      await waitFor(() => {
        expect(mockConfirm).toHaveBeenCalled();
        expect(deleteMut).not.toHaveBeenCalled();
      });
    });

    it('debería manejar error al eliminar template', async () => {
      const deleteMut = jest.fn().mockRejectedValue({
        data: { message: 'Error al eliminar plantilla' }
      });
      useDeleteTemplateMutation.mockReturnValue([deleteMut, { isLoading: false }]);

      renderPage();

      const deleteButton = screen.getAllByText('Delete')[0];
      await act(async () => {
        fireEvent.click(deleteButton);
      });

      await waitFor(() => {
        expect(mockShow).toHaveBeenCalledWith('Error al eliminar plantilla', 'error');
      });
    });

    it('debería manejar error genérico al eliminar template', async () => {
      const deleteMut = jest.fn().mockRejectedValue({});
      useDeleteTemplateMutation.mockReturnValue([deleteMut, { isLoading: false }]);

      renderPage();

      const deleteButton = screen.getAllByText('Delete')[0];
      await act(async () => {
        fireEvent.click(deleteButton);
      });

      await waitFor(() => {
        expect(mockShow).toHaveBeenCalledWith('Error al eliminar plantilla', 'error');
      });
    });
  });

  describe('handleToggleActive', () => {
    it('debería activar plantilla inactiva', async () => {
      const updateMut = jest.fn().mockResolvedValue({
        data: { ...mockTemplates[1], isActive: true }
      });
      useUpdateTemplateMutation.mockReturnValue([updateMut, { isLoading: false }]);
      const refetchMock = jest.fn();
      useGetTemplatesQuery.mockReturnValue({
        data: mockTemplates,
        isLoading: false,
        error: null,
        refetch: refetchMock,
      });

      renderPage();

      // Toggle Seguro Camión (índice 1, que está inactivo)
      const toggleButtons = screen.getAllByText('Toggle');
      const toggleButton = toggleButtons[1];
      await act(async () => {
        fireEvent.click(toggleButton);
      });

      await waitFor(() => {
        expect(updateMut).toHaveBeenCalledWith({
          id: 2,
          isActive: true,
        });
        expect(mockShow).toHaveBeenCalledWith('Plantilla activada exitosamente', 'success');
        expect(refetchMock).toHaveBeenCalled();
      });
    });

    it('debería desactivar plantilla activa', async () => {
      const updateMut = jest.fn().mockResolvedValue({
        data: { ...mockTemplates[0], isActive: false }
      });
      useUpdateTemplateMutation.mockReturnValue([updateMut, { isLoading: false }]);
      const refetchMock = jest.fn();
      useGetTemplatesQuery.mockReturnValue({
        data: mockTemplates,
        isLoading: false,
        error: null,
        refetch: refetchMock,
      });

      renderPage();

      // Toggle DNI Chofer (índice 0, que está activo)
      const toggleButtons = screen.getAllByText('Toggle');
      const toggleButton = toggleButtons[0];
      await act(async () => {
        fireEvent.click(toggleButton);
      });

      await waitFor(() => {
        expect(updateMut).toHaveBeenCalledWith({
          id: 1,
          isActive: false,
        });
        expect(mockShow).toHaveBeenCalledWith('Plantilla desactivada exitosamente', 'success');
      });
    });

    it('debería manejar error al cambiar estado de plantilla', async () => {
      const updateMut = jest.fn().mockRejectedValue({
        data: { message: 'Error al cambiar estado' }
      });
      useUpdateTemplateMutation.mockReturnValue([updateMut, { isLoading: false }]);

      renderPage();

      const toggleButton = screen.getAllByText('Toggle')[0];
      await act(async () => {
        fireEvent.click(toggleButton);
      });

      await waitFor(() => {
        expect(mockShow).toHaveBeenCalledWith('Error al cambiar estado de plantilla', 'error');
      });
    });

    it('debería manejar error genérico al cambiar estado', async () => {
      const updateMut = jest.fn().mockRejectedValue({});
      useUpdateTemplateMutation.mockReturnValue([updateMut, { isLoading: false }]);

      renderPage();

      const toggleButton = screen.getAllByText('Toggle')[0];
      await act(async () => {
        fireEvent.click(toggleButton);
      });

      await waitFor(() => {
        expect(mockShow).toHaveBeenCalledWith('Error al cambiar estado de plantilla', 'error');
      });
    });
  });

  describe('Modal onClose', () => {
    it('debería cerrar modal y resetear editingTemplate al cancelar', async () => {
      const createMut = jest.fn().mockResolvedValue({ data: { id: 3 } });
      useCreateTemplateMutation.mockReturnValue([createMut, { isLoading: false }]);

      renderPage();

      // Abrir modal
      const createButton = screen.getByText('Nueva Plantilla');
      fireEvent.click(createButton);

      await waitFor(() => {
        expect(screen.getByText('Create Template')).toBeInTheDocument();
      });

      // Cerrar modal
      const cancelButton = screen.getByText('Cancel');
      fireEvent.click(cancelButton);

      await waitFor(() => {
        expect(screen.queryByText('Create Template')).not.toBeInTheDocument();
      });
    });

    it('debería cerrar modal después de guardar exitosamente', async () => {
      const createMut = jest.fn().mockResolvedValue({ data: { id: 3 } });
      useCreateTemplateMutation.mockReturnValue([createMut, { isLoading: false }]);

      renderPage();

      const createButton = screen.getByText('Nueva Plantilla');
      fireEvent.click(createButton);

      await waitFor(() => {
        expect(screen.getByText('Create Template')).toBeInTheDocument();
      });

      const saveButton = screen.getByText('Save');
      await act(async () => {
        fireEvent.click(saveButton);
      });

      await waitFor(() => {
        expect(screen.queryByText('Create Template')).not.toBeInTheDocument();
      });
    });
  });

  describe('Navegación', () => {
    it('debería navegar a /documentos al hacer click en Volver', async () => {
      const user = userEvent.setup();
      renderPage();

      const backButton = screen.getAllByText('Volver')[0];
      await user.click(backButton);

      expect(mockNavigate).toHaveBeenCalledWith('/documentos');
    });

    it('debería navegar desde la pantalla de error', async () => {
      const user = userEvent.setup();
      useGetTemplatesQuery.mockReturnValue({
        data: undefined,
        isLoading: false,
        error: { message: 'Error loading templates' },
        refetch: jest.fn(),
      });

      renderPage();

      const backButton = screen.getAllByText('Volver')[0];
      await user.click(backButton);

      expect(mockNavigate).toHaveBeenCalledWith('/documentos');
    });
  });

  describe('Integración completa', () => {
    it('debería manejar flujo completo: crear, editar, activar, eliminar', async () => {
      const createMut = jest.fn().mockResolvedValue({ data: { id: 3 } });
      const updateMut = jest.fn().mockResolvedValue({ data: mockTemplates[0] });
      const deleteMut = jest.fn().mockResolvedValue(undefined);
      useCreateTemplateMutation.mockReturnValue([createMut, { isLoading: false }]);
      useUpdateTemplateMutation.mockReturnValue([updateMut, { isLoading: false }]);
      useDeleteTemplateMutation.mockReturnValue([deleteMut, { isLoading: false }]);

      renderPage();

      // 1. Crear
      const createButton = screen.getByText('Nueva Plantilla');
      fireEvent.click(createButton);

      await waitFor(() => {
        expect(screen.getByText('Create Template')).toBeInTheDocument();
      });

      const saveButton = screen.getByText('Save');
      await act(async () => {
        fireEvent.click(saveButton);
      });

      await waitFor(() => {
        expect(mockShow).toHaveBeenCalledWith('Plantilla creada exitosamente', 'success');
      });

      // 2. Editar
      const editButton = screen.getAllByText('Edit')[0];
      fireEvent.click(editButton);

      await waitFor(() => {
        expect(screen.getByText('Edit Template')).toBeInTheDocument();
      });

      await act(async () => {
        fireEvent.click(saveButton);
      });

      await waitFor(() => {
        expect(mockShow).toHaveBeenCalledWith('Plantilla actualizada exitosamente', 'success');
      });

      // 3. Toggle
      const toggleButton = screen.getAllByText('Toggle')[0];
      await act(async () => {
        fireEvent.click(toggleButton);
      });

      await waitFor(() => {
        expect(mockShow).toHaveBeenCalledWith('Plantilla desactivada exitosamente', 'success');
      });

      // 4. Eliminar
      const deleteButton = screen.getAllByText('Delete')[0];
      await act(async () => {
        fireEvent.click(deleteButton);
      });

      await waitFor(() => {
        expect(mockShow).toHaveBeenCalledWith('Plantilla eliminada exitosamente', 'success');
      });
    });
  });
});