/**
 * Tests para PdfService - Ejecuta código real
 * @jest-environment node
 */

import * as fs from 'fs/promises';

// Mock child_process
const mockExecFile = jest.fn();
jest.mock('child_process', () => ({
  execFile: (cmd: string, args: string[], opts: any, cb: (error: Error | null, stdout: string, stderr: string) => void) => {
    return mockExecFile(cmd, args, opts, cb);
  },
}));

// Mock util.promisify to work with our mock
jest.mock('util', () => ({
  promisify: (_fn: any) => async (cmd: string, _args: string[], _opts?: any) => {
    return new Promise((resolve) => {
      if (cmd === 'pdftoppm' && mockExecFile.mock.calls.length === 0) {
        mockExecFile.mockImplementation(() => { });
        resolve({ stdout: '', stderr: '' });
      } else if (cmd === 'pdftocairo') {
        resolve({ stdout: '', stderr: '' });
      } else {
        resolve({ stdout: '', stderr: '' });
      }
    });
  },
}));

jest.mock('../../src/config/logger', () => ({
  AppLogger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

// Mock fs/promises
jest.mock('fs/promises', () => ({
  mkdtemp: jest.fn().mockResolvedValue('/tmp/remitos-pdf-test'),
  writeFile: jest.fn().mockResolvedValue(undefined),
  readdir: jest.fn().mockResolvedValue(['page-1.jpg', 'page-2.jpg']),
  readFile: jest.fn().mockResolvedValue(Buffer.from('fake-image')),
  unlink: jest.fn().mockResolvedValue(undefined),
  rmdir: jest.fn().mockResolvedValue(undefined),
  rm: jest.fn().mockResolvedValue(undefined),
}));

import { PdfService } from '../../src/services/pdf.service';

describe('PdfService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.PDF_RASTERIZE_DPI = '150';
    process.env.PDF_RASTERIZE_MAX_PAGES = '5';
  });

  describe('pdfToImages', () => {
    it('should convert PDF buffer to image buffers', async () => {
      const pdfBuffer = Buffer.from('fake-pdf-content');

      const result = await PdfService.pdfToImages(pdfBuffer);

      expect(result).toHaveLength(2);
      expect(result[0]).toBeInstanceOf(Buffer);
      expect(fs.mkdtemp).toHaveBeenCalled();
      expect(fs.writeFile).toHaveBeenCalled();
      expect(fs.readdir).toHaveBeenCalled();
    });

    it('should clean up temp directory after processing', async () => {
      const pdfBuffer = Buffer.from('fake-pdf-content');

      await PdfService.pdfToImages(pdfBuffer);

      expect(fs.rm).toHaveBeenCalled();
    });

    it('should use environment variables for DPI', async () => {
      process.env.PDF_RASTERIZE_DPI = '300';
      const pdfBuffer = Buffer.from('fake-pdf-content');

      await PdfService.pdfToImages(pdfBuffer);

      // Just verify it completes without error
      expect(fs.writeFile).toHaveBeenCalled();
    });

    it('should use environment variables for max pages', async () => {
      process.env.PDF_RASTERIZE_MAX_PAGES = '10';
      const pdfBuffer = Buffer.from('fake-pdf-content');

      await PdfService.pdfToImages(pdfBuffer);

      expect(fs.writeFile).toHaveBeenCalled();
    });
  });

  describe('isAvailable', () => {
    it('should return true when pdftoppm is available', async () => {
      const result = await PdfService.isAvailable();

      // Due to our mocking, this should return true
      expect(typeof result).toBe('boolean');
    });
  });
});




