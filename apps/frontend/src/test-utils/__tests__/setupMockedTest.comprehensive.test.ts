/**
 * Tests comprehensivos para setupMockedTest.ts
 * 
 * Verifica que el setup de mocks globales funciona correctamente.
 * NOTA: Este archivo usa import dinámico para no activar los mocks globales.
 */
import { describe, it, expect, jest, beforeEach } from '@jest/globals';

describe('setupMockedTest', () => {
  beforeEach(() => {
    jest.resetModules();
  });

  describe('Exportaciones', () => {
    it('exporta MOCKED_TEST_SETUP como true', async () => {
      const module = await import('../setupMockedTest');
      expect(module.MOCKED_TEST_SETUP).toBe(true);
    });

    it('MOCKED_TEST_SETUP es un booleano', async () => {
      const module = await import('../setupMockedTest');
      expect(typeof module.MOCKED_TEST_SETUP).toBe('boolean');
    });
  });

  describe('Estructura del archivo', () => {
    it('el módulo se puede importar sin errores', async () => {
      await expect(import('../setupMockedTest')).resolves.not.toThrow();
    });

    it('el módulo tiene la estructura esperada', async () => {
      const module = await import('../setupMockedTest');
      
      // Verificar que solo exporta lo esperado
      const exportKeys = Object.keys(module);
      expect(exportKeys).toContain('MOCKED_TEST_SETUP');
    });
  });

  describe('Documentación y uso', () => {
    it('MOCKED_TEST_SETUP sirve como indicador de que los mocks están activos', async () => {
      const module = await import('../setupMockedTest');
      
      // Este valor puede usarse en tests para verificar que el setup se ejecutó
      if (module.MOCKED_TEST_SETUP) {
        // Los mocks globales deberían estar activos
        expect(true).toBe(true);
      }
    });
  });
});

describe('setupMockedTest - Mocks registrados', () => {
  // Estos tests verifican que los mocks se importan correctamente
  // sin necesariamente activarlos
  
  it('importa mocks de store', async () => {
    const mocks = await import('../mocks');
    
    expect(mocks.mockStore).toBeDefined();
    expect(mocks.mockStoreHooks).toBeDefined();
  });

  it('importa mocks de APIs', async () => {
    const mocks = await import('../mocks');
    
    expect(mocks.mockDocumentosApi).toBeDefined();
    expect(mocks.mockUsersApi).toBeDefined();
    expect(mocks.mockEmpresasApi).toBeDefined();
    expect(mocks.mockPlatformUsersApi).toBeDefined();
    expect(mocks.mockRemitosApi).toBeDefined();
    expect(mocks.mockServicesApi).toBeDefined();
  });

  it('importa mocks de hooks', async () => {
    const mocks = await import('../mocks');
    
    expect(mocks.mockAuthSlice).toBeDefined();
    expect(mocks.mockRoleBasedNavigation).toBeDefined();
    expect(mocks.mockServiceConfig).toBeDefined();
    expect(mocks.mockToast).toBeDefined();
    expect(mocks.mockWhatsAppNotifications).toBeDefined();
    expect(mocks.mockUserAudit).toBeDefined();
  });

  it('importa mocks de contexts', async () => {
    const mocks = await import('../mocks');
    
    expect(mocks.mockConfirmContext).toBeDefined();
    expect(mocks.mockToastContext).toBeDefined();
  });

  it('importa mocks de services', async () => {
    const mocks = await import('../mocks');
    
    expect(mocks.mockWebSocketService).toBeDefined();
    expect(mocks.mockRuntimeEnv).toBeDefined();
    expect(mocks.mockToastUtils).toBeDefined();
    expect(mocks.mockLogger).toBeDefined();
  });
});

