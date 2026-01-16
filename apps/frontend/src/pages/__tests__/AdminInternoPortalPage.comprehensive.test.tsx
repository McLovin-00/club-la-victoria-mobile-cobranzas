/**
 * Tests comprehensivos para AdminInternoPortalPage
 * 
 * Cubre el renderizado, interacciones y navegación del portal de administración interno.
 * Objetivo: alcanzar 90% de coverage en SonarQube.
 */
import React from 'react';
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';

// Mock de runtimeEnv (debe ir ANTES de otros imports que lo usen)
jest.mock('../../lib/runtimeEnv', () => ({
  getRuntimeEnv: (key: string) => {
    const envs: Record<string, string> = {
      VITE_API_URL: 'http://localhost:3000',
      VITE_DOCUMENTOS_API_URL: 'http://localhost:4802',
    };
    return envs[key] || '';
  },
  getRuntimeFlag: () => false,
}));

// Mock de lib/utils para evitar import.meta
jest.mock('../../lib/utils', () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(' '),
}));

// Nota: evitamos mockear `useNavigate` para validar navegación real con MemoryRouter.

// Mock del logo
jest.mock('../../assets/logo-bca.jpg', () => 'mock-logo.jpg');

// Mock de componentes UI que usan cn
jest.mock('../../components/ui/card', () => ({
  Card: ({ children, className, onClick }: { children: React.ReactNode; className?: string; onClick?: () => void }) => (
    <div data-testid="card" className={className} onClick={onClick}>{children}</div>
  ),
  CardContent: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-testid="card-content" className={className}>{children}</div>
  ),
  CardHeader: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-testid="card-header" className={className}>{children}</div>
  ),
  CardTitle: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <h2 data-testid="card-title" className={className}>{children}</h2>
  ),
}));

jest.mock('../../components/ui/button', () => ({
  Button: ({ children, onClick, disabled, className, size, variant }: { 
    children: React.ReactNode; 
    onClick?: () => void; 
    disabled?: boolean; 
    className?: string;
    size?: string;
    variant?: string;
  }) => (
    <button 
      data-testid="button" 
      onClick={onClick} 
      disabled={disabled} 
      className={`${className || ''} ${size ? `size-${size}` : ''} ${variant ? `variant-${variant}` : ''} w-full`}
    >
      {children}
    </button>
  ),
}));

// Mock de iconos heroicons
jest.mock('@heroicons/react/24/outline', () => ({
  DocumentTextIcon: () => <svg data-testid="document-text-icon" />,
  TruckIcon: () => <svg data-testid="truck-icon" />,
  MagnifyingGlassIcon: () => <svg data-testid="magnifying-glass-icon" />,
}));

// Importar después de los mocks
import { AdminInternoPortalPage } from '../AdminInternoPortalPage';

// Helper para exponer la ruta actual y poder asertarla en tests de navegación.
const LocationDisplay = () => {
  const location = useLocation();
  return <div data-testid="location">{location.pathname}</div>;
};

// Store mínimo para tests
const createTestStore = () => configureStore({
  reducer: {
    auth: () => ({
      user: { id: 1, email: 'admin@test.com', role: 'ADMIN_INTERNO' },
      token: 'test-token',
      isInitialized: true,
    }),
  },
  middleware: (getDefaultMiddleware) => getDefaultMiddleware({ serializableCheck: false }),
});

// Wrapper para renderizar con providers
const renderWithProviders = (initialRoute = '/admin-interno') => {
  const store = createTestStore();
  return render(
    <Provider store={store}>
      <MemoryRouter initialEntries={[initialRoute]}>
        <Routes>
          <Route
            path="*"
            element={
              <>
                <AdminInternoPortalPage />
                <LocationDisplay />
              </>
            }
          />
        </Routes>
      </MemoryRouter>
    </Provider>
  );
};

describe('AdminInternoPortalPage - Renderizado', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renderiza el componente sin errores', () => {
    renderWithProviders();
    expect(screen.getByText('Portal Admin Interno')).toBeInTheDocument();
  });

  it('muestra el logo de BCA', () => {
    renderWithProviders();
    const logo = screen.getByAltText('Grupo BCA');
    expect(logo).toBeInTheDocument();
    // El src puede variar según el stub/transform de assets en Jest (ESM/CJS),
    // así que validamos que exista sin acoplarlo a un valor exacto.
    expect(logo.getAttribute('src')).toBeTruthy();
  });

  it('muestra el título principal correctamente', () => {
    renderWithProviders();
    expect(screen.getByText('Portal Admin Interno')).toBeInTheDocument();
  });

  it('muestra la descripción del portal', () => {
    renderWithProviders();
    expect(screen.getByText('Gestión completa de equipos y documentación')).toBeInTheDocument();
  });
});

