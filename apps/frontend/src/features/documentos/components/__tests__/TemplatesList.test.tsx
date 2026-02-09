// Tests completos de `TemplatesList`: filtros, estados y acciones (Jest ESM).
import React from 'react';
import { describe, it, expect, beforeAll, beforeEach, jest } from '@jest/globals';
import { render, screen, fireEvent } from '@testing-library/react';

describe('TemplatesList - render completo con coverage', () => {
  let TemplatesList: React.FC;
  let mockFormatDate: jest.Mock;

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
    {
      id: 3,
      nombre: 'VTV Acoplado',
      entityType: 'ACOPLADO',
      descripcion: null,
      isActive: true,
      createdAt: '2025-01-03T00:00:00.000Z',
      updatedAt: '2025-01-12T00:00:00.000Z',
    },
  ];

  beforeAll(async () => {
    mockFormatDate = jest.fn((date) => '01/01/2025');

    await jest.unstable_mockModule('../../../../utils/formatters', () => ({
      formatDate: (...args: any[]) => mockFormatDate(...args),
    }));

    const module = await import('../TemplatesList');
    TemplatesList = module.TemplatesList;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockFormatDate.mockReturnValue('01/01/2025');
  });

  it('muestra skeleton cuando isLoading=true', () => {
    const { container } = render(
      <TemplatesList
        templates={[]}
        isLoading={true}
        onEdit={() => {}}
        onDelete={() => {}}
        onToggleActive={() => {}}
      />
    );
    expect(container.querySelector('.animate-pulse')).toBeInTheDocument();
  });

  it('muestra mensaje cuando no hay templates', () => {
    render(
      <TemplatesList
        templates={[]}
        isLoading={false}
        onEdit={() => {}}
        onDelete={() => {}}
        onToggleActive={() => {}}
      />
    );
    expect(screen.getByText('No hay plantillas')).toBeInTheDocument();
    expect(screen.getByText('Comienza creando la primera plantilla del sistema.')).toBeInTheDocument();
  });

  it('renderiza lista de templates con filtros', () => {
    render(
      <TemplatesList
        templates={mockTemplates}
        isLoading={false}
        onEdit={() => {}}
        onDelete={() => {}}
        onToggleActive={() => {}}
      />
    );
    expect(screen.getByText('Plantillas (3)')).toBeInTheDocument();
    expect(screen.getByText('DNI Chofer')).toBeInTheDocument();
    expect(screen.getByText('Seguro Camión')).toBeInTheDocument();
    expect(screen.getByText('VTV Acoplado')).toBeInTheDocument();
  });

  it('filtra por tipo de entidad CHOFER', () => {
    render(
      <TemplatesList
        templates={mockTemplates}
        isLoading={false}
        onEdit={() => {}}
        onDelete={() => {}}
        onToggleActive={() => {}}
      />
    );

    const selectElements = screen.getAllByDisplayValue('Todos');
    const entityTypeSelect = selectElements[0]; // First select is entityType
    fireEvent.change(entityTypeSelect, { target: { value: 'CHOFER' } });

    expect(screen.getByText('Plantillas (1)')).toBeInTheDocument();
    expect(screen.getByText('DNI Chofer')).toBeInTheDocument();
    expect(screen.queryByText('Seguro Camión')).not.toBeInTheDocument();
  });

  it('filtra solo templates activas', () => {
    render(
      <TemplatesList
        templates={mockTemplates}
        isLoading={false}
        onEdit={() => {}}
        onDelete={() => {}}
        onToggleActive={() => {}}
      />
    );

    const selectElements = screen.getAllByDisplayValue('Todos');
    const estadoSelect = selectElements[1];
    fireEvent.change(estadoSelect, { target: { value: 'active' } });

    expect(screen.getByText('Plantillas (2)')).toBeInTheDocument();
    expect(screen.getByText('DNI Chofer')).toBeInTheDocument();
    expect(screen.getByText('VTV Acoplado')).toBeInTheDocument();
    expect(screen.queryByText('Seguro Camión')).not.toBeInTheDocument();
  });

  it('filtra solo templates inactivas', () => {
    render(
      <TemplatesList
        templates={mockTemplates}
        isLoading={false}
        onEdit={() => {}}
        onDelete={() => {}}
        onToggleActive={() => {}}
      />
    );

    const selectElements = screen.getAllByDisplayValue('Todos');
    const estadoSelect = selectElements[1];
    fireEvent.change(estadoSelect, { target: { value: 'inactive' } });

    expect(screen.getByText('Plantillas (1)')).toBeInTheDocument();
    expect(screen.getByText('Seguro Camión')).toBeInTheDocument();
    expect(screen.queryByText('DNI Chofer')).not.toBeInTheDocument();
  });

  it('muestra icono correcto para cada entityType', () => {
    render(
      <TemplatesList
        templates={mockTemplates}
        isLoading={false}
        onEdit={() => {}}
        onDelete={() => {}}
        onToggleActive={() => {}}
      />
    );
    expect(screen.getByText('👨‍💼')).toBeInTheDocument(); // CHOFER
    expect(screen.getByText('🚛')).toBeInTheDocument(); // CAMION
    expect(screen.getByText('🚚')).toBeInTheDocument(); // ACOPLADO
  });

  it('muestra icono y color para EMPRESA_TRANSPORTISTA', () => {
    const empresaTemplate = {
      id: 5,
      nombre: 'Seguro Empresa',
      entityType: 'EMPRESA_TRANSPORTISTA',
      descripcion: 'Seguro de la empresa',
      isActive: true,
      createdAt: '2025-01-01T00:00:00.000Z',
      updatedAt: '2025-01-10T00:00:00.000Z',
    };

    render(
      <TemplatesList
        templates={[empresaTemplate]}
        isLoading={false}
        onEdit={() => {}}
        onDelete={() => {}}
        onToggleActive={() => {}}
      />
    );
    expect(screen.getByText('🏢')).toBeInTheDocument();
    expect(screen.getByText('EMPRESA_TRANSPORTISTA')).toBeInTheDocument();
  });

  it('muestra colores correctos para cada entityType', () => {
    render(
      <TemplatesList
        templates={mockTemplates}
        isLoading={false}
        onEdit={() => {}}
        onDelete={() => {}}
        onToggleActive={() => {}}
      />
    );
    expect(screen.getByText('CHOFER')).toBeInTheDocument();
    expect(screen.getByText('CAMION')).toBeInTheDocument();
    expect(screen.getByText('ACOPLADO')).toBeInTheDocument();
  });

  it('muestra badges de estado activo/inactivo', () => {
    render(
      <TemplatesList
        templates={mockTemplates}
        isLoading={false}
        onEdit={() => {}}
        onDelete={() => {}}
        onToggleActive={() => {}}
      />
    );
    const activeBadges = screen.getAllByText('Activa');
    const inactiveBadge = screen.getByText('Inactiva');
    expect(activeBadges.length).toBe(2);
    expect(inactiveBadge).toBeInTheDocument();
  });

  it('muestra descripción cuando existe', () => {
    render(
      <TemplatesList
        templates={mockTemplates}
        isLoading={false}
        onEdit={() => {}}
        onDelete={() => {}}
        onToggleActive={() => {}}
      />
    );
    expect(screen.getByText('Plantilla de DNI')).toBeInTheDocument();
    expect(screen.getByText('Seguro del camión')).toBeInTheDocument();
  });

  it('llama onEdit al hacer click en Editar', () => {
    const onEdit = jest.fn();
    render(
      <TemplatesList
        templates={mockTemplates}
        isLoading={false}
        onEdit={onEdit}
        onDelete={() => {}}
        onToggleActive={() => {}}
      />
    );

    const editButtons = screen.getAllByText('Editar');
    fireEvent.click(editButtons[0]);

    expect(onEdit).toHaveBeenCalledWith(mockTemplates[0]);
  });

  it('llama onDelete al hacer click en Eliminar', () => {
    const onDelete = jest.fn();
    render(
      <TemplatesList
        templates={mockTemplates}
        isLoading={false}
        onEdit={() => {}}
        onDelete={onDelete}
        onToggleActive={() => {}}
      />
    );

    const deleteButtons = screen.getAllByText('Eliminar');
    fireEvent.click(deleteButtons[0]);

    expect(onDelete).toHaveBeenCalledWith(1);
  });

  it('llama onToggleActive al hacer click en Activar/Desactivar', () => {
    const onToggleActive = jest.fn();
    render(
      <TemplatesList
        templates={mockTemplates}
        isLoading={false}
        onEdit={() => {}}
        onDelete={() => {}}
        onToggleActive={onToggleActive}
      />
    );

    const toggleButtons = screen.getAllByText('Desactivar');
    fireEvent.click(toggleButtons[0]);

    expect(onToggleActive).toHaveBeenCalledWith(mockTemplates[0]);
  });

  it('muestra mensaje cuando filtros no coinciden', () => {
    render(
      <TemplatesList
        templates={mockTemplates}
        isLoading={false}
        onEdit={() => {}}
        onDelete={() => {}}
        onToggleActive={() => {}}
      />
    );

    const selectElements = screen.getAllByDisplayValue('Todos');
    const entityTypeSelect = selectElements[0]; // First select is entityType
    fireEvent.change(entityTypeSelect, { target: { value: 'EMPRESA_TRANSPORTISTA' } });

    expect(screen.getByText('No hay plantillas que coincidan con los filtros')).toBeInTheDocument();
    expect(screen.getByText('Ajusta los filtros para ver más resultados.')).toBeInTheDocument();
  });

  it('formatea fechas correctamente', () => {
    render(
      <TemplatesList
        templates={mockTemplates}
        isLoading={false}
        onEdit={() => {}}
        onDelete={() => {}}
        onToggleActive={() => {}}
      />
    );
    expect(mockFormatDate).toHaveBeenCalled();
    expect(screen.getAllByText(/Creada:/).length).toBeGreaterThan(0);
  });

  it('muestra template sin descripción', () => {
    render(
      <TemplatesList
        templates={[mockTemplates[2]]}
        isLoading={false}
        onEdit={() => {}}
        onDelete={() => {}}
        onToggleActive={() => {}}
      />
    );
    expect(screen.getByText('VTV Acoplado')).toBeInTheDocument();
  });

  it('muestra icono por defecto para entityType desconocido', () => {
    const unknownTemplate = {
      id: 4,
      nombre: 'Template Desconocido',
      entityType: 'DESCONOCIDO',
      descripcion: null,
      isActive: true,
      createdAt: '2025-01-01T00:00:00.000Z',
      updatedAt: '2025-01-10T00:00:00.000Z',
    };

    render(
      <TemplatesList
        templates={[unknownTemplate]}
        isLoading={false}
        onEdit={() => {}}
        onDelete={() => {}}
        onToggleActive={() => {}}
      />
    );
    expect(screen.getByText('📄')).toBeInTheDocument();
  });

  it('filtra por combinación de entityType y estado activo', () => {
    render(
      <TemplatesList
        templates={mockTemplates}
        isLoading={false}
        onEdit={() => {}}
        onDelete={() => {}}
        onToggleActive={() => {}}
      />
    );

    const selectElements = screen.getAllByDisplayValue('Todos');
    fireEvent.change(selectElements[0], { target: { value: 'CHOFER' } });
    fireEvent.change(selectElements[1], { target: { value: 'active' } });

    expect(screen.getByText('Plantillas (1)')).toBeInTheDocument();
    expect(screen.getByText('DNI Chofer')).toBeInTheDocument();
  });

  it('restaura filtros a "Todos"', () => {
    render(
      <TemplatesList
        templates={mockTemplates}
        isLoading={false}
        onEdit={() => {}}
        onDelete={() => {}}
        onToggleActive={() => {}}
      />
    );

    const entityTypeSelect = screen.getAllByDisplayValue('Todos')[0];

    // Filtrar por CHOFER
    fireEvent.change(entityTypeSelect, { target: { value: 'CHOFER' } });
    expect(screen.getByText('Plantillas (1)')).toBeInTheDocument();

    // Restaurar a Todos
    fireEvent.change(entityTypeSelect, { target: { value: 'all' } });
    expect(screen.getByText('Plantillas (3)')).toBeInTheDocument();
  });

  it('muestra botón Activar para templates inactivas', () => {
    render(
      <TemplatesList
        templates={mockTemplates}
        isLoading={false}
        onEdit={() => {}}
        onDelete={() => {}}
        onToggleActive={() => {}}
      />
    );
    expect(screen.getByText('Activar')).toBeInTheDocument();
  });
});
