import { PDFDocument, rgb } from 'pdf-lib';
import sharp from 'sharp';
import { AppLogger } from '../config/logger';

export type MediaInput = {
  buffer: Buffer;
  mimeType: string;
  fileName?: string;
};

export const MediaService = {
  
  isImage(mime: string): boolean {
    return /^image\/(png|jpe?g|gif|webp)$/i.test(mime);
  },
  
  isPdf(mime: string): boolean {
    return /^application\/pdf$/i.test(mime);
  },
  
  /**
   * Decodificar data URL base64 a Buffer
   */
  decodeDataUrl(dataUrl: string): MediaInput {
    const match = /^data:([^;]+);base64,(.+)$/i.exec((dataUrl || '').trim());
    if (!match) {
      throw new Error('Invalid base64 data URL');
    }
    const mimeType = match[1];
    const data = Buffer.from(match[2], 'base64');
    return { buffer: data, mimeType };
  },
  
  /**
   * Componer múltiples imágenes en un único PDF
   */
  async composePdfFromImages(images: MediaInput[]): Promise<Buffer> {
    if (!images.length) throw new Error('No images to compose');
    
    const pdf = await PDFDocument.create();
    
    for (const img of images) {
      try {
        let jpgBuffer: Buffer;
        
        // Convertir a JPG si no es JPG/PNG (webp, gif, etc.)
        if (/jpeg|jpg/i.test(img.mimeType)) {
          jpgBuffer = img.buffer;
        } else if (/png/i.test(img.mimeType)) {
          // PNG se puede embeber directamente
          const embedded = await pdf.embedPng(img.buffer);
          const { width, height } = embedded.scale(1);
          const page = pdf.addPage([width, height]);
          page.drawImage(embedded, { x: 0, y: 0, width, height });
          continue;
        } else {
          // Convertir otros formatos a JPG
          jpgBuffer = await sharp(img.buffer)
            .rotate()
            .jpeg({ quality: 90 })
            .toBuffer();
        }
        
        const embedded = await pdf.embedJpg(jpgBuffer);
        const { width, height } = embedded.scale(1);
        const page = pdf.addPage([width, height]);
        page.drawImage(embedded, { x: 0, y: 0, width, height });
        
      } catch (err) {
        AppLogger.warn(`⚠️ No se pudo procesar imagen: ${err}`);
        const page = pdf.addPage([595, 842]);
        page.drawText(`Error procesando imagen: ${img.fileName || 'unknown'}`, {
          x: 50, y: 800, size: 12, color: rgb(0.8, 0.2, 0.2),
        });
      }
    }
    
    const out = await pdf.save();
    return Buffer.from(out);
  },
  
  /**
   * Extraer primera página de PDF como imagen (para enviar a Flowise)
   * Nota: Esto requiere pdf-poppler o similar para rasterizar PDFs.
   * Por ahora usamos un enfoque simplificado con Sharp.
   */
  async pdfToImages(pdfBuffer: Buffer): Promise<Buffer[]> {
    // pdf-lib no puede rasterizar. Para MVP, convertimos a imagen de baja resolución
    // usando la primera página como placeholder. En producción se usaría pdf2pic o similar.
    
    AppLogger.info('📄 Convirtiendo PDF a imágenes para análisis...');
    
    // Por ahora, retornamos el buffer como está indicando que es PDF
    // El worker deberá usar pdf2pic o pdf-poppler si está disponible
    return [pdfBuffer];
  },
  
  /**
   * Normalizar imagen (rotar, optimizar) 
   */
  async normalizeImage(buffer: Buffer): Promise<Buffer> {
    return sharp(buffer)
      .rotate()  // Auto-rotate según EXIF
      .jpeg({ quality: 85 })
      .toBuffer();
  },
  
  /**
   * Redimensionar imagen para envío a Flowise (máx 2000px)
   */
  async resizeForAnalysis(buffer: Buffer, maxDim = 2000): Promise<Buffer> {
    return sharp(buffer)
      .rotate()
      .resize({ width: maxDim, height: maxDim, fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 85 })
      .toBuffer();
  },
  
  /**
   * Componer múltiples imágenes en una sola imagen (grid vertical)
   * Útil para enviar varias fotos como una sola a Flowise
   */
  async composeImageGrid(images: Buffer[]): Promise<Buffer> {
    if (images.length === 0) throw new Error('No images');
    if (images.length === 1) return images[0];
    
    // Obtener metadatos de todas las imágenes
    const metaPromises = images.map(buf => sharp(buf).metadata());
    const metas = await Promise.all(metaPromises);
    
    // Calcular dimensiones del canvas
    const maxWidth = Math.max(...metas.map(m => m.width || 800));
    let totalHeight = 0;
    const composites: sharp.OverlayOptions[] = [];
    
    for (let i = 0; i < images.length; i++) {
      const resized = await sharp(images[i])
        .rotate()
        .resize({ width: maxWidth, fit: 'inside' })
        .jpeg({ quality: 85 })
        .toBuffer();
      
      const meta = await sharp(resized).metadata();
      
      composites.push({
        input: resized,
        top: totalHeight,
        left: 0,
      });
      
      totalHeight += meta.height || 600;
    }
    
    // Crear canvas y componer
    return sharp({
      create: {
        width: maxWidth,
        height: totalHeight,
        channels: 3,
        background: { r: 255, g: 255, b: 255 },
      },
    })
      .composite(composites)
      .jpeg({ quality: 85 })
      .toBuffer();
  },
};

export default MediaService;

