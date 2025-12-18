import { z } from 'zod';

const envSchema = z.object({
  // Activación del microservicio
  ENABLE_DOCUMENTOS: z.string().transform(val => val === 'true').default('false'),
  
  // Configuración del servicio
  DOCUMENTOS_PORT: z.string().transform(val => parseInt(val)).default('4802'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  
  // Base de datos independiente
  DOCUMENTOS_DATABASE_URL: z.string().min(1),
  
  // Autenticación JWT (RS256)
  JWT_PUBLIC_KEY: z.string().min(1).optional(),
  JWT_PUBLIC_KEY_PATH: z.string().optional(),
  JWT_LEGACY_SECRET: z.string().optional(),
  
  // MinIO Storage
  MINIO_ENDPOINT: z.string().min(1),
  MINIO_PORT: z.string().transform(val => (val ? parseInt(val) : NaN)).optional(),
  MINIO_REGION: z.string().default('us-east-1'),
  MINIO_ACCESS_KEY: z.string().min(1),
  MINIO_SECRET_KEY: z.string().min(1),
  MINIO_USE_SSL: z.string().transform(val => val === 'true').default('false'),
  MINIO_BUCKET_PREFIX: z.string().default('documentos-empresa'),
  MINIO_PUBLIC_BASE_URL: z.string().url().optional(),
  MINIO_INTERNAL_BASE_URL: z.string().url().optional(),
  
  // Flowise IA (Clasificación)
  FLOWISE_ENDPOINT: z.string().url().optional(),
  FLOWISE_API_KEY: z.string().optional(),
  FLOWISE_FLOW_ID: z.string().optional(),
  
  // Flowise IA (Validación de documentos)
  FLOWISE_VALIDATION_ENABLED: z.string().transform(val => val === 'true').default('false'),
  FLOWISE_VALIDATION_BASE_URL: z.string().url().optional(),
  FLOWISE_VALIDATION_FLOW_ID: z.string().optional(),
  FLOWISE_VALIDATION_TIMEOUT: z.string().transform(val => parseInt(val)).default('60000'),
  
  // Redis para queues
  REDIS_URL: z.string().default('redis://localhost:6379'),

  // PDF Rasterization (Poppler)
  PDF_RASTERIZE_ENABLED: z.string().transform(val => val === 'true').default('true'),
  PDF_RASTERIZE_DPI: z.string().transform(val => parseInt(val)).default('200'),
  PDF_RASTERIZE_MAX_PAGES: z.string().transform(val => parseInt(val)).default('0'), // 0 = todas
  PDF_RASTERIZE_CHUNK_SIZE: z.string().transform(val => parseInt(val)).default('5'),
  // Deprecation retention
  DOCS_MAX_DEPRECATED_VERSIONS: z.string().transform(val => parseInt(val)).default('2'),
  // Dashboard thresholds
  DOCS_DUE_SOON_DAYS: z.string().transform(val => parseInt(val)).default('30'),
  
  // Logging
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'http', 'debug', 'trace']).default('info'),

  // CORS/WS: lista de orígenes permitidos separada por comas
  FRONTEND_URLS: z.string().optional(),

  // Antivirus (ClamAV) opcional
  CLAMAV_HOST: z.string().optional(),
  CLAMAV_PORT: z.string().transform(v => parseInt(v)).optional(),
});

export type Environment = z.infer<typeof envSchema>;

let env: Environment;

export const getEnvironment = (): Environment => {
  if (!env) {
    const result = envSchema.safeParse(process.env);
    
    if (!result.success) {
      console.error('❌ Invalid environment configuration:');
      console.error(result.error.format());
      process.exit(1);
    }
    
    env = result.data;
  }
  
  return env;
};

// Verificación de habilitación del servicio
export const isServiceEnabled = (): boolean => {
  return getEnvironment().ENABLE_DOCUMENTOS;
};