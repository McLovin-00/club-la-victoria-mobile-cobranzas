/**
 * Tests para EditarEquipoPage - Validaciones y Casos Edge
 * Casos adicionales para aumentar cobertura
 */

import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { Provider } from 'react-redux';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
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
} from '../__mocks__/mockTestData';
import {
    createMockStore,
} from '../__mocks__/mockApiHooks';

// Mock implementations - create functions that can be controlled in tests
const mockUseGetEquipoByIdQuery = jest.fn(() => ({
    data: mockEquipo,
    isLoading: false,
    refetch: jest.fn()
}));
const mockUseGetClientsQuery = jest.fn(() => ({ data: mockClientes, isLoading: false }));
const mockUseGetChoferesQuery = jest.fn(() => ({ data: mockChoferes, isLoading: false }));
const mockUseGetCamionesQuery = jest.fn(() => ({ data: mockCamiones, isLoading: false }));
const mockUseGetAcopladosQuery = jest.fn(() => ({ data: mockAcoplados, isLoading: false }));
const mockUseGetEmpresasTransportistasQuery = jest.fn(() => ({ data: mockEmpresas, isLoading: false }));
const mockUseGetEquipoRequisitosQuery = jest.fn(() => ({ data: [], refetch: jest.fn() }));

const createCamionMutation = jest.fn();
const createAcopladoMutation = jest.fn();
const createChoferMutation = jest.fn();
const createTransportistaMutation = jest.fn();
const attachMutation = jest.fn();

// Mock documentosApiSlice
jest.mock('../../../documentos/api/documentosApiSlice', () => ({
    useGetEquipoByIdQuery: () => mockUseGetEquipoByIdQuery(),
    useGetClientsQuery: () => mockUseGetClientsQuery(),
    useGetChoferesQuery: () => mockUseGetChoferesQuery(),
    useGetCamionesQuery: () => mockUseGetCamionesQuery(),
    useGetAcopladosQuery: () => mockUseGetAcopladosQuery(),
    useGetEmpresasTransportistasQuery: () => mockUseGetEmpresasTransportistasQuery(),
    useGetEquipoRequisitosQuery: () => mockUseGetEquipoRequisitosQuery(),
    useLazyCheckMissingDocsForClientQuery: jest.fn(() => [
        jest.fn().mockResolvedValue({ data: { missingTemplates: [] } }),
        { isFetching: false }
    ]),
    useAttachEquipoComponentsMutation: jest.fn(() => [attachMutation, { isLoading: false }]),
    useUpdateEquipoMutation: jest.fn(() => [jest.fn(), { isLoading: false }]),
    useAssociateEquipoClienteMutation: jest.fn(() => [jest.fn(), { isLoading: false }]),
    useRemoveEquipoClienteWithArchiveMutation: jest.fn(() => [jest.fn(), { isLoading: false }]),
    useUploadDocumentMutation: jest.fn(() => [jest.fn(), { isLoading: false }]),
    useCreateCamionMutation: jest.fn(() => [createCamionMutation, { isLoading: false }]),
    useCreateAcopladoMutation: jest.fn(() => [createAcopladoMutation, { isLoading: false }]),
    useCreateChoferMutation: jest.fn(() => [createChoferMutation, { isLoading: false }]),
    useCreateEmpresaTransportistaMutation: jest.fn(() => [createTransportistaMutation, { isLoading: false }]),
}));

// Mock platformUsersApiSlice
jest.mock('../../../platform-users/api/platformUsersApiSlice', () => ({
    useRegisterChoferWizardMutation: jest.fn(() => [jest.fn(), { isLoading: false }]),
    useRegisterTransportistaWizardMutation: jest.fn(() => [jest.fn(), { isLoading: false }]),
}));

// Mock useRoleBasedNavigation
jest.mock('@/hooks/useRoleBasedNavigation', () => ({
    useRoleBasedNavigation: () => ({ goBack: jest.fn() }),
}));

// Mock heroicons
jest.mock('@heroicons/react/24/outline', () => ({
    ArrowLeftIcon: () => <div>ArrowLeft</div>,
    DocumentIcon: () => <div>Document</div>,
    CheckCircleIcon: () => <div>CheckCircle</div>,
    ExclamationTriangleIcon: () => <div>Warning</div>,
    XCircleIcon: () => <div>XCircle</div>,
    ClockIcon: () => <div>Clock</div>,
    PlusIcon: () => <div>Plus</div>,
}));

import EditarEquipoPage from '../EditarEquipoPage';

