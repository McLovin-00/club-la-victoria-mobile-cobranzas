/**
 * Tests extendidos para ChangePasswordForm
 * Cubre más casos de validación y flujos de error
 */
import React from 'react';
import { describe, it, expect, beforeAll, beforeEach, jest } from '@jest/globals';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

describe('ChangePasswordForm - Extended', () => {
  let state: any = {};
  let dispatch = jest.fn();
  let showToast = jest.fn();
  let ChangePasswordForm: React.FC;

  beforeAll(async () => {
    (globalThis as any).localStorage.getItem = jest.fn(() => 'token-x');

    await jest.unstable_mockModule('react-redux', () => ({
      useDispatch: () => dispatch,
      useSelector: (sel: any) => sel(state),
    }));

    await jest.unstable_mockModule('../ui/Toast.utils', () => ({
      showToast: (...args: any[]) => showToast(...args),
    }));

    ({ ChangePasswordForm } = await import('../ChangePasswordForm'));
  });

  beforeEach(() => {
    dispatch = jest.fn();
    showToast = jest.fn();
    state = {
      auth: {
        user: { id: 1, email: 'test@example.com', mustChangePassword: true },
      },
    };
    (globalThis as any).fetch = jest.fn();
    (globalThis as any).localStorage.getItem = jest.fn(() => 'token-x');
  });

  describe('validación de contraseña', () => {
    it('debe mostrar error si nueva contraseña no tiene mayúscula', () => {
      render(<ChangePasswordForm />);
      
      fireEvent.change(screen.getByLabelText('Contraseña Actual'), { target: { value: 'OldPass1' } });
      fireEvent.change(screen.getByLabelText('Nueva Contraseña'), { target: { value: 'newpass123' } });
      fireEvent.change(screen.getByLabelText('Confirmar Nueva Contraseña'), { target: { value: 'newpass123' } });
      fireEvent.submit(screen.getByRole('button', { name: 'Cambiar Contraseña' }).closest('form')!);
      
      expect(showToast).toHaveBeenCalledWith(
        'La contraseña debe contener al menos una mayúscula, una minúscula y un número',
        'error'
      );
    });

    it('debe mostrar error si nueva contraseña no tiene minúscula', () => {
      render(<ChangePasswordForm />);
      
      fireEvent.change(screen.getByLabelText('Contraseña Actual'), { target: { value: 'OldPass1' } });
      fireEvent.change(screen.getByLabelText('Nueva Contraseña'), { target: { value: 'NEWPASS123' } });
      fireEvent.change(screen.getByLabelText('Confirmar Nueva Contraseña'), { target: { value: 'NEWPASS123' } });
      fireEvent.submit(screen.getByRole('button', { name: 'Cambiar Contraseña' }).closest('form')!);
      
      expect(showToast).toHaveBeenCalledWith(
        'La contraseña debe contener al menos una mayúscula, una minúscula y un número',
        'error'
      );
    });

    it('debe mostrar error si nueva contraseña no tiene número', () => {
      render(<ChangePasswordForm />);
      
      fireEvent.change(screen.getByLabelText('Contraseña Actual'), { target: { value: 'OldPass1' } });
      fireEvent.change(screen.getByLabelText('Nueva Contraseña'), { target: { value: 'NewPassword' } });
      fireEvent.change(screen.getByLabelText('Confirmar Nueva Contraseña'), { target: { value: 'NewPassword' } });
      fireEvent.submit(screen.getByRole('button', { name: 'Cambiar Contraseña' }).closest('form')!);
      
      expect(showToast).toHaveBeenCalledWith(
        'La contraseña debe contener al menos una mayúscula, una minúscula y un número',
        'error'
      );
    });

    it('debe mostrar error si la nueva contraseña tiene menos de 8 caracteres', () => {
      render(<ChangePasswordForm />);
      
      fireEvent.change(screen.getByLabelText('Contraseña Actual'), { target: { value: 'OldPass1' } });
      fireEvent.change(screen.getByLabelText('Nueva Contraseña'), { target: { value: 'Short1' } });
      fireEvent.change(screen.getByLabelText('Confirmar Nueva Contraseña'), { target: { value: 'Short1' } });
      fireEvent.submit(screen.getByRole('button', { name: 'Cambiar Contraseña' }).closest('form')!);
      
      expect(showToast).toHaveBeenCalledWith(
        'La nueva contraseña debe tener al menos 8 caracteres',
        'error'
      );
    });

    it('debe mostrar error si las contraseñas no coinciden', () => {
      render(<ChangePasswordForm />);
      
      fireEvent.change(screen.getByLabelText('Contraseña Actual'), { target: { value: 'OldPass1' } });
      fireEvent.change(screen.getByLabelText('Nueva Contraseña'), { target: { value: 'NewPass123' } });
      fireEvent.change(screen.getByLabelText('Confirmar Nueva Contraseña'), { target: { value: 'DifferentPass1' } });
      fireEvent.submit(screen.getByRole('button', { name: 'Cambiar Contraseña' }).closest('form')!);
      
      expect(showToast).toHaveBeenCalledWith('Las contraseñas no coinciden', 'error');
    });

    it('debe mostrar error si la nueva contraseña es igual a la actual', () => {
      render(<ChangePasswordForm />);
      
      fireEvent.change(screen.getByLabelText('Contraseña Actual'), { target: { value: 'SamePass1' } });
      fireEvent.change(screen.getByLabelText('Nueva Contraseña'), { target: { value: 'SamePass1' } });
      fireEvent.change(screen.getByLabelText('Confirmar Nueva Contraseña'), { target: { value: 'SamePass1' } });
      fireEvent.submit(screen.getByRole('button', { name: 'Cambiar Contraseña' }).closest('form')!);
      
      expect(showToast).toHaveBeenCalledWith('La nueva contraseña debe ser diferente a la actual', 'error');
    });

    it('debe mostrar error si la nueva contraseña está vacía', () => {
      render(<ChangePasswordForm />);
      
      fireEvent.change(screen.getByLabelText('Contraseña Actual'), { target: { value: 'OldPass1' } });
      fireEvent.change(screen.getByLabelText('Nueva Contraseña'), { target: { value: '' } });
      fireEvent.change(screen.getByLabelText('Confirmar Nueva Contraseña'), { target: { value: '' } });
      fireEvent.submit(screen.getByRole('button', { name: 'Cambiar Contraseña' }).closest('form')!);
      
      expect(showToast).toHaveBeenCalledWith('La nueva contraseña es requerida', 'error');
    });
  });

  describe('toggle de visibilidad de contraseñas', () => {
    it('debe alternar visibilidad de nueva contraseña', () => {
      render(<ChangePasswordForm />);
      
      const newPasswordInput = screen.getByLabelText('Nueva Contraseña') as HTMLInputElement;
      expect(newPasswordInput.type).toBe('password');
      
      const toggleButton = newPasswordInput.parentElement!.querySelector('button')!;
      fireEvent.click(toggleButton);
      expect(newPasswordInput.type).toBe('text');
      
      fireEvent.click(toggleButton);
      expect(newPasswordInput.type).toBe('password');
    });

    it('debe alternar visibilidad de confirmar contraseña', () => {
      render(<ChangePasswordForm />);
      
      const confirmInput = screen.getByLabelText('Confirmar Nueva Contraseña') as HTMLInputElement;
      expect(confirmInput.type).toBe('password');
      
      const toggleButton = confirmInput.parentElement!.querySelector('button')!;
      fireEvent.click(toggleButton);
      expect(confirmInput.type).toBe('text');
    });
  });

  describe('manejo de errores de red', () => {
    it('debe mostrar error de conexión cuando fetch falla', async () => {
      (globalThis as any).fetch = jest.fn().mockRejectedValue(new Error('Network error'));
      
      render(<ChangePasswordForm />);
      
      fireEvent.change(screen.getByLabelText('Contraseña Actual'), { target: { value: 'OldPass1' } });
      fireEvent.change(screen.getByLabelText('Nueva Contraseña'), { target: { value: 'NewPass123' } });
      fireEvent.change(screen.getByLabelText('Confirmar Nueva Contraseña'), { target: { value: 'NewPass123' } });
      fireEvent.submit(screen.getByRole('button', { name: 'Cambiar Contraseña' }).closest('form')!);
      
      await waitFor(() => {
        expect(showToast).toHaveBeenCalledWith('Error de conexión al cambiar la contraseña', 'error');
      });
    });

    it('debe mostrar mensaje de error genérico cuando backend no retorna message', async () => {
      (globalThis as any).fetch = jest.fn(async () => ({
        ok: false,
        json: async () => ({}),
      }));
      
      render(<ChangePasswordForm />);
      
      fireEvent.change(screen.getByLabelText('Contraseña Actual'), { target: { value: 'OldPass1' } });
      fireEvent.change(screen.getByLabelText('Nueva Contraseña'), { target: { value: 'NewPass123' } });
      fireEvent.change(screen.getByLabelText('Confirmar Nueva Contraseña'), { target: { value: 'NewPass123' } });
      fireEvent.submit(screen.getByRole('button', { name: 'Cambiar Contraseña' }).closest('form')!);
      
      await waitFor(() => {
        expect(showToast).toHaveBeenCalledWith('Error al cambiar la contraseña', 'error');
      });
    });
  });

  describe('estado de carga', () => {
    it('debe mostrar "Cambiando..." mientras procesa', async () => {
      (globalThis as any).fetch = jest.fn(() => 
        new Promise(resolve => setTimeout(() => resolve({ ok: true }), 1000))
      );
      
      render(<ChangePasswordForm />);
      
      fireEvent.change(screen.getByLabelText('Contraseña Actual'), { target: { value: 'OldPass1' } });
      fireEvent.change(screen.getByLabelText('Nueva Contraseña'), { target: { value: 'NewPass123' } });
      fireEvent.change(screen.getByLabelText('Confirmar Nueva Contraseña'), { target: { value: 'NewPass123' } });
      fireEvent.submit(screen.getByRole('button', { name: 'Cambiar Contraseña' }).closest('form')!);
      
      await waitFor(() => {
        expect(screen.getByText('Cambiando...')).toBeInTheDocument();
      });
    });
  });

  describe('limpieza del formulario', () => {
    it('debe limpiar los campos después de cambio exitoso', async () => {
      (globalThis as any).fetch = jest.fn(async () => ({ ok: true }));
      
      render(<ChangePasswordForm />);
      
      const currentPassword = screen.getByLabelText('Contraseña Actual') as HTMLInputElement;
      const newPassword = screen.getByLabelText('Nueva Contraseña') as HTMLInputElement;
      const confirmPassword = screen.getByLabelText('Confirmar Nueva Contraseña') as HTMLInputElement;
      
      fireEvent.change(currentPassword, { target: { value: 'OldPass1' } });
      fireEvent.change(newPassword, { target: { value: 'NewPass123' } });
      fireEvent.change(confirmPassword, { target: { value: 'NewPass123' } });
      fireEvent.submit(screen.getByRole('button', { name: 'Cambiar Contraseña' }).closest('form')!);
      
      await waitFor(() => {
        expect(currentPassword.value).toBe('');
        expect(newPassword.value).toBe('');
        expect(confirmPassword.value).toBe('');
      });
    });
  });
});

