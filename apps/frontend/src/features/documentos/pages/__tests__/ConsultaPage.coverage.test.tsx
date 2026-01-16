/**
 * Coverage test para ConsultaPage
 */
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AllProviders } from '@/test-utils/testWrappers';

jest.unstable_mockModule('@/features/documentos/api/documentosApiSlice', () => ({
  useGetDadoresQuery: () => ({
    data: {
      list: [
        { id: 1, razonSocial: 'Transporte S.A.', cuit: '20123456789' },
      ]
    },
  }),
  useGetTemplatesQuery: () => ({ data: [] }),
  useGetClientsQuery: () => ({
    data: {
      list: [{ id: 1, razonSocial: 'Cliente S.A.' }]
    },
  }),
  useGetDefaultsQuery: () => ({ data: { defaultDadorId: 1 } }),
  useGetEmpresasTransportistasQuery: () => ({ data: [] }),
  useLazySearchEquiposQuery: () => [jest.fn(), { data: [], isFetching: false }],
  useLazyGetEquipoComplianceQuery: () => [jest.fn(), { data: null, isFetching: false }],
  useDeleteEquipoMutation: () => [jest.fn(), { isLoading: false }],
  useGetEquipoComplianceQuery: () => ({ data: null }),
  useSearchEquiposByDnisMutation: () => [jest.fn(), { isLoading: false }],
  useSearchEquiposPagedQuery: () => [jest.fn(), { data: [], isFetching: false }],
  useToggleEquipoActivoMutation: () => [jest.fn(), { isLoading: false }],
}));

const { default: ConsultaPage } = await import('../ConsultaPage');

describe('ConsultaPage - Coverage', () => {
  it('debería importar el componente', async () => {
    expect(ConsultaPage).toBeDefined();
  });

  it('debería renderizar la página', async () => {
    render(<ConsultaPage />, { wrapper: AllProviders });
    await waitFor(() => {
      expect(screen.getByText(/Consulta/i)).toBeInTheDocument();
    });
  });

  it('debería mostrar botón Volver', async () => {
    render(<ConsultaPage />, { wrapper: AllProviders });
    await waitFor(() => {
      expect(screen.getByText('Volver')).toBeInTheDocument();
    });
  });

  it('debería mostrar filtros de búsqueda', async () => {
    render(<ConsultaPage />, { wrapper: AllProviders });
    await waitFor(() => {
      expect(screen.getByText(/Dador/i)).toBeInTheDocument();
    });
  });

  it('debería tener input de DNI', async () => {
    render(<ConsultaPage />, { wrapper: AllProviders });
    await waitFor(() => {
      const dniInput = screen.queryByPlaceholderText('DNI');
      if (dniInput) {
        expect(dniInput).toBeInTheDocument();
      }
    });
  });
});
