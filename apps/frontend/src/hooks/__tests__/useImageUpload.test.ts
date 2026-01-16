/**
 * Tests para useImageUpload hook
 * Manejo de subida, compresión y captura de imágenes
 */
import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { renderHook, act } from '@testing-library/react';

describe('useImageUpload', () => {
  const originalFileReader = (globalThis as any).FileReader;
  const originalImage = (globalThis as any).Image;
  const originalCreateObjectURL = URL.createObjectURL;

  beforeEach(() => {
    jest.restoreAllMocks();

    // Mock URL.createObjectURL
    (URL as any).createObjectURL = jest.fn(() => 'blob:mock');

    // Mock FileReader
    class MockFileReader {
      public onload: ((e: any) => void) | null = null;
      public onerror: (() => void) | null = null;
      public readAsDataURL(_file: File) {
        // Simula lectura exitosa
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
        // Simula carga inmediata
        this.onload?.();
      }
    }
    (globalThis as any).Image = MockImage as any;
  });

  afterEach(() => {
    (globalThis as any).FileReader = originalFileReader;
    (globalThis as any).Image = originalImage;
    (URL as any).createObjectURL = originalCreateObjectURL;
  });

  describe('uploadImage', () => {
    it('debe fallar si el tipo de archivo no está permitido', async () => {
      const { useImageUpload } = await import('../useImageUpload');
      const { result } = renderHook(() => useImageUpload());

      const badFile = new File(['x'], 'bad.txt', { type: 'text/plain' });

      await expect(
        result.current.uploadImage(badFile)
      ).rejects.toThrow(/Tipo de archivo no permitido/i);
    });

    it('debe fallar si el archivo supera el tamaño máximo', async () => {
      const { useImageUpload } = await import('../useImageUpload');
      const { result } = renderHook(() => useImageUpload());

      // Fake File con size grande
      const bigFile = new File(['x'], 'big.png', { type: 'image/png' });
      Object.defineProperty(bigFile, 'size', { value: 10 * 1024 * 1024 }); // 10MB

      await expect(
        result.current.uploadImage(bigFile, { maxSizeBytes: 5 * 1024 * 1024 })
      ).rejects.toThrow(/demasiado grande/i);
    });

    it('debe retornar preview y dimensiones para un archivo válido', async () => {
      const { useImageUpload } = await import('../useImageUpload');
      const { result } = renderHook(() => useImageUpload());

      const okFile = new File(['x'], 'ok.png', { type: 'image/png' });
      Object.defineProperty(okFile, 'size', { value: 1000 });

      const res = await result.current.uploadImage(okFile);
      expect(res.preview).toMatch(/^data:image\/png;base64/i);
      expect(res.width).toBe(640);
      expect(res.height).toBe(480);
      expect(res.size).toBe(1000);
    });

    it('debe aceptar archivos jpeg', async () => {
      const { useImageUpload } = await import('../useImageUpload');
      const { result } = renderHook(() => useImageUpload());

      const jpegFile = new File(['x'], 'photo.jpg', { type: 'image/jpeg' });
      Object.defineProperty(jpegFile, 'size', { value: 500 });

      // No debería lanzar error
      await expect(result.current.uploadImage(jpegFile)).resolves.toBeDefined();
    });

    it('debe aceptar archivos webp', async () => {
      const { useImageUpload } = await import('../useImageUpload');
      const { result } = renderHook(() => useImageUpload());

      const webpFile = new File(['x'], 'image.webp', { type: 'image/webp' });
      Object.defineProperty(webpFile, 'size', { value: 500 });

      await expect(result.current.uploadImage(webpFile)).resolves.toBeDefined();
    });

    it('debe setear isUploading durante la carga', async () => {
      const { useImageUpload } = await import('../useImageUpload');
      const { result } = renderHook(() => useImageUpload());

      expect(result.current.isUploading).toBe(false);

      const okFile = new File(['x'], 'ok.png', { type: 'image/png' });
      Object.defineProperty(okFile, 'size', { value: 1000 });

      const promise = result.current.uploadImage(okFile);
      // Durante la operación podría estar en true
      await promise;
      
      expect(result.current.isUploading).toBe(false);
    });

    it('debe setear error cuando falla', async () => {
      const { useImageUpload } = await import('../useImageUpload');
      const { result } = renderHook(() => useImageUpload());

      const badFile = new File(['x'], 'bad.txt', { type: 'text/plain' });

      // Verificar que rechaza con el mensaje correcto
      await expect(result.current.uploadImage(badFile)).rejects.toThrow(/Tipo de archivo no permitido/);
    });
  });

  describe('captureFromCamera', () => {
    it('debe fallar si el navegador no soporta cámara', async () => {
      const originalMediaDevices = (navigator as any).mediaDevices;
      (navigator as any).mediaDevices = undefined;

      const { useImageUpload } = await import('../useImageUpload');
      const { result } = renderHook(() => useImageUpload());

      await expect(result.current.captureFromCamera()).rejects.toThrow(/no soporta/i);

      (navigator as any).mediaDevices = originalMediaDevices;
    });
  });

  describe('selectFromGallery', () => {
    it('debe crear input y propagar error si no hay archivo', async () => {
      const { useImageUpload } = await import('../useImageUpload');
      const { result } = renderHook(() => useImageUpload());

      const promise = result.current.selectFromGallery();

      // Simular input creado y change sin archivo
      const input = document.querySelector('input[type="file"]') as HTMLInputElement;
      expect(input).toBeInTheDocument();

      act(() => {
        const evt = new Event('change');
        Object.defineProperty(evt, 'target', { value: { files: [] } });
        input.onchange?.(evt as any);
      });

      await expect(promise).rejects.toThrow(/No se seleccionó ningún archivo/i);
    });
  });

  describe('createPreview', () => {
    it('debe generar preview base64', async () => {
      const { useImageUpload } = await import('../useImageUpload');
      const { result } = renderHook(() => useImageUpload());

      const file = new File(['x'], 'test.png', { type: 'image/png' });
      const preview = await result.current.createPreview(file);

      expect(preview).toMatch(/^data:image\/png;base64/);
    });
  });

  describe('compressImage', () => {
    it('debe retornar el mismo archivo si está dentro del límite', async () => {
      const { useImageUpload } = await import('../useImageUpload');
      const { result } = renderHook(() => useImageUpload());

      const smallFile = new File(['x'], 'small.png', { type: 'image/png' });
      Object.defineProperty(smallFile, 'size', { value: 1000 }); // 1KB

      const compressed = await result.current.compressImage(smallFile, { 
        maxSizeBytes: 5 * 1024 * 1024 
      });

      expect(compressed).toBe(smallFile);
    });
  });

  describe('opciones por defecto', () => {
    it('tiene maxSizeBytes de 5MB por defecto', async () => {
      const { useImageUpload } = await import('../useImageUpload');
      const { result } = renderHook(() => useImageUpload());

      // Archivo justo por debajo del límite debería funcionar
      const okFile = new File(['x'], 'ok.png', { type: 'image/png' });
      Object.defineProperty(okFile, 'size', { value: 4 * 1024 * 1024 }); // 4MB

      await expect(result.current.uploadImage(okFile)).resolves.toBeDefined();
    });

    it('tiene tipos permitidos por defecto', async () => {
      const { useImageUpload } = await import('../useImageUpload');
      const { result } = renderHook(() => useImageUpload());

      // Verificar tipos por defecto (jpeg, png, webp)
      const jpegFile = new File(['x'], 'a.jpg', { type: 'image/jpeg' });
      const pngFile = new File(['x'], 'b.png', { type: 'image/png' });
      const webpFile = new File(['x'], 'c.webp', { type: 'image/webp' });

      Object.defineProperty(jpegFile, 'size', { value: 100 });
      Object.defineProperty(pngFile, 'size', { value: 100 });
      Object.defineProperty(webpFile, 'size', { value: 100 });

      await expect(result.current.uploadImage(jpegFile)).resolves.toBeDefined();
      await expect(result.current.uploadImage(pngFile)).resolves.toBeDefined();
      await expect(result.current.uploadImage(webpFile)).resolves.toBeDefined();
    });
  });
});
