/**
 * Smoke test completo para ClientePortalPage
 */
import React from 'react';
import { describe, expect, it, jest, beforeEach } from '@jest/globals';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const mockClients = { list: [{ id: 1, razonSocial: 'Cliente Test' }, { id: 2, razonSocial: 'Cliente 2' }] };
const mockEquipos = [
  { id: 101, driverDniNorm: '12345678', truckPlateNorm: 'AA123BB', trailerPlateNorm: 'AC456CD' },
  { id: 102, driverDniNorm: '87654321', truckPlateNorm: 'BB456CC', trailerPlateNorm: null },
];
const mockReqs = [
  { templateId: 1, entityType: 'CHOFER', template: { name: 'DNI' } },
  { templateId: 2, entityType: 'CAMION', template: { name: 'VTV' } },
  { templateId: 3, entityType: 'ACOPLADO', template: { name: 'Patente' } },
];
const mockDocs = [
  { id: 1, templateId: 1, entityType: 'CHOFER', status: 'APROBADO', expiresAt: '2025-12-31', fileName: 'dni.pdf' },
  { id: 2, templateId: 2, entityType: 'CAMION', status: 'PENDIENTE', expiresAt: null },
];

const mockBulkSearch = jest.fn().mockResolvedValue({ unwrap: () => Promise.resolve([{ id: 999, truckPlateNorm: 'ZZ999ZZ', trailerPlateNorm: 'YY888YY' }]) });
const mockRequestZip = jest.fn().mockResolvedValue({ unwrap: () => Promise.resolve({ jobId: 'job-123' }) });
const mockShowToast = jest.fn();
const mockGoBack = jest.fn();

