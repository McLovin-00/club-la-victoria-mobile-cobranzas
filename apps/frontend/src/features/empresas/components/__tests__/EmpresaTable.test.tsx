/**
 * Tests para EmpresaTable
 *
 * Nota importante (Jest + ESM):
 * - Evitamos `jest.spyOn()` sobre exports ESM porque pueden ser read-only.
 * - Usamos `jest.unstable_mockModule()` + `await import()` dentro de `beforeAll`
 *   para mockear de forma estable `@/hooks/useConfirmDialog`.
 */
import React from 'react';
import { describe, it, expect, jest, beforeEach, beforeAll } from '@jest/globals';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

const mockEmpresas = [
  {
    id: 1,
    nombre: 'Empresa 1',
    descripcion: 'Descripción 1',
    createdAt: '2025-01-01T10:00:00Z',
    updatedAt: '2025-01-01T10:00:00Z',
  },
  {
    id: 2,
    nombre: 'Empresa 2',
    descripcion: null,
    createdAt: '2025-01-02T10:00:00Z',
    updatedAt: '2025-01-02T10:00:00Z',
  },
];

describe('EmpresaTable', () => {
  const mockOnEdit = jest.fn();
  const mockOnDelete = jest.fn();

  const mockConfirm = jest.fn();

  let EmpresaTable: typeof import('../EmpresaTable').EmpresaTable;

  beforeAll(async () => {
    await jest.unstable_mockModule('@/hooks/useConfirmDialog', () => ({
      useConfirmDialog: () => ({
        confirm: (...args: any[]) => mockConfirm(...args),
      }),
    }));

    // Import luego de mockear
    ({ EmpresaTable } = await import('../EmpresaTable'));
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockConfirm.mockResolvedValue(true);
  });

  it('muestra spinner cuando está cargando', () => {
    render(<EmpresaTable empresas={[]} onEdit={mockOnEdit} onDelete={mockOnDelete} isLoading={true} />);

    const spinner = document.querySelector('.animate-spin');
    expect(spinner).toBeTruthy();
  });

  it('muestra mensaje cuando no hay empresas', () => {
    render(<EmpresaTable empresas={[]} onEdit={mockOnEdit} onDelete={mockOnDelete} isLoading={false} />);

    expect(screen.getByText('No hay empresas')).toBeInTheDocument();
    expect(screen.getByText('Comienza creando tu primera empresa.')).toBeInTheDocument();
  });

  it('renderiza la tabla con empresas', () => {
    render(<EmpresaTable empresas={mockEmpresas as any} onEdit={mockOnEdit} onDelete={mockOnDelete} />);

    expect(screen.getByText('Empresa 1')).toBeInTheDocument();
    expect(screen.getByText('Empresa 2')).toBeInTheDocument();
    expect(screen.getByText('Descripción 1')).toBeInTheDocument();
    expect(screen.getByText('Sin descripción')).toBeInTheDocument();
  });

  it('muestra los IDs de las empresas', () => {
    render(<EmpresaTable empresas={mockEmpresas as any} onEdit={mockOnEdit} onDelete={mockOnDelete} />);

    expect(screen.getByText('ID: 1')).toBeInTheDocument();
    expect(screen.getByText('ID: 2')).toBeInTheDocument();
  });

  it('formatea las fechas correctamente (robusto)', () => {
    render(<EmpresaTable empresas={mockEmpresas as any} onEdit={mockOnEdit} onDelete={mockOnDelete} />);

    // El componente usa toLocaleDateString('es-ES', { day, month: 'short', year })
    // En el DOM observado se renderiza "1 ene 2025" y "2 ene 2025".
    expect(screen.getByText(/1\s+ene\s+2025/i)).toBeInTheDocument();
    expect(screen.getByText(/2\s+ene\s+2025/i)).toBeInTheDocument();
  });

  it('llama a onEdit al hacer click en Editar', () => {
    render(<EmpresaTable empresas={mockEmpresas as any} onEdit={mockOnEdit} onDelete={mockOnDelete} />);

    const editButtons = screen.getAllByRole('button', { name: /editar/i });
    fireEvent.click(editButtons[0]);

    expect(mockOnEdit).toHaveBeenCalledWith(mockEmpresas[0]);
  });

  it('muestra diálogo de confirmación al eliminar', async () => {
    render(<EmpresaTable empresas={mockEmpresas as any} onEdit={mockOnEdit} onDelete={mockOnDelete} />);

    const deleteButtons = screen.getAllByRole('button', { name: /eliminar/i });
    fireEvent.click(deleteButtons[0]);

    await waitFor(() => {
      expect(mockConfirm).toHaveBeenCalledTimes(1);
      const arg = mockConfirm.mock.calls[0]?.[0];
      expect(arg?.message).toMatch(/¿estás seguro/i);
      expect(arg?.confirmText).toMatch(/eliminar/i);
    });
  });

  it('llama a onDelete cuando se confirma', async () => {
    mockConfirm.mockResolvedValue(true);
    mockOnDelete.mockResolvedValue(undefined);

    render(<EmpresaTable empresas={mockEmpresas as any} onEdit={mockOnEdit} onDelete={mockOnDelete} />);

    const deleteButtons = screen.getAllByRole('button', { name: /eliminar/i });
    fireEvent.click(deleteButtons[0]);

    await waitFor(() => {
      expect(mockConfirm).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(mockOnDelete).toHaveBeenCalledWith(1);
    });
  });

  it('no llama a onDelete cuando se cancela', async () => {
    mockConfirm.mockResolvedValue(false);

    render(<EmpresaTable empresas={mockEmpresas as any} onEdit={mockOnEdit} onDelete={mockOnDelete} />);

    const deleteButtons = screen.getAllByRole('button', { name: /eliminar/i });
    fireEvent.click(deleteButtons[0]);

    await waitFor(() => {
      expect(mockConfirm).toHaveBeenCalled();
    });

    expect(mockOnDelete).not.toHaveBeenCalled();
  });

  it('deshabilita botones durante la eliminación', async () => {
    mockConfirm.mockResolvedValue(true);

    // Promesa pendiente para simular eliminación en curso
    let resolveDelete: (() => void) | null = null;
    mockOnDelete.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          resolveDelete = resolve;
        })
    );

    render(<EmpresaTable empresas={mockEmpresas as any} onEdit={mockOnEdit} onDelete={mockOnDelete} />);

    const deleteButtons = screen.getAllByRole('button', { name: /eliminar/i });
    const editButtons = screen.getAllByRole('button', { name: /editar/i });

    fireEvent.click(deleteButtons[0]);

    await waitFor(() => {
      expect(mockConfirm).toHaveBeenCalled();
    });

    // Mientras delete está pendiente, el row afectado debería estar disabled
    await waitFor(() => {
      expect(deleteButtons[0]).toBeDisabled();
      expect(editButtons[0]).toBeDisabled();
    });

    // Completar la eliminación
    resolveDelete?.();

    await waitFor(() => {
      expect(deleteButtons[0]).not.toBeDisabled();
      expect(editButtons[0]).not.toBeDisabled();
    });
  });

  it('muestra todas las columnas de la tabla', () => {
    render(<EmpresaTable empresas={mockEmpresas as any} onEdit={mockOnEdit} onDelete={mockOnDelete} />);

    expect(screen.getByText('Empresa')).toBeInTheDocument();
    expect(screen.getByText('Descripción')).toBeInTheDocument();
    expect(screen.getByText('Fecha de Creación')).toBeInTheDocument();
    expect(screen.getByText('Acciones')).toBeInTheDocument();
  });
});
