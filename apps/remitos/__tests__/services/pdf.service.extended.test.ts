/**
 * Tests extendidos para pdf.service.ts - cubrir líneas faltantes
 */

import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';

jest.mock('../../src/config/logger', () => ({
  AppLogger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

// Mock fs/promises
jest.mock('fs/promises', () => ({
  mkdtemp: jest.fn().mockResolvedValue('/tmp/remitos-pdf-xyz' as never),
  writeFile: jest.fn().mockResolvedValue(undefined as never),
  readdir: jest.fn().mockResolvedValue(['page-01.jpg', 'page-02.jpg'] as never),
  readFile: jest.fn().mockResolvedValue(Buffer.from('image') as never),
  unlink: jest.fn().mockResolvedValue(undefined as never),
  rmdir: jest.fn().mockResolvedValue(undefined as never),
}));

// Mock child_process con control de comportamiento
let execFileMode: 'success' | 'pdftoppm_fail' | 'both_fail' = 'success';
jest.mock('child_process', () => ({
  execFile: jest.fn((cmd: string, _args: any, opts: any, callback: any) => {
    if (typeof opts === 'function') {
      callback = opts;
    }
    if (callback) {
      if (execFileMode === 'success') {
        callback(null, '', '');
      } else if (execFileMode === 'pdftoppm_fail') {
        if (cmd === 'pdftoppm') {
          callback(new Error('pdftoppm not found'), '', '');
        } else {
          callback(null, '', '');
        }
      } else if (execFileMode === 'both_fail') {
        callback(new Error(`${cmd} not found`), '', '');
      }
    }
    return {} as any;
  }),
}));

describe('PdfService extended', () => {
  let PdfService: any;
  const originalEnv = process.env;

  beforeEach(async () => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
    execFileMode = 'success';
    jest.resetModules();
    const module = await import('../../src/services/pdf.service');
    PdfService = module.PdfService;
  });

  afterEach(() => {
    process.env = originalEnv;
    execFileMode = 'success';
  });

  describe('pdfToImages', () => {
    it('convierte PDF a imágenes', async () => {
      const pdfBuffer = Buffer.from('pdf content');
      const result = await PdfService.pdfToImages(pdfBuffer);
      expect(result.length).toBe(2); // 2 archivos mockeados
    });

    it('usa DPI desde variables de entorno', async () => {
      process.env.PDF_RASTERIZE_DPI = '200';
      process.env.PDF_RASTERIZE_MAX_PAGES = '3';

      const pdfBuffer = Buffer.from('pdf content');
      await PdfService.pdfToImages(pdfBuffer);
      // No debería fallar
    });

    it('usa fallback a pdftocairo si pdftoppm falla', async () => {
      execFileMode = 'pdftoppm_fail';
      jest.resetModules();
      const mod = await import('../../src/services/pdf.service');
      const Svc = mod.PdfService;

      const pdfBuffer = Buffer.from('pdf content');
      const result = await Svc.pdfToImages(pdfBuffer);
      expect(result.length).toBe(2);

      const { AppLogger } = await import('../../src/config/logger');
      expect(AppLogger.warn).toHaveBeenCalledWith(
        '⚠️ pdftoppm falló, intentando pdftocairo',
        expect.any(Object)
      );
    });

    it('falla si ambos pdftoppm y pdftocairo fallan', async () => {
      execFileMode = 'both_fail';
      jest.resetModules();
      const mod = await import('../../src/services/pdf.service');
      const Svc = mod.PdfService;

      const pdfBuffer = Buffer.from('pdf content');
      await expect(Svc.pdfToImages(pdfBuffer)).rejects.toThrow();
    });
  });

  describe('isAvailable', () => {
    it('retorna true si pdftoppm está disponible', async () => {
      execFileMode = 'success';
      jest.resetModules();
      const mod = await import('../../src/services/pdf.service');
      const result = await mod.PdfService.isAvailable();
      expect(result).toBe(true);
    });

    it('retorna true si pdftoppm falla pero pdftocairo está disponible', async () => {
      execFileMode = 'pdftoppm_fail';
      jest.resetModules();
      const mod = await import('../../src/services/pdf.service');
      const result = await mod.PdfService.isAvailable();
      expect(result).toBe(true);
    });

    it('retorna false si ambos fallan', async () => {
      execFileMode = 'both_fail';
      jest.resetModules();
      const mod = await import('../../src/services/pdf.service');
      const result = await mod.PdfService.isAvailable();
      expect(result).toBe(false);
    });
  });
});
