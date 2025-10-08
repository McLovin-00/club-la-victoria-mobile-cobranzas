import rateLimit from 'express-rate-limit';

/**
 * Rate Limiter Simplificado - Compatibilidad Total v7
 */

/**
 * Rate Limiter para uploads - Protección Elegante
 */
export const uploadRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  limit: 50, // Máximo 50 uploads por ventana de tiempo
  message: {
    success: false,
    message: 'Demasiados uploads. Intenta nuevamente en 15 minutos.',
    code: 'RATE_LIMIT_EXCEEDED',
  },
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  // Usar keyGenerator por defecto (compatible con IPv6)
});

/**
 * Rate Limiter general para API - Protección Básica
 */
export const generalRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  limit: 1000, // Máximo 1000 requests por ventana
  message: {
    success: false,
    message: 'Demasiadas peticiones. Intenta nuevamente más tarde.',
    code: 'RATE_LIMIT_EXCEEDED',
  },
  standardHeaders: 'draft-7',
  legacyHeaders: false,
});

/**
 * Rate Limiter estricto para configuración - Solo Superadmins
 */
export const configRateLimit = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutos
  limit: 100, // Máximo 100 cambios de configuración
  message: {
    success: false,
    message: 'Demasiados cambios de configuración. Espera 5 minutos.',
    code: 'CONFIG_RATE_LIMIT_EXCEEDED',
  },
  standardHeaders: 'draft-7',
  legacyHeaders: false,
});

/**
 * Rate Limiter para aprobación manual
 */
export const approvalRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  limit: 60, // 60 acciones por minuto por usuario
  message: {
    success: false,
    message: 'Demasiadas acciones de aprobación/rechazo. Intenta nuevamente en breve.',
    code: 'APPROVAL_RATE_LIMIT_EXCEEDED',
  },
  standardHeaders: 'draft-7',
  legacyHeaders: false,
});