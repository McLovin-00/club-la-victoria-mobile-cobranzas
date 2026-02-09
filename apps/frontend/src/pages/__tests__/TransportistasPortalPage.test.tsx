/**
 * Tests para TransportistasPortalPage refactorizados para ESM
 */
import React from 'react';
import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { configureStore } from '@reduxjs/toolkit';
import '@testing-library/jest-dom';

// variables compartidas para mocks
const mockDadores = [
  { id: 1, razonSocial: 'Dador Demo' },
  { id: 2, razonSocial: 'Otro Dador' },
];

// Mock scrollTo and scrollIntoView for JSDOM
if (typeof window !== 'undefined') {
  window.HTMLElement.prototype.scrollTo = jest.fn();
  window.HTMLElement.prototype.scrollIntoView = jest.fn();
}

const createMinimalMock = jest.fn().mockReturnValue({ unwrap: () => Promise.resolve({ id: 1 }) });
const uploadBatchMock = jest.fn().mockReturnValue({ unwrap: () => Promise.resolve() });
let batchJobStatus: any = undefined;

// Stable mock values to avoid infinite re-renders
const dadoresData = { list: mockDadores };
const createMinimalResult = { isLoading: false };
const uploadBatchResult = { isLoading: false, data: undefined };
const defaultsData = { defaultDadorId: 1 };
const misEquiposData: any[] = [];
const searchMutationMock = jest.fn();
const searchResult = { data: [], isLoading: false };

// Define mocks
jest.unstable_mockModule('../../features/documentos/api/documentosApiSlice', () => ({
  useGetDadoresQuery: () => ({ data: dadoresData }),
  useCreateEquipoMinimalMutation: () => [createMinimalMock, createMinimalResult],
  useUploadBatchDocsTransportistasMutation: () => [uploadBatchMock, uploadBatchResult],
  useGetJobStatusQuery: () => ({ data: batchJobStatus ? { job: batchJobStatus } : undefined }),
  useGetDefaultsQuery: () => ({ data: defaultsData }),
  useGetMisEquiposQuery: () => ({ data: misEquiposData }),
  useTransportistasSearchMutation: () => [searchMutationMock, searchResult],
}));

// Mock de toast
jest.unstable_mockModule('../../components/ui/Toast.utils', () => ({
  showToast: jest.fn(),
}));

// Import dynamic
const { TransportistasPortalPage } = await import('../TransportistasPortalPage');

// Store para tests
const createTestStore = () => configureStore({
  reducer: {
    // Necesario para que RTK Query funcione si se usan los hooks reales, 
    // pero aquí estamos mockeando los hooks del slice entero.
    // Sin embargo, algunos hooks internos podrían seguir necesitando el estado.
    auth: () => ({ user: { id: 1, role: 'TRANSPORTISTA' } }),
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

describe('TransportistasPortalPage - Tests de interacción (Registro y Documentos)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    batchJobStatus = undefined;
  });

  it('Registro: llena campos y crea equipo', async () => {
    renderWithProviders(<TransportistasPortalPage />);

    // Ir a la pestaña Registro
    const regTab = screen.getByText(/Registro/);
    fireEvent.click(regTab);

    // Campos del registro
    const dniInput = await screen.findByPlaceholderText('Ej: 12345678');
    const tractorInput = screen.getByPlaceholderText('AA123BB');
    const acopladoInput = screen.getByPlaceholderText('AC456CD (opcional)');

    // Ingresar datos
    fireEvent.change(dniInput, { target: { value: '11223344' } });
    fireEvent.change(tractorInput, { target: { value: 'AB123CD' } });
    fireEvent.change(acopladoInput, { target: { value: 'AC999XX' } });

    // Teléfonos: ingresar uno
    const phoneInput = screen.getByPlaceholderText('+54911234567');
    fireEvent.change(phoneInput, { target: { value: '+54911112222' } });

    // Botón de crear
    const createBtn = screen.getByRole('button', { name: /Crear Equipo/i });

    await waitFor(() => {
      expect(createBtn).not.toBeDisabled();
    });

    fireEvent.click(createBtn);

    // Verificar llamada
    await waitFor(() => {
      expect(createMinimalMock).toHaveBeenCalled();
    });

    const payload = createMinimalMock.mock.calls[0][0];
    expect(payload).toEqual(expect.objectContaining({
      dniChofer: '11223344',
      patenteTractor: 'AB123CD',
      patenteAcoplado: 'AC999XX'
    }));
  });

  it('Documentos: subir batch de documentos', async () => {
    renderWithProviders(<TransportistasPortalPage />);

    // Ir a la pestaña Documentos
    const docTab = screen.getByText(/Docs/);
    fireEvent.click(docTab);

    // Encontrar input de archivos
    const fileInput = document.querySelector('input[type="file"][multiple]') as HTMLInputElement;
    const file = new File(['content'], 'test.pdf', { type: 'application/pdf' });

    fireEvent.change(fileInput, { target: { files: [file] } });

    // Click en Subir documentos
    const subirBtn = screen.getByText('Subir documentos');
    fireEvent.click(subirBtn);

    // Verificar llamada
    await waitFor(() => {
      expect(uploadBatchMock).toHaveBeenCalled();
    });

    const arg0 = uploadBatchMock.mock.calls[0][0];
    expect(arg0).toHaveProperty('files');
  });
});
