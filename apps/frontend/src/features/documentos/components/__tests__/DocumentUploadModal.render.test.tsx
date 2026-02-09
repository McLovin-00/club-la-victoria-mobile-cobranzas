import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, jest } from '@jest/globals';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';

import { DocumentUploadModal } from '../DocumentUploadModal';
import { documentosApiSlice } from '../../api/documentosApiSlice';

describe('DocumentUploadModal (render)', () => {
  const templates: any[] = [
    { id: 1, nombre: 'Licencia', entityType: 'CHOFER', isActive: true },
    { id: 2, nombre: 'Seguro', entityType: 'DADOR', isActive: true },
  ];

  function renderWithStore(ui: React.ReactElement) {
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

    return render(<Provider store={store}>{ui}</Provider>);
  }

  it('no renderiza si isOpen=false', () => {
    renderWithStore(
      <DocumentUploadModal
        isOpen={false}
        onClose={jest.fn()}
        onUpload={jest.fn()}
        templates={templates as any}
        isLoading={false}
      />
    );

    expect(screen.queryByRole('heading', { name: /Subir Documento/i })).not.toBeInTheDocument();
  });

  it('renderiza título y permite cambiar Tipo de Entidad', () => {
    renderWithStore(
      <DocumentUploadModal
        isOpen
        onClose={jest.fn()}
        onUpload={jest.fn()}
        templates={templates as any}
        isLoading={false}
      />
    );

    expect(screen.getByRole('heading', { name: /Subir Documento/i })).toBeInTheDocument();

    // Cambiar tipo: CHOFER -> DADOR y verificar que el placeholder se actualiza
    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'DADOR' } });
    expect(screen.getByPlaceholderText(/CUIT del dador/i)).toBeInTheDocument();
  });
});


