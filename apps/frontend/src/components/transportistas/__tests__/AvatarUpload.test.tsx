/**
 * Tests para el componente AvatarUpload
 * Verifica renderizado y comportamiento del upload de avatar
 */
import { describe, it, expect, beforeAll, beforeEach, jest } from '@jest/globals';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

describe('AvatarUpload', () => {
  let AvatarUpload: React.FC<{
    currentAvatar?: string;
    onAvatarUpdate: (file: File) => Promise<void>;
    isUploading?: boolean;
  }>;
  
  let mockUseCameraPermissions: any;
  let mockUseImageUpload: any;
  let mockShowToast: jest.Mock;

  beforeAll(async () => {
    mockShowToast = jest.fn();
    mockUseCameraPermissions = {
      permissionStatus: 'granted',
      requestPermission: jest.fn().mockResolvedValue('granted'),
      openCameraSettings: jest.fn(),
    };
    mockUseImageUpload = {
      captureFromCamera: jest.fn().mockResolvedValue({ file: new File([''], 'test.jpg') }),
      selectFromGallery: jest.fn().mockResolvedValue({ file: new File([''], 'test.jpg') }),
      error: null,
    };

    await jest.unstable_mockModule('../../../hooks/useCameraPermissions', () => ({
      useCameraPermissions: () => mockUseCameraPermissions,
    }));

    await jest.unstable_mockModule('../../../hooks/useImageUpload', () => ({
      useImageUpload: () => mockUseImageUpload,
    }));

    await jest.unstable_mockModule('../../ui/Toast.utils', () => ({
      showToast: (...args: any[]) => mockShowToast(...args),
    }));

    await jest.unstable_mockModule('../../mobile/TouchFeedback', () => ({
      TouchFeedback: ({ children, onClick, disabled }: any) => (
        <div onClick={disabled ? undefined : onClick}>{children}</div>
      ),
    }));

    ({ AvatarUpload } = await import('../AvatarUpload'));
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseCameraPermissions.permissionStatus = 'granted';
    mockUseImageUpload.error = null;
  });

  describe('renderizado básico', () => {
    it('debe renderizar el botón de cambiar foto', () => {
      render(<AvatarUpload onAvatarUpdate={jest.fn()} />);
      expect(screen.getByText('Cambiar foto')).toBeInTheDocument();
    });

    it('debe mostrar avatar placeholder cuando no hay avatar', () => {
      const { container } = render(<AvatarUpload onAvatarUpdate={jest.fn()} />);
      // Debe mostrar el placeholder con gradiente
      expect(container.querySelector('.bg-gradient-to-br')).toBeInTheDocument();
    });

    it('debe mostrar avatar cuando se proporciona currentAvatar', () => {
      render(<AvatarUpload currentAvatar="https://example.com/avatar.jpg" onAvatarUpdate={jest.fn()} />);
      const img = screen.getByAltText('Avatar');
      expect(img).toBeInTheDocument();
      expect(img).toHaveAttribute('src', 'https://example.com/avatar.jpg');
    });

    it('debe mostrar spinner cuando isUploading es true', () => {
      const { container } = render(<AvatarUpload onAvatarUpdate={jest.fn()} isUploading={true} />);
      expect(container.querySelector('.animate-spin')).toBeInTheDocument();
    });
  });

  describe('modal de opciones', () => {
    it('debe abrir modal al hacer clic en cambiar foto', () => {
      render(<AvatarUpload onAvatarUpdate={jest.fn()} />);
      
      fireEvent.click(screen.getByText('Cambiar foto'));
      
      expect(screen.getByText('Cambiar Avatar')).toBeInTheDocument();
      expect(screen.getByText('Elige cómo quieres actualizar tu foto')).toBeInTheDocument();
    });

    it('debe mostrar opción de cámara', () => {
      render(<AvatarUpload onAvatarUpdate={jest.fn()} />);
      
      fireEvent.click(screen.getByText('Cambiar foto'));
      
      expect(screen.getByText('Tomar foto')).toBeInTheDocument();
      expect(screen.getByText('Usar la cámara del dispositivo')).toBeInTheDocument();
    });

    it('debe mostrar opción de galería', () => {
      render(<AvatarUpload onAvatarUpdate={jest.fn()} />);
      
      fireEvent.click(screen.getByText('Cambiar foto'));
      
      expect(screen.getByText('Seleccionar de galería')).toBeInTheDocument();
      expect(screen.getByText('Elegir desde tus fotos')).toBeInTheDocument();
    });

    it('debe mostrar botón cancelar', () => {
      render(<AvatarUpload onAvatarUpdate={jest.fn()} />);
      
      fireEvent.click(screen.getByText('Cambiar foto'));
      
      expect(screen.getByText('Cancelar')).toBeInTheDocument();
    });

    it('debe cerrar modal al hacer clic en cancelar', () => {
      render(<AvatarUpload onAvatarUpdate={jest.fn()} />);
      
      fireEvent.click(screen.getByText('Cambiar foto'));
      expect(screen.getByText('Cambiar Avatar')).toBeInTheDocument();
      
      fireEvent.click(screen.getByText('Cancelar'));
      expect(screen.queryByText('Cambiar Avatar')).not.toBeInTheDocument();
    });
  });

  describe('estados de permisos', () => {
    it('debe mostrar mensaje de permisos denegados cuando permissionStatus es denied', () => {
      mockUseCameraPermissions.permissionStatus = 'denied';
      
      render(<AvatarUpload onAvatarUpdate={jest.fn()} />);
      fireEvent.click(screen.getByText('Cambiar foto'));
      
      expect(screen.getByText('Permisos de cámara denegados')).toBeInTheDocument();
    });

    it('debe mostrar mensaje de cámara no disponible cuando permissionStatus es not-supported', () => {
      mockUseCameraPermissions.permissionStatus = 'not-supported';
      
      render(<AvatarUpload onAvatarUpdate={jest.fn()} />);
      fireEvent.click(screen.getByText('Cambiar foto'));
      
      expect(screen.getByText('Cámara no disponible')).toBeInTheDocument();
    });

    it('debe mostrar mensaje de permitir acceso cuando permissionStatus es prompt', () => {
      mockUseCameraPermissions.permissionStatus = 'prompt';
      
      render(<AvatarUpload onAvatarUpdate={jest.fn()} />);
      fireEvent.click(screen.getByText('Cambiar foto'));
      
      expect(screen.getByText('Permitir acceso a cámara')).toBeInTheDocument();
    });
  });

  describe('selección de imagen', () => {
    it('debe llamar onAvatarUpdate al seleccionar desde galería', async () => {
      const mockOnAvatarUpdate = jest.fn().mockResolvedValue(undefined);
      
      render(<AvatarUpload onAvatarUpdate={mockOnAvatarUpdate} />);
      
      fireEvent.click(screen.getByText('Cambiar foto'));
      fireEvent.click(screen.getByText('Seleccionar de galería'));
      
      await waitFor(() => {
        expect(mockUseImageUpload.selectFromGallery).toHaveBeenCalled();
        expect(mockOnAvatarUpdate).toHaveBeenCalled();
      });
    });
  });

  describe('errores', () => {
    it('debe mostrar error de upload cuando hay error', () => {
      mockUseImageUpload.error = 'Error al procesar imagen';
      
      render(<AvatarUpload onAvatarUpdate={jest.fn()} />);
      fireEvent.click(screen.getByText('Cambiar foto'));
      
      expect(screen.getByText('Error al procesar imagen')).toBeInTheDocument();
    });
  });
});

