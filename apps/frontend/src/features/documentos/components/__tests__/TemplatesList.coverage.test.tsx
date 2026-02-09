/**
 * Tests de cobertura para TemplatesList
 */
import React from 'react';
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { render, screen, fireEvent } from '@testing-library/react';

describe('TemplatesList - Coverage', () => {
  let TemplatesList: React.FC<any>;

  const mockTemplates = [
    {
      id: 1,
      nombre: 'Plantilla 1',
      entityType: 'CHOFER',
      isActive: true,
      createdAt: '2024-01-01T00:00:00',
      updatedAt: '2024-01-01T00:00:00',
    },
    {
      id: 2,
      nombre: 'Plantilla 2',
      entityType: 'CAMION',
      isActive: false,
      createdAt: '2024-01-02T00:00:00',
      updatedAt: '2024-01-02T00:00:00',
    },
  ];

  beforeAll(async () => {
    // Mock de dependencias
    await jest.unstable_mockModule('../../../../utils/formatters', () => ({
      formatDate: (date: string) => '01/01/2024',
    }));

    await jest.unstable_mockModule('../../../../components/ui/card', () => ({
      Card: ({ children, className }: any) => <div className={className}>{children}</div>,
    }));

    await jest.unstable_mockModule('../../../../components/ui/button', () => ({
      Button: ({ children, onClick, disabled, variant }: any) => (
        <button onClick={onClick} disabled={disabled} data-variant={variant}>
          {children}
        </button>
      ),
    }));

    await jest.unstable_mockModule('../../../../components/ui/Skeleton', () => ({
      Skeleton: ({ className }: any) => <div className={className} data-testid="skeleton">Skeleton</div>,
      SkeletonTableRows: ({ rows }: any) => (
        <div data-testid="skeleton-table">
          {Array.from({ length: rows }).map((_, i) => (
            <div key={i} data-testid="skeleton-row">Row</div>
          ))}
        </div>
      ),
    }));

    await jest.unstable_mockModule('@heroicons/react/24/outline', () => ({
      DocumentTextIcon: ({ className }: any) => <span className={className}>DocIcon</span>,
      PencilIcon: ({ className }: any) => <span className={className}>EditIcon</span>,
      TrashIcon: ({ className }: any) => <span className={className}>TrashIcon</span>,
      EyeIcon: ({ className }: any) => <span className={className}>EyeIcon</span>,
      EyeSlashIcon: ({ className }: any) => <span className={className}>EyeSlashIcon</span>,
    }));

    const module = await import('../TemplatesList');
    TemplatesList = module.TemplatesList;
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('debería importar el componente', () => {
    expect(TemplatesList).toBeDefined();
  });

  it('debería mostrar skeleton durante carga', () => {
    const mockOnEdit = jest.fn();
    const mockOnDelete = jest.fn();
    const mockOnToggleActive = jest.fn();

    render(
      <TemplatesList
        templates={[]}
        isLoading={true}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onToggleActive={mockOnToggleActive}
      />
    );

    expect(screen.getByTestId('skeleton-table')).toBeInTheDocument();
  });

  it('debería mostrar mensaje cuando no hay plantillas', () => {
    const mockOnEdit = jest.fn();
    const mockOnDelete = jest.fn();
    const mockOnToggleActive = jest.fn();

    render(
      <TemplatesList
        templates={[]}
        isLoading={false}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onToggleActive={mockOnToggleActive}
      />
    );

    expect(screen.getByText('No hay plantillas')).toBeInTheDocument();
  });

  it('debería renderizar lista de plantillas', () => {
    const mockOnEdit = jest.fn();
    const mockOnDelete = jest.fn();
    const mockOnToggleActive = jest.fn();

    render(
      <TemplatesList
        templates={mockTemplates}
        isLoading={false}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onToggleActive={mockOnToggleActive}
      />
    );

    expect(screen.getByText('Plantilla 1')).toBeInTheDocument();
    expect(screen.getByText('Plantilla 2')).toBeInTheDocument();
  });

  it('debería mostrar filtros', () => {
    const mockOnEdit = jest.fn();
    const mockOnDelete = jest.fn();
    const mockOnToggleActive = jest.fn();

    render(
      <TemplatesList
        templates={mockTemplates}
        isLoading={false}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onToggleActive={mockOnToggleActive}
      />
    );

    expect(screen.getByText('Tipo de Entidad')).toBeInTheDocument();
    expect(screen.getByText('Estado')).toBeInTheDocument();
  });
});
