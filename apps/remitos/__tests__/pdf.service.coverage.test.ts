/**
 * @jest-environment node
 */

process.env.REMITOS_DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
process.env.NODE_ENV = 'test';

const mockExecFile = jest.fn();
jest.mock('child_process', () => ({ execFile: mockExecFile }));
jest.mock('util', () => ({ promisify: jest.fn(() => mockExecFile) }));

const mockFsPromises = {
  mkdtemp: jest.fn().mockResolvedValue('/tmp/remitos-pdf-test'),
  writeFile: jest.fn().mockResolvedValue(undefined),
  readdir: jest.fn().mockResolvedValue(['page-01.jpg', 'page-02.jpg', 'other.txt']),
  readFile: jest.fn().mockResolvedValue(Buffer.from('image-data')),
  rm: jest.fn().mockResolvedValue(undefined),
};
jest.mock('fs/promises', () => mockFsPromises);
jest.mock('os', () => ({ tmpdir: jest.fn().mockReturnValue('/tmp') }));
jest.mock('../src/config/logger', () => ({
  AppLogger: { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

import { PdfService } from '../src/services/pdf.service';

describe('PdfService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.PDF_RASTERIZE_DPI;
    delete process.env.PDF_RASTERIZE_MAX_PAGES;
  });

  describe('pdfToImages', () => {
    it('converts PDF to images successfully (2 pages)', async () => {
      mockExecFile.mockResolvedValue({ stdout: '', stderr: '' });

      const result = await PdfService.pdfToImages(Buffer.alloc(100));
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual(Buffer.from('image-data'));
      expect(mockFsPromises.mkdtemp).toHaveBeenCalled();
      expect(mockFsPromises.writeFile).toHaveBeenCalled();
      expect(mockFsPromises.rm).toHaveBeenCalled();
    });

    it('throws when PDF is too large (>50MB)', async () => {
      const bigBuffer = Buffer.alloc(51 * 1024 * 1024);
      await expect(PdfService.pdfToImages(bigBuffer)).rejects.toThrow('PDF demasiado grande');
    });

    it('falls back to pdftocairo when pdftoppm fails', async () => {
      mockExecFile
        .mockRejectedValueOnce(new Error('pdftoppm not found'))
        .mockResolvedValueOnce({ stdout: '', stderr: '' });

      const result = await PdfService.pdfToImages(Buffer.alloc(100));
      expect(result).toHaveLength(2);
      expect(mockExecFile).toHaveBeenCalledTimes(2);
      expect(mockExecFile.mock.calls[1][0]).toBe('pdftocairo');
    });

    it('uses DPI from environment variable', async () => {
      process.env.PDF_RASTERIZE_DPI = '300';
      mockExecFile.mockResolvedValue({ stdout: '', stderr: '' });

      await PdfService.pdfToImages(Buffer.alloc(100));
      const args = mockExecFile.mock.calls[0][1];
      expect(args).toContain('300');
    });

    it('uses maxPages from environment variable', async () => {
      process.env.PDF_RASTERIZE_MAX_PAGES = '10';
      mockExecFile.mockResolvedValue({ stdout: '', stderr: '' });

      await PdfService.pdfToImages(Buffer.alloc(100));
      const args = mockExecFile.mock.calls[0][1];
      expect(args).toContain('10');
    });

    it('falls back to default DPI=150 when env var is NaN', async () => {
      process.env.PDF_RASTERIZE_DPI = 'abc';
      mockExecFile.mockResolvedValue({ stdout: '', stderr: '' });

      await PdfService.pdfToImages(Buffer.alloc(100));
      const args = mockExecFile.mock.calls[0][1];
      expect(args).toContain('150');
    });

    it('falls back to default maxPages=5 when env var is NaN', async () => {
      process.env.PDF_RASTERIZE_MAX_PAGES = 'xyz';
      mockExecFile.mockResolvedValue({ stdout: '', stderr: '' });

      await PdfService.pdfToImages(Buffer.alloc(100));
      const args = mockExecFile.mock.calls[0][1];
      expect(args).toContain('5');
    });

    it('cleans up temp dir even when error occurs', async () => {
      mockExecFile.mockRejectedValue(new Error('fail'));

      await expect(PdfService.pdfToImages(Buffer.alloc(100))).rejects.toThrow('fail');
      expect(mockFsPromises.rm).toHaveBeenCalledWith('/tmp/remitos-pdf-test', { recursive: true, force: true });
    });

    it('silently ignores cleanup failure', async () => {
      mockExecFile.mockResolvedValue({ stdout: '', stderr: '' });
      mockFsPromises.rm.mockRejectedValueOnce(new Error('rm failed'));

      const result = await PdfService.pdfToImages(Buffer.alloc(100));
      expect(result).toHaveLength(2);
    });
  });

  describe('isAvailable', () => {
    it('returns true when pdftoppm is available', async () => {
      mockExecFile.mockResolvedValue({ stdout: 'v1.0', stderr: '' });
      const result = await PdfService.isAvailable();
      expect(result).toBe(true);
    });

    it('returns true via pdftocairo fallback when pdftoppm fails', async () => {
      mockExecFile
        .mockRejectedValueOnce(new Error('not found'))
        .mockResolvedValueOnce({ stdout: 'v1.0', stderr: '' });

      const result = await PdfService.isAvailable();
      expect(result).toBe(true);
      expect(mockExecFile).toHaveBeenCalledTimes(2);
    });

    it('returns false when both tools fail', async () => {
      mockExecFile
        .mockRejectedValueOnce(new Error('no pdftoppm'))
        .mockRejectedValueOnce(new Error('no pdftocairo'));

      const result = await PdfService.isAvailable();
      expect(result).toBe(false);
    });
  });
});
