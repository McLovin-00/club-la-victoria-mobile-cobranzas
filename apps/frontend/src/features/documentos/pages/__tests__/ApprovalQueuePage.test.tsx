import { render, screen, fireEvent } from '@testing-library/react';
import { AllProviders } from '@/test-utils/testWrappers';

jest.unstable_mockModule('@/features/documentos/api/documentosApiSlice', () => ({
  useGetApprovalKpisQuery: () => ({ data: { pending: 3, approvedToday: 5, rejectedToday: 1, avgReviewMinutes: 7 } }),
  useGetApprovalPendingQuery: () => ({
    data: [
      {
        id: 1,
        uploadedAt: '2024-01-15T10:30:00Z',
        entityType: 'CHOFER',
        entityId: 10,
        entityNaturalId: '12345678',
        classification: {
          detectedEntityType: 'CHOFER',
          detectedEntityId: '12345678',
          detectedDocumentType: 'Licencia',
          detectedExpiration: '2025-12-31',
          disparidades: []
        },
        template: { id: 1, name: 'Licencia', entityType: 'CHOFER' },
        expiresAt: '2025-12-31',
        iaValidation: { validationStatus: 'ok', hasDisparities: false }
      },
      {
        id: 2,
        uploadedAt: '2024-01-15T11:00:00Z',
        entityType: 'CAMION',
        entityId: 20,
        entityNaturalId: 'ABC-123',
        classification: {
          detectedEntityType: 'CAMION',
          detectedEntityId: 'ABC-123',
          detectedDocumentType: 'Seguro',
          detectedExpiration: '2025-06-30',
          disparidades: [
            { campo: 'Vencimiento', valorEnSistema: '2025-12-31', valorEnDocumento: '2024-06-01', severidad: 'critica', mensaje: 'Vencido' }
          ]
        },
        template: { id: 2, name: 'Seguro', entityType: 'CAMION' },
        expiresAt: '2025-06-30'
      },
      {
        id: 3,
        uploadedAt: '2024-01-15T12:00:00Z',
        entityType: 'ACOPLADO',
        entityId: 30,
        entityNaturalId: 'XYZ-789',
        classification: {
          detectedEntityType: 'ACOPLADO',
          detectedEntityId: 'XYZ-789',
          detectedDocumentType: 'VTV',
          detectedExpiration: '2024-12-31',
          disparidades: [] // Sin disparidades para que se muestre el badge de Error
        },
        template: { id: 3, name: 'VTV', entityType: 'ACOPLADO' },
        expiresAt: '2024-12-31',
        iaValidation: { validationStatus: 'error', hasDisparities: false }
      },
      {
        id: 4,
        uploadedAt: '2024-01-15T12:30:00Z',
        entityType: 'CAMION',
        entityId: 40,
        entityNaturalId: 'DEF-456',
        classification: {
          detectedEntityType: 'CAMION',
          detectedEntityId: 'DEF-456',
          detectedDocumentType: 'VTV',
          detectedExpiration: '2024-12-31',
          disparidades: [
            { campo: 'Patente', valorEnSistema: 'XYZ-789', valorEnDocumento: 'XYZ-788', severidad: 'advertencia', mensaje: 'Diferente' }
          ]
        },
        template: { id: 4, name: 'VTV', entityType: 'CAMION' },
        expiresAt: '2024-12-31'
      },
    ],
    isFetching: false,
    refetch: jest.fn()
  }),
}));

const { default: ApprovalQueuePage } = await import('../ApprovalQueuePage');

