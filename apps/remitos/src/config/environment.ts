/**
 * Configuración de entorno - Microservicio Remitos
 */

export interface Environment {
  NODE_ENV: string;
  REMITOS_PORT: number;

  // Database
  REMITOS_DATABASE_URL: string;

  // Redis
  REDIS_HOST: string;
  REDIS_PORT: number;
  REDIS_PASSWORD: string;

  // MinIO
  MINIO_ENDPOINT: string;
  MINIO_PORT: number;
  MINIO_ACCESS_KEY: string;
  MINIO_SECRET_KEY: string;
  MINIO_USE_SSL: boolean;
  MINIO_REGION: string;
  MINIO_BUCKET_PREFIX: string;

  // Frontend URLs (CORS)
  FRONTEND_URLS: string;

  // Tenant por defecto
  DEFAULT_TENANT_ID: number;
}

let cachedEnv: Environment | null = null;

function resolveDatabaseUrl(): string {
  if (process.env.REMITOS_DATABASE_URL) return process.env.REMITOS_DATABASE_URL;
  const docUrl = process.env.DOCUMENTOS_DATABASE_URL;
  if (docUrl) return docUrl.replace('schema=documentos', 'schema=remitos');
  return 'postgresql://localhost:5432/monorepo-bca?schema=remitos';
}

function resolveRedisHost(): string {
  const host = process.env.REDIS_HOST;
  if (!host) return 'localhost';
  return host === 'redis' ? 'localhost' : host;
}

function buildMinioConfig() {
  return {
    MINIO_ENDPOINT: process.env.MINIO_ENDPOINT || 'localhost',
    MINIO_PORT: parseInt(process.env.MINIO_PORT || '9000', 10),
    MINIO_ACCESS_KEY: process.env.MINIO_ACCESS_KEY || '',
    MINIO_SECRET_KEY: process.env.MINIO_SECRET_KEY || '',
    MINIO_USE_SSL: process.env.MINIO_USE_SSL === 'true',
    MINIO_REGION: process.env.MINIO_REGION || 'us-east-1',
    MINIO_BUCKET_PREFIX: process.env.MINIO_BUCKET_PREFIX || 'remitos-empresa',
  };
}

export function getEnvironment(): Environment {
  if (cachedEnv) return cachedEnv;

  cachedEnv = {
    NODE_ENV: process.env.NODE_ENV || 'development',
    REMITOS_PORT: parseInt(process.env.REMITOS_PORT || '4803', 10),
    REMITOS_DATABASE_URL: resolveDatabaseUrl(),
    REDIS_HOST: resolveRedisHost(),
    REDIS_PORT: parseInt(process.env.REDIS_PORT || '6379', 10),
    REDIS_PASSWORD: process.env.REDIS_PASSWORD || '',
    ...buildMinioConfig(),
    FRONTEND_URLS: process.env.FRONTEND_URLS || process.env.FRONTEND_URL || 'http://localhost:8550',
    DEFAULT_TENANT_ID: parseInt(process.env.DEFAULT_TENANT_ID || '1', 10),
  };

  return cachedEnv;
}

export function isServiceEnabled(): boolean {
  return process.env.ENABLE_REMITOS !== 'false';
}

