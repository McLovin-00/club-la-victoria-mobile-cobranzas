/**
 * Tests para App.tsx refactorizados para ESM
 */
import React from 'react';
import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import '@testing-library/jest-dom';

// 1. Mocks de los providers y componentes principales usando unstable_mockModule
jest.unstable_mockModule('../components/providers/theme-provider', () => ({
  ThemeProvider: ({ children }: { children: React.ReactNode }) => <div data-testid="theme-provider">{children}</div>,
}));

jest.unstable_mockModule('../components/ui/toast', () => ({
  ToastProvider: ({ children }: { children: React.ReactNode }) => <div data-testid="toast-provider">{children}</div>,
}));

jest.unstable_mockModule('../components/ui/confirm-dialog', () => ({
  ConfirmProvider: ({ children }: { children: React.ReactNode }) => <div data-testid="confirm-provider">{children}</div>,
}));

jest.unstable_mockModule('../components/ErrorBoundary', () => ({
  ErrorBoundary: ({ children }: { children: React.ReactNode }) => <div data-testid="error-boundary">{children}</div>,
}));

jest.unstable_mockModule('../components/AuthInitializer', () => ({
  AuthInitializer: ({ children }: { children: React.ReactNode }) => <div data-testid="auth-initializer">{children}</div>,
}));

jest.unstable_mockModule('../components/layout/MainLayout', () => ({
  MainLayout: () => <div data-testid="main-layout">MainLayout Mock</div>,
}));

jest.unstable_mockModule('../features/auth/components/RequireAuth', () => ({
  RequireAuth: ({ children }: { children?: React.ReactNode }) => <div data-testid="require-auth">{children}</div>,
}));

jest.unstable_mockModule('../features/auth/components/RequirePasswordChange', () => ({
  RequirePasswordChange: ({ children }: { children?: React.ReactNode }) => <div data-testid="require-password-change">{children}</div>,
}));

// Mocks de páginas
jest.unstable_mockModule('../pages/LoginPage', () => ({
  LoginPage: () => <div data-testid="login-page">Login Page</div>,
}));

jest.unstable_mockModule('../pages/DashboardPage', () => ({
  default: () => <div data-testid="dashboard-page">Dashboard Page</div>,
}));

jest.unstable_mockModule('../pages/PerfilPage', () => ({
  PerfilPage: () => <div data-testid="perfil-page">Perfil Page</div>,
}));

// Mocks de páginas lazy
jest.unstable_mockModule('../pages/UsuariosPage.lazy', () => ({
  default: () => <div data-testid="usuarios-page">Usuarios Page</div>,
}));

jest.unstable_mockModule('../features/empresas/pages/EmpresasPage.lazy', () => ({
  default: () => <div data-testid="empresas-page">Empresas Page</div>,
}));

jest.unstable_mockModule('../pages/PlatformUsersPage.lazy', () => ({
  default: () => <div data-testid="platform-users-page">Platform Users Page</div>,
}));

jest.unstable_mockModule('../pages/EndUsersPage.lazy', () => ({
  default: () => <div data-testid="end-users-page">End Users Page</div>,
}));

// Otros mocks de páginas de documentos (si es necesario para los tests de rutas)
const mockPage = (name: string) => ({ default: () => <div data-testid={`${name}-page`}>{name} Page</div> });
const mockNamedPage = (name: string, componentName: string) => ({ [componentName]: () => <div data-testid={`${name}-page`}>{name} Page</div> });

jest.unstable_mockModule('../features/documentos/pages/DocumentosPage', () => mockNamedPage('documentos', 'DocumentosPage'));
jest.unstable_mockModule('../features/documentos/pages/DocumentosMainPage', () => mockNamedPage('documentos-main', 'DocumentosMainPage'));
jest.unstable_mockModule('../features/documentos/pages/TemplatesPage', () => mockNamedPage('templates', 'TemplatesPage'));
jest.unstable_mockModule('../features/documentos/pages/FlowiseConfigPage', () => mockNamedPage('flowise-config', 'FlowiseConfigPage'));
jest.unstable_mockModule('../features/documentos/pages/EvolutionConfigPage', () => mockPage('evolution-config'));
jest.unstable_mockModule('../features/documentos/pages/NotificationsConfigPage', () => mockPage('notifications-config'));
jest.unstable_mockModule('../features/documentos/pages/AuditLogsPage', () => mockPage('audit-logs'));
jest.unstable_mockModule('../features/documentos/pages/DashboardDadoresPage', () => mockPage('dashboard-dadores'));
jest.unstable_mockModule('../features/documentos/pages/ClientsPage', () => mockPage('clients'));
jest.unstable_mockModule('../features/documentos/pages/ClientRequirementsPage', () => mockPage('client-requirements'));
jest.unstable_mockModule('../features/documentos/pages/EquiposPage', () => mockPage('equipos'));
jest.unstable_mockModule('../features/documentos/pages/ConsultaPage', () => mockPage('consulta'));
jest.unstable_mockModule('../features/documentos/pages/DadoresPage', () => mockPage('dadores'));
jest.unstable_mockModule('../features/documentos/pages/ApprovalQueuePage', () => mockPage('approval-queue'));
jest.unstable_mockModule('../features/documentos/pages/ApprovalDetailPage', () => mockPage('approval-detail'));
jest.unstable_mockModule('../features/documentos/pages/ExtractedDataPage', () => mockPage('extracted-data'));
jest.unstable_mockModule('../features/documentos/pages/EmpresasTransportistasPage', () => mockPage('empresas-transportistas'));
jest.unstable_mockModule('../features/documentos/pages/EmpresaTransportistaDetailPage', () => mockPage('empresa-transportista-detail'));
jest.unstable_mockModule('../features/documentos/pages/ChoferesPage', () => mockPage('choferes'));
jest.unstable_mockModule('../features/documentos/pages/CamionesPage', () => mockPage('camiones'));
jest.unstable_mockModule('../features/documentos/pages/AcopladosPage', () => mockPage('acoplados'));
jest.unstable_mockModule('../features/documentos/pages/EstadoEquipoPage', () => mockPage('estado-equipo'));
jest.unstable_mockModule('../features/equipos/pages/AltaEquipoCompletaPage', () => mockPage('alta-equipo'));
jest.unstable_mockModule('../features/equipos/pages/EditarEquipoPage', () => mockPage('editar-equipo'));

