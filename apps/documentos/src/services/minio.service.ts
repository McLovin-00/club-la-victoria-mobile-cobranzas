import { Client as MinIOClient } from 'minio';
import { getEnvironment } from '../config/environment';
import { AppLogger } from '../config/logger';
import { createError } from '../middlewares/error.middleware';

// ============================================================================
// HELPERS
// ============================================================================
function sanitizeMetaValue(value: string): string {
  try {
    const noAccents = value.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const ascii = noAccents.replace(/[^\x20-\x7E]/g, '');
    return ascii.trim().slice(0, 200) || 'file';
  } catch {
    return 'file';
  }
}

function isRetryableError(err: any): boolean {
  const isSignature = String(err?.message || '').includes('signature we calculated does not match');
  const isConn = /ECONN|ETIMEDOUT|EAI_AGAIN|ENOTFOUND|ECONNRESET|EPIPE/i.test(String(err?.code || err?.name || ''));
  return isConn || isSignature;
}

function parseEndpoint(endpoint: string, defaultPort: number): { host: string; port: number } {
  let host = endpoint.replace('http://', '').replace('https://', '');
  let port = defaultPort;
  if (host.includes(':')) {
    const parts = host.split(':');
    host = parts[0];
    port = parseInt(parts[1]) || defaultPort;
  }
  return { host, port };
}

async function withRetry<T>(fn: () => Promise<T>, maxAttempts: number, context: string): Promise<T> {
  let lastError: any = null;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err: any) {
      lastError = err;
      AppLogger.error(`💥 ${context} (intento ${attempt}/${maxAttempts}):`, { error: err?.message });
      if (attempt < maxAttempts && isRetryableError(err)) {
        await new Promise((r) => setTimeout(r, 300 * attempt));
        continue;
      }
      throw err;
    }
  }
  throw lastError;
}

// ============================================================================
// SERVICIO PRINCIPAL
// ============================================================================
export class MinIOService {
  private static instance: MinIOService;
  private client: MinIOClient;
  private bucketPrefix: string;
  private endpointHost: string;
  private endpointPort: number;
  private sslEnabled: boolean;
  private publicSignerClient?: MinIOClient;
  private publicBaseUrl?: URL;

  private constructor() {
    const env = getEnvironment();
    const defaultPort = env.MINIO_USE_SSL ? 443 : 80;
    const { host, port } = parseEndpoint(env.MINIO_ENDPOINT, Number(env.MINIO_PORT) || defaultPort);
    const accessKey = (env.MINIO_ACCESS_KEY || '').trim();
    const secretKey = (env.MINIO_SECRET_KEY || '').trim();

    this.client = new MinIOClient({
      endPoint: host,
      port,
      useSSL: env.MINIO_USE_SSL,
      accessKey,
      secretKey,
      region: env.MINIO_REGION,
    });

    this.bucketPrefix = env.MINIO_BUCKET_PREFIX;
    this.endpointHost = host;
    this.endpointPort = port;
    this.sslEnabled = env.MINIO_USE_SSL;

    this.initPublicClient(env, accessKey, secretKey);

    AppLogger.info('📦 MinIO Service inicializado', {
      endpoint: `${host}:${port}`,
      useSSL: env.MINIO_USE_SSL,
      bucketPrefix: this.bucketPrefix,
    });
  }

  private initPublicClient(env: any, accessKey: string, secretKey: string): void {
    if (!env.MINIO_PUBLIC_BASE_URL) return;

    try {
      this.publicBaseUrl = new URL(env.MINIO_PUBLIC_BASE_URL);
      // Determinar puerto: usar el explícito, o el default según protocolo
      let pPort = 80;
      if (this.publicBaseUrl.port) {
        pPort = parseInt(this.publicBaseUrl.port);
      } else if (this.publicBaseUrl.protocol === 'https:') {
        pPort = 443;
      }

      this.publicSignerClient = new MinIOClient({
        endPoint: this.publicBaseUrl.hostname,
        port: pPort,
        useSSL: this.publicBaseUrl.protocol === 'https:',
        accessKey,
        secretKey,
        region: env.MINIO_REGION,
      });
    } catch { /* ignore */ }
  }

  public static getInstance(): MinIOService {
    if (!MinIOService.instance) {
      MinIOService.instance = new MinIOService();
    }
    return MinIOService.instance;
  }

  private getBucketName(tenantEmpresaId: number): string {
    return `${this.bucketPrefix}-t${tenantEmpresaId}`;
  }

