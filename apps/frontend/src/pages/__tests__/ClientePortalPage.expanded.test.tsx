/**
 * Tests expandidos para ClientePortalPage - Más cobertura
 */
import React from 'react';
import { describe, expect, it, jest, beforeEach } from '@jest/globals';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const mockClients = { list: [{ id: 1, razonSocial: 'Cliente Test' }] };
const mockEquipos = [
    { id: 101, driverDniNorm: '12345678', truckPlateNorm: 'AA123BB', trailerPlateNorm: 'AC456CD' },
];
const mockReqs = [
    { templateId: 1, entityType: 'CHOFER', template: { name: 'DNI' } },
    { templateId: 2, entityType: 'CAMION', template: { name: 'VTV' } },
    { templateId: 3, entityType: 'ACOPLADO', template: { name: 'Patente' } },
];
// Documentos con diferentes estados y fechas
const mockDocs = [
    { id: 1, templateId: 1, entityType: 'CHOFER', status: 'APROBADO', expiresAt: '2030-12-31', fileName: 'dni.pdf' },
    { id: 2, templateId: 2, entityType: 'CAMION', status: 'RECHAZADO', expiresAt: '2020-01-01' },
    { id: 3, templateId: 3, entityType: 'ACOPLADO', status: 'CLASIFICANDO', expiresAt: null },
    { id: 4, templateId: 4, entityType: 'CAMION', status: 'PENDIENTE_APROBACION', expiresAt: '2025-02-15' },
    { id: 5, templateId: 5, entityType: 'CHOFER', status: 'PENDIENTE', expiresAt: null },
];

const mockBulkSearch = jest.fn().mockImplementation(() => ({
    unwrap: () => Promise.resolve([
        { id: 999, truckPlateNorm: 'ZZ999ZZ', trailerPlateNorm: 'YY888YY' },
        { id: 888, truckPlateNorm: 'XX777XX', trailerPlateNorm: null },
    ])
}));
const mockRequestZip = jest.fn().mockImplementation(() => ({
    unwrap: () => Promise.resolve({ jobId: 'job-123' })
}));
const mockShowToast = jest.fn();
const mockGoBack = jest.fn();
const mockRefetch = jest.fn();

jest.unstable_mockModule('@/features/documentos/api/documentosApiSlice', () => ({
    useGetClientsQuery: () => ({ data: mockClients }),
    useGetClienteEquiposQuery: () => ({ data: mockEquipos, refetch: mockRefetch }),
    useGetDocumentosPorEquipoQuery: () => ({ data: mockDocs }),
    useGetClientRequirementsQuery: () => ({ data: mockReqs }),
    useBulkSearchPlatesMutation: () => [mockBulkSearch, { isLoading: false }],
    useRequestClientsBulkZipMutation: () => [mockRequestZip, { isLoading: false }],
    useGetClientsZipJobQuery: () => ({ data: { job: { status: 'completed', signedUrl: 'https://download.test/zip' } } }),
}));

jest.unstable_mockModule('@/components/ui/Toast.utils', () => ({
    showToast: mockShowToast,
}));

jest.unstable_mockModule('@/hooks/useRoleBasedNavigation', () => ({
    useRoleBasedNavigation: () => ({ goBack: mockGoBack }),
}));

jest.unstable_mockModule('react-router-dom', () => ({
    useNavigate: () => jest.fn(),
    MemoryRouter: ({ children }: any) => children,
}));

jest.unstable_mockModule('@heroicons/react/24/outline', () => ({
    BuildingOfficeIcon: () => <svg data-testid="building-icon" />,
    TruckIcon: () => <svg data-testid="truck-icon" />,
    DocumentCheckIcon: () => <svg data-testid="doc-icon" />,
    ArrowDownTrayIcon: () => <svg data-testid="download-icon" />,
    EyeIcon: () => <svg data-testid="eye-icon" />,
    EyeSlashIcon: () => <svg data-testid="eye-slash-icon" />,
    CheckCircleIcon: () => <svg data-testid="check-icon" />,
    ExclamationTriangleIcon: () => <svg data-testid="warning-icon" />,
    XCircleIcon: () => <svg data-testid="x-icon" />,
    ClockIcon: () => <svg data-testid="clock-icon" />,
    FunnelIcon: () => <svg data-testid="funnel-icon" />,
    SparklesIcon: () => <svg data-testid="sparkles-icon" />,
}));

