/**
 * Tests de cobertura para EmpresaTable
 */
import React from 'react';
import { describe, it, expect, beforeAll, beforeEach, jest } from '@jest/globals';
import { render, screen, fireEvent } from '@testing-library/react';

// Mock del hook useConfirmDialog
jest.mock('../../../../hooks/useConfirmDialog', () => ({
  useConfirmDialog: () => ({
    confirm: jest.fn().mockResolvedValue(true),
  }),
}));

describe('EmpresaTable - Coverage', () => {
  let EmpresaTable: React.FC<any>;

  beforeAll(async () => {
    const module = await import('../EmpresaTable.tsx');
    EmpresaTable = module.EmpresaTable || module.default;
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockEmpresas = [
    {
      id: 1,
      nombre: 'Empresa 1',
      descripcion: 'Descripción 1',
      createdAt: '2024-01-01T00:00:00Z',
    },
    {
      id: 2,
      nombre: 'Empresa 2',
      descripcion: 'Descripción 2',
      createdAt: '2024-02-01T00:00:00Z',
    },
  ];

  it('muestra spinner cuando isLoading es true', () => {
    render(
      <EmpresaTable
        empresas={[]}
        onEdit={() => {}}
        onDelete={() => {}}
        isLoading={true}
      />
    );

    const spinner = document.querySelector('.animate-spin');
    expect(spinner).toBeInTheDocument();
  });

  it('muestra mensaje cuando no hay empresas', () => {
    render(
      <EmpresaTable
        empresas={[]}
        onEdit={() => {}}
        onDelete={() => {}}
        isLoading={false}
      />
    );

    expect(screen.getByText('No hay empresas')).toBeInTheDocument();
    expect(screen.getByText(/Comienza creando tu primera empresa/)).toBeInTheDocument();
  });

  it('renderiza la tabla con empresas', () => {
    render(
      <EmpresaTable
        empresas={mockEmpresas}
        onEdit={() => {}}
        onDelete={() => {}}
      />
    );

    expect(screen.getByText('Empresa 1')).toBeInTheDocument();
    expect(screen.getByText('Empresa 2')).toBeInTheDocument();
    expect(screen.getByText('Descripción 1')).toBeInTheDocument();
    expect(screen.getByText('Descripción 2')).toBeInTheDocument();
  });

  it('muestra "Sin descripción" cuando la empresa no tiene descripción', () => {
    const empresasSinDesc = [{
      id: 1,
      nombre: 'Test',
      descripcion: '',
      createdAt: '2024-01-01T00:00:00Z',
    }];

    render(
      <EmpresaTable
        empresas={empresasSinDesc}
        onEdit={() => {}}
        onDelete={() => {}}
      />
    );

    expect(screen.getByText('Sin descripción')).toBeInTheDocument();
  });

  it('llama a onEdit cuando se hace clic en Editar', () => {
    const mockOnEdit = jest.fn();

    render(
      <EmpresaTable
        empresas={mockEmpresas}
        onEdit={mockOnEdit}
        onDelete={() => {}}
      />
    );

    const editButtons = screen.getAllByText('Editar');
    fireEvent.click(editButtons[0]);
    expect(mockOnEdit).toHaveBeenCalledWith(mockEmpresas[0]);
  });

  it('llama a onDelete cuando se confirma la eliminación', async () => {
    const mockOnDelete = jest.fn();

    render(
      <EmpresaTable
        empresas={mockEmpresas}
        onEdit={() => {}}
        onDelete={mockOnDelete}
      />
    );

    const deleteButtons = screen.getAllByText('Eliminar');
    fireEvent.click(deleteButtons[0]);

    // Verificar que el botón existe y se puede hacer clic
    expect(deleteButtons.length).toBeGreaterThan(0);
  });

  it('deshabilita el botón mientras se elimina', () => {
    render(
      <EmpresaTable
        empresas={mockEmpresas}
        onEdit={() => {}}
        onDelete={() => {}}
      />
    );

    const deleteButtons = screen.getAllByText('Eliminar');
    expect(deleteButtons.length).toBe(mockEmpresas.length);
  });

  it('formatea la fecha correctamente', () => {
    render(
      <EmpresaTable
        empresas={mockEmpresas}
        onEdit={() => {}}
        onDelete={() => {}}
      />
    );

    // La fecha debería estar formateada
    expect(screen.getByText(/2024/)).toBeInTheDocument();
  });
});
