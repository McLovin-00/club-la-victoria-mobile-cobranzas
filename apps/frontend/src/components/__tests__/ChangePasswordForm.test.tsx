// Tests de `ChangePasswordForm`: validaciones, toggle de visibilidad y flujo de éxito/error (Jest ESM).
import React from 'react';
import '@testing-library/jest-dom';
import { describe, it, expect, beforeAll, beforeEach, jest } from '@jest/globals';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

describe('ChangePasswordForm', () => {
  let state: any = {};
  let dispatch = jest.fn();
  let showToast = jest.fn();
  let ChangePasswordForm: React.FC;

  beforeAll(async () => {
    // Evitar efectos colaterales del authSlice al importarse (lee localStorage al inicializar).
    (globalThis as any).localStorage.getItem = jest.fn(() => null);

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
        user: { id: 1, email: 'a@b.com', mustChangePassword: true },
      },
    };
    (globalThis as any).fetch = jest.fn();
    // Asegurar token para el código que lee `localStorage` (en jsdom puede ser Storage real o mock).
    const ls: any = window.localStorage as any;
    try {
      ls?.setItem?.('token', 'token-x');
    } catch {
      // ignore
    }
    if (ls?.getItem?.mockImplementation) {
      ls.getItem.mockImplementation((k: string) => (k === 'token' ? 'token-x' : null));
    } else {
      ls.getItem = jest.fn((k: string) => (k === 'token' ? 'token-x' : null));
    }
  });

  it('muestra error si se envía vacío', () => {
    render(<ChangePasswordForm />);
    // Usamos submit manual para evitar el bloqueo de validación nativa (required) en jsdom.
    fireEvent.submit(screen.getByRole('button', { name: 'Cambiar Contraseña' }).closest('form')!);
    expect(showToast).toHaveBeenCalledWith('La contraseña actual es requerida', 'error');
    expect((globalThis as any).fetch).not.toHaveBeenCalled();
  });

  it('permite toggle y cambia contraseña (ok + dispatch + reset)', async () => {
    (globalThis as any).fetch = jest.fn(async () => ({ ok: true }));

    render(<ChangePasswordForm />);

    // Toggle visibilidad
    const currentInput = screen.getByLabelText('Contraseña Actual') as HTMLInputElement;
    expect(currentInput.type).toBe('password');
    fireEvent.click(currentInput.parentElement!.querySelector('button')!);
    expect(currentInput.type).toBe('text');

    // Form válido
    fireEvent.change(screen.getByLabelText('Contraseña Actual'), { target: { value: 'OldPass1' } });
    fireEvent.change(screen.getByLabelText('Nueva Contraseña'), { target: { value: 'NewPass1A' } });
    fireEvent.change(screen.getByLabelText('Confirmar Nueva Contraseña'), { target: { value: 'NewPass1A' } });
    fireEvent.submit(screen.getByRole('button', { name: 'Cambiar Contraseña' }).closest('form')!);

    await waitFor(() => {
      expect((globalThis as any).fetch).toHaveBeenCalledWith(
        '/api/platform/auth/change-password',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            Authorization: 'Bearer token-x',
          }),
        })
      );
    });

    expect(showToast).toHaveBeenCalledWith('Contraseña cambiada exitosamente', 'success');
    expect(dispatch).toHaveBeenCalledWith(expect.objectContaining({ type: 'auth/setCurrentUser' }));
  });

  it('muestra error del backend cuando response.ok=false', async () => {
    (globalThis as any).fetch = jest.fn(async () => ({
      ok: false,
      json: async () => ({ message: 'backend fail' }),
    }));

    render(<ChangePasswordForm />);
    fireEvent.change(screen.getByLabelText('Contraseña Actual'), { target: { value: 'OldPass1' } });
    fireEvent.change(screen.getByLabelText('Nueva Contraseña'), { target: { value: 'NewPass1A' } });
    fireEvent.change(screen.getByLabelText('Confirmar Nueva Contraseña'), { target: { value: 'NewPass1A' } });
    fireEvent.click(screen.getByRole('button', { name: 'Cambiar Contraseña' }));

    await waitFor(() => {
      expect(showToast).toHaveBeenCalledWith('backend fail', 'error');
    });
  });

  it('valida longitud mínima de contraseña', () => {
    render(<ChangePasswordForm />);
    fireEvent.change(screen.getByLabelText('Contraseña Actual'), { target: { value: 'OldPass1' } });
    fireEvent.change(screen.getByLabelText('Nueva Contraseña'), { target: { value: 'Short1' } });
    fireEvent.change(screen.getByLabelText('Confirmar Nueva Contraseña'), { target: { value: 'Short1' } });
    fireEvent.click(screen.getByRole('button', { name: 'Cambiar Contraseña' }));

    expect(showToast).toHaveBeenCalledWith('La nueva contraseña debe tener al menos 8 caracteres', 'error');
  });

  it('valida complejidad de contraseña (regex)', () => {
    render(<ChangePasswordForm />);
    fireEvent.change(screen.getByLabelText('Contraseña Actual'), { target: { value: 'OldPass1' } });
    fireEvent.change(screen.getByLabelText('Nueva Contraseña'), { target: { value: 'alllowercase1' } });
    fireEvent.change(screen.getByLabelText('Confirmar Nueva Contraseña'), { target: { value: 'alllowercase1' } });
    fireEvent.click(screen.getByRole('button', { name: 'Cambiar Contraseña' }));

    expect(showToast).toHaveBeenCalledWith('La contraseña debe contener al menos una mayúscula, una minúscula y un número', 'error');
  });

  it('valida que las contraseñas coincidan', () => {
    render(<ChangePasswordForm />);
    fireEvent.change(screen.getByLabelText('Contraseña Actual'), { target: { value: 'OldPass1' } });
    fireEvent.change(screen.getByLabelText('Nueva Contraseña'), { target: { value: 'NewPass1A' } });
    fireEvent.change(screen.getByLabelText('Confirmar Nueva Contraseña'), { target: { value: 'NewPass1B' } });
    fireEvent.click(screen.getByRole('button', { name: 'Cambiar Contraseña' }));

    expect(showToast).toHaveBeenCalledWith('Las contraseñas no coinciden', 'error');
  });

  it('valida que la nueva contraseña no sea igual a la actual', () => {
    render(<ChangePasswordForm />);
    fireEvent.change(screen.getByLabelText('Contraseña Actual'), { target: { value: 'SamePass1A' } });
    fireEvent.change(screen.getByLabelText('Nueva Contraseña'), { target: { value: 'SamePass1A' } });
    fireEvent.change(screen.getByLabelText('Confirmar Nueva Contraseña'), { target: { value: 'SamePass1A' } });
    fireEvent.click(screen.getByRole('button', { name: 'Cambiar Contraseña' }));

    expect(showToast).toHaveBeenCalledWith('La nueva contraseña debe ser diferente a la actual', 'error');
  });

  it('permite toggle de visibilidad para todos los campos', () => {
    render(<ChangePasswordForm />);
    const inputs = screen.getAllByLabelText(/Contraseña/);

    // Toggle NEW (Index 1)
    expect(inputs[1]).toHaveAttribute('type', 'password');
    const newToggle = inputs[1].parentElement?.querySelector('button');
    fireEvent.click(newToggle!);
    expect(inputs[1]).toHaveAttribute('type', 'text');

    // Toggle CONFIRM (Index 2)
    expect(inputs[2]).toHaveAttribute('type', 'password');
    const confirmToggle = inputs[2].parentElement?.querySelector('button');
    fireEvent.click(confirmToggle!);
    expect(inputs[2]).toHaveAttribute('type', 'text');
  });
});


