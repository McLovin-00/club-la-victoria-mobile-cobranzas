import { describe, it, expect, beforeAll, beforeEach, jest } from '@jest/globals';
import { render, screen } from '@testing-library/react';

describe('RequirePasswordChange', () => {
  let mustChangePassword = false;
  let RequirePasswordChange: React.FC;
  let MemoryRouter: typeof import('react-router-dom').MemoryRouter;
  let Routes: typeof import('react-router-dom').Routes;
  let Route: typeof import('react-router-dom').Route;

  beforeAll(async () => {
    await jest.unstable_mockModule('../../../../store/hooks', () => ({
      useAppSelector: () => mustChangePassword,
    }));

    ({ RequirePasswordChange } = await import('../RequirePasswordChange'));
    ({ MemoryRouter, Routes, Route } = await import('react-router-dom'));
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('redirige a /perfil si mustChangePassword=true y no está en /perfil', async () => {
    mustChangePassword = true;

    render(
      <MemoryRouter initialEntries={['/x']}>
        <Routes>
          <Route element={<RequirePasswordChange />}>
            <Route path="/x" element={<div>x</div>} />
          </Route>
          <Route path="/perfil" element={<div>perfil</div>} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('perfil')).toBeInTheDocument();
  });

  it('deja pasar si ya está en /perfil', async () => {
    mustChangePassword = true;

    render(
      <MemoryRouter initialEntries={['/perfil']}>
        <Routes>
          <Route element={<RequirePasswordChange />}>
            <Route path="/perfil" element={<div>perfil-outlet</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('perfil-outlet')).toBeInTheDocument();
  });

  it('deja pasar si mustChangePassword=false', async () => {
    mustChangePassword = false;

    render(
      <MemoryRouter initialEntries={['/x']}>
        <Routes>
          <Route element={<RequirePasswordChange />}>
            <Route path="/x" element={<div>x</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('x')).toBeInTheDocument();
  });
});


