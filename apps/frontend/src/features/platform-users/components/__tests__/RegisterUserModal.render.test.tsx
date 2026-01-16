import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { describe, it, expect, jest } from '@jest/globals';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { configureStore } from '@reduxjs/toolkit';
import { RegisterUserModal } from '../RegisterUserModal';
import apiSlice from '../../../../store/apiSlice';
import { documentosApiSlice } from '../../../documentos/api/documentosApiSlice';

function getRoleSelect(): HTMLSelectElement {
  const label = screen.getByText('Rol *');
  const container = label.parentElement as HTMLElement;
  return within(container).getByRole('combobox') as HTMLSelectElement;
}

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

describe('RegisterUserModal (render)', () => {
  it('no debe renderizar contenido si isOpen=false', () => {
    renderWithAuthUser(<RegisterUserModal isOpen={false} onClose={jest.fn()} />);

    expect(screen.queryByText(/Nuevo Usuario/i)).not.toBeInTheDocument();
  });

  it('debe mostrar/ocultar secciones según el rol seleccionado (cliente/dador/transportista)', () => {
    renderWithAuthUser(<RegisterUserModal isOpen onClose={jest.fn()} />);

    // Base
    expect(screen.getByText(/Nuevo Usuario/i)).toBeInTheDocument();
    expect(screen.getByText('Empresa (Tenant) *')).toBeInTheDocument();

    const roleSelect = getRoleSelect();

    // CLIENTE: debe ocultar password y permitir modo wizard
    fireEvent.change(roleSelect, { target: { value: 'CLIENTE' } });
    expect(screen.getByText('Asociar cliente existente')).toBeInTheDocument();
    expect(screen.getByText('Crear cliente nuevo + crear usuario')).toBeInTheDocument();
    expect(screen.queryByText('Password temporal *')).not.toBeInTheDocument();

    fireEvent.click(screen.getByLabelText('Crear cliente nuevo + crear usuario'));
    expect(screen.getByText('Razón Social (Cliente) *')).toBeInTheDocument();
    expect(screen.getByText('CUIT (11 dígitos) *')).toBeInTheDocument();

    // DADOR: debe mostrar wizard + selector de dador existente
    fireEvent.change(roleSelect, { target: { value: 'DADOR_DE_CARGA' } });
    expect(screen.getByText('Asociar dador existente')).toBeInTheDocument();
    expect(screen.getByText('Crear dador nuevo + crear usuario')).toBeInTheDocument();
    expect(screen.getByText('Password temporal *')).toBeInTheDocument();
    expect(screen.getByText('Dador de Carga asociado *')).toBeInTheDocument();

    // TRANSPORTISTA: debe mostrar wizard y, como SUPERADMIN, pedir dador para filtrar transportistas
    fireEvent.change(roleSelect, { target: { value: 'TRANSPORTISTA' } });
    expect(screen.getByText('Asociar transportista existente')).toBeInTheDocument();
    expect(screen.getByText('Crear transportista nuevo + crear usuario')).toBeInTheDocument();
    expect(screen.getByText('Dador de Carga *')).toBeInTheDocument();

    // Al inicio, el selector de transportista debe estar disabled hasta elegir dador
    const transportistaLabel = screen.getByText(/Empresa Transportista asociada/i);
    const transportistaContainer = transportistaLabel.parentElement as HTMLElement;
    const select = within(transportistaContainer).getByRole('combobox') as HTMLSelectElement;
    expect(select).toBeDisabled();
  });
});


