import rateLimit from 'express-rate-limit';

/**
 * Rate Limiter - Por Usuario Autenticado
 * 
 * Usa el userId del token JWT como clave para el rate limiting.
 * Si no hay usuario autenticado, usa la IP como fallback.
 */

/**
 * Genera la clave de rate limit basada en el usuario autenticado
 */
const userKeyGenerator = (req: any): string => {
  const user = req.user;
  if (user?.id || user?.userId) {
    return `user:${user.id || user.userId}`;
  }
  // Fallback a IP si no hay usuario autenticado
  return req.ip || req.socket?.remoteAddress || 'unknown';
};

/**
 * Rate Limiter para uploads - Por usuario autenticado
 */
export const uploadRateLimit: any = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  limit: 2000, // Máximo 2000 uploads por usuario por ventana
  message: {
    success: false,
    message: 'Demasiados uploads. Intenta nuevamente en 15 minutos.',
    code: 'RATE_LIMIT_EXCEEDED',
  },
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  keyGenerator: userKeyGenerator,
});

/**
 * Rate Limiter general para API - Por usuario autenticado
 */
export const generalRateLimit: any = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  limit: 5000, // Máximo 5000 requests por usuario por ventana
  message: {
    success: false,
    message: 'Demasiadas peticiones. Intenta nuevamente más tarde.',
    code: 'RATE_LIMIT_EXCEEDED',
  },
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  keyGenerator: userKeyGenerator,
});

/**
 * Rate Limiter estricto para configuración - Por usuario autenticado
 */
export const configRateLimit: any = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutos
  limit: 100, // Máximo 100 cambios de configuración por usuario
  message: {
    success: false,
    message: 'Demasiados cambios de configuración. Espera 5 minutos.',
    code: 'CONFIG_RATE_LIMIT_EXCEEDED',
  },
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  keyGenerator: userKeyGenerator,
});

/**
 * Rate Limiter para aprobación manual - Por usuario autenticado
 */
export const approvalRateLimit: any = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  limit: 500, // 500 acciones de aprobación por minuto por usuario
  message: {
    success: false,
    message: 'Demasiadas acciones de aprobación/rechazo. Intenta nuevamente en breve.',
    code: 'APPROVAL_RATE_LIMIT_EXCEEDED',
  },
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  keyGenerator: userKeyGenerator,
});
