/**
 * Tests de cobertura para ChoferDashboard refactorizados para ESM
 */
import React from 'react';
import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import '@testing-library/jest-dom';

// variables compartidas para mocks
let mockRole = 'CHOFER';

// Define mocks
jest.unstable_mockModule('../../../../store/hooks', () => ({
  useAppSelector: (selector: any) => selector({ auth: { user: { role: mockRole } } }),
}));

// Mock de la imagen
jest.unstable_mockModule('../../../../assets/logo-bca.jpg', () => ({
  default: 'mock-logo.jpg'
}));

// Import dynamic (default import)
const { default: ChoferDashboard } = await import('../ChoferDashboard');

// Store para tests
const createTestStore = (role = 'CHOFER') => configureStore({
  reducer: {
    auth: () => ({ user: { role } }),
  },
});

const renderWithProviders = (role = 'CHOFER') => {
  mockRole = role;
  const store = createTestStore(role);
  return render(
    <Provider store={store}>
      <MemoryRouter>
        <ChoferDashboard />
      </MemoryRouter>
    </Provider>
  );
};

describe('ChoferDashboard - Coverage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRole = 'CHOFER';
  });

  it('debería renderizar el dashboard para chofer', () => {
    renderWithProviders('CHOFER');
    expect(screen.getByText('Portal Chofer')).toBeInTheDocument();
    expect(screen.getByText('Consulta de Equipos')).toBeInTheDocument();
  });

  it('debería mostrar el botón de Alta Completa para no choferes', () => {
    renderWithProviders('ADMIN');
    expect(screen.getByText('Alta Completa de Equipo')).toBeInTheDocument();
  });
});
