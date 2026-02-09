/**
 * Tests completos para useImageUpload hook
 * Cubre compresión de imagen, captura de cámara y selección de galería
 */
import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { renderHook, act } from '@testing-library/react';

describe('useImageUpload - full coverage tests', () => {
  const originalFileReader = (globalThis as any).FileReader;
  const originalImage = (globalThis as any).Image;
  const originalCreateObjectURL = URL.createObjectURL;
  const originalRevokeObjectURL = URL.revokeObjectURL;

  beforeEach(() => {
    jest.restoreAllMocks();

    // Mock URL.createObjectURL y revokeObjectURL
    (URL as any).createObjectURL = jest.fn(() => 'blob:mock');
    (URL as any).revokeObjectURL = jest.fn();

    // Mock FileReader
    class MockFileReader {
      public onload: ((e: any) => void) | null = null;
      public onerror: (() => void) | null = null;
      public readAsDataURL(_file: File) {
        this.onload?.({ target: { result: 'data:image/png;base64,MOCK' } });
      }
    }
    (globalThis as any).FileReader = MockFileReader as any;

    // Mock Image para dimensiones
    class MockImage {
      public onload: (() => void) | null = null;
      public onerror: (() => void) | null = null;
      public width = 640;
      public height = 480;
      set src(_v: string) {
        this.onload?.();
      }
    }
    (globalThis as any).Image = MockImage as any;
  });

  afterEach(() => {
    (globalThis as any).FileReader = originalFileReader;
    (globalThis as any).Image = originalImage;
    (URL as any).createObjectURL = originalCreateObjectURL;
    (URL as any).revokeObjectURL = originalRevokeObjectURL;
  });

  describe('compressImage - full path', () => {
    it('debe retornar el mismo archivo si está dentro del límite de tamaño', async () => {
      const { useImageUpload } = await import('../useImageUpload');
      const { result } = renderHook(() => useImageUpload());

      const smallFile = new File(['x'], 'small.png', { type: 'image/png' });
      Object.defineProperty(smallFile, 'size', { value: 1000 }); // 1KB

      const compressed = await result.current.compressImage(smallFile, { 
        maxSizeBytes: 5 * 1024 * 1024 
      });

      expect(compressed).toBe(smallFile);
    });

    it('debe manejar opciones de compresión personalizadas', async () => {
      const { useImageUpload } = await import('../useImageUpload');
      const { result } = renderHook(() => useImageUpload());

      const smallFile = new File(['x'], 'small.png', { type: 'image/png' });
      Object.defineProperty(smallFile, 'size', { value: 500 });

      // Con opciones personalizadas pero archivo pequeño, no comprime
      const compressed = await result.current.compressImage(smallFile, {
        maxSizeBytes: 1000,
        maxWidth: 800,
        maxHeight: 600,
        quality: 0.7,
      });

      expect(compressed).toBe(smallFile);
    });
  });

  describe('captureFromCamera - error handling', () => {
    const originalMediaDevices = navigator.mediaDevices;

    afterEach(() => {
      Object.defineProperty(navigator, 'mediaDevices', {
        value: originalMediaDevices,
        writable: true,
        configurable: true,
      });
    });

    it('debe manejar NotAllowedError correctamente', async () => {
      const notAllowedError = new Error('Permission denied');
      notAllowedError.name = 'NotAllowedError';

      Object.defineProperty(navigator, 'mediaDevices', {
        value: {
          getUserMedia: jest.fn().mockRejectedValue(notAllowedError),
        },
        writable: true,
        configurable: true,
      });

      const { useImageUpload } = await import('../useImageUpload');
      const { result } = renderHook(() => useImageUpload());

      await expect(result.current.captureFromCamera()).rejects.toThrow(/Permiso de cámara denegado/i);
    });

    it('debe manejar NotFoundError correctamente', async () => {
      const notFoundError = new Error('Camera not found');
      notFoundError.name = 'NotFoundError';

      Object.defineProperty(navigator, 'mediaDevices', {
        value: {
          getUserMedia: jest.fn().mockRejectedValue(notFoundError),
        },
        writable: true,
        configurable: true,
      });

      const { useImageUpload } = await import('../useImageUpload');
      const { result } = renderHook(() => useImageUpload());

      await expect(result.current.captureFromCamera()).rejects.toThrow(/No se encontró ninguna cámara/i);
    });

    it('debe manejar NotReadableError correctamente', async () => {
      const notReadableError = new Error('Camera in use');
      notReadableError.name = 'NotReadableError';

      Object.defineProperty(navigator, 'mediaDevices', {
        value: {
          getUserMedia: jest.fn().mockRejectedValue(notReadableError),
        },
        writable: true,
        configurable: true,
      });

      const { useImageUpload } = await import('../useImageUpload');
      const { result } = renderHook(() => useImageUpload());

      await expect(result.current.captureFromCamera()).rejects.toThrow(/siendo usada por otra aplicación/i);
    });

    it('debe manejar OverconstrainedError correctamente', async () => {
      const overconstrainedError = new Error('Constraints not satisfied');
      overconstrainedError.name = 'OverconstrainedError';

      Object.defineProperty(navigator, 'mediaDevices', {
        value: {
          getUserMedia: jest.fn().mockRejectedValue(overconstrainedError),
        },
        writable: true,
        configurable: true,
      });

      const { useImageUpload } = await import('../useImageUpload');
      const { result } = renderHook(() => useImageUpload());

      await expect(result.current.captureFromCamera()).rejects.toThrow(/configuración de cámara/i);
    });

    it('debe manejar SecurityError correctamente', async () => {
      const securityError = new Error('Security issue');
      securityError.name = 'SecurityError';

      Object.defineProperty(navigator, 'mediaDevices', {
        value: {
          getUserMedia: jest.fn().mockRejectedValue(securityError),
        },
        writable: true,
        configurable: true,
      });

      const { useImageUpload } = await import('../useImageUpload');
      const { result } = renderHook(() => useImageUpload());

      await expect(result.current.captureFromCamera()).rejects.toThrow(/bloqueado por razones de seguridad/i);
    });

    it('debe manejar errores genéricos', async () => {
      const genericError = new Error('Unknown error');

      Object.defineProperty(navigator, 'mediaDevices', {
        value: {
          getUserMedia: jest.fn().mockRejectedValue(genericError),
        },
        writable: true,
        configurable: true,
      });

      const { useImageUpload } = await import('../useImageUpload');
      const { result } = renderHook(() => useImageUpload());

      await expect(result.current.captureFromCamera()).rejects.toThrow(/Error al acceder a la cámara/i);
    });
  });

  describe('getImageDimensions', () => {
    it('debe obtener dimensiones de imagen correctamente', async () => {
      const { useImageUpload } = await import('../useImageUpload');
      const { result } = renderHook(() => useImageUpload());

      const file = new File(['x'], 'test.png', { type: 'image/png' });
      Object.defineProperty(file, 'size', { value: 1000 });

      const uploadResult = await result.current.uploadImage(file);
      
      expect(uploadResult.width).toBe(640);
      expect(uploadResult.height).toBe(480);
    });

    it('debe manejar error de carga de imagen', async () => {
      class FailingImage {
        public onload: (() => void) | null = null;
        public onerror: (() => void) | null = null;
        set src(_v: string) { setTimeout(() => this.onerror?.(), 0); }
      }
      (globalThis as any).Image = FailingImage as any;

      const { useImageUpload } = await import('../useImageUpload');
      const { result } = renderHook(() => useImageUpload());

      const file = new File(['x'], 'test.png', { type: 'image/png' });
      Object.defineProperty(file, 'size', { value: 1000 });

      await expect(result.current.uploadImage(file)).rejects.toThrow(/cargar la imagen/i);
    });
  });

  describe('createPreview - error handling', () => {
    it('debe manejar error cuando FileReader falla', async () => {
      class FailingFileReader {
        public onload: ((e: any) => void) | null = null;
        public onerror: (() => void) | null = null;
        public readAsDataURL(_file: File) {
          setTimeout(() => this.onerror?.(), 0);
        }
      }
      (globalThis as any).FileReader = FailingFileReader as any;

      const { useImageUpload } = await import('../useImageUpload');
      const { result } = renderHook(() => useImageUpload());

      const file = new File(['x'], 'test.png', { type: 'image/png' });

      await expect(result.current.createPreview(file)).rejects.toThrow(/leer el archivo/i);
    });

    it('debe manejar resultado null de FileReader', async () => {
      class NullResultFileReader {
        public onload: ((e: any) => void) | null = null;
        public onerror: (() => void) | null = null;
        public readAsDataURL(_file: File) {
          setTimeout(() => this.onload?.({ target: { result: null } }), 0);
        }
      }
      (globalThis as any).FileReader = NullResultFileReader as any;

      const { useImageUpload } = await import('../useImageUpload');
      const { result } = renderHook(() => useImageUpload());

      const file = new File(['x'], 'test.png', { type: 'image/png' });

      await expect(result.current.createPreview(file)).rejects.toThrow(/crear vista previa/i);
    });
  });

  describe('selectFromGallery - file selection', () => {
    it('debe procesar archivo seleccionado correctamente', async () => {
      const { useImageUpload } = await import('../useImageUpload');
      const { result } = renderHook(() => useImageUpload());

      const validFile = new File(['x'], 'photo.png', { type: 'image/png' });
      Object.defineProperty(validFile, 'size', { value: 1000 });

      const promise = result.current.selectFromGallery();

      // Simular selección de archivo
      const input = document.querySelector('input[type="file"]') as HTMLInputElement;
      expect(input).toBeInTheDocument();

      await act(async () => {
        const evt = new Event('change');
        Object.defineProperty(evt, 'target', { value: { files: [validFile] } });
        input.onchange?.(evt as any);
      });

      const uploadResult = await promise;
      expect(uploadResult.file).toBeDefined();
      expect(uploadResult.preview).toMatch(/^data:image/);
    });

    it('debe reusar el mismo input en llamadas consecutivas', async () => {
      const { useImageUpload } = await import('../useImageUpload');
      const { result } = renderHook(() => useImageUpload());

      // Primera llamada
      result.current.selectFromGallery().catch(() => {}); // Ignorar error

      const firstInput = document.querySelector('input[type="file"]');

      // Segunda llamada
      result.current.selectFromGallery().catch(() => {}); // Ignorar error

      const secondInput = document.querySelector('input[type="file"]');

      expect(firstInput).toBe(secondInput);
    });
  });

  describe('validateFile', () => {
    it('debe validar tipos de archivo personalizados', async () => {
      const { useImageUpload } = await import('../useImageUpload');
      const { result } = renderHook(() => useImageUpload());

      const gifFile = new File(['x'], 'test.gif', { type: 'image/gif' });
      Object.defineProperty(gifFile, 'size', { value: 1000 });

      // Por defecto no permite GIF
      await expect(
        result.current.uploadImage(gifFile)
      ).rejects.toThrow(/Tipo de archivo no permitido/i);

      // Con tipos personalizados que incluyen GIF
      await expect(
        result.current.uploadImage(gifFile, { allowedTypes: ['image/gif'] })
      ).resolves.toBeDefined();
    });

    it('debe validar tamaño máximo personalizado', async () => {
      const { useImageUpload } = await import('../useImageUpload');
      const { result } = renderHook(() => useImageUpload());

      const file = new File(['x'], 'test.png', { type: 'image/png' });
      Object.defineProperty(file, 'size', { value: 2 * 1024 * 1024 }); // 2MB

      // Con límite de 1MB
      await expect(
        result.current.uploadImage(file, { maxSizeBytes: 1 * 1024 * 1024 })
      ).rejects.toThrow(/demasiado grande/i);

      // Con límite de 3MB
      await expect(
        result.current.uploadImage(file, { maxSizeBytes: 3 * 1024 * 1024 })
      ).resolves.toBeDefined();
    });
  });
});