jest.unstable_mockModule('@/features/documentos/api/documentosApiSlice', () => ({
  useGetClientsQuery: () => ({ data: mockClients }),
  useGetClienteEquiposQuery: () => ({ data: mockEquipos, refetch: jest.fn() }),
  useGetDocumentosPorEquipoQuery: () => ({ data: mockDocs }),
  useGetClientRequirementsQuery: () => ({ data: mockReqs }),
  useBulkSearchPlatesMutation: () => [mockBulkSearch, { isLoading: false }],
  useRequestClientsBulkZipMutation: () => [mockRequestZip, { isLoading: false }],
  useGetClientsZipJobQuery: () => ({ data: null }),
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

describe('ClientePortalPage - Completo', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Renderizado básico', () => {
    it('renderiza sin crashear', () => {
      render(<MemoryRouter><ClientePortalPage /></MemoryRouter>);
      expect(screen.getByText(/¡Bienvenido, Cliente!/)).toBeTruthy();
    });

    it('muestra título del portal', () => {
      render(<MemoryRouter><ClientePortalPage /></MemoryRouter>);
      expect(screen.getByText(/Consulta y seguimiento de equipos/)).toBeTruthy();
    });

    it('muestra botón volver', () => {
      render(<MemoryRouter><ClientePortalPage /></MemoryRouter>);
      expect(screen.getByText('← Volver')).toBeTruthy();
    });

    it('muestra panel de control', () => {
      render(<MemoryRouter><ClientePortalPage /></MemoryRouter>);
      expect(screen.getByText('Panel de Control')).toBeTruthy();
    });

    it('muestra selector de cliente', () => {
      render(<MemoryRouter><ClientePortalPage /></MemoryRouter>);
      expect(screen.getByText('Cliente Test')).toBeTruthy();
      expect(screen.getByText('Cliente 2')).toBeTruthy();
    });

    it('muestra filtro de estado', () => {
      render(<MemoryRouter><ClientePortalPage /></MemoryRouter>);
      expect(screen.getByText('Todos los estados')).toBeTruthy();
    });

    it('muestra sección búsqueda masiva', () => {
      render(<MemoryRouter><ClientePortalPage /></MemoryRouter>);
      expect(screen.getByText(/Búsqueda masiva por patentes/)).toBeTruthy();
    });

    it('muestra sección equipos habilitados', () => {
      render(<MemoryRouter><ClientePortalPage /></MemoryRouter>);
      expect(screen.getByText('Equipos Habilitados')).toBeTruthy();
    });
  });

  describe('Navegación', () => {
    it('botón volver llama goBack', () => {
      render(<MemoryRouter><ClientePortalPage /></MemoryRouter>);

      const backButton = screen.getByText('← Volver');
      fireEvent.click(backButton);

      expect(mockGoBack).toHaveBeenCalled();
    });
  });

  describe('Selector de cliente', () => {
    it('permite cambiar cliente', () => {
      render(<MemoryRouter><ClientePortalPage /></MemoryRouter>);

      const selects = screen.getAllByRole('combobox');
      const clientSelect = selects[0];

      fireEvent.change(clientSelect, { target: { value: '2' } });
      expect(clientSelect).toHaveValue('2');
    });
  });

  describe('Filtro de estado', () => {
    it('permite cambiar filtro', () => {
      render(<MemoryRouter><ClientePortalPage /></MemoryRouter>);

      const selects = screen.getAllByRole('combobox');
      const filterSelect = selects[1];

      fireEvent.change(filterSelect, { target: { value: 'VIGENTE' } });
      expect(filterSelect).toHaveValue('VIGENTE');
    });

    it('tiene todas las opciones de estado', () => {
      render(<MemoryRouter><ClientePortalPage /></MemoryRouter>);

      expect(screen.getByText('Todos los estados')).toBeTruthy();
      expect(screen.getByText(/Vigente/)).toBeTruthy();
      expect(screen.getByText(/Próximo a vencer/)).toBeTruthy();
      expect(screen.getByText(/Vencido/)).toBeTruthy();
      expect(screen.getByText(/Faltante/)).toBeTruthy();
    });
  });

  describe('Botones de acción', () => {
    it('muestra botón Actualizar', () => {
      render(<MemoryRouter><ClientePortalPage /></MemoryRouter>);
      expect(screen.getByText('Actualizar')).toBeTruthy();
    });

    it('muestra botón Exportar CSV', () => {
      render(<MemoryRouter><ClientePortalPage /></MemoryRouter>);
      expect(screen.getByText('Exportar CSV')).toBeTruthy();
    });

    it('muestra botón Excel cliente', () => {
      render(<MemoryRouter><ClientePortalPage /></MemoryRouter>);
      expect(screen.getByText('Excel cliente')).toBeTruthy();
    });

    it('muestra botón ZIP masivo', () => {
      render(<MemoryRouter><ClientePortalPage /></MemoryRouter>);
      expect(screen.getByText('ZIP masivo')).toBeTruthy();
    });
  });

  describe('Búsqueda masiva', () => {
    it('muestra textarea para patentes', () => {
      render(<MemoryRouter><ClientePortalPage /></MemoryRouter>);

      const textarea = screen.getByPlaceholderText(/Ejemplo:/);
      expect(textarea).toBeTruthy();
    });

    it('permite escribir patentes', () => {
      render(<MemoryRouter><ClientePortalPage /></MemoryRouter>);

      const textarea = screen.getByPlaceholderText(/Ejemplo:/);
      fireEvent.change(textarea, { target: { value: 'AA123BB\nBB456CC' } });

      expect(textarea).toHaveValue('AA123BB\nBB456CC');
    });

    it('muestra selector de tipo de patente', () => {
      render(<MemoryRouter><ClientePortalPage /></MemoryRouter>);

      expect(screen.getByText('Tractor y Acoplado')).toBeTruthy();
      expect(screen.getByText('Solo Tractor')).toBeTruthy();
      expect(screen.getByText('Solo Acoplado')).toBeTruthy();
    });

    it('permite cambiar tipo de patente', () => {
      render(<MemoryRouter><ClientePortalPage /></MemoryRouter>);

      const selects = screen.getAllByRole('combobox');
      const typeSelect = selects[2];

      fireEvent.change(typeSelect, { target: { value: 'truck' } });
      expect(typeSelect).toHaveValue('truck');
    });

    it('muestra botón Buscar', () => {
      render(<MemoryRouter><ClientePortalPage /></MemoryRouter>);
      expect(screen.getByText('Buscar')).toBeTruthy();
    });

    it('muestra botón Generar ZIP', () => {
      render(<MemoryRouter><ClientePortalPage /></MemoryRouter>);
      expect(screen.getByText('Generar ZIP')).toBeTruthy();
    });
  });

  describe('Equipos', () => {
    it('muestra equipos del cliente', () => {
      render(<MemoryRouter><ClientePortalPage /></MemoryRouter>);

      expect(screen.getByText(/Equipo #101/)).toBeTruthy();
      expect(screen.getByText(/Equipo #102/)).toBeTruthy();
    });

    it('muestra DNI de choferes', () => {
      render(<MemoryRouter><ClientePortalPage /></MemoryRouter>);

      expect(screen.getByText(/12345678/)).toBeTruthy();
      expect(screen.getByText(/87654321/)).toBeTruthy();
    });

    it('muestra patentes de tractores', () => {
      render(<MemoryRouter><ClientePortalPage /></MemoryRouter>);

      expect(screen.getByText(/AA123BB/)).toBeTruthy();
      expect(screen.getByText(/BB456CC/)).toBeTruthy();
    });

    it('muestra patentes de acoplados', () => {
      render(<MemoryRouter><ClientePortalPage /></MemoryRouter>);

      expect(screen.getByText(/AC456CD/)).toBeTruthy();
      expect(screen.getByText(/No asignado/)).toBeTruthy();
    });

    it('muestra estado de cumplimiento', () => {
      render(<MemoryRouter><ClientePortalPage /></MemoryRouter>);

      expect(screen.getAllByText(/Estado de Cumplimiento/).length).toBeGreaterThan(0);
    });

    it('muestra botón ver documentos', () => {
      render(<MemoryRouter><ClientePortalPage /></MemoryRouter>);

      const viewButtons = screen.getAllByText('Ver Documentos Detallados');
      expect(viewButtons.length).toBeGreaterThan(0);
    });

    it('permite expandir documentos', () => {
      render(<MemoryRouter><ClientePortalPage /></MemoryRouter>);

      const viewButtons = screen.getAllByText('Ver Documentos Detallados');
      fireEvent.click(viewButtons[0]);

      expect(screen.getByText('Ocultar Documentos')).toBeTruthy();
    });
  });

  describe('Exportación CSV', () => {
    it('botón exportar CSV funciona', () => {
      render(<MemoryRouter><ClientePortalPage /></MemoryRouter>);

      const csvButton = screen.getByText('Exportar CSV');
      fireEvent.click(csvButton);

      expect(mockShowToast).toHaveBeenCalled();
    });
  });
});
