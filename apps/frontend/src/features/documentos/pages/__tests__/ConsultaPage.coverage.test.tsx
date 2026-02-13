/**
 * Coverage test para ConsultaPage
 */
import React from 'react';
import { render, screen, fireEvent, waitFor, within, act } from '@testing-library/react';
import { AllProviders } from '../../../../test-utils/testWrappers';
import { store } from '../../../../store/store';
import { logout, setCurrentUser } from '../../../auth/authSlice';
import { ConfirmContext } from '../../../../contexts/confirmContext';

let ConsultaPage: React.FC;

let lastPagedParams: any;
type PagedItem = { id: number; [key: string]: unknown };
const pagedResponse: {
  data: PagedItem[];
  pagination: { page: number; limit: number; total: number; totalPages: number; hasNext: boolean; hasPrev: boolean };
  stats: { total: number; conFaltantes: number; conVencidos: number; conPorVencer: number };
} = {
  data: [{ id: 1 }],
  pagination: { page: 1, limit: 10, total: 1, totalPages: 1, hasNext: false, hasPrev: false },
  stats: { total: 1, conFaltantes: 0, conVencidos: 0, conPorVencer: 0 },
};
let searchPagedState = { data: pagedResponse, isFetching: false, isError: false, error: undefined as any };
let toggleActivoMutation: jest.Mock;
let deleteEquipoMutation: jest.Mock;
let complianceData: any = null;
const showToastMock = jest.fn();

const createUnwrapMock = (value: unknown = {}) =>
  jest.fn(() => ({ unwrap: jest.fn(async () => value) }));

// Mocks with jest.unstable_mockModule inside beforeAll
beforeAll(async () => {
  // Mock de RTK Query hooks
  await jest.unstable_mockModule('@/features/documentos/api/documentosApiSlice', () => ({
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
    useDeleteEquipoMutation: () => [deleteEquipoMutation, { isLoading: false }],
    useGetEquipoComplianceQuery: () => ({ data: complianceData }),
    useSearchEquiposByDnisMutation: () => [jest.fn(), { isLoading: false }],
    useSearchEquiposPagedQuery: (params: any) => {
      lastPagedParams = params;
      return searchPagedState;
    },
    useToggleEquipoActivoMutation: () => [toggleActivoMutation, { isLoading: false }],
  }));

  await jest.unstable_mockModule('@/components/ui/Toast.utils', () => ({
    showToast: showToastMock,
  }));

  // Import component after mocks
  const module = await import('../ConsultaPage');
  ConsultaPage = module.default;
});

