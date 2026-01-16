import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { describe, it, expect, jest } from '@jest/globals';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { configureStore } from '@reduxjs/toolkit';
import apiSlice from '../../../../store/apiSlice';
import { documentosApiSlice } from '../../../documentos/api/documentosApiSlice';

describe('EditPlatformUserModal (render)', () => {
  function renderWithAuthUser(ui: React.ReactElement) {
    const store = configureStore({
      reducer: {
        auth: () => ({
          user: { id: 1, email: 'test@test.com', role: 'SUPERADMIN', empresaId: 1 },
          token: 'mock-token',
          isAuthenticated: true,
          initialized: true,
        }),
        api: apiSlice.reducer,
        [documentosApiSlice.reducerPath]: documentosApiSlice.reducer,
      },
      middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware().concat(apiSlice.middleware, documentosApiSlice.middleware),
    });

    return render(
      <Provider store={store}>
        <MemoryRouter>{ui}</MemoryRouter>
      </Provider>
    );
  }

  it('no debe renderizar contenido si isOpen=false', async () => {
    const { default: EditPlatformUserModal } = await import('../EditPlatformUserModal');
    renderWithAuthUser(
      <EditPlatformUserModal isOpen={false} onClose={jest.fn()} user={{ id: 1, email: 'a@a.com', role: 'ADMIN' }} />
    );

    expect(screen.queryByText('Guardar cambios')).not.toBeInTheDocument();
  });

  it('debe permitir cambiar rol y mostrar asociaciones (modo admin)', async () => {
    const { default: EditPlatformUserModal } = await import('../EditPlatformUserModal');

    renderWithAuthUser(
      <EditPlatformUserModal isOpen onClose={jest.fn()} user={{ id: 1, email: 'a@a.com', role: 'ADMIN' }} />
    );

    // Base
    expect(screen.getByText('Editar Usuario de Plataforma')).toBeInTheDocument();

    // Rol select (en modo SUPERADMIN debería estar editable)
    const roleLabel = screen.getAllByText('Rol')[0];
    const roleContainer = roleLabel.parentElement as HTMLElement;
    const roleSelect = within(roleContainer).getByRole('combobox') as HTMLSelectElement;

    fireEvent.change(roleSelect, { target: { value: 'DADOR_DE_CARGA' } });
    expect(screen.getByText('Dador de Carga asociado')).toBeInTheDocument();
  });
});


