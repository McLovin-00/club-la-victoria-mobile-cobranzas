/**
 * Utilidades para acceder a variables de entorno en runtime.
 * Compatible con Vite (VITE_*) y variables de entorno estándar.
 */

type RuntimeEnvValue = string | boolean | undefined;

function getImportMetaEnv(): Record<string, RuntimeEnvValue> | undefined {
  try {
    return (import.meta as ImportMeta & { env?: Record<string, RuntimeEnvValue> }).env;
  } catch {
    return undefined;
  }
}

function getProcessEnv(): Record<string, string | undefined> | undefined {
  if (typeof process === 'undefined') {
    return undefined;
  }

  return process.env;
}

function getRuntimeValue(key: string): RuntimeEnvValue {
  const importMetaEnv = getImportMetaEnv();
  if (importMetaEnv && key in importMetaEnv) {
    return importMetaEnv[key];
  }

  const processEnv = getProcessEnv();
  return processEnv?.[key];
}

/**
 * Obtiene una variable de entorno por su clave.
 * @param key - Nombre de la variable de entorno
 * @returns El valor de la variable o undefined si no existe
 */
export function getRuntimeEnv(key: string): string | undefined {
  const value = getRuntimeValue(key);
  return typeof value === 'string' ? value : undefined;
}

/**
 * Obtiene una variable de entorno como flag booleano.
 * Retorna true solo si el valor es exactamente "true" (case sensitive).
 * @param key - Nombre de la variable de entorno
 * @returns true si la variable existe y vale "true", false en caso contrario
 */
export function getRuntimeFlag(key: string): boolean {
  const value = getRuntimeValue(key);
  return value === true || value === 'true';
}
