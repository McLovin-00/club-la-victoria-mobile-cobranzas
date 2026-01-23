/**
 * Tests para RemitosPage refactorizados para ESM
 */
import React from 'react';
import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { configureStore } from '@reduxjs/toolkit';
import '@testing-library/jest-dom';

// variables compartidas para mocks
const mockRefetch = jest.fn();
let mockRemitosData = {
  data: [] as any[],
  pagination: null as any,
  stats: null as any,
};
let mockIsLoading = false;
let mockIsFetching = false;
const mockUser = { id: 1, email: 'test@test.com', role: 'SUPERADMIN', empresaId: 1 };

// Define mocks
jest.unstable_mockModule('../../../auth/authSlice', () => ({
  selectCurrentUser: () => mockUser,
  selectCurrentToken: () => 'mock-token',
}));

jest.unstable_mockModule('../../api/remitosApiSlice', () => ({
  useGetRemitosQuery: () => ({
    data: mockRemitosData,
    isLoading: mockIsLoading,
    isFetching: mockIsFetching,
    refetch: mockRefetch,
  }),
}));

jest.unstable_mockModule('../../components/RemitoCard', () => ({
  RemitoCard: ({ remito, onClick }: any) => (
    <div data-testid={`remito-card-${remito.id}`} onClick={onClick}>
      {remito.numeroRemito}
    </div>
  ),
}));

jest.unstable_mockModule('../../components/RemitoUploader', () => ({
  RemitoUploader: ({ onSuccess }: any) => (
    <div data-testid="remito-uploader">
      <button onClick={onSuccess}>Upload Success</button>
    </div>
  ),
}));

jest.unstable_mockModule('../../components/RemitoDetail', () => ({
  RemitoDetail: ({ remito, onBack }: any) => (
    <div data-testid="remito-detail">
      <span>Detalle del remito {remito.id}</span>
      <button onClick={onBack}>Volver</button>
    </div>
  ),
}));

// Import dynamic
const { RemitosPage } = await import('../RemitosPage');

// Store para tests
const createTestStore = () => configureStore({
  reducer: {
    auth: () => ({ user: mockUser }),
  },
});

const renderWithProviders = (component: React.ReactElement) => {
  const store = createTestStore();
  return render(
    <Provider store={store}>
      <MemoryRouter>
        {component}
      </MemoryRouter>
    </Provider>
  );
};

describe('RemitosPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRemitosData = {
      data: [],
      pagination: null,
      stats: null,
    };
    mockIsLoading = false;
    mockIsFetching = false;
  });

  it('renderiza el título y descripción correctamente', () => {
    renderWithProviders(<RemitosPage />);
    expect(screen.getByText(/Remitos/)).toBeInTheDocument();
    expect(screen.getByText('Gestión de remitos de transporte')).toBeInTheDocument();
  });

  it('muestra skeleton loader cuando está cargando', () => {
    mockIsLoading = true;
    const { container } = renderWithProviders(<RemitosPage />);
    const skeletons = container.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('muestra mensaje cuando no hay remitos', () => {
    mockRemitosData = { data: [], pagination: null, stats: null };
    renderWithProviders(<RemitosPage />);
    expect(screen.getByText(/No hay remitos/)).toBeInTheDocument();
  });

  it('muestra stats cuando están disponibles', () => {
    mockRemitosData = {
      data: [],
      pagination: null,
      stats: { total: 100, pendientes: 30, aprobados: 60, rechazados: 10 },
    };
    renderWithProviders(<RemitosPage />);
    expect(screen.getByText('100')).toBeInTheDocument();
    expect(screen.getByText('30')).toBeInTheDocument();
    expect(screen.getByText('60')).toBeInTheDocument();
    expect(screen.getByText('10')).toBeInTheDocument();
  });

  it('muestra/oculta el uploader al hacer click', () => {
    renderWithProviders(<RemitosPage />);
    expect(screen.queryByTestId('remito-uploader')).not.toBeInTheDocument();

    const cargarButton = screen.getByRole('button', { name: /cargar remito/i });
    fireEvent.click(cargarButton);
    expect(screen.getByTestId('remito-uploader')).toBeInTheDocument();

    fireEvent.click(cargarButton);
    expect(screen.queryByTestId('remito-uploader')).not.toBeInTheDocument();
  });

  it('muestra lista de remitos', () => {
    mockRemitosData = {
      data: [
        { id: 1, numeroRemito: 'REM-001', estado: 'PENDIENTE_APROBACION' },
        { id: 2, numeroRemito: 'REM-002', estado: 'APROBADO' },
      ],
      pagination: null,
      stats: null,
    };
    renderWithProviders(<RemitosPage />);
    expect(screen.getByTestId('remito-card-1')).toBeInTheDocument();
    expect(screen.getByTestId('remito-card-2')).toBeInTheDocument();
  });

  it('navega al detalle al hacer click en un remito', () => {
    mockRemitosData = {
      data: [{ id: 1, numeroRemito: 'REM-001', estado: 'PENDIENTE_APROBACION' }],
      pagination: null,
      stats: null,
    };
    renderWithProviders(<RemitosPage />);
    fireEvent.click(screen.getByTestId('remito-card-1'));
    expect(screen.getByTestId('remito-detail')).toBeInTheDocument();
  });

  it('permite buscar por número de remito', () => {
    renderWithProviders(<RemitosPage />);
    const searchInput = screen.getByPlaceholderText('Buscar por número...');
    fireEvent.change(searchInput, { target: { value: 'REM-001' } });
    expect(searchInput).toHaveValue('REM-001');
  });

  it('uploader cierra y refresca al subir exitosamente', async () => {
    renderWithProviders(<RemitosPage />);
    fireEvent.click(screen.getByRole('button', { name: /cargar remito/i }));
    fireEvent.click(screen.getByText('Upload Success'));
    await waitFor(() => {
      expect(screen.queryByTestId('remito-uploader')).not.toBeInTheDocument();
    });
  });
});