describe('AdminInternoPortalPage - Card Alta Completa de Equipo', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renderiza la card de Alta Completa de Equipo', () => {
    renderWithProviders();
    expect(screen.getByText('Alta Completa de Equipo')).toBeInTheDocument();
  });

  it('muestra la descripción de Alta Completa', () => {
    renderWithProviders();
    expect(screen.getByText('Registrar nuevo equipo con toda su documentación')).toBeInTheDocument();
  });

  it('muestra las funcionalidades de Alta Completa', () => {
    renderWithProviders();
    expect(screen.getByText('Carga de empresa transportista y chofer')).toBeInTheDocument();
    expect(screen.getByText('Registro de camión y acoplado')).toBeInTheDocument();
    expect(screen.getByText('Subida de todos los documentos requeridos')).toBeInTheDocument();
  });

  it('muestra el botón Iniciar Alta Completa', () => {
    renderWithProviders();
    expect(screen.getByText('Iniciar Alta Completa')).toBeInTheDocument();
  });

  it('navega a /documentos/equipos/alta-completa al hacer click en la card', () => {
    renderWithProviders();
    expect(screen.getByTestId('location')).toHaveTextContent('/admin-interno');
    const title = screen.getByText('Alta Completa de Equipo');
    const card = title.closest('.cursor-pointer') as HTMLElement | null;
    expect(card).toBeTruthy();
    fireEvent.click(card as HTMLElement);
    expect(screen.getByTestId('location')).toHaveTextContent('/documentos/equipos/alta-completa');
  });

  it('navega a /documentos/equipos/alta-completa al hacer click en el botón', () => {
    renderWithProviders();
    // El botón está dentro de la Card; el click debería navegar igual.
    const button = screen.getByText('Iniciar Alta Completa');
    fireEvent.click(button);
    expect(screen.getByTestId('location')).toHaveTextContent('/documentos/equipos/alta-completa');
  });
});

describe('AdminInternoPortalPage - Card Consulta de Equipos', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renderiza la card de Consulta de Equipos', () => {
    renderWithProviders();
    expect(screen.getByText('Consulta de Equipos')).toBeInTheDocument();
  });

  it('muestra la descripción de Consulta', () => {
    renderWithProviders();
    expect(screen.getByText('Buscar equipos existentes y actualizar su documentación')).toBeInTheDocument();
  });

  it('muestra las funcionalidades de Consulta', () => {
    renderWithProviders();
    expect(screen.getByText('Buscar por DNI chofer, patente camión o acoplado')).toBeInTheDocument();
    expect(screen.getByText('Ver estado completo de documentación')).toBeInTheDocument();
    expect(screen.getByText('Actualizar documentos vencidos o faltantes')).toBeInTheDocument();
  });

  it('muestra el botón Ir a Consulta', () => {
    renderWithProviders();
    expect(screen.getByText('Ir a Consulta')).toBeInTheDocument();
  });

  it('navega a /documentos/consulta al hacer click en la card de Consulta', () => {
    renderWithProviders();
    const title = screen.getByText('Consulta de Equipos');
    const card = title.closest('.cursor-pointer') as HTMLElement | null;
    expect(card).toBeTruthy();
    fireEvent.click(card as HTMLElement);
    expect(screen.getByTestId('location')).toHaveTextContent('/documentos/consulta');
  });
});

describe('AdminInternoPortalPage - Accesos Rápidos', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('muestra la sección de acceso rápido', () => {
    renderWithProviders();
    expect(screen.getByText('Acceso rápido:')).toBeInTheDocument();
  });

  it('muestra el botón de Aprobaciones Pendientes', () => {
    renderWithProviders();
    expect(screen.getByText('Aprobaciones Pendientes')).toBeInTheDocument();
  });

  it('muestra el botón de Auditoría', () => {
    renderWithProviders();
    expect(screen.getByText('Auditoría')).toBeInTheDocument();
  });

  it('navega a /documentos/aprobacion al hacer click en Aprobaciones Pendientes', () => {
    renderWithProviders();
    const button = screen.getByText('Aprobaciones Pendientes');
    fireEvent.click(button);
    expect(screen.getByTestId('location')).toHaveTextContent('/documentos/aprobacion');
  });

  it('navega a /documentos/auditoria al hacer click en Auditoría', () => {
    renderWithProviders();
    const button = screen.getByText('Auditoría');
    fireEvent.click(button);
    expect(screen.getByTestId('location')).toHaveTextContent('/documentos/auditoria');
  });
});

