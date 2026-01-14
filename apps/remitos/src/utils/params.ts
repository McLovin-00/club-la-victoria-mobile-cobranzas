import { ParamsDictionary } from 'express-serve-static-core';

/**
 * Parsea un parámetro de ruta a número entero de forma segura.
 * Maneja el caso donde Express 5.x puede retornar string | string[].
 * 
 * @param params - Objeto req.params de Express
 * @param key - Nombre del parámetro a extraer
 * @returns El valor parseado como número entero
 * @throws Error si el parámetro no existe o no es un número válido
 * 
 * @example
 * const id = parseParamId(req.params, 'id');
 */
export function parseParamId(params: ParamsDictionary, key: string): number {
  const value = params[key];
  
  if (value === undefined || value === null) {
    throw new Error(`Parámetro '${key}' es requerido`);
  }
  
  // Manejar caso de array (tomar primer elemento)
  const strValue = Array.isArray(value) ? value[0] : String(value);
  
  const parsed = parseInt(strValue, 10);
  
  if (isNaN(parsed)) {
    throw new Error(`Parámetro '${key}' debe ser un número válido`);
  }
  
  return parsed;
}

/**
 * Parsea un parámetro de ruta a string de forma segura.
 * 
 * @param params - Objeto req.params de Express
 * @param key - Nombre del parámetro a extraer
 * @returns El valor como string
 */
export function parseParamString(params: ParamsDictionary, key: string): string {
  const value = params[key];
  
  if (value === undefined || value === null) {
    throw new Error(`Parámetro '${key}' es requerido`);
  }
  
  return Array.isArray(value) ? value[0] : String(value);
}
