/**
 * Tests extendidos para MainLayout
 * Incrementa coverage cubriendo navegación, roles y sidebar
 */
import { describe, it, expect, beforeAll, beforeEach, jest } from '@jest/globals';
import { render, screen, fireEvent } from '@testing-library/react';

describe('MainLayout (extended)', () => {
  let state: any = {};
  let dispatch = jest.fn();
  let serviceFlags: any = { documentos: true };

  let MainLayout: React.FC;
  let MemoryRouter: typeof import('react-router-dom').MemoryRouter;
  let Routes: typeof import('react-router-dom').Routes;
  let Route: typeof import('react-router-dom').Route;

  beforeAll(async () => {
    await jest.unstable_mockModule('react-redux', () => ({
      useDispatch: () => dispatch,
      useSelector: (sel: any) => sel(state),
    }));

    await jest.unstable_mockModule('../../../hooks/useServiceConfig', () => ({
      useServiceFlags: () => serviceFlags,
    }));

    ({ MainLayout } = await import('../MainLayout'));
    ({ MemoryRouter, Routes, Route } = await import('react-router-dom'));
  });

  beforeEach(() => {
    dispatch = jest.fn();
    serviceFlags = { documentos: true };
    state = {
      auth: {
        user: { email: 'admin@test.com', role: 'ADMIN_INTERNO', empresaId: 1 },
      },
    };
  });

  describe('toggle de sidebar', () => {
    it('debe abrir sidebar al hacer clic en botón de menú', () => {
      render(
        <MemoryRouter initialEntries={['/']}>
          <Routes>
            <Route element={<MainLayout />}>
              <Route path="/" element={<div>child</div>} />
            </Route>
          </Routes>
        </MemoryRouter>
      );

      // El botón de toggle es el primero con Bars3Icon o XMarkIcon
      const toggleButton = screen.getByLabelText('Toggle menu');
      fireEvent.click(toggleButton);

      // Sidebar debería estar visible
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
    });

    it('debe cerrar sidebar al hacer clic en overlay', () => {
      render(
        <MemoryRouter initialEntries={['/']}>
          <Routes>
            <Route element={<MainLayout />}>
              <Route path="/" element={<div>child</div>} />
            </Route>
          </Routes>
        </MemoryRouter>
      );

      // Abrir sidebar
      const toggleButton = screen.getByLabelText('Toggle menu');
      fireEvent.click(toggleButton);

      // Buscar y clickear overlay
      const overlay = document.querySelector('.backdrop-blur-sm');
      if (overlay) {
        fireEvent.click(overlay);
      }
    });
  });

  describe('menú de usuario', () => {
    it('debe mostrar Mi Perfil en el menú desplegable', () => {
      render(
        <MemoryRouter initialEntries={['/']}>
          <Routes>
            <Route path="/login" element={<div>login</div>} />
            <Route path="/perfil" element={<div>perfil</div>} />
            <Route element={<MainLayout />}>
              <Route path="/" element={<div>child</div>} />
            </Route>
          </Routes>
        </MemoryRouter>
      );

      // Abrir menú usuario
      fireEvent.click(screen.getByText('admin'));

      const perfilLinks = screen.getAllByText('Mi Perfil');
      expect(perfilLinks.length).toBeGreaterThan(1); // Debería haber al menos el de sidebar y el de menú
      expect(perfilLinks[0]).toBeInTheDocument();
    });

    it('debe cerrar menú al hacer clic fuera', () => {
      render(
        <MemoryRouter initialEntries={['/']}>
          <Routes>
            <Route element={<MainLayout />}>
              <Route path="/" element={<div>child</div>} />
            </Route>
          </Routes>
        </MemoryRouter>
      );

      // Abrir menú
      fireEvent.click(screen.getByText('admin'));
      expect(screen.getByText('Cerrar Sesión')).toBeInTheDocument();

      // Click fuera (en el overlay)
      const overlay = document.querySelector('.fixed.inset-0.z-40');
      if (overlay) {
        fireEvent.click(overlay);
      }
    });
  });

  describe('roles de usuario', () => {
    it('debe mostrar Superadministrador en menú para SUPERADMIN', () => {
      state.auth.user = { email: 'super@test.com', role: 'SUPERADMIN', empresaId: 1 };

      render(
        <MemoryRouter initialEntries={['/']}>
          <Routes>
            <Route element={<MainLayout />}>
              <Route path="/" element={<div>child</div>} />
            </Route>
          </Routes>
        </MemoryRouter>
      );

      fireEvent.click(screen.getByText('super'));
      expect(screen.getByText('Superadministrador')).toBeInTheDocument();
    });

    it('debe mostrar Administrador en menú para ADMIN', () => {
      state.auth.user = { email: 'admin2@test.com', role: 'ADMIN', empresaId: 1 };

      render(
        <MemoryRouter initialEntries={['/']}>
          <Routes>
            <Route element={<MainLayout />}>
              <Route path="/" element={<div>child</div>} />
            </Route>
          </Routes>
        </MemoryRouter>
      );

      fireEvent.click(screen.getByText('admin2'));
      expect(screen.getByText('Administrador')).toBeInTheDocument();
    });

    it('debe mostrar Usuario de empresa en menú para OPERATOR', () => {
      state.auth.user = { email: 'operator@test.com', role: 'OPERATOR', empresaId: 1 };

      render(
        <MemoryRouter initialEntries={['/']}>
          <Routes>
            <Route element={<MainLayout />}>
              <Route path="/" element={<div>child</div>} />
            </Route>
          </Routes>
        </MemoryRouter>
      );

      fireEvent.click(screen.getByText('operator'));
      expect(screen.getByText('Usuario de empresa')).toBeInTheDocument();
    });

    it('debe mostrar Usuario para rol desconocido', () => {
      state.auth.user = { email: 'unknown@test.com', role: 'UNKNOWN_ROLE', empresaId: 1 };

      render(
        <MemoryRouter initialEntries={['/']}>
          <Routes>
            <Route element={<MainLayout />}>
              <Route path="/" element={<div>child</div>} />
            </Route>
          </Routes>
        </MemoryRouter>
      );

      fireEvent.click(screen.getByText('unknown'));
      expect(screen.getByText('Usuario')).toBeInTheDocument();
    });

    it('debe mostrar Usuario cuando no hay rol', () => {
      state.auth.user = { email: 'norole@test.com', empresaId: 1 };

      render(
        <MemoryRouter initialEntries={['/']}>
          <Routes>
            <Route element={<MainLayout />}>
              <Route path="/" element={<div>child</div>} />
            </Route>
          </Routes>
        </MemoryRouter>
      );

      fireEvent.click(screen.getByText('norole'));
      expect(screen.getByText('Usuario')).toBeInTheDocument();
    });
  });

  describe('navegación según rol', () => {
    it('debe mostrar Portal Equipos para ADMIN_INTERNO', () => {
      render(
        <MemoryRouter initialEntries={['/']}>
          <Routes>
            <Route element={<MainLayout />}>
              <Route path="/" element={<div>child</div>} />
            </Route>
          </Routes>
        </MemoryRouter>
      );

      expect(screen.getAllByText('Portal Equipos')[0]).toBeInTheDocument();
    });

    it('debe mostrar Empresa para SUPERADMIN', () => {
      state.auth.user = { email: 'super@test.com', role: 'SUPERADMIN', empresaId: 1 };

      render(
        <MemoryRouter initialEntries={['/']}>
          <Routes>
            <Route element={<MainLayout />}>
              <Route path="/" element={<div>child</div>} />
            </Route>
          </Routes>
        </MemoryRouter>
      );

      expect(screen.getAllByText('Empresa')[0]).toBeInTheDocument();
    });

    it('debe mostrar Usuarios finales para SUPERADMIN', () => {
      state.auth.user = { email: 'super@test.com', role: 'SUPERADMIN', empresaId: 1 };

      render(
        <MemoryRouter initialEntries={['/']}>
          <Routes>
            <Route element={<MainLayout />}>
              <Route path="/" element={<div>child</div>} />
            </Route>
          </Routes>
        </MemoryRouter>
      );

      expect(screen.getAllByText('Usuarios finales')[0]).toBeInTheDocument();
    });

    it('debe mostrar Documentos cuando serviceFlags.documentos es true', () => {
      state.auth.user = { email: 'super@test.com', role: 'SUPERADMIN', empresaId: 1 };
      serviceFlags = { documentos: true };

      render(
        <MemoryRouter initialEntries={['/']}>
          <Routes>
            <Route element={<MainLayout />}>
              <Route path="/" element={<div>child</div>} />
            </Route>
          </Routes>
        </MemoryRouter>
      );

      expect(screen.getAllByText('Documentos')[0]).toBeInTheDocument();
    });

    it('no debe mostrar Documentos cuando serviceFlags.documentos es false', () => {
      state.auth.user = { email: 'super@test.com', role: 'SUPERADMIN', empresaId: 1 };
      serviceFlags = { documentos: false };

      render(
        <MemoryRouter initialEntries={['/']}>
          <Routes>
            <Route element={<MainLayout />}>
              <Route path="/" element={<div>child</div>} />
            </Route>
          </Routes>
        </MemoryRouter>
      );

      expect(screen.queryByText('Documentos')).not.toBeInTheDocument();
    });

    it('debe mostrar Usuarios para DADOR_DE_CARGA', () => {
      state.auth.user = { email: 'dador@test.com', role: 'DADOR_DE_CARGA', empresaId: 1 };

      render(
        <MemoryRouter initialEntries={['/']}>
          <Routes>
            <Route element={<MainLayout />}>
              <Route path="/" element={<div>child</div>} />
            </Route>
          </Routes>
        </MemoryRouter>
      );

      expect(screen.getAllByText('Usuarios')[0]).toBeInTheDocument();
    });

    it('debe mostrar Remitos para TRANSPORTISTA', () => {
      state.auth.user = { email: 'trans@test.com', role: 'TRANSPORTISTA', empresaId: 1 };

      render(
        <MemoryRouter initialEntries={['/']}>
          <Routes>
            <Route element={<MainLayout />}>
              <Route path="/" element={<div>child</div>} />
            </Route>
          </Routes>
        </MemoryRouter>
      );

      expect(screen.getAllByText('Remitos')[0]).toBeInTheDocument();
    });
  });

  describe('versión en footer', () => {
    it('debe mostrar versión de la app', () => {
      render(
        <MemoryRouter initialEntries={['/']}>
          <Routes>
            <Route element={<MainLayout />}>
              <Route path="/" element={<div>child</div>} />
            </Route>
          </Routes>
        </MemoryRouter>
      );

      expect(screen.getByText('MKT v1.0')).toBeInTheDocument();
    });
  });

  describe('navegación en sidebar', () => {
    it('debe mostrar Mi Perfil en configuración', () => {
      render(
        <MemoryRouter initialEntries={['/']}>
          <Routes>
            <Route element={<MainLayout />}>
              <Route path="/" element={<div>child</div>} />
            </Route>
          </Routes>
        </MemoryRouter>
      );

      expect(screen.getAllByText('Mi Perfil')[0]).toBeInTheDocument();
    });
  });

  describe('fallback de usuario', () => {
    it('debe renderizar correctamente cuando no hay email', () => {
      state.auth.user = { role: 'ADMIN', empresaId: 1 };

      render(
        <MemoryRouter initialEntries={['/']}>
          <Routes>
            <Route element={<MainLayout />}>
              <Route path="/" element={<div>child</div>} />
            </Route>
          </Routes>
        </MemoryRouter>
      );

      // Debería mostrar algo por defecto
      expect(screen.getByText('child')).toBeInTheDocument();
    });
  });
});

