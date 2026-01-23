/**
 * Gap Coverage Tests para CameraCapture
 *
 * Propósito: Cubrir branches y funciones no cubiertas en los tests existentes
 *
 * Cobertura actual: 67.44% statements, 63.04% branches
 * Objetivo: >93% statements, >93% branches
 */
import React from 'react';
import { describe, it, expect, beforeAll, beforeEach, afterEach, jest } from '@jest/globals';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';

// Mock HTMLMediaElement methods
const mockPlay = jest.fn().mockImplementation(() => Promise.resolve(undefined));
const mockPause = jest.fn();

Object.defineProperty(HTMLMediaElement.prototype, 'pause', {
  writable: true,
  value: mockPause,
});

Object.defineProperty(HTMLMediaElement.prototype, 'play', {
  writable: true,
  value: mockPlay,
});

// Mock URL.createObjectURL
const createObjectURLMock = jest.fn(() => 'mock blob:url');
const revokeObjectURLMock = jest.fn();

Object.defineProperty(global.URL, 'createObjectURL', {
  writable: true,
  value: createObjectURLMock,
});

Object.defineProperty(global.URL, 'revokeObjectURL', {
  writable: true,
  value: revokeObjectURLMock,
});

const setMediaDevices = (value?: MediaDevices) => {
  Object.defineProperty(global.navigator, 'mediaDevices', {
    writable: true,
    value,
  });
};

let permissionStatus: 'granted' | 'denied' | 'prompt' | 'not-supported' = 'granted';
const requestPermissionMock = jest.fn();

jest.mock('../../../../hooks/useCameraPermissions', () => ({
  useCameraPermissions: () => ({
    permissionStatus,
    requestPermission: requestPermissionMock,
    checkPermission: jest.fn(() => Promise.resolve(permissionStatus)),
    openCameraSettings: jest.fn(),
    isLoading: false,
  }),
}));

