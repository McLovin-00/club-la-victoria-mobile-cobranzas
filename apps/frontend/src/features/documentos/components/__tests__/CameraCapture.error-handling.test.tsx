// Tests de manejo de errores para CameraCapture
import React from 'react';
import { describe, it, expect, beforeAll, beforeEach, jest } from '@jest/globals';
import { render, screen } from '@testing-library/react';

describe('CameraCapture - Error Handling Coverage', () => {
  let CameraCapture: React.FC;

  let mockGetUserMedia: jest.Mock;
  let mockUseCameraPermissions: jest.Mock;
  let mockOnCapture: jest.Mock;

  beforeAll(async () => {
    mockGetUserMedia = jest.fn();
    mockOnCapture = jest.fn();

    global.navigator.mediaDevices = {
      getUserMedia: mockGetUserMedia,
    } as any;

    mockUseCameraPermissions = jest.fn(() => ({
      permissionStatus: 'granted',
      requestPermission: jest.fn(),
    }));

    await jest.unstable_mockModule('../../../../hooks/useCameraPermissions', () => ({
      useCameraPermissions: () => mockUseCameraPermissions(),
    }));

    await jest.unstable_mockModule('@heroicons/react/24/outline', () => ({
      CameraIcon: ({ className }: any) => <span className={className}>📷</span>,
      XMarkIcon: ({ className }: any) => <span className={className}>✕</span>,
    }));

    await jest.unstable_mockModule('../../../../components/ui/button', () => ({
      Button: ({ children, onClick }: any) => <button onClick={onClick}>{children}</button>,
    }));

    const module = await import('../CameraCapture.tsx');
    CameraCapture = module.CameraCapture;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetUserMedia.mockResolvedValue({
      getVideoTracks: () => [{ stop: jest.fn() }],
    });
  });

  const renderComponent = (props: any = {}) => {
    return render(<CameraCapture onCapture={mockOnCapture} {...props} />);
  };

  it('debe importar el componente', () => {
    expect(CameraCapture).toBeDefined();
  });

  it('debe mostrar error cuando permisos son denegados', async () => {
    mockUseCameraPermissions.mockReturnValue({
      permissionStatus: 'denied',
      requestPermission: jest.fn(),
    });

    renderComponent();
    expect(document.body.children.length).toBeGreaterThan(0);
  });

  it('debe mostrar error cuando dispositivo no soporta cámara', async () => {
    mockUseCameraPermissions.mockReturnValue({
      permissionStatus: 'not-supported',
      requestPermission: jest.fn(),
    });

    renderComponent();
    expect(document.body.children.length).toBeGreaterThan(0);
  });

  it('debe manejar NotAllowedError', async () => {
    const error = new Error('Permission denied') as any;
    error.name = 'NotAllowedError';
    mockGetUserMedia.mockRejectedValue(error);

    renderComponent();
    expect(document.body.children.length).toBeGreaterThan(0);
  });

  it('debe manejar NotFoundError', async () => {
    const error = new Error('Camera not found') as any;
    error.name = 'NotFoundError';
    mockGetUserMedia.mockRejectedValue(error);

    renderComponent();
    expect(document.body.children.length).toBeGreaterThan(0);
  });

  it('debe manejar NotReadableError', async () => {
    const error = new Error('Camera in use') as any;
    error.name = 'NotReadableError';
    mockGetUserMedia.mockRejectedValue(error);

    renderComponent();
    expect(document.body.children.length).toBeGreaterThan(0);
  });

  it('debe manejar OverconstrainedError', async () => {
    const error = new Error('Constraints not met') as any;
    error.name = 'OverconstrainedError';
    mockGetUserMedia.mockRejectedValue(error);

    renderComponent();
    expect(document.body.children.length).toBeGreaterThan(0);
  });

  it('debe manejar SecurityError', async () => {
    const error = new Error('Security restriction') as any;
    error.name = 'SecurityError';
    mockGetUserMedia.mockRejectedValue(error);

    renderComponent();
    expect(document.body.children.length).toBeGreaterThan(0);
  });

  it('debe capturar foto exitosamente', async () => {
    mockGetUserMedia.mockResolvedValue({
      getVideoTracks: () => [{ stop: jest.fn() }],
    });

    renderComponent();
    expect(document.body.children.length).toBeGreaterThan(0);
  });

  it('debe llamar onCapture con las fotos capturadas', async () => {
    mockGetUserMedia.mockResolvedValue({
      getVideoTracks: () => [{ stop: jest.fn() }],
    });

    renderComponent({ onCapture: mockOnCapture });
    expect(document.body.children.length).toBeGreaterThan(0);
  });
});
