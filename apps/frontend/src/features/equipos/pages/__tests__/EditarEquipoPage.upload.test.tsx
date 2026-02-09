/**
 * Tests para EditarEquipoPage - Subida de Documentos y creación
 */

import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { Provider } from 'react-redux';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import React from 'react';
import '@testing-library/jest-dom';
import { ConfirmContext } from '@/contexts/confirmContext';
import {
    mockEquipo,
    mockChoferes,
    mockCamiones,
    mockAcoplados,
    mockEmpresas,
    mockClientes,
    mockRequisitos,
} from '../__mocks__/mockTestData';
import {
    createMockStore,
    createRoleBasedNavigationMock,
} from '../__mocks__/mockApiHooks';

// Mock implementations
const uploadMutation = jest.fn();
const createCamionMutation = jest.fn();
const createChoferMutation = jest.fn();
const refetchRequisitos = jest.fn();
const refetchEquipo = jest.fn();

// Mock documentosApiSlice
jest.mock('../../../documentos/api/documentosApiSlice', () => ({
    useGetEquipoByIdQuery: jest.fn(() => ({
        data: mockEquipo,
        isLoading: false,
        refetch: refetchEquipo
    })),
    useGetClientsQuery: jest.fn(() => ({ data: mockClientes, isLoading: false })),
    useGetChoferesQuery: jest.fn(() => ({ data: mockChoferes, isLoading: false })),
    useGetCamionesQuery: jest.fn(() => ({ data: mockCamiones, isLoading: false })),
    useGetAcopladosQuery: jest.fn(() => ({ data: mockAcoplados, isLoading: false })),
    useGetEmpresasTransportistasQuery: jest.fn(() => ({ data: mockEmpresas, isLoading: false })),
    useGetEquipoRequisitosQuery: jest.fn(() => ({
        data: mockRequisitos,
        refetch: refetchRequisitos
    })),
    useLazyCheckMissingDocsForClientQuery: jest.fn(() => [
        jest.fn().mockResolvedValue({ data: { missingTemplates: [] } }),
        { isFetching: false }
    ]),
    useAttachEquipoComponentsMutation: jest.fn(() => [jest.fn().mockResolvedValue({}), { isLoading: false }]),
    useUpdateEquipoMutation: jest.fn(() => [jest.fn().mockResolvedValue({}), { isLoading: false }]),
    useAssociateEquipoClienteMutation: jest.fn(() => [jest.fn().mockResolvedValue({}), { isLoading: false }]),
    useRemoveEquipoClienteWithArchiveMutation: jest.fn(() => [jest.fn().mockResolvedValue({}), { isLoading: false }]),
    useUploadDocumentMutation: jest.fn(() => [uploadMutation, { isLoading: false }]),
    useCreateCamionMutation: jest.fn(() => [createCamionMutation, { isLoading: false }]),
    useCreateAcopladoMutation: jest.fn(() => [jest.fn().mockResolvedValue({ id: 888 }), { isLoading: false }]),
    useCreateChoferMutation: jest.fn(() => [createChoferMutation, { isLoading: false }]),
    useCreateEmpresaTransportistaMutation: jest.fn(() => [jest.fn().mockResolvedValue({ id: 555 }), { isLoading: false }]),
}));

// Mock platformUsersApiSlice
jest.mock('../../../platform-users/api/platformUsersApiSlice', () => ({
    useRegisterChoferWizardMutation: jest.fn(() => [jest.fn().mockResolvedValue({}), { isLoading: false }]),
    useRegisterTransportistaWizardMutation: jest.fn(() => [jest.fn().mockResolvedValue({}), { isLoading: false }]),
}));

// Mock useRoleBasedNavigation
jest.mock('@/hooks/useRoleBasedNavigation', () => ({
    useRoleBasedNavigation: () => createRoleBasedNavigationMock('ADMIN_INTERNO'),
}));

// Mock heroicons
jest.mock('@heroicons/react/24/outline', () => ({
    ArrowLeftIcon: () => <div>ArrowLeft</div>,
    DocumentIcon: () => <div>Document</div>,
    CheckCircleIcon: () => <div>CheckCircle</div>,
    ClockIcon: () => <div>Clock</div>,
    XCircleIcon: () => <div>XCircle</div>,
    ExclamationTriangleIcon: () => <div>Warning</div>,
    PlusIcon: () => <div>Plus</div>,
}));

import EditarEquipoPage from '../EditarEquipoPage';
import { useGetEquipoRequisitosQuery, useCreateCamionMutation } from '../../../documentos/api/documentosApiSlice';

