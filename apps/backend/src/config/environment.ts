import { z } from 'zod';
import fs from 'fs';
import path from 'path';

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  BACKEND_PORT: z.coerce.number().int().positive().default(4003),

  CORS_ORIGIN: z.string().optional(),
  FRONTEND_URLS: z.string().optional(),
  FRONTEND_URL: z.string().optional(),

  ENABLE_DOCUMENTOS: z.string().optional(),
  DOCUMENTOS_PORT: z.string().optional(),

  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60_000),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(300),

  JWT_PRIVATE_KEY: z.string().optional(),
  JWT_PRIVATE_KEY_PATH: z.string().optional(),
  JWT_PUBLIC_KEY: z.string().optional(),
  JWT_PUBLIC_KEY_PATH: z.string().optional(),
  JWT_LEGACY_SECRET: z.string().optional(),
});

type Env = z.infer<typeof EnvSchema> & {
  jwtPrivateKey?: string;
  jwtPublicKey?: string;
  enabledServices?: {
    documentos: boolean;
  };
};

let cachedEnv: Env | null = null;

function readFileIfExists(filePath?: string): string | undefined {
  if (!filePath) return undefined;
  try {
    const p = path.resolve(filePath);
    if (fs.existsSync(p)) {
      return fs.readFileSync(p, 'utf8');
    }
  } catch { /* Archivo no accesible */ }
  return undefined;
}

export function getEnvironment(): Env {
  if (cachedEnv) return cachedEnv;
  const parsed = EnvSchema.safeParse(process.env);
  if (!parsed.success) {
    throw new Error(`Invalid environment configuration: ${JSON.stringify(parsed.error.format())}`);
  }
  const env = parsed.data;

  // Cargar claves desde archivo si no están inline
  const priv = env.JWT_PRIVATE_KEY || readFileIfExists(env.JWT_PRIVATE_KEY_PATH);
  const pub = env.JWT_PUBLIC_KEY || readFileIfExists(env.JWT_PUBLIC_KEY_PATH);

  if (!priv || !pub) {
    // Permitimos arrancar si al menos existe LEGACY_SECRET (modo transición), pero lo declaramos explícito
    if (!env.JWT_LEGACY_SECRET) {
      throw new Error('JWT keys are required: set JWT_PRIVATE_KEY(_PATH) and JWT_PUBLIC_KEY(_PATH), or temporary JWT_LEGACY_SECRET');
    }
  }

  // Normalizar claves JWT (reemplazar \n literal por saltos de línea reales)
  const normalizeKey = (key: string | undefined): string | undefined => {
    if (!key) return undefined;
    return key.includes('-----BEGIN') ? key : key.replace(/\\n/g, '\n');
  };

  cachedEnv = {
    ...env,
    jwtPrivateKey: normalizeKey(priv),
    jwtPublicKey: normalizeKey(pub),
    enabledServices: {
      documentos: env.ENABLE_DOCUMENTOS === 'true',
    },
  };
  return cachedEnv;
}


