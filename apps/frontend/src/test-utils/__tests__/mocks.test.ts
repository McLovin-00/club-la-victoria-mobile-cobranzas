/**
 * Tests para test-utils/mocks
 * Verifica que los mocks están correctamente exportados
 */
import { describe, it, expect } from '@jest/globals';
import * as mocks from '../mocks';

describe('mocks exports', () => {
  describe('store.mock', () => {
    it('exporta mockStore', () => {
      expect(mocks.mockStore).toBeDefined();
    });

    it('exporta mockStoreHooks', () => {
      expect(mocks.mockStoreHooks).toBeDefined();
    });
  });

  describe('api.mocks', () => {
    it('exporta mockDocumentosApi', () => {
      expect(mocks.mockDocumentosApi).toBeDefined();
    });

    it('exporta mockUsersApi', () => {
      expect(mocks.mockUsersApi).toBeDefined();
    });

    it('exporta mockEmpresasApi', () => {
      expect(mocks.mockEmpresasApi).toBeDefined();
    });

    it('exporta mockPlatformUsersApi', () => {
      expect(mocks.mockPlatformUsersApi).toBeDefined();
    });

    it('exporta mockRemitosApi', () => {
      expect(mocks.mockRemitosApi).toBeDefined();
    });

    it('exporta mockServicesApi', () => {
      expect(mocks.mockServicesApi).toBeDefined();
    });
  });

  describe('hooks.mocks', () => {
    it('exporta mockRoleBasedNavigation', () => {
      expect(mocks.mockRoleBasedNavigation).toBeDefined();
    });

    it('exporta mockServiceConfig', () => {
      expect(mocks.mockServiceConfig).toBeDefined();
    });

    it('exporta mockToast', () => {
      expect(mocks.mockToast).toBeDefined();
    });

    it('exporta mockWhatsAppNotifications', () => {
      expect(mocks.mockWhatsAppNotifications).toBeDefined();
    });

    it('exporta mockUserAudit', () => {
      expect(mocks.mockUserAudit).toBeDefined();
    });

    it('exporta mockAuthSlice', () => {
      expect(mocks.mockAuthSlice).toBeDefined();
    });
  });

  describe('contexts.mocks', () => {
    it('exporta mockConfirmContext', () => {
      expect(mocks.mockConfirmContext).toBeDefined();
    });

    it('exporta mockToastContext', () => {
      expect(mocks.mockToastContext).toBeDefined();
    });
  });

  describe('services.mocks', () => {
    it('exporta mockWebSocketService', () => {
      expect(mocks.mockWebSocketService).toBeDefined();
    });

    it('exporta mockRuntimeEnv', () => {
      expect(mocks.mockRuntimeEnv).toBeDefined();
    });

    it('exporta mockToastUtils', () => {
      expect(mocks.mockToastUtils).toBeDefined();
    });

    it('exporta mockLogger', () => {
      expect(mocks.mockLogger).toBeDefined();
    });
  });
});

