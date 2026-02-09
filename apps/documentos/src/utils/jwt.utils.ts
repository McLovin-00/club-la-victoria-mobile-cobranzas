/**
 * Utilidades JWT para verificación de tokens desde forms/downloads
 * Extraído de rutas para eliminar duplicación de código
 */

let _jwtPublicKey: string | null = null;

/**
 * Obtiene la clave pública JWT cacheada
 */
export function getJwtPublicKey(): string {
  if (_jwtPublicKey) return _jwtPublicKey;
  const fs = require('fs');
  _jwtPublicKey = fs.readFileSync(process.env.JWT_PUBLIC_KEY_PATH || '/keys/jwt_public.pem', 'utf8');
  return _jwtPublicKey as string;
}

/**
 * Verifica un token JWT que viene desde un form-data
 * Usado para descargas directas desde el navegador
 */
export function verifyJwtFromForm(token: string): any | null {
  const jwt = require('jsonwebtoken');
  try {
    return jwt.verify(token, getJwtPublicKey(), { algorithms: ['RS256'] });
  } catch {
    return null;
  }
}
