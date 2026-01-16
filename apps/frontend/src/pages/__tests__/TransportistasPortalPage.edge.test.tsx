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
});
