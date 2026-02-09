/**
 * Mocks para Hooks personalizados
 * 
 * Provee mocks configurables para hooks de la aplicación.
 * Usar solo cuando sea necesario aislar componentes de los hooks reales.
 */

// =============================================================================
// MOCK DE AUTH SLICE SELECTORS
// =============================================================================

export const createAuthSliceMock = (overrides: Record<string, unknown> = {}) => ({
  selectCurrentUser: () => ({ 
    id: 1, 
    email: 'test@test.com', 
    role: 'SUPERADMIN', 
    empresaId: 1,
    ...overrides.user,
  }),
  selectCurrentToken: () => overrides.token ?? 'mock-token',
  selectIsAuthenticated: () => overrides.isAuthenticated ?? true,
  selectIsInitialized: () => overrides.isInitialized ?? true,
  // Re-exportar acciones reales si las hay
  ...overrides,
});

export const mockAuthSlice = createAuthSliceMock();

// =============================================================================
// MOCK DE useRoleBasedNavigation
// =============================================================================

export const createRoleBasedNavigationMock = (overrides: Record<string, unknown> = {}) => ({
  useRoleBasedNavigation: () => ({ 
    goBack: jest.fn(), 
    getHomePath: () => overrides.homePath ?? '/',
    ...overrides,
  }),
});

export const mockRoleBasedNavigation = createRoleBasedNavigationMock();

// =============================================================================
// MOCK DE useServiceConfig
// =============================================================================

export const createServiceConfigMock = (overrides: Record<string, unknown> = {}) => ({
  useServiceConfig: () => ({ 
    isLoading: false, 
    error: null, 
    config: { 
      documentos: { enabled: true }, 
      remitos: { enabled: true },
      ...overrides.config,
    }, 
    summary: { 
      enabledServices: ['Documentos', 'Remitos'],
      ...overrides.summary,
    },
  }),
  useServiceFlags: () => ({ 
    documentos: true, 
    remitos: true,
    ...overrides.flags,
  }),
});

export const mockServiceConfig = createServiceConfigMock();

// =============================================================================
// MOCK DE useToast
// =============================================================================

export const createToastMock = () => {
  const showFn = jest.fn();
  return {
    useToast: () => ({ show: showFn }),
    // Exportar la función para assertions en tests
    __showFn: showFn,
  };
};

export const mockToast = createToastMock();

// =============================================================================
// MOCK DE useWhatsAppNotifications
// =============================================================================

// Mutable state for enabling WhatsApp in tests
let __whatsAppEnabled = false;
let __whatsAppTemplates: Array<{ type: string; template: string }> = [];
let __whatsAppLoading = false;

export const __setWhatsAppMockConfig = (config: {
  enabled?: boolean;
  templates?: Array<{ type: string; template: string }>;
  isLoading?: boolean;
}) => {
  if (config.enabled !== undefined) __whatsAppEnabled = config.enabled;
  if (config.templates !== undefined) __whatsAppTemplates = config.templates;
  if (config.isLoading !== undefined) __whatsAppLoading = config.isLoading;
};

export const __resetWhatsAppMockConfig = () => {
  __whatsAppEnabled = false;
  __whatsAppTemplates = [];
  __whatsAppLoading = false;
};

export const createWhatsAppNotificationsMock = (overrides: Record<string, unknown> = {}) => ({
  useWhatsAppNotifications: () => ({ 
    config: { enabled: __whatsAppEnabled, ...overrides.config },
    templates: overrides.templates ?? __whatsAppTemplates,
    isLoading: overrides.isLoading ?? __whatsAppLoading,
  }),
});

export const mockWhatsAppNotifications = createWhatsAppNotificationsMock();

// =============================================================================
// MOCK DE useUserAudit
// =============================================================================

export const createUserAuditMock = () => {
  const auditUserDeletionFn = jest.fn();
  const auditSearchFn = jest.fn();
  const stopFn = jest.fn();
  
  return {
    useUserAudit: () => ({
      auditUserDeletion: auditUserDeletionFn,
      auditSearch: auditSearchFn,
      startPerformanceTracking: jest.fn(() => ({ stop: stopFn })),
    }),
    // Exportar funciones para assertions
    __auditUserDeletionFn: auditUserDeletionFn,
    __auditSearchFn: auditSearchFn,
    __stopFn: stopFn,
  };
};

export const mockUserAudit = createUserAuditMock();