describe('CameraCapture - Gap Coverage', () => {
  let CameraCapture: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onCapture: (files: File[]) => void;
    title?: string;
  }>;

  beforeAll(async () => {
    const module = await import('../CameraCapture');
    CameraCapture = module.CameraCapture || module.default;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    permissionStatus = 'granted';
    requestPermissionMock.mockImplementation(() => Promise.resolve('granted'));
    setMediaDevices({ getUserMedia: jest.fn() } as unknown as MediaDevices);
    mockPlay.mockClear();
    mockPause.mockClear();
    createObjectURLMock.mockClear();
    revokeObjectURLMock.mockClear();
  });

  afterEach(() => {
    jest.restoreAllMocks();
    // Re-apply mocks after restoreAllMocks
    Object.defineProperty(HTMLMediaElement.prototype, 'pause', {
      writable: true,
      value: mockPause,
    });
    Object.defineProperty(HTMLMediaElement.prototype, 'play', {
      writable: true,
      value: mockPlay,
    });
    Object.defineProperty(global.URL, 'createObjectURL', {
      writable: true,
      value: createObjectURLMock,
    });
    Object.defineProperty(global.URL, 'revokeObjectURL', {
      writable: true,
      value: revokeObjectURLMock,
    });
  });

  describe('Manejo de errores de getUserMedia', () => {
    const mockGetUserMediaWithError = (errorName: string) => {
      const error = new Error('Camera error') as Error & { name?: string };
      error.name = errorName;
      return jest.fn().mockRejectedValue(error);
    };

    it('muestra error para NotAllowedError', async () => {
      const getUserMediaMock = mockGetUserMediaWithError('NotAllowedError');
      setMediaDevices({ getUserMedia: getUserMediaMock } as unknown as MediaDevices);

      render(
        <CameraCapture
          isOpen={true}
          onClose={() => undefined}
          onCapture={() => undefined}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/Permisos de cámara denegados/i)).toBeTruthy();
      });
    });

    it('muestra error para NotFoundError', async () => {
      const getUserMediaMock = mockGetUserMediaWithError('NotFoundError');
      setMediaDevices({ getUserMedia: getUserMediaMock } as unknown as MediaDevices);

      render(
        <CameraCapture
          isOpen={true}
          onClose={() => undefined}
          onCapture={() => undefined}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/No se encontró ninguna cámara/i)).toBeTruthy();
      });
    });

    it('muestra error para NotReadableError', async () => {
      const getUserMediaMock = mockGetUserMediaWithError('NotReadableError');
      setMediaDevices({ getUserMedia: getUserMediaMock } as unknown as MediaDevices);

      render(
        <CameraCapture
          isOpen={true}
          onClose={() => undefined}
          onCapture={() => undefined}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/La cámara está siendo usada/i)).toBeTruthy();
      });
    });

    it('muestra error para OverconstrainedError', async () => {
      const getUserMediaMock = mockGetUserMediaWithError('OverconstrainedError');
      setMediaDevices({ getUserMedia: getUserMediaMock } as unknown as MediaDevices);

      render(
        <CameraCapture
          isOpen={true}
          onClose={() => undefined}
          onCapture={() => undefined}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/configuración de cámara solicitada no está disponible/i)).toBeTruthy();
      });
    });

    it('muestra error para SecurityError', async () => {
      const getUserMediaMock = mockGetUserMediaWithError('SecurityError');
      setMediaDevices({ getUserMedia: getUserMediaMock } as unknown as MediaDevices);

      render(
        <CameraCapture
          isOpen={true}
          onClose={() => undefined}
          onCapture={() => undefined}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/Acceso a la cámara bloqueado por razones de seguridad/i)).toBeTruthy();
      });
    });

    it('muestra error genérico para errores no reconocidos', async () => {
      const getUserMediaMock = jest.fn().mockRejectedValue(new Error('Unknown error'));
      setMediaDevices({ getUserMedia: getUserMediaMock } as unknown as MediaDevices);

      render(
        <CameraCapture
          isOpen={true}
          onClose={() => undefined}
          onCapture={() => undefined}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/No se pudo acceder a la cámara/i)).toBeTruthy();
      });
    });
  });

  describe('Función removeAt - Gestión de múltiples fotos', () => {
    it('permite quitar la primera foto de múltiples capturas', async () => {
      const onCapture = jest.fn();

      // Mock para capturar múltiples fotos
      let toBlobCallback: BlobCallback | null = null;
      jest.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
        drawImage: jest.fn(),
      } as unknown as CanvasRenderingContext2D);
      jest.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation((callback) => {
        toBlobCallback = callback;
        return null;
      });

      const getUserMediaMock = jest.fn().mockResolvedValue({
        getTracks: () => [{ stop: jest.fn() }],
      } as unknown as MediaStream);
      setMediaDevices({ getUserMedia: getUserMediaMock } as unknown as MediaDevices);

      render(
        <CameraCapture
          isOpen={true}
          onClose={() => undefined}
          onCapture={onCapture}
        />
      );

      // Capturar primera foto
      await act(async () => {
        if (toBlobCallback) {
          toBlobCallback(new Blob(['img1'], { type: 'image/jpeg' }));
        }
        fireEvent.click(screen.getByText('Tomar foto'));
      });

      await waitFor(() => {
        expect(screen.getByText(/Fotos capturadas: 1/i)).toBeTruthy();
      });

      // Capturar segunda foto
      await act(async () => {
        if (toBlobCallback) {
          toBlobCallback(new Blob(['img2'], { type: 'image/jpeg' }));
        }
        fireEvent.click(screen.getByText('Tomar foto'));
      });

      await waitFor(() => {
        expect(screen.getByText(/Fotos capturadas: 2/i)).toBeTruthy();
      });

      // Quitar primera foto
      await act(async () => {
        const buttons = screen.getAllByText('Quitar');
        fireEvent.click(buttons[0]);
      });

      await waitFor(() => {
        expect(screen.getByText(/Fotos capturadas: 1/i)).toBeTruthy();
      });
    });

    it('permite quitar la última foto de múltiples capturas', async () => {
      const onCapture = jest.fn();

      let toBlobCallback: BlobCallback | null = null;
      jest.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
        drawImage: jest.fn(),
      } as unknown as CanvasRenderingContext2D);
      jest.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation((callback) => {
        toBlobCallback = callback;
        return null;
      });

      const getUserMediaMock = jest.fn().mockResolvedValue({
        getTracks: () => [{ stop: jest.fn() }],
      } as unknown as MediaStream);
      setMediaDevices({ getUserMedia: getUserMediaMock } as unknown as MediaDevices);

      render(
        <CameraCapture
          isOpen={true}
          onClose={() => undefined}
          onCapture={onCapture}
        />
      );

      // Capturar dos fotos
      await act(async () => {
        if (toBlobCallback) {
          toBlobCallback(new Blob(['img1'], { type: 'image/jpeg' }));
        }
        fireEvent.click(screen.getByText('Tomar foto'));
      });

      await act(async () => {
        if (toBlobCallback) {
          toBlobCallback(new Blob(['img2'], { type: 'image/jpeg' }));
        }
        fireEvent.click(screen.getByText('Tomar foto'));
      });

      await waitFor(() => {
        expect(screen.getByText(/Fotos capturadas: 2/i)).toBeTruthy();
      });

      // Quitar última foto
      await act(async () => {
        const buttons = screen.getAllByText('Quitar');
        fireEvent.click(buttons[1]);
      });

      await waitFor(() => {
        expect(screen.getByText(/Fotos capturadas: 1/i)).toBeTruthy();
      });
    });

    it('permite quitar todas las fotos una por una', async () => {
      const onCapture = jest.fn();

      let toBlobCallback: BlobCallback | null = null;
      jest.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
        drawImage: jest.fn(),
      } as unknown as CanvasRenderingContext2D);
      jest.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation((callback) => {
        toBlobCallback = callback;
        return null;
      });

      const getUserMediaMock = jest.fn().mockResolvedValue({
        getTracks: () => [{ stop: jest.fn() }],
      } as unknown as MediaStream);
      setMediaDevices({ getUserMedia: getUserMediaMock } as unknown as MediaDevices);

      render(
        <CameraCapture
          isOpen={true}
          onClose={() => undefined}
          onCapture={onCapture}
        />
      );

      // Capturar tres fotos
      for (let i = 0; i < 3; i++) {
        await act(async () => {
          if (toBlobCallback) {
            toBlobCallback(new Blob([`img${i}`], { type: 'image/jpeg' }));
          }
          fireEvent.click(screen.getByText('Tomar foto'));
        });
      }

      await waitFor(() => {
        expect(screen.getByText(/Fotos capturadas: 3/i)).toBeTruthy();
      });

      // Quitar todas las fotos
      while (screen.queryAllByText('Quitar').length > 0) {
        await act(async () => {
          const button = screen.queryAllByText('Quitar')[0];
          if (button) fireEvent.click(button);
        });
      }

      await waitFor(() => {
        expect(screen.queryByText(/Fotos capturadas:/i)).toBeNull();
      });
    });
  });

  describe('Callback onCapture con múltiples archivos', () => {
    it('llama a onCapture con todas las fotos capturadas', async () => {
      const onCapture = jest.fn();
      const onClose = jest.fn();

      let toBlobCallback: BlobCallback | null = null;
      jest.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
        drawImage: jest.fn(),
      } as unknown as CanvasRenderingContext2D);
      jest.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation((callback) => {
        toBlobCallback = callback;
        return null;
      });

      const getUserMediaMock = jest.fn().mockResolvedValue({
        getTracks: () => [{ stop: jest.fn() }],
      } as unknown as MediaStream);
      setMediaDevices({ getUserMedia: getUserMediaMock } as unknown as MediaDevices);

      render(
        <CameraCapture
          isOpen={true}
          onClose={onClose}
          onCapture={onCapture}
        />
      );

      // Capturar tres fotos
      for (let i = 0; i < 3; i++) {
        await act(async () => {
          if (toBlobCallback) {
            toBlobCallback(new Blob([`img${i}`], { type: 'image/jpeg' }));
          }
          fireEvent.click(screen.getByText('Tomar foto'));
        });
      }

      await waitFor(() => {
        expect(screen.getByText(/Fotos capturadas: 3/i)).toBeTruthy();
      });

      // Usar fotos
      await act(async () => {
        fireEvent.click(screen.getByText('Usar fotos'));
      });

      expect(onCapture).toHaveBeenCalled();
      expect(onClose).toHaveBeenCalled();

      // Verificar que se pasaron 3 archivos
      const capturedFiles = onCapture.mock.calls[0][0];
      expect(capturedFiles).toHaveLength(3);
      expect(capturedFiles[0]).toBeInstanceOf(File);
    });
  });

  describe('Título personalizado', () => {
    it('muestra el título por defecto cuando no se proporciona', async () => {
      const getUserMediaMock = jest.fn().mockResolvedValue({
        getTracks: () => [{ stop: jest.fn() }],
      } as unknown as MediaStream);
      setMediaDevices({ getUserMedia: getUserMediaMock } as unknown as MediaDevices);

      render(
        <CameraCapture
          isOpen={true}
          onClose={() => undefined}
          onCapture={() => undefined}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Capturar fotos')).toBeTruthy();
      });
    });

    it('muestra el título personalizado cuando se proporciona', async () => {
      const getUserMediaMock = jest.fn().mockResolvedValue({
        getTracks: () => [{ stop: jest.fn() }],
      } as unknown as MediaStream);
      setMediaDevices({ getUserMedia: getUserMediaMock } as unknown as MediaDevices);

      render(
        <CameraCapture
          isOpen={true}
          onClose={() => undefined}
          onCapture={() => undefined}
          title="Documentar DNI"
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Documentar DNI')).toBeTruthy();
      });
    });
  });

  describe('Limpieza al cerrar', () => {
    it('detiene el stream de video al cerrar', async () => {
      const stopTrack = jest.fn();
      const getUserMediaMock = jest.fn().mockResolvedValue({
        getTracks: () => [{ stop: stopTrack }],
      } as unknown as MediaStream);
      setMediaDevices({ getUserMedia: getUserMediaMock } as unknown as MediaDevices);

      const { unmount } = render(
        <CameraCapture
          isOpen={true}
          onClose={() => undefined}
          onCapture={() => undefined}
        />
      );

      // Esperar a que el componente inicie
      await waitFor(() => {
        expect(getUserMediaMock).toHaveBeenCalled();
      });

      // Cerrar el componente
      unmount();

      // Verificar que se detuvieron los tracks
      expect(stopTrack).toHaveBeenCalled();
    });

    it('pausa el video al cerrar', async () => {
      const getUserMediaMock = jest.fn().mockResolvedValue({
        getTracks: () => [{ stop: jest.fn() }],
      } as unknown as MediaStream);
      setMediaDevices({ getUserMedia: getUserMediaMock } as unknown as MediaDevices);

      const { unmount } = render(
        <CameraCapture
          isOpen={true}
          onClose={() => undefined}
          onCapture={() => undefined}
        />
      );

      // Esperar a que el video inicie
      await waitFor(() => {
        expect(getUserMediaMock).toHaveBeenCalled();
      });

      // Limpiar mock de pause
      mockPause.mockClear();

      // Cerrar el componente
      unmount();

      // Verificar que se llamó a pause
      expect(mockPause).toHaveBeenCalled();
    });

    it('limpia las fotos capturadas al cerrar y reabrir', async () => {
      const onCapture = jest.fn();

      let toBlobCallback: BlobCallback | null = null;
      jest.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
        drawImage: jest.fn(),
      } as unknown as CanvasRenderingContext2D);
      jest.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation((callback) => {
        toBlobCallback = callback;
        return null;
      });

      const getUserMediaMock = jest.fn().mockResolvedValue({
        getTracks: () => [{ stop: jest.fn() }],
      } as unknown as MediaStream);
      setMediaDevices({ getUserMedia: getUserMediaMock } as unknown as MediaDevices);

      const { rerender } = render(
        <CameraCapture
          isOpen={true}
          onClose={() => undefined}
          onCapture={onCapture}
        />
      );

      // Capturar una foto
      await act(async () => {
        if (toBlobCallback) {
          toBlobCallback(new Blob(['img'], { type: 'image/jpeg' }));
        }
        fireEvent.click(screen.getByText('Tomar foto'));
      });

      await waitFor(() => {
        expect(screen.getByText(/Fotos capturadas: 1/i)).toBeTruthy();
      });

      // Cerrar
      rerender(
        <CameraCapture
          isOpen={false}
          onClose={() => undefined}
          onCapture={onCapture}
        />
      );

      // Reabrir
      rerender(
        <CameraCapture
          isOpen={true}
          onClose={() => undefined}
          onCapture={onCapture}
        />
      );

      // Verificar que no hay fotos previas
      await waitFor(() => {
        expect(screen.queryByText(/Fotos capturadas:/i)).toBeNull();
      });
    });
  });

  describe('Botón Usar fotos - Estado disabled', () => {
    it('mantiene el botón Usar fotos deshabilitado cuando no hay fotos', async () => {
      const getUserMediaMock = jest.fn().mockResolvedValue({
        getTracks: () => [{ stop: jest.fn() }],
      } as unknown as MediaStream);
      setMediaDevices({ getUserMedia: getUserMediaMock } as unknown as MediaDevices);

      render(
        <CameraCapture
          isOpen={true}
          onClose={() => undefined}
          onCapture={() => undefined}
        />
      );

      await waitFor(() => {
        const usarFotosButton = screen.getByText('Usar fotos');
        expect(usarFotosButton).toBeDisabled();
      });
    });

    it('habilita el botón Usar fotos cuando hay fotos capturadas', async () => {
      const onCapture = jest.fn();

      let toBlobCallback: BlobCallback | null = null;
      jest.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
        drawImage: jest.fn(),
      } as unknown as CanvasRenderingContext2D);
      jest.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation((callback) => {
        toBlobCallback = callback;
        return null;
      });

      const getUserMediaMock = jest.fn().mockResolvedValue({
        getTracks: () => [{ stop: jest.fn() }],
      } as unknown as MediaStream);
      setMediaDevices({ getUserMedia: getUserMediaMock } as unknown as MediaDevices);

      render(
        <CameraCapture
          isOpen={true}
          onClose={() => undefined}
          onCapture={onCapture}
        />
      );

      await act(async () => {
        if (toBlobCallback) {
          toBlobCallback(new Blob(['img'], { type: 'image/jpeg' }));
        }
        fireEvent.click(screen.getByText('Tomar foto'));
      });

      await waitFor(() => {
        const usarFotosButton = screen.getByText('Usar fotos');
        expect(usarFotosButton).not.toBeDisabled();
      });
    });
  });

  describe('Permisos con estado prompt', () => {
    it('solicita permisos cuando el estado es prompt', async () => {
      permissionStatus = 'prompt';
      requestPermissionMock.mockImplementation(() => Promise.resolve('granted'));

      const getUserMediaMock = jest.fn().mockResolvedValue({
        getTracks: () => [{ stop: jest.fn() }],
      } as unknown as MediaStream);
      setMediaDevices({ getUserMedia: getUserMediaMock } as unknown as MediaDevices);

      render(
        <CameraCapture
          isOpen={true}
          onClose={() => undefined}
          onCapture={() => undefined}
        />
      );

      await waitFor(() => {
        expect(requestPermissionMock).toHaveBeenCalled();
        expect(getUserMediaMock).toHaveBeenCalled();
      });
    });

    it('muestra error cuando prompt es rechazado', async () => {
      permissionStatus = 'prompt';
      requestPermissionMock.mockImplementation(() => Promise.resolve('denied'));

      render(
        <CameraCapture
          isOpen={true}
          onClose={() => undefined}
          onCapture={() => undefined}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/Se requieren permisos de cámara/i)).toBeTruthy();
      });
    });
  });

  describe('Flujo completo de captura', () => {
    it('permite capturar múltiples fotos y usarlas', async () => {
      const onCapture = jest.fn();
      const onClose = jest.fn();

      let toBlobCallback: BlobCallback | null = null;
      jest.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
        drawImage: jest.fn(),
      } as unknown as CanvasRenderingContext2D);
      jest.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation((callback) => {
        toBlobCallback = callback;
        return null;
      });

      const getUserMediaMock = jest.fn().mockResolvedValue({
        getTracks: () => [{ stop: jest.fn() }],
      } as unknown as MediaStream);
      setMediaDevices({ getUserMedia: getUserMediaMock } as unknown as MediaDevices);

      render(
        <CameraCapture
          isOpen={true}
          onClose={onClose}
          onCapture={onCapture}
          title="Documentar Vehículo"
        />
      );

      // Verificar título personalizado
      expect(screen.getByText('Documentar Vehículo')).toBeTruthy();

      // Capturar 3 fotos
      for (let i = 0; i < 3; i++) {
        await act(async () => {
          if (toBlobCallback) {
            toBlobCallback(new Blob([`foto-${i}`], { type: 'image/jpeg' }));
          }
          fireEvent.click(screen.getByText('Tomar foto'));
        });
      }

      await waitFor(() => {
        expect(screen.getByText(/Fotos capturadas: 3/i)).toBeTruthy();
      });

      // Quitar la del medio
      await act(async () => {
        const buttons = screen.getAllByText('Quitar');
        fireEvent.click(buttons[1]);
      });

      await waitFor(() => {
        expect(screen.getByText(/Fotos capturadas: 2/i)).toBeTruthy();
      });

      // Usar las fotos restantes
      await act(async () => {
        fireEvent.click(screen.getByText('Usar fotos'));
      });

      expect(onCapture).toHaveBeenCalled();
      expect(onClose).toHaveBeenCalled();

      const capturedFiles = onCapture.mock.calls[0][0];
      expect(capturedFiles).toHaveLength(2);
    });
  });
});
