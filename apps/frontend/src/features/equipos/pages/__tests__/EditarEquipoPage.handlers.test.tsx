/**
 * Tests de cobertura para EditarEquipoPage - Handlers y Lógica de Negocio
 * Casos específicos para mejorar cobertura de líneas sin cubrir
 */

import { jest, describe, it, expect, beforeAll, beforeEach } from '@jest/globals';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { Provider } from 'react-redux';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { ConfirmContext } from '@/contexts/confirmContext';
import {
    mockEquipo,
    mockChoferes,
    mockCamiones,
    mockAcoplados,
    mockEmpresas,
    mockClientes,
} from '../__mocks__/mockTestData';
import {
    createMockStore,
    createRoleBasedNavigationMock,
} from '../__mocks__/mockApiHooks';

let attachMutation: jest.Mock;
let updateMutation: jest.Mock;
let refetchEquipo: jest.Mock;
let refetchRequisitos: jest.Mock;
let createCamionMutation: jest.Mock;
let createAcopladoMutation: jest.Mock;
let createChoferMutation: jest.Mock;
let createTransportistaMutation: jest.Mock;
let registerChoferWizard: jest.Mock;
let registerTransportistaWizard: jest.Mock;
let associateMutation: jest.Mock;
let removeMutation: jest.Mock;
let checkMissingDocs: jest.Mock;

let EditarEquipoPage: any;

beforeAll(async () => {
    attachMutation = jest.fn();
    updateMutation = jest.fn();
    refetchEquipo = jest.fn();
    refetchRequisitos = jest.fn();
    createCamionMutation = jest.fn();
    createAcopladoMutation = jest.fn();
    createChoferMutation = jest.fn();
    createTransportistaMutation = jest.fn();
    registerChoferWizard = jest.fn();
    registerTransportistaWizard = jest.fn();
    associateMutation = jest.fn();
    removeMutation = jest.fn();
    checkMissingDocs = jest.fn();

    const apiMock = {
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
        useGetEquipoRequisitosQuery: jest.fn(() => ({ data: [], refetch: refetchRequisitos })),
        useLazyCheckMissingDocsForClientQuery: jest.fn(() => [
            checkMissingDocs,
            { isFetching: false }
        ]),
        useAttachEquipoComponentsMutation: jest.fn(() => [attachMutation, { isLoading: false }]),
        useUpdateEquipoMutation: jest.fn(() => [updateMutation, { isLoading: false }]),
        useAssociateEquipoClienteMutation: jest.fn(() => [associateMutation, { isLoading: false }]),
        useRemoveEquipoClienteWithArchiveMutation: jest.fn(() => [removeMutation, { isLoading: false }]),
        useUploadDocumentMutation: jest.fn(() => [jest.fn(), { isLoading: false }]),
        useCreateCamionMutation: jest.fn(() => [createCamionMutation, { isLoading: false }]),
        useCreateAcopladoMutation: jest.fn(() => [createAcopladoMutation, { isLoading: false }]),
        useCreateChoferMutation: jest.fn(() => [createChoferMutation, { isLoading: false }]),
        useCreateEmpresaTransportistaMutation: jest.fn(() => [createTransportistaMutation, { isLoading: false }]),
    };

    await jest.unstable_mockModule('../../../documentos/api/documentosApiSlice', () => apiMock);
    await jest.unstable_mockModule('../../../platform-users/api/platformUsersApiSlice', () => ({
        useRegisterChoferWizardMutation: jest.fn(() => [registerChoferWizard, { isLoading: false }]),
        useRegisterTransportistaWizardMutation: jest.fn(() => [registerTransportistaWizard, { isLoading: false }]),
    }));
    await jest.unstable_mockModule('@/hooks/useRoleBasedNavigation', () => ({
        useRoleBasedNavigation: () => createRoleBasedNavigationMock('ADMIN_INTERNO'),
    }));
    await jest.unstable_mockModule('@heroicons/react/24/outline', () => ({
        ArrowLeftIcon: () => <div>ArrowLeft</div>,
        DocumentIcon: () => <div>Document</div>,
        CheckCircleIcon: () => <div>CheckCircle</div>,
        ExclamationTriangleIcon: () => <div>ExclamationTriangle</div>,
        XCircleIcon: () => <div>XCircle</div>,
        ClockIcon: () => <div>Clock</div>,
        PlusIcon: () => <div>Plus</div>,
        XMarkIcon: () => <div>XMark</div>,
    }));

    const module = await import('../EditarEquipoPage');
    EditarEquipoPage = module.default;
});

