import rateLimit from 'express-rate-limit';
import { AppLogger } from '../config/logger';

/**
 * Rate limiter para endpoints de autenticación
 * Previene ataques de fuerza bruta limitando intentos de login
 * 
 * Configuración: 5 intentos por IP cada 15 minutos
 */
export const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5, // máximo 5 intentos por ventana
  message: {
    success: false,
    message: 'Demasiados intentos de inicio de sesión. Intente nuevamente en 15 minutos.',
    code: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true, // Incluir headers RateLimit-* en respuesta
  legacyHeaders: false, // No incluir headers X-RateLimit-*
  keyGenerator: (req) => {
    // Usar IP real considerando que puede venir de un proxy
    const forwardedFor = req.headers['x-forwarded-for'];
    const realIp = req.headers['x-real-ip'];
    
    if (typeof forwardedFor === 'string') {
      return forwardedFor.split(',')[0].trim();
    }
    if (typeof realIp === 'string') {
      return realIp;
    }
    return req.ip || 'unknown';
  },
  handler: (req, res) => {
    const ip = req.ip || req.headers['x-forwarded-for'] || 'unknown';
    AppLogger.warn('Rate limit exceeded for login', {
      ip,
      email: req.body?.email || 'unknown',
      userAgent: req.headers['user-agent'],
    });
    
    res.status(429).json({
      success: false,
      message: 'Demasiados intentos de inicio de sesión. Intente nuevamente en 15 minutos.',
      code: 'RATE_LIMIT_EXCEEDED'
    });
  },
  skip: (req) => {
    // No aplicar rate limiting a healthchecks
    return req.path === '/health' || req.path === '/api/health';
  }
});

/**
 * Rate limiter para cambio de contraseña
 * Más restrictivo: 3 intentos por IP cada 30 minutos
 */
export const passwordChangeRateLimiter = rateLimit({
  windowMs: 30 * 60 * 1000, // 30 minutos
  max: 3, // máximo 3 intentos
  message: {
    success: false,
    message: 'Demasiados intentos de cambio de contraseña. Intente más tarde.',
    code: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const forwardedFor = req.headers['x-forwarded-for'];
    if (typeof forwardedFor === 'string') {
      return forwardedFor.split(',')[0].trim();
    }
    return req.ip || 'unknown';
  }
});

/**
 * Rate limiter general para API
 * Menos restrictivo: 100 requests por minuto por IP
 */
export const apiRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: 100, // máximo 100 requests por minuto
  message: {
    success: false,
    message: 'Demasiadas solicitudes. Intente más tarde.',
    code: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const forwardedFor = req.headers['x-forwarded-for'];
    if (typeof forwardedFor === 'string') {
      return forwardedFor.split(',')[0].trim();
    }
    return req.ip || 'unknown';
  },
  skip: (req) => {
    // No aplicar a healthchecks ni websockets
    return req.path.includes('/health') || req.path.includes('/socket.io');
  }
});

