// Tests de `ChoferDashboard`: render condicional de card "Alta Completa" según rol + navegación real.
import React from 'react';
import { describe, it, expect } from '@jest/globals';
import { render, screen, fireEvent } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import ChoferDashboard from '../ChoferDashboard';

const renderWithRole = (role: string) => {
  const store = configureStore({
    reducer: {
      auth: () => ({ user: { role } }),
    },
  });

  render(
    <Provider store={store}>
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/" element={<ChoferDashboard />} />
          <Route path="/documentos/consulta" element={<div>consulta</div>} />
          <Route path="/documentos/equipos/alta-completa" element={<div>alta</div>} />
        </Routes>
      </MemoryRouter>
    </Provider>
  );
};

describe('ChoferDashboard', () => {
  it('si role=CHOFER no muestra "Alta Completa de Equipo" y navega a consulta', () => {
    renderWithRole('CHOFER');
    expect(screen.queryByText('Alta Completa de Equipo')).not.toBeInTheDocument();
    fireEvent.click(screen.getByText('Consulta de Equipos'));
    expect(screen.getByText('consulta')).toBeInTheDocument();
  });

  it('si role!=CHOFER muestra "Alta Completa de Equipo" y permite navegar', () => {
    renderWithRole('OPERATOR');
    expect(screen.getByText('Alta Completa de Equipo')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Alta Completa de Equipo'));
    expect(screen.getByText('alta')).toBeInTheDocument();
  });
});


