import { PDFDocument, rgb } from 'pdf-lib';

export type MediaInput = {
  buffer: Buffer;
  mimeType: string;
  fileName?: string;
};

export const MediaService = {
  isImage(mime: string): boolean {
    return /^image\/(png|jpe?g|webp)$/i.test(mime);
  },

  isPdf(mime: string): boolean {
    return /^application\/pdf$/i.test(mime);
  },

  decodeDataUrl(dataUrl: string): MediaInput {
    // Expected format: data:<mime>;base64,<data>
    const match = /^data:([^;]+);base64,(.+)$/i.exec((dataUrl || '').trim());
    if (!match) {
      throw new Error('Invalid base64 data URL');
    }
    const mimeType = match[1];
    const data = Buffer.from(match[2], 'base64');
    return { buffer: data, mimeType };
  },

  async composePdfFromImages(images: MediaInput[]): Promise<Buffer> {
    if (!images.length) throw new Error('No images to compose');

    const pdf = await PDFDocument.create();

    for (const img of images) {
      const mime = img.mimeType.toLowerCase();
      if (/jpeg|jpg/.test(mime)) {
        const embedded = await pdf.embedJpg(img.buffer);
        const { width, height } = embedded.scale(1);
        const page = pdf.addPage([width, height]);
        page.drawImage(embedded, { x: 0, y: 0, width, height });
      } else if (/png/.test(mime)) {
        const embedded = await pdf.embedPng(img.buffer);
        const { width, height } = embedded.scale(1);
        const page = pdf.addPage([width, height]);
        page.drawImage(embedded, { x: 0, y: 0, width, height });
      } else if (/webp/.test(mime)) {
        // Simple fallback: add a page noting unsupported format
        const page = pdf.addPage([595, 842]);
        page.drawText('Unsupported WEBP at backend. Convert client-side to JPEG/PNG.', {
          x: 50,
          y: 800,
          size: 12,
          color: rgb(0.2, 0.2, 0.2),
        });
      } else {
        const page = pdf.addPage([595, 842]);
        page.drawText(`Unsupported image MIME: ${img.mimeType}`, { x: 50, y: 800, size: 12 });
      }
    }

    const out = await pdf.save();
    return Buffer.from(out);
  },
};

export default MediaService;

