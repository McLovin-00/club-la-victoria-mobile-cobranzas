import { Client as MinIOClient } from 'minio';
import { getEnvironment } from '../config/environment';
import { AppLogger } from '../config/logger';
import { createError } from '../middlewares/error.middleware';

/**
 * MinIO Service - Almacenamiento Elegante y Escalable
 */
export class MinIOService {
  private static instance: MinIOService;
  private client: MinIOClient;
  private bucketPrefix: string;
  private endpointHost!: string;
  private endpointPort!: number;
  private sslEnabled!: boolean;
  // Cliente de firmado con host público (no realiza IO contra MinIO)
  private publicSignerClient?: MinIOClient;
  private publicBaseUrl?: URL;

  private constructor() {
    const env = getEnvironment();
    
    // Parsear endpoint correctamente
    let endPoint = env.MINIO_ENDPOINT.replace('http://', '').replace('https://', '');
    let port = Number.isFinite(env.MINIO_PORT as any) && !Number.isNaN(env.MINIO_PORT as any)
      ? (env.MINIO_PORT as any as number)
      : (env.MINIO_USE_SSL ? 443 : 80);
    
    // Si el endpoint incluye puerto, extraerlo
    if (endPoint.includes(':')) {
      const parts = endPoint.split(':');
      endPoint = parts[0];
      port = parseInt(parts[1]) || port;
    }
    
    // Trim de credenciales para evitar espacios accidentales
    const accessKey = (env.MINIO_ACCESS_KEY || '').trim();
    const secretKey = (env.MINIO_SECRET_KEY || '').trim();

    this.client = new MinIOClient({
      endPoint,
      port,
      useSSL: env.MINIO_USE_SSL,
      accessKey,
      secretKey,
      region: env.MINIO_REGION,
    });

    this.bucketPrefix = env.MINIO_BUCKET_PREFIX;
    this.endpointHost = endPoint;
    this.endpointPort = port;
    this.sslEnabled = env.MINIO_USE_SSL;

    // Inicializar cliente de firmado con host público si está configurado
    if (env.MINIO_PUBLIC_BASE_URL) {
      try {
        this.publicBaseUrl = new URL(env.MINIO_PUBLIC_BASE_URL);
        const pEndPoint = this.publicBaseUrl.hostname;
        const pPort = this.publicBaseUrl.port
          ? parseInt(this.publicBaseUrl.port)
          : this.publicBaseUrl.protocol === 'https:'
          ? 443
          : 80;
        const pSSL = this.publicBaseUrl.protocol === 'https:';
        this.publicSignerClient = new MinIOClient({
          endPoint: pEndPoint,
          port: pPort,
          useSSL: pSSL,
          accessKey,
          secretKey,
          region: env.MINIO_REGION,
        });
      } catch {}
    }

    AppLogger.info('📦 MinIO Service inicializado', {
      endpoint: `${endPoint}:${port}`,
      useSSL: env.MINIO_USE_SSL,
      bucketPrefix: this.bucketPrefix,
    });
  }

  public static getInstance(): MinIOService {
    if (!MinIOService.instance) {
      MinIOService.instance = new MinIOService();
    }
    return MinIOService.instance;
  }

  /**
   * Obtener nombre del bucket para una empresa
   */
  private getBucketName(tenantEmpresaId: number): string {
    return `${this.bucketPrefix}-t${tenantEmpresaId}`;
  }

  /**
   * Crear bucket si no existe
   */
  public async ensureBucketExists(tenantEmpresaId: number): Promise<void> {
    try {
      const bucketName = this.getBucketName(tenantEmpresaId);
      const exists = await this.client.bucketExists(bucketName);
      
      if (!exists) {
        await this.client.makeBucket(bucketName, 'us-east-1');
        AppLogger.info(`📦 Bucket creado: ${bucketName}`);

        // Sin política pública por defecto. Se usará sólo URL firmada para acceso.
      }
    } catch (error) {
      AppLogger.error(`💥 Error al crear bucket para tenant ${tenantEmpresaId}:`, error);
      throw createError('Error al configurar almacenamiento', 500, 'MINIO_BUCKET_ERROR');
    }
  }