jest.unstable_mockModule('../pages/ClientePortalPage', () => mockPage('cliente-portal'));
jest.unstable_mockModule('../pages/DadoresPortalPage', () => mockPage('dadores-portal'));
jest.unstable_mockModule('../pages/TransportistasPortalPage', () => mockPage('transportistas-portal'));
jest.unstable_mockModule('../pages/AdminInternoPortalPage', () => mockNamedPage('admin-interno-portal', 'AdminInternoPortalPage'));
jest.unstable_mockModule('../features/cliente/pages/ClienteDashboard', () => mockPage('cliente-dashboard'));
jest.unstable_mockModule('../features/cliente/pages/ClienteEquipoDetalle', () => mockPage('cliente-equipo-detalle'));
jest.unstable_mockModule('../features/transportista/pages/TransportistaDashboard', () => mockPage('transportista-dashboard'));
jest.unstable_mockModule('../features/dador/pages/DadorDashboard', () => mockPage('dador-dashboard'));
jest.unstable_mockModule('../features/chofer/pages/ChoferDashboard', () => mockPage('chofer-dashboard'));
jest.unstable_mockModule('../features/remitos/pages/RemitosPage', () => mockNamedPage('remitos', 'RemitosPage'));
jest.unstable_mockModule('../components/ProtectedServiceRoute', () => ({
  ProtectedServiceRoute: ({ children }: { children: React.ReactNode }) => <div data-testid="protected-service-route">{children}</div>,
}));

// 2. Importar App dinámicamente
const { default: App } = await import('../App');

// Store para tests
const createTestStore = () => configureStore({
  reducer: {
    auth: () => ({
      user: { id: 1, email: 'test@test.com', role: 'SUPERADMIN' },
      token: 'test-token',
      isInitialized: true,
      isLoading: false,
      error: null,
    }),
    ui: () => ({ sidebarOpen: true, theme: 'light' }),
  },
});

const renderWithProviders = (initialRoute = '/') => {
  const store = createTestStore();
  return render(
    <Provider store={store}>
      <MemoryRouter initialEntries={[initialRoute]}>
        <App />
      </MemoryRouter>
    </Provider>
  );
};

describe('App Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Estructura de Providers', () => {
    it('renderiza ThemeProvider en el nivel superior', () => {
      renderWithProviders();
      expect(screen.getByTestId('theme-provider')).toBeInTheDocument();
    });

    it('renderiza ErrorBoundary dentro de ThemeProvider', () => {
      renderWithProviders();
      const themeProvider = screen.getByTestId('theme-provider');
      const errorBoundary = screen.getByTestId('error-boundary');
      expect(themeProvider).toContainElement(errorBoundary);
    });

    it('renderiza AuthInitializer dentro de ErrorBoundary', () => {
      renderWithProviders();
      const errorBoundary = screen.getByTestId('error-boundary');
      const authInitializer = screen.getByTestId('auth-initializer');
      expect(errorBoundary).toContainElement(authInitializer);
    });

    it('renderiza ToastProvider dentro de AuthInitializer', () => {
      renderWithProviders();
      const authInitializer = screen.getByTestId('auth-initializer');
      const toastProvider = screen.getByTestId('toast-provider');
      expect(authInitializer).toContainElement(toastProvider);
    });

    it('renderiza ConfirmProvider dentro de ToastProvider', () => {
      renderWithProviders();
      const toastProvider = screen.getByTestId('toast-provider');
      const confirmProvider = screen.getByTestId('confirm-provider');
      expect(toastProvider).toContainElement(confirmProvider);
    });
  });

  describe('Rutas Públicas', () => {
    it('renderiza LoginPage en /login', () => {
      renderWithProviders('/login');
      expect(screen.getByTestId('login-page')).toBeInTheDocument();
    });
  });

  describe('Rutas Protegidas', () => {
    it('renderiza MainLayout como wrapper de rutas protegidas', () => {
      renderWithProviders('/');
      expect(screen.getByTestId('main-layout')).toBeDefined();
    });
  });

  describe('Catch-all Route', () => {
    it('redirige rutas desconocidas a /', async () => {
      renderWithProviders('/ruta-que-no-existe');
      await waitFor(() => {
        expect(screen.getByTestId('main-layout')).toBeInTheDocument();
      });
    });
  });

  describe('Exportación', () => {
    it('exporta App como default', async () => {
      const module = await import('../App');
      expect(module.default).toBeDefined();
      expect(typeof module.default).toBe('function');
    });
  });
});
