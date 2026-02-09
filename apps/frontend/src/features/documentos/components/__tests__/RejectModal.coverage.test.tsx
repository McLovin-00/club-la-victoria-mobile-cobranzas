/**
 * Tests de cobertura para RejectModal
 */
import React from 'react';
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { render, screen, fireEvent } from '@testing-library/react';

describe('RejectModal - Coverage', () => {
  let RejectModal: React.FC<any>;

  beforeAll(async () => {
    // Mock de dependencias
    await jest.unstable_mockModule('../../../../components/ui/button', () => ({
      Button: ({ children, onClick, disabled, variant }: any) => (
        <button onClick={onClick} disabled={disabled} data-variant={variant}>
          {children}
        </button>
      ),
    }));

    await jest.unstable_mockModule('@heroicons/react/24/outline', () => ({
      XMarkIcon: ({ className }: any) => <span className={className}>X</span>,
    }));

    const module = await import('../RejectModal');
    RejectModal = module.RejectModal || module.default;
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('debería importar el componente', () => {
    expect(RejectModal).toBeDefined();
  });

  it('debería no renderizar cuando isOpen es false', () => {
    const mockOnClose = jest.fn();
    const mockOnConfirm = jest.fn();

    const { container } = render(
      <RejectModal
        isOpen={false}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
      />
    );

    // El componente retorna null cuando isOpen es false
    expect(container.querySelector('.fixed')).toBeNull();
  });

  it('debería renderizar el modal cuando isOpen es true', () => {
    const mockOnClose = jest.fn();
    const mockOnConfirm = jest.fn();

    render(
      <RejectModal
        isOpen={true}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
      />
    );

    expect(screen.getByText('Rechazar Documento')).toBeInTheDocument();
    expect(screen.getByText('Motivo del rechazo *')).toBeInTheDocument();
    expect(screen.getByText('Cancelar')).toBeInTheDocument();
  });

  it('debería mostrar el nombre del documento', () => {
    const mockOnClose = jest.fn();
    const mockOnConfirm = jest.fn();

    render(
      <RejectModal
        isOpen={true}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
        documentName="Documento Test.pdf"
      />
    );

    expect(screen.getByText(/Documento Test\.pdf/)).toBeInTheDocument();
  });

  it('debería llamar onClose al hacer click en X', () => {
    const mockOnClose = jest.fn();
    const mockOnConfirm = jest.fn();

    render(
      <RejectModal
        isOpen={true}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
      />
    );

    const closeButton = screen.getByText('X').closest('button');
    if (closeButton) {
      fireEvent.click(closeButton);
    }
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('debería mostrar el campo de texto personalizado cuando se selecciona "Otro"', () => {
    const mockOnClose = jest.fn();
    const mockOnConfirm = jest.fn();

    render(
      <RejectModal
        isOpen={true}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
      />
    );

    const selectElement = screen.getByDisplayValue('Seleccionar motivo...');
    fireEvent.change(selectElement, { target: { value: 'otro' } });

    expect(screen.getByText(/Especificar motivo/)).toBeInTheDocument();
  });

  it('debería llamar onConfirm con el motivo seleccionado', () => {
    const mockOnClose = jest.fn();
    const mockOnConfirm = jest.fn();

    render(
      <RejectModal
        isOpen={true}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
      />
    );

    const selectElement = screen.getByDisplayValue('Seleccionar motivo...');
    fireEvent.change(selectElement, { target: { value: 'Documento ilegible' } });

    const confirmButton = screen.getByText('Confirmar Rechazo').closest('button');
    if (confirmButton) {
      fireEvent.click(confirmButton);
    }
    expect(mockOnConfirm).toHaveBeenCalledWith('Documento ilegible');
  });

  it('debería deshabilitar el botón cuando isLoading es true', () => {
    const mockOnClose = jest.fn();
    const mockOnConfirm = jest.fn();

    render(
      <RejectModal
        isOpen={true}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
        isLoading={true}
      />
    );

    expect(screen.getByText('Rechazando...')).toBeInTheDocument();
    const confirmButton = screen.getByText('Rechazando...').closest('button');
    expect(confirmButton).toBeDisabled();
  });

  it('debería llamar onConfirm con el motivo personalizado', () => {
    const mockOnClose = jest.fn();
    const mockOnConfirm = jest.fn();

    render(
      <RejectModal
        isOpen={true}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
      />
    );

    const selectElement = screen.getByDisplayValue('Seleccionar motivo...');
    fireEvent.change(selectElement, { target: { value: 'otro' } });

    const textarea = screen.getByPlaceholderText(/Describe el motivo/);
    fireEvent.change(textarea, { target: { value: 'Motivo personalizado de prueba' } });

    const confirmButton = screen.getByText('Confirmar Rechazo').closest('button');
    if (confirmButton) {
      fireEvent.click(confirmButton);
    }
    expect(mockOnConfirm).toHaveBeenCalledWith('Motivo personalizado de prueba');
  });
});
