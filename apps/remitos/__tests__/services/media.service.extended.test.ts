/**
 * Tests extendidos para media.service.ts - cubrir líneas faltantes
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';

jest.mock('../../src/config/logger', () => ({
  AppLogger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

// Mock sharp
const mockSharpInstance: any = {
  rotate: jest.fn().mockReturnThis(),
  resize: jest.fn().mockReturnThis(),
  jpeg: jest.fn().mockReturnThis(),
  toBuffer: jest.fn().mockResolvedValue(Buffer.from('processed') as never),
  metadata: jest.fn().mockResolvedValue({ width: 800, height: 600 } as never),
  composite: jest.fn().mockReturnThis(),
};
jest.mock('sharp', () => {
  const mockSharp = jest.fn(() => mockSharpInstance);
  (mockSharp as any).default = mockSharp;
  return mockSharp;
});

// Mock pdf-lib
const mockPdfDoc = {
  addPage: jest.fn().mockReturnValue({
    drawImage: jest.fn(),
    drawText: jest.fn(),
  }),
  embedJpg: jest.fn().mockResolvedValue({
    scale: jest.fn().mockReturnValue({ width: 800, height: 600 }),
  } as never),
  embedPng: jest.fn().mockResolvedValue({
    scale: jest.fn().mockReturnValue({ width: 800, height: 600 }),
  } as never),
  save: jest.fn().mockResolvedValue(new Uint8Array([1, 2, 3]) as never),
};
jest.mock('pdf-lib', () => ({
  PDFDocument: {
    create: jest.fn().mockResolvedValue(mockPdfDoc as never),
  },
  rgb: jest.fn().mockReturnValue({ r: 0.8, g: 0.2, b: 0.2 }),
}));

describe('MediaService extended', () => {
  let MediaService: any;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await import('../../src/services/media.service');
    MediaService = module.MediaService;
  });

  describe('isImage', () => {
    it('retorna true para image/png', () => {
      expect(MediaService.isImage('image/png')).toBe(true);
    });

    it('retorna true para image/jpeg', () => {
      expect(MediaService.isImage('image/jpeg')).toBe(true);
    });

    it('retorna true para image/webp', () => {
      expect(MediaService.isImage('image/webp')).toBe(true);
    });

    it('retorna false para application/pdf', () => {
      expect(MediaService.isImage('application/pdf')).toBe(false);
    });
  });

  describe('isPdf', () => {
    it('retorna true para application/pdf', () => {
      expect(MediaService.isPdf('application/pdf')).toBe(true);
    });

    it('retorna false para image/png', () => {
      expect(MediaService.isPdf('image/png')).toBe(false);
    });
  });

  describe('decodeDataUrl', () => {
    it('decodifica data URL válido', () => {
      const base64 = Buffer.from('test').toString('base64');
      const dataUrl = `data:image/png;base64,${base64}`;
      const result = MediaService.decodeDataUrl(dataUrl);
      expect(result.mimeType).toBe('image/png');
      expect(result.buffer).toEqual(Buffer.from('test'));
    });

    it('lanza error para data URL inválido', () => {
      expect(() => MediaService.decodeDataUrl('invalid')).toThrow('Invalid base64 data URL');
    });

    it('lanza error para string vacío', () => {
      expect(() => MediaService.decodeDataUrl('')).toThrow('Invalid base64 data URL');
    });
  });

  describe('composePdfFromImages', () => {
    it('lanza error si no hay imágenes', async () => {
      await expect(MediaService.composePdfFromImages([])).rejects.toThrow('No images to compose');
    });

    it('compone imágenes JPEG en PDF', async () => {
      const images = [{ buffer: Buffer.from('img'), mimeType: 'image/jpeg' }];
      const result = await MediaService.composePdfFromImages(images);
      expect(result).toBeInstanceOf(Buffer);
    });

    it('compone imágenes PNG en PDF', async () => {
      const images = [{ buffer: Buffer.from('img'), mimeType: 'image/png' }];
      const result = await MediaService.composePdfFromImages(images);
      expect(result).toBeInstanceOf(Buffer);
    });

    it('convierte otros formatos a JPEG antes de embeber', async () => {
      const images = [{ buffer: Buffer.from('img'), mimeType: 'image/webp' }];
      const result = await MediaService.composePdfFromImages(images);
      expect(result).toBeInstanceOf(Buffer);
    });
  });

  describe('pdfToImages', () => {
    it('retorna array con el buffer original', async () => {
      const pdfBuffer = Buffer.from('pdf');
      const result = await MediaService.pdfToImages(pdfBuffer);
      expect(result).toEqual([pdfBuffer]);
    });
  });

  describe('normalizeImage', () => {
    it('normaliza imagen con sharp', async () => {
      const buffer = Buffer.from('test');
      const result = await MediaService.normalizeImage(buffer);
      expect(result).toBeInstanceOf(Buffer);
    });
  });

  describe('resizeForAnalysis', () => {
    it('redimensiona imagen para análisis', async () => {
      const buffer = Buffer.from('test');
      const result = await MediaService.resizeForAnalysis(buffer);
      expect(result).toBeInstanceOf(Buffer);
    });

    it('acepta dimensión máxima personalizada', async () => {
      const buffer = Buffer.from('test');
      const result = await MediaService.resizeForAnalysis(buffer, 1000);
      expect(result).toBeInstanceOf(Buffer);
    });
  });

  describe('composeImageGrid', () => {
    it('lanza error si no hay imágenes', async () => {
      await expect(MediaService.composeImageGrid([])).rejects.toThrow('No images');
    });

    it('retorna imagen directamente si solo hay una', async () => {
      const buf = Buffer.from('single');
      const result = await MediaService.composeImageGrid([buf]);
      expect(result).toBe(buf);
    });

    it('compone múltiples imágenes en grid', async () => {
      const bufs = [Buffer.from('a'), Buffer.from('b')];
      const result = await MediaService.composeImageGrid(bufs);
      expect(result).toBeInstanceOf(Buffer);
    });
  });
});

