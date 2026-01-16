/**
 * Tests para EditarEquipoPage - Modales de Creación
 */

import { jest, describe, it, expect, beforeAll, beforeEach } from '@jest/globals';
import { render, screen, waitFor } from '@testing-library/react';
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
} from './__mocks__/mockTestData';
import {
    createMockStore,
} from './__mocks__/mockApiHooks';

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

    beforeEach(() => {
        store = createMockStore({ user: { role: 'ADMIN_INTERNO' } });
        jest.clearAllMocks();
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

        // Click en el botón "+" al lado del select de camión
        const botonesPlus = screen.getAllByTitle(/Crear nuevo camión/i);
        await user.click(botonesPlus[0]);

        expect(screen.getByText(/Nuevo Camión/i)).toBeInTheDocument();

        // Cerrar modal
        const botonCancelar = screen.getByText(/Cancelar/i);
        await user.click(botonCancelar);

        expect(screen.queryByText(/Nuevo Camión/i)).not.toBeInTheDocument();
    });

    it('crea un nuevo camión exitosamente', async () => {
        const user = userEvent.setup();
        (createCamionMutation as any).mockResolvedValue({ id: 999, patente: 'NEW123' });

        render(
            <Provider store={store as any}>
                <ConfirmContext.Provider value={{ confirm: async () => true }}>
                    <MemoryRouter initialEntries={['/equipos/1']}>
                        <Routes><Route path="/equipos/:id" element={<EditarEquipoPage />} /></Routes>
                    </MemoryRouter>
                </ConfirmContext.Provider>
            </Provider>
        );

        await user.click(screen.getAllByTitle(/Crear nuevo camión/i)[0]);

        // Llenar campos
        const inputPatente = screen.getByLabelText(/Patente/i);
        await user.type(inputPatente, 'new123');

        await user.click(screen.getByText(/Guardar Camión/i));

        await waitFor(() => {
            expect(createCamionMutation).toHaveBeenCalledWith(expect.objectContaining({
                patente: 'NEW123'
            }));
            expect(screen.getByText(/Camión NEW123 creado exitosamente/i)).toBeInTheDocument();
        });
    });

    it('crea un chofer con cuenta de usuario y muestra password temporal', async () => {
        const user = userEvent.setup();
        (createChoferMutation as any).mockResolvedValue({ id: 888, dni: '99887766' });
        (registerChoferWizard as any).mockResolvedValue({ tempPassword: 'PASS_TEMPORAL_123' });

        render(
            <Provider store={store as any}>
                <ConfirmContext.Provider value={{ confirm: async () => true }}>
                    <MemoryRouter initialEntries={['/equipos/1']}>
                        <Routes><Route path="/equipos/:id" element={<EditarEquipoPage />} /></Routes>
                    </MemoryRouter>
                </ConfirmContext.Provider>
            </Provider>
        );

        await user.click(screen.getAllByTitle(/Crear nuevo chofer/i)[0]);

        await user.type(screen.getByLabelText(/DNI/i), '99887766');
        await user.type(screen.getByLabelText(/Nombre/i), 'Mario');
        await user.type(screen.getByLabelText(/Apellido/i), 'Bros');

        // Marcar "Crear cuenta de usuario"
        const checkbox = screen.getByLabelText(/Crear cuenta de usuario/i);
        await user.click(checkbox);

        await user.type(screen.getByLabelText(/Email/i), 'mario@test.com');

        await user.click(screen.getByText(/Guardar Chofer/i));

        await waitFor(() => {
            expect(createChoferMutation).toHaveBeenCalled();
            expect(registerChoferWizard).toHaveBeenCalledWith(expect.objectContaining({
                email: 'mario@test.com'
            }));
            expect(screen.getByText(/PASS_TEMPORAL_123/i)).toBeInTheDocument();
        });
    });
});
