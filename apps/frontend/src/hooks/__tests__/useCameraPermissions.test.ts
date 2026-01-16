/**
 * Tests para useCameraPermissions hook
 * Nota: Este hook depende de APIs del navegador (navigator.mediaDevices, navigator.permissions)
 * que son difíciles de mockear completamente en Jest/JSDOM.
 * Estos tests verifican la estructura y comportamiento básico.
 */
import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useCameraPermissions, CameraPermissionStatus } from '../useCameraPermissions';

describe('useCameraPermissions', () => {
  const originalNavigator = global.navigator;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    // Restaurar navigator original
    Object.defineProperty(global, 'navigator', {
      value: originalNavigator,
      writable: true,
      configurable: true,
    });
  });

  describe('cuando camera API no está soportada', () => {
    beforeEach(() => {
      Object.defineProperty(global, 'navigator', {
        value: {
          mediaDevices: undefined,
        },
        writable: true,
        configurable: true,
      });
    });

    it('retorna estado not-supported', async () => {
      const { result } = renderHook(() => useCameraPermissions());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.permissionStatus).toBe('not-supported');
    });

    it('requestPermission retorna not-supported', async () => {
      const { result } = renderHook(() => useCameraPermissions());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let status: CameraPermissionStatus = 'prompt';
      await act(async () => {
        status = await result.current.requestPermission();
      });

      expect(status).toBe('not-supported');
    });
  });

  describe('cuando camera API está soportada', () => {
    const mockGetUserMedia = jest.fn();
    const mockPermissionsQuery = jest.fn();

    beforeEach(() => {
      Object.defineProperty(global, 'navigator', {
        value: {
          mediaDevices: {
            getUserMedia: mockGetUserMedia,
          },
          permissions: {
            query: mockPermissionsQuery,
          },
        },
        writable: true,
        configurable: true,
      });
    });

    it('checkPermission retorna granted cuando permissions API indica granted', async () => {
      mockPermissionsQuery.mockResolvedValue({ state: 'granted' });

      const { result } = renderHook(() => useCameraPermissions());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.permissionStatus).toBe('granted');
    });

    it('checkPermission retorna denied cuando permissions API indica denied', async () => {
      mockPermissionsQuery.mockResolvedValue({ state: 'denied' });

      const { result } = renderHook(() => useCameraPermissions());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.permissionStatus).toBe('denied');
    });

    it('checkPermission retorna prompt cuando permissions API indica prompt', async () => {
      mockPermissionsQuery.mockResolvedValue({ state: 'prompt' });

      const { result } = renderHook(() => useCameraPermissions());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.permissionStatus).toBe('prompt');
    });

    it('requestPermission retorna granted cuando getUserMedia tiene éxito', async () => {
      mockPermissionsQuery.mockResolvedValue({ state: 'prompt' });
      
      const mockTrack = { stop: jest.fn() };
      const mockStream = { getTracks: () => [mockTrack] };
      mockGetUserMedia.mockResolvedValue(mockStream);

      const { result } = renderHook(() => useCameraPermissions());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let status: CameraPermissionStatus = 'prompt';
      await act(async () => {
        status = await result.current.requestPermission();
      });

      expect(status).toBe('granted');
      expect(result.current.permissionStatus).toBe('granted');
      expect(mockTrack.stop).toHaveBeenCalled();
    });

    it('requestPermission retorna denied cuando getUserMedia falla con NotAllowedError', async () => {
      mockPermissionsQuery.mockResolvedValue({ state: 'prompt' });
      
      const error = new Error('Permission denied');
      (error as any).name = 'NotAllowedError';
      mockGetUserMedia.mockRejectedValue(error);

      const { result } = renderHook(() => useCameraPermissions());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let status: CameraPermissionStatus = 'prompt';
      await act(async () => {
        status = await result.current.requestPermission();
      });

      expect(status).toBe('denied');
      expect(result.current.permissionStatus).toBe('denied');
    });

    it('requestPermission retorna not-supported para otros errores', async () => {
      mockPermissionsQuery.mockResolvedValue({ state: 'prompt' });
      
      const error = new Error('No camera found');
      (error as any).name = 'NotFoundError';
      mockGetUserMedia.mockRejectedValue(error);

      const { result } = renderHook(() => useCameraPermissions());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let status: CameraPermissionStatus = 'prompt';
      await act(async () => {
        status = await result.current.requestPermission();
      });

      expect(status).toBe('not-supported');
    });
  });

  describe('cuando permissions API no está disponible', () => {
    const mockGetUserMedia = jest.fn();

    beforeEach(() => {
      Object.defineProperty(global, 'navigator', {
        value: {
          mediaDevices: {
            getUserMedia: mockGetUserMedia,
          },
          permissions: undefined,
        },
        writable: true,
        configurable: true,
      });
    });

    it('checkPermission usa fallback con getUserMedia y retorna granted', async () => {
      const mockTrack = { stop: jest.fn() };
      const mockStream = { getTracks: () => [mockTrack] };
      mockGetUserMedia.mockResolvedValue(mockStream);

      const { result } = renderHook(() => useCameraPermissions());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.permissionStatus).toBe('granted');
    });

    it('checkPermission detecta denied via fallback', async () => {
      const error = new Error('Permission denied');
      (error as any).name = 'NotAllowedError';
      mockGetUserMedia.mockRejectedValue(error);

      const { result } = renderHook(() => useCameraPermissions());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.permissionStatus).toBe('denied');
    });

    it('checkPermission retorna prompt para errores desconocidos', async () => {
      mockGetUserMedia.mockRejectedValue(new Error('Unknown error'));

      const { result } = renderHook(() => useCameraPermissions());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.permissionStatus).toBe('prompt');
    });
  });

  describe('openCameraSettings', () => {
    it('no lanza error al llamar openCameraSettings', async () => {
      const mockGetUserMedia = jest.fn();
      const mockPermissionsQuery = jest.fn().mockResolvedValue({ state: 'prompt' });

      Object.defineProperty(global, 'navigator', {
        value: {
          mediaDevices: { getUserMedia: mockGetUserMedia },
          permissions: { query: mockPermissionsQuery },
        },
        writable: true,
        configurable: true,
      });

      const { result } = renderHook(() => useCameraPermissions());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // No debe lanzar error
      expect(() => {
        act(() => {
          result.current.openCameraSettings();
        });
      }).not.toThrow();
    });
  });
});
