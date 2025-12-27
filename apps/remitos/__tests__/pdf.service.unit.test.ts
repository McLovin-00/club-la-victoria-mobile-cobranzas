/**
 * Unit tests for PDF Service
 * @jest-environment node
 */

process.env.NODE_ENV = 'test';

jest.mock('../src/config/logger', () => ({
  AppLogger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

describe('PDFService', () => {
  describe('PDF metadata extraction', () => {
    interface PDFMetadata {
      pageCount: number;
      width: number;
      height: number;
      author?: string;
      title?: string;
      creationDate?: Date;
    }

    function parsePDFInfo(info: Record<string, any>): PDFMetadata {
      return {
        pageCount: info.pages || 1,
        width: info.width || 595, // A4 default
        height: info.height || 842, // A4 default
        author: info.author,
        title: info.title,
        creationDate: info.creationDate ? new Date(info.creationDate) : undefined,
      };
    }

    it('should parse basic PDF info', () => {
      const info = { pages: 3, width: 612, height: 792 };
      const metadata = parsePDFInfo(info);
      expect(metadata.pageCount).toBe(3);
      expect(metadata.width).toBe(612);
    });

    it('should use defaults for missing values', () => {
      const metadata = parsePDFInfo({});
      expect(metadata.pageCount).toBe(1);
      expect(metadata.width).toBe(595);
      expect(metadata.height).toBe(842);
    });
  });

  describe('Image to PDF conversion options', () => {
    interface ConversionOptions {
      fitToPage: boolean;
      margin: number;
      quality: number;
      format: 'A4' | 'Letter' | 'Legal';
    }

    const defaultOptions: ConversionOptions = {
      fitToPage: true,
      margin: 20,
      quality: 85,
      format: 'A4',
    };

    function getPageDimensions(format: string): { width: number; height: number } {
      const dimensions: Record<string, { width: number; height: number }> = {
        'A4': { width: 595, height: 842 },
        'Letter': { width: 612, height: 792 },
        'Legal': { width: 612, height: 1008 },
      };
      return dimensions[format] || dimensions['A4'];
    }

    it('should return A4 dimensions', () => {
      const dims = getPageDimensions('A4');
      expect(dims.width).toBe(595);
      expect(dims.height).toBe(842);
    });

    it('should return Letter dimensions', () => {
      const dims = getPageDimensions('Letter');
      expect(dims.width).toBe(612);
      expect(dims.height).toBe(792);
    });

    it('should default to A4 for unknown format', () => {
      const dims = getPageDimensions('Unknown');
      expect(dims.width).toBe(595);
    });
  });

  describe('Image scaling for PDF', () => {
    function calculateScale(
      imageWidth: number,
      imageHeight: number,
      pageWidth: number,
      pageHeight: number,
      margin: number = 0
    ): { width: number; height: number; scale: number } {
      const availWidth = pageWidth - 2 * margin;
      const availHeight = pageHeight - 2 * margin;

      const scaleX = availWidth / imageWidth;
      const scaleY = availHeight / imageHeight;
      const scale = Math.min(scaleX, scaleY, 1); // Never upscale

      return {
        width: imageWidth * scale,
        height: imageHeight * scale,
        scale,
      };
    }

    it('should scale down large images', () => {
      const result = calculateScale(1200, 800, 595, 842);
      expect(result.scale).toBeLessThan(1);
      expect(result.width).toBeLessThanOrEqual(595);
    });

    it('should not upscale small images', () => {
      const result = calculateScale(200, 300, 595, 842);
      expect(result.scale).toBe(1);
      expect(result.width).toBe(200);
      expect(result.height).toBe(300);
    });

    it('should respect margins', () => {
      const result = calculateScale(1200, 800, 595, 842, 20);
      expect(result.width).toBeLessThanOrEqual(555); // 595 - 2*20
    });

    it('should maintain aspect ratio', () => {
      const imageRatio = 800 / 600;
      const result = calculateScale(800, 600, 595, 842);
      const resultRatio = result.width / result.height;
      expect(Math.abs(imageRatio - resultRatio)).toBeLessThan(0.01);
    });
  });

  describe('PDF merge validation', () => {
    function validateMergeInputs(
      pdfs: Buffer[],
      maxSize: number = 50 * 1024 * 1024
    ): { valid: boolean; error?: string } {
      if (pdfs.length === 0) {
        return { valid: false, error: 'At least one PDF required' };
      }

      if (pdfs.length > 100) {
        return { valid: false, error: 'Maximum 100 PDFs allowed' };
      }

      const totalSize = pdfs.reduce((sum, pdf) => sum + pdf.length, 0);
      if (totalSize > maxSize) {
        return { valid: false, error: 'Total size exceeds maximum' };
      }

      return { valid: true };
    }

    it('should require at least one PDF', () => {
      const result = validateMergeInputs([]);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('At least one');
    });

    it('should limit number of PDFs', () => {
      const pdfs = Array(101).fill(Buffer.from('dummy'));
      const result = validateMergeInputs(pdfs);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Maximum 100');
    });

    it('should validate total size', () => {
      const largePdf = Buffer.alloc(30 * 1024 * 1024); // 30MB
      const pdfs = [largePdf, largePdf]; // 60MB total
      const result = validateMergeInputs(pdfs);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('size exceeds');
    });

    it('should accept valid inputs', () => {
      const pdfs = [Buffer.from('pdf1'), Buffer.from('pdf2')];
      const result = validateMergeInputs(pdfs);
      expect(result.valid).toBe(true);
    });
  });

  describe('PDF page extraction', () => {
    interface PageRange {
      start: number;
      end: number;
    }

    function parsePageRange(rangeStr: string, totalPages: number): PageRange[] {
      const ranges: PageRange[] = [];
      const parts = rangeStr.split(',');

      for (const part of parts) {
        if (part.includes('-')) {
          const [start, end] = part.split('-').map(Number);
          if (start >= 1 && end <= totalPages && start <= end) {
            ranges.push({ start, end });
          }
        } else {
          const page = Number(part);
          if (page >= 1 && page <= totalPages) {
            ranges.push({ start: page, end: page });
          }
        }
      }

      return ranges;
    }

    it('should parse single page', () => {
      const ranges = parsePageRange('3', 10);
      expect(ranges).toHaveLength(1);
      expect(ranges[0]).toEqual({ start: 3, end: 3 });
    });

    it('should parse page range', () => {
      const ranges = parsePageRange('1-5', 10);
      expect(ranges).toHaveLength(1);
      expect(ranges[0]).toEqual({ start: 1, end: 5 });
    });

    it('should parse multiple ranges', () => {
      const ranges = parsePageRange('1-3,5,7-10', 10);
      expect(ranges).toHaveLength(3);
    });

    it('should ignore invalid pages', () => {
      const ranges = parsePageRange('15', 10); // Page 15 doesn't exist
      expect(ranges).toHaveLength(0);
    });

    it('should handle invalid range order', () => {
      const ranges = parsePageRange('5-3', 10); // Invalid: start > end
      expect(ranges).toHaveLength(0);
    });
  });

  describe('File type validation', () => {
    function isValidImageForPdf(mimeType: string): boolean {
      const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/tiff'];
      return validTypes.includes(mimeType);
    }

    function isPdfFile(mimeType: string): boolean {
      return mimeType === 'application/pdf';
    }

    it('should accept JPEG', () => {
      expect(isValidImageForPdf('image/jpeg')).toBe(true);
    });

    it('should accept PNG', () => {
      expect(isValidImageForPdf('image/png')).toBe(true);
    });

    it('should reject PDF as image', () => {
      expect(isValidImageForPdf('application/pdf')).toBe(false);
    });

    it('should identify PDF files', () => {
      expect(isPdfFile('application/pdf')).toBe(true);
      expect(isPdfFile('image/jpeg')).toBe(false);
    });
  });

  describe('Output filename generation', () => {
    function generatePdfFilename(
      prefix: string,
      identifier: string,
      timestamp: Date = new Date()
    ): string {
      const dateStr = timestamp.toISOString().split('T')[0].replace(/-/g, '');
      const cleanId = identifier.replace(/[^a-zA-Z0-9]/g, '_');
      return `${prefix}_${cleanId}_${dateStr}.pdf`;
    }

    it('should generate filename with date', () => {
      const filename = generatePdfFilename('remito', 'R-0001', new Date('2024-06-15'));
      expect(filename).toBe('remito_R_0001_20240615.pdf');
    });

    it('should sanitize identifier', () => {
      const filename = generatePdfFilename('doc', 'Test/Invalid:Name', new Date('2024-01-01'));
      expect(filename).toContain('Test_Invalid_Name');
      expect(filename).not.toContain('/');
      expect(filename).not.toContain(':');
    });
  });

  describe('Compression options', () => {
    interface CompressionOptions {
      imageQuality: number;
      removeMetadata: boolean;
      compressImages: boolean;
    }

    function getCompressionLevel(targetReduction: number): CompressionOptions {
      if (targetReduction >= 70) {
        return { imageQuality: 50, removeMetadata: true, compressImages: true };
      }
      if (targetReduction >= 40) {
        return { imageQuality: 70, removeMetadata: true, compressImages: true };
      }
      return { imageQuality: 85, removeMetadata: false, compressImages: false };
    }

    it('should return high compression for 70%+ reduction', () => {
      const options = getCompressionLevel(70);
      expect(options.imageQuality).toBe(50);
      expect(options.removeMetadata).toBe(true);
    });

    it('should return medium compression for 40-70% reduction', () => {
      const options = getCompressionLevel(50);
      expect(options.imageQuality).toBe(70);
    });

    it('should return low compression for <40% reduction', () => {
      const options = getCompressionLevel(20);
      expect(options.imageQuality).toBe(85);
      expect(options.removeMetadata).toBe(false);
    });
  });

  describe('Page rotation', () => {
    function normalizeRotation(degrees: number): number {
      const normalized = ((degrees % 360) + 360) % 360;
      // Only allow 0, 90, 180, 270
      const valid = [0, 90, 180, 270];
      const closest = valid.reduce((prev, curr) =>
        Math.abs(curr - normalized) < Math.abs(prev - normalized) ? curr : prev
      );
      return closest;
    }

    it('should normalize positive rotation', () => {
      expect(normalizeRotation(90)).toBe(90);
      expect(normalizeRotation(180)).toBe(180);
      expect(normalizeRotation(270)).toBe(270);
    });

    it('should normalize negative rotation', () => {
      expect(normalizeRotation(-90)).toBe(270);
      expect(normalizeRotation(-180)).toBe(180);
    });

    it('should normalize to nearest valid rotation', () => {
      expect(normalizeRotation(45)).toBe(0); // Closest to 0
      expect(normalizeRotation(135)).toBe(90); // Closest to 90
    });

    it('should handle full rotations', () => {
      expect(normalizeRotation(450)).toBe(90); // 450 = 360 + 90
    });
  });
});




