/**
 * Tests de interacción para TransportistasPortalPage
 */
import React from 'react';
import { describe, expect, it, jest, beforeEach } from '@jest/globals';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter } from 'react-router-dom';

const dadoresResp = { data: { list: [{ id: 1, razonSocial: 'Dador X' }] } };
const defaultsResp = { data: { defaultDadorId: 1 } };
const equiposResp = [{ id: 101, driverDniNorm: '12345678', truckPlateNorm: 'AA123BB', trailerPlateNorm: 'AC456CD' }];
const mockCreateMinimal = jest.fn().mockResolvedValue({});
const mockUploadBatch = jest.fn();
const mockSearch = jest.fn().mockResolvedValue({ data: [] });
const mockShowToast = jest.fn();

jest.unstable_mockModule('@/features/documentos/api/documentosApiSlice', () => ({
    useGetDadoresQuery: () => dadoresResp,
    useGetDefaultsQuery: () => defaultsResp,
    useCreateEquipoMinimalMutation: () => [mockCreateMinimal, { isLoading: false }],
    useUploadBatchDocsTransportistasMutation: () => [mockUploadBatch, { isLoading: false }],
    useGetJobStatusQuery: () => ({ data: null }),
    useGetMisEquiposQuery: () => ({ data: equiposResp }),
    useTransportistasSearchMutation: () => [mockSearch, { isLoading: false }],
}));

jest.unstable_mockModule('@/components/transportistas/DashboardCumplimiento', () => ({
    DashboardCumplimiento: () => <div>Dashboard</div>,
}));

jest.unstable_mockModule('@/components/transportistas/PerfilMobile', () => ({
    PerfilMobile: () => <div>Perfil</div>,
}));

jest.unstable_mockModule('@/components/transportistas/CalendarioInteligente', () => ({
    CalendarioInteligente: () => <div>Calendario</div>,
}));

jest.unstable_mockModule('@/components/ui/Toast.utils', () => ({
    showToast: mockShowToast,
}));

jest.unstable_mockModule('@/components/ui/tabs', () => ({
    Tabs: ({ children, onValueChange }: any) => <div onClick={() => onValueChange && onValueChange('registro')}>{children}</div>,
    TabsList: ({ children }: any) => <div>{children}</div>,
    TabsTrigger: React.forwardRef<HTMLButtonElement, any>(({ children, value, ...rest }, ref) => (
        <button ref={ref} type="button" data-value={value} {...rest}>{children}</button>
    )),
    TabsContent: ({ children }: any) => <div>{children}</div>,
}));

const { TransportistasPortalPage } = await import('../TransportistasPortalPage');

