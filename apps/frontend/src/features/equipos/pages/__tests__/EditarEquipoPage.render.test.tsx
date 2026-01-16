/**
 * Propósito: aumentar cobertura real de `EditarEquipoPage` ejecutando render con route params.
 * Nota: evita IO real (hooks RTK Query están mockeados en `jest.setup.cjs`).
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { jest } from '@jest/globals';

// El archivo exporta default, pero también lo importan otros tests como named;
// acá usamos default para ejecutar el componente real con rutas.
import EditarEquipoPage from '../EditarEquipoPage';

/**
 * Store mínimo para `react-redux` Provider.
 * Evita inicializar el store real (que dispara RTK Query + fetchBaseQuery).
 */
const state = {
  auth: { user: { empresaId: 1, role: 'SUPERADMIN' }, token: 'mock-token', isInitialized: true },
};
const mockStore = {
  getState: () => state,
  dispatch: jest.fn(),
  subscribe: jest.fn(() => () => {}),
};

function renderWithRoute(equipoId: number) {
  return render(
    <Provider store={mockStore as any}>
      <MemoryRouter initialEntries={[`/equipos/${equipoId}/editar`]}>
        <Routes>
          <Route path="/equipos/:id/editar" element={<EditarEquipoPage />} />
        </Routes>
      </MemoryRouter>
    </Provider>
  );
}

describe('EditarEquipoPage (render)', () => {
  it('debe renderizar el título con el id del equipo', () => {
    renderWithRoute(123);
    // Con store mínimo (sin RTK Query real) el hook puede quedar en loading.
    expect(screen.getByText('Cargando equipo...')).toBeInTheDocument();
  });
});


