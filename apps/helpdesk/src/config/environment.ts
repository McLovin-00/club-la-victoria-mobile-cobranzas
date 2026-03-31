import { z } from 'zod';

const envSchema = z.object({
  // Activación del microservicio
  ENABLE_HELPDESK: z.string().transform(val => val === 'true').default('true'),
  
  // Configuración del servicio
  HELPDESK_PORT: z.string().transform(val => parseInt(val)).default('4803'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  
  // Base de datos independiente (schema helpdesk)
  DATABASE_URL: z.string().min(1),
  HELPDESK_DATABASE_URL: z.string().min(1).optional(),
  
  // Autenticación JWT (RS256) - reutiliza las claves del backend
  JWT_PUBLIC_KEY: z.string().min(1).optional(),
  JWT_PUBLIC_KEY_PATH: z.string().optional(),
  JWT_LEGACY_SECRET: z.string().optional(),
  
  // Telegram Bot
  TELEGRAM_BOT_TOKEN: z.string().min(1),
  // IDs de grupos de resolvers (opcional; si están seteados, se sincronizan al arranque)
  HELPDESK_TELEGRAM_GROUP_TECHNICAL_ID: z.string().min(1).optional(),
  HELPDESK_TELEGRAM_GROUP_OPERATIONAL_ID: z.string().min(1).optional(),
  
  // MinIO Storage (compartido con documentos)
  MINIO_ENDPOINT: z.string().min(1),
  MINIO_PORT: z.string().transform(val => (val ? parseInt(val) : NaN)).optional(),
  MINIO_REGION: z.string().default('us-east-1'),
  MINIO_ACCESS_KEY: z.string().min(1),
  MINIO_SECRET_KEY: z.string().min(1),
  MINIO_USE_SSL: z.string().transform(val => val === 'true').default('false'),
  MINIO_BUCKET_PREFIX: z.string().default('helpdesk'),
  MINIO_PUBLIC_BASE_URL: z.string().url().optional(),
  MINIO_INTERNAL_BASE_URL: z.string().url().optional(),
  
  // Redis para queues y Socket.IO
  REDIS_URL: z.string().default('redis://localhost:6379'),
  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z.string().transform(val => parseInt(val)).default('6379'),
  
  // Helpdesk specific
  AUTO_CLOSE_HOURS: z.string().transform(val => parseInt(val)).default('72'),
  REOPEN_ALLOWED_HOURS: z.string().transform(val => parseInt(val)).default('72'),
  
  // Logging
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'http', 'debug', 'trace']).default('info'),

  // CORS/WS: lista de orígenes permitidos separada por comas
  FRONTEND_URLS: z.string().optional(),
  FRONTEND_URL: z.string().optional(),
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
  return getEnvironment().ENABLE_HELPDESK;
};
