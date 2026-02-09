// Tests de `DadorDashboard`: navegación real via MemoryRouter/Routes.
import React from 'react';
import { describe, it, expect } from '@jest/globals';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import DadorDashboard from '../DadorDashboard';

describe('DadorDashboard', () => {
  it('navega a alta completa', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/" element={<DadorDashboard />} />
          <Route path="/documentos/equipos/alta-completa" element={<div>alta</div>} />
          <Route path="/documentos/consulta" element={<div>consulta</div>} />
          <Route path="/documentos/aprobacion" element={<div>aprobaciones</div>} />
        </Routes>
      </MemoryRouter>
    );

    fireEvent.click(screen.getByText('Alta Completa de Equipo'));
    expect(screen.getByText('alta')).toBeInTheDocument();
  });

  it('navega a consulta', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/" element={<DadorDashboard />} />
          <Route path="/documentos/consulta" element={<div>consulta</div>} />
        </Routes>
      </MemoryRouter>
    );

    fireEvent.click(screen.getByText('Consulta de Equipos'));
    expect(screen.getByText('consulta')).toBeInTheDocument();
  });

  it('navega a aprobaciones', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/" element={<DadorDashboard />} />
          <Route path="/documentos/aprobacion" element={<div>aprobaciones</div>} />
        </Routes>
      </MemoryRouter>
    );

    fireEvent.click(screen.getByText('Aprobaciones Pendientes'));
    expect(screen.getByText('aprobaciones')).toBeInTheDocument();
  });
});


