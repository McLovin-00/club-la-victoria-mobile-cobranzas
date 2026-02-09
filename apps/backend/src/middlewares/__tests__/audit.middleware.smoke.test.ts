/**
 * Smoke tests para audit.middleware.ts
 */

import auditModule, {
  auditMiddleware,
  auditAccessDenied,
  captureOldValues,
  AuditActionType,
  AuditResult,
  AuditSeverity,
} from '../audit.middleware';

describe('AuditMiddleware - Smoke Tests', () => {
  it('should export auditMiddleware function', () => {
    expect(auditMiddleware).toBeDefined();
    expect(typeof auditMiddleware).toBe('function');
  });

  it('should export auditAccessDenied function', () => {
    expect(auditAccessDenied).toBeDefined();
    expect(typeof auditAccessDenied).toBe('function');
  });

  it('should export captureOldValues function', () => {
    expect(captureOldValues).toBeDefined();
    expect(typeof captureOldValues).toBe('function');
  });

  it('should export AuditActionType enum', () => {
    expect(AuditActionType).toBeDefined();
    expect(AuditActionType.USER_CREATE).toBe('USER_CREATE');
    expect(AuditActionType.USER_LOGIN).toBe('USER_LOGIN');
  });

  it('should export AuditResult enum', () => {
    expect(AuditResult).toBeDefined();
    expect(AuditResult.SUCCESS).toBe('SUCCESS');
    expect(AuditResult.FAILURE).toBe('FAILURE');
  });

  it('should export AuditSeverity enum', () => {
    expect(AuditSeverity).toBeDefined();
    expect(AuditSeverity.LOW).toBe('LOW');
    expect(AuditSeverity.CRITICAL).toBe('CRITICAL');
  });

  it('should export default module with all functions', () => {
    expect(auditModule).toBeDefined();
    expect(auditModule.auditMiddleware).toBe(auditMiddleware);
    expect(auditModule.auditAccessDenied).toBe(auditAccessDenied);
  });

  it('should return a middleware function when auditMiddleware is called', () => {
    const middleware = auditMiddleware();
    expect(typeof middleware).toBe('function');
  });

  it('should return a middleware function when captureOldValues is called', () => {
    const middleware = captureOldValues('id');
    expect(typeof middleware).toBe('function');
  });
});

