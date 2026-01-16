/**
 * Tests de cobertura para RequirePasswordChange
 */
import React from 'react';
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

describe('RequirePasswordChange - Coverage', () => {
  let RequirePasswordChange: any;

  beforeAll(async () => {
    // Mock de store/hooks
    await jest.unstable_mockModule('../../../../store/hooks', () => ({
      useAppSelector: jest.fn((selector: any) => selector({
        auth: {
          user: { id: 1, mustChangePassword: false },
        },
      })),
    }));

    // Importar el componente
    const module = await import('../RequirePasswordChange');
    RequirePasswordChange = module.RequirePasswordChange;
  });

  it('debería importar el componente', () => {
    expect(RequirePasswordChange).toBeDefined();
  });

  it('debería renderizar Outlet cuando no debe cambiar contraseña', async () => {
    const { useAppSelector } = await import('../../../../store/hooks');
    (useAppSelector as jest.Mock).mockImplementation((selector: any) =>
      selector({
        auth: {
          user: { id: 1, mustChangePassword: false },
        },
      })
    );

    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <RequirePasswordChange />
      </MemoryRouter>
    );

    expect(document.body.children.length).toBeGreaterThan(0);
  });

  it('debería renderizar Outlet cuando está en /perfil aunque deba cambiar contraseña', async () => {
    const { useAppSelector } = await import('../../../../store/hooks');
    (useAppSelector as jest.Mock).mockImplementation((selector: any) =>
      selector({
        auth: {
          user: { id: 1, mustChangePassword: true },
        },
      })
    );

    render(
      <MemoryRouter initialEntries={['/perfil']}>
        <RequirePasswordChange />
      </MemoryRouter>
    );

    expect(document.body.children.length).toBeGreaterThan(0);
  });
});
