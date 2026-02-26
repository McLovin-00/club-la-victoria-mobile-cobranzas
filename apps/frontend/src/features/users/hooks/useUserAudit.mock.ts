/**
 * Mock del hook useUserAudit para tests
 *
 * Este archivo es una versión simplificada del hook que no usa import.meta.env
 * para evitar problemas con Jest.
 */
import { useCallback, useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import { selectCurrentUser } from '../../auth/authSlice';
import { Logger } from '../../../lib/utils';

// Tipos para eventos de auditoría (mismo que en el original)
export enum UserAuditAction {
  USER_VIEW = 'USER_VIEW',
  USER_CREATE_START = 'USER_CREATE_START',
  USER_CREATE_SUCCESS = 'USER_CREATE_SUCCESS',
  USER_CREATE_FAILURE = 'USER_CREATE_FAILURE',
  USER_UPDATE_START = 'USER_UPDATE_START',
  USER_UPDATE_SUCCESS = 'USER_UPDATE_SUCCESS',
  USER_UPDATE_FAILURE = 'USER_UPDATE_FAILURE',
  USER_DELETE_START = 'USER_DELETE_START',
  USER_DELETE_SUCCESS = 'USER_DELETE_SUCCESS',
  USER_DELETE_FAILURE = 'USER_DELETE_FAILURE',
  USER_SEARCH = 'USER_SEARCH',
  USER_FILTER = 'USER_FILTER',
  USER_EXPORT = 'USER_EXPORT',
  USER_BULK_ACTION = 'USER_BULK_ACTION',
  PERMISSION_CHECK = 'PERMISSION_CHECK',
  PERFORMANCE_METRIC = 'PERFORMANCE_METRIC',
}

export enum AuditSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export interface AuditEvent {
  action: UserAuditAction;
  severity: AuditSeverity;
  userId?: number;
  targetUserId?: number;
  targetEmail?: string;
  oldValues?: Record<string, unknown>;
  newValues?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  timestamp: string;
  sessionId: string;
  userAgent: string;
  location?: string;
  duration?: number;
  success: boolean;
  errorMessage?: string;
}

// Configuración para diferentes tipos de auditoría
const auditConfig: Record<UserAuditAction, { severity: AuditSeverity; trackPerformance: boolean }> =
  {
    [UserAuditAction.USER_VIEW]: { severity: AuditSeverity.LOW, trackPerformance: false },
    [UserAuditAction.USER_CREATE_START]: { severity: AuditSeverity.MEDIUM, trackPerformance: true },
    [UserAuditAction.USER_CREATE_SUCCESS]: {
      severity: AuditSeverity.MEDIUM,
      trackPerformance: true,
    },
    [UserAuditAction.USER_CREATE_FAILURE]: { severity: AuditSeverity.HIGH, trackPerformance: true },
    [UserAuditAction.USER_UPDATE_START]: { severity: AuditSeverity.MEDIUM, trackPerformance: true },
    [UserAuditAction.USER_UPDATE_SUCCESS]: {
      severity: AuditSeverity.MEDIUM,
      trackPerformance: true,
    },
    [UserAuditAction.USER_UPDATE_FAILURE]: { severity: AuditSeverity.HIGH, trackPerformance: true },
    [UserAuditAction.USER_DELETE_START]: { severity: AuditSeverity.HIGH, trackPerformance: true },
    [UserAuditAction.USER_DELETE_SUCCESS]: {
      severity: AuditSeverity.CRITICAL,
      trackPerformance: true,
    },
    [UserAuditAction.USER_DELETE_FAILURE]: { severity: AuditSeverity.HIGH, trackPerformance: true },
    [UserAuditAction.USER_SEARCH]: { severity: AuditSeverity.LOW, trackPerformance: false },
    [UserAuditAction.USER_FILTER]: { severity: AuditSeverity.LOW, trackPerformance: false },
    [UserAuditAction.USER_EXPORT]: { severity: AuditSeverity.HIGH, trackPerformance: true },
    [UserAuditAction.USER_BULK_ACTION]: { severity: AuditSeverity.HIGH, trackPerformance: true },
    [UserAuditAction.PERMISSION_CHECK]: { severity: AuditSeverity.MEDIUM, trackPerformance: false },
    [UserAuditAction.PERFORMANCE_METRIC]: { severity: AuditSeverity.LOW, trackPerformance: false },
  };

/**
 * Generar ID de sesión único
 */
function generateSessionId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Obtener información del navegador
 */
function getBrowserInfo() {
  return {
    userAgent: navigator.userAgent,
    language: navigator.language,
    platform: navigator.platform,
    cookieEnabled: navigator.cookieEnabled,
    onLine: navigator.onLine,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    screenResolution: `${screen.width}x${screen.height}`,
    viewportSize: `${window.innerWidth}x${window.innerHeight}`,
  };
}

/**
 * Hook mock para auditoría de usuarios
 */
export const useUserAudit = () => {
  const currentUser = useSelector(selectCurrentUser);
  const sessionId = useRef<string>(generateSessionId());
  const actionTimers = useRef<Map<string, number>>(new Map());
  const eventQueue = useRef<AuditEvent[]>([]);
  const batchTimeout = useRef<number | null>(null);

  // Información estática del navegador
  const browserInfo = useRef(getBrowserInfo());

  /**
   * Crear evento de auditoría
   */
  const createAuditEvent = useCallback(
    (action: UserAuditAction, data: Partial<AuditEvent> = {}): AuditEvent => {
      const config = auditConfig[action];

      return {
        action,
        severity: data.severity || config.severity,
        userId: currentUser?.id,
        targetUserId: data.targetUserId,
        targetEmail: data.targetEmail,
        oldValues: data.oldValues,
        newValues: data.newValues,
        metadata: {
          ...browserInfo.current,
          ...data.metadata,
        },
        timestamp: new Date().toISOString(),
        sessionId: sessionId.current,
        userAgent: navigator.userAgent,
        location: window.location.pathname,
        duration: data.duration,
        success: data.success ?? true,
        errorMessage: data.errorMessage,
      };
    },
    [currentUser?.id]
  );

  /**
   * Procesar cola de eventos en batch
   */
  const processBatch = useCallback(() => {
    if (eventQueue.current.length === 0) return;

    const events = [...eventQueue.current];
    eventQueue.current = [];

    // Log en desarrollo (siempre en tests)
    events.forEach(event => {
      Logger.audit(event.action, {
        severity: event.severity,
        user: event.userId,
        target: event.targetUserId,
        success: event.success,
        duration: event.duration,
        metadata: event.metadata,
      });
    });

    // En producción, enviar al servidor (mock en tests - no hace nada)
    // NO usamos import.meta.env en este mock
  }, []);

  /**
   * Agregar evento a la cola
   */
  const queueEvent = useCallback(
    (event: AuditEvent) => {
      eventQueue.current.push(event);

      // Procesar inmediatamente eventos críticos
      if (event.severity === AuditSeverity.CRITICAL) {
        processBatch();
        return;
      }

      // Batch processing para otros eventos
      if (batchTimeout.current) {
        clearTimeout(batchTimeout.current);
      }

      batchTimeout.current = window.setTimeout(processBatch, 2000);
    },
    [processBatch]
  );

  /**
   * Iniciar tracking de performance para una acción
   */
  const startPerformanceTracking = useCallback((actionId: string) => {
    actionTimers.current.set(actionId, performance.now());
  }, []);

  /**
   * Finalizar tracking de performance
   */
  const endPerformanceTracking = useCallback((actionId: string): number | undefined => {
    const startTime = actionTimers.current.get(actionId);
    if (startTime) {
      const duration = performance.now() - startTime;
      actionTimers.current.delete(actionId);
      return duration;
    }
    return undefined;
  }, []);

  /**
   * Función principal para registrar auditoría
   */
  const logAudit = useCallback(
    (action: UserAuditAction, data: Partial<AuditEvent> = {}) => {
      try {
        const event = createAuditEvent(action, data);
        queueEvent(event);

        // Métricas de performance específicas
        if (auditConfig[action].trackPerformance) {
          Logger.performance(`User action: ${action}`, {
            userId: event.userId,
            duration: event.duration,
            success: event.success,
            location: event.location,
          });
        }
      } catch (error) {
        Logger.error('Error logging audit event:', error);
      }
    },
    [createAuditEvent, queueEvent]
  );

  /**
   * Funciones específicas para diferentes tipos de auditoría
   */
  const auditUserCreation = useCallback(
    (
      targetEmail: string,
      newValues: Record<string, unknown>,
      success: boolean,
      errorMessage?: string
    ) => {
      const actionId = `create-${Date.now()}`;
      const duration = endPerformanceTracking(actionId);

      logAudit(
        success ? UserAuditAction.USER_CREATE_SUCCESS : UserAuditAction.USER_CREATE_FAILURE,
        {
          targetEmail,
          newValues,
          duration,
          success,
          errorMessage,
          metadata: {
            formData: newValues,
            validationPassed: success,
          },
        }
      );
    },
    [logAudit, endPerformanceTracking]
  );

  const auditUserUpdate = useCallback(
    (
      targetUserId: number,
      targetEmail: string,
      oldValues: Record<string, unknown>,
      newValues: Record<string, unknown>,
      success: boolean,
      errorMessage?: string
    ) => {
      const actionId = `update-${targetUserId}`;
      const duration = endPerformanceTracking(actionId);

      logAudit(
        success ? UserAuditAction.USER_UPDATE_SUCCESS : UserAuditAction.USER_UPDATE_FAILURE,
        {
          targetUserId,
          targetEmail,
          oldValues,
          newValues,
          duration,
          success,
          errorMessage,
          metadata: {
            changedFields: Object.keys(newValues).filter(key => oldValues[key] !== newValues[key]),
            changeCount: Object.keys(newValues).length,
          },
        }
      );
    },
    [logAudit, endPerformanceTracking]
  );

  const auditUserDeletion = useCallback(
    (targetUserId: number, targetEmail: string, success: boolean, errorMessage?: string) => {
      const actionId = `delete-${targetUserId}`;
      const duration = endPerformanceTracking(actionId);

      logAudit(
        success ? UserAuditAction.USER_DELETE_SUCCESS : UserAuditAction.USER_DELETE_FAILURE,
        {
          targetUserId,
          targetEmail,
          duration,
          success,
          errorMessage,
          severity: AuditSeverity.CRITICAL,
          metadata: {
            deletedBy: currentUser?.id,
            deletedByRole: currentUser?.role,
            confirmationRequired: true,
          },
        }
      );
    },
    [logAudit, endPerformanceTracking, currentUser]
  );

  const auditSearch = useCallback(
    (searchTerm: string, resultsCount: number, filters?: Record<string, unknown>) => {
      logAudit(UserAuditAction.USER_SEARCH, {
        metadata: {
          searchTerm: searchTerm.slice(0, 100), // Limitar longitud
          resultsCount,
          filters,
          searchLength: searchTerm.length,
        },
      });
    },
    [logAudit]
  );

  const auditPermissionCheck = useCallback(
    (action: string, resource: string, allowed: boolean, reason?: string) => {
      logAudit(UserAuditAction.PERMISSION_CHECK, {
        success: allowed,
        metadata: {
          action,
          resource,
          userRole: currentUser?.role,
          empresaId: currentUser?.empresaId,
          reason,
        },
        severity: allowed ? AuditSeverity.LOW : AuditSeverity.MEDIUM,
      });
    },
    [logAudit, currentUser]
  );

  // Cleanup en unmount
  useEffect(() => {
    return () => {
      if (batchTimeout.current) {
        clearTimeout(batchTimeout.current);
        processBatch(); // Procesar eventos pendientes
      }
    };
  }, [processBatch]);

  // Track page views automáticamente
  useEffect(() => {
    logAudit(UserAuditAction.USER_VIEW, {
      metadata: {
        pageLoadTime: Date.now(),
        referrer: document.referrer,
        userRole: currentUser?.role,
      },
    });
  }, [logAudit, currentUser?.role]);

  return {
    logAudit,
    auditUserCreation,
    auditUserUpdate,
    auditUserDeletion,
    auditSearch,
    auditPermissionCheck,
    startPerformanceTracking,
    endPerformanceTracking,
    sessionId: sessionId.current,
  };
};

export default useUserAudit;
