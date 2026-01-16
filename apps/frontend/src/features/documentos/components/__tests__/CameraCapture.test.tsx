import React from 'react';
import { describe, it, expect, beforeAll, beforeEach, afterEach, jest } from '@jest/globals';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';

const mockGetUserMedia = jest.fn();

// Mock HTMLMediaElement methods not implemented by JSDOM
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

// Mock URL.createObjectURL not implemented by JSDOM
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
  }),
}));

describe('CameraCapture - Coverage', () => {
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
    setMediaDevices({ getUserMedia: mockGetUserMedia } as unknown as MediaDevices);
    mockGetUserMedia.mockImplementation(() => Promise.resolve({
      getTracks: () => [{ stop: jest.fn() }],
    }));
    // Clear mocks (mockClear preserves the mock implementation)
    mockPlay.mockClear();
    mockPause.mockClear();
    createObjectURLMock.mockClear();
    revokeObjectURLMock.mockClear();
  });

  afterEach(() => {
    jest.restoreAllMocks();
    // Re-apply the mocks after restoreAllMocks clears them
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

  it('debería importar el módulo sin errores', async () => {
    const module = await import('../CameraCapture');
    expect(module.CameraCapture).toBeDefined();
    expect(module.default).toBeDefined();
  });

  it('debería renderizar null cuando isOpen es false', () => {
    const { container } = render(
      <CameraCapture
        isOpen={false}
        onClose={() => undefined}
        onCapture={() => undefined}
      />
    );
    expect(container.firstChild).toBe(null);
  });

  it('muestra error si mediaDevices no existe', () => {
    setMediaDevices(undefined);

    render(
      <CameraCapture
        isOpen={true}
        onClose={() => undefined}
        onCapture={() => undefined}
      />
    );

    expect(screen.getByText(/no soporta el acceso a la cámara/i)).toBeTruthy();
  });

  it('muestra error cuando permisos están denegados', () => {
    permissionStatus = 'denied';

    render(
      <CameraCapture
        isOpen={true}
        onClose={() => undefined}
        onCapture={() => undefined}
      />
    );

    expect(screen.getByText(/Permisos de cámara denegados/i)).toBeTruthy();
  });

  it('muestra error cuando el dispositivo no soporta cámara', () => {
    permissionStatus = 'not-supported';

    render(
      <CameraCapture
        isOpen={true}
        onClose={() => undefined}
        onCapture={() => undefined}
      />
    );

    expect(screen.getByText(/no soporta el acceso a la cámara/i)).toBeTruthy();
  });

  it('muestra error si el permiso solicitado es rechazado', async () => {
    permissionStatus = 'prompt';
    requestPermissionMock.mockImplementation(() => Promise.resolve('denied'));

    render(
      <CameraCapture
        isOpen={true}
        onClose={() => undefined}
        onCapture={() => undefined}
      />
    );

    expect(await screen.findByText(/Se requieren permisos de cámara/i)).toBeTruthy();
  });

  it('permite capturar y quitar una foto', async () => {
    const onCapture = jest.fn();
    const onClose = jest.fn();

    jest.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
      drawImage: jest.fn(),
    } as unknown as CanvasRenderingContext2D);
    jest.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation((callback: BlobCallback | null) => {
      if (callback) {
        callback(new Blob(['img'], { type: 'image/jpeg' }));
      }
      return null;
    });

    render(
      <CameraCapture
        isOpen={true}
        onClose={onClose}
        onCapture={onCapture}
      />
    );

    await act(async () => {
      fireEvent.click(screen.getByText('Tomar foto'));
    });

    expect(await screen.findByText(/Fotos capturadas: 1/i)).toBeTruthy();

    await act(async () => {
      fireEvent.click(screen.getByText('Quitar'));
    });

    await waitFor(() => {
      expect(screen.queryByText(/Fotos capturadas: 1/i)).toBeNull();
    });
  });

  it('usa las fotos capturadas', async () => {
    const onCapture = jest.fn();
    const onClose = jest.fn();

    jest.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
      drawImage: jest.fn(),
    } as unknown as CanvasRenderingContext2D);
    jest.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation((callback: BlobCallback | null) => {
      if (callback) {
        callback(new Blob(['img'], { type: 'image/jpeg' }));
      }
      return null;
    });

    render(
      <CameraCapture
        isOpen={true}
        onClose={onClose}
        onCapture={onCapture}
      />
    );

    await act(async () => {
      fireEvent.click(screen.getByText('Tomar foto'));
    });

    await screen.findByText(/Fotos capturadas: 1/i);

    await act(async () => {
      fireEvent.click(screen.getByText('Usar fotos'));
    });

    expect(onCapture).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });
});
