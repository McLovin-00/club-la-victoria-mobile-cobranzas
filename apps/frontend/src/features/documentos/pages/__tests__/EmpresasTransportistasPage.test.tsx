import { render, screen, fireEvent } from '@testing-library/react';
import EmpresasTransportistasPage from '../EmpresasTransportistasPage';

jest.mock('../../api/documentosApiSlice', () => ({
  useGetDadoresQuery: () => ({ data: { list: [{ id: 1, razonSocial: 'Dador X' }] } }),
  useGetEmpresasTransportistasQuery: () => ({ data: [{ id: 1, razonSocial: 'Trans X', cuit: '20-12345678-9', activo: true }], refetch: jest.fn(), isFetching: false }),
  useCreateEmpresaTransportistaMutation: () => [jest.fn(), { isLoading: false }],
  useUpdateEmpresaTransportistaMutation: () => [jest.fn(), { isLoading: false }],
  useDeleteEmpresaTransportistaMutation: () => [jest.fn(), { isLoading: false }],
}));

describe('EmpresasTransportistasPage', () => {
  it('renders list and allows opening creation modal', () => {
    render(<EmpresasTransportistasPage />);
    expect(screen.getByText('Empresas Transportistas')).toBeInTheDocument();
    expect(screen.getByText('Trans X')).toBeInTheDocument();
    const btn = screen.getByText('Nueva Empresa');
    fireEvent.click(btn);
    expect(screen.getByText('Nueva Empresa')).toBeInTheDocument();
  });
});


