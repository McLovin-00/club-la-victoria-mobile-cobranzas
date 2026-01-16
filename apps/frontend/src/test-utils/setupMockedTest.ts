/**
 * Setup para tests que requieren mocks completos de APIs/Store
 * 
 * Usar SOLO cuando el test necesite aislar completamente el componente
 * de las APIs reales. Para tests de integración, preferir el store real.
 * 
 * Uso en un archivo de test:
 * ```ts
 * // Al inicio del archivo, ANTES de otros imports
 * import './test-utils/setupMockedTest';
 * 
 * // Luego los imports normales
 * import { render, screen } from '@testing-library/react';
 * import { MyComponent } from './MyComponent';
 * ```
 * 
 * O para mocks selectivos:
 * ```ts
 * import { mockDocumentosApi, mockStore } from '@/test-utils/mocks';
 * 
 * jest.mock('@/features/documentos/api/documentosApiSlice', () => mockDocumentosApi);
 * jest.mock('@/store/store', () => mockStore);
 * ```
 */

import { 
  mockStore, 
  mockStoreHooks,
  mockDocumentosApi,
  mockUsersApi,
  mockEmpresasApi,
  mockPlatformUsersApi,
  mockRemitosApi,
  mockServicesApi,
  mockAuthSlice,
  mockRoleBasedNavigation,
  mockServiceConfig,
  mockToast,
  mockWhatsAppNotifications,
  mockUserAudit,
  mockConfirmContext,
  mockToastContext,
  mockWebSocketService,
  mockRuntimeEnv,
  mockToastUtils,
  mockLogger,
} from './mocks';

// =============================================================================
// MOCKS DE STORE
// =============================================================================

jest.mock('@/store/store', () => mockStore);
jest.mock('@/store/hooks', () => mockStoreHooks);

// =============================================================================
// MOCKS DE API SLICES
// =============================================================================

jest.mock('@/features/documentos/api/documentosApiSlice', () => mockDocumentosApi);
jest.mock('@/features/users/api/usersApiSlice', () => mockUsersApi);
jest.mock('@/features/empresas/api/empresasApiSlice', () => mockEmpresasApi);
jest.mock('@/features/platform-users/api/platformUsersApiSlice', () => mockPlatformUsersApi);
jest.mock('@/features/remitos/api/remitosApiSlice', () => mockRemitosApi);
jest.mock('@/features/services/api/servicesApiSlice', () => mockServicesApi);

// =============================================================================
// MOCKS DE AUTH
// =============================================================================

jest.mock('@/features/auth/authSlice', () => ({
  ...jest.requireActual('@/features/auth/authSlice'),
  ...mockAuthSlice,
}));

// =============================================================================
// MOCKS DE HOOKS
// =============================================================================

jest.mock('@/hooks/useRoleBasedNavigation', () => mockRoleBasedNavigation);
jest.mock('@/hooks/useServiceConfig', () => mockServiceConfig);
jest.mock('@/hooks/useToast', () => mockToast);
jest.mock('@/hooks/useWhatsAppNotifications', () => mockWhatsAppNotifications);
jest.mock('@/features/users/hooks/useUserAudit', () => mockUserAudit);

// =============================================================================
// MOCKS DE CONTEXTS
// =============================================================================

jest.mock('@/contexts/confirmContext', () => mockConfirmContext);
jest.mock('@/contexts/toastContext', () => mockToastContext);

// =============================================================================
// MOCKS DE SERVICES
// =============================================================================

jest.mock('@/services/websocket.service', () => mockWebSocketService);
jest.mock('@/lib/runtimeEnv', () => mockRuntimeEnv);
jest.mock('@/components/ui/Toast.utils', () => mockToastUtils);
jest.mock('@/lib/utils', () => ({
  ...jest.requireActual('@/lib/utils'),
  ...mockLogger,
  cn: (...args: unknown[]) => args.filter(Boolean).join(' '),
}));

// =============================================================================
// MOCK DE REACT ROUTER (navegación)
// =============================================================================

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => jest.fn(),
  useLocation: () => ({
    pathname: '/',
    search: '',
    hash: '',
    state: null,
  }),
}));

// Indicador de que este archivo fue importado
export const MOCKED_TEST_SETUP = true;