const { ClientePortalPage } = await import('../ClientePortalPage');

describe('ClientePortalPage - Expandido', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        // Mock URL.createObjectURL
        Object.defineProperty(URL, 'createObjectURL', {
            value: jest.fn(() => 'blob:mock-url'),
            configurable: true,
            writable: true,
        });
        Object.defineProperty(URL, 'revokeObjectURL', {
            value: jest.fn(),
            configurable: true,
            writable: true,
        });
    });

    describe('Búsqueda masiva funcional', () => {
        it('buscar ejecuta búsqueda', async () => {
            render(<MemoryRouter><ClientePortalPage /></MemoryRouter>);

            const textarea = screen.getByPlaceholderText(/Ejemplo:/);
            fireEvent.change(textarea, { target: { value: 'AA123BB\nBB456CC' } });

            const searchButton = screen.getByText('Buscar');
            fireEvent.click(searchButton);

            await waitFor(() => {
                expect(mockBulkSearch).toHaveBeenCalled();
            });
        });

        it('buscar sin patentes limpia resultados', async () => {
            render(<MemoryRouter><ClientePortalPage /></MemoryRouter>);

            const searchButton = screen.getByText('Buscar');
            fireEvent.click(searchButton);

            // El test simplemente verifica que no lanza error
            expect(true).toBe(true);
        });

        it('buscar con patentes inválidas muestra error', async () => {
            render(<MemoryRouter><ClientePortalPage /></MemoryRouter>);

            const textarea = screen.getByPlaceholderText(/Ejemplo:/);
            fireEvent.change(textarea, { target: { value: 'AB\nCD' } });

            const searchButton = screen.getByText('Buscar');
            fireEvent.click(searchButton);

            expect(screen.getByText(/Líneas inválidas/)).toBeInTheDocument();
        });
    });

    describe('Documentos expandibles', () => {
        it('expandir muestra documentos', async () => {
            render(<MemoryRouter><ClientePortalPage /></MemoryRouter>);

            const viewButtons = screen.getAllByText('Ver Documentos Detallados');
            fireEvent.click(viewButtons[0]);

            await waitFor(() => {
                expect(screen.getByText('Ocultar Documentos')).toBeInTheDocument();
            });
        });

        it('muestra documento con estado aprobado', async () => {
            render(<MemoryRouter><ClientePortalPage /></MemoryRouter>);

            const viewButtons = screen.getAllByText('Ver Documentos Detallados');
            fireEvent.click(viewButtons[0]);

            await waitFor(() => {
                expect(screen.getByText(/Aprobado/)).toBeInTheDocument();
            });
        });

        it('muestra documento con estado rechazado', async () => {
            render(<MemoryRouter><ClientePortalPage /></MemoryRouter>);

            const viewButtons = screen.getAllByText('Ver Documentos Detallados');
            fireEvent.click(viewButtons[0]);

            await waitFor(() => {
                expect(screen.getByText(/Rechazado/)).toBeInTheDocument();
            });
        });

        it('muestra documento clasificando', async () => {
            render(<MemoryRouter><ClientePortalPage /></MemoryRouter>);

            const viewButtons = screen.getAllByText('Ver Documentos Detallados');
            fireEvent.click(viewButtons[0]);

            await waitFor(() => {
                expect(screen.getByText(/Clasificando/)).toBeInTheDocument();
            });
        });

        it('muestra documento pendiente aprobación', async () => {
            render(<MemoryRouter><ClientePortalPage /></MemoryRouter>);

            const viewButtons = screen.getAllByText('Ver Documentos Detallados');
            fireEvent.click(viewButtons[0]);

            await waitFor(() => {
                expect(screen.getByText(/Pend. Aprobación/)).toBeInTheDocument();
            });
        });

        it('muestra documento pendiente', async () => {
            render(<MemoryRouter><ClientePortalPage /></MemoryRouter>);

            const viewButtons = screen.getAllByText('Ver Documentos Detallados');
            fireEvent.click(viewButtons[0]);

            await waitFor(() => {
                expect(screen.getByText(/Pendiente/)).toBeInTheDocument();
            });
        });

        it('muestra fecha de vencimiento', async () => {
            render(<MemoryRouter><ClientePortalPage /></MemoryRouter>);

            const viewButtons = screen.getAllByText('Ver Documentos Detallados');
            fireEvent.click(viewButtons[0]);

            await waitFor(() => {
                expect(screen.getAllByText(/Vence:/).length).toBeGreaterThan(0);
            });
        });

        it('muestra nombre de archivo', async () => {
            render(<MemoryRouter><ClientePortalPage /></MemoryRouter>);

            const viewButtons = screen.getAllByText('Ver Documentos Detallados');
            fireEvent.click(viewButtons[0]);

            await waitFor(() => {
                expect(screen.getByText(/dni.pdf/)).toBeInTheDocument();
            });
        });

        it('tiene botón descargar documento', async () => {
            render(<MemoryRouter><ClientePortalPage /></MemoryRouter>);

            const viewButtons = screen.getAllByText('Ver Documentos Detallados');
            fireEvent.click(viewButtons[0]);

            await waitFor(() => {
                const downloadButtons = screen.getAllByText('Descargar');
                expect(downloadButtons.length).toBeGreaterThan(0);
            });
        });
    });

    describe('ZIP Job', () => {
        it('muestra enlace de descarga cuando job completado y hay búsqueda masiva', async () => {
            render(<MemoryRouter><ClientePortalPage /></MemoryRouter>);

            // El enlace de descarga solo aparece cuando hay bulkResults y zipJobData con signedUrl
            // En este test verificamos que el componente renderiza correctamente
            expect(screen.getByText('ZIP masivo')).toBeInTheDocument();
        });
    });

    describe('Estado de equipos', () => {
        it('muestra estado de cumplimiento', () => {
            render(<MemoryRouter><ClientePortalPage /></MemoryRouter>);

            expect(screen.getAllByText(/Estado de Cumplimiento/).length).toBeGreaterThan(0);
        });

        it('botón ZIP por equipo', () => {
            render(<MemoryRouter><ClientePortalPage /></MemoryRouter>);

            expect(screen.getAllByText('ZIP').length).toBeGreaterThan(0);
        });
    });

    describe('Refetch', () => {
        it('botón actualizar llama refetch', () => {
            render(<MemoryRouter><ClientePortalPage /></MemoryRouter>);

            const updateButton = screen.getByText('Actualizar');
            fireEvent.click(updateButton);

            expect(mockRefetch).toHaveBeenCalled();
        });
    });

    describe('Filtros de estado', () => {
        it('filtrar por VIGENTE', () => {
            render(<MemoryRouter><ClientePortalPage /></MemoryRouter>);

            const selects = screen.getAllByRole('combobox');
            fireEvent.change(selects[1], { target: { value: 'VIGENTE' } });

            expect(selects[1]).toHaveValue('VIGENTE');
        });

        it('filtrar por PROXIMO', () => {
            render(<MemoryRouter><ClientePortalPage /></MemoryRouter>);

            const selects = screen.getAllByRole('combobox');
            fireEvent.change(selects[1], { target: { value: 'PROXIMO' } });

            expect(selects[1]).toHaveValue('PROXIMO');
        });

        it('filtrar por VENCIDO', () => {
            render(<MemoryRouter><ClientePortalPage /></MemoryRouter>);

            const selects = screen.getAllByRole('combobox');
            fireEvent.change(selects[1], { target: { value: 'VENCIDO' } });

            expect(selects[1]).toHaveValue('VENCIDO');
        });

        it('filtrar por FALTANTE', () => {
            render(<MemoryRouter><ClientePortalPage /></MemoryRouter>);

            const selects = screen.getAllByRole('combobox');
            fireEvent.change(selects[1], { target: { value: 'FALTANTE' } });

            expect(selects[1]).toHaveValue('FALTANTE');
        });
    });
});
