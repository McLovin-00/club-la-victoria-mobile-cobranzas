/**
 * Tests para el componente PerfilMobile refactorizados para ESM y robustez
 * Verifica renderizado del perfil mobile y sus secciones
 */
import React from 'react';
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

// Estado mutable para los mocks
const mockState = {
  profile: {
    username: 'testuser',
    email: 'test@example.com',
    firstName: 'Juan',
    lastName: 'Pérez',
    phone: '+54 9 11 1234 5678',
    role: 'CLIENTE_TRANSPORTE',
    avatar: null,
    empresaId: 1,
    preferences: {},
  } as any,
  isUpdating: false,
};

const mockUpdateProfile = jest.fn().mockResolvedValue(undefined);
const mockUploadAvatar = jest.fn().mockResolvedValue(undefined);
const mockRefreshProfile = jest.fn().mockResolvedValue(undefined);

// Mock de hooks
jest.unstable_mockModule('../../../hooks/useProfile', () => ({
  useProfile: () => ({
    profile: mockState.profile,
    updateProfile: mockUpdateProfile,
    uploadAvatar: mockUploadAvatar,
    refreshProfile: mockRefreshProfile,
    isUpdating: mockState.isUpdating,
  }),
}));

const mockShowToast = jest.fn();
jest.unstable_mockModule('../../ui/Toast.utils', () => ({
  showToast: mockShowToast,
}));

jest.unstable_mockModule('../AvatarUpload', () => ({
  AvatarUpload: ({ onAvatarUpdate, currentAvatar }: any) => (
    <div data-testid="avatar-upload" onClick={() => onAvatarUpdate?.(new File([''], 'test.jpg'))}>
      Avatar: {currentAvatar || 'none'}
    </div>
  ),
}));

jest.unstable_mockModule('../NotificationSettings', () => ({
  NotificationSettings: () => <div data-testid="notification-settings">NotificationSettings</div>,
}));

jest.unstable_mockModule('../PreferenciasApp', () => ({
  PreferenciasApp: () => <div data-testid="preferencias-app">PreferenciasApp</div>,
}));

jest.unstable_mockModule('../../mobile/PullToRefresh', () => ({
  PullToRefresh: ({ children }: any) => (
    <div data-testid="pull-to-refresh">{children}</div>
  ),
}));

// Import dinámico
const { PerfilMobile } = await import('../PerfilMobile');

describe('PerfilMobile', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockState.profile = {
      username: 'testuser',
      email: 'test@example.com',
      firstName: 'Juan',
      lastName: 'Pérez',
      phone: '+54 9 11 1234 5678',
      role: 'CLIENTE_TRANSPORTE',
      avatar: null,
      empresaId: 1,
      preferences: {},
    };
    mockState.isUpdating = false;
  });

  describe('renderizado básico', () => {
    it('debe renderizar el nombre completo del usuario', () => {
      render(<PerfilMobile />);
      expect(screen.getByText('Juan Pérez')).toBeInTheDocument();
    });

    it('debe renderizar el rol como Transportista', () => {
      render(<PerfilMobile />);
      expect(screen.getByText('Transportista')).toBeInTheDocument();
    });
  });

  describe('expandir secciones', () => {
    it('debe expandir sección de Información Personal al hacer clic', () => {
      render(<PerfilMobile />);

      // Hay 2 elementos con este texto cuando está expandido, 
      // pero aquí solo hay 1 porque todavía no está expandido.
      fireEvent.click(screen.getByText('Información Personal'));

      expect(screen.getByPlaceholderText('Tu nombre')).toBeInTheDocument();
    });

    it('debe colapsar sección al hacer clic nuevamente', () => {
      render(<PerfilMobile />);

      // Expandir
      fireEvent.click(screen.getByText('Información Personal'));
      expect(screen.getByPlaceholderText('Tu nombre')).toBeInTheDocument();

      // Colapsar - Ahora hay 2 "Información Personal". El de la sección y el del header.
      // El del header suele ser el primero o podemos usar getAllByText y clickear el que sea clickable.
      const elements = screen.getAllByText('Información Personal');
      fireEvent.click(elements[0]);

      expect(screen.queryByPlaceholderText('Tu nombre')).not.toBeInTheDocument();
    });
  });

  describe('interacciones', () => {
    it('debe llamar a updateProfile al guardar cambios', async () => {
      render(<PerfilMobile />);
      fireEvent.click(screen.getByText('Información Personal'));

      const input = screen.getByPlaceholderText('Tu nombre');
      fireEvent.change(input, { target: { value: 'Nuevo Nombre' } });

      const saveButton = screen.getByText('Guardar Cambios');
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(mockUpdateProfile).toHaveBeenCalled();
        expect(mockShowToast).toHaveBeenCalledWith('Información personal actualizada', 'success');
      });
    });
  });

  describe('avatar update', () => {
    it('debe llamar a uploadAvatar cuando se actualiza el avatar', async () => {
      render(<PerfilMobile />);
      const avatarUpload = screen.getByTestId('avatar-upload');
      fireEvent.click(avatarUpload);

      await waitFor(() => {
        expect(mockUploadAvatar).toHaveBeenCalled();
        expect(mockShowToast).toHaveBeenCalledWith('Avatar actualizado correctamente', 'success');
      });
    });
  });
});
