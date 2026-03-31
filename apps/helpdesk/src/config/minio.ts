import { Client as MinioClient } from 'minio';
import { AppLogger } from './logger';
import { getEnvironment } from './environment';

let minioClient: MinioClient | null = null;

export const getMinioClient = (): MinioClient => {
  if (!minioClient) {
    const env = getEnvironment();
    
    minioClient = new MinioClient({
      endPoint: env.MINIO_ENDPOINT,
      port: env.MINIO_PORT || 9000,
      useSSL: env.MINIO_USE_SSL,
      accessKey: env.MINIO_ACCESS_KEY,
      secretKey: env.MINIO_SECRET_KEY,
      region: env.MINIO_REGION,
    });

    AppLogger.info('✅ Cliente MinIO inicializado');
  }

  return minioClient;
};

/**
 * Inicializa el bucket de helpdesk si no existe
 */
export const initializeBucket = async (): Promise<void> => {
  const client = getMinioClient();
  const env = getEnvironment();
  const bucketName = `${env.MINIO_BUCKET_PREFIX}-attachments`;

  try {
    const exists = await client.bucketExists(bucketName);
    
    if (!exists) {
      await client.makeBucket(bucketName, env.MINIO_REGION);
      AppLogger.info(`🪣 Bucket creado: ${bucketName}`);
      
      // Set bucket policy for public read (optional - for public attachments)
      // For now, we'll use presigned URLs instead
    } else {
      AppLogger.debug(`🪣 Bucket ya existe: ${bucketName}`);
    }
  } catch (error) {
    AppLogger.error(`❌ Error inicializando bucket MinIO: ${bucketName}`, error);
    throw error;
  }
};

/**
 * Genera una presigned URL para descargar un archivo
 */
export const getPresignedUrl = async (objectName: string, expirySeconds: number = 3600): Promise<string> => {
  const client = getMinioClient();
  const env = getEnvironment();
  const bucketName = `${env.MINIO_BUCKET_PREFIX}-attachments`;

  return client.presignedGetObject(bucketName, objectName, expirySeconds);
};

/**
 * Sube un archivo a MinIO
 */
export const uploadFile = async (
  objectName: string,
  buffer: Buffer,
  metadata: Record<string, string>
): Promise<void> => {
  const client = getMinioClient();
  const env = getEnvironment();
  const bucketName = `${env.MINIO_BUCKET_PREFIX}-attachments`;

  await client.putObject(
    bucketName,
    objectName,
    buffer,
    buffer.length,
    metadata
  );
};

/**
 * Descarga un archivo de MinIO en memoria.
 */
export const downloadFile = async (objectName: string): Promise<Buffer> => {
  const client = getMinioClient();
  const env = getEnvironment();
  const bucketName = `${env.MINIO_BUCKET_PREFIX}-attachments`;

  const stream = await client.getObject(bucketName, objectName);

  return new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = [];

    stream.on('data', chunk => {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    });

    stream.on('end', () => {
      resolve(Buffer.concat(chunks));
    });

    stream.on('error', reject);
  });
};

export const closeMinio = (): void => {
  // MinIO client doesn't have a close method, just clear reference
  minioClient = null;
  AppLogger.info('🔌 MinIO client liberado');
};
