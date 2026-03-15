import { Client as MinIOClient } from 'minio';
import { getEnvironment } from '../config/environment';
import { AppLogger } from '../config/logger';

/**
 * MinIO Service para Remitos
 */
class MinIOService {
  private client: MinIOClient;
  private bucketPrefix: string;
  
  constructor() {
    const env = getEnvironment();
    
    let endPoint = env.MINIO_ENDPOINT.replace('http://', '').replace('https://', '');
    let port = env.MINIO_PORT;
    
    if (endPoint.includes(':')) {
      const parts = endPoint.split(':');
      endPoint = parts[0];
      port = parseInt(parts[1]) || port;
    }
    
    this.client = new MinIOClient({
      endPoint,
      port,
      useSSL: env.MINIO_USE_SSL,
      accessKey: env.MINIO_ACCESS_KEY.trim(),
      secretKey: env.MINIO_SECRET_KEY.trim(),
      region: env.MINIO_REGION,
    });
    
    this.bucketPrefix = 'remitos-empresa';
  }
  
  private getBucketName(tenantId: number): string {
    return `${this.bucketPrefix}-${tenantId}`;
  }
  
  private async ensureBucketExists(tenantId: number): Promise<void> {
    const bucketName = this.getBucketName(tenantId);
    const exists = await this.client.bucketExists(bucketName);
    if (!exists) {
      await this.client.makeBucket(bucketName, getEnvironment().MINIO_REGION);
      AppLogger.info(`🪣 Bucket creado: ${bucketName}`);
    }
  }
  
  private generateObjectPath(remitoId: number, fileName: string): string {
    const timestamp = Date.now();
    const safeName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
    return `remitos/${remitoId}/${timestamp}_${safeName}`;
  }
  
  async uploadRemitoImage(
    tenantId: number,
    remitoId: number,
    fileName: string,
    buffer: Buffer,
    mimeType: string
  ): Promise<{ bucketName: string; objectKey: string }> {
    await this.ensureBucketExists(tenantId);
    
    const bucketName = this.getBucketName(tenantId);
    const objectKey = this.generateObjectPath(remitoId, fileName);
    
    await this.client.putObject(bucketName, objectKey, buffer, buffer.length, {
      'Content-Type': mimeType,
      'x-amz-meta-remito-id': String(remitoId),
      'x-amz-meta-upload-date': new Date().toISOString(),
    });
    
    AppLogger.info(`📤 Imagen subida: ${bucketName}/${objectKey}`);
    
    return { bucketName, objectKey };
  }
  
  async getSignedUrl(bucketName: string, objectKey: string, expiry = 3600): Promise<string> {
    const url = await this.client.presignedGetObject(bucketName, objectKey, expiry);
    return url.replace(/^https?:\/\/[^/]+/, '');
  }
  
  async getObject(bucketName: string, objectKey: string, timeoutMs = 30_000): Promise<Buffer> {
    const stream = await this.client.getObject(bucketName, objectKey);
    const chunks: Buffer[] = [];
    
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        stream.destroy();
        reject(new Error(`MinIO getObject timeout (${timeoutMs}ms) para ${bucketName}/${objectKey}`));
      }, timeoutMs);

      stream.on('data', (chunk) => chunks.push(chunk));
      stream.on('end', () => { clearTimeout(timer); resolve(Buffer.concat(chunks)); });
      stream.on('error', (err) => { clearTimeout(timer); reject(err); });
    });
  }
  
  async deleteObject(bucketName: string, objectKey: string): Promise<void> {
    await this.client.removeObject(bucketName, objectKey);
  }
}

export const minioService = new MinIOService();