describe('EditarEquipoPage - Subida de Documentos', () => {
    let store: any;
    let confirmMock: jest.Mock;

    beforeEach(() => {
        store = createMockStore({ user: { role: 'ADMIN_INTERNO' } });
        confirmMock = jest.fn().mockResolvedValue(true);
        jest.clearAllMocks();
        uploadMutation.mockResolvedValue({});
    });

    it('muestra input de archivo para subir documentos', async () => {
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
            expect(screen.getByText(/Documentación Requerida/i)).toBeInTheDocument();
        });

        // Verificar que hay inputs de archivo
        const fileInput = document.querySelector('input[type="file"]');
        expect(fileInput).toBeInTheDocument();
    });

    it('muestra estados de documentos correctamente', async () => {
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
            expect(screen.getByText(/Documentación Requerida/i)).toBeInTheDocument();
        });

        // Verificar resumen de estados
        expect(screen.getByText(/Vigentes:/i)).toBeInTheDocument();
        expect(screen.getByText(/Próximos a vencer:/i)).toBeInTheDocument();
        expect(screen.getByText(/Vencidos:/i)).toBeInTheDocument();
        expect(screen.getByText(/Faltantes:/i)).toBeInTheDocument();
    });

    it('muestra mensaje cuando no hay requisitos configurados', async () => {
        (useGetEquipoRequisitosQuery as jest.Mock).mockReturnValue({
            data: [],
            refetch: jest.fn()
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

        await waitFor(() => {
            expect(screen.getByText(/No hay requisitos documentales configurados/i)).toBeInTheDocument();
        });

        // Restaurar mock
        (useGetEquipoRequisitosQuery as jest.Mock).mockReturnValue({
            data: mockRequisitos,
            refetch: jest.fn()
        });
    });

    it('muestra requisitos agrupados por tipo de entidad', async () => {
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
            expect(screen.getByText(/Documentación Requerida/i)).toBeInTheDocument();
        });

        // Verificar que muestra etiquetas de tipo de entidad (puede haber múltiples)
        const choferElements = screen.getAllByText(/Chofer/i);
        expect(choferElements.length).toBeGreaterThan(0);

        const camionElements = screen.getAllByText(/Camión/i);
        expect(camionElements.length).toBeGreaterThan(0);
    });
});

describe('EditarEquipoPage - Creación de Entidades', () => {
    let store: any;
    let confirmMock: jest.Mock;

    beforeEach(() => {
        store = createMockStore({ user: { role: 'ADMIN_INTERNO' } });
        confirmMock = jest.fn().mockResolvedValue(true);
        jest.clearAllMocks();

        createCamionMutation.mockResolvedValue({ id: 999, patente: 'NEW123' });
        createChoferMutation.mockResolvedValue({ id: 777, dni: '99887766' });
    });

    it('crea camión correctamente desde modal', async () => {
        const createFn = jest.fn().mockResolvedValue({ id: 999, patente: 'XYZ999' });
        (useCreateCamionMutation as jest.Mock).mockReturnValue([createFn, { isLoading: false }]);

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

        // Abrir modal de nuevo camión
        const camionButton = document.querySelector('button[title="Crear nuevo camión"]');
        fireEvent.click(camionButton as Element);

        await waitFor(() => {
            expect(screen.getByText(/Crear Nuevo Camión/i)).toBeInTheDocument();
        });

        // Llenar formulario
        const patenteInput = screen.getByPlaceholderText(/ABC123 o AB123CD/i);
        fireEvent.change(patenteInput, { target: { value: 'XYZ999' } });

        // Click en Crear Camión
        const crearBtn = screen.getByText(/Crear Camión/i);
        fireEvent.click(crearBtn);

        await waitFor(() => {
            expect(createFn).toHaveBeenCalled();
        });
    });

    it('abre modal de chofer', async () => {
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

        // Abrir modal de nuevo chofer
        const choferButton = document.querySelector('button[title="Crear nuevo chofer"]');
        expect(choferButton).toBeInTheDocument();
        fireEvent.click(choferButton as Element);

        // Verificar que el modal se abre
        await waitFor(() => {
            expect(screen.getByText(/Crear Nuevo Chofer/i)).toBeInTheDocument();
        });
    });
});

describe('EditarEquipoPage - Permisos por Rol', () => {
    let confirmMock: jest.Mock;

    beforeEach(() => {
        confirmMock = jest.fn().mockResolvedValue(true);
        jest.clearAllMocks();
    });

    it('no muestra botones de edición para rol sin permiso', async () => {
        const store = createMockStore({ user: { role: 'CHOFER' } });

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
            expect(screen.getByText(/Editar Equipo/i)).toBeInTheDocument();
        });

        // Verificar que NO se muestra la sección de modificación
        expect(screen.queryByText(/Modificar Entidades/i)).not.toBeInTheDocument();
    });

    it('muestra gestión de clientes para ADMIN_INTERNO', async () => {
        const store = createMockStore({ user: { role: 'ADMIN_INTERNO' } });

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
            expect(screen.getByText(/Clientes Asociados/i)).toBeInTheDocument();
        });

        // Verificar botón agregar cliente
        expect(screen.getByText(/Agregar Cliente/i)).toBeInTheDocument();
    });
});
