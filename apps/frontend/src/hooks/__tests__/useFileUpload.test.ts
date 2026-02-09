/**
 * Tests para useFileUpload hook
 */
import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { renderHook, act } from '@testing-library/react';
import { useFileUpload } from '../useFileUpload';

// Mock URL.createObjectURL y revokeObjectURL
const mockUrl = 'blob:http://localhost/mock-file-url';
const mockCreateObjectURL = jest.fn(() => mockUrl);
const mockRevokeObjectURL = jest.fn();

beforeEach(() => {
  (global.URL as any).createObjectURL = mockCreateObjectURL;
  (global.URL as any).revokeObjectURL = mockRevokeObjectURL;
});

afterEach(() => {
  jest.clearAllMocks();
});

describe('useFileUpload', () => {
  const defaultOptions = {
    allowedTypes: ['image/jpeg', 'image/png', 'application/pdf'],
    maxBytes: 5 * 1024 * 1024, // 5MB
  };

  it('inicia con estado vacío', () => {
    const { result } = renderHook(() => useFileUpload(defaultOptions));

    expect(result.current.files).toEqual([]);
    expect(result.current.previews).toEqual([]);
    expect(result.current.errors).toEqual([]);
    expect(result.current.hasErrors).toBe(false);
    expect(result.current.progress).toBe(0);
  });

  it('onDrop acepta archivos válidos', () => {
    const { result } = renderHook(() => useFileUpload(defaultOptions));

    const validFile = new File(['content'], 'test.jpg', { type: 'image/jpeg' });
    Object.defineProperty(validFile, 'size', { value: 1024 }); // 1KB

    act(() => {
      result.current.onDrop([validFile]);
    });

    expect(result.current.files).toHaveLength(1);
    expect(result.current.files[0].name).toBe('test.jpg');
    expect(result.current.errors).toEqual([]);
    expect(result.current.hasErrors).toBe(false);
  });

  it('onDrop rechaza archivos con tipo inválido', () => {
    const { result } = renderHook(() => useFileUpload(defaultOptions));

    const invalidFile = new File(['content'], 'test.exe', { type: 'application/x-msdownload' });

    act(() => {
      result.current.onDrop([invalidFile]);
    });

    expect(result.current.files).toEqual([]);
    expect(result.current.errors).toHaveLength(1);
    expect(result.current.errors[0]).toContain('test.exe');
    expect(result.current.hasErrors).toBe(true);
  });

  it('onDrop rechaza archivos que exceden el tamaño máximo', () => {
    const { result } = renderHook(() => useFileUpload(defaultOptions));

    const largeFile = new File(['content'], 'large.jpg', { type: 'image/jpeg' });
    Object.defineProperty(largeFile, 'size', { value: 10 * 1024 * 1024 }); // 10MB

    act(() => {
      result.current.onDrop([largeFile]);
    });

    expect(result.current.files).toEqual([]);
    expect(result.current.errors).toHaveLength(1);
    expect(result.current.errors[0]).toContain('large.jpg');
    expect(result.current.hasErrors).toBe(true);
  });

  it('onDrop genera previews para archivos válidos', () => {
    const { result } = renderHook(() => useFileUpload(defaultOptions));

    const validFile = new File(['content'], 'test.jpg', { type: 'image/jpeg' });
    Object.defineProperty(validFile, 'size', { value: 1024 });

    act(() => {
      result.current.onDrop([validFile]);
    });

    expect(result.current.previews).toHaveLength(1);
    expect(result.current.previews[0].url).toBe(mockUrl);
    expect(mockCreateObjectURL).toHaveBeenCalledWith(validFile);
  });

  it('onDrop revoca previews anteriores al agregar nuevos', () => {
    const { result } = renderHook(() => useFileUpload(defaultOptions));

    const file1 = new File(['content1'], 'test1.jpg', { type: 'image/jpeg' });
    Object.defineProperty(file1, 'size', { value: 1024 });

    const file2 = new File(['content2'], 'test2.jpg', { type: 'image/jpeg' });
    Object.defineProperty(file2, 'size', { value: 1024 });

    act(() => {
      result.current.onDrop([file1]);
    });

    const firstPreview = result.current.previews[0];

    act(() => {
      result.current.onDrop([file2]);
    });

    // El preview anterior debería haber sido revocado
    expect(mockRevokeObjectURL).toHaveBeenCalled();
  });

  it('onDrop acepta FileList además de array', () => {
    const { result } = renderHook(() => useFileUpload(defaultOptions));

    const file = new File(['content'], 'test.jpg', { type: 'image/jpeg' });
    Object.defineProperty(file, 'size', { value: 1024 });

    // Simular FileList
    const fileList = {
      0: file,
      length: 1,
      item: (i: number) => file,
      [Symbol.iterator]: function* () { yield file; },
    } as unknown as FileList;

    act(() => {
      result.current.onDrop(fileList);
    });

    expect(result.current.files).toHaveLength(1);
  });

  it('onDrop maneja múltiples archivos mezclados (válidos e inválidos)', () => {
    const { result } = renderHook(() => useFileUpload(defaultOptions));

    const validFile = new File(['content'], 'valid.jpg', { type: 'image/jpeg' });
    Object.defineProperty(validFile, 'size', { value: 1024 });

    const invalidFile = new File(['content'], 'invalid.exe', { type: 'application/x-msdownload' });

    act(() => {
      result.current.onDrop([validFile, invalidFile]);
    });

    expect(result.current.files).toHaveLength(1);
    expect(result.current.files[0].name).toBe('valid.jpg');
    expect(result.current.errors).toHaveLength(1);
    expect(result.current.errors[0]).toContain('invalid.exe');
  });

  it('reset limpia todos los estados', () => {
    const { result } = renderHook(() => useFileUpload(defaultOptions));

    const file = new File(['content'], 'test.jpg', { type: 'image/jpeg' });
    Object.defineProperty(file, 'size', { value: 1024 });

    act(() => {
      result.current.onDrop([file]);
      result.current.setProgress(50);
    });

    expect(result.current.files).toHaveLength(1);
    expect(result.current.progress).toBe(50);

    act(() => {
      result.current.reset();
    });

    expect(result.current.files).toEqual([]);
    expect(result.current.previews).toEqual([]);
    expect(result.current.errors).toEqual([]);
    expect(result.current.progress).toBe(0);
  });

  it('reset revoca previews existentes', () => {
    const { result } = renderHook(() => useFileUpload(defaultOptions));

    const file = new File(['content'], 'test.jpg', { type: 'image/jpeg' });
    Object.defineProperty(file, 'size', { value: 1024 });

    act(() => {
      result.current.onDrop([file]);
    });

    act(() => {
      result.current.reset();
    });

    expect(mockRevokeObjectURL).toHaveBeenCalled();
  });

  it('setProgress actualiza el progreso', () => {
    const { result } = renderHook(() => useFileUpload(defaultOptions));

    act(() => {
      result.current.setProgress(75);
    });

    expect(result.current.progress).toBe(75);
  });

  it('hasErrors se actualiza correctamente', () => {
    const { result } = renderHook(() => useFileUpload(defaultOptions));

    expect(result.current.hasErrors).toBe(false);

    const invalidFile = new File(['content'], 'test.exe', { type: 'application/x-msdownload' });

    act(() => {
      result.current.onDrop([invalidFile]);
    });

    expect(result.current.hasErrors).toBe(true);

    act(() => {
      result.current.reset();
    });

    expect(result.current.hasErrors).toBe(false);
  });
});