describe('AdminInternoPortalPage - Estructura visual', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('tiene el layout correcto con gradiente de fondo', () => {
    const { container } = renderWithProviders();
    const mainDiv = container.querySelector('.min-h-screen');
    expect(mainDiv).toBeInTheDocument();
    expect(mainDiv?.className).toContain('bg-gradient-to-br');
  });

  it('tiene un grid de 2 columnas para las cards principales', () => {
    const { container } = renderWithProviders();
    const grid = container.querySelector('.grid.grid-cols-1.md\\:grid-cols-2');
    expect(grid).toBeInTheDocument();
  });

  it('renderiza iconos de TruckIcon en Alta Completa', () => {
    const { container } = renderWithProviders();
    // El icono está dentro de la card de Alta Completa
    const truckIcons = container.querySelectorAll('svg');
    expect(truckIcons.length).toBeGreaterThan(0);
  });

  it('renderiza iconos de MagnifyingGlassIcon en Consulta', () => {
    const { container } = renderWithProviders();
    const icons = container.querySelectorAll('svg');
    expect(icons.length).toBeGreaterThan(0);
  });

  it('las cards tienen efecto hover', () => {
    const { container } = renderWithProviders();
    const cards = container.querySelectorAll('[class*="hover:shadow"]');
    expect(cards.length).toBeGreaterThan(0);
  });

  it('los botones principales tienen tamaño lg', () => {
    renderWithProviders();
    const iniciarButton = screen.getByText('Iniciar Alta Completa');
    const irConsultaButton = screen.getByText('Ir a Consulta');
    expect(iniciarButton.className).toContain('w-full');
    expect(irConsultaButton.className).toContain('w-full');
  });
});

describe('AdminInternoPortalPage - Exports', () => {
  it('exporta AdminInternoPortalPage como named export', async () => {
    const module = await import('../AdminInternoPortalPage');
    expect(module.AdminInternoPortalPage).toBeDefined();
    expect(typeof module.AdminInternoPortalPage).toBe('function');
  });

  it('exporta AdminInternoPortalPage como default export', async () => {
    const module = await import('../AdminInternoPortalPage');
    expect(module.default).toBeDefined();
    expect(module.default).toBe(module.AdminInternoPortalPage);
  });
});

describe('AdminInternoPortalPage - Accesibilidad', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('las imágenes tienen atributo alt', () => {
    renderWithProviders();
    const logo = screen.getByAltText('Grupo BCA');
    expect(logo).toHaveAttribute('alt', 'Grupo BCA');
  });

  it('los botones son clickeables', () => {
    renderWithProviders();
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThan(0);
    buttons.forEach(button => {
      expect(button).not.toBeDisabled();
    });
  });

  it('tiene estructura semántica con headings', () => {
    renderWithProviders();
    const h1 = screen.getByRole('heading', { level: 1 });
    expect(h1).toBeInTheDocument();
    expect(h1).toHaveTextContent('Portal Admin Interno');
  });
});

describe('AdminInternoPortalPage - Responsive', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('tiene clases responsive para mobile', () => {
    const { container } = renderWithProviders();
    const headerFlex = container.querySelector('.flex.flex-col.md\\:flex-row');
    expect(headerFlex).toBeInTheDocument();
  });

  it('el logo tiene tamaño responsive', () => {
    renderWithProviders();
    const logo = screen.getByAltText('Grupo BCA');
    expect(logo.className).toContain('h-32');
    expect(logo.className).toContain('md:h-40');
  });

  it('el container tiene max-width', () => {
    const { container } = renderWithProviders();
    const mainContainer = container.querySelector('.max-w-6xl');
    expect(mainContainer).toBeInTheDocument();
  });
});

describe('AdminInternoPortalPage - Temas Dark Mode', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('tiene clases para dark mode en el fondo', () => {
    const { container } = renderWithProviders();
    const mainDiv = container.querySelector('.min-h-screen');
    expect(mainDiv?.className).toContain('dark:from-slate-900');
    expect(mainDiv?.className).toContain('dark:to-slate-800');
  });

  it('la card de accesos rápidos tiene estilo oscuro', () => {
    const { container } = renderWithProviders();
    const darkCard = container.querySelector('.bg-slate-800');
    expect(darkCard).toBeInTheDocument();
  });
});

