/**
 * @jest-environment node
 */

process.env.REMITOS_DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
process.env.NODE_ENV = 'test';

const mockSharpInstance = {
  rotate: jest.fn().mockReturnThis(),
  jpeg: jest.fn().mockReturnThis(),
  resize: jest.fn().mockReturnThis(),
  toBuffer: jest.fn().mockResolvedValue(Buffer.from('processed')),
  metadata: jest.fn().mockResolvedValue({ width: 800, height: 600 }),
  composite: jest.fn().mockReturnThis(),
};

jest.mock('sharp', () => {
  const sharp = jest.fn().mockReturnValue(mockSharpInstance);
  return sharp;
});

jest.mock('pdf-lib', () => {
  const mockPage = { drawImage: jest.fn(), drawText: jest.fn() };
  const mockEmbedded = { scale: jest.fn().mockReturnValue({ width: 100, height: 100 }) };
  return {
    PDFDocument: {
      create: jest.fn().mockResolvedValue({
        addPage: jest.fn().mockReturnValue(mockPage),
        embedJpg: jest.fn().mockResolvedValue(mockEmbedded),
        embedPng: jest.fn().mockResolvedValue(mockEmbedded),
        save: jest.fn().mockResolvedValue(new Uint8Array([1, 2, 3])),
      }),
    },
    rgb: jest.fn().mockReturnValue({ type: 'RGB' }),
  };
});

jest.mock('../src/config/logger', () => ({
  AppLogger: { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

import { MediaService } from '../src/services/media.service';

describe('MediaService', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('isImage', () => {
    it.each([
      ['image/jpeg', true],
      ['image/jpg', true],
      ['image/png', true],
      ['image/gif', true],
      ['image/webp', true],
      ['application/pdf', false],
      ['text/plain', false],
    ])('returns correct result for %s', (mime, expected) => {
      expect(MediaService.isImage(mime)).toBe(expected);
    });
  });

  describe('isPdf', () => {
    it('returns true for application/pdf', () => {
      expect(MediaService.isPdf('application/pdf')).toBe(true);
    });

    it('returns false for image/png', () => {
      expect(MediaService.isPdf('image/png')).toBe(false);
    });

    it('is case-insensitive', () => {
      expect(MediaService.isPdf('APPLICATION/PDF')).toBe(true);
    });
  });

  describe('decodeDataUrl', () => {
    it('decodes valid base64 data URL', () => {
      const data = Buffer.from('hello').toString('base64');
      const result = MediaService.decodeDataUrl(`data:text/plain;base64,${data}`);
      expect(result.mimeType).toBe('text/plain');
      expect(result.buffer.toString()).toBe('hello');
    });

    it('throws on invalid data URL', () => {
      expect(() => MediaService.decodeDataUrl('not-a-data-url')).toThrow('Invalid base64 data URL');
    });

    it('throws on empty string', () => {
      expect(() => MediaService.decodeDataUrl('')).toThrow('Invalid base64 data URL');
    });

    it('handles null-ish input via fallback', () => {
      expect(() => MediaService.decodeDataUrl(null as any)).toThrow('Invalid base64 data URL');
    });
  });

  describe('composePdfFromImages', () => {
    it('throws on empty array', async () => {
      await expect(MediaService.composePdfFromImages([])).rejects.toThrow('No images to compose');
    });

    it('embeds jpeg image directly', async () => {
      const { PDFDocument } = require('pdf-lib');
      const result = await MediaService.composePdfFromImages([
        { buffer: Buffer.from('jpg-data'), mimeType: 'image/jpeg' },
      ]);
      const pdfDoc = await PDFDocument.create();
      expect(pdfDoc.embedJpg).toHaveBeenCalled();
      expect(result).toBeInstanceOf(Buffer);
    });

    it('embeds png image via embedPng', async () => {
      const { PDFDocument } = require('pdf-lib');
      const result = await MediaService.composePdfFromImages([
        { buffer: Buffer.from('png-data'), mimeType: 'image/png' },
      ]);
      const pdfDoc = await PDFDocument.create();
      expect(pdfDoc.embedPng).toHaveBeenCalled();
      expect(result).toBeInstanceOf(Buffer);
    });

    it('converts other formats (webp) to jpg via sharp', async () => {
      const sharp = require('sharp');
      await MediaService.composePdfFromImages([
        { buffer: Buffer.from('webp-data'), mimeType: 'image/webp' },
      ]);
      expect(sharp).toHaveBeenCalled();
      expect(mockSharpInstance.rotate).toHaveBeenCalled();
      expect(mockSharpInstance.jpeg).toHaveBeenCalled();
    });

    it('handles image processing error with fallback page', async () => {
      const { PDFDocument } = require('pdf-lib');
      const pdfDoc = await PDFDocument.create();
      pdfDoc.embedJpg.mockRejectedValueOnce(new Error('corrupt'));

      const result = await MediaService.composePdfFromImages([
        { buffer: Buffer.from('bad'), mimeType: 'image/jpeg', fileName: 'bad.jpg' },
      ]);

      expect(result).toBeInstanceOf(Buffer);
      const page = pdfDoc.addPage.mock.results[0]?.value;
      expect(page.drawText).toHaveBeenCalled();
    });
  });

  describe('pdfToImages', () => {
    it('returns the buffer as a single-element array', async () => {
      const buf = Buffer.from('pdf-content');
      const result = await MediaService.pdfToImages(buf);
      expect(result).toEqual([buf]);
    });
  });

  describe('normalizeImage', () => {
    it('rotates and converts to jpeg', async () => {
      const result = await MediaService.normalizeImage(Buffer.from('img'));
      expect(mockSharpInstance.rotate).toHaveBeenCalled();
      expect(mockSharpInstance.jpeg).toHaveBeenCalledWith({ quality: 85 });
      expect(result).toEqual(Buffer.from('processed'));
    });
  });

  describe('resizeForAnalysis', () => {
    it('resizes with default maxDim', async () => {
      await MediaService.resizeForAnalysis(Buffer.from('img'));
      expect(mockSharpInstance.resize).toHaveBeenCalledWith({
        width: 2000, height: 2000, fit: 'inside', withoutEnlargement: true,
      });
    });

    it('uses custom maxDim', async () => {
      await MediaService.resizeForAnalysis(Buffer.from('img'), 1024);
      expect(mockSharpInstance.resize).toHaveBeenCalledWith({
        width: 1024, height: 1024, fit: 'inside', withoutEnlargement: true,
      });
    });
  });

  describe('composeImageGrid', () => {
    it('throws on empty array', async () => {
      await expect(MediaService.composeImageGrid([])).rejects.toThrow('No images');
    });

    it('returns single image as-is', async () => {
      const buf = Buffer.from('single');
      const result = await MediaService.composeImageGrid([buf]);
      expect(result).toBe(buf);
    });

    it('composes multiple images into a grid', async () => {
      const sharp = require('sharp');
      const result = await MediaService.composeImageGrid([
        Buffer.from('img1'),
        Buffer.from('img2'),
      ]);
      expect(sharp).toHaveBeenCalled();
      expect(mockSharpInstance.composite).toHaveBeenCalled();
      expect(result).toEqual(Buffer.from('processed'));
    });
  });
});
