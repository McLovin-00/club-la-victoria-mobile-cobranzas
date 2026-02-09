/**
 * Tests de cobertura para EmpresaForm
 */
import React from 'react';
import { describe, it, expect, beforeAll, beforeEach, jest } from '@jest/globals';
import { render, screen, fireEvent } from '@testing-library/react';

describe('EmpresaForm - Coverage', () => {
  let EmpresaForm: React.FC<any>;

  beforeAll(async () => {
    const module = await import('../EmpresaForm');
    EmpresaForm = module.EmpresaForm || module.default;
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('debería renderizar el formulario vacío', () => {
    const mockOnSubmit = jest.fn();
    const mockOnCancel = jest.fn();

    render(
      <EmpresaForm
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    );

    expect(screen.getByPlaceholderText(/nombre/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/descripci/i)).toBeInTheDocument();
  });

  it('debería renderizar el formulario con datos de empresa', () => {
    const mockOnSubmit = jest.fn();
    const mockOnCancel = jest.fn();
    const empresa = {
      id: 1,
      nombre: 'Empresa Test',
      descripcion: 'Descripción test',
    };

    render(
      <EmpresaForm
        empresa={empresa}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    );

    expect(screen.getByDisplayValue('Empresa Test')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Descripción test')).toBeInTheDocument();
  });

  it('debería llamar onSubmit con los datos del formulario', () => {
    const mockOnSubmit = jest.fn();
    const mockOnCancel = jest.fn();

    render(
      <EmpresaForm
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    );

    fireEvent.change(screen.getByPlaceholderText(/nombre/i), {
      target: { value: 'Nueva Empresa' },
    });
    fireEvent.change(screen.getByPlaceholderText(/descripci/i), {
      target: { value: 'Nueva Descripción' },
    });

    const submitButton = screen.getByText('Crear');
    fireEvent.click(submitButton);
    expect(mockOnSubmit).toHaveBeenCalled();
  });

  it('debería llamar onCancel al hacer clic en Cancelar', () => {
    const mockOnSubmit = jest.fn();
    const mockOnCancel = jest.fn();

    render(
      <EmpresaForm
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    );

    const cancelButton = screen.getAllByText('Cancelar')[0] || screen.getByRole('button', { name: /cancelar/i });
    if (cancelButton) {
      fireEvent.click(cancelButton);
      expect(mockOnCancel).toHaveBeenCalled();
    }
  });

  it('debería mostrar el botón deshabilitado cuando isLoading es true', () => {
    const mockOnSubmit = jest.fn();
    const mockOnCancel = jest.fn();

    render(
      <EmpresaForm
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
        isLoading={true}
      />
    );

    const submitButton = screen.getByText('Guardando...');
    expect(submitButton).toBeDisabled();
    const cancelButton = screen.getByText('Cancelar');
    expect(cancelButton).toBeDisabled();
  });

  it('debería actualizar el estado al escribir en los campos', () => {
    const mockOnSubmit = jest.fn();
    const mockOnCancel = jest.fn();

    render(
      <EmpresaForm
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    );

    const nombreInput = screen.getByPlaceholderText(/nombre/i);
    fireEvent.change(nombreInput, { target: { value: 'Test' } });
    expect(nombreInput).toHaveValue('Test');
  });
});
