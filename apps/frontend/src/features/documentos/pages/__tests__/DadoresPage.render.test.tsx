import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from '@jest/globals';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { configureStore } from '@reduxjs/toolkit';

import DadoresPage from '../DadoresPage';
import { documentosApiSlice } from '../../api/documentosApiSlice';

function renderPage() {
  const store = configureStore({
    reducer: {
      auth: () => ({
        user: { id: 1, email: 'test@test.com', role: 'SUPERADMIN', empresaId: 1 },
        token: 'mock-token',
        isAuthenticated: true,
        initialized: true,
      }),
      [documentosApiSlice.reducerPath]: documentosApiSlice.reducer,
    },
    middleware: (gdm) => gdm().concat(documentosApiSlice.middleware),
  });

  return render(
    <Provider store={store}>
      <MemoryRouter initialEntries={['/documentos/dadores']}>
        <DadoresPage />
      </MemoryRouter>
    </Provider>
  );
}

describe('DadoresPage (render)', () => {
  it('renderiza el título sin crashear', () => {
    renderPage();
    expect(screen.getByText('Dadores de carga')).toBeInTheDocument();
  });
});


