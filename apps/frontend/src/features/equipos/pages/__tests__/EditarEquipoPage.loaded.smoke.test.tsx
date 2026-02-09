/**
 * Propósito: Smoke test de `EditarEquipoPage` (estado cargado) para subir coverage.
 * Nota: lo dejamos en archivo separado para evitar `jest.resetModules()` y problemas de contexto con React Router.
 */

import React from 'react';
import { jest } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ConfirmContext } from '@/contexts/confirmContext';

jest.unstable_mockModule('@/hooks/useRoleBasedNavigation', () => ({
  useRoleBasedNavigation: () => ({ goBack: jest.fn() }),
}));

jest.unstable_mockModule('../../../documentos/api/documentosApiSlice', () => ({
  useGetEquipoByIdQuery: () => ({
    data: {
      id: 1,
      dadorCargaId: 1,
      driverId: 10,
      truckId: 20,
      trailerId: null,
      empresaTransportistaId: null,
      clientes: [],
    },
    isLoading: false,
    refetch: jest.fn(),
  }),
  useGetClientsQuery: () => ({ data: { list: [] } }),
  useGetChoferesQuery: () => ({ data: { data: [] } }),
  useGetCamionesQuery: () => ({ data: { data: [] } }),
  useGetAcopladosQuery: () => ({ data: { data: [] } }),
  useGetEmpresasTransportistasQuery: () => ({ data: [] }),
  useGetEquipoRequisitosQuery: () => ({ data: [], refetch: jest.fn() }),
  useLazyCheckMissingDocsForClientQuery: () => [jest.fn(), { isFetching: false, data: null }],
  useAttachEquipoComponentsMutation: () => [jest.fn(), { isLoading: false }],
  useUpdateEquipoMutation: () => [jest.fn(), { isLoading: false }],
  useAssociateEquipoClienteMutation: () => [jest.fn(), { isLoading: false }],
  useRemoveEquipoClienteWithArchiveMutation: () => [jest.fn(), { isLoading: false }],
  useUploadDocumentMutation: () => [jest.fn(), { isLoading: false }],
  useCreateCamionMutation: () => [jest.fn(), { isLoading: false }],
  useCreateAcopladoMutation: () => [jest.fn(), { isLoading: false }],
  useCreateChoferMutation: () => [jest.fn(), { isLoading: false }],
  useCreateEmpresaTransportistaMutation: () => [jest.fn(), { isLoading: false }],
}));

jest.unstable_mockModule('../../../platform-users/api/platformUsersApiSlice', () => ({
  useRegisterChoferWizardMutation: () => [jest.fn(), { isLoading: false }],
  useRegisterTransportistaWizardMutation: () => [jest.fn(), { isLoading: false }],
}));

const { default: EditarEquipoPage } = await import('../EditarEquipoPage');

describe('EditarEquipoPage (loaded smoke)', () => {
  it('renderiza el header en estado cargado', () => {
    const storeMock = {
      dispatch: jest.fn(),
      getState: jest.fn(() => ({ auth: { user: { role: 'ADMIN_INTERNO' }, token: '' } })),
      subscribe: jest.fn(() => () => undefined),
      replaceReducer: jest.fn(),
    } as any;

    render(
      <Provider store={storeMock}>
        <ConfirmContext.Provider value={{ confirm: async () => true }}>
          <MemoryRouter initialEntries={['/equipos/1']}>
            <Routes>
              <Route path='/equipos/:id' element={<EditarEquipoPage />} />
            </Routes>
          </MemoryRouter>
        </ConfirmContext.Provider>
      </Provider>
    );

    expect(screen.getByText(/Editar Equipo #1/i)).toBeInTheDocument();
  });
});


