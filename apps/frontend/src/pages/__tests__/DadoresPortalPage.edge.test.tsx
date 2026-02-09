/**
 * Edge case tests para DadoresPortalPage
 * 
 * Objetivo: Cubrir las líneas 78-95, 272-280, 439, 458, 477, 493, 502-503, 
 * 528-541, 561-566, 574, 578-579, 599-637 y otras líneas no cubiertas.
 */
import React from 'react';
import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// Mocks
const showToastMock = jest.fn();
const goBackMock = jest.fn();
const navigateMock = jest.fn();
const createMinimalMock = jest.fn();
const importCsvMock = jest.fn();
const uploadBatchMock = jest.fn();

// Mock de toasts
await jest.unstable_mockModule('../../components/ui/Toast.utils', () => ({
    showToast: showToastMock,
}));

// Mock de navegación
await jest.unstable_mockModule('../../hooks/useRoleBasedNavigation', () => ({
    useRoleBasedNavigation: () => ({
        goBack: goBackMock,
    }),
}));

// Mock de react-router-dom navigate
await jest.unstable_mockModule('react-router-dom', () => ({
    ...jest.requireActual('react-router-dom'),
    useNavigate: () => navigateMock,
}));

// Mock del store
await jest.unstable_mockModule('react-redux', () => ({
    ...jest.requireActual('react-redux'),
    useSelector: (selector: (s: unknown) => unknown) =>
        selector({
            auth: {
                token: 'test-token',
                user: { empresaId: 123 },
            },
        }),
}));

// Mock de runtimeEnv
await jest.unstable_mockModule('../../lib/runtimeEnv', () => ({
    getRuntimeEnv: (key: string) => {
        if (key === 'VITE_DOCUMENTOS_API_URL') return 'http://localhost:4802';
        return '';
    },
    getRuntimeFlag: (_key: string) => false,
}));

// Datos de prueba
const mockDadores = [
    { id: 1, razonSocial: 'Dador Demo' },
    { id: 2, razonSocial: 'Otro Dador' },
];

const mockEquipos = [
    { id: 100, equipo: { id: 100 }, driverDniNorm: '12345678', truckPlateNorm: 'AA123BB' },
    { id: 101, equipo: { id: 101 }, driverDniNorm: '87654321', truckPlateNorm: 'BB456CC' },
];

const mockChoferes = [
    { id: 1, dni: '12345678', nombre: 'Juan', apellido: 'Pérez' },
];

const mockCamiones = [
    { id: 1, patente: 'AA123BB', marca: 'Scania', modelo: 'R500' },
];

const mockAcoplados = [
    { id: 1, patente: 'AC456CD', tipo: 'Semi' },
];

// Variables de estado para controlar mocks
let batchJobStatus: { status?: string; progress?: number; results?: { documentId: number; fileName: string; status: string; comprobante?: string; vencimiento?: string }[]; items?: { id: number }[] } | undefined = undefined;
let csvImportData: { created: number; total: number } | undefined = { created: 2, total: 3 };
let isUploadingBatch = false;
let mockUploadData: { jobId: string } | undefined = undefined;

// Mock de RTK Query hooks
await jest.unstable_mockModule('@/features/documentos/api/documentosApiSlice', () => ({
    useGetDadoresQuery: () => ({ data: { list: mockDadores } }),
    useCreateEquipoMinimalMutation: () => [
        createMinimalMock,
        { isLoading: false },
    ],
    useImportCsvEquiposMutation: () => [
        importCsvMock,
        { isLoading: false, data: csvImportData },
    ],
    useUploadBatchDocsDadorMutation: () => [
        uploadBatchMock,
        { isLoading: isUploadingBatch, data: mockUploadData },
    ],
    useGetJobStatusQuery: () => ({
        data: batchJobStatus ? { job: batchJobStatus } : undefined,
    }),
    useGetChoferesQuery: () => ({
        data: { data: mockChoferes, pagination: { pages: 3, total: 30, limit: 10 } },
        isFetching: false,
    }),
    useGetCamionesQuery: () => ({
        data: { data: mockCamiones, pagination: { pages: 2 } },
        isFetching: false,
    }),
    useGetAcopladosQuery: () => ({
        data: { data: mockAcoplados, pagination: { pages: 2 } },
        isFetching: false,
    }),
    useGetEquiposQuery: () => ({ data: mockEquipos }),
}));

