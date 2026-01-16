import MediaService from '../../src/services/media.service';
import { PDFDocument } from 'pdf-lib';

jest.mock('pdf-lib', () => ({
  PDFDocument: {
    create: jest.fn(),
  },
  rgb: jest.fn(),
}));

describe('MediaService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (PDFDocument.create as jest.Mock).mockResolvedValue({
      embedJpg: jest.fn().mockResolvedValue({ scale: () => ({ width: 100, height: 100 }) }),
      embedPng: jest.fn().mockResolvedValue({ scale: () => ({ width: 100, height: 100 }) }),
      addPage: jest.fn().mockReturnValue({ drawImage: jest.fn(), drawText: jest.fn() }),
      save: jest.fn().mockResolvedValue(new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11])),
    });
  });

  it('isImage/isPdf', () => {
    expect(MediaService.isImage('image/png')).toBe(true);
    expect(MediaService.isImage('image/gif')).toBe(false);
    expect(MediaService.isPdf('application/pdf')).toBe(true);
    expect(MediaService.isPdf('application/json')).toBe(false);
  });

  it('decodeDataUrl parses base64 data url and throws on invalid', () => {
    const out = MediaService.decodeDataUrl('data:image/png;base64,AA==');
    expect(out.mimeType).toBe('image/png');
    expect(out.buffer).toBeInstanceOf(Buffer);
    expect(() => MediaService.decodeDataUrl('nope')).toThrow('Invalid base64 data URL');
  });

  it('composePdfFromImages returns PDF buffer and handles unsupported mimes', async () => {
    await expect(MediaService.composePdfFromImages([])).rejects.toThrow('No images to compose');

    const pdf = await MediaService.composePdfFromImages([
      { buffer: Buffer.from('x'), mimeType: 'image/webp' },
      { buffer: Buffer.from('y'), mimeType: 'image/unknown' },
    ]);
    expect(pdf.length).toBeGreaterThan(10);
  });

  it('composePdfFromImages handles JPG and PNG', async () => {
    const jpg = { buffer: Buffer.alloc(10), mimeType: 'image/jpeg' };
    const png = { buffer: Buffer.alloc(10), mimeType: 'image/png' };

    const pdf = await MediaService.composePdfFromImages([jpg, png]);
    expect(pdf).toBeInstanceOf(Buffer);
  });
});


