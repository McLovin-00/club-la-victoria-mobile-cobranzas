/**
 * Utilidades para acceder a variables de entorno en runtime.
 * Compatible con Vite (VITE_*) y variables de entorno estándar.
 */

/**
 * Obtiene una variable de entorno por su clave.
 * @param key - Nombre de la variable de entorno
 * @returns El valor de la variable o undefined si no existe
 */
export function getRuntimeEnv(key: string): string | undefined {
  return process.env[key];
}

/**
 * Obtiene una variable de entorno como flag booleano.
 * Retorna true solo si el valor es exactamente "true" (case sensitive).
 * @param key - Nombre de la variable de entorno
 * @returns true si la variable existe y vale "true", false en caso contrario
 */
export function getRuntimeFlag(key: string): boolean {
  return process.env[key] === 'true';
}