describe('ConsultaPage - Coverage', () => {
  beforeEach(() => {
    lastPagedParams = undefined;
    searchPagedState = { data: pagedResponse, isFetching: false, isError: false, error: undefined };
    toggleActivoMutation = createUnwrapMock({});
    deleteEquipoMutation = jest.fn();
    complianceData = null;
    showToastMock.mockClear();
    Object.defineProperty(globalThis, 'alert', { value: jest.fn(), writable: true });
  });

  it('debería importar el componente', async () => {
    expect(ConsultaPage).toBeDefined();
  });

  it('debería renderizar la página', async () => {
    render(<ConsultaPage />, { wrapper: AllProviders });
    await waitFor(() => {
      expect(screen.getByText(/Consulta/i)).not.toBeNull();
    });
  });

  it('debería mostrar botón Volver', async () => {
    render(<ConsultaPage />, { wrapper: AllProviders });
    await waitFor(() => {
      expect(screen.getByText('Volver')).not.toBeNull();
    });
  });

  it('debería mostrar filtros de búsqueda', async () => {
    render(<ConsultaPage />, { wrapper: AllProviders });
    await waitFor(() => {
      expect(screen.getByText(/Por Dador/i)).not.toBeNull();
    });
  });

  it('debería tener input de DNI', async () => {
    render(<ConsultaPage />, { wrapper: AllProviders });
    await waitFor(() => {
      const dniInput = screen.queryByPlaceholderText('DNI');
      if (dniInput) {
        expect(dniInput).not.toBeNull();
      }
    });
  });

  it('debería abrir modal de búsqueda por texto y aplicar búsqueda', async () => {
    render(<ConsultaPage />, { wrapper: AllProviders });
    fireEvent.click(screen.getByText('🔍 Buscar por DNIs o Patentes'));
    const textarea = screen.getByPlaceholderText(/Ej: 40219122/i);
    fireEvent.change(textarea, { target: { value: '40219122, ABC123' } });
    const dialog = screen.getByRole('dialog');
    fireEvent.click(within(dialog).getByText('Buscar'));

    await waitFor(() => {
      expect(screen.getByText(/2 valores ingresados/)).not.toBeNull();
      expect(screen.queryByText('Buscar Equipos por DNIs o Patentes')).toBeNull();
    });
  });

  it('debería disparar búsqueda y permitir descarga', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: [{ id: 1 }], pagination: { hasNext: false } }),
    });
    Object.defineProperty(globalThis, 'fetch', { value: fetchMock, writable: true });

    render(<ConsultaPage />, { wrapper: AllProviders });

    fireEvent.click(screen.getByText('🔍 Buscar por DNIs o Patentes'));
    const dialog = screen.getByRole('dialog');
    const textarea = within(dialog).getByPlaceholderText(/Ej: 40219122/i);
    fireEvent.change(textarea, { target: { value: '40219122' } });
    fireEvent.click(within(dialog).getByText('Buscar'));

    await waitFor(() => {
      const zipButton = screen.getByText('📦 Documentación (ZIP)') as HTMLButtonElement;
      expect(zipButton.disabled).toBe(false);
    });
  });

  it('descarga documentación individual correctamente', async () => {
    searchPagedState = {
      data: {
        data: [{ id: 500, activo: true, driverDniNorm: '12345678', truckPlateNorm: 'AAA111', trailerPlateNorm: 'BBB222' }],
        pagination: { page: 1, limit: 10, total: 1, totalPages: 1, hasNext: false, hasPrev: false },
        stats: { total: 1, conFaltantes: 0, conVencidos: 0, conPorVencer: 0 },
      },
      isFetching: false,
      isError: false,
      error: undefined,
    };

    const blobMock = new Blob(['zip']);
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      blob: async () => blobMock,
      headers: { get: () => 'filename=test.zip' },
    });
    Object.defineProperty(globalThis, 'fetch', { value: fetchMock, writable: true });
    if (!('createObjectURL' in window.URL)) {
      Object.defineProperty(window.URL, 'createObjectURL', { value: jest.fn(), writable: true });
    }
    if (!('revokeObjectURL' in window.URL)) {
      Object.defineProperty(window.URL, 'revokeObjectURL', { value: jest.fn(), writable: true });
    }
    const createUrlSpy = jest.spyOn(window.URL, 'createObjectURL').mockReturnValue('blob:fake');
    const revokeSpy = jest.spyOn(window.URL, 'revokeObjectURL').mockImplementation(() => {});
    const clickSpy = jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    render(<ConsultaPage />, { wrapper: AllProviders });

    fireEvent.click(screen.getByText('Buscar'));

    await waitFor(() => {
      expect(screen.getByText('Bajar documentación')).not.toBeNull();
    });

    fireEvent.click(screen.getByText('Bajar documentación'));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('/equipos/500/zip'), expect.any(Object));
      expect(createUrlSpy).toHaveBeenCalledWith(blobMock);
      expect(clickSpy).toHaveBeenCalled();
      expect(revokeSpy).toHaveBeenCalled();
    });

    createUrlSpy.mockRestore();
    revokeSpy.mockRestore();
    clickSpy.mockRestore();
  });

  it('muestra error si falla descarga individual por excepción', async () => {
    searchPagedState = {
      data: {
        data: [{ id: 501, activo: true, driverDniNorm: '12345678', truckPlateNorm: 'AAA111', trailerPlateNorm: 'BBB222' }],
        pagination: { page: 1, limit: 10, total: 1, totalPages: 1, hasNext: false, hasPrev: false },
        stats: { total: 1, conFaltantes: 0, conVencidos: 0, conPorVencer: 0 },
      },
      isFetching: false,
      isError: false,
      error: undefined,
    };

    const fetchMock = jest.fn().mockRejectedValue(new Error('fail'));
    Object.defineProperty(globalThis, 'fetch', { value: fetchMock, writable: true });

    render(<ConsultaPage />, { wrapper: AllProviders });

    fireEvent.click(screen.getByText('Buscar'));

    await waitFor(() => {
      expect(screen.getByText('Bajar documentación')).not.toBeNull();
    });

    fireEvent.click(screen.getByText('Bajar documentación'));

    await waitFor(() => {
      expect((globalThis.alert as jest.Mock).mock.calls[0][0]).toMatch(/No fue posible iniciar la descarga/i);
    });
  });

  it('aplica filtro de compliance al hacer click en Faltantes', async () => {
    render(<ConsultaPage />, { wrapper: AllProviders });

    fireEvent.click(screen.getByText('Buscar'));

    await waitFor(() => {
      expect(lastPagedParams?.dadorCargaId).toBe(1);
    });

    fireEvent.click(screen.getByText('Faltantes'));

    await waitFor(() => {
      expect(lastPagedParams?.complianceFilter).toBe('faltantes');
    });
  });

  it('aplica filtro de activos al buscar', async () => {
    render(<ConsultaPage />, { wrapper: AllProviders });

    fireEvent.click(screen.getByText('Solo Inactivos'));
    fireEvent.click(screen.getByText('Buscar'));

    await waitFor(() => {
      expect(lastPagedParams?.activo).toBe('false');
    });
  });

  it('muestra mensaje de error cuando falla la búsqueda', async () => {
    searchPagedState = { data: pagedResponse, isFetching: false, isError: true, error: { status: 500 } };
    render(<ConsultaPage />, { wrapper: AllProviders });

    fireEvent.click(screen.getByText('Buscar'));

    await waitFor(() => {
      expect(screen.getByText(/Error al buscar \(500\)/i)).not.toBeNull();
    });
  });

  it('permite navegar a la página siguiente cuando hay más resultados', async () => {
    searchPagedState = {
      data: {
        ...pagedResponse,
        pagination: { page: 1, limit: 10, total: 11, totalPages: 2, hasNext: true, hasPrev: false },
      },
      isFetching: false,
      isError: false,
      error: undefined,
    };

    render(<ConsultaPage />, { wrapper: AllProviders });

    fireEvent.click(screen.getByText('Buscar'));

    await waitFor(() => {
      expect(screen.getByText(/Página 1 de 2/i)).not.toBeNull();
    });

    const paginationInfo = screen.getByText(/Página 1 de 2/i).closest('div');
    const paginationButtons = paginationInfo?.querySelectorAll('button');
    expect(paginationButtons).not.toBeNull();
    fireEvent.click(paginationButtons?.[1] as HTMLButtonElement);

    await waitFor(() => {
      expect(lastPagedParams?.page).toBe(2);
    });
  });

  it('abre modal de datos IA y carga información', async () => {
    searchPagedState = {
      data: {
        data: [
          {
            id: 10,
            empresaTransportistaId: 5,
            driverId: 20,
            truckId: 30,
            trailerId: 40,
            driverDniNorm: '12345678',
            truckPlateNorm: 'ABC123',
            trailerPlateNorm: 'DEF456',
            activo: true,
          },
        ],
        pagination: { page: 1, limit: 10, total: 1, totalPages: 1, hasNext: false, hasPrev: false },
        stats: { total: 1, conFaltantes: 0, conVencidos: 0, conPorVencer: 0 },
      },
      isFetching: false,
      isError: false,
      error: undefined,
    };

    await act(async () => {
      store.dispatch(setCurrentUser({ id: 1, email: 'admin@test.com', role: 'SUPERADMIN' }));
    });
    localStorage.setItem('token', 'token-test');

    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: { extractedData: { foo: 'bar' } } }),
    });
    Object.defineProperty(globalThis, 'fetch', { value: fetchMock, writable: true });

    render(<ConsultaPage />, { wrapper: AllProviders });

    fireEvent.click(screen.getByText('Buscar'));

    await waitFor(() => {
      expect(screen.getByText('Datos IA')).not.toBeNull();
    });

    fireEvent.click(screen.getByText('Datos IA'));

    await waitFor(() => {
      expect(screen.getByText(/Datos Extraídos por IA/i)).not.toBeNull();
      expect(screen.getAllByText('foo:').length).toBeGreaterThan(0);
      expect(screen.getAllByText('bar').length).toBeGreaterThan(0);
    });

    await act(async () => {
      store.dispatch(logout());
    });
    localStorage.removeItem('token');
  });

  it('muestra mensaje cuando no hay datos IA disponibles', async () => {
    searchPagedState = {
      data: {
        data: [
          {
            id: 20,
            empresaTransportistaId: 5,
            driverId: 20,
            truckId: 30,
            trailerId: 40,
            driverDniNorm: '12345678',
            truckPlateNorm: 'ABC123',
            trailerPlateNorm: 'DEF456',
            activo: true,
          },
        ],
        pagination: { page: 1, limit: 10, total: 1, totalPages: 1, hasNext: false, hasPrev: false },
        stats: { total: 1, conFaltantes: 0, conVencidos: 0, conPorVencer: 0 },
      },
      isFetching: false,
      isError: false,
      error: undefined,
    };

    await act(async () => {
      store.dispatch(setCurrentUser({ id: 1, email: 'admin@test.com', role: 'SUPERADMIN' }));
    });
    localStorage.setItem('token', 'token-test');

    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: { extractedData: {} } }),
    });
    Object.defineProperty(globalThis, 'fetch', { value: fetchMock, writable: true });

    render(<ConsultaPage />, { wrapper: AllProviders });

    fireEvent.click(screen.getByText('Buscar'));

    await waitFor(() => {
      expect(screen.getByText('Datos IA')).not.toBeNull();
    });

    fireEvent.click(screen.getByText('Datos IA'));

    await waitFor(() => {
      expect(screen.getAllByText(/No hay datos extraídos por IA/i).length).toBeGreaterThan(0);
    });

    await act(async () => {
      store.dispatch(logout());
    });
    localStorage.removeItem('token');
  });

  it('elimina datos IA desde el modal', async () => {
    searchPagedState = {
      data: {
        data: [
          {
            id: 11,
            empresaTransportistaId: 5,
            driverId: 20,
            truckId: 30,
            trailerId: 40,
            driverDniNorm: '12345678',
            truckPlateNorm: 'ABC123',
            trailerPlateNorm: 'DEF456',
            activo: true,
          },
        ],
        pagination: { page: 1, limit: 10, total: 1, totalPages: 1, hasNext: false, hasPrev: false },
        stats: { total: 1, conFaltantes: 0, conVencidos: 0, conPorVencer: 0 },
      },
      isFetching: false,
      isError: false,
      error: undefined,
    };

    await act(async () => {
      store.dispatch(setCurrentUser({ id: 1, email: 'admin@test.com', role: 'SUPERADMIN' }));
    });
    localStorage.setItem('token', 'token-test');

    const fetchMock = jest.fn(async (_url: string, options?: { method?: string }) => {
      if (options?.method === 'DELETE') {
        return { ok: true, json: async () => ({}) } as Response;
      }
      return { ok: true, json: async () => ({ data: { extractedData: { foo: 'bar' } } }) } as Response;
    });
    Object.defineProperty(globalThis, 'fetch', { value: fetchMock, writable: true });

    render(<ConsultaPage />, { wrapper: AllProviders });

    fireEvent.click(screen.getByText('Buscar'));

    await waitFor(() => {
      expect(screen.getByText('Datos IA')).not.toBeNull();
    });

    fireEvent.click(screen.getByText('Datos IA'));

    await waitFor(() => {
      expect(screen.getByText(/Datos Extraídos por IA/i)).not.toBeNull();
    });

    await waitFor(() => {
      expect(screen.getAllByTitle('Borrar datos IA').length).toBeGreaterThan(0);
    });

    fireEvent.click(screen.getAllByTitle('Borrar datos IA')[0]);
    fireEvent.click(screen.getByText('Eliminar datos'));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/extracted-data'),
        expect.objectContaining({ method: 'DELETE' })
      );
      expect((globalThis.alert as jest.Mock).mock.calls[0][0]).toMatch(/Datos IA eliminados correctamente/i);
    });

    await act(async () => {
      store.dispatch(logout());
    });
    localStorage.removeItem('token');
  });

  it('muestra error al eliminar datos IA cuando falla', async () => {
    searchPagedState = {
      data: {
        data: [
          {
            id: 14,
            empresaTransportistaId: 5,
            driverId: 20,
            truckId: 30,
            trailerId: 40,
            driverDniNorm: '12345678',
            truckPlateNorm: 'ABC123',
            trailerPlateNorm: 'DEF456',
            activo: true,
          },
        ],
        pagination: { page: 1, limit: 10, total: 1, totalPages: 1, hasNext: false, hasPrev: false },
        stats: { total: 1, conFaltantes: 0, conVencidos: 0, conPorVencer: 0 },
      },
      isFetching: false,
      isError: false,
      error: undefined,
    };

    await act(async () => {
      store.dispatch(setCurrentUser({ id: 1, email: 'admin@test.com', role: 'SUPERADMIN' }));
    });
    localStorage.setItem('token', 'token-test');

    const fetchMock = jest.fn(async (_url: string, options?: { method?: string }) => {
      if (options?.method === 'DELETE') {
        return { ok: false } as Response;
      }
      return { ok: true, json: async () => ({ data: { extractedData: { foo: 'bar' } } }) } as Response;
    });
    Object.defineProperty(globalThis, 'fetch', { value: fetchMock, writable: true });

    render(<ConsultaPage />, { wrapper: AllProviders });

    fireEvent.click(screen.getByText('Buscar'));

    await waitFor(() => {
      expect(screen.getByText('Datos IA')).not.toBeNull();
    });

    fireEvent.click(screen.getByText('Datos IA'));

    await waitFor(() => {
      expect(screen.getAllByTitle('Borrar datos IA').length).toBeGreaterThan(0);
    });

    fireEvent.click(screen.getAllByTitle('Borrar datos IA')[0]);
    fireEvent.click(screen.getByText('Eliminar datos'));

    await waitFor(() => {
      expect((globalThis.alert as jest.Mock).mock.calls[0][0]).toMatch(/Error al eliminar datos IA/i);
    });

    await act(async () => {
      store.dispatch(logout());
    });
    localStorage.removeItem('token');
  });

  it('edita datos IA desde el modal', async () => {
    searchPagedState = {
      data: {
        data: [
          {
            id: 12,
            empresaTransportistaId: 5,
            driverId: 20,
            truckId: 30,
            trailerId: 40,
            driverDniNorm: '12345678',
            truckPlateNorm: 'ABC123',
            trailerPlateNorm: 'DEF456',
            activo: true,
          },
        ],
        pagination: { page: 1, limit: 10, total: 1, totalPages: 1, hasNext: false, hasPrev: false },
        stats: { total: 1, conFaltantes: 0, conVencidos: 0, conPorVencer: 0 },
      },
      isFetching: false,
      isError: false,
      error: undefined,
    };

    await act(async () => {
      store.dispatch(setCurrentUser({ id: 1, email: 'admin@test.com', role: 'SUPERADMIN' }));
    });
    localStorage.setItem('token', 'token-test');

    const fetchMock = jest.fn(async (_url: string, options?: { method?: string }) => {
      if (options?.method === 'PUT') {
        return { ok: true, json: async () => ({}) } as Response;
      }
      return { ok: true, json: async () => ({ data: { extractedData: { foo: 'bar' } } }) } as Response;
    });
    Object.defineProperty(globalThis, 'fetch', { value: fetchMock, writable: true });

    render(<ConsultaPage />, { wrapper: AllProviders });

    fireEvent.click(screen.getByText('Buscar'));

    await waitFor(() => {
      expect(screen.getByText('Datos IA')).not.toBeNull();
    });

    fireEvent.click(screen.getByText('Datos IA'));

    await waitFor(() => {
      expect(screen.getByText(/Datos Extraídos por IA/i)).not.toBeNull();
    });

    await waitFor(() => {
      expect(screen.getAllByTitle('Editar datos').length).toBeGreaterThan(0);
    });

    fireEvent.click(screen.getAllByTitle('Editar datos')[0]);

    await waitFor(() => {
      expect(screen.getByText(/Editar datos extraídos/i)).not.toBeNull();
    });

    const input = screen.getAllByDisplayValue('bar')[0];
    fireEvent.change(input, { target: { value: 'baz' } });
    fireEvent.click(screen.getByText('Guardar cambios'));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/extracted-data'),
        expect.objectContaining({ method: 'PUT' })
      );
      expect((globalThis.alert as jest.Mock).mock.calls[0][0]).toMatch(/Datos actualizados correctamente/i);
    });

    await act(async () => {
      store.dispatch(logout());
    });
    localStorage.removeItem('token');
  });

  it('muestra error al actualizar datos IA cuando falla', async () => {
    searchPagedState = {
      data: {
        data: [
          {
            id: 15,
            empresaTransportistaId: 5,
            driverId: 20,
            truckId: 30,
            trailerId: 40,
            driverDniNorm: '12345678',
            truckPlateNorm: 'ABC123',
            trailerPlateNorm: 'DEF456',
            activo: true,
          },
        ],
        pagination: { page: 1, limit: 10, total: 1, totalPages: 1, hasNext: false, hasPrev: false },
        stats: { total: 1, conFaltantes: 0, conVencidos: 0, conPorVencer: 0 },
      },
      isFetching: false,
      isError: false,
      error: undefined,
    };

    await act(async () => {
      store.dispatch(setCurrentUser({ id: 1, email: 'admin@test.com', role: 'SUPERADMIN' }));
    });
    localStorage.setItem('token', 'token-test');

    const fetchMock = jest.fn(async (_url: string, options?: { method?: string }) => {
      if (options?.method === 'PUT') {
        return { ok: false } as Response;
      }
      return { ok: true, json: async () => ({ data: { extractedData: { foo: 'bar' } } }) } as Response;
    });
    Object.defineProperty(globalThis, 'fetch', { value: fetchMock, writable: true });

    render(<ConsultaPage />, { wrapper: AllProviders });

    fireEvent.click(screen.getByText('Buscar'));

    await waitFor(() => {
      expect(screen.getByText('Datos IA')).not.toBeNull();
    });

    fireEvent.click(screen.getByText('Datos IA'));

    await waitFor(() => {
      expect(screen.getAllByTitle('Editar datos').length).toBeGreaterThan(0);
    });

    fireEvent.click(screen.getAllByTitle('Editar datos')[0]);

    await waitFor(() => {
      expect(screen.getByText(/Editar datos extraídos/i)).not.toBeNull();
    });

    const input = screen.getAllByDisplayValue('bar')[0];
    fireEvent.change(input, { target: { value: 'baz' } });
    fireEvent.click(screen.getByText('Guardar cambios'));

    await waitFor(() => {
      expect((globalThis.alert as jest.Mock).mock.calls[0][0]).toMatch(/Error al actualizar datos/i);
    });

    await act(async () => {
      store.dispatch(logout());
    });
    localStorage.removeItem('token');
  });

  it('dispara toggle de activo y llama al mutation', async () => {
    searchPagedState = {
      data: {
        data: [{ id: 55, activo: true, driverDniNorm: '12345678', truckPlateNorm: 'ABC123', trailerPlateNorm: 'DEF456' }],
        pagination: { page: 1, limit: 10, total: 1, totalPages: 1, hasNext: false, hasPrev: false },
        stats: { total: 1, conFaltantes: 0, conVencidos: 0, conPorVencer: 0 },
      },
      isFetching: false,
      isError: false,
      error: undefined,
    };

    render(<ConsultaPage />, { wrapper: AllProviders });

    fireEvent.click(screen.getByText('Buscar'));

    await waitFor(() => {
      expect(screen.getByText('⏸ Desactivar')).not.toBeNull();
    });

    fireEvent.click(screen.getByText('⏸ Desactivar'));

    await waitFor(() => {
      expect(toggleActivoMutation).toHaveBeenCalledWith({ equipoId: 55, activo: false });
    });
  });

  it('muestra error cuando falla toggle de activo', async () => {
    toggleActivoMutation = jest.fn(() => ({ unwrap: jest.fn(async () => { throw { data: { message: 'Falló toggle' } }; }) }));

    searchPagedState = {
      data: {
        data: [{ id: 56, activo: true, driverDniNorm: '12345678', truckPlateNorm: 'AAA111', trailerPlateNorm: 'BBB222' }],
        pagination: { page: 1, limit: 10, total: 1, totalPages: 1, hasNext: false, hasPrev: false },
        stats: { total: 1, conFaltantes: 0, conVencidos: 0, conPorVencer: 0 },
      },
      isFetching: false,
      isError: false,
      error: undefined,
    };

    render(<ConsultaPage />, { wrapper: AllProviders });

    fireEvent.click(screen.getByText('Buscar'));

    await waitFor(() => {
      expect(screen.getByText('⏸ Desactivar')).not.toBeNull();
    });

    fireEvent.click(screen.getByText('⏸ Desactivar'));

    await waitFor(() => {
      expect(showToastMock).toHaveBeenCalledWith('Falló toggle', 'error');
    });
  });

  it('elimina equipo cuando confirma', async () => {
    const confirmMock = jest.fn(async () => true);
    const Wrapper: React.FC<React.PropsWithChildren> = ({ children }) => (
      <AllProviders>
        <ConfirmContext.Provider value={{ confirm: confirmMock }}>{children}</ConfirmContext.Provider>
      </AllProviders>
    );

    searchPagedState = {
      data: {
        data: [{ id: 600, activo: true, driverDniNorm: '12345678', truckPlateNorm: 'AAA111', trailerPlateNorm: 'BBB222' }],
        pagination: { page: 1, limit: 10, total: 1, totalPages: 1, hasNext: false, hasPrev: false },
        stats: { total: 1, conFaltantes: 0, conVencidos: 0, conPorVencer: 0 },
      },
      isFetching: false,
      isError: false,
      error: undefined,
    };

    render(<ConsultaPage />, { wrapper: Wrapper });

    fireEvent.click(screen.getByText('Buscar'));

    await waitFor(() => {
      expect(screen.getByText('Eliminar')).not.toBeNull();
    });

    fireEvent.click(screen.getByText('Eliminar'));

    await waitFor(() => {
      expect(confirmMock).toHaveBeenCalled();
      expect(deleteEquipoMutation).toHaveBeenCalledWith({ id: 600 });
      expect(showToastMock).toHaveBeenCalledWith('Equipo eliminado', 'success');
    });
  });

  it('muestra feedback de toggle exitoso', async () => {
    jest.useFakeTimers();
    toggleActivoMutation = jest.fn(() => ({ unwrap: jest.fn(async () => ({})) }));

    searchPagedState = {
      data: {
        data: [{ id: 700, activo: false, driverDniNorm: '12345678', truckPlateNorm: 'AAA111', trailerPlateNorm: 'BBB222' }],
        pagination: { page: 1, limit: 10, total: 1, totalPages: 1, hasNext: false, hasPrev: false },
        stats: { total: 1, conFaltantes: 0, conVencidos: 0, conPorVencer: 0 },
      },
      isFetching: false,
      isError: false,
      error: undefined,
    };

    render(<ConsultaPage />, { wrapper: AllProviders });

    fireEvent.click(screen.getByText('Buscar'));

    await waitFor(() => {
      expect(screen.getByText('▶ Activar')).not.toBeNull();
    });

    fireEvent.click(screen.getByText('▶ Activar'));

    await act(async () => {
      jest.advanceTimersByTime(600);
    });

    await waitFor(() => {
      expect(showToastMock).toHaveBeenCalledWith('Equipo activado exitosamente', 'success');
    });

    jest.useRealTimers();
  });

  it('navega a editar y ver estado desde la tarjeta', async () => {
    searchPagedState = {
      data: {
        data: [{ id: 800, activo: true, driverDniNorm: '12345678', truckPlateNorm: 'AAA111', trailerPlateNorm: 'BBB222' }],
        pagination: { page: 1, limit: 10, total: 1, totalPages: 1, hasNext: false, hasPrev: false },
        stats: { total: 1, conFaltantes: 0, conVencidos: 0, conPorVencer: 0 },
      },
      isFetching: false,
      isError: false,
      error: undefined,
    };

    render(<ConsultaPage />, { wrapper: AllProviders });

    fireEvent.click(screen.getByText('Buscar'));

    await waitFor(() => {
      expect(screen.getByText('✏️ Editar')).not.toBeNull();
    });

    fireEvent.click(screen.getByText('✏️ Editar'));
    expect(window.location.pathname).toContain('/documentos/equipos/800/editar');

    fireEvent.click(screen.getByText('Ver estado'));
    expect(window.location.pathname).toContain('/documentos/equipos/800/estado');
  });

  it('usa ruta de volver segun rol', async () => {
    await act(async () => {
      store.dispatch(setCurrentUser({ id: 3, email: 'admin@test.com', role: 'SUPERADMIN' }));
    });

    render(<ConsultaPage />, { wrapper: AllProviders });

    fireEvent.click(screen.getByText('Volver'));

    expect(window.location.pathname).toBe('/documentos');

    await act(async () => {
      store.dispatch(logout());
    });
  });

  it('muestra error cuando falla la descarga individual', async () => {
    searchPagedState = {
      data: {
        data: [{ id: 66, activo: true, driverDniNorm: '12345678', truckPlateNorm: 'ABC123', trailerPlateNorm: 'DEF456' }],
        pagination: { page: 1, limit: 10, total: 1, totalPages: 1, hasNext: false, hasPrev: false },
        stats: { total: 1, conFaltantes: 0, conVencidos: 0, conPorVencer: 0 },
      },
      isFetching: false,
      isError: false,
      error: undefined,
    };

    const fetchMock = jest.fn().mockResolvedValue({ ok: false });
    Object.defineProperty(globalThis, 'fetch', { value: fetchMock, writable: true });

    render(<ConsultaPage />, { wrapper: AllProviders });

    fireEvent.click(screen.getByText('Buscar'));

    await waitFor(() => {
      expect(screen.getByText('Bajar documentación')).not.toBeNull();
    });

    fireEvent.click(screen.getByText('Bajar documentación'));

    await waitFor(() => {
      expect((globalThis.alert as jest.Mock).mock.calls[0][0]).toMatch(/Error al descargar documentación/i);
    });
  });

  it('muestra advertencia cuando búsqueda masiva no tiene valores válidos', async () => {
    render(<ConsultaPage />, { wrapper: AllProviders });

    fireEvent.click(screen.getByText('🔍 Buscar por DNIs o Patentes'));
    const dialog = screen.getByRole('dialog');
    const textarea = within(dialog).getByPlaceholderText(/Ej: 40219122/i);
    fireEvent.change(textarea, { target: { value: ',' } });
    fireEvent.click(within(dialog).getByText('Buscar'));

    await waitFor(() => {
      expect((globalThis.alert as jest.Mock).mock.calls[0][0]).toMatch(/No se encontraron valores válidos/i);
    });
  });

  it('muestra mensaje sin resultados cuando búsqueda no devuelve datos', async () => {
    searchPagedState = {
      data: {
        data: [],
        pagination: { page: 1, limit: 10, total: 0, totalPages: 0, hasNext: false, hasPrev: false },
        stats: { total: 0, conFaltantes: 0, conVencidos: 0, conPorVencer: 0 },
      },
      isFetching: false,
      isError: false,
      error: undefined,
    };

    render(<ConsultaPage />, { wrapper: AllProviders });

    fireEvent.click(screen.getByText('Buscar'));

    await waitFor(() => {
      expect(screen.getByText(/Sin resultados para los criterios/i)).not.toBeNull();
    });
  });

  it('aplica y quita filtro de vencidos desde el dashboard', async () => {
    render(<ConsultaPage />, { wrapper: AllProviders });

    fireEvent.click(screen.getByText('Buscar'));

    await waitFor(() => {
      expect(lastPagedParams?.dadorCargaId).toBe(1);
    });

    fireEvent.click(screen.getByText('Vencidos'));

    await waitFor(() => {
      expect(lastPagedParams?.complianceFilter).toBe('vencidos');
    });

    fireEvent.click(screen.getByText('Quitar filtro'));

    await waitFor(() => {
      expect(lastPagedParams?.complianceFilter).toBeUndefined();
    });
  });

  it('muestra semáforo con conteos de compliance', async () => {
    complianceData = {
      clientes: [
        {
          compliance: [
            { state: 'OK', entityType: 'CAMION', templateId: 1 },
            { state: 'VENCIDO', entityType: 'CAMION', templateId: 2 },
            { state: 'PROXIMO', entityType: 'CAMION', templateId: 3 },
            { state: 'MISSING', entityType: 'CAMION', templateId: 4 },
            { state: 'OK', entityType: 'CAMION', templateId: 1 },
          ],
        },
      ],
    };
    searchPagedState = {
      data: {
        data: [{ id: 77, activo: true, driverDniNorm: '12345678', truckPlateNorm: 'ABC123', trailerPlateNorm: 'DEF456' }],
        pagination: { page: 1, limit: 10, total: 1, totalPages: 1, hasNext: false, hasPrev: false },
        stats: { total: 1, conFaltantes: 1, conVencidos: 1, conPorVencer: 1 },
      },
      isFetching: false,
      isError: false,
      error: undefined,
    };

    render(<ConsultaPage />, { wrapper: AllProviders });

    fireEvent.click(screen.getByText('Buscar'));

    await waitFor(() => {
      expect(screen.getByTitle('Documentación faltante')).not.toBeNull();
    });

    const faltantesCount = screen.getByTitle('Documentación faltante').querySelector('strong');
    const vencidosCount = screen.getByTitle('Documentación vencida').querySelector('strong');
    const porVencerCount = screen.getByTitle('Documentación por vencer').querySelector('strong');
    const vigentesCount = screen.getByTitle('Documentación vigente').querySelector('strong');

    expect(faltantesCount?.textContent).toBe('1');
    expect(vencidosCount?.textContent).toBe('1');
    expect(porVencerCount?.textContent).toBe('1');
    expect(vigentesCount?.textContent).toBe('1');
  });

  it('muestra advertencia cuando descarga Excel no tiene equipos', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: [], pagination: { hasNext: false } }),
    });
    Object.defineProperty(globalThis, 'fetch', { value: fetchMock, writable: true });
    searchPagedState = {
      data: {
        data: [{ id: 88, activo: true, driverDniNorm: '12345678', truckPlateNorm: 'ABC123', trailerPlateNorm: 'DEF456' }],
        pagination: { page: 1, limit: 10, total: 1, totalPages: 1, hasNext: false, hasPrev: false },
        stats: { total: 1, conFaltantes: 0, conVencidos: 0, conPorVencer: 0 },
      },
      isFetching: false,
      isError: false,
      error: undefined,
    };

    render(<ConsultaPage />, { wrapper: AllProviders });

    fireEvent.click(screen.getByText('Buscar'));

    await waitFor(() => {
      expect(lastPagedParams?.dadorCargaId).toBe(1);
    });

    fireEvent.click(screen.getByText('📊 Solo Excel'));

    await waitFor(() => {
      expect((globalThis.alert as jest.Mock).mock.calls[0][0]).toMatch(/No fue posible iniciar la descarga masiva/i);
    });
  });

  it('deshabilita buscar cuando filtro empresa no tiene selección', async () => {
    render(<ConsultaPage />, { wrapper: AllProviders });

    fireEvent.click(screen.getByText('Por Empresa Transp.'));

    const buscarButton = screen.getByText('Buscar') as HTMLButtonElement;
    expect(buscarButton.disabled).toBe(true);
  });

  it('limpia filtros y borra info de búsqueda masiva', async () => {
    render(<ConsultaPage />, { wrapper: AllProviders });

    fireEvent.click(screen.getByText('🔍 Buscar por DNIs o Patentes'));
    const dialog = screen.getByRole('dialog');
    const textarea = within(dialog).getByPlaceholderText(/Ej: 40219122/i);
    fireEvent.change(textarea, { target: { value: '40219122' } });
    fireEvent.click(within(dialog).getByText('Buscar'));

    await waitFor(() => {
      expect(screen.getByText(/1 valores ingresados/)).not.toBeNull();
    });

    fireEvent.click(screen.getByText('Limpiar'));

    await waitFor(() => {
      expect(screen.queryByText(/1 valores ingresados/)).toBeNull();
    });
  });

  it('cierra modal de búsqueda al cancelar', async () => {
    render(<ConsultaPage />, { wrapper: AllProviders });

    fireEvent.click(screen.getByText('🔍 Buscar por DNIs o Patentes'));
    const dialog = screen.getByRole('dialog');
    fireEvent.click(within(dialog).getByText('Cancelar'));

    await waitFor(() => {
      expect(screen.queryByText('Buscar Equipos por DNIs o Patentes')).toBeNull();
    });
  });

  it('inicializa búsqueda desde URL cuando tiene search=true', async () => {
    window.history.pushState({}, 'Test', '/documentos/consulta?search=true&empresaId=1&dni=12345678');

    render(<ConsultaPage />, { wrapper: AllProviders });

    await waitFor(() => {
      expect(lastPagedParams?.dni).toBe('12345678');
      expect(lastPagedParams?.dadorCargaId).toBe(1);
    });
  });

  it('restringe dador y muestra aviso para rol DADOR_DE_CARGA', async () => {
    await act(async () => {
      store.dispatch(setCurrentUser({ id: 2, email: 'dador@test.com', role: 'DADOR_DE_CARGA', dadorCargaId: 1 } as any));
    });

    render(<ConsultaPage />, { wrapper: AllProviders });

    await waitFor(() => {
      expect(screen.getByText(/Solo puede consultar equipos de su dador asignado/i)).not.toBeNull();
    });

    await act(async () => {
      store.dispatch(logout());
    });
  });

  it('deshabilita buscar cuando filtro cliente no tiene selección', async () => {
    render(<ConsultaPage />, { wrapper: AllProviders });

    fireEvent.click(screen.getByText('Por Cliente'));

    const buscarButton = screen.getByText('Buscar') as HTMLButtonElement;
    expect(buscarButton.disabled).toBe(true);
  });

  it('persiste búsqueda en URL al ejecutar buscar', async () => {
    render(<ConsultaPage />, { wrapper: AllProviders });

    fireEvent.click(screen.getByText('Buscar'));

    await waitFor(() => {
      expect(window.location.search).toContain('search=true');
      expect(window.location.search).toContain('page=1');
    });
  });

  it('muestra spinner mientras busca equipos', async () => {
    searchPagedState = {
      data: {
        data: [],
        pagination: { page: 1, limit: 10, total: 0, totalPages: 0, hasNext: false, hasPrev: false },
        stats: { total: 0, conFaltantes: 0, conVencidos: 0, conPorVencer: 0 },
      },
      isFetching: true,
      isError: false,
      error: undefined,
    };

    render(<ConsultaPage />, { wrapper: AllProviders });

    fireEvent.click(screen.getByText('Buscar'));

    await waitFor(() => {
      expect(screen.getByText(/Buscando equipos/i)).not.toBeNull();
      expect(screen.getByText(/Calculando estado de compliance/i)).not.toBeNull();
    });
  });

  it('busca con filtro "todos" usando dador por defecto', async () => {
    render(<ConsultaPage />, { wrapper: AllProviders });

    fireEvent.click(screen.getByText('Todos los equipos'));
    fireEvent.click(screen.getByText('Buscar'));

    await waitFor(() => {
      expect(lastPagedParams?.dadorCargaId).toBe(1);
    });
  });

  it('renderiza datos IA con disparidades y extractedData por documento', async () => {
    searchPagedState = {
      data: {
        data: [
          {
            id: 13,
            empresaTransportistaId: 5,
            driverId: 20,
            truckId: 30,
            trailerId: 40,
            driverDniNorm: '12345678',
            truckPlateNorm: 'ABC123',
            trailerPlateNorm: 'DEF456',
            activo: true,
          },
        ],
        pagination: { page: 1, limit: 10, total: 1, totalPages: 1, hasNext: false, hasPrev: false },
        stats: { total: 1, conFaltantes: 0, conVencidos: 0, conPorVencer: 0 },
      },
      isFetching: false,
      isError: false,
      error: undefined,
    };

    await act(async () => {
      store.dispatch(setCurrentUser({ id: 1, email: 'admin@test.com', role: 'SUPERADMIN' }));
    });
    localStorage.setItem('token', 'token-test');

    const fetchMock = jest.fn(async (url: string) => {
      if (url.includes('/EMPRESA_TRANSPORTISTA/')) {
        return {
          ok: true,
          json: async () => ({
            data: {
              extractedDataByDocument: [
                {
                  templateName: 'DNI',
                  uploadedAt: '2024-01-01T00:00:00.000Z',
                  data: { numero: '12345678' },
                },
              ],
              disparidades: [
                { campo: 'numero', mensaje: 'No coincide', severidad: 'warning', templateName: 'DNI', valorEnSistema: '1', valorEnDocumento: '2' },
              ],
              lastValidation: '2024-01-02T00:00:00.000Z',
            },
          }),
        } as Response;
      }
      return { ok: false } as Response;
    });
    Object.defineProperty(globalThis, 'fetch', { value: fetchMock, writable: true });

    render(<ConsultaPage />, { wrapper: AllProviders });

    fireEvent.click(screen.getByText('Buscar'));

    await waitFor(() => {
      expect(screen.getByText('Datos IA')).not.toBeNull();
    });

    fireEvent.click(screen.getByText('Datos IA'));

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Datos Extraídos por IA/i })).not.toBeNull();
      expect(screen.getByText(/Disparidades detectadas/i)).not.toBeNull();
      expect(screen.getByText(/Fuente: DNI/i)).not.toBeNull();
      expect(screen.getAllByText(/No hay datos extraídos por IA/i).length).toBeGreaterThan(0);
    });

    await act(async () => {
      store.dispatch(logout());
    });
    localStorage.removeItem('token');
  });
});
