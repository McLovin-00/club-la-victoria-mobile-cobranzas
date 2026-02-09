/**
 * Tests reales para MediaService (src/services/media.service.ts)
 * @jest-environment node
 */

jest.mock('../../src/config/logger', () => ({
  AppLogger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

// Mock pdf-lib
const addPage = jest.fn(() => ({
  drawImage: jest.fn(),
  drawText: jest.fn(),
}));
const pdfMock = {
  embedPng: jest.fn(),
  embedJpg: jest.fn(),
  addPage,
  save: jest.fn().mockResolvedValue(Uint8Array.from([1, 2, 3])),
};
jest.mock('pdf-lib', () => ({
  PDFDocument: {
    create: jest.fn().mockResolvedValue(pdfMock),
  },
  rgb: jest.fn(),
}));

// Mock sharp (chainable)
const sharpToBuffer = jest.fn().mockResolvedValue(Buffer.from('jpg'));
const sharpMetadata = jest.fn().mockResolvedValue({ width: 800, height: 600 });
const sharpComposite = jest.fn().mockReturnValue({ jpeg: () => ({ toBuffer: sharpToBuffer }) });
const sharpResize = jest.fn().mockReturnValue({ jpeg: () => ({ toBuffer: sharpToBuffer }), rotate: () => ({ resize: sharpResize, jpeg: () => ({ toBuffer: sharpToBuffer }) }) });
const sharpRotate = jest.fn().mockReturnValue({ jpeg: () => ({ toBuffer: sharpToBuffer }), resize: sharpResize });
const sharpFactory: any = jest.fn(() => ({
  rotate: sharpRotate,
  jpeg: () => ({ toBuffer: sharpToBuffer }),
  resize: sharpResize,
  metadata: sharpMetadata,
  composite: sharpComposite,
}));
sharpFactory.metadata = sharpMetadata;
jest.mock('sharp', () => ({
  __esModule: true,
  default: sharpFactory,
}));

import { MediaService } from '../../src/services/media.service';

describe('MediaService (real)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('isImage / isPdf', () => {
    expect(MediaService.isImage('image/jpeg')).toBe(true);
    expect(MediaService.isImage('application/pdf')).toBe(false);
    expect(MediaService.isPdf('application/pdf')).toBe(true);
  });

  it('decodeDataUrl: throws on invalid', () => {
    expect(() => MediaService.decodeDataUrl('nope')).toThrow('Invalid base64 data URL');
  });

  it('decodeDataUrl: decodes valid data URL', () => {
    const out = MediaService.decodeDataUrl('data:image/jpeg;base64,aGVsbG8=');
    expect(out.mimeType).toBe('image/jpeg');
    expect(out.buffer).toBeInstanceOf(Buffer);
  });

  it('composePdfFromImages: throws when empty', async () => {
    await expect(MediaService.composePdfFromImages([])).rejects.toThrow('No images to compose');
  });

  it('composePdfFromImages: embeds png and jpg paths', async () => {
    pdfMock.embedPng.mockResolvedValue({ scale: () => ({ width: 100, height: 200 }) });
    pdfMock.embedJpg.mockResolvedValue({ scale: () => ({ width: 100, height: 200 }) });

    const out = await MediaService.composePdfFromImages([
      { buffer: Buffer.from('png'), mimeType: 'image/png', fileName: 'a.png' },
      { buffer: Buffer.from('jpg'), mimeType: 'image/jpeg', fileName: 'b.jpg' },
      { buffer: Buffer.from('webp'), mimeType: 'image/webp', fileName: 'c.webp' },
    ]);

    expect(out).toBeInstanceOf(Buffer);
    expect(pdfMock.embedPng).toHaveBeenCalled();
    expect(pdfMock.embedJpg).toHaveBeenCalled();
  });

  it('composeImageGrid: returns single when one image', async () => {
    const b = Buffer.from('one');
    const out = await MediaService.composeImageGrid([b]);
    expect(out).toBe(b);
  });
});


