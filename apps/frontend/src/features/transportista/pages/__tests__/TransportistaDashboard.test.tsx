/**
 * Tests para TransportistaDashboard
 * 
 * Cubre el dashboard del portal de empresa transportista.
 */
import React from 'react';
import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import TransportistaDashboard from '../TransportistaDashboard';

// Mock del logo
jest.mock('../../../../assets/logo-bca.jpg', () => 'mock-logo.jpg');

describe('TransportistaDashboard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renderiza el título y descripción', () => {
    render(
      <MemoryRouter>
        <TransportistaDashboard />
      </MemoryRouter>
    );
    
    expect(screen.getByText('Portal Empresa Transportista')).toBeInTheDocument();
    expect(screen.getByText('Gestión de equipos y documentación')).toBeInTheDocument();
  });

  it('muestra el logo de BCA', () => {
    render(
      <MemoryRouter>
        <TransportistaDashboard />
      </MemoryRouter>
    );
    
    const logo = screen.getByAltText('Grupo BCA');
    expect(logo).toBeInTheDocument();
  });

  it('muestra tarjeta de Alta Completa de Equipo', () => {
    render(
      <MemoryRouter>
        <TransportistaDashboard />
      </MemoryRouter>
    );
    
    expect(screen.getByText('Alta Completa de Equipo')).toBeInTheDocument();
    expect(screen.getByText('Registrar nuevo equipo con toda su documentación')).toBeInTheDocument();
    expect(screen.getByText('Carga de chofer')).toBeInTheDocument();
    expect(screen.getByText('Registro de camión y acoplado')).toBeInTheDocument();
    expect(screen.getByText('Subida de todos los documentos requeridos')).toBeInTheDocument();
  });

  it('muestra tarjeta de Consulta de Equipos', () => {
    render(
      <MemoryRouter>
        <TransportistaDashboard />
      </MemoryRouter>
    );
    
    expect(screen.getByText('Consulta de Equipos')).toBeInTheDocument();
    expect(screen.getByText('Buscar equipos existentes y actualizar su documentación')).toBeInTheDocument();
    expect(screen.getByText('Buscar por DNI chofer, patente camión o acoplado')).toBeInTheDocument();
    expect(screen.getByText('Ver estado completo de documentación')).toBeInTheDocument();
    expect(screen.getByText('Actualizar documentos vencidos o faltantes')).toBeInTheDocument();
  });

  it('muestra nota informativa', () => {
    render(
      <MemoryRouter>
        <TransportistaDashboard />
      </MemoryRouter>
    );
    
    expect(screen.getByText(/Los documentos que subas quedan pendientes de aprobación/)).toBeInTheDocument();
  });

  it('navega a alta completa al hacer click en la tarjeta', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/" element={<TransportistaDashboard />} />
          <Route path="/documentos/equipos/alta-completa" element={<div>Alta Completa Page</div>} />
        </Routes>
      </MemoryRouter>
    );
    
    fireEvent.click(screen.getByText('Alta Completa de Equipo'));
    
    expect(screen.getByText('Alta Completa Page')).toBeInTheDocument();
  });

  it('navega a consulta al hacer click en la tarjeta', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/" element={<TransportistaDashboard />} />
          <Route path="/documentos/consulta" element={<div>Consulta Page</div>} />
        </Routes>
      </MemoryRouter>
    );
    
    fireEvent.click(screen.getByText('Consulta de Equipos'));
    
    expect(screen.getByText('Consulta Page')).toBeInTheDocument();
  });

  it('navega a alta completa al hacer click en botón Iniciar Alta Completa', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/" element={<TransportistaDashboard />} />
          <Route path="/documentos/equipos/alta-completa" element={<div>Alta Completa Page</div>} />
        </Routes>
      </MemoryRouter>
    );
    
    fireEvent.click(screen.getByRole('button', { name: /iniciar alta completa/i }));
    
    expect(screen.getByText('Alta Completa Page')).toBeInTheDocument();
  });

  it('navega a consulta al hacer click en botón Ir a Consulta', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/" element={<TransportistaDashboard />} />
          <Route path="/documentos/consulta" element={<div>Consulta Page</div>} />
        </Routes>
      </MemoryRouter>
    );
    
    fireEvent.click(screen.getByRole('button', { name: /ir a consulta/i }));
    
    expect(screen.getByText('Consulta Page')).toBeInTheDocument();
  });
});
