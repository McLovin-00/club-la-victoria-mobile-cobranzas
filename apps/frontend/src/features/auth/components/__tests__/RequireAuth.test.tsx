import { describe, it, expect, beforeAll, beforeEach, jest } from '@jest/globals';
import { render, screen } from '@testing-library/react';

describe('RequireAuth', () => {
  let state: any = {};
  let RequireAuth: (props: any) => JSX.Element;
  let MemoryRouter: typeof import('react-router-dom').MemoryRouter;
  let Routes: typeof import('react-router-dom').Routes;
  let Route: typeof import('react-router-dom').Route;

  beforeAll(async () => {
    await jest.unstable_mockModule('react-redux', () => ({
      useSelector: (sel: any) => sel(state),
    }));

    ({ RequireAuth } = await import('../RequireAuth'));
    ({ MemoryRouter, Routes, Route } = await import('react-router-dom'));
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('redirige a /login cuando no está autenticado', async () => {
    state = { auth: { isAuthenticated: false, user: null } };

    render(
      <MemoryRouter initialEntries={['/secret']}>
        <Routes>
          <Route element={<RequireAuth />}>
            <Route path="/secret" element={<div>secret</div>} />
          </Route>
          <Route path="/login" element={<div>login</div>} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('login')).toBeInTheDocument();
  });

  it('redirige a / cuando el rol no está permitido', async () => {
    state = { auth: { isAuthenticated: true, user: { role: 'OPERATOR' } } };

    render(
      <MemoryRouter initialEntries={['/secret']}>
        <Routes>
          <Route path="/" element={<div>home</div>} />
          <Route element={<RequireAuth allowedRoles={['ADMIN']} />}>
            <Route path="/secret" element={<div>secret</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('home')).toBeInTheDocument();
  });

  it('renderiza el Outlet cuando está autenticado y autorizado', async () => {
    state = { auth: { isAuthenticated: true, user: { role: 'ADMIN' } } };

    render(
      <MemoryRouter initialEntries={['/secret']}>
        <Routes>
          <Route element={<RequireAuth allowedRoles={['ADMIN']} />}>
            <Route path="/secret" element={<div>secret</div>} />
          </Route>
          <Route path="/login" element={<div>login</div>} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('secret')).toBeInTheDocument();
  });
});


