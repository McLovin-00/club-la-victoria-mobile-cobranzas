/**
 * Tests para EditarEquipoPage - Modales de Creación
 */

import { jest, describe, it, expect, beforeAll, beforeEach } from '@jest/globals';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { Provider } from 'react-redux';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { ConfirmContext } from '../../../../contexts/confirmContext';
import {
    mockEquipo,
    mockChoferes,
    mockCamiones,
    mockAcoplados,
    mockEmpresas,
} from '../__mocks__/mockTestData';
import {
    createMockStore,
} from '../__mocks__/mockApiHooks';

// Mocks mutations
let createCamionMutation = jest.fn();
let createAcopladoMutation = jest.fn();
let createChoferMutation = jest.fn();
let createTransportistaMutation = jest.fn();
let registerChoferWizard = jest.fn();
let registerTransportistaWizard = jest.fn();
let uploadMutation = jest.fn();

let EditarEquipoPage: any;

beforeAll(async () => {
    const apiMock = {
        useGetEquipoByIdQuery: jest.fn(() => ({ data: mockEquipo, isLoading: false, refetch: jest.fn() })),
        useGetClientsQuery: jest.fn(() => ({ data: { list: [] }, isLoading: false })),
        useGetChoferesQuery: jest.fn(() => ({ data: mockChoferes, isLoading: false })),
        useGetCamionesQuery: jest.fn(() => ({ data: mockCamiones, isLoading: false })),
        useGetAcopladosQuery: jest.fn(() => ({ data: mockAcoplados, isLoading: false })),
        useGetEmpresasTransportistasQuery: jest.fn(() => ({ data: mockEmpresas, isLoading: false })),
        useGetEquipoRequisitosQuery: jest.fn(() => ({ data: [], refetch: jest.fn() })),
        useLazyCheckMissingDocsForClientQuery: jest.fn(() => [jest.fn(), { isFetching: false }]),
        useAttachEquipoComponentsMutation: jest.fn(() => [jest.fn(), { isLoading: false }]),
        useUpdateEquipoMutation: jest.fn(() => [jest.fn(), { isLoading: false }]),
        useAssociateEquipoClienteMutation: jest.fn(() => [jest.fn(), { isLoading: false }]),
        useRemoveEquipoClienteWithArchiveMutation: jest.fn(() => [jest.fn(), { isLoading: false }]),
        useUploadDocumentMutation: jest.fn(() => [uploadMutation, { isLoading: false }]),
        useCreateCamionMutation: jest.fn(() => [createCamionMutation, { isLoading: false }]),
        useCreateAcopladoMutation: jest.fn(() => [createAcopladoMutation, { isLoading: false }]),
        useCreateChoferMutation: jest.fn(() => [createChoferMutation, { isLoading: false }]),
        useCreateEmpresaTransportistaMutation: jest.fn(() => [createTransportistaMutation, { isLoading: false }]),
    };

    const platformMock = {
        useRegisterChoferWizardMutation: jest.fn(() => [registerChoferWizard, { isLoading: false }]),
        useRegisterTransportistaWizardMutation: jest.fn(() => [registerTransportistaWizard, { isLoading: false }]),
    };

    await jest.unstable_mockModule('../../../documentos/api/documentosApiSlice', () => apiMock);
    await jest.unstable_mockModule('../../../platform-users/api/platformUsersApiSlice', () => platformMock);
    await jest.unstable_mockModule('@/hooks/useRoleBasedNavigation', () => ({
        useRoleBasedNavigation: () => ({ goBack: jest.fn() }),
    }));

    const module = await import('../EditarEquipoPage');
    EditarEquipoPage = module.default;
});

