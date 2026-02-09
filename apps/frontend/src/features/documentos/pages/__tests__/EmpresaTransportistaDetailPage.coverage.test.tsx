/**
 * Coverage test para EmpresaTransportistaDetailPage
 */
import { render, screen, waitFor } from '@testing-library/react';
import { AllProviders } from '@/test-utils/testWrappers';

jest.unstable_mockModule('@/features/documentos/api/documentosApiSlice', () => ({
  useGetEmpresaTransportistaByIdQuery: () => ({
    data: {
      id: 1,
      razonSocial: 'Transporte S.A.',
      cuit: '20123456789',
      choferes: [],
      equipos: [],
    },
    isFetching: false,
  }),
  useGetEmpresaChoferesQuery: () => ({ data: [], isFetching: false }),
  useGetEmpresaEquiposQuery: () => ({ data: [], isFetching: false }),
  useUpdateEmpresaTransportistaMutation: () => [jest.fn(), { isLoading: false }],
}));

const { default: EmpresaTransportistaDetailPage } = await import('../EmpresaTransportistaDetailPage');

describe('EmpresaTransportistaDetailPage - Coverage', () => {
  it('debería importar el componente', async () => {
    expect(EmpresaTransportistaDetailPage).toBeDefined();
  });

  it('debería renderizar la página', async () => {
    render(<EmpresaTransportistaDetailPage />, { wrapper: AllProviders });
    await waitFor(() => {
      expect(screen.getByText('Volver')).toBeInTheDocument();
    });
  });
});
