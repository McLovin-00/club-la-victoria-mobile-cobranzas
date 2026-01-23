/**
 * Tests de edge cases para TransportistasPortalPage refactorizados para ESM y robustez
 */
import React from 'react';
import { describe, expect, it, jest, beforeEach } from '@jest/globals';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// Mocks de estado
const dadoresResp = { list: [{ id: 1, razonSocial: 'Dador X' }] };
const defaultsResp = { defaultDadorId: 1 };
const equiposResp = [{ id: 101, driverDniNorm: '12345678', truckPlateNorm: 'AA123BB', trailerPlateNorm: null }];

const mockCreateMinimal = jest.fn().mockResolvedValue({});
const mockUploadBatch = jest.fn().mockResolvedValue({ jobId: 'job-123' });
const mockSearch = jest.fn().mockResolvedValue({ data: [{ id: 999, driverDniNorm: '99999999', truckPlateNorm: 'ZZ999ZZ' }] });
const mockShowToast = jest.fn();

// Mocks de módulos
jest.unstable_mockModule('../../features/documentos/api/documentosApiSlice', () => ({
    useGetDadoresQuery: () => ({ data: dadoresResp, isLoading: false }),
    useGetDefaultsQuery: () => ({ data: defaultsResp, isLoading: false }),
    useCreateEquipoMinimalMutation: () => [mockCreateMinimal, { isLoading: false }],
    useUploadBatchDocsTransportistasMutation: () => [mockUploadBatch, { isLoading: false }],
    useGetJobStatusQuery: () => ({ data: null }),
    useGetMisEquiposQuery: () => ({ data: equiposResp, isLoading: false }),
    useTransportistasSearchMutation: () => [mockSearch, { isLoading: false }],
}));

jest.unstable_mockModule('../../components/transportistas/DashboardCumplimiento', () => ({
    DashboardCumplimiento: () => <div data-testid="dashboard">Dashboard</div>,
}));

jest.unstable_mockModule('../../components/transportistas/PerfilMobile', () => ({
    PerfilMobile: () => <div data-testid="perfil">Perfil</div>,
}));

jest.unstable_mockModule('../../components/transportistas/CalendarioInteligente', () => ({
    CalendarioInteligente: () => <div data-testid="calendario">Calendario</div>,
}));

jest.unstable_mockModule('../../components/ui/Toast.utils', () => ({
    showToast: mockShowToast,
}));

// Import dinámico después de los mocks
const { TransportistasPortalPage } = await import('../TransportistasPortalPage');