describe('EditarEquipoPage - Handlers de Cambio de Entidad', () => {
    let store: any;
    let confirmMock: jest.Mock;

    beforeEach(() => {
        store = createMockStore({ user: { role: 'ADMIN_INTERNO' } });
        confirmMock = jest.fn().mockResolvedValue(true);
        jest.clearAllMocks();

        // Resetear mocks con promesas resueltas
        attachMutation.mockResolvedValue({});
        updateMutation.mockResolvedValue({});
        associateMutation.mockResolvedValue({});
        removeMutation.mockResolvedValue({ archivedDocuments: 2 });
        checkMissingDocs.mockResolvedValue({
            data: { missingTemplates: [], newClientName: 'Cliente Test 3' }
        });
        createCamionMutation.mockResolvedValue({ id: 999, patente: 'NEW123' });
        createAcopladoMutation.mockResolvedValue({ id: 888, patente: 'TRL123' });
        createChoferMutation.mockResolvedValue({ id: 777, dni: '99887766' });
        createTransportistaMutation.mockResolvedValue({ id: 555, razonSocial: 'Nueva Empresa' });
        registerChoferWizard.mockResolvedValue({ tempPassword: 'PASS123' });
        registerTransportistaWizard.mockResolvedValue({ tempPassword: 'PASS456' });
    });

    it('cambia chofer correctamente', async () => {
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

        // Encontrar select de chofer (primer select)
        const selectChofer = document.querySelector('select');
        expect(selectChofer).toBeInTheDocument();

        // Cambiar valor del select al chofer con ID 11
        fireEvent.change(selectChofer as Element, { target: { value: '11' } });

        // Click en botón Cambiar del chofer (primer botón Cambiar)
        const botonesCambiar = screen.getAllByText(/Cambiar/i);
        fireEvent.click(botonesCambiar[0]);

        await waitFor(() => {
            expect(attachMutation).toHaveBeenCalledWith({
                id: 1,
                driverDni: '87654321'
            });
        });
    });

    it('cambia camión correctamente', async () => {
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

        // Encontrar select de camión (segundo select)
        const selects = document.querySelectorAll('select');
        fireEvent.change(selects[1], { target: { value: '21' } });

        // Click en botón Cambiar del camión (segundo botón)
        const botonesCambiar = screen.getAllByText(/Cambiar/i);
        fireEvent.click(botonesCambiar[1]);

        await waitFor(() => {
            expect(attachMutation).toHaveBeenCalledWith({
                id: 1,
                truckPlate: 'XYZ789'
            });
        });
    });

    it('quita acoplado cuando se selecciona opción vacía', async () => {
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

        // Seleccionar "Sin acoplado" (valor vacío) en el tercer select
        const selects = document.querySelectorAll('select');
        fireEvent.change(selects[2], { target: { value: '' } });

        // Click en botón Cambiar del acoplado (tercer botón)
        const botonesCambiar = screen.getAllByText(/Cambiar/i);
        fireEvent.click(botonesCambiar[2]);

        await waitFor(() => {
            expect(updateMutation).toHaveBeenCalledWith({
                id: 1,
                trailerId: 0
            });
        });
    });

    it('cambia acoplado correctamente', async () => {
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

        const selects = document.querySelectorAll('select');
        // Cambiar a un acoplado diferente (ID 31)
        fireEvent.change(selects[2], { target: { value: '31' } });

        const botonesCambiar = screen.getAllByText(/Cambiar/i);
        fireEvent.click(botonesCambiar[2]);

        await waitFor(() => {
            expect(attachMutation).toHaveBeenCalledWith({
                id: 1,
                trailerPlate: 'GHI789'
            });
        });
    });

    it('cambia empresa transportista correctamente', async () => {
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

        const selects = document.querySelectorAll('select');
        // Cambiar empresa (cuarto select) a ID 6
        fireEvent.change(selects[3], { target: { value: '6' } });

        const botonesCambiar = screen.getAllByText(/Cambiar/i);
        fireEvent.click(botonesCambiar[3]);

        await waitFor(() => {
            expect(updateMutation).toHaveBeenCalledWith({
                id: 1,
                empresaTransportistaId: 6
            });
        });
    });

});

