/**
 * Tests comprehensivos para hooks.mocks.ts
 * 
 * Verifica todas las funciones factory para crear mocks de hooks.
 */
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import {
  createAuthSliceMock,
  mockAuthSlice,
  createRoleBasedNavigationMock,
  mockRoleBasedNavigation,
  createServiceConfigMock,
  mockServiceConfig,
  createToastMock,
  mockToast,
  createWhatsAppNotificationsMock,
  mockWhatsAppNotifications,
  createUserAuditMock,
  mockUserAudit,
} from '../mocks/hooks.mocks';

describe('hooks.mocks', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createAuthSliceMock', () => {
    it('crea selectCurrentUser con valores por defecto', () => {
      const mock = createAuthSliceMock();
      const user = mock.selectCurrentUser();
      
      expect(user.id).toBe(1);
      expect(user.email).toBe('test@test.com');
      expect(user.role).toBe('SUPERADMIN');
      expect(user.empresaId).toBe(1);
    });

    it('crea selectCurrentToken con valor por defecto', () => {
      const mock = createAuthSliceMock();
      const token = mock.selectCurrentToken();
      
      expect(token).toBe('mock-token');
    });

    it('crea selectIsAuthenticated como true por defecto', () => {
      const mock = createAuthSliceMock();
      const isAuth = mock.selectIsAuthenticated();
      
      expect(isAuth).toBe(true);
    });

    it('crea selectIsInitialized como true por defecto', () => {
      const mock = createAuthSliceMock();
      const isInit = mock.selectIsInitialized();
      
      expect(isInit).toBe(true);
    });

    it('permite override de user', () => {
      const mock = createAuthSliceMock({ 
        user: { id: 99, email: 'custom@test.com' } 
      });
      const user = mock.selectCurrentUser();
      
      expect(user.id).toBe(99);
      expect(user.email).toBe('custom@test.com');
    });

    it('permite override de token', () => {
      const mock = createAuthSliceMock({ token: 'custom-token' });
      const token = mock.selectCurrentToken();
      
      expect(token).toBe('custom-token');
    });

    it('permite override de isAuthenticated', () => {
      const mock = createAuthSliceMock({ isAuthenticated: false });
      const isAuth = mock.selectIsAuthenticated();
      
      expect(isAuth).toBe(false);
    });

    it('permite override de isInitialized', () => {
      const mock = createAuthSliceMock({ isInitialized: false });
      const isInit = mock.selectIsInitialized();
      
      expect(isInit).toBe(false);
    });
  });

  describe('mockAuthSlice', () => {
    it('es una instancia pre-creada', () => {
      expect(mockAuthSlice.selectCurrentUser).toBeDefined();
      expect(mockAuthSlice.selectCurrentToken).toBeDefined();
    });
  });

  describe('createRoleBasedNavigationMock', () => {
    it('crea useRoleBasedNavigation con goBack', () => {
      const mock = createRoleBasedNavigationMock();
      const hook = mock.useRoleBasedNavigation();
      
      expect(typeof hook.goBack).toBe('function');
    });

    it('crea useRoleBasedNavigation con getHomePath que retorna "/"', () => {
      const mock = createRoleBasedNavigationMock();
      const hook = mock.useRoleBasedNavigation();
      
      expect(hook.getHomePath()).toBe('/');
    });

    it('permite override de homePath', () => {
      const mock = createRoleBasedNavigationMock({ homePath: '/dashboard' });
      const hook = mock.useRoleBasedNavigation();
      
      expect(hook.getHomePath()).toBe('/dashboard');
    });

    it('goBack es una función mock', () => {
      const mock = createRoleBasedNavigationMock();
      const hook = mock.useRoleBasedNavigation();
      
      expect(jest.isMockFunction(hook.goBack)).toBe(true);
    });
  });

  describe('mockRoleBasedNavigation', () => {
    it('es una instancia pre-creada', () => {
      expect(mockRoleBasedNavigation.useRoleBasedNavigation).toBeDefined();
    });
  });

  describe('createServiceConfigMock', () => {
    it('crea useServiceConfig con isLoading false', () => {
      const mock = createServiceConfigMock();
      const hook = mock.useServiceConfig();
      
      expect(hook.isLoading).toBe(false);
    });

    it('crea useServiceConfig con error null', () => {
      const mock = createServiceConfigMock();
      const hook = mock.useServiceConfig();
      
      expect(hook.error).toBeNull();
    });

    it('crea useServiceConfig con config de servicios', () => {
      const mock = createServiceConfigMock();
      const hook = mock.useServiceConfig();
      
      expect(hook.config.documentos.enabled).toBe(true);
      expect(hook.config.remitos.enabled).toBe(true);
    });

    it('crea useServiceConfig con summary', () => {
      const mock = createServiceConfigMock();
      const hook = mock.useServiceConfig();
      
      expect(hook.summary.enabledServices).toContain('Documentos');
      expect(hook.summary.enabledServices).toContain('Remitos');
    });

    it('crea useServiceFlags con flags habilitados', () => {
      const mock = createServiceConfigMock();
      const flags = mock.useServiceFlags();
      
      expect(flags.documentos).toBe(true);
      expect(flags.remitos).toBe(true);
    });

    it('permite override de config', () => {
      const mock = createServiceConfigMock({
        config: { documentos: { enabled: false } },
      });
      const hook = mock.useServiceConfig();
      
      expect(hook.config.documentos.enabled).toBe(false);
    });

    it('permite override de flags', () => {
      const mock = createServiceConfigMock({
        flags: { documentos: false },
      });
      const flags = mock.useServiceFlags();
      
      expect(flags.documentos).toBe(false);
    });
  });

  describe('mockServiceConfig', () => {
    it('es una instancia pre-creada', () => {
      expect(mockServiceConfig.useServiceConfig).toBeDefined();
      expect(mockServiceConfig.useServiceFlags).toBeDefined();
    });
  });

  describe('createToastMock', () => {
    it('crea useToast con función show', () => {
      const mock = createToastMock();
      const hook = mock.useToast();
      
      expect(typeof hook.show).toBe('function');
    });

    it('show es una función mock rastreable', () => {
      const mock = createToastMock();
      const hook = mock.useToast();
      
      hook.show({ message: 'Test' });
      
      expect(mock.__showFn).toHaveBeenCalledWith({ message: 'Test' });
    });

    it('exporta __showFn para assertions', () => {
      const mock = createToastMock();
      
      expect(mock.__showFn).toBeDefined();
      expect(jest.isMockFunction(mock.__showFn)).toBe(true);
    });
  });

  describe('mockToast', () => {
    it('es una instancia pre-creada', () => {
      expect(mockToast.useToast).toBeDefined();
      expect(mockToast.__showFn).toBeDefined();
    });
  });

  describe('createWhatsAppNotificationsMock', () => {
    it('crea useWhatsAppNotifications con config', () => {
      const mock = createWhatsAppNotificationsMock();
      const hook = mock.useWhatsAppNotifications();
      
      expect(hook.config).toBeDefined();
      expect(hook.config.enabled).toBe(false);
    });

    it('crea useWhatsAppNotifications con templates vacío', () => {
      const mock = createWhatsAppNotificationsMock();
      const hook = mock.useWhatsAppNotifications();
      
      expect(hook.templates).toEqual([]);
    });

    it('crea useWhatsAppNotifications con isLoading false', () => {
      const mock = createWhatsAppNotificationsMock();
      const hook = mock.useWhatsAppNotifications();
      
      expect(hook.isLoading).toBe(false);
    });

    it('permite override de config', () => {
      const mock = createWhatsAppNotificationsMock({
        config: { enabled: true, phone: '+5491234567890' },
      });
      const hook = mock.useWhatsAppNotifications();
      
      expect(hook.config.enabled).toBe(true);
      expect(hook.config.phone).toBe('+5491234567890');
    });

    it('permite override de templates', () => {
      const templates = [{ id: 1, name: 'Template 1' }];
      const mock = createWhatsAppNotificationsMock({ templates });
      const hook = mock.useWhatsAppNotifications();
      
      expect(hook.templates).toEqual(templates);
    });

    it('permite override de isLoading', () => {
      const mock = createWhatsAppNotificationsMock({ isLoading: true });
      const hook = mock.useWhatsAppNotifications();
      
      expect(hook.isLoading).toBe(true);
    });
  });

  describe('mockWhatsAppNotifications', () => {
    it('es una instancia pre-creada', () => {
      expect(mockWhatsAppNotifications.useWhatsAppNotifications).toBeDefined();
    });
  });

  describe('createUserAuditMock', () => {
    it('crea useUserAudit con auditUserDeletion', () => {
      const mock = createUserAuditMock();
      const hook = mock.useUserAudit();
      
      expect(typeof hook.auditUserDeletion).toBe('function');
    });

    it('crea useUserAudit con auditSearch', () => {
      const mock = createUserAuditMock();
      const hook = mock.useUserAudit();
      
      expect(typeof hook.auditSearch).toBe('function');
    });

    it('crea useUserAudit con startPerformanceTracking', () => {
      const mock = createUserAuditMock();
      const hook = mock.useUserAudit();
      
      expect(typeof hook.startPerformanceTracking).toBe('function');
    });

    it('startPerformanceTracking retorna objeto con stop', () => {
      const mock = createUserAuditMock();
      const hook = mock.useUserAudit();
      const tracker = hook.startPerformanceTracking();
      
      expect(typeof tracker.stop).toBe('function');
    });

    it('exporta funciones mock para assertions', () => {
      const mock = createUserAuditMock();
      
      expect(mock.__auditUserDeletionFn).toBeDefined();
      expect(mock.__auditSearchFn).toBeDefined();
      expect(mock.__stopFn).toBeDefined();
    });

    it('auditUserDeletion es rastreable', () => {
      const mock = createUserAuditMock();
      const hook = mock.useUserAudit();
      
      hook.auditUserDeletion({ userId: 1, reason: 'test' });
      
      expect(mock.__auditUserDeletionFn).toHaveBeenCalledWith({ userId: 1, reason: 'test' });
    });

    it('auditSearch es rastreable', () => {
      const mock = createUserAuditMock();
      const hook = mock.useUserAudit();
      
      hook.auditSearch({ query: 'test' });
      
      expect(mock.__auditSearchFn).toHaveBeenCalledWith({ query: 'test' });
    });
  });

  describe('mockUserAudit', () => {
    it('es una instancia pre-creada', () => {
      expect(mockUserAudit.useUserAudit).toBeDefined();
      expect(mockUserAudit.__auditUserDeletionFn).toBeDefined();
    });
  });
});

