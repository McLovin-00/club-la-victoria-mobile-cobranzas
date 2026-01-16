import sharp from 'sharp';
import { db } from '../config/database';
import { minioService } from './minio.service';
import { AppLogger } from '../config/logger';
import { createError } from '../middlewares/error.middleware';
import { getEnvironment } from '../config/environment';

export class ThumbnailService {
  static buildThumbPath(documentId: number): string {
    return `thumbnails/${documentId}.jpg`;
  }

  static async getSignedUrl(documentId: number): Promise<string> {
    const doc = await db.getClient().document.findUnique({
      where: { id: documentId },
      select: { id: true, tenantEmpresaId: true },
    });
    if (!doc) {
      throw createError('Documento no encontrado', 404, 'DOCUMENT_NOT_FOUND');
    }
    const env = getEnvironment();
    const bucketName = `${env.MINIO_BUCKET_PREFIX}-t${doc.tenantEmpresaId}`;
    const objectPath = this.buildThumbPath(documentId);
    // Reutiliza stat interno de getSignedUrl para verificar existencia; si no existe generamos
    try {
      return await minioService.getSignedUrl(bucketName, objectPath, 3600);
    } catch (err: any) {
      const message = String(err?.message || '').toLowerCase();
      const code = (err?.code || '').toString();
      if (message.includes('not found') || code.includes('404')) {
        // Generar y reintentar
        await this.generate(documentId);
        return await minioService.getSignedUrl(bucketName, objectPath, 3600);
      }
      throw err;
    }
  }

  static async generate(documentId: number): Promise<void> {
    const document = await db.getClient().document.findUnique({
      where: { id: documentId },
      select: { id: true, tenantEmpresaId: true, filePath: true, mimeType: true },
    });
    if (!document) throw createError('Documento no encontrado', 404, 'DOCUMENT_NOT_FOUND');
    const tenantId = document.tenantEmpresaId;
    const [bucketName, ...pathParts] = document.filePath.split('/');
    const objectPath = pathParts.join('/');

    // Solo soportamos imágenes por ahora (KISS). PDFs quedarán para próximo PR.
    if (!/^image\//i.test(document.mimeType)) {
      throw createError('Thumbnail no soportado para este tipo', 415, 'THUMBNAIL_UNSUPPORTED');
    }

    const stream = await minioService.getObject(bucketName, objectPath);
    const buffer = await new Promise<Buffer>((resolve, reject) => {
      const chunks: Buffer[] = [];
      stream.on('data', (c: Buffer) => chunks.push(c));
      stream.on('end', () => resolve(Buffer.concat(chunks)));
      stream.on('error', (e) => reject(e));
    });

    const thumb = await sharp(buffer).rotate().resize({ width: 400, withoutEnlargement: true }).jpeg({ quality: 70 }).toBuffer();
    const thumbPath = this.buildThumbPath(documentId);
    await minioService.uploadObject(tenantId, thumbPath, thumb, 'image/jpeg');
    try {
      AppLogger.debug('🖼️ Thumbnail generado', { documentId, thumbPath });
    } catch {}
  }
}