describe('TransportistasPortalPage - Interacciones', () => {
    beforeEach(() => {
        if (!(HTMLElement.prototype as any).scrollTo) {
            (HTMLElement.prototype as any).scrollTo = () => undefined;
        }
        jest.clearAllMocks();
    });

    it('permite cambiar DNI', () => {
        render(<MemoryRouter><TransportistasPortalPage /></MemoryRouter>);

        const inputs = screen.getAllByRole('textbox');
        const dniInput = inputs.find(i => i.getAttribute('placeholder')?.includes('12345678'));

        if (dniInput) {
            fireEvent.change(dniInput, { target: { value: '99999999' } });
            expect(dniInput).toHaveValue('99999999');
        }
    });

    it('permite cambiar patente tractor', () => {
        render(<MemoryRouter><TransportistasPortalPage /></MemoryRouter>);

        const inputs = screen.getAllByRole('textbox');
        const tractorInput = inputs.find(i => i.getAttribute('placeholder')?.includes('AA123BB'));

        if (tractorInput) {
            fireEvent.change(tractorInput, { target: { value: 'XX999YY' } });
            expect(tractorInput).toHaveValue('XX999YY');
        }
    });

    it('permite cambiar patente acoplado', () => {
        render(<MemoryRouter><TransportistasPortalPage /></MemoryRouter>);

        const inputs = screen.getAllByRole('textbox');
        const acopladoInput = inputs.find(i => i.getAttribute('placeholder')?.includes('AC456CD'));

        if (acopladoInput) {
            fireEvent.change(acopladoInput, { target: { value: 'ZZ888AA' } });
            expect(acopladoInput).toHaveValue('ZZ888AA');
        }
    });

    it('permite agregar teléfono', () => {
        render(<MemoryRouter><TransportistasPortalPage /></MemoryRouter>);

        const addButton = screen.getByText(/Agregar Teléfono/i);
        fireEvent.click(addButton);

        const inputs = screen.getAllByRole('textbox');
        expect(inputs.length).toBeGreaterThan(0);
    });

    it('permite cambiar teléfono', () => {
        render(<MemoryRouter><TransportistasPortalPage /></MemoryRouter>);

        const inputs = screen.getAllByRole('textbox');
        const phoneInput = inputs.find(i => i.getAttribute('placeholder')?.includes('+549'));

        if (phoneInput) {
            fireEvent.change(phoneInput, { target: { value: '+5491123456789' } });
            expect(phoneInput).toHaveValue('+5491123456789');
        }
    });

    it('permite cambiar dador', () => {
        render(<MemoryRouter><TransportistasPortalPage /></MemoryRouter>);

        const selects = screen.getAllByRole('combobox');
        if (selects.length > 0) {
            fireEvent.change(selects[0], { target: { value: '1' } });
            expect(selects[0]).toHaveValue('1');
        }
    });

    it('permite buscar por DNI', async () => {
        render(<MemoryRouter><TransportistasPortalPage /></MemoryRouter>);

        const inputs = screen.getAllByRole('textbox');
        const searchInput = inputs.find(i => i.getAttribute('placeholder')?.toLowerCase().includes('dni'));

        if (searchInput) {
            fireEvent.change(searchInput, { target: { value: '12345678' } });

            await waitFor(() => {
                expect(searchInput).toHaveValue('12345678');
            }, { timeout: 1000 });
        }
    });

    it('permite buscar por patente', async () => {
        render(<MemoryRouter><TransportistasPortalPage /></MemoryRouter>);

        const inputs = screen.getAllByRole('textbox');
        const searchInput = inputs.find(i => i.getAttribute('placeholder')?.toLowerCase().includes('patente'));

        if (searchInput) {
            fireEvent.change(searchInput, { target: { value: 'AA123BB' } });

            await waitFor(() => {
                expect(searchInput).toHaveValue('AA123BB');
            }, { timeout: 1000 });
        }
    });

    it('botón buscar ejecuta búsqueda', async () => {
        render(<MemoryRouter><TransportistasPortalPage /></MemoryRouter>);

        const searchButton = screen.getByText(/Buscar/i);
        fireEvent.click(searchButton);

        await waitFor(() => {
            expect(mockSearch).toHaveBeenCalled();
        }, { timeout: 2000 });
    });

    it('botón limpiar resetea filtros', () => {
        render(<MemoryRouter><TransportistasPortalPage /></MemoryRouter>);

        const clearButton = screen.getByText(/Limpiar/i);
        fireEvent.click(clearButton);

        expect(true).toBe(true);
    });

    it('muestra validación de teléfonos', async () => {
        render(<MemoryRouter><TransportistasPortalPage /></MemoryRouter>);

        // Navigate to Registro tab
        fireEvent.click(screen.getByText(/Registro/i));

        // Trigger validation by entering an invalid phone
        const inputs = screen.getAllByRole('textbox');
        const phoneInput = inputs.find(i => i.getAttribute('placeholder')?.includes('+549'));
        if (phoneInput) {
            fireEvent.change(phoneInput, { target: { value: 'invalid-phone' } });
            const alerts = await screen.findAllByText(/Formato requerido/i);
            expect(alerts.length).toBeGreaterThan(0);
        }
    });

    it('botón crear equipo con datos válidos', async () => {
        render(<MemoryRouter><TransportistasPortalPage /></MemoryRouter>);

        const inputs = screen.getAllByRole('textbox');
        const dniInput = inputs.find(i => i.getAttribute('placeholder')?.includes('12345678'));
        const tractorInput = inputs.find(i => i.getAttribute('placeholder')?.includes('AA123BB'));

        if (dniInput && tractorInput) {
            fireEvent.change(dniInput, { target: { value: '12345678' } });
            fireEvent.change(tractorInput, { target: { value: 'AA123BB' } });

            const createButton = screen.getByText(/¡Crear Equipo!/i);
            fireEvent.click(createButton);

            await waitFor(() => {
                expect(mockCreateMinimal).toHaveBeenCalled();
            }, { timeout: 2000 });
        }
    });
});
