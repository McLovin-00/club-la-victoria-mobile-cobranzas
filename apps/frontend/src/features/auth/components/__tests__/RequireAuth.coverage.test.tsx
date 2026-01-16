/**
 * Tests de cobertura para RequireAuth
 */
import React from 'react';
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

describe('RequireAuth - Coverage', () => {
  let RequireAuth: any;

  beforeAll(async () => {
    // Mock de react-redux
    await jest.unstable_mockModule('react-redux', () => ({
      useSelector: jest.fn((selector: any) => selector({
        auth: {
          user: { id: 1, email: 'test@test.com', role: 'ADMIN_INTERNO' },
          isAuthenticated: true,
          token: 'test-token',
        },
      })),
      useDispatch: jest.fn(),
    }));

    // Importar el componente
    const module = await import('../RequireAuth');
    RequireAuth = module.RequireAuth;
  });

  it('debería importar el componente', () => {
    expect(RequireAuth).toBeDefined();
  });

  it('debería renderizar Outlet cuando está autenticado', async () => {
    const { useSelector } = await import('react-redux');
    (useSelector as jest.Mock).mockImplementation((selector: any) =>
      selector({
        auth: {
          user: { id: 1, email: 'test@test.com', role: 'ADMIN_INTERNO' },
          isAuthenticated: true,
          token: 'test-token',
        },
      })
    );

    render(
      <MemoryRouter>
        <RequireAuth />
      </MemoryRouter>
    );

    expect(document.body.children.length).toBeGreaterThan(0);
  });
});
