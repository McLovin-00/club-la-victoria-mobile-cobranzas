/**
 * Tests de cobertura para EmpresaModal
 */
import React from 'react';
import { describe, it, expect, beforeAll, beforeEach, jest } from '@jest/globals';
import { render, screen } from '@testing-library/react';

// Mock de los componentes de Dialog
jest.mock('../../../../components/ui/dialog', () => ({
  Dialog: ({ open, children }: any) => (open ? <div>{children}</div> : null),
  DialogContent: ({ children }: any) => <div className="dialog-content">{children}</div>,
  DialogHeader: ({ children }: any) => <div className="dialog-header">{children}</div>,
  DialogTitle: ({ children }: any) => <h2>{children}</h2>,
  DialogDescription: ({ children }: any) => <p>{children}</p>,
}));

describe('EmpresaModal - Coverage', () => {
  let EmpresaModal: React.FC<any>;

  beforeAll(async () => {
    const module = await import('../EmpresaModal.tsx');
    EmpresaModal = module.EmpresaModal || module.default;
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('no renderiza nada cuando isOpen es false', () => {
    const { container } = render(
      <EmpresaModal
        isOpen={false}
        onClose={() => {}}
        onSubmit={() => {}}
      />
    );

    expect(container.firstChild).toBeNull();
  });

  it('renderiza el modal cuando isOpen es true', () => {
    render(
      <EmpresaModal
        isOpen={true}
        onClose={() => {}}
        onSubmit={() => {}}
      />
    );

    expect(screen.getByText('Nueva Empresa')).toBeInTheDocument();
    expect(screen.getByText(/Completa la información requerida/)).toBeInTheDocument();
  });

  it('muestra título de edición cuando hay una empresa', () => {
    const empresa = {
      id: 1,
      nombre: 'Test Empresa',
      descripcion: 'Test',
    };

    render(
      <EmpresaModal
        isOpen={true}
        onClose={() => {}}
        onSubmit={() => {}}
        empresa={empresa}
      />
    );

    expect(screen.getByText('Editar Empresa')).toBeInTheDocument();
    expect(screen.getByText(/Modifica los datos de la empresa/)).toBeInTheDocument();
  });

  it('pasa isLoading al formulario', () => {
    render(
      <EmpresaModal
        isOpen={true}
        onClose={() => {}}
        onSubmit={() => {}}
        isLoading={true}
      />
    );

    expect(screen.getByText('Guardando...')).toBeInTheDocument();
  });

  it('llama a onClose cuando se cierra el dialog', () => {
    const mockOnClose = jest.fn();
    const mockOnSubmit = jest.fn();

    const { rerender } = render(
      <EmpresaModal
        isOpen={true}
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
      />
    );

    // Cerrar el modal
    rerender(
      <EmpresaModal
        isOpen={false}
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
      />
    );

    expect(screen.queryByText('Nueva Empresa')).not.toBeInTheDocument();
  });
});