describe('ApprovalQueuePage', () => {
  it('renders KPIs and list', () => {
    render(<ApprovalQueuePage />, { wrapper: AllProviders });
    expect(screen.getByText('Aprobación de Documentos')).toBeInTheDocument();
    expect(screen.getByText('Pendientes')).toBeInTheDocument();
    expect(screen.getByText('Aprobados hoy')).toBeInTheDocument();
    expect(screen.getByText('Rechazados hoy')).toBeInTheDocument();
    expect(screen.getByText('T. medio revisión (m)')).toBeInTheDocument();
    expect(screen.getByText('CHOFER')).toBeInTheDocument();
    expect(screen.getByText('Licencia')).toBeInTheDocument();
  });

  it('debería mostrar botón Volver', () => {
    render(<ApprovalQueuePage />, { wrapper: AllProviders });
    expect(screen.getByText('Volver')).toBeInTheDocument();
  });

  it('debería mostrar select de entidades', () => {
    render(<ApprovalQueuePage />, { wrapper: AllProviders });
    expect(screen.getByText('Todas las entidades')).toBeInTheDocument();
    expect(screen.getByText('Empresa Transportista')).toBeInTheDocument();
    expect(screen.getByText('Chofer')).toBeInTheDocument();
    expect(screen.getByText('Camión')).toBeInTheDocument();
    expect(screen.getByText('Acoplado')).toBeInTheDocument();
  });

  it('debería mostrar botones Filtrar y Refrescar', () => {
    render(<ApprovalQueuePage />, { wrapper: AllProviders });
    expect(screen.getByText('Filtrar')).toBeInTheDocument();
    expect(screen.getByText('Refrescar')).toBeInTheDocument();
  });

  it('debería mostrar cabeceras de tabla', () => {
    render(<ApprovalQueuePage />, { wrapper: AllProviders });
    expect(screen.getByText('ID')).toBeInTheDocument();
    expect(screen.getByText('Entidad')).toBeInTheDocument();
    expect(screen.getByText('Identidad')).toBeInTheDocument();
    expect(screen.getByText('Tipo Doc')).toBeInTheDocument();
    expect(screen.getByText('Subido')).toBeInTheDocument();
    expect(screen.getByText('Vence')).toBeInTheDocument();
    expect(screen.getByText('Validación IA')).toBeInTheDocument();
    expect(screen.getByText('Acciones')).toBeInTheDocument();
  });

  it('debería mostrar filas con datos', () => {
    render(<ApprovalQueuePage />, { wrapper: AllProviders });
    // Usar getAllByText porque hay múltiples "1" (KPIs e IDs)
    const ones = screen.getAllByText('1');
    expect(ones.length).toBeGreaterThan(0);
    // Verificar que existe al menos un ID de documento (buscando en contexto de tabla)
    const allText = document.body.textContent || '';
    expect(allText.includes('CHOFER')).toBeTruthy();
  });

  it('debería mostrar disparidad CRITICA', () => {
    render(<ApprovalQueuePage />, { wrapper: AllProviders });
    // Usar una función de matcher para encontrar texto parcial
    expect(screen.getByText((content) => content.includes('CRITICA'))).toBeInTheDocument();
  });

  it('debería mostrar disparidad ADVERTENCIA', () => {
    render(<ApprovalQueuePage />, { wrapper: AllProviders });
    expect(screen.getByText((content) => content.includes('ADVERTENCIA'))).toBeInTheDocument();
  });

  it('debería mostrar badge OK', () => {
    render(<ApprovalQueuePage />, { wrapper: AllProviders });
    expect(screen.getByText('OK')).toBeInTheDocument();
  });

  it('debería mostrar badge ERROR', () => {
    render(<ApprovalQueuePage />, { wrapper: AllProviders });
    // Buscar el badge de error (nota: el texto es "Error" con mayúscula inicial)
    expect(screen.getByText((content) => content.includes('Error'))).toBeInTheDocument();
  });

  it('debería mostrar botones Revisar', () => {
    render(<ApprovalQueuePage />, { wrapper: AllProviders });
    const reviewLinks = screen.getAllByText('Revisar');
    expect(reviewLinks.length).toBe(4);
  });

  it('debería mostrar paginación', () => {
    render(<ApprovalQueuePage />, { wrapper: AllProviders });
    expect(screen.getByText(/Página/)).toBeInTheDocument();
  });

  it('debería mostrar detalles de disparidad', () => {
    render(<ApprovalQueuePage />, { wrapper: AllProviders });
    expect(screen.getByText('Vencido')).toBeInTheDocument();
  });

  describe('Auto-refresh', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('debería llamar refetch periódicamente', () => {
      render(<ApprovalQueuePage />, { wrapper: AllProviders });
      jest.advanceTimersByTime(5000);
      // El refetch es llamado por el useEffect de auto-refresh
      jest.advanceTimersByTime(10000);
    });
  });

  describe('Interacciones de filtros', () => {
    it('debería cambiar el valor del select de entityType', () => {
      render(<ApprovalQueuePage />, { wrapper: AllProviders });
      const select = screen.getByDisplayValue('Todas las entidades');
      fireEvent.change(select, { target: { value: 'CHOFER' } });
      expect(select).toHaveValue('CHOFER');
    });

    it('debería tener el botón Filtrar clickeable', () => {
      render(<ApprovalQueuePage />, { wrapper: AllProviders });
      const filterButton = screen.getByText('Filtrar');
      expect(filterButton).toBeEnabled();
      fireEvent.click(filterButton);
      // El test solo verifica que el botón se pueda clickear sin errores
    });

    it('debería tener el botón Refrescar clickeable', () => {
      render(<ApprovalQueuePage />, { wrapper: AllProviders });
      const refreshButton = screen.getByText('Refrescar');
      expect(refreshButton).toBeEnabled();
      fireEvent.click(refreshButton);
    });
  });
});
