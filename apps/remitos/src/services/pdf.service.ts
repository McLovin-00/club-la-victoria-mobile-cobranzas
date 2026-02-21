import { promisify } from 'util';
import { execFile } from 'child_process';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { AppLogger } from '../config/logger';

const exec = promisify(execFile);

export class PdfService {
  
  /**
   * Convertir PDF a imágenes usando Poppler (pdftoppm)
   * Retorna array de buffers de imágenes JPEG
   */
  static async pdfToImages(pdfBuffer: Buffer): Promise<Buffer[]> {
    // Validar tamaño antes de procesar (50MB max)
    const MAX_PDF_SIZE = 50 * 1024 * 1024;
    if (pdfBuffer.length > MAX_PDF_SIZE) {
      throw new Error(`PDF demasiado grande (${Math.round(pdfBuffer.length / 1024 / 1024)}MB). Máximo: ${MAX_PDF_SIZE / 1024 / 1024}MB`);
    }

    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'remitos-pdf-'));
    const pdfPath = path.join(tmpDir, 'document.pdf');
    const outPrefix = path.join(tmpDir, 'page');
    
    try {
      // Escribir PDF a disco temporal
      await fs.writeFile(pdfPath, pdfBuffer);
      
      // Configuración de rasterización con rangos seguros
      const rawDpi = parseInt(process.env.PDF_RASTERIZE_DPI || '150', 10);
      const dpi = Math.min(Math.max(isNaN(rawDpi) ? 150 : rawDpi, 72), 600);
      const rawMaxPages = parseInt(process.env.PDF_RASTERIZE_MAX_PAGES || '5', 10);
      const maxPages = Math.min(Math.max(isNaN(rawMaxPages) ? 5 : rawMaxPages, 1), 20);
      
      // Construir argumentos para pdftoppm
      const args = [
        '-jpeg',          // Salida JPEG
        '-r', String(dpi), // DPI
        '-jpegopt', 'quality=80', // Calidad JPEG
      ];
      
      // Limitar páginas si está configurado
      if (maxPages > 0) {
        args.push('-l', String(maxPages)); // -l = last page
      }
      
      args.push(pdfPath, outPrefix);
      
      AppLogger.info('📄 Rasterizando PDF a imágenes', { dpi, maxPages });
      
      // Ejecutar pdftoppm
      try {
        await exec('pdftoppm', args, { timeout: 60000 });
      } catch (err: any) {
        AppLogger.warn('⚠️ pdftoppm falló, intentando pdftocairo', { message: err.message });
        
        // Fallback a pdftocairo
        const cairoArgs = [
          '-jpeg',
          '-r', String(dpi),
        ];
        if (maxPages > 0) {
          cairoArgs.push('-l', String(maxPages));
        }
        cairoArgs.push(pdfPath, outPrefix);
        
        await exec('pdftocairo', cairoArgs, { timeout: 60000 });
      }
      
      // Leer imágenes generadas
      const files = await fs.readdir(tmpDir);
      const imageFiles = files
        .filter(f => f.startsWith('page') && (f.endsWith('.jpg') || f.endsWith('.jpeg')))
        .sort((a, b) => a.localeCompare(b)); // Ordenar por nombre para mantener orden de páginas
      
      const imageBuffers: Buffer[] = [];
      for (const file of imageFiles) {
        const buf = await fs.readFile(path.join(tmpDir, file));
        imageBuffers.push(buf);
      }
      
      AppLogger.info(`📸 PDF rasterizado: ${imageBuffers.length} páginas`);
      
      return imageBuffers;
      
    } finally {
      // Limpiar directorio temporal
      try {
        await fs.rm(tmpDir, { recursive: true, force: true });
      } catch {
        // Ignorar errores de limpieza
      }
    }
  }
  
  /**
   * Verificar si poppler está disponible
   */
  static async isAvailable(): Promise<boolean> {
    try {
      await exec('pdftoppm', ['-v'], { timeout: 5000 });
      return true;
    } catch {
      try {
        await exec('pdftocairo', ['-v'], { timeout: 5000 });
        return true;
      } catch {
        return false;
      }
    }
  }
}

