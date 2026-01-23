/**
 * Tests comprehensivos para AltaEquipoCompletaPage
 * Parte 1: Rendering, Estados Iniciales, y Validaciones
 */

import { jest, describe, it, expect, beforeAll, beforeEach } from '@jest/globals';
import { render, screen, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import {
    mockTemplates,
    mockDadores,
    mockClientes,
} from '../__mocks__/mockTestData';
import {
    createMockStore,
} from '../__mocks__/mockApiHooks';

// Definir mocks
const useGetTemplatesQuery = jest.fn();
const useGetDadoresQuery = jest.fn();
const useGetClientsQuery = jest.fn();
const useLazyGetConsolidatedTemplatesQuery = jest.fn();
const useUploadDocumentMutation = jest.fn();
const useCreateEquipoCompletoMutation = jest.fn();
const useRollbackEquipoCompletoMutation = jest.fn();
const goBack = jest.fn();
const getHomeRoute = jest.fn();

let AltaEquipoCompletaPage: any;

beforeAll(async () => {
    const apiMock = {
        useGetTemplatesQuery,
        useGetDadoresQuery,
        useGetClientsQuery,
        useLazyGetConsolidatedTemplatesQuery,
        useUploadDocumentMutation,
        useCreateEquipoCompletoMutation,
        useRollbackEquipoCompletoMutation,
    };

    // Mocks coincidentes con las rutas relativas en el componente
    await jest.unstable_mockModule('../../../documentos/api/documentosApiSlice', () => apiMock);

    await jest.unstable_mockModule('../../../../hooks/useRoleBasedNavigation', () => ({
        useRoleBasedNavigation: () => ({
            goBack,
            getHomeRoute,
            user: { role: 'ADMIN_INTERNO', empresaId: 1 },
        }),
    }));

    await jest.unstable_mockModule('../../components/SeccionDocumentos', () => ({
        SeccionDocumentos: ({ titulo }: any) => <div data-testid="seccion-documentos">{titulo}</div>,
    }));

    const module = await import('../AltaEquipoCompletaPage');
    AltaEquipoCompletaPage = module.default;
});

describe('AltaEquipoCompletaPage - Rendering y Estados', () => {
    let store: any;

    beforeEach(() => {
        store = createMockStore();
        jest.clearAllMocks();

        // Implementaciones por defecto exitosas
        useGetTemplatesQuery.mockReturnValue({ data: mockTemplates, isLoading: false, refetch: jest.fn() });
        useGetDadoresQuery.mockReturnValue({ data: mockDadores, isLoading: false, refetch: jest.fn() });
        useGetClientsQuery.mockReturnValue({ data: mockClientes, isLoading: false, refetch: jest.fn() });
        useLazyGetConsolidatedTemplatesQuery.mockReturnValue([jest.fn(), { data: null, isFetching: false }]);
        useUploadDocumentMutation.mockReturnValue([jest.fn(), { isLoading: false }]);
        useCreateEquipoCompletoMutation.mockReturnValue([jest.fn(), { isLoading: false }]);
        useRollbackEquipoCompletoMutation.mockReturnValue([jest.fn(), { isLoading: false }]);
        getHomeRoute.mockReturnValue('/home');
    });

    it('muestra estado loading mientras carga templates', async () => {
        useGetTemplatesQuery.mockReturnValue({ data: undefined, isLoading: true });

        render(
            <Provider store={store as any}>
                <MemoryRouter>
                    <AltaEquipoCompletaPage />
                </MemoryRouter>
            </Provider>
        );

        expect(screen.getByText(/Cargando templates/i)).toBeInTheDocument();
    });

    it('renderiza formulario completo para ADMIN_INTERNO', () => {
        render(
            <Provider store={store as any}>
                <MemoryRouter>
                    <AltaEquipoCompletaPage />
                </MemoryRouter>
            </Provider>
        );

        expect(screen.getByText(/Alta Completa de Equipo/i)).toBeInTheDocument();
        expect(screen.getAllByText(/Dador de Carga/i).length).toBeGreaterThan(0);
        expect(screen.getAllByText(/Empresa Transportista/i).length).toBeGreaterThan(0);
        expect(screen.getAllByText(/Chofer/i).length).toBeGreaterThan(0);
        expect(screen.getAllByText(/Tractor/i).length).toBeGreaterThan(0);
    });

    it('muestra progress bar con progreso correcto (0% inicial)', () => {
        render(
            <Provider store={store as any}>
                <MemoryRouter>
                    <AltaEquipoCompletaPage />
                </MemoryRouter>
            </Provider>
        );

        expect(screen.getByText(/Progreso de selección/i)).toBeInTheDocument();
        expect(screen.getByText(/0%/i)).toBeInTheDocument();
    });

    it('renderiza secciones de documentos con data-testid', () => {
        render(
            <Provider store={store as any}>
                <MemoryRouter>
                    <AltaEquipoCompletaPage />
                </MemoryRouter>
            </Provider>
        );

        const secciones = screen.getAllByTestId('seccion-documentos');
        expect(secciones.length).toBeGreaterThan(0);
    });

    it('botón "Crear Equipo" está deshabilitado inicialmente', () => {
        render(
            <Provider store={store as any}>
                <MemoryRouter>
                    <AltaEquipoCompletaPage />
                </MemoryRouter>
            </Provider>
        );

        // El botón tiene el texto de "Crear Equipo..." o similar
        const botonCrear = screen.getByRole('button', { name: /Crear Equipo/i });
        expect(botonCrear).toBeDisabled();
    });
});

describe('AltaEquipoCompletaPage - Validación de Inputs', () => {
    let store: any;

    beforeEach(() => {
        store = createMockStore();
        jest.clearAllMocks();
        useGetTemplatesQuery.mockReturnValue({ data: mockTemplates, isLoading: false });
        useGetDadoresQuery.mockReturnValue({ data: mockDadores, isLoading: false });
        useGetClientsQuery.mockReturnValue({ data: mockClientes, isLoading: false });
        useLazyGetConsolidatedTemplatesQuery.mockReturnValue([jest.fn(), { data: null, isFetching: false }]);
        useUploadDocumentMutation.mockReturnValue([jest.fn(), { isLoading: false }]);
        useCreateEquipoCompletoMutation.mockReturnValue([jest.fn(), { isLoading: false }]);
    });

    it('input de CUIT solo acepta números y máximo 11 dígitos', async () => {
        const user = userEvent.setup();

        render(
            <Provider store={store as any}>
                <MemoryRouter>
                    <AltaEquipoCompletaPage />
                </MemoryRouter>
            </Provider>
        );

        const inputCuit = screen.getByPlaceholderText(/30123456789/i);
        await user.type(inputCuit, 'ABC123456789012');
        expect(inputCuit).toHaveValue('12345678901');
    });

    it('input de DNI chofer solo acepta números', async () => {
        const user = userEvent.setup();

        render(
            <Provider store={store as any}>
                <MemoryRouter>
                    <AltaEquipoCompletaPage />
                </MemoryRouter>
            </Provider>
        );

        const inputDni = screen.getAllByPlaceholderText(/12345678/i)[0];
        await user.type(inputDni, 'ABC12345');
        expect(inputDni).toHaveValue('12345');
    });

    it('input de patente tractor convierte a mayúsculas', async () => {
        const user = userEvent.setup();

        render(
            <Provider store={store as any}>
                <MemoryRouter>
                    <AltaEquipoCompletaPage />
                </MemoryRouter>
            </Provider>
        );

        const inputPatente = screen.getAllByPlaceholderText(/ABC123/i)[0];
        await user.type(inputPatente, 'abc123');
        expect(inputPatente).toHaveValue('ABC123');
    });
});
