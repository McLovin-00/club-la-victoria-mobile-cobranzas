/**
 * Tests para EditarEquipoPage - Gestión de Documentos y Clientes
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
    mockClientes,
    mockRequisitos,
} from './__mocks__/mockTestData';
import {
    createMockStore,
} from './__mocks__/mockApiHooks';

// Mocks mutations
let uploadMutation = jest.fn();
let associateMutation = jest.fn();
let removeMutation = jest.fn();
let checkMissingDocs = jest.fn();

let EditarEquipoPage: any;

beforeAll(async () => {
    const apiMock = {
        useGetEquipoByIdQuery: jest.fn(() => ({ data: mockEquipo, isLoading: false, refetch: jest.fn() })),
        useGetClientsQuery: jest.fn(() => ({ data: mockClientes, isLoading: false })),
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
    };

    await jest.unstable_mockModule('../../../documentos/api/documentosApiSlice', () => apiMock);
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
        const user = userEvent.setup();
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

        // Buscar el select de clientes (el que tiene el botón "Asociar")
        const selectCliente = screen.getByLabelText(/Asociar nuevo cliente/i);
        await user.selectOptions(selectCliente, '3');

        await user.click(screen.getByText(/Asociar/i));

        await waitFor(() => {
            expect(associateMutation).toHaveBeenCalledWith({
                equipoId: 1,
                clienteId: 3
            });
            expect(screen.getByText(/Cliente asociado correctamente/i)).toBeInTheDocument();
        });
    });

    it('sube un documento para un requisito específico', async () => {
        const user = userEvent.setup();
        (uploadMutation as any).mockResolvedValue({});

        render(
            <Provider store={store as any}>
                <ConfirmContext.Provider value={{ confirm: confirmMock }}>
                    <MemoryRouter initialEntries={['/equipos/1']}>
                        <Routes><Route path="/equipos/:id" element={<EditarEquipoPage />} /></Routes>
                    </MemoryRouter>
                </ConfirmContext.Provider>
            </Provider>
        );

        // Buscar una sección de carga de archivo
        const inputsSubir = screen.getAllByTestId('file-input');
        const mockFile = new File(['hello'], 'hello.png', { type: 'image/png' });

        await user.upload(inputsSubir[0], mockFile);

        // Buscar el input de fecha de vencimiento al lado
        const inputsFecha = screen.getAllByTestId('date-input');
        await user.type(inputsFecha[0], '2026-12-31');

        // Click en "Cargar"
        const botonesCargar = screen.getAllByRole('button', { name: /Cargar/i });
        await user.click(botonesCargar[0]);

        await waitFor(() => {
            expect(confirmMock).toHaveBeenCalled();
            expect(uploadMutation).toHaveBeenCalled();
            expect(screen.getByText(/Documento subido con éxito/i)).toBeInTheDocument();
        });
    });

    it('muestra advertencia si faltan documentos obligatorios para un cliente al intentar asociar', async () => {
        const user = userEvent.setup();
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

        const selectCliente = screen.getByLabelText(/Asociar nuevo cliente/i);
        await user.selectOptions(selectCliente, '3');

        await user.click(screen.getByText(/Asociar/i));

        await waitFor(() => {
            expect(screen.getByText(/Atención: Faltan documentos/i)).toBeInTheDocument();
            expect(screen.getByText(/Certificado Especial/i)).toBeInTheDocument();
        });
    });
});