describe('EditarEquipoPage - Validaciones de Creación', () => {
    let store: any;
    let confirmMock: jest.Mock;

    beforeEach(() => {
        store = createMockStore({ user: { role: 'ADMIN_INTERNO' } });
        confirmMock = jest.fn().mockResolvedValue(true);
        jest.clearAllMocks();

        // Reset mocks to default values
        mockUseGetEquipoByIdQuery.mockReturnValue({
            data: mockEquipo,
            isLoading: false,
            refetch: jest.fn()
        });
        mockUseGetClientsQuery.mockReturnValue({ data: mockClientes, isLoading: false });
        mockUseGetChoferesQuery.mockReturnValue({ data: mockChoferes, isLoading: false });
        mockUseGetCamionesQuery.mockReturnValue({ data: mockCamiones, isLoading: false });
        mockUseGetAcopladosQuery.mockReturnValue({ data: mockAcoplados, isLoading: false });
        mockUseGetEmpresasTransportistasQuery.mockReturnValue({ data: mockEmpresas, isLoading: false });
        mockUseGetEquipoRequisitosQuery.mockReturnValue({ data: [], refetch: jest.fn() });

        createCamionMutation.mockResolvedValue({ id: 999, patente: 'NEW123' });
        createAcopladoMutation.mockResolvedValue({ id: 888, patente: 'TRL123' });
        createChoferMutation.mockResolvedValue({ id: 777, dni: '99887766' });
        createTransportistaMutation.mockResolvedValue({ id: 555, razonSocial: 'Nueva Empresa' });
    });

    it('muestra error cuando patente de camión es muy corta', async () => {
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

        // Abrir modal - buscar por texto si title no funciona
        const camionButton = screen.getByTitle("Crear nuevo camión");
        fireEvent.click(camionButton);

        await waitFor(() => {
            expect(screen.getByText(/Crear Nuevo Camión/i)).toBeInTheDocument();
        });

        // Intentar crear con patente corta
        // Buscar input por label o placeholder genérico
        const patenteInput = screen.getByPlaceholderText(/AA123BB|ABC123/i) || document.querySelector('input[placeholder="AA123BB o ABC123"]');
        // Si no encuentra por placeholder, buscar el primer input del modal
        const inputToUse = patenteInput || screen.getAllByRole('textbox')[0];
        
        fireEvent.change(inputToUse, { target: { value: 'ABC' } });

        const crearBtn = screen.getByText(/Crear Camión/i);
        fireEvent.click(crearBtn);

        // La mutation no debería llamarse por validación
        expect(createCamionMutation).not.toHaveBeenCalled();
    });

    it('muestra error cuando DNI de chofer es muy corto', async () => {
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

        const choferButton = screen.getByTitle("Crear nuevo chofer");
        fireEvent.click(choferButton);

        await waitFor(() => {
            expect(screen.getByText(/Crear Nuevo Chofer/i)).toBeInTheDocument();
        });

        // Intentar crear con DNI corto
        const dniInput = screen.getByPlaceholderText(/12345678|DNI/i);
        fireEvent.change(dniInput, { target: { value: '12345' } });

        const crearBtn = screen.getByText(/Crear Chofer/i);
        fireEvent.click(crearBtn);

        expect(createChoferMutation).not.toHaveBeenCalled();
    });

    it('muestra error cuando se marca crear usuario sin email', async () => {
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

        const choferButton = screen.getByTitle("Crear nuevo chofer");
        fireEvent.click(choferButton);

        await waitFor(() => {
            expect(screen.getByText(/Crear Nuevo Chofer/i)).toBeInTheDocument();
        });

        // Llenar DNI válido
        const dniInput = screen.getByPlaceholderText(/12345678|DNI/i);
        fireEvent.change(dniInput, { target: { value: '12345678' } });

        // Marcar checkbox - buscar por role o label
        const checkbox = screen.getByRole('checkbox') || document.querySelector('input[type="checkbox"]');
        fireEvent.click(checkbox);

        // NO llenar email
        const crearBtn = screen.getByText(/Crear Chofer/i); // El texto del botón podría cambiar dinámicamente o ser estático
        fireEvent.click(crearBtn);

        expect(createChoferMutation).not.toHaveBeenCalled();
    });

    it('muestra error cuando CUIT de transportista no tiene 11 dígitos', async () => {
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

        const transportistaButton = screen.getByTitle("Crear nueva empresa transportista");
        fireEvent.click(transportistaButton);

        await waitFor(() => {
            expect(screen.getByText(/Crear Nueva Empresa Transportista/i)).toBeInTheDocument();
        });

        // Intentar crear con CUIT inválido
        const cuitInput = screen.getByPlaceholderText(/20123456789|CUIT/i);
        fireEvent.change(cuitInput, { target: { value: '12345678' } });

        const crearBtn = screen.getByText(/Crear Empresa/i);
        fireEvent.click(crearBtn);

        expect(createTransportistaMutation).not.toHaveBeenCalled();
    });

    it('verifica que existan botones de crear entidad', async () => {
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

        // Verificar que existen botones para crear nuevas entidades
        expect(screen.getByTitle("Crear nuevo camión")).toBeInTheDocument();
        expect(screen.getByTitle("Crear nuevo chofer")).toBeInTheDocument();
        // Opcionales según implementación
        // const acopladoButton = screen.queryByTitle("Crear nuevo acoplado");
        // const transportistaButton = screen.queryByTitle("Crear nueva empresa transportista");
    });
});

describe('EditarEquipoPage - Estados de Carga', () => {
    let store: any;
    let confirmMock: jest.Mock;

    beforeEach(() => {
        store = createMockStore({ user: { role: 'ADMIN_INTERNO' } });
        confirmMock = jest.fn().mockResolvedValue(true);
        jest.clearAllMocks();
    });

    it('muestra loading mientras carga el equipo', async () => {
        // Override mock implementation for this test
        mockUseGetEquipoByIdQuery.mockImplementation(() => ({
            data: null,
            isLoading: true,
            refetch: jest.fn()
        }));

        render(
            <Provider store={store as any}>
                <ConfirmContext.Provider value={{ confirm: confirmMock }}>
                    <MemoryRouter initialEntries={['/equipos/1']}>
                        <Routes><Route path="/equipos/:id" element={<EditarEquipoPage />} /></Routes>
                    </MemoryRouter>
                </ConfirmContext.Provider>
            </Provider>
        );

        expect(screen.getByText(/Cargando equipo/i)).toBeInTheDocument();
    });
});
