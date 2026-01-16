import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from '@jest/globals';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { configureStore } from '@reduxjs/toolkit';

import { EquiposPage } from '../EquiposPage';
import { documentosApiSlice } from '../../api/documentosApiSlice';

function renderWithRole(role: string) {
  const store = configureStore({
    reducer: {
      auth: () => ({
        user: { id: 1, email: 'test@test.com', role, empresaId: 1 },
        token: 'mock-token',
        isAuthenticated: true,
        initialized: true,
      }),
      [documentosApiSlice.reducerPath]: documentosApiSlice.reducer,
    },
    middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(documentosApiSlice.middleware),
  });

  return render(
    <Provider store={store}>
      <MemoryRouter initialEntries={['/documentos/equipos']}>
        <EquiposPage />
      </MemoryRouter>
    </Provider>
  );
}

describe('EquiposPage (render)', () => {
  it('renderiza el título principal', () => {
    renderWithRole('SUPERADMIN');
    expect(screen.getByText('Asociación de Equipos')).toBeInTheDocument();
  });

  it('renderiza también para rol DADOR_DE_CARGA', () => {
    renderWithRole('DADOR_DE_CARGA');
    expect(screen.getByText('Asociación de Equipos')).toBeInTheDocument();
  });
});

/**
 * Propósito: aumentar cobertura real de `EquiposPage` ejecutando render básico.
 * Nota: se apoya en mocks globales de `jest.setup.cjs` para evitar IO real.
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { describe, it, expect, jest } from '@jest/globals';

/**
 * Store mínimo para `react-redux` Provider.
 * Evita inicializar el store real (RTK Query).
 */
const state = {
  auth: { user: { empresaId: 1, role: 'SUPERADMIN' }, token: 'mock-token', isInitialized: true },
};
const mockStore = {
  getState: () => state,
  dispatch: jest.fn(),
  subscribe: jest.fn(() => () => {}),
};

describe('EquiposPage (render)', () => {
  it('debe renderizar sin crashear', async () => {
    (window as any).alert = jest.fn();

    const { EquiposPage } = await import('../EquiposPage');

    render(
      <Provider store={mockStore as any}>
        <MemoryRouter initialEntries={['/documentos/equipos']}>
          <EquiposPage />
        </MemoryRouter>
      </Provider>
    );

    expect(screen.getByText('Asociación de Equipos')).toBeInTheDocument();
  });
});

/**
 * Propósito: aumentar cobertura real de `EquiposPage` ejecutando render + validaciones simples.
 * Nota: evita IO real (RTK Query y runtime env están mockeados en `jest.setup.cjs`).
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { store } from '../../../../store/store';

async function renderWithAppRouter() {
  // Import dinámico para evitar problemas de `import.meta` fuera de ESM.
  const { EquiposPage } = await import('../EquiposPage');
  return render(
    <Provider store={store}>
      <MemoryRouter initialEntries={['/documentos/equipos']}>
        <Routes>
          <Route path="/documentos/equipos" element={<EquiposPage />} />
        </Routes>
      </MemoryRouter>
    </Provider>
  );
}

describe('EquiposPage (render)', () => {
  it('debe renderizar el título principal', async () => {
    await renderWithAppRouter();
    // Evitamos `getByRole` para no depender de getComputedStyle con pseudo-elementos.
    expect(screen.getByText('Asociación de Equipos')).toBeInTheDocument();
  });

  it('debe mantener deshabilitado el botón Buscar si no hay filtros válidos', async () => {
    await renderWithAppRouter();
    const buscarBtn = screen.getByText('Buscar').closest('button');
    expect(buscarBtn).not.toBeNull();
    expect(buscarBtn).toBeDisabled();
  });

  it('debe habilitar Buscar al ingresar un DNI válido', async () => {
    await renderWithAppRouter();
    const user = userEvent.setup();

    const dniInput = screen.getByLabelText('Buscar por DNI');
    await user.type(dniInput, '123456');

    const buscarBtn = screen.getByText('Buscar').closest('button');
    expect(buscarBtn).not.toBeNull();
    expect(buscarBtn).toBeEnabled();
  });
});