describe('EditarEquipoPage - Modales de Creación', () => {
    let store: any;
    let confirmMock: jest.Mock;

    beforeEach(() => {
        store = createMockStore({ user: { role: 'ADMIN_INTERNO' } });
        jest.clearAllMocks();
        confirmMock = jest.fn().mockResolvedValue(true);

        // Resetear los mocks con promesas que resuelven
        createCamionMutation.mockResolvedValue({ id: 999, patente: 'NEW123' });
        createAcopladoMutation.mockResolvedValue({ id: 888, patente: 'TRL123' });
        createChoferMutation.mockResolvedValue({ id: 777, dni: '99887766' });
        registerChoferWizard.mockResolvedValue({ tempPassword: 'TEMP_PASS_123' });
        registerTransportistaWizard.mockResolvedValue({ tempPassword: 'TEMP_PASS_456' });
    });

    it('abre y cierra el modal de nuevo camión', async () => {
        const user = userEvent.setup();
        render(
            <Provider store={store as any}>
                <ConfirmContext.Provider value={{ confirm: async () => true }}>
                    <MemoryRouter initialEntries={['/equipos/1']}>
                        <Routes><Route path="/equipos/:id" element={<EditarEquipoPage />} /></Routes>
                    </MemoryRouter>
                </ConfirmContext.Provider>
            </Provider>
        );

        // Buscar botón con title "Crear nuevo camión"
        const camionButton = document.querySelector('button[title="Crear nuevo camión"]');
        if (camionButton) {
            await user.click(camionButton);
        }

        expect(screen.getByText(/Crear Nuevo Camión/i)).toBeInTheDocument();

        // Cerrar modal con el botón Cancelar
        const cancelarBtn = screen.getByText(/Cancelar/i);
        await user.click(cancelarBtn);

        await waitFor(() => {
            expect(screen.queryByText(/Crear Nuevo Camión/i)).not.toBeInTheDocument();
        });
    });

    it('abre el modal de nuevo camión y muestra los campos', async () => {
        render(
            <Provider store={store as any}>
                <ConfirmContext.Provider value={{ confirm: confirmMock }}>
                    <MemoryRouter initialEntries={['/equipos/1']}>
                        <Routes><Route path="/equipos/:id" element={<EditarEquipoPage />} /></Routes>
                    </MemoryRouter>
                </ConfirmContext.Provider>
            </Provider>
        );

        await waitFor(() => {
            expect(screen.getByText(/Modificar Entidades/i)).toBeInTheDocument();
        });

        const camionButton = document.querySelector('button[title="Crear nuevo camión"]');
        expect(camionButton).toBeInTheDocument();
        fireEvent.click(camionButton as Element);

        // Verificar que el modal se abrió y tiene los campos correctos
        expect(screen.getByText(/Crear Nuevo Camión/i)).toBeInTheDocument();
        expect(screen.getByPlaceholderText(/ABC123/)).toBeInTheDocument(); // Patente
        expect(screen.getByText(/Marca/i)).toBeInTheDocument();
        expect(screen.getByText(/Modelo/i)).toBeInTheDocument();
        expect(screen.getByText(/Cancelar/i)).toBeInTheDocument();
        expect(screen.getByText(/Crear Camión/i)).toBeInTheDocument();
    });

    it('abre el modal de nuevo chofer y muestra los campos', async () => {
        render(
            <Provider store={store as any}>
                <ConfirmContext.Provider value={{ confirm: confirmMock }}>
                    <MemoryRouter initialEntries={['/equipos/1']}>
                        <Routes><Route path="/equipos/:id" element={<EditarEquipoPage />} /></Routes>
                    </MemoryRouter>
                </ConfirmContext.Provider>
            </Provider>
        );

        await waitFor(() => {
            expect(screen.getByText(/Modificar Entidades/i)).toBeInTheDocument();
        });

        const choferButton = document.querySelector('button[title="Crear nuevo chofer"]');
        expect(choferButton).toBeInTheDocument();
        fireEvent.click(choferButton as Element);

        // Verificar que el modal se abrió y tiene los campos correctos
        expect(screen.getByText(/Crear Nuevo Chofer/i)).toBeInTheDocument();
        expect(screen.getByPlaceholderText('12345678')).toBeInTheDocument(); // DNI
        expect(screen.getByText(/Crear cuenta de usuario para este chofer/i)).toBeInTheDocument();
        expect(screen.getByText(/Cancelar/i)).toBeInTheDocument();
        expect(screen.getByText(/Crear Chofer/i)).toBeInTheDocument();
    });

    it('muestra el campo de email cuando se marca la casilla de crear usuario', async () => {
        const user = userEvent.setup();

        render(
            <Provider store={store as any}>
                <ConfirmContext.Provider value={{ confirm: confirmMock }}>
                    <MemoryRouter initialEntries={['/equipos/1']}>
                        <Routes><Route path="/equipos/:id" element={<EditarEquipoPage />} /></Routes>
                    </MemoryRouter>
                </ConfirmContext.Provider>
            </Provider>
        );

        await waitFor(() => {
            expect(screen.getByText(/Modificar Entidades/i)).toBeInTheDocument();
        });

        const choferButton = document.querySelector('button[title="Crear nuevo chofer"]');
        fireEvent.click(choferButton as Element);

        // El campo de email no debería estar visible inicialmente
        expect(screen.queryByPlaceholderText('chofer@empresa.com')).not.toBeInTheDocument();

        // Marcar el checkbox
        const checkbox = document.querySelector('input[type="checkbox"]');
        if (checkbox) {
            await user.click(checkbox);
        }

        // Ahora el campo de email debería estar visible
        expect(screen.getByPlaceholderText('chofer@empresa.com')).toBeInTheDocument();
        // El botón debería cambiar de texto
        expect(screen.getByText(/Crear Chofer \+ Usuario/i)).toBeInTheDocument();
    });
});