  /**
   * Generar path único para documento con nombre estandarizado
   * Formato: {entityType}/{entityId}/{identificador}_{plantilla}.{ext}
   */
  private async generateObjectPath(
    entityType: string,
    entityId: number,
    templateName: string,
    fileName: string
  ): Promise<string> {
    const extension = fileName.split('.').pop() || 'bin';
    
    try {
      // Importar dinámicamente para evitar dependencia circular
      const { FileNamingService } = await import('./file-naming.service');
      const standardizedName = await FileNamingService.generateStandardizedName(
        entityType as any,
        entityId,
        templateName,
        extension
      );
      
      // Path: entityType/entityId/nombreEstandarizado
      return `${entityType.toLowerCase()}/${entityId}/${standardizedName}`;
    } catch (error) {
      // Fallback al formato anterior si falla
      const timestamp = Date.now();
      const sanitizedTemplate = templateName.toLowerCase().replace(/[^a-z0-9]/g, '-');
      return `${entityType.toLowerCase()}/${entityId}/${sanitizedTemplate}/${timestamp}.${extension}`;
    }
  }

  /**
   * Subir documento a MinIO
   */
  public async uploadDocument(
    tenantEmpresaId: number,
    entityType: string,
    entityId: number,
    templateName: string,
    fileName: string,
    fileBuffer: Buffer,
    mimeType: string
  ): Promise<{
    bucketName: string;
    objectPath: string;
    publicUrl?: string;
  }> {
    try {
      await this.ensureBucketExists(tenantEmpresaId);
      
      const bucketName = this.getBucketName(tenantEmpresaId);
      const objectPath = await this.generateObjectPath(entityType, entityId, templateName, fileName);
      
      // Metadatos del archivo (usar prefijo x-amz-meta- para compatibilidad S3)
      const sanitizeMeta = (value: string) => {
        try {
          // Normalizar a ASCII: quitar acentos, caracteres fuera de rango imprimible
          const noAccents = value
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '');
          const ascii = noAccents.replace(/[^\x20-\x7E]/g, '');
          // Limitar longitud y recortar espacios extremos
          return ascii.trim().slice(0, 200) || 'file';
        } catch {
          return 'file';
        }
      };
      const metaData = {
        'Content-Type': mimeType,
        'x-amz-meta-upload-date': new Date().toISOString(),
        'x-amz-meta-entity-type': sanitizeMeta(entityType),
        'x-amz-meta-entity-id': String(entityId),
        'x-amz-meta-template-name': sanitizeMeta(templateName),
        'x-amz-meta-original-name': sanitizeMeta(fileName),
      } as any;
      // Log de depuración si hubo saneo del nombre
      if (sanitizeMeta(fileName) !== fileName) {
        try { AppLogger.debug('🧼 Sanitizado de metadatos (original-name)', { original: fileName, sanitized: sanitizeMeta(fileName) }); } catch {}
      }

      // Subir archivo con reintentos exponenciales ante errores transitorios
      const maxAttempts = 3;
      let _lastError: any = null;
      let uploadInfo: any = null;
      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
          uploadInfo = await this.client.putObject(
            bucketName,
            objectPath,
            fileBuffer,
            fileBuffer.length,
            metaData
          );
          break;
        } catch (err: any) {
          _lastError = err;
          const isSignature = String(err?.message || '').includes('signature we calculated does not match');
          const isConn = /ECONN|ETIMEDOUT|EAI_AGAIN|ENOTFOUND|ECONNRESET|EPIPE/i.test(String(err?.code || err?.name || ''));
          AppLogger.error('💥 Error al subir documento a MinIO:', {
            attempt,
            maxAttempts,
            bucketName,
            objectPath,
            error: (err?.message || '').toString(),
            code: (err?.code || err?.name || '').toString(),
            endpoint: `${this.endpointHost}:${this.endpointPort}`,
            useSSL: this.sslEnabled,
          });
          if (attempt < maxAttempts && (isConn || isSignature)) {
            // backoff exponencial corto
            await new Promise((r) => setTimeout(r, 300 * attempt));
            continue;
          }
          throw err;
        }
      }

      AppLogger.info('📤 Documento subido exitosamente', {
        tenantEmpresaId,
        entityType,
        entityId,
        templateName,
        bucketName,
        objectPath,
        size: fileBuffer.length,
        etag: uploadInfo.etag,
      });

      return {
        bucketName,
        objectPath,
      };
    } catch (error: any) {
      // Log detallado para diagnosticar errores de firma/credenciales
      const errMsg = (error?.message || '').toString();
      const errCode = (error?.code || error?.name || '').toString();
      AppLogger.error('💥 Error al subir documento a MinIO:', {
        error: errMsg,
        code: errCode,
        hint:
          errMsg.includes('signature we calculated does not match')
            ? 'Verifique MINIO_ENDPOINT/puerto, MINIO_USE_SSL y claves de acceso. Revise skew de reloj y proxy.'
            : undefined,
      });
      throw createError('Error al almacenar documento', 500, 'MINIO_UPLOAD_ERROR');
    }
  }

  /**
   * Generar URL firmada para acceso temporal
   */
  public async getSignedUrl(
    bucketName: string,
    objectPath: string,
    expirySeconds: number = 3600
  ): Promise<string> {
    try {
      // Verificar existencia del objeto (y por consecuencia, del bucket) para respuestas claras
      try {
        await this.client.statObject(bucketName, objectPath);
      } catch (statError: any) {
        const message = String(statError?.message || '').toLowerCase();
        const code = (statError?.code || statError?.name || '').toString();
        if (message.includes('nosuchbucket') || code === 'NoSuchBucket') {
          AppLogger.warn('🪣 Bucket no existe al solicitar URL firmada', { bucketName, objectPath });
          throw createError('Bucket de almacenamiento no encontrado', 404, 'MINIO_BUCKET_NOT_FOUND');
        }
        AppLogger.warn('📄 Objeto no encontrado al solicitar URL firmada', { bucketName, objectPath, error: statError?.message });
        throw createError('Archivo no encontrado', 404, 'MINIO_OBJECT_NOT_FOUND');
      }

      // Si hay cliente de firmado público, usarlo para que el Host coincida con la petición externa
      if (this.publicSignerClient) {
        const publicSigned = await this.publicSignerClient.presignedGetObject(
          bucketName,
          objectPath,
          expirySeconds
        );
        try { AppLogger.debug('🔗 URL firmada con host público', { public: this.publicBaseUrl?.toString() }); } catch {}
        return publicSigned;
      }

      const signedUrl = await this.client.presignedGetObject(
        bucketName,
        objectPath,
        expirySeconds
      );

      AppLogger.debug('🔗 URL firmada generada', {
        bucketName,
        objectPath,
        expirySeconds,
      });

      return signedUrl;
    } catch (error) {
      AppLogger.error('💥 Error al generar URL firmada:', error);
      if (error instanceof Error && 'code' in error) {
        // Repropagar errores controlados (e.g., 404 bucket/objeto no encontrado)
        throw error;
      }
      throw createError('Error al generar enlace de acceso', 500, 'MINIO_SIGNED_URL_ERROR');
    }
  }

  /**
   * Generar URL firmada con el endpoint interno (sin usar publicSignerClient)
   */
  public async getSignedUrlInternal(
    bucketName: string,
    objectPath: string,
    expirySeconds: number = 3600
  ): Promise<string> {
    try {
      // Verificar existencia del objeto (y por consecuencia, del bucket) para respuestas claras
      try {
        await this.client.statObject(bucketName, objectPath);
      } catch (statError: any) {
        const message = String(statError?.message || '').toLowerCase();
        const code = (statError?.code || statError?.name || '').toString();
        if (message.includes('nosuchbucket') || code === 'NoSuchBucket') {
          AppLogger.warn('🪣 Bucket no existe al solicitar URL firmada (interna)', { bucketName, objectPath });
          throw createError('Bucket de almacenamiento no encontrado', 404, 'MINIO_BUCKET_NOT_FOUND');
        }
        AppLogger.warn('📄 Objeto no encontrado al solicitar URL firmada (interna)', { bucketName, objectPath, error: statError?.message });
        throw createError('Archivo no encontrado', 404, 'MINIO_OBJECT_NOT_FOUND');
      }

      // Firmar siempre con el cliente interno
      const signedUrl = await this.client.presignedGetObject(
        bucketName,
        objectPath,
        expirySeconds
      );

      try {
        AppLogger.debug('🔗 URL firmada interna generada', {
          bucketName,
          objectPath,
          expirySeconds,
        });
      } catch {}

      return signedUrl;
    } catch (error) {
      AppLogger.error('💥 Error al generar URL firmada interna:', error);
      if (error instanceof Error && 'code' in error) {
        // Repropagar errores controlados (e.g., 404 bucket/objeto no encontrado)
        throw error;
      }
      throw createError('Error al generar enlace de acceso', 500, 'MINIO_SIGNED_URL_ERROR');
    }
  }

  /**
   * Obtener archivo como stream
   */
  public async getObject(bucketName: string, objectPath: string): Promise<NodeJS.ReadableStream> {
    try {
      const stream = await this.client.getObject(bucketName, objectPath);
      
      AppLogger.debug('📥 Stream de objeto obtenido', {
        bucketName,
        objectPath,
      });

      return stream;
    } catch (error) {
      AppLogger.error('💥 Error al obtener objeto de MinIO:', error);
      throw createError('Error al acceder al archivo', 500, 'MINIO_GET_OBJECT_ERROR');
    }
  }

  /**
   * Mover (renombrar) un objeto dentro del mismo bucket
   */
  public async moveObject(
    bucketName: string,
    fromPath: string,
    toPath: string
  ): Promise<void> {
    try {
      // copyObject requiere ruta fuente con prefijo /bucketName
      const src = `/${bucketName}/${fromPath}`;
      await (this.client as any).copyObject(bucketName, toPath, src);
      await this.client.removeObject(bucketName, fromPath);
      AppLogger.info('🚚 Objeto movido en MinIO', { bucketName, fromPath, toPath });
    } catch (error) {
      AppLogger.error('💥 Error al mover objeto en MinIO:', error);
      throw createError('Error al renombrar documento', 500, 'MINIO_MOVE_ERROR');
    }
  }

  /**
   * Eliminar documento de MinIO
   */
  public async deleteDocument(bucketName: string, objectPath: string): Promise<void> {
    try {
      await this.client.removeObject(bucketName, objectPath);
      
      AppLogger.info('🗑️ Documento eliminado de MinIO', {
        bucketName,
        objectPath,
      });
    } catch (error) {
      AppLogger.error('💥 Error al eliminar documento de MinIO:', error);
      throw createError('Error al eliminar documento', 500, 'MINIO_DELETE_ERROR');
    }
  }

  /**
   * Subir thumbnail u otros objetos arbitrarios bajo una ruta conocida.
   */
  public async uploadObject(
    tenantEmpresaId: number,
    objectPath: string,
    buffer: Buffer,
    contentType: string
  ): Promise<{ bucketName: string; objectPath: string }> {
    try {
      await this.ensureBucketExists(tenantEmpresaId);
      const bucketName = this.getBucketName(tenantEmpresaId);
      await this.client.putObject(
        bucketName,
        objectPath,
        buffer,
        buffer.length,
        { 'Content-Type': contentType } as any
      );
      AppLogger.info('📤 Objeto subido', { bucketName, objectPath, size: buffer.length });
      return { bucketName, objectPath };
    } catch (error) {
      AppLogger.error('💥 Error subiendo objeto arbitrario:', error);
      throw createError('Error al almacenar recurso', 500, 'MINIO_UPLOAD_OBJECT_ERROR');
    }
  }

  /**
   * Verificar conectividad con MinIO
   */
  public async healthCheck(): Promise<boolean> {
    try {
      // Intentar listar buckets como health check
      await this.client.listBuckets();
      return true;
    } catch (error) {
      AppLogger.error('💔 MinIO health check failed:', error);
      return false;
    }
  }

  /**
   * Obtener estadísticas de uso
   */
  public async getStorageStats(tenantEmpresaId: number): Promise<{
    bucketName: string;
    objectCount: number;
    totalSize: number;
  }> {
    try {
      const bucketName = this.getBucketName(tenantEmpresaId);
      let objectCount = 0;
      let totalSize = 0;

      const stream = this.client.listObjects(bucketName, '', true);
      
      return new Promise((resolve, reject) => {
        stream.on('data', (obj) => {
          objectCount++;
          totalSize += obj.size || 0;
        });

        stream.on('end', () => {
          resolve({
            bucketName,
            objectCount,
            totalSize,
          });
        });

        stream.on('error', (error) => {
          reject(error);
        });
      });
    } catch (error) {
      AppLogger.error(`💥 Error al obtener estadísticas de storage para tenant ${tenantEmpresaId}:`, error);
      return {
        bucketName: this.getBucketName(tenantEmpresaId),
        objectCount: 0,
        totalSize: 0,
      };
    }
  }
}

// Exportar instancia singleton
export const minioService = MinIOService.getInstance();