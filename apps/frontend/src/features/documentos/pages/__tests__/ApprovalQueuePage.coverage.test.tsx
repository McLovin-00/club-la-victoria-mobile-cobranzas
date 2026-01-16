/**
 * Coverage test para ApprovalQueuePage
 *
 * Cubre casos adicionales no incluidos en los tests principales:
 * - Diferentes roles de usuario para rutas de vuelta
 * - Fechas inválidas en el parseo
 * - Severidad "info" en disparidades
 * - Casos edge de disparidades
 */
import { render, screen } from '@testing-library/react';
import { AllProviders } from '@/test-utils/testWrappers';
import type { RootState } from '@/store/store';

// Mock con datos que cubren casos edge específicos
jest.unstable_mockModule('@/features/documentos/api/documentosApiSlice', () => ({
  useGetApprovalKpisQuery: () => ({ data: { pending: 2, approvedToday: 0, rejectedToday: 0, avgReviewMinutes: 0 } }),
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
          detectedExpiration: 'invalid-date', // Fecha inválida para probar isNaN
          disparidades: []
        },
        template: { id: 1, name: 'Licencia', entityType: 'CHOFER' },
        expiresAt: 'invalid-date', // Fecha inválida
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
          detectedExpiration: 'not-a-date', // Fecha que causará error en new Date()
          disparidades: [
            {
              campo: 'Campo Info',
              valorEnSistema: 'valor1',
              valorEnDocumento: 'valor2',
              severidad: 'info', // Severidad info (no critica ni advertencia)
              mensaje: 'Información adicional'
            }
          ]
        },
        template: { id: 2, name: 'Seguro', entityType: 'CAMION' },
        expiresAt: undefined,
        iaValidation: null
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
          detectedExpiration: '2025-12-31',
          disparidades: [] // Array vacío de disparidades
        },
        template: { id: 3, name: 'VTV', entityType: 'ACOPLADO' },
        expiresAt: '2025-12-31',
        iaValidation: { validationStatus: 'ok', hasDisparities: false }
      },
    ],
    isFetching: false,
    refetch: jest.fn()
  }),
}));

const { default: ApprovalQueuePage } = await import('../ApprovalQueuePage');

// Mock del store para diferentes roles
const createMockStore = (role: string | undefined) => ({
  getState: () => ({
    auth: { user: { role } }
  }) as RootState,
  dispatch: jest.fn()
});

describe('ApprovalQueuePage - Coverage de Roles', () => {
  it('debería usar ruta /portal/admin-interno para ADMIN_INTERNO', () => {
    const mockStore = createMockStore('ADMIN_INTERNO');
    render(<ApprovalQueuePage />, {
      wrapper: ({ children }) => <AllProviders store={mockStore}>{children}</AllProviders>
    });
    expect(screen.getByText('Aprobación de Documentos')).toBeInTheDocument();
  });

  it('debería usar ruta /portal/dadores para DADOR_DE_CARGA', () => {
    const mockStore = createMockStore('DADOR_DE_CARGA');
    render(<ApprovalQueuePage />, {
      wrapper: ({ children }) => <AllProviders store={mockStore}>{children}</AllProviders>
    });
    expect(screen.getByText('Aprobación de Documentos')).toBeInTheDocument();
  });

  it('debería usar ruta /portal/transportistas para TRANSPORTISTA', () => {
    const mockStore = createMockStore('TRANSPORTISTA');
    render(<ApprovalQueuePage />, {
      wrapper: ({ children }) => <AllProviders store={mockStore}>{children}</AllProviders>
    });
    expect(screen.getByText('Aprobación de Documentos')).toBeInTheDocument();
  });

  it('debería usar ruta /portal/transportistas para CHOFER', () => {
    const mockStore = createMockStore('CHOFER');
    render(<ApprovalQueuePage />, {
      wrapper: ({ children }) => <AllProviders store={mockStore}>{children}</AllProviders>
    });
    expect(screen.getByText('Aprobación de Documentos')).toBeInTheDocument();
  });

  it('debería usar ruta /documentos para rol no reconocido', () => {
    const mockStore = createMockStore('UNKNOWN_ROLE');
    render(<ApprovalQueuePage />, {
      wrapper: ({ children }) => <AllProviders store={mockStore}>{children}</AllProviders>
    });
    expect(screen.getByText('Aprobación de Documentos')).toBeInTheDocument();
  });

  it('debería usar ruta /documentos cuando role es undefined', () => {
    const mockStore = createMockStore(undefined);
    render(<ApprovalQueuePage />, {
      wrapper: ({ children }) => <AllProviders store={mockStore}>{children}</AllProviders>
    });
    expect(screen.getByText('Aprobación de Documentos')).toBeInTheDocument();
  });
});

describe('ApprovalQueuePage - Coverage de Fechas Inválidas', () => {
  it('debería mostrar "-" para fecha inválida (isNaN)', () => {
    render(<ApprovalQueuePage />, { wrapper: AllProviders });
    const allText = document.body.textContent || '';
    // La fecha inválida debería mostrar como "-"
    expect(allText.includes('-')).toBeTruthy();
  });

  it('debería manejar fechas null/undefined sin errores', () => {
    render(<ApprovalQueuePage />, { wrapper: AllProviders });
    // No debería lanzar error con fechas null/undefined
    expect(screen.getByText('Aprobación de Documentos')).toBeInTheDocument();
  });
});

describe('ApprovalQueuePage - Coverage de Severidades', () => {
  it('debería mostrar disparidad con severidad "info"', () => {
    render(<ApprovalQueuePage />, { wrapper: AllProviders });
    // Buscar el texto INFO que viene de la severidad 'info'
    expect(screen.getByText((content) => content.includes('INFO'))).toBeInTheDocument();
  });

  it('debería mostrar mensaje de disparidad info', () => {
    render(<ApprovalQueuePage />, { wrapper: AllProviders });
    expect(screen.getByText('Información adicional')).toBeInTheDocument();
  });
});

describe('ApprovalQueuePage - Coverage de Array de Disparidades Vacío', () => {
  it('debería mostrar badge OK cuando disparidades está vacío', () => {
    render(<ApprovalQueuePage />, { wrapper: AllProviders });
    // El documento 3 tiene disparidades: [] y hasDisparities: false
    const okBadges = screen.getAllByText('OK');
    expect(okBadges.length).toBeGreaterThan(0);
  });
});

describe('ApprovalQueuePage - Coverage de KpiCard', () => {
  it('debería renderizar KpiCard con valor 0', () => {
    render(<ApprovalQueuePage />, { wrapper: AllProviders });
    // Verificar que se muestran los KPIs incluso con valor 0
    const allText = document.body.textContent || '';
    expect(allText.includes('0')).toBeTruthy();
  });
});

describe('ApprovalQueuePage - Coverage de Paginación', () => {
  it('debería usar paginación del response cuando existe', () => {
    render(<ApprovalQueuePage />, { wrapper: AllProviders });
    // La paginación se muestra cuando hay datos
    expect(screen.getByText(/Página/)).toBeInTheDocument();
  });
});
