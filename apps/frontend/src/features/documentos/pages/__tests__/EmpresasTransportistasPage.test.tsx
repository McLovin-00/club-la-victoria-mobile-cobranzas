import { render, screen, fireEvent } from '@testing-library/react';
import { AllProviders } from '@/test-utils/testWrappers';

jest.unstable_mockModule('@/features/documentos/api/documentosApiSlice', () => ({
  useGetDadoresQuery: () => ({ data: { list: [{ id: 1, razonSocial: 'Dador X' }] } }),
  useGetEmpresasTransportistasQuery: () => ({ data: [{ id: 1, razonSocial: 'Trans X', cuit: '20-12345678-9', activo: true }], refetch: jest.fn(), isFetching: false }),
  useGetDefaultsQuery: () => ({ data: { defaultDadorId: 1 } }),
  useCreateEmpresaTransportistaMutation: () => [jest.fn(), { isLoading: false }],
  useUpdateEmpresaTransportistaMutation: () => [jest.fn(), { isLoading: false }],
  useDeleteEmpresaTransportistaMutation: () => [jest.fn(), { isLoading: false }],
}));

const { default: EmpresasTransportistasPage } = await import('../EmpresasTransportistasPage');

describe('EmpresasTransportistasPage', () => {
  it('renders list and allows opening creation modal', () => {
    render(<EmpresasTransportistasPage />, { wrapper: AllProviders });
    expect(screen.getByText('Empresas Transportistas')).toBeInTheDocument();
    expect(screen.getByText('Trans X')).toBeInTheDocument();
    const btn = screen.getByText('Nueva Empresa');
    fireEvent.click(btn);
    // El texto aparece tanto en el botón como en el título del modal.
    expect(screen.getAllByText('Nueva Empresa').length).toBeGreaterThan(1);
  });
});


