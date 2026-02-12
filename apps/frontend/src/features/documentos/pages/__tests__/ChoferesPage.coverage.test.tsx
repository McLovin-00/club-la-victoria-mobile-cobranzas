/**
 * Coverage test para ChoferesPage
 */
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AllProviders } from '@/test-utils/testWrappers';

jest.unstable_mockModule('@/features/documentos/api/documentosApiSlice', () => ({
  useGetDadoresQuery: () => ({
    data: {
      list: [
        { id: 1, razonSocial: 'Transporte S.A.', cuit: '20123456789' },
        { id: 2, razonSocial: 'Logística Express', cuit: '20987654321' },
      ]
    },
  }),
  useGetChoferesQuery: () => ({
    data: {
      data: [
        { id: 1, dni: '12345678', nombre: 'Juan', apellido: 'Pérez', phones: ['+5491112345678'] },
        { id: 2, dni: '87654321', nombre: 'María', apellido: 'Gómez', phones: ['+5491198765432'] },
      ],
      pagination: { total: 2 }
    },
    isFetching: false,
  }),
  useCreateChoferMutation: () => [jest.fn().mockResolvedValue({ data: {} }), { isLoading: false }],
  useUpdateChoferMutation: () => [jest.fn().mockResolvedValue({ data: {} }), { isLoading: false }],
  useDeleteChoferMutation: () => [jest.fn().mockResolvedValue({}), { isLoading: false }],
}));

const { default: ChoferesPage } = await import('../ChoferesPage');

describe('ChoferesPage - Coverage', () => {
  it('debería importar el componente', async () => {
    expect(ChoferesPage).toBeDefined();
  });

  it('debería renderizar la página', async () => {
    render(<ChoferesPage />, { wrapper: AllProviders });
    await waitFor(() => {
      expect(screen.getByText('Choferes')).toBeInTheDocument();
    });
  });

  it('debería mostrar botón Volver', async () => {
    render(<ChoferesPage />, { wrapper: AllProviders });
    await waitFor(() => {
      expect(screen.getByText('Volver')).toBeInTheDocument();
    });
  });

  it('debería mostrar select de dadores de carga', async () => {
    render(<ChoferesPage />, { wrapper: AllProviders });
    await waitFor(() => {
      // El select puede mostrarse de diferentes formas dependiendo de la implementación UI
      // Buscamos la opción por su texto
      expect(screen.getByText('Seleccionar dador de carga')).toBeInTheDocument();
      expect(screen.getByText(/Transporte S.A./)).toBeInTheDocument();
    });
  });

  it('debería mostrar input de búsqueda', async () => {
    render(<ChoferesPage />, { wrapper: AllProviders });
    await waitFor(() => {
      const searchInput = screen.getByPlaceholderText('Buscar por DNI, nombre o apellido');
      expect(searchInput).toBeInTheDocument();
    });
  });

  it('debería mostrar tabla de choferes', async () => {
    render(<ChoferesPage />, { wrapper: AllProviders });
    await waitFor(() => {
      // Usamos getAllByText porque puede aparecer en el título y en el input de edición
      expect(screen.getAllByText(/Juan/)[0]).toBeInTheDocument();
      expect(screen.getAllByText(/Pérez/)[0]).toBeInTheDocument();
      expect(screen.getAllByText(/María/)[0]).toBeInTheDocument();
      expect(screen.getAllByText(/Gómez/)[0]).toBeInTheDocument();
    });
  });

  it('debería mostrar formulario de creación', async () => {
    render(<ChoferesPage />, { wrapper: AllProviders });
    await waitFor(() => {
      // Buscamos por placeholder ya que no hay labels explícitos visibles
      expect(screen.getByPlaceholderText('DNI')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Nombre')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Apellido')).toBeInTheDocument();
    });
  });

  it('debería tener botón de crear chofer', async () => {
    render(<ChoferesPage />, { wrapper: AllProviders });
    await waitFor(() => {
      // El botón dice "Crear", no "Crear Chofer"
      expect(screen.getByText('Crear', { selector: 'button' })).toBeInTheDocument();
    });
  });
});
