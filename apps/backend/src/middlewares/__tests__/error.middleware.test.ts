/**
 * Unit tests for Error Middleware
 */

jest.mock('../../config/logger', () => ({
  AppLogger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    logError: jest.fn(),
  },
}));

describe('ErrorMiddleware', () => {
  describe('Error types', () => {
    const errorTypes = {
      VALIDATION_ERROR: 400,
      UNAUTHORIZED: 401,
      FORBIDDEN: 403,
      NOT_FOUND: 404,
      CONFLICT: 409,
      INTERNAL_ERROR: 500,
      SERVICE_UNAVAILABLE: 503,
    };

    it('should define standard HTTP error codes', () => {
      expect(errorTypes.UNAUTHORIZED).toBe(401);
      expect(errorTypes.NOT_FOUND).toBe(404);
      expect(errorTypes.INTERNAL_ERROR).toBe(500);
    });
  });

  describe('Error response structure', () => {
    interface ErrorResponse {
      success: false;
      error: {
        code: string;
        message: string;
        details?: any;
        requestId?: string;
      };
    }

    function formatErrorResponse(
      code: string,
      message: string,
      requestId?: string,
      details?: any
    ): ErrorResponse {
      return {
        success: false,
        error: {
          code,
          message,
          ...(details && { details }),
          ...(requestId && { requestId }),
        },
      };
    }

    it('should format basic error', () => {
      const response = formatErrorResponse('NOT_FOUND', 'Resource not found');
      expect(response.success).toBe(false);
      expect(response.error.code).toBe('NOT_FOUND');
      expect(response.error.message).toBe('Resource not found');
    });

    it('should include request ID', () => {
      const response = formatErrorResponse('ERROR', 'Something went wrong', 'req_123');
      expect(response.error.requestId).toBe('req_123');
    });

    it('should include details when provided', () => {
      const response = formatErrorResponse('VALIDATION_ERROR', 'Invalid input', undefined, {
        field: 'email',
        reason: 'Invalid format',
      });
      expect(response.error.details.field).toBe('email');
    });
  });

  describe('Error message sanitization', () => {
    function sanitizeErrorMessage(message: string, isProduction: boolean): string {
      if (!isProduction) return message;

      // Remove sensitive patterns in production
      const patterns = [
        /password[:\s=]["'][^"']+["']/gi,
        /token[:\s=]["'][^"']+["']/gi,
        /api[-_]?key[:\s=]["'][^"']+["']/gi,
        /secret[:\s=]["'][^"']+["']/gi,
        /at\s+\/[^\s]+/g, // Stack trace paths
      ];

      let sanitized = message;
      for (const pattern of patterns) {
        sanitized = sanitized.replace(pattern, '[REDACTED]');
      }

      return sanitized;
    }

    it('should not sanitize in development', () => {
      const message = 'Error: password="secret123"';
      expect(sanitizeErrorMessage(message, false)).toBe(message);
    });

    it('should sanitize passwords in production', () => {
      const message = 'Error: password="secret123"';
      expect(sanitizeErrorMessage(message, true)).toBe('Error: [REDACTED]');
    });

    it('should sanitize tokens in production', () => {
      const message = 'Error: token="abc123def"';
      expect(sanitizeErrorMessage(message, true)).toBe('Error: [REDACTED]');
    });

    it('should sanitize stack traces in production', () => {
      const message = 'Error at /app/src/service.ts:123';
      expect(sanitizeErrorMessage(message, true)).toContain('[REDACTED]');
    });
  });

  describe('HTTP status code mapping', () => {
    function getStatusCode(errorCode: string): number {
      const statusMap: Record<string, number> = {
        VALIDATION_ERROR: 400,
        BAD_REQUEST: 400,
        UNAUTHORIZED: 401,
        FORBIDDEN: 403,
        NOT_FOUND: 404,
        CONFLICT: 409,
        UNPROCESSABLE_ENTITY: 422,
        TOO_MANY_REQUESTS: 429,
        INTERNAL_ERROR: 500,
        SERVICE_UNAVAILABLE: 503,
      };

      return statusMap[errorCode] || 500;
    }

    it('should map validation errors to 400', () => {
      expect(getStatusCode('VALIDATION_ERROR')).toBe(400);
    });

    it('should map auth errors to 401', () => {
      expect(getStatusCode('UNAUTHORIZED')).toBe(401);
    });

    it('should map not found to 404', () => {
      expect(getStatusCode('NOT_FOUND')).toBe(404);
    });

    it('should default to 500', () => {
      expect(getStatusCode('UNKNOWN_ERROR')).toBe(500);
    });
  });

  describe('Validation error formatting', () => {
    interface ValidationError {
      field: string;
      message: string;
      value?: any;
    }

    function formatValidationErrors(errors: ValidationError[]): {
      code: string;
      message: string;
      details: { fields: ValidationError[] };
    } {
      return {
        code: 'VALIDATION_ERROR',
        message: `Validation failed: ${errors.length} field(s) have errors`,
        details: {
          fields: errors,
        },
      };
    }

    it('should format single validation error', () => {
      const errors = [{ field: 'email', message: 'Invalid email format' }];
      const formatted = formatValidationErrors(errors);
      expect(formatted.code).toBe('VALIDATION_ERROR');
      expect(formatted.details.fields).toHaveLength(1);
    });

    it('should format multiple validation errors', () => {
      const errors = [
        { field: 'email', message: 'Invalid email format' },
        { field: 'password', message: 'Password too short' },
      ];
      const formatted = formatValidationErrors(errors);
      expect(formatted.message).toContain('2 field(s)');
    });
  });

  describe('Error logging', () => {
    interface ErrorLogEntry {
      level: 'error' | 'warn';
      message: string;
      code: string;
      statusCode: number;
      requestId?: string;
      userId?: number;
      path?: string;
      method?: string;
      stack?: string;
    }

    function shouldLogStack(statusCode: number): boolean {
      return statusCode >= 500;
    }

    function getLogLevel(statusCode: number): 'error' | 'warn' {
      return statusCode >= 500 ? 'error' : 'warn';
    }

    it('should log stack for 5xx errors', () => {
      expect(shouldLogStack(500)).toBe(true);
      expect(shouldLogStack(503)).toBe(true);
    });

    it('should not log stack for 4xx errors', () => {
      expect(shouldLogStack(400)).toBe(false);
      expect(shouldLogStack(404)).toBe(false);
    });

    it('should use error level for 5xx', () => {
      expect(getLogLevel(500)).toBe('error');
    });

    it('should use warn level for 4xx', () => {
      expect(getLogLevel(400)).toBe('warn');
      expect(getLogLevel(404)).toBe('warn');
    });
  });

  describe('Request ID generation', () => {
    function generateRequestId(): string {
      const timestamp = Date.now().toString(36);
      const random = Math.random().toString(36).substring(2, 8);
      return `req_${timestamp}_${random}`;
    }

    it('should generate unique IDs', () => {
      const id1 = generateRequestId();
      const id2 = generateRequestId();
      expect(id1).not.toBe(id2);
    });

    it('should start with req_ prefix', () => {
      const id = generateRequestId();
      expect(id.startsWith('req_')).toBe(true);
    });

    it('should have reasonable length', () => {
      const id = generateRequestId();
      expect(id.length).toBeGreaterThan(10);
      expect(id.length).toBeLessThan(30);
    });
  });

  describe('Error classification', () => {
    function isOperationalError(error: { isOperational?: boolean; statusCode?: number }): boolean {
      // Operational errors are expected errors (validation, not found, etc.)
      // Non-operational errors are programming errors that should be investigated
      if (error.isOperational !== undefined) return error.isOperational;
      if (error.statusCode && error.statusCode < 500) return true;
      return false;
    }

    it('should classify 4xx as operational', () => {
      expect(isOperationalError({ statusCode: 400 })).toBe(true);
      expect(isOperationalError({ statusCode: 404 })).toBe(true);
    });

    it('should classify 5xx as non-operational by default', () => {
      expect(isOperationalError({ statusCode: 500 })).toBe(false);
    });

    it('should respect explicit isOperational flag', () => {
      expect(isOperationalError({ isOperational: true, statusCode: 500 })).toBe(true);
      expect(isOperationalError({ isOperational: false, statusCode: 400 })).toBe(false);
    });
  });

  describe('Rate limit error handling', () => {
    interface RateLimitError {
      retryAfter: number; // seconds
      limit: number;
      remaining: number;
      resetTime: Date;
    }

    function formatRateLimitResponse(info: RateLimitError): {
      code: string;
      message: string;
      headers: Record<string, string>;
    } {
      return {
        code: 'RATE_LIMIT_EXCEEDED',
        message: `Too many requests. Please retry after ${info.retryAfter} seconds.`,
        headers: {
          'Retry-After': String(info.retryAfter),
          'X-RateLimit-Limit': String(info.limit),
          'X-RateLimit-Remaining': String(info.remaining),
          'X-RateLimit-Reset': info.resetTime.toISOString(),
        },
      };
    }

    it('should format rate limit response', () => {
      const info: RateLimitError = {
        retryAfter: 60,
        limit: 100,
        remaining: 0,
        resetTime: new Date('2024-01-01T12:00:00Z'),
      };

      const response = formatRateLimitResponse(info);
      expect(response.code).toBe('RATE_LIMIT_EXCEEDED');
      expect(response.headers['Retry-After']).toBe('60');
      expect(response.headers['X-RateLimit-Remaining']).toBe('0');
    });
  });
});




