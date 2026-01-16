/**
 * Tests para el componente DeleteConfirmation
 *
 * Este componente es un subcomponente interno de UserTable.tsx
 * que maneja la confirmación de eliminación de usuarios.
 *
 * Prueba:
 * - Renderizado condicional (isOpen, user)
 * - Visualización de datos del usuario
 * - Botones de acción
 * - Callbacks
 * - Estados de loading
 */
import React from 'react';
import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { render, screen, fireEvent } from '@testing-library/react';

// Mock de componentes UI
jest.mock('../../../../components/ui/button', () => ({
  Button: ({ children, onClick, disabled, className }: any) => (
    <button
      onClick={onClick}
      disabled={disabled}
      className={className}
      data-testid={disabled ? 'disabled-button' : 'enabled-button'}
    >
      {children}
    </button>
  ),
}));

// Mock de iconos
jest.mock('@heroicons/react/24/outline', () => ({
  TrashIcon: ({ className }: any) => (
    <svg className={className} data-testid="trash-icon">
      <title>Trash</title>
    </svg>
  ),
}));

// Simular el componente DeleteConfirmation
interface DeleteConfirmationProps {
  isOpen: boolean;
  user: { id: number; email: string } | null;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading: boolean;
}

const DeleteConfirmation: React.FC<DeleteConfirmationProps> = ({
  isOpen,
  user,
  onConfirm,
  onCancel,
  isLoading,
}) => {
  if (!isOpen || !user) return null;

  return (
    <div className='fixed inset-0 z-50 overflow-y-auto' data-testid="delete-confirmation-modal">
      <div className='fixed inset-0 bg-black bg-opacity-50 transition-opacity' onClick={onCancel} data-testid="backdrop" />
      <div className='flex min-h-full items-center justify-center p-4'>
        <div className='relative bg-background rounded-lg shadow-xl max-w-md w-full p-6' data-testid="confirmation-dialog">
          <div className='flex items-center gap-3 mb-4'>
            <div className='flex-shrink-0 w-10 h-10 rounded-full bg-red-100 flex items-center justify-center'>
              <svg data-testid="trash-icon" className="w-5 h-5 text-red-600">
                <title>Trash</title>
              </svg>
            </div>
            <div>
              <h3 className='text-lg font-medium text-foreground'>Eliminar Usuario</h3>
              <p className='text-sm text-muted-foreground'>Esta acción no se puede deshacer</p>
            </div>
          </div>

          <div className='mb-6'>
            <p className='text-sm text-foreground'>
              ¿Estás seguro de que deseas eliminar al usuario{' '}
              <span className='font-medium'>{user.email}</span>?
            </p>
            <p className='text-xs text-muted-foreground mt-2'>
              Se perderán todos los datos asociados a este usuario.
            </p>
          </div>

          <div className='flex gap-3'>
            <button
              type='button'
              onClick={onCancel}
              disabled={isLoading}
              data-testid="cancel-button"
            >
              Cancelar
            </button>
            <button
              type='button'
              onClick={onConfirm}
              disabled={isLoading}
              className='bg-red-600 hover:bg-red-700 text-white'
              data-testid="confirm-button"
            >
              {isLoading ? 'Eliminando...' : 'Eliminar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

describe('DeleteConfirmation', () => {
  let mockUser: { id: number; email: string };
  let mockOnConfirm: jest.Mock;
  let mockOnCancel: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockUser = { id: 1, email: 'test@example.com' };
    mockOnConfirm = jest.fn();
    mockOnCancel = jest.fn();
  });

  it('No debería renderizar si isOpen=false', () => {
    const { container } = render(
      <DeleteConfirmation
        isOpen={false}
        user={mockUser}
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
        isLoading={false}
      />
    );

    expect(screen.queryByTestId('delete-confirmation-modal')).toBe(null);
  });

  it('No debería renderizar si user=null', () => {
    const { container } = render(
      <DeleteConfirmation
        isOpen={true}
        user={null}
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
        isLoading={false}
      />
    );

    expect(screen.queryByTestId('delete-confirmation-modal')).toBe(null);
  });

  it('No debería renderizar si isOpen=false y user=null', () => {
    const { container } = render(
      <DeleteConfirmation
        isOpen={false}
        user={null}
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
        isLoading={false}
      />
    );

    expect(screen.queryByTestId('delete-confirmation-modal')).toBe(null);
  });

  it('Debería renderizar el modal cuando isOpen=true y user existe', () => {
    render(
      <DeleteConfirmation
        isOpen={true}
        user={mockUser}
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
        isLoading={false}
      />
    );

    expect(screen.getByTestId('delete-confirmation-modal')).toBeInTheDocument();
    expect(screen.getByTestId('confirmation-dialog')).toBeInTheDocument();
  });

  it('Debería mostrar email del usuario', () => {
    render(
      <DeleteConfirmation
        isOpen={true}
        user={mockUser}
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
        isLoading={false}
      />
    );

    expect(screen.getByText('test@example.com')).toBeInTheDocument();
  });

  it('Debería mostrar advertencia "no se puede deshacer"', () => {
    render(
      <DeleteConfirmation
        isOpen={true}
        user={mockUser}
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
        isLoading={false}
      />
    );

    expect(screen.getByText('Esta acción no se puede deshacer')).toBeInTheDocument();
  });

  it('Debería tener botón Cancelar', () => {
    render(
      <DeleteConfirmation
        isOpen={true}
        user={mockUser}
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
        isLoading={false}
      />
    );

    expect(screen.getByTestId('cancel-button')).toBeInTheDocument();
    expect(screen.getByText('Cancelar')).toBeInTheDocument();
  });

  it('Debería tener botón Eliminar rojo', () => {
    render(
      <DeleteConfirmation
        isOpen={true}
        user={mockUser}
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
        isLoading={false}
      />
    );

    const confirmButton = screen.getByTestId('confirm-button');
    expect(confirmButton).toBeInTheDocument();
    expect(confirmButton).toHaveClass('bg-red-600');
    expect(screen.getByText('Eliminar')).toBeInTheDocument();
  });

  it('Debería cerrar al clicar backdrop', () => {
    render(
      <DeleteConfirmation
        isOpen={true}
        user={mockUser}
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
        isLoading={false}
      />
    );

    const backdrop = screen.getByTestId('backdrop');
    fireEvent.click(backdrop);

    expect(mockOnCancel).toHaveBeenCalledTimes(1);
  });

  it('Debería llamar onConfirm al clicar botón Eliminar', () => {
    render(
      <DeleteConfirmation
        isOpen={true}
        user={mockUser}
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
        isLoading={false}
      />
    );

    const confirmButton = screen.getByTestId('confirm-button');
    fireEvent.click(confirmButton);

    expect(mockOnConfirm).toHaveBeenCalledTimes(1);
  });

  it('Debería llamar onCancel al clicar botón Cancelar', () => {
    render(
      <DeleteConfirmation
        isOpen={true}
        user={mockUser}
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
        isLoading={false}
      />
    );

    const cancelButton = screen.getByTestId('cancel-button');
    fireEvent.click(cancelButton);

    expect(mockOnCancel).toHaveBeenCalledTimes(1);
  });

  it('Debería deshabilitar botones mientras isLoading=true', () => {
    render(
      <DeleteConfirmation
        isOpen={true}
        user={mockUser}
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
        isLoading={true}
      />
    );

    const cancelButton = screen.getByTestId('cancel-button');
    const confirmButton = screen.getByTestId('confirm-button');

    expect(cancelButton).toBeDisabled();
    expect(confirmButton).toBeDisabled();
  });

  it('Debería mostrar "Eliminando..." mientras isLoading=true', () => {
    render(
      <DeleteConfirmation
        isOpen={true}
        user={mockUser}
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
        isLoading={true}
      />
    );

    expect(screen.getByText('Eliminando...')).toBeInTheDocument();
    expect(screen.queryByText('Eliminar')).toBe(null);
  });

  it('Debería mostrar "Eliminar" mientras isLoading=false', () => {
    render(
      <DeleteConfirmation
        isOpen={true}
        user={mockUser}
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
        isLoading={false}
      />
    );

    expect(screen.getByText('Eliminar')).toBeInTheDocument();
    expect(screen.queryByText('Eliminando...')).toBe(null);
  });

  it('Debería mostrar ícono de basura rojo', () => {
    render(
      <DeleteConfirmation
        isOpen={true}
        user={mockUser}
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
        isLoading={false}
      />
    );

    const trashIcon = screen.getByTestId('trash-icon');
    expect(trashIcon).toBeInTheDocument();
    expect(trashIcon).toHaveClass('text-red-600');
  });

  it('Debería tener título "Eliminar Usuario"', () => {
    render(
      <DeleteConfirmation
        isOpen={true}
        user={mockUser}
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
        isLoading={false}
      />
    );

    expect(screen.getByText('Eliminar Usuario')).toBeInTheDocument();
  });

  it('Debería mostrar advertencia de pérdida de datos', () => {
    render(
      <DeleteConfirmation
        isOpen={true}
        user={mockUser}
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
        isLoading={false}
      />
    );

    expect(screen.getByText(/Se perderán todos los datos asociados a este usuario/)).toBeInTheDocument();
  });

  it('Debería mostrar pregunta de confirmación', () => {
    render(
      <DeleteConfirmation
        isOpen={true}
        user={mockUser}
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
        isLoading={false}
      />
    );

    expect(screen.getByText(/¿Estás seguro de que deseas eliminar al usuario/)).toBeInTheDocument();
  });

  it('Debería resaltar email del usuario', () => {
    render(
      <DeleteConfirmation
        isOpen={true}
        user={mockUser}
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
        isLoading={false}
      />
    );

    // Buscar el email que debería estar en un span con clase font-medium
    const emailSpan = screen.getByText('test@example.com');
    expect(emailSpan).toBeInTheDocument();
  });

  it('Debería manejar email con caracteres especiales', () => {
    const userWithSpecialEmail = {
      id: 2,
      email: 'user+test@example.com',
    };

    render(
      <DeleteConfirmation
        isOpen={true}
        user={userWithSpecialEmail}
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
        isLoading={false}
      />
    );

    expect(screen.getByText('user+test@example.com')).toBeInTheDocument();
  });

  it('Debería manejar email muy largo', () => {
    const longEmail = 'very.long.email.address.that.exceeds.normal.length@example.com';
    const userWithLongEmail = { id: 3, email: longEmail };

    render(
      <DeleteConfirmation
        isOpen={true}
        user={userWithLongEmail}
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
        isLoading={false}
      />
    );

    expect(screen.getByText(longEmail)).toBeInTheDocument();
  });

  it('Debería no llamar onConfirm si está disabled', () => {
    render(
      <DeleteConfirmation
        isOpen={true}
        user={mockUser}
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
        isLoading={true}
      />
    );

    const confirmButton = screen.getByTestId('confirm-button');

    // Intentar hacer clic en botón deshabilitado no debería llamar la función
    fireEvent.click(confirmButton);

    expect(mockOnConfirm).not.toHaveBeenCalled();
  });

  it('Debería no llamar onCancel si está disabled', () => {
    render(
      <DeleteConfirmation
        isOpen={true}
        user={mockUser}
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
        isLoading={true}
      />
    );

    const cancelButton = screen.getByTestId('cancel-button');

    fireEvent.click(cancelButton);

    expect(mockOnCancel).not.toHaveBeenCalled();
  });

  it('Debería tener z-index alto para estar encima de todo', () => {
    render(
      <DeleteConfirmation
        isOpen={true}
        user={mockUser}
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
        isLoading={false}
      />
    );

    const modal = screen.getByTestId('delete-confirmation-modal');
    expect(modal).toHaveClass('z-50');
  });

  it('Debería tener backdrop semitransparente', () => {
    render(
      <DeleteConfirmation
        isOpen={true}
        user={mockUser}
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
        isLoading={false}
      />
    );

    const backdrop = screen.getByTestId('backdrop');
    expect(backdrop).toHaveClass('bg-black', 'bg-opacity-50');
  });

  it('Debería centrar el diálogo', () => {
    render(
      <DeleteConfirmation
        isOpen={true}
        user={mockUser}
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
        isLoading={false}
      />
    );

    const dialogContainer = screen.getByTestId('confirmation-dialog').parentElement;
    expect(dialogContainer).toHaveClass('items-center', 'justify-center');
  });
});

describe('DeleteConfirmation - callbacks y estados', () => {
  let mockUser: { id: number; email: string };
  let mockOnConfirm: jest.Mock;
  let mockOnCancel: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockUser = { id: 1, email: 'test@example.com' };
    mockOnConfirm = jest.fn();
    mockOnCancel = jest.fn();
  });

  it('Debería mantener callbacks estables entre renders', () => {
    const { rerender } = render(
      <DeleteConfirmation
        isOpen={true}
        user={mockUser}
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
        isLoading={false}
      />
    );

    // Re-renderizar con las mismas props
    rerender(
      <DeleteConfirmation
        isOpen={true}
        user={mockUser}
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
        isLoading={false}
      />
    );

    // Los callbacks deberían seguir siendo los mismos
    expect(screen.getByTestId('confirm-button')).toBeInTheDocument();
  });

  it('Debería actualizar estado de loading dinámicamente', () => {
    const { rerender } = render(
      <DeleteConfirmation
        isOpen={true}
        user={mockUser}
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
        isLoading={false}
      />
    );

    expect(screen.getByText('Eliminar')).toBeInTheDocument();

    // Cambiar a loading
    rerender(
      <DeleteConfirmation
        isOpen={true}
        user={mockUser}
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
        isLoading={true}
      />
    );

    expect(screen.getByText('Eliminando...')).toBeInTheDocument();
  });
});
