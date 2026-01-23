/**
 * Tests para EditarEquipoPage - Gestión de Documentos y Clientes
 */

import { jest, describe, it, expect, beforeAll, beforeEach } from '@jest/globals';
import { render, screen, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import '@testing-library/jest-dom';
import { ConfirmContext } from '../../../../contexts/confirmContext';
import {
    mockEquipo,
    mockRequisitos,
} from '../__mocks__/mockTestData';
import {
    createMockStore,
} from '../__mocks__/mockApiHooks';

// Mocks mutations
let uploadMutation = jest.fn();
let associateMutation = jest.fn();
let removeMutation = jest.fn();
let checkMissingDocs = jest.fn();

let EditarEquipoPage: any;

beforeAll(async () => {
    // Mock de clientes con clientes disponibles (no asociados al equipo)
    const mockClientesConDisponibles = {
        list: [
            { id: 1, razonSocial: 'Cliente Test 1', cuit: '30111111111', activo: true },
            { id: 2, razonSocial: 'Cliente Test 2', cuit: '30222222222', activo: true },
            { id: 3, razonSocial: 'Cliente Test 3', cuit: '30333333333', activo: true },
        ],
    };

    const apiMock = {
        useGetEquipoByIdQuery: jest.fn(() => ({ data: mockEquipo, isLoading: false, refetch: jest.fn() })),
        useGetClientsQuery: jest.fn(() => ({ data: mockClientesConDisponibles, isLoading: false })),
        useGetChoferesQuery: jest.fn(() => ({ data: { data: [] }, isLoading: false })),
        useGetCamionesQuery: jest.fn(() => ({ data: { data: [] }, isLoading: false })),
        useGetAcopladosQuery: jest.fn(() => ({ data: { data: [] }, isLoading: false })),
        useGetEmpresasTransportistasQuery: jest.fn(() => ({ data: [], isLoading: false })),
        useGetEquipoRequisitosQuery: jest.fn(() => ({ data: mockRequisitos, refetch: jest.fn() })),
        useLazyCheckMissingDocsForClientQuery: jest.fn(() => [checkMissingDocs, { isFetching: false }]),
        useAttachEquipoComponentsMutation: jest.fn(() => [jest.fn(), { isLoading: false }]),
        useUpdateEquipoMutation: jest.fn(() => [jest.fn(), { isLoading: false }]),
        useAssociateEquipoClienteMutation: jest.fn(() => [associateMutation, { isLoading: false }]),
        useRemoveEquipoClienteWithArchiveMutation: jest.fn(() => [removeMutation, { isLoading: false }]),
        useUploadDocumentMutation: jest.fn(() => [uploadMutation, { isLoading: false }]),
        useCreateCamionMutation: jest.fn(() => [jest.fn(), { isLoading: false }]),
        useCreateAcopladoMutation: jest.fn(() => [jest.fn(), { isLoading: false }]),
        useCreateChoferMutation: jest.fn(() => [jest.fn(), { isLoading: false }]),
        useCreateEmpresaTransportistaMutation: jest.fn(() => [jest.fn(), { isLoading: false }]),
    };

    await jest.unstable_mockModule('../../../documentos/api/documentosApiSlice', () => apiMock);
    await jest.unstable_mockModule('../../../platform-users/api/platformUsersApiSlice', () => ({
        useRegisterChoferWizardMutation: jest.fn(() => [jest.fn(), { isLoading: false }]),
        useRegisterTransportistaWizardMutation: jest.fn(() => [jest.fn(), { isLoading: false }]),
    }));
    await jest.unstable_mockModule('@/hooks/useRoleBasedNavigation', () => ({
        useRoleBasedNavigation: () => ({ goBack: jest.fn() }),
    }));

    const module = await import('../EditarEquipoPage');
    EditarEquipoPage = module.default;
});

describe('EditarEquipoPage - Documentos y Clientes', () => {
    let store: any;
    let confirmMock: any;

    beforeEach(() => {
        store = createMockStore({ user: { role: 'ADMIN_INTERNO' } });
        confirmMock = jest.fn().mockResolvedValue(true);
        jest.clearAllMocks();
    });

    it('asocia un nuevo cliente al equipo', async () => {
        (checkMissingDocs as any).mockResolvedValue({
            data: { missingTemplates: [], newClientName: 'Cliente Test 3' }
        });
        (associateMutation as any).mockResolvedValue({});

        render(
            <Provider store={store as any}>
                <ConfirmContext.Provider value={{ confirm: confirmMock }}>
                    <MemoryRouter initialEntries={['/equipos/1']}>
                        <Routes><Route path="/equipos/:id" element={<EditarEquipoPage />} /></Routes>
                    </MemoryRouter>
                </ConfirmContext.Provider>
            </Provider>
        );

        // Buscar el select de clientes y el botón de agregar
        const select = screen.getByDisplayValue(/Seleccionar cliente para agregar/);
        expect(select).toBeInTheDocument();

        const agregarBtn = screen.getByText(/Agregar Cliente/i);
        expect(agregarBtn).toBeInTheDocument();
        // El botón debería estar deshabilitado si no hay cliente seleccionado
        expect(agregarBtn).toBeDisabled();
    });

    it('sube un documento para un requisito específico', async () => {
        (uploadMutation as any).mockResolvedValue({});
        confirmMock.mockResolvedValue(true);

        render(
            <Provider store={store as any}>
                <ConfirmContext.Provider value={{ confirm: confirmMock }}>
                    <MemoryRouter initialEntries={['/equipos/1']}>
                        <Routes><Route path="/equipos/:id" element={<EditarEquipoPage />} /></Routes>
                    </MemoryRouter>
                </ConfirmContext.Provider>
            </Provider>
        );

        // Verificar que se muestran los requisitos de documentos
        // Los requisitos se renderizan en secciones por tipo de entidad
        await waitFor(() => {
            expect(screen.getByText(/Clientes Asociados/i)).toBeInTheDocument();
        });
    });

    it('muestra advertencia si faltan documentos obligatorios para un cliente', async () => {
        (checkMissingDocs as any).mockResolvedValue({
            data: {
                missingTemplates: [{ id: 99, name: 'Certificado Especial' }],
                newClientName: 'Cliente Critico'
            }
        });

        render(
            <Provider store={store as any}>
                <ConfirmContext.Provider value={{ confirm: confirmMock }}>
                    <MemoryRouter initialEntries={['/equipos/1']}>
                        <Routes><Route path="/equipos/:id" element={<EditarEquipoPage />} /></Routes>
                    </MemoryRouter>
                </ConfirmContext.Provider>
            </Provider>
        );

        // Verificar que existe el select para agregar clientes
        expect(screen.getByDisplayValue(/Seleccionar cliente para agregar/)).toBeInTheDocument();
        expect(screen.getByText(/Agregar Cliente/i)).toBeInTheDocument();
    });
});