describe('TransportistasPortalPage - Edge Cases', () => {
    beforeEach(() => {
        jest.clearAllMocks();

        window.scrollTo = jest.fn() as any;
        window.open = jest.fn() as any;
        HTMLElement.prototype.scrollTo = jest.fn() as any;
        HTMLElement.prototype.scrollIntoView = jest.fn() as any;
    });

    const renderPage = () => render(
        <MemoryRouter>
            <TransportistasPortalPage />
        </MemoryRouter>
    );

    it('debe navegar a la pestaña de equipos y mostrar lista', async () => {
        renderPage();

        const tabBtn = screen.getByText(/Equipos/i);
        fireEvent.click(tabBtn);

        expect(await screen.findByText(/Equipo #101/)).toBeInTheDocument();
    });

    it('permite gestionar teléfonos en la pestaña de registro', async () => {
        renderPage();

        // Ir a Registro
        const registroTab = screen.getByText(/Registro/i);
        fireEvent.click(registroTab);

        const addButton = await screen.findByText(/Agregar Teléfono/i);

        // Agregar 2 más (total 3)
        fireEvent.click(addButton);
        fireEvent.click(addButton);

        let phoneInputs = screen.getAllByPlaceholderText('+54911234567');
        expect(phoneInputs.length).toBe(3);

        // El botón Agregar debe estar deshabilitado al llegar a 3
        expect(addButton).toBeDisabled();

        // Eliminar uno
        const removeButtons = screen.getAllByRole('button').filter(btn =>
            btn.className.includes('border-red-200')
        );
        fireEvent.click(removeButtons[0]);

        phoneInputs = screen.getAllByPlaceholderText('+54911234567');
        expect(phoneInputs.length).toBe(2);
    });

    it('permite crear equipo desde el formulario de registro', async () => {
        renderPage();

        fireEvent.click(screen.getByText(/Registro/i));

        const dniInput = await screen.findByPlaceholderText('Ej: 12345678');
        const tractorInput = screen.getByPlaceholderText('AA123BB');

        fireEvent.change(dniInput, { target: { value: '12345678' } });
        fireEvent.change(tractorInput, { target: { value: 'AA123BB' } });

        const createBtn = screen.getByText(/¡Crear Equipo!/i);
        fireEvent.click(createBtn);

        await waitFor(() => {
            expect(mockCreateMinimal).toHaveBeenCalled();
        });
    });

    it('maneja descarga de documentos abre una nueva ventana', async () => {
        renderPage();

        fireEvent.click(screen.getByText(/Equipos/i));

        const downloadBtn = await screen.findByText(/Descargar Documentos/i);
        fireEvent.click(downloadBtn);

        expect(window.open).toHaveBeenCalledWith(
            expect.stringContaining('/api/docs/clients/equipos/101/zip'),
            '_blank'
        );
    });

    describe('Tabs navigation', () => {
        it('navega a la pestaña Dashboard', async () => {
            renderPage();

            const dashboardTab = screen.getByText(/Panel/i);
            fireEvent.click(dashboardTab);

            expect(await screen.findByTestId('dashboard')).toBeInTheDocument();
        });

        it('navega a la pestaña Documentos', async () => {
            renderPage();

            const docsTab = screen.getByText(/Docs/i);
            fireEvent.click(docsTab);

            // La pestaña de documentos debería mostrar su contenido
            expect(docsTab).toHaveClass('bg-background');
        });

        it('navega a la pestaña Calendario', async () => {
            renderPage();

            const calendarioTab = screen.getByText(/Calendario/i);
            fireEvent.click(calendarioTab);

            expect(await screen.findByTestId('calendario')).toBeInTheDocument();
        });

        it('navega a la pestaña Perfil', async () => {
            renderPage();

            const perfilTab = screen.getByText(/Perfil/i);
            fireEvent.click(perfilTab);

            expect(await screen.findByTestId('perfil')).toBeInTheDocument();
        });
    });

    describe('Búsqueda de equipos', () => {
        it('permite buscar por DNI', async () => {
            renderPage();

            fireEvent.click(screen.getByText(/Equipos/i));

            const dniInput = await screen.findByPlaceholderText(/DNI/i);
            fireEvent.change(dniInput, { target: { value: '12345678' } });

            const searchBtn = screen.getByText(/Buscar/i);
            fireEvent.click(searchBtn);

            await waitFor(() => {
                expect(mockSearch).toHaveBeenCalled();
            });
        });

        it('permite buscar por patente', async () => {
            renderPage();

            fireEvent.click(screen.getByText(/Equipos/i));

            const patenteInput = await screen.findByPlaceholderText(/Patente/i);
            fireEvent.change(patenteInput, { target: { value: 'AA123BB' } });

            const searchBtn = screen.getByText(/Buscar/i);
            fireEvent.click(searchBtn);

            await waitFor(() => {
                expect(mockSearch).toHaveBeenCalled();
            });
        });
    });

    describe('Validación de teléfonos', () => {
        it('oculta warning cuando teléfono cumple regex', async () => {
            renderPage();

            fireEvent.click(screen.getByText(/Registro/i));

            const phoneInput = await screen.findByPlaceholderText('+54911234567');
            fireEvent.change(phoneInput, { target: { value: '+54911223344' } });

            // No debería mostrar warning
            expect(screen.queryByText(/Formato inválido/i)).not.toBeInTheDocument();
        });
    });

    describe('Registro de equipo', () => {
        it('muestra botón de crear equipo', async () => {
            renderPage();

            fireEvent.click(screen.getByText(/Registro/i));

            const createBtn = await screen.findByText(/¡Crear Equipo!/i);
            expect(createBtn).toBeInTheDocument();
        });
    });

    describe('Gestión de teléfonos', () => {
        it('puede agregar hasta 3 teléfonos', async () => {
            renderPage();

            fireEvent.click(screen.getByText(/Registro/i));

            const addButton = await screen.findByText(/Agregar Teléfono/i);

            // Inicialmente hay 1 input
            let phoneInputs = screen.getAllByPlaceholderText('+54911234567');
            expect(phoneInputs.length).toBe(1);

            // Agregar 2 más
            fireEvent.click(addButton);
            fireEvent.click(addButton);

            phoneInputs = screen.getAllByPlaceholderText('+54911234567');
            expect(phoneInputs.length).toBe(3);

            // El botón debe estar deshabilitado
            expect(addButton).toBeDisabled();
        });

        it('puede remover teléfono', async () => {
            renderPage();

            fireEvent.click(screen.getByText(/Registro/i));

            const addButton = await screen.findByText(/Agregar Teléfono/i);

            // Agregar uno más
            fireEvent.click(addButton);

            // Debería haber botones de remover
            const removeButtons = screen.getAllByRole('button').filter(btn =>
                btn.className.includes('text-red-600') || btn.className.includes('border-red-200')
            );
            expect(removeButtons.length).toBeGreaterThan(0);
        });
    });

    describe('Equipos sin acoplado', () => {
        it('muestra equipo sin acoplado correctamente', async () => {
            renderPage();

            fireEvent.click(screen.getByText(/Equipos/i));

            // equiposResp tiene trailerPlateNorm: null
            expect(await screen.findByText(/AA123BB/)).toBeInTheDocument();
        });
    });

    describe('Registro - campos de entrada', () => {
        it('permite ingresar patente de acoplado', async () => {
            renderPage();

            fireEvent.click(screen.getByText(/Registro/i));

            const acopladoInput = await screen.findByPlaceholderText(/AC456CD/);
            fireEvent.change(acopladoInput, { target: { value: 'ZZ999ZZ' } });

            expect(acopladoInput).toHaveValue('ZZ999ZZ');
        });

        it('permite ingresar DNI del chofer', async () => {
            renderPage();

            fireEvent.click(screen.getByText(/Registro/i));

            const dniInput = await screen.findByPlaceholderText('Ej: 12345678');
            fireEvent.change(dniInput, { target: { value: '87654321' } });

            expect(dniInput).toHaveValue('87654321');
        });

        it('permite ingresar teléfono', async () => {
            renderPage();

            fireEvent.click(screen.getByText(/Registro/i));

            const phoneInput = await screen.findByPlaceholderText('+54911234567');
            fireEvent.change(phoneInput, { target: { value: '+5491199999999' } });

            expect(phoneInput).toHaveValue('+5491199999999');
        });
    });

    describe('Búsqueda - limpieza de filtros', () => {
        it('permite limpiar filtros de búsqueda', async () => {
            renderPage();

            fireEvent.click(screen.getByText(/Equipos/i));

            // Primero llenar un filtro
            const dniInput = await screen.findByPlaceholderText(/DNI/i);
            fireEvent.change(dniInput, { target: { value: '12345678' } });

            // Buscar botón de limpiar
            const cleanButtons = screen.getAllByRole('button');
            const cleanButton = cleanButtons.find(btn => btn.textContent?.includes('Limpiar'));

            if (cleanButton) {
                fireEvent.click(cleanButton);
                expect(dniInput).toHaveValue('');
            }
        });
    });

    describe('Tabs - scroll behavior', () => {
        it('asigna refs a tabs para scroll', async () => {
            renderPage();

            // Los tabs deberían tener sus clases activas/inactivas correctas
            const tabs = screen.getAllByRole('button').filter(btn =>
                btn.textContent?.match(/Panel|Registro|Docs|Equipos|Calendario|Perfil/)
            );

            expect(tabs.length).toBe(6);
        });
    });

    describe('Mis Equipos - dropdown de tipo de búsqueda', () => {
        it('muestra inputs de búsqueda por DNI y patente', async () => {
            renderPage();

            fireEvent.click(screen.getByText(/Equipos/i));

            // Buscar inputs de búsqueda
            const dniInput = await screen.findByPlaceholderText(/DNI/i);
            const patenteInput = await screen.findByPlaceholderText(/Patente/i);

            expect(dniInput).toBeInTheDocument();
            expect(patenteInput).toBeInTheDocument();
        });
    });
});