  public async ensureBucketExists(tenantEmpresaId: number): Promise<void> {
    try {
      const bucketName = this.getBucketName(tenantEmpresaId);
      const exists = await this.client.bucketExists(bucketName);
      if (!exists) {
        await this.client.makeBucket(bucketName, 'us-east-1');
        AppLogger.info(`📦 Bucket creado: ${bucketName}`);
      }
    } catch (error) {
      AppLogger.error(`💥 Error al crear bucket para tenant ${tenantEmpresaId}:`, error);
      throw createError('Error al configurar almacenamiento', 500, 'MINIO_BUCKET_ERROR');
    }
  }

  private async generateObjectPath(entityType: string, entityId: number, templateName: string, fileName: string): Promise<string> {
    const extension = fileName.split('.').pop() || 'bin';
    try {
      const { FileNamingService } = await import('./file-naming.service');
      const standardizedName = await FileNamingService.generateStandardizedName(entityType as any, entityId, templateName, extension);
      return `${entityType.toLowerCase()}/${entityId}/${standardizedName}`;
    } catch {
      const timestamp = Date.now();
      const sanitized = templateName.toLowerCase().replace(/[^a-z0-9]/g, '-');
      return `${entityType.toLowerCase()}/${entityId}/${sanitized}/${timestamp}.${extension}`;
    }
  }

  public async uploadDocument(
    tenantEmpresaId: number,
    entityType: string,
    entityId: number,
    templateName: string,
    fileName: string,
    fileBuffer: Buffer,
    mimeType: string
  ): Promise<{ bucketName: string; objectPath: string; publicUrl?: string }> {
    try {
      await this.ensureBucketExists(tenantEmpresaId);
      const bucketName = this.getBucketName(tenantEmpresaId);
      const objectPath = await this.generateObjectPath(entityType, entityId, templateName, fileName);

      const metaData = {
        'Content-Type': mimeType,
        'x-amz-meta-upload-date': new Date().toISOString(),
        'x-amz-meta-entity-type': sanitizeMetaValue(entityType),
        'x-amz-meta-entity-id': String(entityId),
        'x-amz-meta-template-name': sanitizeMetaValue(templateName),
        'x-amz-meta-original-name': sanitizeMetaValue(fileName),
      } as any;

      const uploadInfo = await withRetry(
        () => this.client.putObject(bucketName, objectPath, fileBuffer, fileBuffer.length, metaData),
        3,
        'Error subiendo a MinIO'
      );

      AppLogger.info('📤 Documento subido exitosamente', { tenantEmpresaId, entityType, entityId, bucketName, objectPath, size: fileBuffer.length, etag: uploadInfo.etag });
      return { bucketName, objectPath };
    } catch (error: any) {
      const hint = String(error?.message || '').includes('signature we calculated does not match')
        ? 'Verifique MINIO_ENDPOINT/puerto, MINIO_USE_SSL y claves de acceso.'
        : undefined;
      AppLogger.error('💥 Error al subir documento a MinIO:', { error: error?.message, hint });
      throw createError('Error al almacenar documento', 500, 'MINIO_UPLOAD_ERROR');
    }
  }

  private async verifyObjectExists(bucketName: string, objectPath: string): Promise<void> {
    try {
      await this.client.statObject(bucketName, objectPath);
    } catch (err: any) {
      const message = String(err?.message || '').toLowerCase();
      const code = (err?.code || err?.name || '').toString();
      if (message.includes('nosuchbucket') || code === 'NoSuchBucket') {
        throw createError('Bucket de almacenamiento no encontrado', 404, 'MINIO_BUCKET_NOT_FOUND');
      }
      throw createError('Archivo no encontrado', 404, 'MINIO_OBJECT_NOT_FOUND');
    }
  }

  public async getSignedUrl(bucketName: string, objectPath: string, expirySeconds: number = 3600): Promise<string> {
    try {
      await this.verifyObjectExists(bucketName, objectPath);

      if (this.publicSignerClient) {
        return await this.publicSignerClient.presignedGetObject(bucketName, objectPath, expirySeconds);
      }

      return await this.client.presignedGetObject(bucketName, objectPath, expirySeconds);
    } catch (error) {
      AppLogger.error('💥 Error al generar URL firmada:', error);
      if (error instanceof Error && 'code' in error) throw error;
      throw createError('Error al generar enlace de acceso', 500, 'MINIO_SIGNED_URL_ERROR');
    }
  }

