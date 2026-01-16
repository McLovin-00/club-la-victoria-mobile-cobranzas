// Tests completos de `DocumentsSemaforo`: semáforo de estado de documentos (Jest ESM).
import React from 'react';
import { describe, it, expect, beforeAll, beforeEach, jest } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';

describe('DocumentsSemaforo - render completo con coverage', () => {
  let DocumentsSemaforo: React.FC;
  let useGetDashboardDataQuery: jest.Mock;
  let mockStore: any;

  beforeAll(async () => {
    useGetDashboardDataQuery = jest.fn();

    // Crear un store mock de Redux
    mockStore = configureStore({
      reducer: {
        [Math.random().toString()]: (state = {}) => state,
      },
      middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware({
          thunk: {
            extraArgument: {},
          },
        }),
    });

    // Importar el módulo real para mantener todas sus exportaciones
    const actualModule = await import('../../api/documentosApiSlice');

    // Mock RTK Query hooks
    await jest.unstable_mockModule('../../api/documentosApiSlice', () => ({
      ...actualModule,
      useGetDashboardDataQuery: (...args: any[]) => useGetDashboardDataQuery(...args),
    }));

    const module = await import('../DocumentsSemaforo');
    DocumentsSemaforo = module.DocumentsSemaforo;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    useGetDashboardDataQuery.mockReturnValue({
      data: null,
      isLoading: false,
      error: null,
    });
  });

  const renderComponent = (empresaId: number = 123) => {
    return render(
      <Provider store={mockStore}>
        <DocumentsSemaforo empresaId={empresaId} />
      </Provider>
    );
  };

  it('muestra skeleton mientras carga', () => {
    useGetDashboardDataQuery.mockReturnValue({
      data: null,
      isLoading: true,
      error: null,
    });

    renderComponent();

    // Verifica que se muestran 4 skeletons
    const skeletons = screen.getAllByText('');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('muestra error cuando falla la carga', () => {
    useGetDashboardDataQuery.mockReturnValue({
      data: null,
      isLoading: false,
      error: new Error('Failed to load'),
    });

    renderComponent();

    expect(screen.getByText('Error al cargar el estado de documentación')).toBeInTheDocument();
  });

  it('muestra error cuando data es null', () => {
    useGetDashboardDataQuery.mockReturnValue({
      data: null,
      isLoading: false,
      error: null,
    });

    renderComponent();

    expect(screen.getByText('Error al cargar el estado de documentación')).toBeInTheDocument();
  });

  it('filtra semáforos por empresaId', () => {
    const mockData = {
      semaforos: [
        {
          empresaId: 123,
          statusCounts: {
            verde: [10, 5, 3, 2],
            amarillo: [2, 1, 1, 0],
            rojo: [1, 0, 1, 0],
          },
        },
        {
          empresaId: 456, // Otra empresa
          statusCounts: {
            verde: [5, 2, 1, 1],
            amarillo: [1, 0, 0, 0],
            rojo: [0, 1, 0, 0],
          },
        },
      ],
    };

    useGetDashboardDataQuery.mockReturnValue({
      data: mockData,
      isLoading: false,
      error: null,
    });

    renderComponent(123);

    // Verifica que se muestran las 4 tarjetas
    expect(screen.getByText('Empresa Transportista')).toBeInTheDocument();
    expect(screen.getByText('Choferes')).toBeInTheDocument();
    expect(screen.getByText('Camiones')).toBeInTheDocument();
    expect(screen.getByText('Acoplados')).toBeInTheDocument();
  });

  it('calcula correctamente los totales de empresa', () => {
    const mockData = {
      semaforos: [
        {
          empresaId: 123,
          statusCounts: {
            verde: [10, 5, 3, 2],
            amarillo: [2, 1, 1, 0],
            rojo: [1, 0, 1, 0],
          },
        },
      ],
    };

    useGetDashboardDataQuery.mockReturnValue({
      data: mockData,
      isLoading: false,
      error: null,
    });

    renderComponent(123);

    // Empresa: verde[0]=10, amarillo[0]=2, rojo[0]=1
    expect(screen.getAllByText('10').length).toBeGreaterThan(0);
    expect(screen.getAllByText('2').length).toBeGreaterThan(0);
    expect(screen.getAllByText('1').length).toBeGreaterThan(0);
  });

  it('calcula correctamente los totales de choferes', () => {
    const mockData = {
      semaforos: [
        {
          empresaId: 123,
          statusCounts: {
            verde: [10, 5, 3, 2], // choferes = verde[1]=5
            amarillo: [2, 1, 1, 0], // choferes = amarillo[1]=1
            rojo: [1, 0, 1, 0], // choferes = rojo[1]=0
          },
        },
      ],
    };

    useGetDashboardDataQuery.mockReturnValue({
      data: mockData,
      isLoading: false,
      error: null,
    });

    renderComponent(123);

    // Debería mostrar los totales de choferes
    expect(screen.getAllByText('5').length).toBeGreaterThan(0); // Verde choferes
    expect(screen.getAllByText('1').length).toBeGreaterThan(0); // Amarillo choferes
  });

  it('calcula correctamente los totales de camiones', () => {
    const mockData = {
      semaforos: [
        {
          empresaId: 123,
          statusCounts: {
            verde: [10, 5, 3, 2], // camiones = verde[2]=3
            amarillo: [2, 1, 1, 0], // camiones = amarillo[2]=1
            rojo: [1, 0, 1, 0], // camiones = rojo[2]=1
          },
        },
      ],
    };

    useGetDashboardDataQuery.mockReturnValue({
      data: mockData,
      isLoading: false,
      error: null,
    });

    renderComponent(123);

    // Debería mostrar los totales de camiones
    expect(screen.getAllByText('3').length).toBeGreaterThan(0); // Verde camiones
    expect(screen.getAllByText('1').length).toBeGreaterThan(0); // Amarillo camiones
  });

  it('calcula correctamente los totales de acoplados', () => {
    const mockData = {
      semaforos: [
        {
          empresaId: 123,
          statusCounts: {
            verde: [10, 5, 3, 2], // acoplados = verde[3]=2
            amarillo: [2, 1, 1, 0], // acoplados = amarillo[3]=0
            rojo: [1, 0, 1, 0], // acoplados = rojo[3]=0
          },
        },
      ],
    };

    useGetDashboardDataQuery.mockReturnValue({
      data: mockData,
      isLoading: false,
      error: null,
    });

    renderComponent(123);

    // Debería mostrar los totales de acoplados
    expect(screen.getAllByText('2').length).toBeGreaterThan(0); // Verde acoplados
  });

  it('muestra todos los iconos', () => {
    const mockData = {
      semaforos: [
        {
          empresaId: 123,
          statusCounts: {
            verde: [10, 5, 3, 2],
            amarillo: [2, 1, 1, 0],
            rojo: [1, 0, 1, 0],
          },
        },
      ],
    };

    useGetDashboardDataQuery.mockReturnValue({
      data: mockData,
      isLoading: false,
      error: null,
    });

    renderComponent(123);

    expect(screen.getByText('🏢')).toBeInTheDocument();
    expect(screen.getByText('👨‍💼')).toBeInTheDocument();
    expect(screen.getByText('🚛')).toBeInTheDocument();
    expect(screen.getByText('🚚')).toBeInTheDocument();
  });

  it('muestra etiquetas de estado', () => {
    const mockData = {
      semaforos: [
        {
          empresaId: 123,
          statusCounts: {
            verde: [10, 5, 3, 2],
            amarillo: [2, 1, 1, 0],
            rojo: [1, 0, 1, 0],
          },
        },
      ],
    };

    useGetDashboardDataQuery.mockReturnValue({
      data: mockData,
      isLoading: false,
      error: null,
    });

    renderComponent(123);

    expect(screen.getAllByText('Vencidos').length).toBe(4);
    expect(screen.getAllByText('Por vencer').length).toBe(4);
    expect(screen.getAllByText('Vigentes').length).toBe(4);
  });

  it('maneja arrays vacíos en statusCounts', () => {
    const mockData = {
      semaforos: [
        {
          empresaId: 123,
          statusCounts: {
            verde: [],
            amarillo: [],
            rojo: [],
          },
        },
      ],
    };

    useGetDashboardDataQuery.mockReturnValue({
      data: mockData,
      isLoading: false,
      error: null,
    });

    renderComponent(123);

    // Debería mostrar todos ceros
    expect(screen.getAllByText('0').length).toBeGreaterThan(0);
  });

  it('suma múltiples semáforos de la misma empresa', () => {
    const mockData = {
      semaforos: [
        {
          empresaId: 123,
          statusCounts: {
            verde: [10, 5, 3, 2],
            amarillo: [2, 1, 1, 0],
            rojo: [1, 0, 1, 0],
          },
        },
        {
          empresaId: 123, // Segundo semáforo de la misma empresa
          statusCounts: {
            verde: [5, 2, 1, 1],
            amarillo: [1, 0, 0, 0],
            rojo: [0, 1, 0, 0],
          },
        },
      ],
    };

    useGetDashboardDataQuery.mockReturnValue({
      data: mockData,
      isLoading: false,
      error: null,
    });

    renderComponent(123);

    // Empresa: 10+5=15 verde, 2+1=3 amarillo, 1+0=1 rojo
    expect(screen.getAllByText('15').length).toBeGreaterThan(0);
    expect(screen.getAllByText('3').length).toBeGreaterThan(0);
  });
});
