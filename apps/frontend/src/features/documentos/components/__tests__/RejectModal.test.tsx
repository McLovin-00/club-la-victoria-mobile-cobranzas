// Tests completos de `RejectModal`: render, interacciones y validaciones (Jest ESM).
import React from 'react';
import { describe, it, expect, beforeAll, beforeEach, jest } from '@jest/globals';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

describe('RejectModal - render completo con coverage', () => {
  let RejectModal: React.FC<any>;

  beforeAll(async () => {
    const module = await import('../RejectModal');
    RejectModal = module.default || module.RejectModal;
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('no renderiza nada cuando isOpen=false', () => {
    const { container } = render(
      <RejectModal
        isOpen={false}
        onClose={() => {}}
        onConfirm={() => {}}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renderiza modal cuando isOpen=true', () => {
    render(
      <RejectModal
        isOpen={true}
        onClose={() => {}}
        onConfirm={() => {}}
      />
    );
    expect(screen.getByText('Rechazar Documento')).toBeInTheDocument();
    expect(screen.getByText('Motivo del rechazo *')).toBeInTheDocument();
    expect(screen.getByText('Cancelar')).toBeInTheDocument();
    expect(screen.getByText('Confirmar Rechazo')).toBeInTheDocument();
  });

  it('muestra nombre del documento cuando se proporciona', () => {
    render(
      <RejectModal
        isOpen={true}
        onClose={() => {}}
        onConfirm={() => {}}
        documentName="DNI Chofer.pdf"
      />
    );
    expect(screen.getByText('Documento:')).toBeInTheDocument();
    expect(screen.getByText('DNI Chofer.pdf')).toBeInTheDocument();
  });

  it('muestra todos los motivos comunes en el select', () => {
    render(
      <RejectModal
        isOpen={true}
        onClose={() => {}}
        onConfirm={() => {}}
      />
    );
    fireEvent.mouseDown(screen.getByRole('combobox'));
    expect(screen.getByText('Documento ilegible')).toBeInTheDocument();
    expect(screen.getByText('Documento vencido')).toBeInTheDocument();
    expect(screen.getByText('Datos incorrectos')).toBeInTheDocument();
    expect(screen.getByText('Documento incompleto')).toBeInTheDocument();
    expect(screen.getByText('No corresponde al tipo solicitado')).toBeInTheDocument();
    expect(screen.getByText('Firma o sello faltante')).toBeInTheDocument();
    expect(screen.getByText('Otro (especificar)')).toBeInTheDocument();
  });

  it('muestra textarea cuando se selecciona "otro"', () => {
    render(
      <RejectModal
        isOpen={true}
        onClose={() => {}}
        onConfirm={() => {}}
      />
    );
    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'otro' } });
    expect(screen.getByText('Especificar motivo *')).toBeInTheDocument();
  });

  it('deshabilita botón confirmar cuando motivo es inválido', () => {
    render(
      <RejectModal
        isOpen={true}
        onClose={() => {}}
        onConfirm={() => {}}
      />
    );
    const confirmButton = screen.getByText('Confirmar Rechazo');
    expect(confirmButton).toBeDisabled();
  });

  it('habilita botón confirmar cuando motivo es válido', () => {
    render(
      <RejectModal
        isOpen={true}
        onClose={() => {}}
        onConfirm={() => {}}
      />
    );
    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'Documento ilegible' } });
    const confirmButton = screen.getByText('Confirmar Rechazo');
    expect(confirmButton).not.toBeDisabled();
  });

  it('llama onConfirm con motivo seleccionado', () => {
    const onConfirm = jest.fn();
    render(
      <RejectModal
        isOpen={true}
        onClose={() => {}}
        onConfirm={onConfirm}
      />
    );
    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'Documento vencido' } });
    fireEvent.click(screen.getByText('Confirmar Rechazo'));
    expect(onConfirm).toHaveBeenCalledWith('Documento vencido');
  });

  it('llama onConfirm con motivo personalizado cuando se selecciona "otro"', () => {
    const onConfirm = jest.fn();
    render(
      <RejectModal
        isOpen={true}
        onClose={() => {}}
        onConfirm={onConfirm}
      />
    );
    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'otro' } });

    const textarea = screen.getByPlaceholderText('Describe el motivo del rechazo...');
    fireEvent.change(textarea, { target: { value: 'Motivo personalizado válido' } });

    fireEvent.click(screen.getByText('Confirmar Rechazo'));
    expect(onConfirm).toHaveBeenCalledWith('Motivo personalizado válido');
  });

  it('no llama onConfirm si motivo personalizado es muy corto', () => {
    const onConfirm = jest.fn();
    render(
      <RejectModal
        isOpen={true}
        onClose={() => {}}
        onConfirm={onConfirm}
      />
    );
    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'otro' } });

    const textarea = screen.getByPlaceholderText('Describe el motivo del rechazo...');
    fireEvent.change(textarea, { target: { value: 'ab' } });

    fireEvent.click(screen.getByText('Confirmar Rechazo'));
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('llama onClose al hacer click en X', () => {
    const onClose = jest.fn();
    render(
      <RejectModal
        isOpen={true}
        onClose={onClose}
        onConfirm={() => {}}
      />
    );
    const closeButton = screen.getByRole('button', { name: '' }); // X icon button
    fireEvent.click(closeButton);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('llama onClose al hacer click en Cancelar', () => {
    const onClose = jest.fn();
    render(
      <RejectModal
        isOpen={true}
        onClose={onClose}
        onConfirm={() => {}}
      />
    );
    fireEvent.click(screen.getByText('Cancelar'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('deshabilita botones cuando isLoading=true', () => {
    render(
      <RejectModal
        isOpen={true}
        onClose={() => {}}
        onConfirm={() => {}}
        isLoading={true}
      />
    );
    expect(screen.getByText('Rechazando...')).toBeInTheDocument();
    expect(screen.getByText('Cancelar')).toBeDisabled();
  });
});
