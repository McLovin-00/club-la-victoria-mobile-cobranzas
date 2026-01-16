/**
 * Tests para utilidades de manejo de archivos
 */
import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { 
  generateFilePreview, 
  downloadFile, 
  validateBeforeUpload,
  compressImage 
} from '../fileHandlers';

describe('generateFilePreview', () => {
  const mockUrl = 'blob:http://localhost/mock-url';
  const mockCreateObjectURL = jest.fn(() => mockUrl);
  const mockRevokeObjectURL = jest.fn();

  beforeEach(() => {
    (global.URL as any).createObjectURL = mockCreateObjectURL;
    (global.URL as any).revokeObjectURL = mockRevokeObjectURL;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('genera una URL de preview para un archivo', () => {
    const file = new File(['test content'], 'test.txt', { type: 'text/plain' });
    const preview = generateFilePreview(file);
    
    expect(mockCreateObjectURL).toHaveBeenCalledWith(file);
    expect(preview.url).toBe(mockUrl);
  });

  it('provee función revoke que libera la URL', () => {
    const file = new File(['test content'], 'test.txt', { type: 'text/plain' });
    const preview = generateFilePreview(file);
    
    preview.revoke();
    
    expect(mockRevokeObjectURL).toHaveBeenCalledWith(mockUrl);
  });
});

describe('downloadFile', () => {
  const mockUrl = 'blob:http://localhost/download-url';
  let mockLink: { href: string; download: string; click: jest.Mock };

  beforeEach(() => {
    (window.URL.createObjectURL as jest.Mock) = jest.fn(() => mockUrl);
    (window.URL.revokeObjectURL as jest.Mock) = jest.fn();
    
    mockLink = {
      href: '',
      download: '',
      click: jest.fn(),
    };
    
    jest.spyOn(window.document, 'createElement').mockReturnValue(mockLink as any);
    jest.spyOn(window.document.body, 'appendChild').mockImplementation(() => mockLink as any);
    jest.spyOn(window.document.body, 'removeChild').mockImplementation(() => mockLink as any);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('crea un link temporal y dispara la descarga', async () => {
    const blob = new Blob(['file content'], { type: 'text/plain' });
    const filename = 'downloaded-file.txt';
    
    await downloadFile(blob, filename);
    
    expect(window.URL.createObjectURL).toHaveBeenCalledWith(blob);
    expect(mockLink.href).toBe(mockUrl);
    expect(mockLink.download).toBe(filename);
    expect(mockLink.click).toHaveBeenCalled();
    expect(window.document.body.appendChild).toHaveBeenCalled();
    expect(window.document.body.removeChild).toHaveBeenCalled();
    expect(window.URL.revokeObjectURL).toHaveBeenCalledWith(mockUrl);
  });
});

describe('validateBeforeUpload', () => {
  const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'];
  const maxBytes = 5 * 1024 * 1024; // 5MB

  it('retorna null para archivo válido', () => {
    const file = new File(['content'], 'test.jpg', { type: 'image/jpeg' });
    Object.defineProperty(file, 'size', { value: 1024 * 1024 }); // 1MB
    
    expect(validateBeforeUpload(file, allowedTypes, maxBytes)).toBeNull();
  });

  it('retorna error para tipo de archivo no permitido', () => {
    const file = new File(['content'], 'test.exe', { type: 'application/x-msdownload' });
    
    const result = validateBeforeUpload(file, allowedTypes, maxBytes);
    
    expect(result).toContain('Tipo de archivo no permitido');
  });

  it('retorna error para archivo que excede tamaño máximo', () => {
    const file = new File(['content'], 'test.jpg', { type: 'image/jpeg' });
    Object.defineProperty(file, 'size', { value: 10 * 1024 * 1024 }); // 10MB
    
    const result = validateBeforeUpload(file, allowedTypes, maxBytes);
    
    expect(result).toContain('excede el tamaño máximo');
  });

  it('valida tipo antes que tamaño', () => {
    const file = new File(['content'], 'test.exe', { type: 'application/x-msdownload' });
    Object.defineProperty(file, 'size', { value: 10 * 1024 * 1024 }); // También excede
    
    const result = validateBeforeUpload(file, allowedTypes, maxBytes);
    
    // Debe fallar primero por tipo
    expect(result).toContain('Tipo de archivo no permitido');
  });
});

describe('compressImage', () => {
  it('retorna el mismo archivo (placeholder de compresión)', async () => {
    const file = new File(['image content'], 'test.jpg', { type: 'image/jpeg' });
    
    const result = await compressImage(file);
    
    expect(result).toBe(file);
  });

  it('acepta parámetro de calidad opcional', async () => {
    const file = new File(['image content'], 'test.jpg', { type: 'image/jpeg' });
    
    const result = await compressImage(file, 0.5);
    
    expect(result).toBe(file);
  });
});

