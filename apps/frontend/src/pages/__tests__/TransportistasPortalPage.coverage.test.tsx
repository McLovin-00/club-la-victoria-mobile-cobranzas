/// <reference types="@testing-library/jest-dom" />
/**
 * Tests de cobertura para TransportistasPortalPage (ESM)
 */
import React from 'react';
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';

jest.unstable_mockModule('../../features/documentos/api/documentosApiSlice', () => ({
  useGetDadoresQuery: jest.fn(),
  useGetDefaultsQuery: jest.fn(),
  useGetMisEquiposQuery: jest.fn(),
  useCreateEquipoMinimalMutation: jest.fn(),
  useUploadBatchDocsTransportistasMutation: jest.fn(),
  useGetJobStatusQuery: jest.fn(),
  useTransportistasSearchMutation: jest.fn(),
}));

jest.unstable_mockModule('../../components/ui/Toast.utils', () => ({
  showToast: jest.fn(),
}));

jest.unstable_mockModule('../../components/transportistas/DashboardCumplimiento', () => ({
  DashboardCumplimiento: () => <div>Dashboard</div>,
}));

jest.unstable_mockModule('../../components/transportistas/PerfilMobile', () => ({
  PerfilMobile: () => <div>Perfil</div>,
}));

jest.unstable_mockModule('../../components/transportistas/CalendarioInteligente', () => ({
  CalendarioInteligente: () => <div>Calendario</div>,
}));

jest.unstable_mockModule('react-router-dom', () => ({
  useNavigate: jest.fn(),
}));

const { TransportistasPortalPage } = await import('../TransportistasPortalPage');
const apiSlice = await import('../../features/documentos/api/documentosApiSlice');
const toastUtils = await import('../../components/ui/Toast.utils');
const routerDom = await import('react-router-dom');

type Dador = { id: number; razonSocial?: string };

type MisEquipo = {
  id: number;
  driverDniNorm?: string;
  truckPlateNorm?: string;
  trailerPlateNorm?: string | null;
};

type JobResult = {
  documentId: number;
  status: string;
  fileName: string;
  comprobante?: string;
  vencimiento?: string;
};

type JobStatus = {
  job?: {
    status?: string;
    progress?: number;
    items?: number[];
    results?: JobResult[];
  };
};

type CreateMinimalPayload = {
  dadorCargaId: number;
  dniChofer: string;
  patenteTractor: string;
  patenteAcoplado?: string;
  choferPhones?: string[];
};

type UploadBatchPayload = {
  files: FileList | File[];
};

type SearchPayload = {
  dni?: string;
  plate?: string;
};

type UploadBatchState = { isLoading: boolean; data?: { jobId: string }; reset: () => void };

type SearchState = { data: MisEquipo[]; isLoading: boolean; reset: () => void };

type CreateMinimalState = { isLoading: boolean; reset: () => void };

const mockUseGetDadoresQuery = jest.mocked(apiSlice.useGetDadoresQuery);
const mockUseGetDefaultsQuery = jest.mocked(apiSlice.useGetDefaultsQuery);
const mockUseGetMisEquiposQuery = jest.mocked(apiSlice.useGetMisEquiposQuery);
const mockUseCreateEquipoMinimalMutation = jest.mocked(apiSlice.useCreateEquipoMinimalMutation);
const mockUseUploadBatchDocsTransportistasMutation = jest.mocked(apiSlice.useUploadBatchDocsTransportistasMutation);
const mockUseGetJobStatusQuery = jest.mocked(apiSlice.useGetJobStatusQuery);
const mockUseTransportistasSearchMutation = jest.mocked(apiSlice.useTransportistasSearchMutation);

const mockShowToast = jest.mocked(toastUtils.showToast);
const mockUseNavigate = jest.mocked(routerDom.useNavigate);

