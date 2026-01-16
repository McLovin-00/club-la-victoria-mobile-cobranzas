/**
 * Tests comprehensivos para test-utils/index.ts
 * 
 * Verifica todas las exportaciones y re-exportaciones del módulo principal.
 */
import { describe, it, expect } from '@jest/globals';
import * as testUtils from '../index';

describe('test-utils/index exports', () => {
  describe('testWrappers exports', () => {
    it('exporta AllProviders', () => {
      expect(testUtils.AllProviders).toBeDefined();
      expect(typeof testUtils.AllProviders).toBe('function');
    });
  });

  describe('mockApiResponses exports', () => {
    it('exporta mockDadores', () => {
      expect(testUtils.mockDadores).toBeDefined();
      expect(Array.isArray(testUtils.mockDadores)).toBe(true);
    });

    it('mockDadores tiene estructura correcta', () => {
      const dador = testUtils.mockDadores[0];
      expect(dador).toHaveProperty('id');
      expect(dador).toHaveProperty('razonSocial');
      expect(dador).toHaveProperty('cuit');
      expect(dador).toHaveProperty('activo');
    });

    it('exporta mockChoferes', () => {
      expect(testUtils.mockChoferes).toBeDefined();
      expect(Array.isArray(testUtils.mockChoferes)).toBe(true);
    });

    it('mockChoferes tiene estructura correcta', () => {
      const chofer = testUtils.mockChoferes[0];
      expect(chofer).toHaveProperty('id');
      expect(chofer).toHaveProperty('empresaId');
      expect(chofer).toHaveProperty('dni');
      expect(chofer).toHaveProperty('activo');
    });

    it('exporta mockTemplates', () => {
      expect(testUtils.mockTemplates).toBeDefined();
      expect(Array.isArray(testUtils.mockTemplates)).toBe(true);
    });

    it('mockTemplates tiene estructura correcta', () => {
      const template = testUtils.mockTemplates[0];
      expect(template).toHaveProperty('id');
      expect(template).toHaveProperty('nombre');
      expect(template).toHaveProperty('entityType');
      expect(template).toHaveProperty('isActive');
    });
  });

  describe('testing-library re-exports', () => {
    it('exporta render', () => {
      expect(testUtils.render).toBeDefined();
      expect(typeof testUtils.render).toBe('function');
    });

    it('exporta screen', () => {
      expect(testUtils.screen).toBeDefined();
      expect(typeof testUtils.screen).toBe('object');
    });

    it('screen tiene métodos de query', () => {
      expect(typeof testUtils.screen.getByText).toBe('function');
      expect(typeof testUtils.screen.getByTestId).toBe('function');
      expect(typeof testUtils.screen.queryByText).toBe('function');
      expect(typeof testUtils.screen.findByText).toBe('function');
    });

    it('exporta fireEvent', () => {
      expect(testUtils.fireEvent).toBeDefined();
      expect(typeof testUtils.fireEvent).toBe('function');
    });

    it('fireEvent tiene métodos de eventos', () => {
      expect(typeof testUtils.fireEvent.click).toBe('function');
      expect(typeof testUtils.fireEvent.change).toBe('function');
      expect(typeof testUtils.fireEvent.submit).toBe('function');
    });

    it('exporta waitFor', () => {
      expect(testUtils.waitFor).toBeDefined();
      expect(typeof testUtils.waitFor).toBe('function');
    });

    it('exporta within', () => {
      expect(testUtils.within).toBeDefined();
      expect(typeof testUtils.within).toBe('function');
    });
  });

  describe('userEvent re-export', () => {
    it('exporta userEvent', () => {
      expect(testUtils.userEvent).toBeDefined();
    });

    it('userEvent tiene setup', () => {
      expect(typeof testUtils.userEvent.setup).toBe('function');
    });

    it('userEvent tiene métodos de interacción', () => {
      expect(typeof testUtils.userEvent.click).toBe('function');
      expect(typeof testUtils.userEvent.type).toBe('function');
    });
  });

  describe('mocks re-exports', () => {
    it('exporta mockStore', () => {
      expect(testUtils.mockStore).toBeDefined();
    });

    it('exporta mockStoreHooks', () => {
      expect(testUtils.mockStoreHooks).toBeDefined();
    });

    it('exporta mockDocumentosApi', () => {
      expect(testUtils.mockDocumentosApi).toBeDefined();
    });

    it('exporta mockUsersApi', () => {
      expect(testUtils.mockUsersApi).toBeDefined();
    });

    it('exporta mockEmpresasApi', () => {
      expect(testUtils.mockEmpresasApi).toBeDefined();
    });

    it('exporta mockPlatformUsersApi', () => {
      expect(testUtils.mockPlatformUsersApi).toBeDefined();
    });

    it('exporta mockRemitosApi', () => {
      expect(testUtils.mockRemitosApi).toBeDefined();
    });

    it('exporta mockServicesApi', () => {
      expect(testUtils.mockServicesApi).toBeDefined();
    });

    it('exporta mockEndUsersApi', () => {
      expect(testUtils.mockEndUsersApi).toBeDefined();
    });

    it('exporta mockAuthSlice', () => {
      expect(testUtils.mockAuthSlice).toBeDefined();
    });

    it('exporta mockRoleBasedNavigation', () => {
      expect(testUtils.mockRoleBasedNavigation).toBeDefined();
    });

    it('exporta mockServiceConfig', () => {
      expect(testUtils.mockServiceConfig).toBeDefined();
    });

    it('exporta mockToast', () => {
      expect(testUtils.mockToast).toBeDefined();
    });

    it('exporta mockWhatsAppNotifications', () => {
      expect(testUtils.mockWhatsAppNotifications).toBeDefined();
    });

    it('exporta mockUserAudit', () => {
      expect(testUtils.mockUserAudit).toBeDefined();
    });

    it('exporta mockConfirmContext', () => {
      expect(testUtils.mockConfirmContext).toBeDefined();
    });

    it('exporta mockToastContext', () => {
      expect(testUtils.mockToastContext).toBeDefined();
    });

    it('exporta mockWebSocketService', () => {
      expect(testUtils.mockWebSocketService).toBeDefined();
    });

    it('exporta mockRuntimeEnv', () => {
      expect(testUtils.mockRuntimeEnv).toBeDefined();
    });

    it('exporta mockToastUtils', () => {
      expect(testUtils.mockToastUtils).toBeDefined();
    });

    it('exporta mockLogger', () => {
      expect(testUtils.mockLogger).toBeDefined();
    });
  });

  describe('factory functions re-exports', () => {
    it('exporta createMockStore', () => {
      expect(testUtils.createMockStore).toBeDefined();
      expect(typeof testUtils.createMockStore).toBe('function');
    });

    it('exporta createMockStoreHooks', () => {
      expect(testUtils.createMockStoreHooks).toBeDefined();
      expect(typeof testUtils.createMockStoreHooks).toBe('function');
    });

    it('exporta createQueryMock', () => {
      expect(testUtils.createQueryMock).toBeDefined();
      expect(typeof testUtils.createQueryMock).toBe('function');
    });

    it('exporta createMutationMock', () => {
      expect(testUtils.createMutationMock).toBeDefined();
      expect(typeof testUtils.createMutationMock).toBe('function');
    });

    it('exporta createLazyQueryMock', () => {
      expect(testUtils.createLazyQueryMock).toBeDefined();
      expect(typeof testUtils.createLazyQueryMock).toBe('function');
    });

    it('exporta createDocumentosApiMock', () => {
      expect(testUtils.createDocumentosApiMock).toBeDefined();
      expect(typeof testUtils.createDocumentosApiMock).toBe('function');
    });

    it('exporta createUsersApiMock', () => {
      expect(testUtils.createUsersApiMock).toBeDefined();
      expect(typeof testUtils.createUsersApiMock).toBe('function');
    });

    it('exporta createAuthSliceMock', () => {
      expect(testUtils.createAuthSliceMock).toBeDefined();
      expect(typeof testUtils.createAuthSliceMock).toBe('function');
    });

    it('exporta createRoleBasedNavigationMock', () => {
      expect(testUtils.createRoleBasedNavigationMock).toBeDefined();
      expect(typeof testUtils.createRoleBasedNavigationMock).toBe('function');
    });

    it('exporta createServiceConfigMock', () => {
      expect(testUtils.createServiceConfigMock).toBeDefined();
      expect(typeof testUtils.createServiceConfigMock).toBe('function');
    });

    it('exporta createToastMock', () => {
      expect(testUtils.createToastMock).toBeDefined();
      expect(typeof testUtils.createToastMock).toBe('function');
    });

    it('exporta createWhatsAppNotificationsMock', () => {
      expect(testUtils.createWhatsAppNotificationsMock).toBeDefined();
      expect(typeof testUtils.createWhatsAppNotificationsMock).toBe('function');
    });

    it('exporta createUserAuditMock', () => {
      expect(testUtils.createUserAuditMock).toBeDefined();
      expect(typeof testUtils.createUserAuditMock).toBe('function');
    });

    it('exporta createConfirmContextMock', () => {
      expect(testUtils.createConfirmContextMock).toBeDefined();
      expect(typeof testUtils.createConfirmContextMock).toBe('function');
    });

    it('exporta createToastContextMock', () => {
      expect(testUtils.createToastContextMock).toBeDefined();
      expect(typeof testUtils.createToastContextMock).toBe('function');
    });

    it('exporta createWebSocketServiceMock', () => {
      expect(testUtils.createWebSocketServiceMock).toBeDefined();
      expect(typeof testUtils.createWebSocketServiceMock).toBe('function');
    });

    it('exporta createRuntimeEnvMock', () => {
      expect(testUtils.createRuntimeEnvMock).toBeDefined();
      expect(typeof testUtils.createRuntimeEnvMock).toBe('function');
    });

    it('exporta createToastUtilsMock', () => {
      expect(testUtils.createToastUtilsMock).toBeDefined();
      expect(typeof testUtils.createToastUtilsMock).toBe('function');
    });

    it('exporta createLoggerMock', () => {
      expect(testUtils.createLoggerMock).toBeDefined();
      expect(typeof testUtils.createLoggerMock).toBe('function');
    });
  });

  describe('default state exports', () => {
    it('exporta defaultAuthState', () => {
      expect(testUtils.defaultAuthState).toBeDefined();
    });

    it('exporta defaultUiState', () => {
      expect(testUtils.defaultUiState).toBeDefined();
    });
  });
});