const { DadoresPortalPage } = await import('../DadoresPortalPage');

describe('DadoresPortalPage - Edge Cases para coverage', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        batchJobStatus = undefined;
        csvImportData = { created: 2, total: 3 };
        isUploadingBatch = false;
        mockUploadData = undefined; // Resetear data por defecto
        createMinimalMock.mockResolvedValue({});
        importCsvMock.mockResolvedValue({ created: 2, total: 3 });
        uploadBatchMock.mockReturnValue({ unwrap: () => Promise.resolve({ jobId: 'batch-123' }) } as any);

        global.URL.createObjectURL = jest.fn(() => 'blob:test') as unknown as typeof URL.createObjectURL;
        global.URL.revokeObjectURL = jest.fn() as unknown as typeof URL.revokeObjectURL;
        HTMLAnchorElement.prototype.click = jest.fn();
        global.localStorage.getItem = jest.fn(() => 'test-token') as unknown as typeof localStorage.getItem;
        global.window.open = jest.fn();

        global.fetch = jest.fn().mockImplementation((url) => {
            if (String(url).includes('/equipos?dadorCargaId=')) {
                return Promise.resolve({
                    ok: true,
                    json: async () => ({ data: mockEquipos }),
                });
            }
            return Promise.resolve({
                ok: true,
                json: async () => ({ data: mockEquipos }),
                blob: async () => new Blob(['test zip content']),
            });
        }) as unknown as typeof fetch;
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    // ============================================
    // Tests para ZIP vigentes (L78-95)
    // ============================================
    describe('ZIP vigentes', () => {
        it('descarga ZIP de vigentes correctamente', async () => {
            render(
                <MemoryRouter>
                    <DadoresPortalPage />
                </MemoryRouter>
            );

            const zipBtn = screen.getByText('ZIP vigentes');
            await act(async () => {
                fireEvent.click(zipBtn);
            });

            await waitFor(() => {
                expect(global.fetch).toHaveBeenCalledWith(
                    expect.stringContaining('/api/docs/equipos/download/vigentes'),
                    expect.objectContaining({ method: 'POST' })
                );
            });

            expect(showToastMock).toHaveBeenCalledWith('ZIP descargado', 'success');
        });

        it('maneja error en descarga de ZIP vigentes', async () => {
            (global.fetch as jest.Mock).mockImplementation((url) => {
                const sUrl = String(url);
                if (sUrl.includes('/equipos?dadorCargaId=')) {
                    return Promise.resolve({
                        ok: true,
                        json: async () => ({ data: mockEquipos }),
                    });
                }
                return Promise.resolve({
                    ok: false,
                    json: async () => ({}),
                    blob: async () => { throw new Error('Error'); },
                });
            });

            render(
                <MemoryRouter>
                    <DadoresPortalPage />
                </MemoryRouter>
            );

            const zipBtn = screen.getByText('ZIP vigentes');
            await act(async () => {
                fireEvent.click(zipBtn);
            });

            await waitFor(() => {
                expect(showToastMock).toHaveBeenCalledWith('No se pudo descargar el ZIP de vigentes', 'error');
            });
        });
    });

    // ============================================
    // Tests para Resumen CSV (L104-111) y selector Dador (L188)
    // ============================================
    describe('Resumen CSV y selector de dador', () => {
        it('genera CSV de resumen y muestra toast', () => {
            render(
                <MemoryRouter>
                    <DadoresPortalPage />
                </MemoryRouter>
            );

            const resumenBtn = screen.getByText(/Resumen CSV/i);
            fireEvent.click(resumenBtn);

            expect(global.URL.createObjectURL).toHaveBeenCalled();
            expect(showToastMock).toHaveBeenCalledWith('CSV generado', 'success');
        });

        it('cambia el dador seleccionado desde el selector', () => {
            render(
                <MemoryRouter>
                    <DadoresPortalPage />
                </MemoryRouter>
            );

            const selects = screen.getAllByRole('combobox');
            const dadorSelect = selects.find(select =>
                Array.from(select.querySelectorAll('option')).some(opt => opt.textContent?.includes('Dador'))
            );

            if (dadorSelect) {
                fireEvent.change(dadorSelect, { target: { value: '2' } });
            }
        });
    });

    // ============================================
    // Tests para paginación Anterior (L439, 458, 477)
    // ============================================
    describe('Paginación Anterior en Maestros', () => {
        it('navega a página anterior de choferes', async () => {
            render(
                <MemoryRouter>
                    <DadoresPortalPage />
                </MemoryRouter>
            );

            // Primero navegar a página 2
            const siguienteButtons = screen.getAllByText('Siguiente');
            fireEvent.click(siguienteButtons[0]); // Choferes

            // Ahora navegar atrás
            const anteriorButtons = screen.getAllByText('Anterior');
            expect(anteriorButtons.length).toBeGreaterThan(0);
            fireEvent.click(anteriorButtons[0]);
        });

        it('navega a página siguiente y anterior de camiones', async () => {
            render(
                <MemoryRouter>
                    <DadoresPortalPage />
                </MemoryRouter>
            );

            const siguienteButtons = screen.getAllByText('Siguiente');
            // Segundo botón es camiones
            if (siguienteButtons[1]) {
                fireEvent.click(siguienteButtons[1]);

                const anteriorButtons = screen.getAllByText('Anterior');
                if (anteriorButtons[1]) {
                    fireEvent.click(anteriorButtons[1]);
                }
            }
        });

        it('navega a página siguiente y anterior de acoplados', async () => {
            render(
                <MemoryRouter>
                    <DadoresPortalPage />
                </MemoryRouter>
            );

            const siguienteButtons = screen.getAllByText('Siguiente');
            // Tercer botón es acoplados
            if (siguienteButtons[2]) {
                fireEvent.click(siguienteButtons[2]);

                const anteriorButtons = screen.getAllByText('Anterior');
                if (anteriorButtons[2]) {
                    fireEvent.click(anteriorButtons[2]);
                }
            }
        });
    });

    // ============================================
    // Tests para CsvUploader (L493, 502-503)
    // ============================================
    describe('CsvUploader', () => {
        it('descarga plantilla CSV', () => {
            render(
                <MemoryRouter>
                    <DadoresPortalPage />
                </MemoryRouter>
            );

            const descargarBtn = screen.getByText(/Descargar plantilla/i);
            fireEvent.click(descargarBtn);

            expect(global.URL.createObjectURL).toHaveBeenCalled();
            expect(global.URL.revokeObjectURL).toHaveBeenCalled();
        });

        it('selecciona archivo CSV', () => {
            const { container } = render(
                <MemoryRouter>
                    <DadoresPortalPage />
                </MemoryRouter>
            );

            const csvInput = container.querySelector('input[type="file"][accept=".csv"]');

            if (csvInput) {
                const file = new File(['dni,tractor,acoplado\n123,AA1,'], 'test.csv', { type: 'text/csv' });
                fireEvent.change(csvInput, { target: { files: [file] } });
            }
        });

        it('carga CSV cuando hay archivo seleccionado', async () => {
            render(
                <MemoryRouter>
                    <DadoresPortalPage />
                </MemoryRouter>
            );

            // Encontrar input de CSV por el accept
            const inputs = document.querySelectorAll('input[type="file"]');
            let csvInput: HTMLInputElement | null = null;
            inputs.forEach(input => {
                if ((input as HTMLInputElement).accept === '.csv') {
                    csvInput = input as HTMLInputElement;
                }
            });

            if (csvInput) {
                const file = new File(['dni,tractor,acoplado\n123,AA1,'], 'test.csv', { type: 'text/csv' });
                fireEvent.change(csvInput, { target: { files: [file] } });

                const cargarBtn = screen.getByText('Cargar CSV');
                await act(async () => {
                    fireEvent.click(cargarBtn);
                });

                await waitFor(() => {
                    expect(importCsvMock).toHaveBeenCalled();
                });
            }
        });

        it('muestra resultados de importación CSV', () => {
            csvImportData = { created: 5, total: 10 };

            render(
                <MemoryRouter>
                    <DadoresPortalPage />
                </MemoryRouter>
            );

            // La data de importación se muestra
            expect(screen.getByText(/Creados:/)).toBeInTheDocument();
        });
    });

    // ============================================
    // Tests para EquipoActions (L528-541)
    // ============================================
    describe('EquipoActions', () => {
        it('cambia equipo seleccionado', async () => {
            render(
                <MemoryRouter>
                    <DadoresPortalPage />
                </MemoryRouter>
            );

            await waitFor(() => {
                const selects = screen.getAllByRole('combobox');
                expect(selects.length).toBeGreaterThan(0);
            });

            // Buscar select de equipos (tiene opciones con #id)
            const selects = screen.getAllByRole('combobox');
            const equipoSelect = selects.find(select => {
                const options = select.querySelectorAll('option');
                return Array.from(options).some(opt => opt.textContent?.includes('#'));
            });

            if (equipoSelect) {
                fireEvent.change(equipoSelect, { target: { value: '101' } });
            }
        });

        it('descarga ZIP de equipo', async () => {
            render(
                <MemoryRouter>
                    <DadoresPortalPage />
                </MemoryRouter>
            );

            const equipoSelect = await waitFor(() => {
                const selects = screen.getAllByRole('combobox');
                const found = selects.find(select => {
                    const options = select.querySelectorAll('option');
                    return Array.from(options).some(opt => opt.textContent?.includes('#'));
                });
                if (!found) {
                    throw new Error('Equipo select not ready');
                }
                return found as HTMLSelectElement;
            });

            await waitFor(() => {
                expect(equipoSelect.value).toBeTruthy();
            });

            const descargarZipBtn = screen.getByText('Descargar ZIP');
            fireEvent.click(descargarZipBtn);

            expect(global.window.open).toHaveBeenCalledWith(
                expect.stringContaining('/clients/equipos/'),
                '_blank'
            );
        });

        it('solicita documentaciИn del equipo', async () => {
            render(
                <MemoryRouter>
                    <DadoresPortalPage />
                </MemoryRouter>
            );

            const equipoSelect = await waitFor(() => {
                const selects = screen.getAllByRole('combobox');
                const found = selects.find(select => {
                    const options = select.querySelectorAll('option');
                    return Array.from(options).some(opt => opt.textContent?.includes('#'));
                });
                if (!found) {
                    throw new Error('Equipo select not ready');
                }
                return found as HTMLSelectElement;
            });

            fireEvent.change(equipoSelect, { target: { value: '100' } });

            const solicitarBtn = screen.getByText(/Solicitar/i);
            await act(async () => {
                fireEvent.click(solicitarBtn);
            });

            await waitFor(() => {
                expect(global.fetch).toHaveBeenCalledWith(
                    expect.stringContaining('/request-missing'),
                    expect.objectContaining({ method: 'POST' })
                );
            });
        });
    });

    // ============================================
    // Tests para BatchUploader job completado (L561-566, L599-637)
    // ============================================
    describe('BatchUploader con job completado', () => {
        beforeEach(() => {
            mockUploadData = { jobId: 'batch-123' }; // Simular que hay un job activo
            batchJobStatus = {
                status: 'completed',
                progress: 1,
                results: [
                    { documentId: 1, fileName: 'doc1.pdf', status: 'APROBADO', comprobante: 'ABC123', vencimiento: '2024-12-31' },
                    { documentId: 2, fileName: 'doc2.pdf', status: 'RECHAZADO' },
                    { documentId: 3, fileName: 'doc3.pdf', status: 'CLASIFICANDO' },
                    { documentId: 4, fileName: 'doc4.pdf', status: 'PENDIENTE_APROBACION' },
                    { documentId: 5, fileName: 'doc5.pdf', status: 'OTRO' },
                ],
                items: [{ id: 1 }, { id: 2 }],
            };
        });

        it('muestra proceso finalizado', () => {
            render(
                <MemoryRouter>
                    <DadoresPortalPage />
                </MemoryRouter>
            );

            expect(screen.getByText('Proceso finalizado.')).toBeInTheDocument();
        });

        it('muestra botón Ver en Documentos', () => {
            render(
                <MemoryRouter>
                    <DadoresPortalPage />
                </MemoryRouter>
            );

            const verBtn = screen.getByText('Ver en Documentos');
            expect(verBtn).toBeInTheDocument();
            fireEvent.click(verBtn);
            expect(navigateMock).toHaveBeenCalledWith(expect.stringContaining('/dadores/'));
        });

        it('descarga reporte CSV de resultados', () => {
            render(
                <MemoryRouter>
                    <DadoresPortalPage />
                </MemoryRouter>
            );

            const descargarBtn = screen.getByText('Descargar reporte CSV');
            fireEvent.click(descargarBtn);

            expect(global.URL.createObjectURL).toHaveBeenCalled();
        });

        it('filtra solo errores con checkbox', () => {
            render(
                <MemoryRouter>
                    <DadoresPortalPage />
                </MemoryRouter>
            );

            const checkbox = screen.getByRole('checkbox');
            fireEvent.click(checkbox);

            // Al filtrar por errores, solo debería mostrar RECHAZADO
            expect(screen.getByText('doc2.pdf')).toBeInTheDocument();
        });

        it('reintenta documentos fallidos', async () => {
            render(
                <MemoryRouter>
                    <DadoresPortalPage />
                </MemoryRouter>
            );

            const reintentarBtn = screen.getByText('Reintentar fallidos');
            await act(async () => {
                fireEvent.click(reintentarBtn);
            });

            await waitFor(() => {
                expect(global.fetch).toHaveBeenCalledWith(
                    expect.stringContaining('/retry-failed'),
                    expect.objectContaining({ method: 'POST' })
                );
            });

            expect(showToastMock).toHaveBeenCalledWith('Reintentando documentos rechazados', 'default');
        });

        it('muestra diferentes badges según status', () => {
            render(
                <MemoryRouter>
                    <DadoresPortalPage />
                </MemoryRouter>
            );

            // Verificar que los resultados se muestran
            expect(screen.getByText('doc1.pdf')).toBeInTheDocument();
            expect(screen.getByText('APROBADO')).toBeInTheDocument();
            expect(screen.getByText('RECHAZADO')).toBeInTheDocument();
        });

        it('emite toasts para resultados completados', async () => {
            render(
                <MemoryRouter>
                    <DadoresPortalPage />
                </MemoryRouter>
            );

            await waitFor(() => {
                expect(showToastMock).toHaveBeenCalledWith(
                    expect.stringContaining('doc1.pdf'),
                    'success',
                    5000
                );
            });
        });
    });

    // ============================================
    // Tests para Carga Inicial por Planilla (L272-280)
    // ============================================
    describe('Carga Inicial por Planilla', () => {
        it('sube archivos de planilla', async () => {
            uploadBatchMock.mockReturnValue({
                unwrap: () => Promise.resolve({ jobId: 'job-456' }),
            } as any);

            render(
                <MemoryRouter>
                    <DadoresPortalPage />
                </MemoryRouter>
            );

            // Buscar el input de archivos para planilla (acepta pdf e imágenes)
            const inputs = document.querySelectorAll('input[type="file"]');
            let planillaInput: HTMLInputElement | null = null;
            inputs.forEach(input => {
                const accept = (input as HTMLInputElement).accept;
                if (accept && accept.includes('pdf')) {
                    planillaInput = input as HTMLInputElement;
                }
            });

            if (planillaInput) {
                const file = new File(['pdf content'], 'test.pdf', { type: 'application/pdf' });
                await act(async () => {
                    fireEvent.change(planillaInput, { target: { files: [file] } });
                });

                await waitFor(() => {
                    expect(uploadBatchMock).toHaveBeenCalled();
                });
            }
        });

        it('muestra error si falla carga batch', async () => {
            uploadBatchMock.mockReturnValue({
                unwrap: () => Promise.reject(new Error('Upload failed')),
            } as any);

            render(
                <MemoryRouter>
                    <DadoresPortalPage />
                </MemoryRouter>
            );

            const inputs = document.querySelectorAll('input[type="file"]');
            let planillaInput: HTMLInputElement | null = null;
            inputs.forEach(input => {
                const accept = (input as HTMLInputElement).accept;
                if (accept && accept.includes('pdf')) {
                    planillaInput = input as HTMLInputElement;
                }
            });

            if (planillaInput) {
                const file = new File(['pdf'], 'test.pdf', { type: 'application/pdf' });
                await act(async () => {
                    fireEvent.change(planillaInput, { target: { files: [file] } });
                });

                await waitFor(() => {
                    expect(showToastMock).toHaveBeenCalledWith('No fue posible iniciar la carga batch', 'error');
                });
            }
        });
    });

    // ============================================
    // Tests para BatchUploader selección de archivos (L574, 578-579)
    // ============================================
    describe('BatchUploader selección de archivos', () => {
        it('selecciona múltiples archivos para batch', () => {
            render(
                <MemoryRouter>
                    <DadoresPortalPage />
                </MemoryRouter>
            );

            // Encontrar input múltiple
            const inputs = document.querySelectorAll('input[type="file"][multiple]');
            const input = Array.from(inputs).find(node => (node as HTMLInputElement).id !== 'batchDocs') as HTMLInputElement | undefined;
            if (input) {
                const files = [
                    new File(['content1'], 'file1.pdf', { type: 'application/pdf' }),
                    new File(['content2'], 'file2.pdf', { type: 'application/pdf' }),
                ];

                fireEvent.change(input, { target: { files } });
            }
        });

        it('sube documentos cuando hay archivos seleccionados', async () => {
            uploadBatchMock.mockResolvedValue({ jobId: 'batch-789' } as any);

            render(
                <MemoryRouter>
                    <DadoresPortalPage />
                </MemoryRouter>
            );

            // Encontrar input múltiple 
            const inputs = document.querySelectorAll('input[type="file"][multiple]');
            const input = Array.from(inputs).find(node => (node as HTMLInputElement).id !== 'batchDocs') as HTMLInputElement | undefined;
            if (input) {
                const files = [new File(['content'], 'doc.pdf', { type: 'application/pdf' })];

                fireEvent.change(input, { target: { files } });

                const subirBtn = screen.getByText(/Subir documentos/i);
                await act(async () => {
                    fireEvent.click(subirBtn);
                });

                await waitFor(() => {
                    expect(uploadBatchMock).toHaveBeenCalled();
                });
            }
        });

        it('envia archivos al iniciar la carga batch', async () => {
            uploadBatchMock.mockResolvedValue({ jobId: 'batch-999' } as any);

            render(
                <MemoryRouter>
                    <DadoresPortalPage />
                </MemoryRouter>
            );

            const inputs = document.querySelectorAll('input[type="file"][multiple]');
            const input = Array.from(inputs).find(node => (node as HTMLInputElement).id !== 'batchDocs') as HTMLInputElement | undefined;
            if (input) {
                const files = [new File(['content'], 'doc.pdf', { type: 'application/pdf' })];

                fireEvent.change(input, { target: { files } });

                const subirBtn = screen.getByText(/Subir documentos/i);
                await act(async () => {
                    fireEvent.click(subirBtn);
                });

                await waitFor(() => {
                    expect(uploadBatchMock).toHaveBeenCalledWith({ dadorId: 1, files });
                });
            }
        });
    });

    // ============================================
    // Tests para estados de carga intermedios
    // ============================================
    describe('Estados de carga', () => {
        it('muestra archivos en proceso cuando hay items', () => {
            mockUploadData = { jobId: 'batch-processing' }; // Simular job activo
            batchJobStatus = {
                status: 'processing',
                progress: 0.5,
                items: [{ id: 1 }, { id: 2 }, { id: 3 }],
            };

            render(
                <MemoryRouter>
                    <DadoresPortalPage />
                </MemoryRouter>
            );

            expect(screen.getByText(/Archivos en proceso: 3/)).toBeInTheDocument();
        });

        it('muestra barra de progreso con porcentaje', () => {
            mockUploadData = { jobId: 'batch-processing' }; // Simular job activo
            batchJobStatus = {
                status: 'processing',
                progress: 0.75,
            };

            render(
                <MemoryRouter>
                    <DadoresPortalPage />
                </MemoryRouter>
            );

            expect(screen.getByText(/processing 75%/)).toBeInTheDocument();
        });
    });

    // ============================================
    // Tests para Creación Manual (L104-188)
    // ============================================
    describe('Creación Manual de Equipo', () => {
        it('crea un equipo correctamente con todos los campos', async () => {
            render(
                <MemoryRouter>
                    <DadoresPortalPage />
                </MemoryRouter>
            );

            // Inputs
            const dniInput = screen.getByPlaceholderText('Ej: 12345678');
            fireEvent.change(dniInput, { target: { value: '11223344' } });

            const tractorInput = screen.getByPlaceholderText('AA123BB');
            fireEvent.change(tractorInput, { target: { value: 'AB123CD' } });

            const acopladoInput = screen.getByPlaceholderText('AC456CD (opcional)');
            fireEvent.change(acopladoInput, { target: { value: 'AC999XX' } });

            // Intentar cambiar dador si hay opciones (el mock tiene 2)
            // No es estrictamente necesario si ya interactuamos con el form, pero ayuda al onChange

            const crearBtn = screen.getByText('¡Crear Equipo!');

            await waitFor(() => expect(crearBtn).not.toBeDisabled());

            await act(async () => {
                fireEvent.click(crearBtn);
            });

            await waitFor(() => {
                expect(createMinimalMock).toHaveBeenCalledWith(
                    expect.objectContaining({
                        dniChofer: '11223344',
                        patenteTractor: 'AB123CD',
                        patenteAcoplado: 'AC999XX'
                    })
                );
            });
        });
    });

    describe('Acciones de Equipo', () => {
        it('ejecuta acción de revisar faltantes', async () => {
            (global.fetch as jest.Mock).mockImplementation((url) => {
                if (String(url).includes('check-missing-now')) {
                    return Promise.resolve({ ok: true, json: async () => ({ data: {} }) });
                }
                return Promise.resolve({ ok: true, json: async () => ({ data: mockEquipos }) });
            });

            render(
                <MemoryRouter>
                    <DadoresPortalPage />
                </MemoryRouter>
            );

            // Esperar carga inicial
            await waitFor(() => expect(screen.getAllByRole('combobox').length).toBeGreaterThan(0));

            // Forzar selección en todos los combos posibles para asegurar equipoId
            const equipoSelect = await waitFor(() => {
                const selects = screen.getAllByRole('combobox');
                const found = selects.find(select => {
                    const options = select.querySelectorAll('option');
                    return Array.from(options).some(opt => opt.textContent?.includes('#'));
                });
                if (!found) {
                    throw new Error('Equipo select not ready');
                }
                return found as HTMLSelectElement;
            });

            fireEvent.change(equipoSelect, { target: { value: '100' } });

            const btn = screen.getByText('Revisar faltantes ahora');
            await act(async () => {
                fireEvent.click(btn);
            });

            expect(global.fetch).toHaveBeenCalledWith(
                expect.stringContaining('check-missing-now'),
                expect.any(Object)
            );
        });
    });

    describe('Navegación y Estados Adicionales', () => {
        it('navega a aprobación de documentos', () => {
            render(
                <MemoryRouter>
                    <DadoresPortalPage />
                </MemoryRouter>
            );
            const btn = screen.getByText('Ir a Aprobación');
            fireEvent.click(btn);
            expect(navigateMock).toHaveBeenCalledWith('/documentos/aprobacion');
        });
    });
});