describe('TransportistasPortalPage coverage', () => {
  let createMinimalMock: jest.MockedFunction<(payload: CreateMinimalPayload) => Promise<unknown>>;
  let uploadBatchMock: jest.MockedFunction<(payload: UploadBatchPayload) => Promise<unknown>>;
  let searchMock: jest.MockedFunction<(payload: SearchPayload) => { unwrap: () => Promise<unknown> }>;
  let unwrapSearchMock: jest.MockedFunction<() => Promise<unknown>>;
  const navigateMock = jest.fn();

  const renderPage = () => render(<TransportistasPortalPage />);

  beforeEach(() => {
    createMinimalMock = jest.fn<(payload: CreateMinimalPayload) => Promise<unknown>>();
    createMinimalMock.mockResolvedValue({});
    uploadBatchMock = jest.fn<(payload: UploadBatchPayload) => Promise<unknown>>();
    uploadBatchMock.mockResolvedValue({});
    unwrapSearchMock = jest.fn<() => Promise<unknown>>();
    unwrapSearchMock.mockResolvedValue([]);
    searchMock = jest.fn<(payload: SearchPayload) => { unwrap: () => Promise<unknown> }>();
    searchMock.mockReturnValue({ unwrap: unwrapSearchMock });

    const defaultDadores: Dador[] = [{ id: 10, razonSocial: 'Dador 10' }];
    const defaultDefaults = { defaultDadorId: 10 };

    mockUseGetDadoresQuery.mockReturnValue({
      data: { list: defaultDadores },
      refetch: jest.fn(),
    } as unknown as ReturnType<typeof apiSlice.useGetDadoresQuery>);

    mockUseGetDefaultsQuery.mockReturnValue({
      data: defaultDefaults,
      refetch: jest.fn(),
    } as unknown as ReturnType<typeof apiSlice.useGetDefaultsQuery>);

    mockUseGetMisEquiposQuery.mockReturnValue({
      data: [],
      refetch: jest.fn(),
    } as unknown as ReturnType<typeof apiSlice.useGetMisEquiposQuery>);

    const createMinimalState: CreateMinimalState = { isLoading: false, reset: jest.fn() };
    mockUseCreateEquipoMinimalMutation.mockReturnValue(
      [createMinimalMock, createMinimalState] as unknown as ReturnType<typeof apiSlice.useCreateEquipoMinimalMutation>
    );

    const uploadBatchState: UploadBatchState = { isLoading: false, data: undefined, reset: jest.fn() };
    mockUseUploadBatchDocsTransportistasMutation.mockReturnValue(
      [uploadBatchMock, uploadBatchState] as unknown as ReturnType<typeof apiSlice.useUploadBatchDocsTransportistasMutation>
    );

    const searchState: SearchState = { data: [], isLoading: false, reset: jest.fn() };
    mockUseTransportistasSearchMutation.mockReturnValue(
      [searchMock, searchState] as unknown as ReturnType<typeof apiSlice.useTransportistasSearchMutation>
    );

    mockUseGetJobStatusQuery.mockReturnValue({
      data: undefined,
      refetch: jest.fn(),
    } as unknown as ReturnType<typeof apiSlice.useGetJobStatusQuery>);

    mockShowToast.mockReset();
    mockUseNavigate.mockReturnValue(navigateMock as unknown as ReturnType<typeof routerDom.useNavigate>);
  });

  it('prefers defaults defaultDadorId over dadores list', async () => {
    mockUseGetDefaultsQuery.mockReturnValue({
      data: { defaultDadorId: 22 },
      refetch: jest.fn(),
    } as unknown as ReturnType<typeof apiSlice.useGetDefaultsQuery>);

    mockUseGetDadoresQuery.mockReturnValue({
      data: { list: [{ id: 22, razonSocial: 'Dador 22' }] },
      refetch: jest.fn(),
    } as unknown as ReturnType<typeof apiSlice.useGetDadoresQuery>);

    renderPage();

    fireEvent.click(screen.getByRole('button', { name: /registro/i }));

    const select = (await screen.findByRole('combobox')) as HTMLSelectElement;
    await waitFor(() => expect(select.value).toBe('22'));
  });

  it('uses first dador when defaults missing', async () => {
    mockUseGetDefaultsQuery.mockReturnValue({
      data: undefined,
      refetch: jest.fn(),
    } as unknown as ReturnType<typeof apiSlice.useGetDefaultsQuery>);

    mockUseGetDadoresQuery.mockReturnValue({
      data: { list: [{ id: 7, razonSocial: 'Dador 7' }] },
      refetch: jest.fn(),
    } as unknown as ReturnType<typeof apiSlice.useGetDadoresQuery>);

    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /registro/i }));

    const select = (await screen.findByRole('combobox')) as HTMLSelectElement;
    await waitFor(() => expect(select.value).toBe('7'));
  });

  it('disables create button until required fields are filled', async () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /registro/i }));

    const createButton = (await screen.findByRole('button', { name: /crear equipo/i })) as HTMLButtonElement;
    expect(createButton.hasAttribute('disabled')).toBe(true);

    fireEvent.change(screen.getByPlaceholderText('Ej: 12345678'), { target: { value: '12345678' } });
    fireEvent.change(screen.getByPlaceholderText('AA123BB'), { target: { value: 'AA123BB' } });

    await waitFor(() => expect(createButton.hasAttribute('disabled')).toBe(false));
  });

  it('shows phone format warning for invalid numbers', async () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /registro/i }));

    fireEvent.change(await screen.findByPlaceholderText('+54911234567'), { target: { value: '123' } });

    expect(screen.queryByText(/Formato requerido/i)).not.toBeNull();
  });

  it('blocks create and shows toast on invalid phones', async () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /registro/i }));

    fireEvent.change(await screen.findByPlaceholderText('Ej: 12345678'), { target: { value: '12345678' } });
    fireEvent.change(screen.getByPlaceholderText('AA123BB'), { target: { value: 'AA123BB' } });
    fireEvent.change(screen.getByPlaceholderText('+54911234567'), { target: { value: '123' } });

    fireEvent.click(screen.getByRole('button', { name: /crear equipo/i }));

    await waitFor(() => {
      expect(mockShowToast).toHaveBeenCalledWith('Teléfonos inválidos. Use formato WhatsApp.', 'error');
    });
    expect(createMinimalMock).not.toHaveBeenCalled();
  });

  it('creates equipo and resets fields with valid data', async () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /registro/i }));

    const dniInput = (await screen.findByPlaceholderText('Ej: 12345678')) as HTMLInputElement;
    const tractorInput = screen.getByPlaceholderText('AA123BB') as HTMLInputElement;
    const acopladoInput = screen.getByPlaceholderText('AC456CD (opcional)') as HTMLInputElement;
    const phoneInput = screen.getByPlaceholderText('+54911234567') as HTMLInputElement;

    fireEvent.change(dniInput, { target: { value: '12345678' } });
    fireEvent.change(tractorInput, { target: { value: 'AA123BB' } });
    fireEvent.change(acopladoInput, { target: { value: '' } });
    fireEvent.change(phoneInput, { target: { value: '+5491123456789' } });

    fireEvent.click(screen.getByRole('button', { name: /crear equipo/i }));

    await waitFor(() => {
      expect(createMinimalMock).toHaveBeenCalledWith(
        expect.objectContaining({
          dadorCargaId: 10,
          dniChofer: '12345678',
          patenteTractor: 'AA123BB',
          patenteAcoplado: undefined,
          choferPhones: ['+5491123456789'],
        })
      );
    });

    await waitFor(() => {
      expect(dniInput.value).toBe('');
      expect(tractorInput.value).toBe('');
      expect(acopladoInput.value).toBe('');
      expect(phoneInput.value).toBe('');
    });
  });

  it('shows loading indicator when creating equipo', async () => {
    const createMinimalState: CreateMinimalState = { isLoading: true, reset: jest.fn() };
    mockUseCreateEquipoMinimalMutation.mockReturnValue(
      [createMinimalMock, createMinimalState] as unknown as ReturnType<typeof apiSlice.useCreateEquipoMinimalMutation>
    );

    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /registro/i }));

    expect(await screen.findByText(/Creando Equipo/i)).not.toBeNull();
  });

  it('disables upload button without files', async () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /docs/i }));

    const uploadButton = (await screen.findByRole('button', { name: /subir documentos/i })) as HTMLButtonElement;
    expect(uploadButton.hasAttribute('disabled')).toBe(true);
  });

  it('starts upload when files are selected', async () => {
    const user = userEvent.setup();
    renderPage();

    fireEvent.click(screen.getByRole('button', { name: /docs/i }));

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement | null;
    expect(fileInput).not.toBeNull();
    if (!fileInput) return;

    const file = new File(['content'], 'test.pdf', { type: 'application/pdf' });
    await user.upload(fileInput, file);

    fireEvent.click(screen.getByRole('button', { name: /subir documentos/i }));

    await waitFor(() => {
      expect(uploadBatchMock).toHaveBeenCalledWith(expect.objectContaining({ files: fileInput.files }));
    });
  });

  it('renders progress and navigates after completion', async () => {
    const uploadBatchState: UploadBatchState = { isLoading: false, data: { jobId: 'job-1' }, reset: jest.fn() };
    mockUseUploadBatchDocsTransportistasMutation.mockReturnValue(
      [uploadBatchMock, uploadBatchState] as unknown as ReturnType<typeof apiSlice.useUploadBatchDocsTransportistasMutation>
    );

    const status: JobStatus = {
      job: { status: 'completed', progress: 1, items: [1], results: [] },
    };
    mockUseGetJobStatusQuery.mockReturnValue({
      data: status,
      refetch: jest.fn(),
    } as unknown as ReturnType<typeof apiSlice.useGetJobStatusQuery>);

    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /docs/i }));

    expect(await screen.findByText(/Proceso finalizado/i)).not.toBeNull();

    const navigateButton = screen.getByRole('button', { name: /Ver en Documentos/i });
    fireEvent.click(navigateButton);

    expect(navigateMock).toHaveBeenCalledWith('/documentos');
  });

  it('toggles only-errors filter on completed jobs with results', async () => {
    const uploadBatchState: UploadBatchState = { isLoading: false, data: { jobId: 'job-2' }, reset: jest.fn() };
    mockUseUploadBatchDocsTransportistasMutation.mockReturnValue(
      [uploadBatchMock, uploadBatchState] as unknown as ReturnType<typeof apiSlice.useUploadBatchDocsTransportistasMutation>
    );

    const status: JobStatus = {
      job: {
        status: 'completed',
        progress: 1,
        items: [1],
        results: [{ documentId: 10, status: 'APROBADO', fileName: 'file.pdf' }],
      },
    };
    mockUseGetJobStatusQuery.mockReturnValue({
      data: status,
      refetch: jest.fn(),
    } as unknown as ReturnType<typeof apiSlice.useGetJobStatusQuery>);

    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /docs/i }));

    const checkbox = (await screen.findByRole('checkbox', { name: /solo errores/i })) as HTMLInputElement;
    expect(checkbox.checked).toBe(false);

    fireEvent.click(checkbox);
    expect(checkbox.checked).toBe(true);
  });

  it('notifies job results once per document', async () => {
    const uploadBatchState: UploadBatchState = { isLoading: false, data: { jobId: 'job-3' }, reset: jest.fn() };
    mockUseUploadBatchDocsTransportistasMutation.mockReturnValue(
      [uploadBatchMock, uploadBatchState] as unknown as ReturnType<typeof apiSlice.useUploadBatchDocsTransportistasMutation>
    );

    const results: JobResult[] = [
      { documentId: 1, status: 'APROBADO', fileName: 'doc-1.pdf' },
      { documentId: 2, status: 'RECHAZADO', fileName: 'doc-2.pdf' },
      { documentId: 3, status: 'OBSERVADO', fileName: 'doc-3.pdf' },
    ];

    const status: JobStatus = { job: { status: 'completed', progress: 1, items: [1], results } };
    mockUseGetJobStatusQuery.mockReturnValue({
      data: status,
      refetch: jest.fn(),
    } as unknown as ReturnType<typeof apiSlice.useGetJobStatusQuery>);

    const { rerender } = renderPage();
    fireEvent.click(screen.getByRole('button', { name: /docs/i }));

    await waitFor(() => expect(mockShowToast).toHaveBeenCalledTimes(3));

    expect(mockShowToast).toHaveBeenCalledWith('doc-1.pdf: APROBADO', 'success', 5000);
    expect(mockShowToast).toHaveBeenCalledWith('doc-2.pdf: RECHAZADO', 'error', 5000);
    expect(mockShowToast).toHaveBeenCalledWith('doc-3.pdf: OBSERVADO', 'default', 5000);

    rerender(<TransportistasPortalPage />);
    await waitFor(() => expect(mockShowToast).toHaveBeenCalledTimes(3));
  });

  it('triggers search on Enter key', async () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /equipos/i }));

    const dniInput = await screen.findByLabelText('DNI');
    fireEvent.change(dniInput, { target: { value: '123' } });
    fireEvent.keyDown(dniInput, { key: 'Enter', code: 'Enter' });

    await waitFor(() => expect(searchMock).toHaveBeenCalledWith({ dni: '123' }));
  });

  it('debounces search when inputs reach minimum length', async () => {
    jest.useFakeTimers();
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /equipos/i }));

    const dniInput = await screen.findByLabelText('DNI');
    fireEvent.change(dniInput, { target: { value: '12-3' } });

    await act(async () => {
      jest.advanceTimersByTime(500);
    });

    expect(searchMock).toHaveBeenCalledWith({ dni: '12-3' });
    jest.useRealTimers();
  });

  it('focuses results heading when search results are present', async () => {
    const searchState: SearchState = {
      data: [{ id: 15, driverDniNorm: '123', truckPlateNorm: 'AA123BB' }],
      isLoading: false,
      reset: jest.fn(),
    };
    mockUseTransportistasSearchMutation.mockReturnValue(
      [searchMock, searchState] as unknown as ReturnType<typeof apiSlice.useTransportistasSearchMutation>
    );

    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /equipos/i }));

    const heading = await screen.findByRole('heading', { name: /Resultados/i });
    await waitFor(() => expect(document.activeElement).toBe(heading));
  });

  it('shows empty results message when filters are set', async () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /equipos/i }));

    fireEvent.change(await screen.findByLabelText('DNI'), { target: { value: '999' } });

    expect(await screen.findByText(/No se encontraron resultados/i)).not.toBeNull();
  });

  it('renders mis equipos list and opens downloads', async () => {
    const misEquipos: MisEquipo[] = [
      { id: 1, driverDniNorm: '123', truckPlateNorm: 'AA123BB' },
    ];
    mockUseGetMisEquiposQuery.mockReturnValue({
      data: misEquipos,
      refetch: jest.fn(),
    } as unknown as ReturnType<typeof apiSlice.useGetMisEquiposQuery>);

    const openSpy = jest.spyOn(window, 'open').mockImplementation(() => null);

    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /equipos/i }));

    expect(await screen.findByText(/Equipo #1/)).not.toBeNull();

    fireEvent.click(screen.getByRole('button', { name: /Descargar Documentos/i }));
    expect(openSpy).toHaveBeenCalledWith('/api/docs/clients/equipos/1/zip', '_blank');

    openSpy.mockRestore();
  });

  it('shows empty state and scrolls to top', async () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /equipos/i }));

    const cta = await screen.findByRole('button', { name: /Registrar Primer Equipo/i });
    fireEvent.click(cta);

    expect(window.scrollTo).toHaveBeenCalled();
  });
});
