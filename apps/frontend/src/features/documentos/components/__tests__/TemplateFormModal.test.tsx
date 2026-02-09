// Tests completos de `TemplateFormModal`: modal de formulario de plantillas (Jest ESM).
import React from 'react';
import { describe, it, expect, beforeAll, beforeEach, jest } from '@jest/globals';
import { render, screen, fireEvent } from '@testing-library/react';

describe('TemplateFormModal - render completo con coverage', () => {
  let TemplateFormModal: React.FC;
  let mockOnClose: jest.Mock;
  let mockOnSave: jest.Mock;

  beforeAll(async () => {
    mockOnClose = jest.fn();
    mockOnSave = jest.fn();

    const module = await import('../TemplateFormModal');
    TemplateFormModal = module.default || module.TemplateFormModal;
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const renderModal = (props: any = {}) => {
    const defaultProps = {
      isOpen: true,
      onClose: mockOnClose,
      onSave: mockOnSave,
      isLoading: false,
      ...props,
    };

    return render(<TemplateFormModal {...defaultProps} />);
  };

  it('no renderiza nada cuando isOpen es false', () => {
    renderModal({ isOpen: false });
    expect(screen.queryByText('Nueva Plantilla')).not.toBeInTheDocument();
  });

  it('renderiza el modal en modo creación', () => {
    renderModal();

    expect(screen.getByText('Nueva Plantilla')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Ej: Licencia de Conducir, CUIT, etc.')).toBeInTheDocument();
    expect(screen.getByText(/Tipo de Entidad/)).toBeInTheDocument();
    expect(screen.getByText('Cancelar')).toBeInTheDocument();
    expect(screen.getByText('Crear Plantilla')).toBeInTheDocument();
  });

  it('renderiza el modal en modo edición', () => {
    const mockTemplate = {
      id: 1,
      nombre: 'DNI Chofer',
      entityType: 'CAMION',
    };

    renderModal({ template: mockTemplate });

    expect(screen.getByText('Editar Plantilla')).toBeInTheDocument();
    expect(screen.getByDisplayValue('DNI Chofer')).toBeInTheDocument();

    // Verificar el valor del select directamente
    const entitySelect = screen.getByRole('combobox') as HTMLSelectElement;
    expect(entitySelect.value).toBe('CAMION');
  });

  it('actualiza el campo nombre', () => {
    renderModal();

    const nombreInput = screen.getByPlaceholderText('Ej: Licencia de Conducir, CUIT, etc.');
    fireEvent.change(nombreInput, { target: { value: 'Licencia de conducir' } });

    expect(nombreInput).toHaveValue('Licencia de conducir');
  });

  it('actualiza el campo entityType', () => {
    renderModal();

    const entitySelect = screen.getByRole('combobox');
    fireEvent.change(entitySelect, { target: { value: 'CHOFER' } });

    expect(entitySelect).toHaveValue('CHOFER');
  });

  it('muestra error cuando nombre está vacío', () => {
    renderModal();

    const nombreInput = screen.getByPlaceholderText('Ej: Licencia de Conducir, CUIT, etc.');
    const saveButton = screen.getByText('Crear Plantilla');

    // El formulario inicialmente tiene un valor vacío en nombre
    expect(nombreInput).toHaveValue('');

    // Intentar guardar sin cambiar el valor vacío
    // Nota: Usamos el form submit directamente porque click en el botón no siempre dispara submit en tests
    const form = nombreInput.closest('form')!;
    const submitEvent = new Event('submit', { bubbles: true, cancelable: true });
    form.dispatchEvent(submitEvent);

    // onSave no debería haber sido llamado
    expect(mockOnSave).not.toHaveBeenCalled();
  });

  it('muestra error cuando nombre tiene menos de 3 caracteres', () => {
    renderModal();

    const nombreInput = screen.getByPlaceholderText('Ej: Licencia de Conducir, CUIT, etc.');
    const saveButton = screen.getByText('Crear Plantilla');

    fireEvent.change(nombreInput, { target: { value: 'ab' } });
    fireEvent.click(saveButton);

    expect(screen.getByText('El nombre debe tener al menos 3 caracteres')).toBeInTheDocument();
    expect(mockOnSave).not.toHaveBeenCalled();
  });

  it('llama a onSave con los datos correctos', () => {
    renderModal();

    const nombreInput = screen.getByPlaceholderText('Ej: Licencia de Conducir, CUIT, etc.');
    const entitySelect = screen.getByRole('combobox');
    const saveButton = screen.getByText('Crear Plantilla');

    fireEvent.change(nombreInput, { target: { value: 'Seguro de camión' } });
    fireEvent.change(entitySelect, { target: { value: 'CAMION' } });
    fireEvent.click(saveButton);

    expect(mockOnSave).toHaveBeenCalledWith({
      nombre: 'Seguro de camión',
      entityType: 'CAMION',
    });
  });

  it('llama a onClose al hacer click en Cancelar', () => {
    renderModal();

    const cancelButton = screen.getByText('Cancelar');
    fireEvent.click(cancelButton);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('deshabilita el botón Crear cuando isLoading es true', () => {
    renderModal({ isLoading: true });

    const saveButton = screen.getByText('Crear Plantilla') as HTMLButtonElement;
    expect(saveButton).toBeDisabled();
  });

  it('muestra spinner cuando isLoading es true', () => {
    renderModal({ isLoading: true });

    const spinner = screen.getByText('Crear Plantilla').querySelector('.animate-spin');
    expect(spinner).toBeInTheDocument();
  });

  it('muestra "Actualizar Plantilla" en modo edición', () => {
    const mockTemplate = {
      id: 1,
      nombre: 'DNI Chofer',
      entityType: 'CAMION',
    };

    renderModal({ template: mockTemplate, isLoading: true });

    expect(screen.getByText('Actualizar Plantilla')).toBeInTheDocument();
  });

  it('limpia los errores al corregir el nombre', () => {
    renderModal();

    const nombreInput = screen.getByPlaceholderText('Ej: Licencia de Conducir, CUIT, etc.');
    const saveButton = screen.getByText('Crear Plantilla');

    // Intentar guardar con nombre muy corto
    fireEvent.change(nombreInput, { target: { value: 'ab' } });
    fireEvent.click(saveButton);

    expect(screen.getByText('El nombre debe tener al menos 3 caracteres')).toBeInTheDocument();

    // Corregir el nombre
    fireEvent.change(nombreInput, { target: { value: 'Nombre válido' } });

    // El error debería desaparecer
    expect(screen.queryByText('El nombre debe tener al menos 3 caracteres')).not.toBeInTheDocument();
  });

  it('preinicializa el formulario con datos del template en modo edición', () => {
    const mockTemplate = {
      id: 1,
      nombre: 'VTV Camión',
      entityType: 'CAMION',
    };

    renderModal({ template: mockTemplate });

    expect(screen.getByDisplayValue('VTV Camión')).toBeInTheDocument();

    // Verificar el valor del select directamente
    const entitySelect = screen.getByRole('combobox') as HTMLSelectElement;
    expect(entitySelect.value).toBe('CAMION');
  });

  it('muestra todas las opciones de entityType', () => {
    renderModal();

    const entitySelect = screen.getByRole('combobox');

    expect(entitySelect).toContainElement(screen.getByText('🏢 Empresa Transportista'));
    expect(entitySelect).toContainElement(screen.getByText('👨‍💼 Chofer'));
    expect(entitySelect).toContainElement(screen.getByText('🚛 Camión'));
    expect(entitySelect).toContainElement(screen.getByText('🚚 Acoplado'));
  });

  it('reinicia el formulario cuando se cierra y abre de nuevo', () => {
    const { rerender } = renderModal({ template: null });

    const nombreInput = screen.getByPlaceholderText('Ej: Licencia de Conducir, CUIT, etc.');
    fireEvent.change(nombreInput, { target: { value: 'Mi plantilla' } });

    // Cerrar y volver a abrir
    rerender(<TemplateFormModal isOpen={false} onClose={mockOnClose} onSave={mockOnSave} isLoading={false} />);
    rerender(<TemplateFormModal isOpen={true} onClose={mockOnClose} onSave={mockOnSave} isLoading={false} />);

    // Debería estar vacío
    expect(screen.getByDisplayValue('')).toBeInTheDocument();
  });

  it('reinicia el formulario cuando cambia el template', () => {
    const { rerender } = renderModal({ template: null });

    const nombreInput = screen.getByPlaceholderText('Ej: Licencia de Conducir, CUIT, etc.');
    fireEvent.change(nombreInput, { target: { value: 'Mi plantilla' } });

    const mockTemplate = {
      id: 1,
      nombre: 'Plantilla Existente',
      entityType: 'CHOFER',
    };

    rerender(<TemplateFormModal isOpen={true} onClose={mockOnClose} onSave={mockOnSave} template={mockTemplate} isLoading={false} />);

    // Debería mostrar los datos del template
    expect(screen.getByDisplayValue('Plantilla Existente')).toBeInTheDocument();
  });

  it('muestra información adicional', () => {
    renderModal();

    expect(screen.getByText('Información')).toBeInTheDocument();
    // Los textos de información están en <li>, usamos matchers más flexibles
    expect(screen.getAllByText(/plantillas/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/formulario de subida/).length).toBeGreaterThan(0);
  });
});