  public async getSignedUrlInternal(bucketName: string, objectPath: string, expirySeconds: number = 3600): Promise<string> {
    try {
      await this.verifyObjectExists(bucketName, objectPath);
      return await this.client.presignedGetObject(bucketName, objectPath, expirySeconds);
    } catch (error) {
      AppLogger.error('💥 Error al generar URL firmada interna:', error);
      if (error instanceof Error && 'code' in error) throw error;
      throw createError('Error al generar enlace de acceso', 500, 'MINIO_SIGNED_URL_ERROR');
    }
  }

  public async getObject(bucketName: string, objectPath: string): Promise<NodeJS.ReadableStream> {
    try {
      return await this.client.getObject(bucketName, objectPath);
    } catch (error) {
      AppLogger.error('💥 Error al obtener objeto de MinIO:', error);
      throw createError('Error al acceder al archivo', 500, 'MINIO_GET_OBJECT_ERROR');
    }
  }

  public async getDocumentStream(bucketName: string, objectPath: string): Promise<NodeJS.ReadableStream> {
    return this.getObject(bucketName, objectPath);
  }

  public async moveObject(bucketName: string, fromPath: string, toPath: string): Promise<void> {
    try {
      await (this.client as any).copyObject(bucketName, toPath, `/${bucketName}/${fromPath}`);
      await this.client.removeObject(bucketName, fromPath);
      AppLogger.info('🚚 Objeto movido en MinIO', { bucketName, fromPath, toPath });
    } catch (error) {
      AppLogger.error('💥 Error al mover objeto en MinIO:', error);
      throw createError('Error al renombrar documento', 500, 'MINIO_MOVE_ERROR');
    }
  }

  public async deleteDocument(bucketName: string, objectPath: string): Promise<void> {
    try {
      await this.client.removeObject(bucketName, objectPath);
      AppLogger.info('🗑️ Documento eliminado de MinIO', { bucketName, objectPath });
    } catch (error) {
      AppLogger.error('💥 Error al eliminar documento de MinIO:', error);
      throw createError('Error al eliminar documento', 500, 'MINIO_DELETE_ERROR');
    }
  }

  public async uploadObject(tenantEmpresaId: number, objectPath: string, buffer: Buffer, contentType: string): Promise<{ bucketName: string; objectPath: string }> {
    try {
      await this.ensureBucketExists(tenantEmpresaId);
      const bucketName = this.getBucketName(tenantEmpresaId);
      await this.client.putObject(bucketName, objectPath, buffer, buffer.length, { 'Content-Type': contentType } as any);
      AppLogger.info('📤 Objeto subido', { bucketName, objectPath, size: buffer.length });
      return { bucketName, objectPath };
    } catch (error) {
      AppLogger.error('💥 Error subiendo objeto arbitrario:', error);
      throw createError('Error al almacenar recurso', 500, 'MINIO_UPLOAD_OBJECT_ERROR');
    }
  }

  public async healthCheck(): Promise<boolean> {
    try {
      await this.client.listBuckets();
      return true;
    } catch (error) {
      AppLogger.error('💔 MinIO health check failed:', error);
      return false;
    }
  }

  public getResolvedBucketName(tenantEmpresaId: number): string {
    return this.getBucketName(tenantEmpresaId);
  }

  public async listObjectKeys(tenantEmpresaId: number): Promise<string[]> {
    const bucketName = this.getBucketName(tenantEmpresaId);
    const stream = this.client.listObjects(bucketName, '', true);
    const keys: string[] = [];
    return new Promise((resolve, reject) => {
      stream.on('data', (obj) => { if (obj.name) keys.push(obj.name); });
      stream.on('end', () => resolve(keys));
      stream.on('error', reject);
    });
  }

  public async getStorageStats(tenantEmpresaId: number): Promise<{ bucketName: string; objectCount: number; totalSize: number }> {
    try {
      const bucketName = this.getBucketName(tenantEmpresaId);
      const stream = this.client.listObjects(bucketName, '', true);
      let objectCount = 0;
      let totalSize = 0;

      return new Promise((resolve, reject) => {
        stream.on('data', (obj) => { objectCount++; totalSize += obj.size || 0; });
        stream.on('end', () => resolve({ bucketName, objectCount, totalSize }));
        stream.on('error', reject);
      });
    } catch (error) {
      AppLogger.error(`💥 Error al obtener estadísticas:`, error);
      return { bucketName: this.getBucketName(tenantEmpresaId), objectCount: 0, totalSize: 0 };
    }
  }
}

export const minioService = MinIOService.getInstance();
