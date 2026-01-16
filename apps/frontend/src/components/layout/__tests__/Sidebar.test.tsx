/**
 * Tests para el componente Sidebar
 * Verifica renderizado y navegación del sidebar
 */
import { describe, it, expect, beforeAll, beforeEach, jest } from '@jest/globals';
import { render, screen } from '@testing-library/react';

describe('Sidebar', () => {
  let state: any = {};
  let serviceFlags: any = { documentos: true };

  let Sidebar: React.FC;
  let MemoryRouter: typeof import('react-router-dom').MemoryRouter;

  beforeAll(async () => {
    await jest.unstable_mockModule('react-redux', () => ({
      useSelector: (sel: any) => sel(state),
    }));

    await jest.unstable_mockModule('../../../hooks/useServiceConfig', () => ({
      useServiceFlags: () => serviceFlags,
    }));

    await jest.unstable_mockModule('../../../store/hooks', () => ({
      useAppSelector: (sel: any) => sel(state),
    }));

    ({ Sidebar } = await import('../Sidebar'));
    ({ MemoryRouter } = await import('react-router-dom'));
  });

  beforeEach(() => {
    serviceFlags = { documentos: true };
    state = {
      auth: {
        user: { email: 'user@test.com', role: 'ADMIN_INTERNO' },
      },
    };
  });

  it('debe renderizar el enlace al Dashboard', async () => {
    render(
      <MemoryRouter>
        <Sidebar />
      </MemoryRouter>
    );

    expect(screen.getByText('Dashboard')).toBeInTheDocument();
  });

  it('debe mostrar sección de Administración', async () => {
    render(
      <MemoryRouter>
        <Sidebar />
      </MemoryRouter>
    );

    expect(screen.getByText('Administración')).toBeInTheDocument();
  });

  it('debe mostrar enlace a Usuarios', async () => {
    render(
      <MemoryRouter>
        <Sidebar />
      </MemoryRouter>
    );

    expect(screen.getByText('Usuarios')).toBeInTheDocument();
  });

  it('debe mostrar enlace a Usuarios finales', async () => {
    render(
      <MemoryRouter>
        <Sidebar />
      </MemoryRouter>
    );

    expect(screen.getByText('Usuarios finales')).toBeInTheDocument();
  });

  it('debe mostrar enlace a Empresas para SUPERADMIN', async () => {
    state = {
      auth: {
        user: { email: 'super@test.com', role: 'SUPERADMIN' },
      },
    };

    render(
      <MemoryRouter>
        <Sidebar />
      </MemoryRouter>
    );

    expect(screen.getByText('Empresa')).toBeInTheDocument();
  });

  it('no debe mostrar enlace a Empresas para usuarios no SUPERADMIN', async () => {
    state = {
      auth: {
        user: { email: 'user@test.com', role: 'ADMIN_INTERNO' },
      },
    };

    render(
      <MemoryRouter>
        <Sidebar />
      </MemoryRouter>
    );

    expect(screen.queryByText('Empresa')).not.toBeInTheDocument();
  });

  it('debe aplicar estilos base', async () => {
    const { container } = render(
      <MemoryRouter>
        <Sidebar />
      </MemoryRouter>
    );

    const sidebar = container.firstChild as HTMLElement;
    expect(sidebar).toHaveClass('h-full');
    expect(sidebar).toHaveClass('w-60');
    expect(sidebar).toHaveClass('bg-background');
  });
});
