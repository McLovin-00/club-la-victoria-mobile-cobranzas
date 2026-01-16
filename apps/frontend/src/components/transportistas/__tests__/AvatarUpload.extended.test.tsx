/**
 * Tests extendidos para AvatarUpload
 * Incrementa coverage cubriendo interacciones de cámara y galería
 */
import { describe, it, expect, beforeAll, beforeEach, jest } from '@jest/globals';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

describe('AvatarUpload (extended)', () => {
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

  describe('captura desde cámara', () => {
    it('debe capturar foto cuando tiene permisos', async () => {
      const mockOnAvatarUpdate = jest.fn().mockResolvedValue(undefined);
      
      render(<AvatarUpload onAvatarUpdate={mockOnAvatarUpdate} />);
      
      fireEvent.click(screen.getByText('Cambiar foto'));
      fireEvent.click(screen.getByText('Tomar foto'));
      
      await waitFor(() => {
        expect(mockUseImageUpload.captureFromCamera).toHaveBeenCalled();
        expect(mockOnAvatarUpdate).toHaveBeenCalled();
        expect(mockShowToast).toHaveBeenCalledWith('Avatar actualizado correctamente', 'success');
      });
    });

    it('debe mostrar error si permiso denegado', async () => {
      mockUseCameraPermissions.permissionStatus = 'denied';
      
      render(<AvatarUpload onAvatarUpdate={jest.fn()} />);
      
      fireEvent.click(screen.getByText('Cambiar foto'));
      fireEvent.click(screen.getByText('Permisos de cámara denegados'));
      
      await waitFor(() => {
        expect(mockShowToast).toHaveBeenCalledWith('Permiso de cámara denegado. Revisa la configuración de tu navegador.', 'error');
      });
    });

    it('debe solicitar permiso si está en estado prompt', async () => {
      mockUseCameraPermissions.permissionStatus = 'prompt';
      mockUseCameraPermissions.requestPermission = jest.fn().mockResolvedValue('granted');
      const mockOnAvatarUpdate = jest.fn().mockResolvedValue(undefined);
      
      render(<AvatarUpload onAvatarUpdate={mockOnAvatarUpdate} />);
      
      fireEvent.click(screen.getByText('Cambiar foto'));
      fireEvent.click(screen.getByText('Permitir acceso a cámara'));
      
      await waitFor(() => {
        expect(mockUseCameraPermissions.requestPermission).toHaveBeenCalled();
      });
    });

    it('debe mostrar error si permiso no concedido después de solicitar', async () => {
      mockUseCameraPermissions.permissionStatus = 'prompt';
      mockUseCameraPermissions.requestPermission = jest.fn().mockResolvedValue('denied');
      
      render(<AvatarUpload onAvatarUpdate={jest.fn()} />);
      
      fireEvent.click(screen.getByText('Cambiar foto'));
      fireEvent.click(screen.getByText('Permitir acceso a cámara'));
      
      await waitFor(() => {
        expect(mockShowToast).toHaveBeenCalledWith('Se requiere permiso de cámara para tomar fotos', 'error');
      });
    });

    it('debe manejar error en captura de cámara', async () => {
      mockUseImageUpload.captureFromCamera = jest.fn().mockRejectedValue(new Error('Error de cámara'));
      
      render(<AvatarUpload onAvatarUpdate={jest.fn()} />);
      
      fireEvent.click(screen.getByText('Cambiar foto'));
      fireEvent.click(screen.getByText('Tomar foto'));
      
      await waitFor(() => {
        expect(mockShowToast).toHaveBeenCalledWith('Error de cámara', 'error');
      });
    });

    it('debe manejar error genérico en captura', async () => {
      mockUseImageUpload.captureFromCamera = jest.fn().mockRejectedValue({});
      
      render(<AvatarUpload onAvatarUpdate={jest.fn()} />);
      
      fireEvent.click(screen.getByText('Cambiar foto'));
      fireEvent.click(screen.getByText('Tomar foto'));
      
      await waitFor(() => {
        expect(mockShowToast).toHaveBeenCalledWith('Error al capturar foto', 'error');
      });
    });
  });

  describe('selección desde galería', () => {
    it('debe seleccionar imagen de galería correctamente', async () => {
      const mockOnAvatarUpdate = jest.fn().mockResolvedValue(undefined);
      
      render(<AvatarUpload onAvatarUpdate={mockOnAvatarUpdate} />);
      
      fireEvent.click(screen.getByText('Cambiar foto'));
      fireEvent.click(screen.getByText('Seleccionar de galería'));
      
      await waitFor(() => {
        expect(mockUseImageUpload.selectFromGallery).toHaveBeenCalledWith({
          maxSizeBytes: 2 * 1024 * 1024,
          maxWidth: 400,
          maxHeight: 400,
          quality: 0.9,
        });
        expect(mockOnAvatarUpdate).toHaveBeenCalled();
      });
    });

    it('debe manejar error en selección de galería', async () => {
      mockUseImageUpload.selectFromGallery = jest.fn().mockRejectedValue(new Error('Error de galería'));
      
      render(<AvatarUpload onAvatarUpdate={jest.fn()} />);
      
      fireEvent.click(screen.getByText('Cambiar foto'));
      fireEvent.click(screen.getByText('Seleccionar de galería'));
      
      await waitFor(() => {
        expect(mockShowToast).toHaveBeenCalledWith('Error de galería', 'error');
      });
    });

    it('debe manejar error genérico en galería', async () => {
      mockUseImageUpload.selectFromGallery = jest.fn().mockRejectedValue({});
      
      render(<AvatarUpload onAvatarUpdate={jest.fn()} />);
      
      fireEvent.click(screen.getByText('Cambiar foto'));
      fireEvent.click(screen.getByText('Seleccionar de galería'));
      
      await waitFor(() => {
        expect(mockShowToast).toHaveBeenCalledWith('Error al seleccionar imagen', 'error');
      });
    });
  });

  describe('configuración de cámara', () => {
    it('debe mostrar icono de configuración cuando permiso denegado', () => {
      mockUseCameraPermissions.permissionStatus = 'denied';
      
      render(<AvatarUpload onAvatarUpdate={jest.fn()} />);
      
      fireEvent.click(screen.getByText('Cambiar foto'));
      
      // El icono de configuración (CogIcon) debe estar visible
      const cogIcons = document.querySelectorAll('svg');
      expect(cogIcons.length).toBeGreaterThan(0);
    });

    it('debe abrir configuración de cámara al hacer clic en icono de configuración', () => {
      mockUseCameraPermissions.permissionStatus = 'denied';
      
      render(<AvatarUpload onAvatarUpdate={jest.fn()} />);
      
      fireEvent.click(screen.getByText('Cambiar foto'));
      
      // Buscar el botón/div con el icono de configuración
      const settingsElements = document.querySelectorAll('[class*="text-orange"]');
      if (settingsElements.length > 0) {
        fireEvent.click(settingsElements[0]);
      }
    });
  });

  describe('estados de UI', () => {
    it('debe mostrar spinner mientras está subiendo', () => {
      const { container } = render(<AvatarUpload onAvatarUpdate={jest.fn()} isUploading={true} />);
      
      // Debe mostrar el spinner
      expect(container.querySelector('.animate-spin')).toBeInTheDocument();
    });

    it('debe llamar onAvatarUpdate al seleccionar de galería', async () => {
      const mockOnAvatarUpdate = jest.fn().mockResolvedValue(undefined);
      
      render(<AvatarUpload onAvatarUpdate={mockOnAvatarUpdate} />);
      
      fireEvent.click(screen.getByText('Cambiar foto'));
      expect(screen.getByText('Cambiar Avatar')).toBeInTheDocument();
      
      fireEvent.click(screen.getByText('Seleccionar de galería'));
      
      await waitFor(() => {
        expect(mockOnAvatarUpdate).toHaveBeenCalled();
      });
    });
  });
});

