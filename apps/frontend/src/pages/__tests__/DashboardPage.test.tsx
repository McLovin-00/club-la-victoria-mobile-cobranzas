import { describe, it, expect, beforeAll, beforeEach, jest } from '@jest/globals';
import { render, screen } from '@testing-library/react';

describe('DashboardPage', () => {
  let state: any = {};

  let DashboardPage: React.FC;
  let MemoryRouter: typeof import('react-router-dom').MemoryRouter;
  let Routes: typeof import('react-router-dom').Routes;
  let Route: typeof import('react-router-dom').Route;

  beforeAll(async () => {
    await jest.unstable_mockModule('react-redux', () => ({
      useSelector: (sel: any) => sel(state),
    }));

    // Evitar depender de dashboards reales (mucho UI)
    await jest.unstable_mockModule('../../features/dashboard/components/SuperAdminDashboard', () => ({
      SuperAdminDashboard: () => <div>super-dashboard</div>,
    }));
    await jest.unstable_mockModule('../../features/dashboard/components/AdminDashboard', () => ({
      AdminDashboard: () => <div>admin-dashboard</div>,
    }));
    await jest.unstable_mockModule('../../features/dashboard/components/UserDashboard', () => ({
      UserDashboard: () => <div>user-dashboard</div>,
    }));

    ({ default: DashboardPage } = await import('../DashboardPage'));
    ({ MemoryRouter, Routes, Route } = await import('react-router-dom'));
  });

  beforeEach(() => {
    jest.clearAllMocks();
    state = { auth: { user: null } };
  });

  it('si no hay usuario, retorna null', () => {
    state = { auth: { user: null } };
    const { container } = render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/" element={<DashboardPage />} />
        </Routes>
      </MemoryRouter>
    );
    expect(container.textContent).toBe('');
  });

  it('redirige desde "/" según rol', async () => {
    const cases: Array<[string, string]> = [
      ['ADMIN_INTERNO', '/portal/admin-interno'],
      ['DADOR_DE_CARGA', '/dador'],
      ['TRANSPORTISTA', '/transportista'],
      ['EMPRESA_TRANSPORTISTA', '/transportista'],
      ['CHOFER', '/chofer'],
      ['CLIENTE', '/cliente'],
      ['CLIENTE_TRANSPORTE', '/cliente'],
    ];

    for (const [role, expectedPath] of cases) {
      state = { auth: { user: { role } } };
      const { unmount } = render(
        <MemoryRouter initialEntries={['/']}>
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path={expectedPath} element={<div>destino:{expectedPath}</div>} />
          </Routes>
        </MemoryRouter>
      );

      expect(screen.getByText(`destino:${expectedPath}`)).toBeInTheDocument();
      unmount();
    }
  });

  it('renderiza dashboards para SUPERADMIN y ADMIN', () => {
    state = { auth: { user: { role: 'SUPERADMIN' } } };
    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <Routes>
          <Route path="/dashboard" element={<DashboardPage />} />
        </Routes>
      </MemoryRouter>
    );
    expect(screen.getByText('super-dashboard')).toBeInTheDocument();

    state = { auth: { user: { role: 'ADMIN' } } };
    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <Routes>
          <Route path="/dashboard" element={<DashboardPage />} />
        </Routes>
      </MemoryRouter>
    );
    expect(screen.getByText('admin-dashboard')).toBeInTheDocument();

    state = { auth: { user: { role: 'OPERATOR' } } };
    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <Routes>
          <Route path="/dashboard" element={<DashboardPage />} />
        </Routes>
      </MemoryRouter>
    );
    expect(screen.getByText('user-dashboard')).toBeInTheDocument();
  });
});


