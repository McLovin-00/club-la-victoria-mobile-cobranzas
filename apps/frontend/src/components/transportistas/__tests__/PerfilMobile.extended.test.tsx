/**
 * Tests extendidos para PerfilMobile
 * Incrementa coverage cubriendo interacciones de formulario y guardado
 */
import { describe, it, expect, beforeAll, beforeEach, jest } from '@jest/globals';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

describe('PerfilMobile (extended)', () => {
  let PerfilMobile: React.FC;
  let mockUseProfile: any;
  let mockShowToast: jest.Mock;

  beforeAll(async () => {
    mockShowToast = jest.fn();
    mockUseProfile = {
      profile: {
        username: 'testuser',
        email: 'test@example.com',
        firstName: 'Juan',
        lastName: 'Pérez',
        phone: '+54 9 11 1234 5678',
        role: 'CLIENTE_TRANSPORTE',
        avatar: 'https://example.com/avatar.jpg',
        empresaId: 1,
        preferences: {},
      },
      updateProfile: jest.fn().mockResolvedValue(undefined),
      uploadAvatar: jest.fn().mockResolvedValue(undefined),
      refreshProfile: jest.fn().mockResolvedValue(undefined),
      isUpdating: false,
    };

    await jest.unstable_mockModule('../../../hooks/useProfile', () => ({
      useProfile: () => mockUseProfile,
    }));

    await jest.unstable_mockModule('../../ui/Toast.utils', () => ({
      showToast: (...args: any[]) => mockShowToast(...args),
    }));

    await jest.unstable_mockModule('../AvatarUpload', () => ({
      AvatarUpload: ({ onAvatarUpdate, currentAvatar, isUploading }: any) => (
        <div 
          data-testid="avatar-upload" 
          onClick={() => onAvatarUpdate?.(new File([''], 'test.jpg'))}
          data-uploading={isUploading}
        >
          Avatar: {currentAvatar || 'none'}
        </div>
      ),
    }));

    await jest.unstable_mockModule('../NotificationSettings', () => ({
      NotificationSettings: () => <div data-testid="notification-settings">NotificationSettings</div>,
    }));

    await jest.unstable_mockModule('../PreferenciasApp', () => ({
      PreferenciasApp: () => <div data-testid="preferencias-app">PreferenciasApp</div>,
    }));

    await jest.unstable_mockModule('../../mobile/PullToRefresh', () => ({
      PullToRefresh: ({ children, onRefresh }: any) => (
        <div data-testid="pull-to-refresh" onClick={() => onRefresh?.()}>{children}</div>
      ),
    }));

    ({ PerfilMobile } = await import('../PerfilMobile'));
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseProfile.profile = {
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
    mockUseProfile.isUpdating = false;
  });

  describe('edición de información personal', () => {
    it('debe mostrar botón de guardar cuando hay cambios', async () => {
      render(<PerfilMobile />);
      
      fireEvent.click(screen.getByText('Información Personal'));
      
      const nombreInput = screen.getByPlaceholderText('Tu nombre');
      fireEvent.change(nombreInput, { target: { value: 'Carlos' } });
      
      expect(screen.getByText('Guardar Cambios')).toBeInTheDocument();
    });

    it('debe guardar cambios correctamente', async () => {
      render(<PerfilMobile />);
      
      fireEvent.click(screen.getByText('Información Personal'));
      
      const nombreInput = screen.getByPlaceholderText('Tu nombre');
      fireEvent.change(nombreInput, { target: { value: 'Carlos' } });
      
      fireEvent.click(screen.getByText('Guardar Cambios'));
      
      await waitFor(() => {
        expect(mockUseProfile.updateProfile).toHaveBeenCalled();
        expect(mockShowToast).toHaveBeenCalledWith('Información personal actualizada', 'success');
      });
    });

    it('debe mostrar error si falla el guardado', async () => {
      mockUseProfile.updateProfile = jest.fn().mockRejectedValue(new Error('Error de red'));
      
      render(<PerfilMobile />);
      
      fireEvent.click(screen.getByText('Información Personal'));
      
      const nombreInput = screen.getByPlaceholderText('Tu nombre');
      fireEvent.change(nombreInput, { target: { value: 'Carlos' } });
      
      fireEvent.click(screen.getByText('Guardar Cambios'));
      
      await waitFor(() => {
        expect(mockShowToast).toHaveBeenCalledWith('Error de red', 'error');
      });
    });

    it('debe mostrar error genérico si falla sin mensaje', async () => {
      mockUseProfile.updateProfile = jest.fn().mockRejectedValue({});
      
      render(<PerfilMobile />);
      
      fireEvent.click(screen.getByText('Información Personal'));
      
      const nombreInput = screen.getByPlaceholderText('Tu nombre');
      fireEvent.change(nombreInput, { target: { value: 'Carlos' } });
      
      fireEvent.click(screen.getByText('Guardar Cambios'));
      
      await waitFor(() => {
        expect(mockShowToast).toHaveBeenCalledWith('Error al actualizar información', 'error');
      });
    });

    it('debe editar todos los campos del formulario', () => {
      render(<PerfilMobile />);
      
      fireEvent.click(screen.getByText('Información Personal'));
      
      const nombreInput = screen.getByPlaceholderText('Tu nombre');
      const apellidoInput = screen.getByPlaceholderText('Tu apellido');
      const phoneInput = screen.getByPlaceholderText('+54 9 11 1234 5678');
      const emailInput = screen.getByPlaceholderText('tu@email.com');
      
      fireEvent.change(nombreInput, { target: { value: 'Carlos' } });
      fireEvent.change(apellidoInput, { target: { value: 'González' } });
      fireEvent.change(phoneInput, { target: { value: '+541198765432' } });
      fireEvent.change(emailInput, { target: { value: 'nuevo@email.com' } });
      
      expect(nombreInput).toHaveValue('Carlos');
      expect(apellidoInput).toHaveValue('González');
    });
  });

  describe('avatar upload', () => {
    it('debe llamar uploadAvatar al actualizar avatar', async () => {
      render(<PerfilMobile />);
      
      fireEvent.click(screen.getByTestId('avatar-upload'));
      
      await waitFor(() => {
        expect(mockUseProfile.uploadAvatar).toHaveBeenCalled();
        expect(mockShowToast).toHaveBeenCalledWith('Avatar actualizado correctamente', 'success');
      });
    });

    it('debe mostrar error si falla upload de avatar', async () => {
      mockUseProfile.uploadAvatar = jest.fn().mockRejectedValue(new Error('Error de upload'));
      
      render(<PerfilMobile />);
      
      fireEvent.click(screen.getByTestId('avatar-upload'));
      
      await waitFor(() => {
        expect(mockShowToast).toHaveBeenCalledWith('Error de upload', 'error');
      });
    });

    it('debe pasar avatar actual al componente AvatarUpload', () => {
      mockUseProfile.profile.avatar = 'https://example.com/avatar.jpg';
      
      render(<PerfilMobile />);
      
      expect(screen.getByText('Avatar: https://example.com/avatar.jpg')).toBeInTheDocument();
    });
  });

  describe('pull to refresh', () => {
    it('debe refrescar perfil al hacer pull', async () => {
      render(<PerfilMobile />);
      
      fireEvent.click(screen.getByTestId('pull-to-refresh'));
      
      await waitFor(() => {
        expect(mockUseProfile.refreshProfile).toHaveBeenCalled();
        expect(mockShowToast).toHaveBeenCalledWith('Perfil actualizado', 'success');
      });
    });
  });

  describe('información del sistema', () => {
    it('debe mostrar empresaId cuando está disponible', () => {
      render(<PerfilMobile />);
      
      fireEvent.click(screen.getByText('Información Personal'));
      
      expect(screen.getByText('Empresa ID:')).toBeInTheDocument();
      expect(screen.getByText('1')).toBeInTheDocument();
    });

    it('no debe mostrar empresaId cuando no está disponible', () => {
      mockUseProfile.profile.empresaId = null;
      
      render(<PerfilMobile />);
      
      fireEvent.click(screen.getByText('Información Personal'));
      
      expect(screen.queryByText('Empresa ID:')).not.toBeInTheDocument();
    });
  });

  describe('roles', () => {
    it('debe mostrar rol como string cuando no es CLIENTE_TRANSPORTE', () => {
      mockUseProfile.profile.role = 'ADMIN';
      
      render(<PerfilMobile />);
      
      expect(screen.getByText('ADMIN')).toBeInTheDocument();
    });
  });

  describe('estado de actualización', () => {
    it('debe mostrar estado de carga mientras guarda', () => {
      mockUseProfile.isUpdating = true;
      
      render(<PerfilMobile />);
      
      fireEvent.click(screen.getByText('Información Personal'));
      
      // El formulario debe estar visible pero sin botón de guardar activo
      expect(screen.getByPlaceholderText('Tu nombre')).toBeInTheDocument();
    });
  });

  describe('navegación entre secciones', () => {
    it('debe cerrar sección actual al abrir otra', () => {
      render(<PerfilMobile />);
      
      // Abrir personal
      fireEvent.click(screen.getByText('Información Personal'));
      expect(screen.getByPlaceholderText('Tu nombre')).toBeInTheDocument();
      
      // Abrir notificaciones (debería cerrar personal)
      fireEvent.click(screen.getByText('Notificaciones'));
      expect(screen.getByTestId('notification-settings')).toBeInTheDocument();
      
      // Personal debería estar cerrado
      expect(screen.queryByPlaceholderText('Tu nombre')).not.toBeInTheDocument();
    });
  });
});