describe('EditarEquipoPage - Gestión de Clientes', () => {
    let store: any;
    let confirmMock: jest.Mock;

    beforeEach(() => {
        store = createMockStore({ user: { role: 'ADMIN_INTERNO' } });
        confirmMock = jest.fn().mockResolvedValue(true);
        jest.clearAllMocks();

        associateMutation.mockResolvedValue({});
        removeMutation.mockResolvedValue({ archivedDocuments: 2 });
        checkMissingDocs.mockResolvedValue({
            data: { missingTemplates: [], newClientName: 'Cliente Test 3' }
        });
    });

    it('renderiza sección de clientes', async () => {
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

        // Verificar que hay botones de quitar
        const quitarBtns = screen.getAllByText(/Quitar/i);
        expect(quitarBtns.length).toBeGreaterThan(0);
    });

    it('muestra botón agregar cliente', async () => {
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
            expect(screen.getByText(/Agregar Cliente/i)).toBeInTheDocument();
        });
    });
});

describe('EditarEquipoPage - Validaciones de Inputs', () => {
    let store: any;
    let confirmMock: jest.Mock;

    beforeEach(() => {
        store = createMockStore({ user: { role: 'ADMIN_INTERNO' } });
        confirmMock = jest.fn().mockResolvedValue(true);
        jest.clearAllMocks();

        createCamionMutation.mockResolvedValue({ id: 999, patente: 'NEW123' });
        createAcopladoMutation.mockResolvedValue({ id: 888, patente: 'TRL123' });
        createChoferMutation.mockResolvedValue({ id: 777, dni: '99887766' });
        createTransportistaMutation.mockResolvedValue({ id: 555, razonSocial: 'Nueva Empresa' });
    });

    it('convierte patente de camión a mayúsculas en modal', async () => {
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

        // Abrir modal de nuevo camión
        const camionButton = document.querySelector('button[title="Crear nuevo camión"]');
        fireEvent.click(camionButton as Element);

        await waitFor(() => {
            expect(screen.getByText(/Crear Nuevo Camión/i)).toBeInTheDocument();
        });

        // Escribir en minúsculas
        const patenteInput = screen.getByPlaceholderText(/ABC123 o AB123CD/i);
        await user.type(patenteInput, 'abc123');

        // Verificar que se convierte a mayúsculas
        await waitFor(() => {
            expect(patenteInput).toHaveValue('ABC123');
        });
    });

    it('convierte patente de acoplado a mayúsculas en modal', async () => {
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

        // Abrir modal de nuevo acoplado
        const acopladoButton = document.querySelector('button[title="Crear nuevo acoplado"]');
        fireEvent.click(acopladoButton as Element);

        await waitFor(() => {
            expect(screen.getByText(/Crear Nuevo Acoplado/i)).toBeInTheDocument();
        });

        // Escribir en minúsculas
        const patenteInputs = screen.getAllByPlaceholderText(/ABC123 o AB123CD/i);
        const patenteInput = patenteInputs.find(input => input.closest('.fixed')) || patenteInputs[1];
        await user.type(patenteInput, 'def456');

        // Verificar que se convierte a mayúsculas
        await waitFor(() => {
            expect(patenteInput).toHaveValue('DEF456');
        });
    });

    it('solo acepta números en DNI de chofer', async () => {
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

        // Abrir modal de nuevo chofer
        const choferButton = document.querySelector('button[title="Crear nuevo chofer"]');
        fireEvent.click(choferButton as Element);

        await waitFor(() => {
            expect(screen.getByText(/Crear Nuevo Chofer/i)).toBeInTheDocument();
        });

        // Escribir letras y números
        const dniInput = screen.getByPlaceholderText('12345678');
        await user.type(dniInput, 'abc12345');

        // Verificar que solo quedan números
        await waitFor(() => {
            expect(dniInput).toHaveValue('12345');
        });
    });

    it('solo acepta números en CUIT de transportista', async () => {
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

        // Abrir modal de nueva empresa
        const transportistaButton = document.querySelector('button[title="Crear nueva empresa transportista"]');
        fireEvent.click(transportistaButton as Element);

        await waitFor(() => {
            expect(screen.getByText(/Crear Nueva Empresa Transportista/i)).toBeInTheDocument();
        });

        // Escribir letras y números
        const cuitInput = screen.getByPlaceholderText('20123456789');
        await user.type(cuitInput, 'abc20123456789');

        // Verificar que solo quedan números
        await waitFor(() => {
            expect(cuitInput).toHaveValue('20123456789');
        });
    });
});
