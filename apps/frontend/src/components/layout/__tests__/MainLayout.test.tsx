import { describe, it, expect, beforeAll, beforeEach, jest } from '@jest/globals';
import { render, screen, fireEvent } from '@testing-library/react';

describe('MainLayout', () => {
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

  it('renderiza header y permite abrir/cerrar el menú de usuario y logout', async () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/login" element={<div>login</div>} />
          <Route element={<MainLayout />}>
            <Route path="/" element={<div>child</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    );

    // outlet
    expect(screen.getByText('child')).toBeInTheDocument();

    // abrir menú usuario (botón con avatar)
    fireEvent.click(screen.getByText('admin'));
    expect(screen.getByText('Usuario')).toBeInTheDocument();

    // logout
    fireEvent.click(screen.getByText('Cerrar Sesión'));
    expect(dispatch).toHaveBeenCalledWith(expect.objectContaining({ type: expect.stringContaining('logout') }));
  });

  it('muestra ítems de navegación para ADMIN_INTERNO (gestión + remitos)', async () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route element={<MainLayout />}>
            <Route path="/" element={<div>child</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    );

    // Sidebar está en DOM aunque esté oculto; verificamos que existan labels
    expect(screen.getAllByText('Dashboard')[0]).toBeInTheDocument();
    expect(screen.getAllByText('Usuarios')[0]).toBeInTheDocument();
    expect(screen.getAllByText('Remitos')[0]).toBeInTheDocument();
    expect(screen.getAllByText('Portal Equipos')[0]).toBeInTheDocument();
  });
});


